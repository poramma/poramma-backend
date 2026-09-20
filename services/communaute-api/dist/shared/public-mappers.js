"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toPublicSubService = toPublicSubService;
exports.toPublicAdvisor = toPublicAdvisor;
exports.toPublicDemande = toPublicDemande;
exports.toPublicHistory = toPublicHistory;
exports.toPublicComment = toPublicComment;
exports.toPublicRequirement = toPublicRequirement;
exports.toPublicDocument = toPublicDocument;
exports.toPublicDemandeDocument = toPublicDemandeDocument;
exports.toPublicNotification = toPublicNotification;
exports.toPublicRendezVous = toPublicRendezVous;
exports.toPublicCampagne = toPublicCampagne;
const EMBASSY_LABEL = "Service consulaire";
function toPublicSubService(sub) {
    if (!sub)
        return null;
    return {
        id: sub.id,
        name: sub.name,
        code: sub.code,
        basePrice: sub.basePrice != null ? Number(sub.basePrice) : null,
        currency: sub.currency,
        slaDays: sub.slaDays,
        service: sub.service ? { id: sub.service.id, name: sub.service.name, isCultural: sub.service.isCultural === true } : null,
    };
}
function toPublicAdvisor(advisor) {
    return advisor ? { name: advisor.name, title: advisor.title } : null;
}
function toPublicDemande(row, subService, advisor) {
    return {
        id: row.id,
        dossierNumber: row.dossierNumber,
        status: row.status,
        priority: row.priority,
        totalAmount: row.totalAmount != null ? Number(row.totalAmount) : null,
        currency: row.currency,
        customPayload: row.customPayload,
        submittedAt: row.submittedAt,
        deadlineAt: row.deadlineAt,
        completedAt: row.completedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        subService: toPublicSubService(subService),
        advisor: toPublicAdvisor(advisor),
    };
}
function toPublicHistory(h) {
    return {
        id: h.id,
        action: h.action,
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        comment: h.comment,
        createdAt: h.createdAt,
    };
}
function toPublicComment(c, revealAgent = false) {
    const isMember = c.authorType === "STUDENT";
    return {
        id: c.id,
        content: c.content,
        createdAt: c.createdAt,
        authorType: isMember ? "STUDENT" : "AGENT",
        authorName: isMember ? c.authorName : revealAgent && c.authorName ? c.authorName : EMBASSY_LABEL,
    };
}
function toPublicRequirement(r) {
    return {
        id: r.id,
        requirementId: r.requirementId,
        label: r.label,
        type: r.type,
        status: r.status,
        providedDocumentId: r.providedDocumentId,
        reviewerNote: r.reviewerNote,
    };
}
function toPublicDocument(d) {
    return {
        id: d.id,
        type: d.type,
        status: d.status,
        reviewNote: d.reviewNote,
        expiryDate: d.expiryDate,
        version: d.version,
        notes: d.notes,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        file: d.file
            ? { originalName: d.file.originalName, mimeType: d.file.mimeType, size: d.file.size, uploadedAt: d.file.uploadedAt }
            : null,
        category: d.category ? { id: d.category.id, name: d.category.name } : null,
    };
}
function toPublicDemandeDocument(d) {
    return {
        id: d.documentId,
        requirementId: d.requirementId,
        type: d.type,
        status: d.status,
        reviewNote: d.reviewNote,
        createdAt: d.createdAt,
        file: { originalName: d.originalName, mimeType: d.mimeType, size: d.size },
    };
}
function toPublicNotification(n) {
    const p = (n.payload ?? {});
    return {
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.body,
        status: n.status,
        actionUrl: n.actionUrl ?? null,
        demandeId: typeof p.demandeId === "string" ? p.demandeId : null,
        rendezVousId: typeof p.rendezVousId === "string" ? p.rendezVousId : null,
        readAt: n.readAt,
        createdAt: n.createdAt,
    };
}
function toPublicRendezVous(item) {
    const r = item.row;
    return {
        id: r.id,
        ticketId: r.ticketId,
        status: r.status,
        type: r.type,
        date: r.date,
        startTime: item.startTime,
        endTime: item.endTime,
        motif: r.motif,
        demandeId: r.demandeId,
        subService: item.subService,
        advisor: toPublicAdvisor(item.advisor),
        canModify: item.canModify,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
    };
}
function excerptOf(html, max = 220) {
    const text = html
        .replace(/<(style|script)[\s\S]*?<\/\1>/gi, "")
        .replace(/<\/(p|div|h[1-6]|li)>/gi, " ")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\s+/g, " ")
        .trim();
    return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}
function toPublicCampagne(item, signPath) {
    const c = item.campagne;
    const media = (file) => ({
        name: file.originalName,
        mimeType: file.mimeType,
        size: file.size,
        url: signPath(file.id),
    });
    return {
        id: c.id,
        type: c.type,
        title: c.title,
        excerpt: excerptOf(c.content),
        content: c.content,
        publishedAt: c.sentAt,
        cover: item.cover ? media(item.cover) : null,
        attachments: item.attachments.map((a) => ({
            id: a.id,
            type: a.type,
            caption: a.caption,
            isBanner: a.isBanner === true,
            ...media(a.file),
        })),
        likes: item.likes,
        participants: item.participants,
        likedByMe: item.mine.liked,
        participatingByMe: item.mine.participating,
    };
}
//# sourceMappingURL=public-mappers.js.map