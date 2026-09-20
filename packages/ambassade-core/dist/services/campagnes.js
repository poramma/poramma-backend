"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.REACTION_TYPES = void 0;
exports.isBroadcast = isBroadcast;
exports.listForUser = listForUser;
exports.getForUser = getForUser;
exports.getMediaFile = getMediaFile;
exports.openMediaStream = openMediaStream;
exports.recordView = recordView;
exports.recordClick = recordClick;
exports.toggleReaction = toggleReaction;
exports.interactionStats = interactionStats;
const crypto_1 = __importDefault(require("crypto"));
const drizzle_orm_1 = require("drizzle-orm");
const utils_1 = require("@poramma/utils");
const storage_1 = require("@poramma/storage");
const campagnes_1 = require("../schema/campagnes");
const documents_1 = require("../schema/documents");
function newId(prefix) {
    return `${prefix}-${crypto_1.default.randomUUID()}`;
}
exports.REACTION_TYPES = ["LIKE", "PARTICIPATE"];
const VIEW_THROTTLE_MS = 30 * 60 * 1000;
const FEED_WINDOW = 300;
function isBroadcast(filters) {
    if (!filters || typeof filters !== "object")
        return true;
    return Object.values(filters).every((v) => v == null || (Array.isArray(v) && v.length === 0));
}
async function deliveredCampagneIds(db, userId) {
    const rows = await db.select({ id: campagnes_1.campagneDeliveries.campagneId }).from(campagnes_1.campagneDeliveries).where((0, drizzle_orm_1.eq)(campagnes_1.campagneDeliveries.userId, userId));
    return new Set(rows.map((r) => r.id));
}
async function visibleCampagnes(db, userId, type) {
    const rows = await db
        .select()
        .from(campagnes_1.campagnes)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(campagnes_1.campagnes.status, "SENT"), type ? (0, drizzle_orm_1.eq)(campagnes_1.campagnes.type, type) : undefined))
        .orderBy((0, drizzle_orm_1.desc)(campagnes_1.campagnes.sentAt))
        .limit(FEED_WINDOW);
    if (!rows.length)
        return rows;
    const delivered = await deliveredCampagneIds(db, userId);
    return rows.filter((r) => isBroadcast(r.targetFilters) || delivered.has(r.id));
}
async function getVisibleOrThrow(db, userId, id) {
    const [row] = await db.select().from(campagnes_1.campagnes).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(campagnes_1.campagnes.id, id), (0, drizzle_orm_1.eq)(campagnes_1.campagnes.status, "SENT")));
    if (!row)
        throw new utils_1.NotFoundError("Annonce introuvable");
    if (!isBroadcast(row.targetFilters) && !(await deliveredCampagneIds(db, userId)).has(id))
        throw new utils_1.NotFoundError("Annonce introuvable");
    return row;
}
async function assemble(db, userId, rows) {
    if (!rows.length)
        return [];
    const ids = rows.map((r) => r.id);
    const [attachmentRows, counts, mineRows] = await Promise.all([
        db.select().from(campagnes_1.campagneAttachments).where((0, drizzle_orm_1.inArray)(campagnes_1.campagneAttachments.campagneId, ids)).orderBy(campagnes_1.campagneAttachments.order),
        db
            .select({ campagneId: campagnes_1.campagneInteractions.campagneId, type: campagnes_1.campagneInteractions.type, n: (0, drizzle_orm_1.sql) `count(*)::int` })
            .from(campagnes_1.campagneInteractions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(campagnes_1.campagneInteractions.campagneId, ids), (0, drizzle_orm_1.inArray)(campagnes_1.campagneInteractions.type, [...exports.REACTION_TYPES])))
            .groupBy(campagnes_1.campagneInteractions.campagneId, campagnes_1.campagneInteractions.type),
        db
            .select({ campagneId: campagnes_1.campagneInteractions.campagneId, type: campagnes_1.campagneInteractions.type })
            .from(campagnes_1.campagneInteractions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(campagnes_1.campagneInteractions.userId, userId), (0, drizzle_orm_1.inArray)(campagnes_1.campagneInteractions.campagneId, ids), (0, drizzle_orm_1.inArray)(campagnes_1.campagneInteractions.type, [...exports.REACTION_TYPES]))),
    ]);
    const fileIds = [...new Set([...rows.map((r) => r.coverImageId).filter((x) => !!x), ...attachmentRows.map((a) => a.fileId)])];
    const files = fileIds.length ? await db.select().from(documents_1.storedFiles).where((0, drizzle_orm_1.inArray)(documents_1.storedFiles.id, fileIds)) : [];
    const fileById = new Map(files.map((f) => [f.id, f]));
    return rows.map((campagne) => {
        const count = (type) => counts.find((c) => c.campagneId === campagne.id && c.type === type)?.n ?? 0;
        const mine = (type) => mineRows.some((m) => m.campagneId === campagne.id && m.type === type);
        return {
            campagne,
            cover: campagne.coverImageId ? (fileById.get(campagne.coverImageId) ?? null) : null,
            attachments: attachmentRows
                .filter((a) => a.campagneId === campagne.id && fileById.has(a.fileId))
                .map((a) => ({ id: a.id, type: a.type, caption: a.caption, order: a.order, isBanner: a.isBanner, file: fileById.get(a.fileId) })),
            likes: count("LIKE"),
            participants: count("PARTICIPATE"),
            mine: { liked: mine("LIKE"), participating: mine("PARTICIPATE") },
        };
    });
}
async function listForUser(db, userId, opts = {}) {
    const visible = await visibleCampagnes(db, userId, opts.type);
    const offset = opts.offset ?? 0;
    return assemble(db, userId, visible.slice(offset, offset + (opts.limit ?? 30)));
}
async function getForUser(db, userId, id) {
    return (await assemble(db, userId, [await getVisibleOrThrow(db, userId, id)]))[0];
}
async function getMediaFile(db, userId, fileId) {
    const asCover = await db.select().from(campagnes_1.campagnes).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(campagnes_1.campagnes.coverImageId, fileId), (0, drizzle_orm_1.eq)(campagnes_1.campagnes.status, "SENT")));
    const asAttachment = await db
        .select({ c: campagnes_1.campagnes })
        .from(campagnes_1.campagneAttachments)
        .innerJoin(campagnes_1.campagnes, (0, drizzle_orm_1.eq)(campagnes_1.campagneAttachments.campagneId, campagnes_1.campagnes.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(campagnes_1.campagneAttachments.fileId, fileId), (0, drizzle_orm_1.eq)(campagnes_1.campagnes.status, "SENT")));
    const candidates = [...asCover, ...asAttachment.map((r) => r.c)];
    if (!candidates.length)
        throw new utils_1.NotFoundError("Fichier introuvable");
    const delivered = await deliveredCampagneIds(db, userId);
    if (!candidates.some((c) => isBroadcast(c.targetFilters) || delivered.has(c.id)))
        throw new utils_1.NotFoundError("Fichier introuvable");
    const [file] = await db.select().from(documents_1.storedFiles).where((0, drizzle_orm_1.eq)(documents_1.storedFiles.id, fileId));
    if (!file)
        throw new utils_1.NotFoundError("Fichier introuvable");
    return file;
}
function openMediaStream(file, range) {
    return (0, storage_1.getObjectStream)(file.path, range);
}
async function refreshStats(db, campagneId) {
    await db.execute((0, drizzle_orm_1.sql) `
    update ambassade.campagnes set
      stats_opened = (select count(distinct user_id) from ambassade.campagne_interactions where campagne_id = ${campagneId} and type = 'VIEW'),
      stats_clicked = (select count(distinct user_id) from ambassade.campagne_interactions where campagne_id = ${campagneId} and type = 'CLICK')
    where id = ${campagneId}`);
}
async function touchDelivery(db, userId, campagneId, column) {
    await db
        .update(campagnes_1.campagneDeliveries)
        .set({ [column]: new Date() })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(campagnes_1.campagneDeliveries.campagneId, campagneId), (0, drizzle_orm_1.eq)(campagnes_1.campagneDeliveries.userId, userId), (0, drizzle_orm_1.sql) `${campagnes_1.campagneDeliveries[column]} is null`));
}
async function recordView(db, params) {
    await getVisibleOrThrow(db, params.userId, params.campagneId);
    const [recent] = await db
        .select({ id: campagnes_1.campagneInteractions.id })
        .from(campagnes_1.campagneInteractions)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(campagnes_1.campagneInteractions.campagneId, params.campagneId), (0, drizzle_orm_1.eq)(campagnes_1.campagneInteractions.userId, params.userId), (0, drizzle_orm_1.eq)(campagnes_1.campagneInteractions.type, "VIEW"), (0, drizzle_orm_1.gte)(campagnes_1.campagneInteractions.createdAt, new Date(Date.now() - VIEW_THROTTLE_MS))))
        .limit(1);
    if (recent)
        return { recorded: false };
    await db.insert(campagnes_1.campagneInteractions).values({ id: newId("cint"), campagneId: params.campagneId, userId: params.userId, type: "VIEW" });
    await touchDelivery(db, params.userId, params.campagneId, "openedAt");
    await refreshStats(db, params.campagneId);
    return { recorded: true };
}
async function recordClick(db, params) {
    await getVisibleOrThrow(db, params.userId, params.campagneId);
    if (!/^link:.{1,180}$/.test(params.targetId)) {
        const [attachment] = await db
            .select({ id: campagnes_1.campagneAttachments.id })
            .from(campagnes_1.campagneAttachments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(campagnes_1.campagneAttachments.id, params.targetId), (0, drizzle_orm_1.eq)(campagnes_1.campagneAttachments.campagneId, params.campagneId)));
        if (!attachment)
            throw new utils_1.ValidationError("Cible de clic invalide", { targetId: ["unknown target"] });
    }
    await db.insert(campagnes_1.campagneInteractions).values({ id: newId("cint"), campagneId: params.campagneId, userId: params.userId, type: "CLICK", targetId: params.targetId });
    await touchDelivery(db, params.userId, params.campagneId, "clickedAt");
    await refreshStats(db, params.campagneId);
}
async function toggleReaction(db, params) {
    const campagne = await getVisibleOrThrow(db, params.userId, params.campagneId);
    if (params.type === "PARTICIPATE" && campagne.type !== "EVENT") {
        throw new utils_1.ValidationError("La participation n'est possible que pour un événement", { type: ["not an event"] });
    }
    const removed = await db
        .delete(campagnes_1.campagneInteractions)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(campagnes_1.campagneInteractions.campagneId, params.campagneId), (0, drizzle_orm_1.eq)(campagnes_1.campagneInteractions.userId, params.userId), (0, drizzle_orm_1.eq)(campagnes_1.campagneInteractions.type, params.type)))
        .returning({ id: campagnes_1.campagneInteractions.id });
    let active = false;
    if (!removed.length) {
        await db
            .insert(campagnes_1.campagneInteractions)
            .values({ id: newId("cint"), campagneId: params.campagneId, userId: params.userId, type: params.type })
            .onConflictDoNothing();
        active = true;
    }
    const [row] = await db
        .select({ n: (0, drizzle_orm_1.sql) `count(*)::int` })
        .from(campagnes_1.campagneInteractions)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(campagnes_1.campagneInteractions.campagneId, params.campagneId), (0, drizzle_orm_1.eq)(campagnes_1.campagneInteractions.type, params.type)));
    return { active, count: row?.n ?? 0 };
}
async function interactionStats(db, campagneIds) {
    const result = new Map();
    const empty = () => ({ views: 0, uniqueViewers: 0, clicks: 0, uniqueClickers: 0, likes: 0, participants: 0, clicksByTarget: [] });
    for (const id of campagneIds)
        result.set(id, empty());
    if (!campagneIds.length)
        return result;
    const [totals, byTarget] = await Promise.all([
        db
            .select({
            campagneId: campagnes_1.campagneInteractions.campagneId,
            type: campagnes_1.campagneInteractions.type,
            total: (0, drizzle_orm_1.sql) `count(*)::int`,
            users: (0, drizzle_orm_1.sql) `count(distinct ${campagnes_1.campagneInteractions.userId})::int`,
        })
            .from(campagnes_1.campagneInteractions)
            .where((0, drizzle_orm_1.inArray)(campagnes_1.campagneInteractions.campagneId, campagneIds))
            .groupBy(campagnes_1.campagneInteractions.campagneId, campagnes_1.campagneInteractions.type),
        db
            .select({ campagneId: campagnes_1.campagneInteractions.campagneId, targetId: campagnes_1.campagneInteractions.targetId, n: (0, drizzle_orm_1.sql) `count(*)::int` })
            .from(campagnes_1.campagneInteractions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(campagnes_1.campagneInteractions.campagneId, campagneIds), (0, drizzle_orm_1.eq)(campagnes_1.campagneInteractions.type, "CLICK")))
            .groupBy(campagnes_1.campagneInteractions.campagneId, campagnes_1.campagneInteractions.targetId),
    ]);
    for (const t of totals) {
        const s = result.get(t.campagneId);
        if (t.type === "VIEW")
            ((s.views = t.total), (s.uniqueViewers = t.users));
        else if (t.type === "CLICK")
            ((s.clicks = t.total), (s.uniqueClickers = t.users));
        else if (t.type === "LIKE")
            s.likes = t.total;
        else if (t.type === "PARTICIPATE")
            s.participants = t.total;
    }
    for (const b of byTarget)
        result.get(b.campagneId).clicksByTarget.push({ targetId: b.targetId ?? "—", count: b.n });
    return result;
}
//# sourceMappingURL=campagnes.js.map