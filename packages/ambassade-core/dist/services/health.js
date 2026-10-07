"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkStorage = checkStorage;
exports.probe = timed;
const storage_1 = require("@poramma/storage");
async function timed(fn) {
    const t = Date.now();
    try {
        await fn();
        return { ok: true, ms: Date.now() - t };
    }
    catch {
        return { ok: false, ms: Date.now() - t };
    }
}
function checkStorage() {
    return timed(storage_1.pingStorage);
}
//# sourceMappingURL=health.js.map