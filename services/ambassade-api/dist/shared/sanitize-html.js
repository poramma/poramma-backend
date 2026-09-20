"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeCampaignContent = sanitizeCampaignContent;
const sanitize_html_1 = __importDefault(require("sanitize-html"));
const OPTIONS = {
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
function sanitizeCampaignContent(content) {
    return (0, sanitize_html_1.default)(content, OPTIONS).trim();
}
//# sourceMappingURL=sanitize-html.js.map