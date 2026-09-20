import crypto from "crypto";
import { eq, and, desc, inArray, lte } from "drizzle-orm";
import { db } from "../../db/connection";
import { campagnes, campagneAttachments, campagneDeliveries, notifications } from "../../db/schema.communication";
import { storedFiles } from "../../db/schema.documents";
import { uploadObject, getObject } from "@poramma/storage";
import { sendMail, renderEmail } from "@poramma/mailer";
import { campagnesLogic } from "@poramma/ambassade-core";
import { NotFoundError, ValidationError } from "@poramma/utils";
import { getUser } from "../../shared/enrich";
import { sanitizeCampaignContent } from "../../shared/sanitize-html";
import { resolveTargetUserIds, CampagneTargetFilters, identityUserProfiles } from "../../db/schema.identity-readonly";
import { writeAudit } from "../audit/audit.service";

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

/** URL publique du portail citoyen (liens des emails de campagne). */
function publicAppUrl(): string {
  return (process.env.PUBLIC_APP_URL || "http://localhost:5174").replace(/\/$/, "");
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(-150);
}

interface Actor {
  userId: string;
  roleName: string | null;
}

// ============================================================
// Enrichment
// ============================================================

async function enrichCampagne(row: typeof campagnes.$inferSelect) {
  const [coverImage, attachmentRows, sentByUser] = await Promise.all([
    row.coverImageId
      ? db.select().from(storedFiles).where(eq(storedFiles.id, row.coverImageId)).then((r) => r[0] ?? null)
      : Promise.resolve(null),
    db.select().from(campagneAttachments).where(eq(campagneAttachments.campagneId, row.id)).orderBy(campagneAttachments.order),
    getUser(row.sentBy),
  ]);

  const attachments = await Promise.all(
    attachmentRows.map(async (a) => {
      const [file] = await db.select().from(storedFiles).where(eq(storedFiles.id, a.fileId));
      return { ...a, file: file ? { ...file, encryptionKeyId: null } : null };
    })
  );

  const interactions = (await campagnesLogic.interactionStats(db, [row.id])).get(row.id)!;

  const sent = row.statsSent;
  const openRate = sent > 0 ? Math.round((row.statsOpened / sent) * 1000) / 10 : 0;
  const clickRate = sent > 0 ? Math.round((row.statsClicked / sent) * 1000) / 10 : 0;

  return {
    ...row,
    coverImage: coverImage ? { ...coverImage, encryptionKeyId: null } : null,
    attachments,
    sentByUser,
    targetFilters: row.targetFilters ?? {},
    stats: {
      totalRecipients: row.statsTotalRecipients,
      sent: row.statsSent,
      delivered: row.statsDelivered,
      opened: row.statsOpened,
      clicked: row.statsClicked,
      failed: row.statsFailed,
      openRate,
      clickRate,
    },
    // Interactions des citoyens (vues, clics par média, j aime, participations) — agrégats anonymes.
    interactions,
  };
}

// ============================================================
// Campagnes CRUD
// ============================================================

export async function listCampagnes(query: { status?: string; type?: string }) {
  const conditions = [];
  if (query.status) conditions.push(eq(campagnes.status, query.status));
  if (query.type) conditions.push(eq(campagnes.type, query.type));

  const rows = await db
    .select()
    .from(campagnes)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(campagnes.createdAt));

  return Promise.all(rows.map(enrichCampagne));
}

export async function getCampagne(id: string) {
  const [row] = await db.select().from(campagnes).where(eq(campagnes.id, id));
  if (!row) throw new NotFoundError("Campagne introuvable");
  return enrichCampagne(row);
}

export async function createCampagne(
  data: {
    title: string;
    content: string;
    type: string;
    coverImageFileId?: string;
    targetFilters: CampagneTargetFilters;
    scheduledAt?: string;
    channels: string[];
  },
  actor: Actor
) {
  const [row] = await db
    .insert(campagnes)
    .values({
      id: newId("camp"),
      title: data.title,
      content: sanitizeCampaignContent(data.content),
      type: data.type,
      coverImageId: data.coverImageFileId ?? null,
      targetFilters: data.targetFilters,
      channels: data.channels,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      status: data.scheduledAt ? "SCHEDULED" : "DRAFT",
      sentBy: actor.userId,
    })
    .returning();

  await writeAudit({
    action: "CREATE",
    entityType: "CAMPAGNE",
    entityId: row.id,
    actor,
    entitySnapshot: { title: row.title, type: row.type },
  });

  return enrichCampagne(row);
}

export async function updateCampagne(
  id: string,
  data: Partial<{
    title: string;
    content: string;
    type: string;
    coverImageFileId: string;
    targetFilters: CampagneTargetFilters;
    scheduledAt: string;
    channels: string[];
  }>
) {
  const [existing] = await db.select().from(campagnes).where(eq(campagnes.id, id));
  if (!existing) throw new NotFoundError("Campagne introuvable");
  if (existing.status === "SENT" || existing.status === "SENDING") {
    throw new ValidationError("Une campagne déjà envoyée ne peut plus être modifiée", { status: ["locked"] });
  }

  const { coverImageFileId, scheduledAt, ...rest } = data;
  if (rest.content !== undefined) rest.content = sanitizeCampaignContent(rest.content);
  const [updated] = await db
    .update(campagnes)
    .set({
      ...rest,
      ...(coverImageFileId !== undefined ? { coverImageId: coverImageFileId } : {}),
      ...(scheduledAt !== undefined ? { scheduledAt: new Date(scheduledAt) } : {}),
    })
    .where(eq(campagnes.id, id))
    .returning();

  return enrichCampagne(updated);
}

// ============================================================
// Cycle de vie d'envoi
// ============================================================

/**
 * EMAIL est réellement envoyé via @poramma/mailer (Mailhog en dev). IN_APP
 * écrit une vraie ligne `notifications`. SMS/PUSH/WHATSAPP n'ont aucune
 * passerelle réelle dans ce projet — la livraison est marquée SENT sans
 * effet externe, comme OTP par SMS l'a toujours été. Chaque livraison
 * réussie ou échouée devient une ligne `campagne_deliveries`.
 */
async function dispatchToRecipient(campagne: typeof campagnes.$inferSelect, userId: string, channel: string) {
  const deliveryId = newId("del");
  const base = { id: deliveryId, campagneId: campagne.id, userId, channel };

  if (channel === "EMAIL") {
    const user = await getUser(userId);
    if (!user?.email) {
      await db.insert(campagneDeliveries).values({ ...base, status: "FAILED", errorMessage: "Adresse email introuvable" });
      return "FAILED";
    }
    try {
      await sendMail({
        to: user.email,
        subject: campagne.title,
        html: renderEmail({
          title: campagne.title,
          // Contenu HTML rédigé par l ambassade (rédacteurs authentifiés) — inséré tel quel dans le gabarit.
          // Re-nettoyé à l'envoi : couvre aussi les anciennes campagnes enregistrées avant le filtrage serveur.
          rawHtml: sanitizeCampaignContent(campagne.content),
          action: { label: "Lire sur le portail", url: `${publicAppUrl()}/campagnes/${campagne.id}` },
        }),
      });
      await db.insert(campagneDeliveries).values({ ...base, status: "SENT", sentAt: new Date() });
      return "SENT";
    } catch (err) {
      await db.insert(campagneDeliveries).values({ ...base, status: "FAILED", errorMessage: (err as Error).message });
      return "FAILED";
    }
  }

  if (channel === "IN_APP") {
    await db.insert(notifications).values({
      id: newId("notif"),
      userId,
      type: "CAMPAGNE",
      title: campagne.title,
      body: campagne.content.replace(/<[^>]+>/g, "").slice(0, 500),
      payload: { campagneId: campagne.id },
      channel: "IN_APP",
      status: "SENT",
      actionUrl: `/campagnes/${campagne.id}`,
      sentAt: new Date(),
    });
    await db.insert(campagneDeliveries).values({ ...base, status: "SENT", sentAt: new Date(), deliveredAt: new Date() });
    return "SENT";
  }

  // SMS / PUSH / WHATSAPP — pas de passerelle réelle, livraison simulée.
  await db.insert(campagneDeliveries).values({ ...base, status: "SENT", sentAt: new Date() });
  return "SENT";
}

/** Notifie l'auteur de la campagne (distinct des notifications IN_APP envoyées aux destinataires). */
async function notifySender(campagne: typeof campagnes.$inferSelect, title: string, body: string) {
  await db.insert(notifications).values({
    id: newId("notif"),
    userId: campagne.sentBy,
    type: "CAMPAGNE",
    title,
    body,
    payload: { campagneId: campagne.id },
    channel: "IN_APP",
    status: "SENT",
    actionUrl: `/communication/campagnes/${campagne.id}`,
    sentAt: new Date(),
  });
}

/**
 * Cœur de l'envoi, partagé entre l'envoi manuel (`sendCampagne`) et le
 * scheduler automatique (`processDueScheduledCampagnes`) — évite de
 * dupliquer la boucle de dispatch/l'audit/la notification de confirmation
 * entre les deux points d'entrée.
 */
async function performSend(existing: typeof campagnes.$inferSelect, actor: Actor, automatic: boolean) {
  await db.update(campagnes).set({ status: "SENDING" }).where(eq(campagnes.id, existing.id));

  const targetUserIds = await resolveTargetUserIds((existing.targetFilters as CampagneTargetFilters) ?? {});
  const channels = (existing.channels as string[]) ?? ["IN_APP"];

  let sentCount = 0;
  let failedCount = 0;
  for (const userId of targetUserIds) {
    for (const channel of channels) {
      const result = await dispatchToRecipient(existing, userId, channel);
      if (result === "SENT") sentCount++;
      else failedCount++;
    }
  }

  const [updated] = await db
    .update(campagnes)
    .set({
      status: "SENT",
      sentAt: new Date(),
      statsTotalRecipients: targetUserIds.length,
      statsSent: sentCount,
      // Livrées = envoyées avec succès (in-app instantané, email accepté par le relais SMTP).
      statsDelivered: sentCount,
      statsFailed: failedCount,
    })
    .where(eq(campagnes.id, existing.id))
    .returning();

  await writeAudit({
    action: "SEND",
    entityType: "CAMPAGNE",
    entityId: existing.id,
    actor,
    severity: "WARNING",
    details: { recipients: targetUserIds.length, sent: sentCount, failed: failedCount, automatic },
  });

  await notifySender(
    updated,
    automatic ? "Campagne envoyée automatiquement" : "Campagne envoyée",
    `« ${updated.title} » a été envoyée à ${targetUserIds.length} destinataire${targetUserIds.length > 1 ? "s" : ""}.`
  );

  return enrichCampagne(updated);
}

export async function sendCampagne(id: string, actor: Actor) {
  const [existing] = await db.select().from(campagnes).where(eq(campagnes.id, id));
  if (!existing) throw new NotFoundError("Campagne introuvable");
  if (existing.status === "SENT" || existing.status === "SENDING") {
    throw new ValidationError("Cette campagne a déjà été envoyée", { status: ["already sent"] });
  }

  return performSend(existing, actor, false);
}

export async function scheduleCampagne(id: string, scheduledAt: string) {
  const [existing] = await db.select().from(campagnes).where(eq(campagnes.id, id));
  if (!existing) throw new NotFoundError("Campagne introuvable");
  if (existing.status === "SENT" || existing.status === "SENDING") {
    throw new ValidationError("Cette campagne a déjà été envoyée", { status: ["already sent"] });
  }

  const [updated] = await db
    .update(campagnes)
    .set({ status: "SCHEDULED", scheduledAt: new Date(scheduledAt) })
    .where(eq(campagnes.id, id))
    .returning();

  await notifySender(
    updated,
    "Campagne programmée",
    `« ${updated.title} » est programmée pour le ${new Date(scheduledAt).toLocaleString("fr-FR")}.`
  );

  return enrichCampagne(updated);
}

/**
 * Scheduler automatique — voir `startCampagneScheduler()`. Interroge les
 * campagnes SCHEDULED dont l'heure est passée et les envoie réellement via
 * `performSend`, attribuée à leur propre auteur (`sentBy`) plutôt qu'à un
 * acteur système fictif, puisque `audit_logs.actor_user_id` n'accepte que
 * de vrais utilisateurs.
 */
export async function processDueScheduledCampagnes() {
  const due = await db
    .select()
    .from(campagnes)
    .where(and(eq(campagnes.status, "SCHEDULED"), lte(campagnes.scheduledAt, new Date())));

  for (const campagne of due) {
    try {
      await performSend(campagne, { userId: campagne.sentBy, roleName: null }, true);
    } catch (err) {
      console.error(`[campagne-scheduler] Échec de l'envoi automatique de ${campagne.id}:`, err);
    }
  }
}

/** Appelé une fois au démarrage du serveur (server.ts) — vérifie les campagnes dues toutes les 60s. */
export function startCampagneScheduler() {
  processDueScheduledCampagnes().catch((err) => console.error("[campagne-scheduler] Vérification initiale échouée:", err));
  setInterval(() => {
    processDueScheduledCampagnes().catch((err) => console.error("[campagne-scheduler] Vérification périodique échouée:", err));
  }, 60_000);
}

export async function cancelCampagne(id: string) {
  const [existing] = await db.select().from(campagnes).where(eq(campagnes.id, id));
  if (!existing) throw new NotFoundError("Campagne introuvable");
  if (existing.status !== "SCHEDULED") {
    throw new ValidationError("Seule une campagne programmée peut être annulée", { status: ["not scheduled"] });
  }

  const [updated] = await db
    .update(campagnes)
    .set({ status: "CANCELLED", scheduledAt: null })
    .where(eq(campagnes.id, id))
    .returning();
  return enrichCampagne(updated);
}

export async function duplicateCampagne(id: string, actor: Actor) {
  const [source] = await db.select().from(campagnes).where(eq(campagnes.id, id));
  if (!source) throw new NotFoundError("Campagne introuvable");

  const [copy] = await db
    .insert(campagnes)
    .values({
      id: newId("camp"),
      title: `${source.title} (copie)`,
      content: source.content,
      type: source.type,
      coverImageId: source.coverImageId,
      targetFilters: source.targetFilters,
      channels: source.channels,
      status: "DRAFT",
      sentBy: actor.userId,
    })
    .returning();

  // Les médias (dont la bannière) suivent la copie : ce sont les mêmes fichiers, aucune ré-importation.
  const sourceAttachments = await db.select().from(campagneAttachments).where(eq(campagneAttachments.campagneId, id)).orderBy(campagneAttachments.order);
  if (sourceAttachments.length) {
    await db.insert(campagneAttachments).values(
      sourceAttachments.map((a) => ({
        id: newId("att"),
        campagneId: copy.id,
        fileId: a.fileId,
        type: a.type,
        order: a.order,
        caption: a.caption,
        isBanner: a.isBanner,
      }))
    );
  }

  return enrichCampagne(copy);
}

// ============================================================
// Livraisons
// ============================================================

export async function listDeliveries(campagneId: string) {
  const rows = await db.select().from(campagneDeliveries).where(eq(campagneDeliveries.campagneId, campagneId)).orderBy(desc(campagneDeliveries.sentAt));
  return Promise.all(
    rows.map(async (d) => {
      const user = await getUser(d.userId);
      const userName = user?.profile ? [user.profile.firstName, user.profile.lastName].filter(Boolean).join(" ") : undefined;
      return { ...d, userName };
    })
  );
}

export async function resendToFailed(campagneId: string) {
  const [campagne] = await db.select().from(campagnes).where(eq(campagnes.id, campagneId));
  if (!campagne) throw new NotFoundError("Campagne introuvable");

  const failed = await db
    .select()
    .from(campagneDeliveries)
    .where(and(eq(campagneDeliveries.campagneId, campagneId), eq(campagneDeliveries.status, "FAILED")));

  let recovered = 0;
  for (const delivery of failed) {
    const result = await dispatchToRecipient(campagne, delivery.userId, delivery.channel);
    if (result === "SENT") {
      await db.delete(campagneDeliveries).where(eq(campagneDeliveries.id, delivery.id));
      recovered++;
    }
  }

  if (recovered > 0) {
    await db
      .update(campagnes)
      .set({ statsSent: campagne.statsSent + recovered, statsFailed: Math.max(0, campagne.statsFailed - recovered) })
      .where(eq(campagnes.id, campagneId));
  }

  return { recovered, remaining: failed.length - recovered };
}

// ============================================================
// Pièces jointes
// ============================================================

/** Nombre maximum de médias dans le carrousel bannière (au-delà, le défilement devient inexploitable). */
export const MAX_BANNER_ITEMS = 8;

/** Seuls une image ou une vidéo peuvent servir de bannière ; le carrousel est plafonné. */
async function assertCanBeBanner(campagneId: string, attachmentType: string, excludeAttachmentId?: string) {
  if (attachmentType !== "IMAGE" && attachmentType !== "VIDEO") {
    throw new ValidationError("Seules les images et les vidéos peuvent servir de bannière.", { isBanner: ["not an image or video"] });
  }
  const current = await db
    .select({ id: campagneAttachments.id })
    .from(campagneAttachments)
    .where(and(eq(campagneAttachments.campagneId, campagneId), eq(campagneAttachments.isBanner, true)));
  if (current.filter((a) => a.id !== excludeAttachmentId).length >= MAX_BANNER_ITEMS) {
    throw new ValidationError(`Le carrousel est limité à ${MAX_BANNER_ITEMS} médias.`, { isBanner: ["too many banner items"] });
  }
}

export async function uploadAttachment(
  campagneId: string,
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string,
  data: { type: string; caption?: string; isBanner?: boolean },
  actor: Actor
) {
  const [campagne] = await db.select().from(campagnes).where(eq(campagnes.id, campagneId));
  if (!campagne) throw new NotFoundError("Campagne introuvable");
  if (data.isBanner) await assertCanBeBanner(campagneId, data.type);

  const fileId = newId("file");
  const key = `campagnes/${campagneId}/${sanitizeFilename(originalName)}`;
  await uploadObject(key, fileBuffer, mimeType);

  const [file] = await db
    .insert(storedFiles)
    .values({
      id: fileId,
      path: key,
      mimeType,
      originalName,
      checksum: crypto.createHash("sha256").update(fileBuffer).digest("hex"),
      size: fileBuffer.length,
      uploadedBy: actor.userId,
    })
    .returning();

  const [maxOrderRow] = await db
    .select({ order: campagneAttachments.order })
    .from(campagneAttachments)
    .where(eq(campagneAttachments.campagneId, campagneId))
    .orderBy(desc(campagneAttachments.order))
    .limit(1);

  const [attachment] = await db
    .insert(campagneAttachments)
    .values({
      id: newId("att"),
      campagneId,
      fileId: file.id,
      type: data.type,
      order: (maxOrderRow?.order ?? -1) + 1,
      caption: data.caption ?? null,
      isBanner: data.isBanner ?? false,
    })
    .returning();

  return { ...attachment, file: { ...file, encryptionKeyId: null } };
}

/** Bascule d'un média dans / hors du carrousel bannière, ou changement de sa légende. */
export async function updateAttachment(campagneId: string, attachmentId: string, patch: { isBanner?: boolean; caption?: string | null }) {
  const [existing] = await db
    .select()
    .from(campagneAttachments)
    .where(and(eq(campagneAttachments.id, attachmentId), eq(campagneAttachments.campagneId, campagneId)));
  if (!existing) throw new NotFoundError("Pièce jointe introuvable");

  if (patch.isBanner && !existing.isBanner) await assertCanBeBanner(campagneId, existing.type, attachmentId);

  const [updated] = await db
    .update(campagneAttachments)
    .set({
      ...(patch.isBanner !== undefined ? { isBanner: patch.isBanner } : {}),
      ...(patch.caption !== undefined ? { caption: patch.caption?.trim() || null } : {}),
    })
    .where(eq(campagneAttachments.id, attachmentId))
    .returning();
  const [file] = await db.select().from(storedFiles).where(eq(storedFiles.id, updated.fileId));
  return { ...updated, file: file ? { ...file, encryptionKeyId: null } : null };
}

/**
 * Diffuse le contenu d'un fichier (image de couverture ou pièce jointe)
 * d'une campagne. MinIO n'est joignable que depuis le réseau Docker, donc
 * le navigateur ne peut pas charger `file.path` directement — on vérifie
 * que le fichier appartient bien à CETTE campagne avant de le streamer,
 * pour ne pas exposer un accès générique "fichier par id" (storedFiles est
 * partagé avec des documents sensibles d'autres modules).
 */
export async function getCampagneFile(campagneId: string, fileId: string) {
  const [campagne] = await db.select().from(campagnes).where(eq(campagnes.id, campagneId));
  if (!campagne) throw new NotFoundError("Campagne introuvable");

  const belongsToCampagne =
    campagne.coverImageId === fileId ||
    (await db.select().from(campagneAttachments).where(and(eq(campagneAttachments.campagneId, campagneId), eq(campagneAttachments.fileId, fileId)))).length > 0;
  if (!belongsToCampagne) throw new NotFoundError("Fichier introuvable");

  const [file] = await db.select().from(storedFiles).where(eq(storedFiles.id, fileId));
  if (!file) throw new NotFoundError("Fichier introuvable");

  const { buffer, contentType } = await getObject(file.path);
  return { buffer, contentType: contentType ?? file.mimeType, filename: file.originalName };
}

export async function removeAttachment(campagneId: string, attachmentId: string) {
  const [existing] = await db
    .select()
    .from(campagneAttachments)
    .where(and(eq(campagneAttachments.id, attachmentId), eq(campagneAttachments.campagneId, campagneId)));
  if (!existing) throw new NotFoundError("Pièce jointe introuvable");
  await db.delete(campagneAttachments).where(eq(campagneAttachments.id, attachmentId));
}

export async function reorderAttachments(campagneId: string, orderedAttachmentIds: string[]) {
  await Promise.all(
    orderedAttachmentIds.map((attachmentId, index) =>
      db
        .update(campagneAttachments)
        .set({ order: index })
        .where(and(eq(campagneAttachments.id, attachmentId), eq(campagneAttachments.campagneId, campagneId)))
    )
  );
}

// ============================================================
// Ciblage
// ============================================================

export async function estimateRecipients(filters: CampagneTargetFilters) {
  const userIds = await resolveTargetUserIds(filters);

  const breakdown: { byCity?: Record<string, number> } = {};
  if (filters.cities?.length && userIds.length) {
    const profiles = await db
      .select({ city: identityUserProfiles.city })
      .from(identityUserProfiles)
      .where(inArray(identityUserProfiles.userId, userIds));
    breakdown.byCity = profiles.reduce((acc: Record<string, number>, p) => {
      const city = p.city ?? "Inconnu";
      acc[city] = (acc[city] ?? 0) + 1;
      return acc;
    }, {});
  }

  return { estimatedCount: userIds.length, breakdown };
}
