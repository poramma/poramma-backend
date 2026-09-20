import sanitizeHtml from "sanitize-html";

/**
 * Nettoyage du contenu des campagnes CÔTÉ SERVEUR. L'éditeur du backoffice produit déjà un HTML
 * filtré et le portail citoyen le re-filtre à l'affichage, mais ce contenu part aussi dans des
 * emails (inséré tel quel dans le gabarit) et l'API peut être appelée sans passer par l'éditeur :
 * on ne fait donc jamais confiance à ce qui arrive. Liste blanche identique à celle de l'éditeur
 * (lib/campaignHtml.ts du backoffice) — tout le reste (script, style, iframe, image, gestionnaires
 * on*, liens javascript:…) est supprimé.
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "hr", "strong", "b", "em", "i", "u", "s", "h2", "h3", "ul", "ol", "li", "a", "blockquote", "table", "thead", "tbody", "tr", "th", "td"],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    th: ["colspan", "rowspan"],
    td: ["colspan", "rowspan"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowProtocolRelative: false,
  transformTags: {
    a: (tagName, attribs) => ({ tagName, attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer nofollow" } }),
  },
};

export function sanitizeCampaignContent(content: string): string {
  return sanitizeHtml(content, OPTIONS).trim();
}
