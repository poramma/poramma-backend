"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const crypto_1 = __importDefault(require("crypto"));
const drizzle_orm_1 = require("drizzle-orm");
const connection_1 = require("../../db/connection");
const schema_etudiants_1 = require("../../db/schema.etudiants");
const schema_audit_1 = require("../../db/schema.audit");
const inue_service_1 = require("./inue.service");
const utils_1 = require("@poramma/utils");
let nextTestYear = 9500;
function testYear() {
    return nextTestYear++;
}
const actor = { userId: crypto_1.default.randomUUID(), roleName: "SENIOR_AGENT" };
async function createEtudiant() {
    const id = `etu-test-${crypto_1.default.randomUUID()}`;
    const userId = crypto_1.default.randomUUID();
    await connection_1.db.insert(schema_etudiants_1.etudiants).values({ id, userId, status: "VALIDATED" });
    return id;
}
const createdIds = [];
const usedYears = new Set();
async function makeEtudiant() {
    const id = await createEtudiant();
    createdIds.push(id);
    return id;
}
(0, vitest_1.afterEach)(async () => {
    if (createdIds.length > 0) {
        await connection_1.db.delete(schema_audit_1.auditLogs).where((0, drizzle_orm_1.inArray)(schema_audit_1.auditLogs.entityId, createdIds));
        await connection_1.db.delete(schema_etudiants_1.etudiants).where((0, drizzle_orm_1.inArray)(schema_etudiants_1.etudiants.id, createdIds));
        createdIds.length = 0;
    }
    if (usedYears.size > 0) {
        await connection_1.db.delete(schema_etudiants_1.inueSequences).where((0, drizzle_orm_1.inArray)(schema_etudiants_1.inueSequences.year, [...usedYears]));
        usedYears.clear();
    }
});
(0, vitest_1.afterAll)(async () => {
    await connection_1.pool.end();
});
(0, vitest_1.describe)("assignInue", () => {
    (0, vitest_1.it)("attribue des numéros séquentiels : 3 étudiants → 0001, 0002, 0003", async () => {
        const year = testYear();
        usedYears.add(year);
        const a = await makeEtudiant();
        const b = await makeEtudiant();
        const c = await makeEtudiant();
        const r1 = await (0, inue_service_1.assignInue)(a, year, actor);
        const r2 = await (0, inue_service_1.assignInue)(b, year, actor);
        const r3 = await (0, inue_service_1.assignInue)(c, year, actor);
        (0, vitest_1.expect)(r1.inue).toBe((0, inue_service_1.formatInue)(year, 1));
        (0, vitest_1.expect)(r2.inue).toBe((0, inue_service_1.formatInue)(year, 2));
        (0, vitest_1.expect)(r3.inue).toBe((0, inue_service_1.formatInue)(year, 3));
        (0, vitest_1.expect)(r1.inue).toMatch(/^\d+$/);
    });
    (0, vitest_1.it)("garantit l'unicité sous 100 attributions concurrentes, sans collision", async () => {
        const year = testYear();
        usedYears.add(year);
        const ids = await Promise.all(Array.from({ length: 100 }, () => makeEtudiant()));
        const results = await Promise.all(ids.map((id) => (0, inue_service_1.assignInue)(id, year, actor)));
        const inues = results.map((r) => r.inue);
        (0, vitest_1.expect)(new Set(inues).size).toBe(100);
        const expected = new Set(Array.from({ length: 100 }, (_, i) => (0, inue_service_1.formatInue)(year, i + 1)));
        (0, vitest_1.expect)(new Set(inues)).toEqual(expected);
    }, 30000);
    (0, vitest_1.it)("est idempotent : un second appel sur le même étudiant est rejeté, l'INUE initial ne change pas", async () => {
        const year = testYear();
        usedYears.add(year);
        const id = await makeEtudiant();
        const first = await (0, inue_service_1.assignInue)(id, year, actor);
        await (0, vitest_1.expect)((0, inue_service_1.assignInue)(id, year, actor)).rejects.toThrow(utils_1.ConflictError);
        const [row] = await connection_1.db.select().from(schema_etudiants_1.etudiants).where((0, drizzle_orm_1.eq)(schema_etudiants_1.etudiants.id, id));
        (0, vitest_1.expect)(row.inue).toBe(first.inue);
    });
    (0, vitest_1.it)("réinitialise la séquence à 0001 au changement d'année", async () => {
        const year = testYear();
        const nextYearValue = testYear();
        usedYears.add(year);
        usedYears.add(nextYearValue);
        const a = await makeEtudiant();
        const b = await makeEtudiant();
        const c = await makeEtudiant();
        await (0, inue_service_1.assignInue)(a, year, actor);
        await (0, inue_service_1.assignInue)(b, year, actor);
        const rollover = await (0, inue_service_1.assignInue)(c, nextYearValue, actor);
        (0, vitest_1.expect)(rollover.sequence).toBe(1);
        (0, vitest_1.expect)(rollover.inue).toBe((0, inue_service_1.formatInue)(nextYearValue, 1));
    });
    (0, vitest_1.it)("rejette un étudiant introuvable", async () => {
        const year = testYear();
        usedYears.add(year);
        await (0, vitest_1.expect)((0, inue_service_1.assignInue)(`etu-does-not-exist-${crypto_1.default.randomUUID()}`, year, actor)).rejects.toThrow(utils_1.NotFoundError);
    });
    (0, vitest_1.it)("écrit une entrée d'audit à chaque attribution", async () => {
        const year = testYear();
        usedYears.add(year);
        const id = await makeEtudiant();
        const result = await (0, inue_service_1.assignInue)(id, year, actor);
        const logs = await connection_1.db.select().from(schema_audit_1.auditLogs).where((0, drizzle_orm_1.eq)(schema_audit_1.auditLogs.entityId, id));
        const assignLog = logs.find((l) => l.action === "ASSIGN_INUE");
        (0, vitest_1.expect)(assignLog).toBeTruthy();
        (0, vitest_1.expect)(assignLog?.entityType).toBe("ETUDIANT");
        (0, vitest_1.expect)(assignLog?.details?.inue).toBe(result.inue);
    });
});
//# sourceMappingURL=inue.test.js.map