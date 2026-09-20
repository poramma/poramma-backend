/**
 * Mappers "public" (RÈGLE-06 / mission §10.1) : TOUT ce qui sort de
 * communaute-api vers un membre de la communauté passe par ici. On construit
 * l'objet champ par champ (liste blanche) plutôt que de retirer des champs
 * d'un objet existant — un nouveau champ ajouté plus tard côté base ne fuit
 * donc jamais par défaut.
 *
 * Jamais exposés : identité ou identifiant d'un agent (assignation,
 * relecteur, auteur d'un message/historique), chemin de stockage MinIO,
 * checksum, identifiants internes de revue.
 */

const EMBASSY_LABEL = "Service consulaire";

export function toPublicSubService(sub: any) {
  if (!sub) return null;
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

/** Le Conseiller Culturel se présente à visage découvert (nom + fonction) ; jamais son identifiant interne. */
export function toPublicAdvisor(advisor: { name: string; title: string } | null | undefined) {
  return advisor ? { name: advisor.name, title: advisor.title } : null;
}

export function toPublicDemande(row: any, subService: any, advisor?: { name: string; title: string } | null) {
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

export function toPublicHistory(h: any) {
  return {
    id: h.id,
    action: h.action,
    fromStatus: h.fromStatus,
    toStatus: h.toStatus,
    comment: h.comment,
    createdAt: h.createdAt,
  };
}

/**
 * `revealAgent` : espace culturel uniquement — le Conseiller Culturel signe de son vrai nom.
 * Pour tout autre service, un message de l'ambassade est signé du service, jamais de l'agent.
 */
export function toPublicComment(c: any, revealAgent = false) {
  const isMember = c.authorType === "STUDENT";
  return {
    id: c.id,
    content: c.content,
    createdAt: c.createdAt,
    authorType: isMember ? "STUDENT" : "AGENT",
    authorName: isMember ? c.authorName : revealAgent && c.authorName ? c.authorName : EMBASSY_LABEL,
  };
}

export function toPublicRequirement(r: any) {
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

/** Document tel qu'il sort de documentsLogic (enrichi pour le staff) → vue citoyen. */
export function toPublicDocument(d: any) {
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

/** Ligne de listDemandeDocuments (jointure demande↔document) → vue citoyen. */
export function toPublicDemandeDocument(d: any) {
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

/** Notification in-app → vue citoyen (`body` est renommé `message` côté client ; le payload est réduit à des identifiants de navigation). */
export function toPublicNotification(n: any) {
  const p = (n.payload ?? {}) as Record<string, unknown>;
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

/**
 * Rendez-vous → vue citoyen. Jamais exposés : agent (id, nom, matricule),
 * identifiant de créneau interne (il embarque l'id de l'agent), créateur.
 * `canModify` = annulable / déplaçable (statut actif et heure pas encore passée).
 */
export function toPublicRendezVous(item: any) {
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
    // Espace culturel : le conseiller se présente à visage découvert (null pour un service consulaire).
    advisor: toPublicAdvisor(item.advisor),
    canModify: item.canModify,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

/** Texte brut d'un contenu HTML (aperçu des cartes du fil). */
function excerptOf(html: string, max = 220): string {
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

/**
 * Annonce de l'ambassade → vue citoyen. Jamais exposés : auteur (agent), ciblage,
 * canaux, statistiques, chemins MinIO, checksums. Les médias sont des URLs signées
 * propres à ce citoyen (voir shared/media-token.ts) ; `signPath` les fabrique.
 */
export function toPublicCampagne(item: any, signPath: (fileId: string) => string) {
  const c = item.campagne;
  const media = (file: any) => ({
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
    attachments: item.attachments.map((a: any) => ({
      id: a.id,
      type: a.type, // IMAGE | VIDEO | DOCUMENT
      caption: a.caption,
      isBanner: a.isBanner === true, // carrousel affiché entre le titre et le contenu
      ...media(a.file),
    })),
    likes: item.likes,
    participants: item.participants,
    likedByMe: item.mine.liked,
    participatingByMe: item.mine.participating,
  };
}
