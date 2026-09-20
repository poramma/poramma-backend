"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAudited = markAudited;
exports.deriveAuditTarget = deriveAuditTarget;
exports.auditTrail = auditTrail;
const async_hooks_1 = require("async_hooks");
const storage = new async_hooks_1.AsyncLocalStorage();
function markAudited() {
    const state = storage.getStore();
    if (state)
        state.audited = true;
}
const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const ENTITY_BY_SEGMENT = {
    demandes: "DEMANDE",
    requirements: "EXIGENCE",
    "rendez-vous": "RENDEZ_VOUS",
    "agenda-slots": "RENDEZ_VOUS",
    etudiants: "ETUDIANT",
    inue: "INUE",
    documents: "DOCUMENT",
    "internal-documents": "DOCUMENT_INTERNE",
    campagnes: "CAMPAGNE",
    attachments: "PIECE_JOINTE_CAMPAGNE",
    services: "SERVICE",
    "sub-services": "SOUS_SERVICE",
    schedules: "HORAIRE_SERVICE",
    agents: "AGENT",
    assignments: "AFFECTATION_AGENT",
    availabilities: "DISPONIBILITE_AGENT",
    exceptions: "EXCEPTION",
    roles: "ROLE",
    permissions: "PERMISSION",
    users: "UTILISATEUR",
    threads: "FIL_MESSAGERIE",
    messages: "MESSAGE",
    notifications: "NOTIFICATION",
    profile: "PROFIL",
    "agent-requests": "DEMANDE_AGENT",
    auth: "AUTHENTIFICATION",
    audit: "AUDIT",
    payments: "PAIEMENT",
    comments: "COMMENTAIRE",
    notes: "NOTE",
};
const ACTION_BY_VERB = {
    validate: "VALIDATE",
    reject: "REJECT",
    suspend: "SUSPEND",
    assign: "ASSIGN",
    "assign-inue": "ASSIGN_INUE",
    archive: "ARCHIVE",
    cancel: "CANCEL",
    send: "SEND",
    schedule: "SCHEDULE",
    duplicate: "DUPLICATE",
    reorder: "REORDER",
    resend: "RESEND",
    "resend-failed": "RESEND",
    "check-in": "CHECK_IN",
    complete: "COMPLETE",
    reprint: "REPRINT",
    "print-daily": "PRINT",
    urgence: "CREATE_URGENT",
    status: "UPDATE_STATUS",
    share: "SHARE",
    password: "CHANGE_PASSWORD",
    "reset-password": "RESET_PASSWORD",
    "forgot-password": "FORGOT_PASSWORD",
    "switch-role": "SWITCH_ROLE",
    logout: "LOGOUT",
    export: "EXPORT",
    enroll: "ENROLL",
    read: "READ",
    "read-all": "READ",
    process: "PROCESS",
};
const METHOD_ACTION = { POST: "CREATE", PUT: "UPDATE", PATCH: "UPDATE", DELETE: "DELETE" };
const WARNING_ACTIONS = new Set(["DELETE", "REJECT", "SUSPEND", "CANCEL", "ARCHIVE", "CHANGE_PASSWORD", "RESET_PASSWORD", "SWITCH_ROLE", "SEND", "EXPORT"]);
function deriveAuditTarget(method, routePath) {
    const segments = routePath.split("/").filter(Boolean);
    const statics = segments.filter((s) => !s.startsWith(":"));
    const params = segments.filter((s) => s.startsWith(":")).map((s) => s.slice(1));
    let entityType = "SYSTEME";
    for (const seg of statics)
        if (ENTITY_BY_SEGMENT[seg])
            entityType = ENTITY_BY_SEGMENT[seg];
    const last = segments[segments.length - 1];
    const verb = last && !last.startsWith(":") && !ENTITY_BY_SEGMENT[last] ? last : undefined;
    const action = (verb && ACTION_BY_VERB[verb]) ?? (verb ? verb.toUpperCase().replace(/-/g, "_") : METHOD_ACTION[method] ?? method);
    return { entityType, action, idParam: params[params.length - 1] };
}
function auditTrail(options) {
    return (req, res, next) => {
        if (!MUTATING.has(req.method)) {
            next();
            return;
        }
        const state = { audited: false };
        res.on("finish", () => {
            if (state.audited)
                return;
            const userId = req.userId;
            if (!userId)
                return;
            const status = res.statusCode;
            const isSuccess = status < 400;
            const isDenied = status === 403;
            if (!isSuccess && !isDenied)
                return;
            const routePath = `${req.baseUrl ?? ""}${req.route?.path ?? ""}`;
            const { entityType, action, idParam } = deriveAuditTarget(req.method, routePath);
            void options
                .write({
                action,
                entityType,
                entityId: (idParam && req.params?.[idParam]) || "-",
                actor: { userId, roleName: req.roleName ?? null },
                result: isSuccess ? "SUCCESS" : "REJECT",
                severity: isDenied ? "WARNING" : WARNING_ACTIONS.has(action) ? "WARNING" : "INFO",
                details: { method: req.method, route: routePath, status, automatic: true },
                ip: req.ip ?? null,
                ua: req.headers["user-agent"] ?? null,
                sessionId: req.sessionId ?? null,
            })
                .catch((err) => console.error("[audit-trail] écriture échouée :", err.message));
        });
        storage.run(state, () => next());
    };
}
//# sourceMappingURL=audit-trail.js.map