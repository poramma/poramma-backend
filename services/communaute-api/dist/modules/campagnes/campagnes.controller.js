"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCampagnes = listCampagnes;
exports.getCampagne = getCampagne;
exports.recordView = recordView;
exports.recordClick = recordClick;
exports.toggleReaction = toggleReaction;
exports.streamMedia = streamMedia;
const ambassade_core_1 = require("@poramma/ambassade-core");
const dto_1 = require("@poramma/dto");
const utils_1 = require("@poramma/utils");
const connection_1 = require("../../db/connection");
const public_mappers_1 = require("../../shared/public-mappers");
const media_token_1 = require("../../shared/media-token");
function zodDetails(error) {
    return error.flatten().fieldErrors;
}
const userIdOf = (req) => req.userId;
const PUBLIC_PREFIX = "/api/communaute";
const signFor = (userId) => (fileId) => `${PUBLIC_PREFIX}${(0, media_token_1.signMediaPath)(fileId, userId)}`;
async function listCampagnes(req, res) {
    const parsed = dto_1.communityCampagnesDto.listCampagnesQueryDto.safeParse(req.query);
    if (!parsed.success)
        throw new utils_1.ValidationError("Paramètres invalides", zodDetails(parsed.error));
    const items = await ambassade_core_1.campagnesLogic.listForUser(connection_1.db, userIdOf(req), parsed.data);
    res.json((0, dto_1.ok)(items.map((i) => (0, public_mappers_1.toPublicCampagne)(i, signFor(userIdOf(req))))));
}
async function getCampagne(req, res) {
    const item = await ambassade_core_1.campagnesLogic.getForUser(connection_1.db, userIdOf(req), req.params.id);
    res.json((0, dto_1.ok)((0, public_mappers_1.toPublicCampagne)(item, signFor(userIdOf(req)))));
}
async function recordView(req, res) {
    res.json((0, dto_1.ok)(await ambassade_core_1.campagnesLogic.recordView(connection_1.db, { userId: userIdOf(req), campagneId: req.params.id })));
}
async function recordClick(req, res) {
    const parsed = dto_1.communityCampagnesDto.clickCampagneDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    await ambassade_core_1.campagnesLogic.recordClick(connection_1.db, { userId: userIdOf(req), campagneId: req.params.id, targetId: parsed.data.targetId });
    res.status(204).send();
}
async function toggleReaction(req, res) {
    const type = dto_1.communityCampagnesDto.reactionTypeDto.safeParse(req.params.type);
    if (!type.success)
        throw new utils_1.ValidationError("Réaction inconnue", { type: ["LIKE | PARTICIPATE"] });
    res.json((0, dto_1.ok)(await ambassade_core_1.campagnesLogic.toggleReaction(connection_1.db, { userId: userIdOf(req), campagneId: req.params.id, type: type.data })));
}
async function streamMedia(req, res) {
    const fileId = req.params.fileId;
    const userId = (0, media_token_1.verifyMediaToken)(fileId, req.query);
    if (!userId) {
        res.status(403).json({ code: "FORBIDDEN", message: "Lien de média invalide ou expiré. Rechargez la page." });
        return;
    }
    const file = await ambassade_core_1.campagnesLogic.getMediaFile(connection_1.db, userId, fileId);
    const range = typeof req.headers.range === "string" ? req.headers.range : undefined;
    let object;
    try {
        object = await ambassade_core_1.campagnesLogic.openMediaStream(file, range);
    }
    catch (err) {
        if (err?.name === "InvalidRange" || err?.$metadata?.httpStatusCode === 416) {
            res.status(416).setHeader("Content-Range", `bytes */${file.size}`).end();
            return;
        }
        throw err;
    }
    const inlineTypes = /^(image\/|video\/|application\/pdf)/;
    const asAttachment = req.query.download === "1" || !inlineTypes.test(file.mimeType);
    res.status(object.contentRange ? 206 : 200);
    res.setHeader("Content-Type", file.mimeType);
    if (object.contentLength != null)
        res.setHeader("Content-Length", String(object.contentLength));
    if (object.contentRange)
        res.setHeader("Content-Range", object.contentRange);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
    res.setHeader("Content-Disposition", `${asAttachment ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(file.originalName)}`);
    object.stream.on("error", () => res.destroy());
    req.on("close", () => object.stream.destroy());
    object.stream.pipe(res);
}
//# sourceMappingURL=campagnes.controller.js.map