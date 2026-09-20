import crypto from "crypto";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { NotFoundError, ValidationError } from "@poramma/utils";
import { getObjectStream } from "@poramma/storage";
import type { Db } from "../db-type";
import { campagnes, campagneAttachments, campagneDeliveries, campagneInteractions } from "../schema/campagnes";
import { storedFiles } from "../schema/documents";

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

type Campagne = typeof campagnes.$inferSelect;
type StoredFile = typeof storedFiles.$inferSelect;

/** Réactions possibles d'un citoyen (une seule de chaque type par campagne). */
export const REACTION_TYPES = ["LIKE", "PARTICIPATE"] as const;
export type ReactionType = (typeof REACTION_TYPES)[number];

/** Une même personne qui rouvre une annonce dans ce délai n'ajoute pas de « vue » (statistiques non gonflées). */
const VIEW_THROTTLE_MS = 30 * 60 * 1000;
/** Nombre maximum d'annonces envoyées considérées pour le fil d'un citoyen. */
const FEED_WINDOW = 300;

// ---------------------------------------------------------------- visibilité

/** Une campagne sans aucun critère de ciblage s'adresse à toute la communauté. Un booléen (ex. hasBourse) EST un critère. */
export function isBroadcast(filters: unknown): boolean {
  if (!filters || typeof filters !== "object") return true;
  return Object.values(filters as Record<string, unknown>).every((v) => v == null || (Array.isArray(v) && v.length === 0));
}

async function deliveredCampagneIds(db: Db, userId: string): Promise<Set<string>> {
  const rows = await db.select({ id: campagneDeliveries.campagneId }).from(campagneDeliveries).where(eq(campagneDeliveries.userId, userId));
  return new Set(rows.map((r) => r.id));
}

/**
 * Annonces visibles par un citoyen : campagnes ENVOYÉES qui s'adressent à toute
 * la communauté, ou qui l'ont ciblé (une ligne de livraison existe pour lui).
 * Brouillons, programmées et annulées ne sont jamais visibles.
 */
async function visibleCampagnes(db: Db, userId: string, type?: string): Promise<Campagne[]> {
  const rows = await db
    .select()
    .from(campagnes)
    .where(and(eq(campagnes.status, "SENT"), type ? eq(campagnes.type, type) : undefined))
    .orderBy(desc(campagnes.sentAt))
    .limit(FEED_WINDOW);
  if (!rows.length) return rows;
  const delivered = await deliveredCampagneIds(db, userId);
  return rows.filter((r) => isBroadcast(r.targetFilters) || delivered.has(r.id));
}

async function getVisibleOrThrow(db: Db, userId: string, id: string): Promise<Campagne> {
  const [row] = await db.select().from(campagnes).where(and(eq(campagnes.id, id), eq(campagnes.status, "SENT")));
  // Même réponse pour « n'existe pas » et « ne vous est pas destinée » : on ne révèle pas l'existence d'une campagne ciblée.
  if (!row) throw new NotFoundError("Annonce introuvable");
  if (!isBroadcast(row.targetFilters) && !(await deliveredCampagneIds(db, userId)).has(id)) throw new NotFoundError("Annonce introuvable");
  return row;
}

// ---------------------------------------------------------------- assemblage

export interface CampagneItem {
  campagne: Campagne;
  cover: StoredFile | null;
  attachments: { id: string; type: string; caption: string | null; order: number; isBanner: boolean; file: StoredFile }[];
  likes: number;
  participants: number;
  mine: { liked: boolean; participating: boolean };
}

async function assemble(db: Db, userId: string, rows: Campagne[]): Promise<CampagneItem[]> {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);

  const [attachmentRows, counts, mineRows] = await Promise.all([
    db.select().from(campagneAttachments).where(inArray(campagneAttachments.campagneId, ids)).orderBy(campagneAttachments.order),
    db
      .select({ campagneId: campagneInteractions.campagneId, type: campagneInteractions.type, n: sql<number>`count(*)::int` })
      .from(campagneInteractions)
      .where(and(inArray(campagneInteractions.campagneId, ids), inArray(campagneInteractions.type, [...REACTION_TYPES])))
      .groupBy(campagneInteractions.campagneId, campagneInteractions.type),
    db
      .select({ campagneId: campagneInteractions.campagneId, type: campagneInteractions.type })
      .from(campagneInteractions)
      .where(and(eq(campagneInteractions.userId, userId), inArray(campagneInteractions.campagneId, ids), inArray(campagneInteractions.type, [...REACTION_TYPES]))),
  ]);

  const fileIds = [...new Set([...rows.map((r) => r.coverImageId).filter((x): x is string => !!x), ...attachmentRows.map((a) => a.fileId)])];
  const files = fileIds.length ? await db.select().from(storedFiles).where(inArray(storedFiles.id, fileIds)) : [];
  const fileById = new Map(files.map((f) => [f.id, f]));

  return rows.map((campagne) => {
    const count = (type: string) => counts.find((c) => c.campagneId === campagne.id && c.type === type)?.n ?? 0;
    const mine = (type: string) => mineRows.some((m) => m.campagneId === campagne.id && m.type === type);
    return {
      campagne,
      cover: campagne.coverImageId ? (fileById.get(campagne.coverImageId) ?? null) : null,
      attachments: attachmentRows
        .filter((a) => a.campagneId === campagne.id && fileById.has(a.fileId))
        .map((a) => ({ id: a.id, type: a.type, caption: a.caption, order: a.order, isBanner: a.isBanner, file: fileById.get(a.fileId)! })),
      likes: count("LIKE"),
      participants: count("PARTICIPATE"),
      mine: { liked: mine("LIKE"), participating: mine("PARTICIPATE") },
    };
  });
}

/** Fil d'annonces d'un citoyen, plus récentes d'abord. */
export async function listForUser(db: Db, userId: string, opts: { type?: string; limit?: number; offset?: number } = {}): Promise<CampagneItem[]> {
  const visible = await visibleCampagnes(db, userId, opts.type);
  const offset = opts.offset ?? 0;
  return assemble(db, userId, visible.slice(offset, offset + (opts.limit ?? 30)));
}

export async function getForUser(db: Db, userId: string, id: string): Promise<CampagneItem> {
  return (await assemble(db, userId, [await getVisibleOrThrow(db, userId, id)]))[0];
}

// ---------------------------------------------------------------- médias

/**
 * Fichier (couverture ou pièce jointe) d'une campagne visible par ce citoyen.
 * `storedFiles` est partagé avec des documents sensibles d'autres modules :
 * on n'expose jamais un accès générique « fichier par id », seulement ceux
 * rattachés à une annonce que le citoyen a le droit de voir.
 */
export async function getMediaFile(db: Db, userId: string, fileId: string): Promise<StoredFile> {
  const asCover = await db.select().from(campagnes).where(and(eq(campagnes.coverImageId, fileId), eq(campagnes.status, "SENT")));
  const asAttachment = await db
    .select({ c: campagnes })
    .from(campagneAttachments)
    .innerJoin(campagnes, eq(campagneAttachments.campagneId, campagnes.id))
    .where(and(eq(campagneAttachments.fileId, fileId), eq(campagnes.status, "SENT")));

  const candidates = [...asCover, ...asAttachment.map((r) => r.c)];
  if (!candidates.length) throw new NotFoundError("Fichier introuvable");

  const delivered = await deliveredCampagneIds(db, userId);
  if (!candidates.some((c) => isBroadcast(c.targetFilters) || delivered.has(c.id))) throw new NotFoundError("Fichier introuvable");

  const [file] = await db.select().from(storedFiles).where(eq(storedFiles.id, fileId));
  if (!file) throw new NotFoundError("Fichier introuvable");
  return file;
}

/** Ouvre le fichier en flux (avec prise en charge d'un en-tête `Range`) — le stockage MinIO n'est joignable que depuis le réseau Docker. */
export function openMediaStream(file: { path: string }, range?: string) {
  return getObjectStream(file.path, range);
}

// ---------------------------------------------------------------- interactions

/** Recalcule les compteurs dénormalisés (citoyens DISTINCTS ayant ouvert / cliqué). */
async function refreshStats(db: Db, campagneId: string): Promise<void> {
  await db.execute(sql`
    update ambassade.campagnes set
      stats_opened = (select count(distinct user_id) from ambassade.campagne_interactions where campagne_id = ${campagneId} and type = 'VIEW'),
      stats_clicked = (select count(distinct user_id) from ambassade.campagne_interactions where campagne_id = ${campagneId} and type = 'CLICK')
    where id = ${campagneId}`);
}

async function touchDelivery(db: Db, userId: string, campagneId: string, column: "openedAt" | "clickedAt"): Promise<void> {
  await db
    .update(campagneDeliveries)
    .set({ [column]: new Date() })
    .where(and(eq(campagneDeliveries.campagneId, campagneId), eq(campagneDeliveries.userId, userId), sql`${campagneDeliveries[column]} is null`));
}

/** Ouverture du détail d'une annonce. Renvoie `recorded=false` si elle a déjà été comptée récemment. */
export async function recordView(db: Db, params: { userId: string; campagneId: string }): Promise<{ recorded: boolean }> {
  await getVisibleOrThrow(db, params.userId, params.campagneId);

  const [recent] = await db
    .select({ id: campagneInteractions.id })
    .from(campagneInteractions)
    .where(
      and(
        eq(campagneInteractions.campagneId, params.campagneId),
        eq(campagneInteractions.userId, params.userId),
        eq(campagneInteractions.type, "VIEW"),
        gte(campagneInteractions.createdAt, new Date(Date.now() - VIEW_THROTTLE_MS))
      )
    )
    .limit(1);
  if (recent) return { recorded: false };

  await db.insert(campagneInteractions).values({ id: newId("cint"), campagneId: params.campagneId, userId: params.userId, type: "VIEW" });
  await touchDelivery(db, params.userId, params.campagneId, "openedAt");
  await refreshStats(db, params.campagneId);
  return { recorded: true };
}

/**
 * Clic sur un média, un document ou un lien. `targetId` = id d'une pièce jointe
 * de CETTE campagne, ou « link:<url> » pour un lien du texte ; vérifié côté
 * serveur pour que les statistiques ne soient pas polluées par des valeurs libres.
 */
export async function recordClick(db: Db, params: { userId: string; campagneId: string; targetId: string }): Promise<void> {
  await getVisibleOrThrow(db, params.userId, params.campagneId);

  if (!/^link:.{1,180}$/.test(params.targetId)) {
    const [attachment] = await db
      .select({ id: campagneAttachments.id })
      .from(campagneAttachments)
      .where(and(eq(campagneAttachments.id, params.targetId), eq(campagneAttachments.campagneId, params.campagneId)));
    if (!attachment) throw new ValidationError("Cible de clic invalide", { targetId: ["unknown target"] });
  }

  await db.insert(campagneInteractions).values({ id: newId("cint"), campagneId: params.campagneId, userId: params.userId, type: "CLICK", targetId: params.targetId });
  await touchDelivery(db, params.userId, params.campagneId, "clickedAt");
  await refreshStats(db, params.campagneId);
}

/** Bascule « j'aime » / « je participe » (au plus une ligne active par citoyen, garanti par l'index unique). */
export async function toggleReaction(
  db: Db,
  params: { userId: string; campagneId: string; type: ReactionType }
): Promise<{ active: boolean; count: number }> {
  const campagne = await getVisibleOrThrow(db, params.userId, params.campagneId);
  if (params.type === "PARTICIPATE" && campagne.type !== "EVENT") {
    throw new ValidationError("La participation n'est possible que pour un événement", { type: ["not an event"] });
  }

  const removed = await db
    .delete(campagneInteractions)
    .where(and(eq(campagneInteractions.campagneId, params.campagneId), eq(campagneInteractions.userId, params.userId), eq(campagneInteractions.type, params.type)))
    .returning({ id: campagneInteractions.id });

  let active = false;
  if (!removed.length) {
    // Deux requêtes simultanées : l'index unique laisse passer la première ; l'autre ne fait rien (déjà actif).
    await db
      .insert(campagneInteractions)
      .values({ id: newId("cint"), campagneId: params.campagneId, userId: params.userId, type: params.type })
      .onConflictDoNothing();
    active = true;
  }

  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(campagneInteractions)
    .where(and(eq(campagneInteractions.campagneId, params.campagneId), eq(campagneInteractions.type, params.type)));
  return { active, count: row?.n ?? 0 };
}

// ---------------------------------------------------------------- statistiques (vue ambassade)

export interface InteractionStats {
  views: number;
  uniqueViewers: number;
  clicks: number;
  uniqueClickers: number;
  likes: number;
  participants: number;
  clicksByTarget: { targetId: string; count: number }[];
}

/** Agrégats d'interactions pour une ou plusieurs campagnes (aucune donnée nominative). */
export async function interactionStats(db: Db, campagneIds: string[]): Promise<Map<string, InteractionStats>> {
  const result = new Map<string, InteractionStats>();
  const empty = (): InteractionStats => ({ views: 0, uniqueViewers: 0, clicks: 0, uniqueClickers: 0, likes: 0, participants: 0, clicksByTarget: [] });
  for (const id of campagneIds) result.set(id, empty());
  if (!campagneIds.length) return result;

  const [totals, byTarget] = await Promise.all([
    db
      .select({
        campagneId: campagneInteractions.campagneId,
        type: campagneInteractions.type,
        total: sql<number>`count(*)::int`,
        users: sql<number>`count(distinct ${campagneInteractions.userId})::int`,
      })
      .from(campagneInteractions)
      .where(inArray(campagneInteractions.campagneId, campagneIds))
      .groupBy(campagneInteractions.campagneId, campagneInteractions.type),
    db
      .select({ campagneId: campagneInteractions.campagneId, targetId: campagneInteractions.targetId, n: sql<number>`count(*)::int` })
      .from(campagneInteractions)
      .where(and(inArray(campagneInteractions.campagneId, campagneIds), eq(campagneInteractions.type, "CLICK")))
      .groupBy(campagneInteractions.campagneId, campagneInteractions.targetId),
  ]);

  for (const t of totals) {
    const s = result.get(t.campagneId)!;
    if (t.type === "VIEW") ((s.views = t.total), (s.uniqueViewers = t.users));
    else if (t.type === "CLICK") ((s.clicks = t.total), (s.uniqueClickers = t.users));
    else if (t.type === "LIKE") s.likes = t.total;
    else if (t.type === "PARTICIPATE") s.participants = t.total;
  }
  for (const b of byTarget) result.get(b.campagneId)!.clicksByTarget.push({ targetId: b.targetId ?? "—", count: b.n });
  return result;
}
