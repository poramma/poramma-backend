import { describe, it, expect, afterEach, afterAll } from "vitest";
import crypto from "crypto";
import { eq, inArray } from "drizzle-orm";
import { db, pool } from "../../db/connection";
import { etudiants, inueSequences } from "../../db/schema.etudiants";
import { auditLogs } from "../../db/schema.audit";
import { assignInue, formatInue } from "./inue.service";
import { ConflictError, NotFoundError } from "@poramma/utils";

// Années réservées aux tests, hors de toute plage réellement utilisée par
// l'application (2026...), pour ne jamais interférer avec des séquences
// réelles ni avec des tests exécutés en parallèle.
let nextTestYear = 9500;
function testYear(): number {
  return nextTestYear++;
}

const actor = { userId: crypto.randomUUID(), roleName: "SENIOR_AGENT" };

async function createEtudiant() {
  const id = `etu-test-${crypto.randomUUID()}`;
  const userId = crypto.randomUUID();
  await db.insert(etudiants).values({ id, userId, status: "VALIDATED" });
  return id;
}

const createdIds: string[] = [];
const usedYears = new Set<number>();

async function makeEtudiant(): Promise<string> {
  const id = await createEtudiant();
  createdIds.push(id);
  return id;
}

afterEach(async () => {
  // Nettoyage entre chaque test pour ne pas laisser de données de test dans
  // la base de dev partagée.
  if (createdIds.length > 0) {
    await db.delete(auditLogs).where(inArray(auditLogs.entityId, createdIds));
    await db.delete(etudiants).where(inArray(etudiants.id, createdIds));
    createdIds.length = 0;
  }
  if (usedYears.size > 0) {
    await db.delete(inueSequences).where(inArray(inueSequences.year, [...usedYears]));
    usedYears.clear();
  }
});

afterAll(async () => {
  await pool.end();
});

describe("assignInue", () => {
  it("attribue des numéros séquentiels : 3 étudiants → 0001, 0002, 0003", async () => {
    const year = testYear();
    usedYears.add(year);

    const a = await makeEtudiant();
    const b = await makeEtudiant();
    const c = await makeEtudiant();

    const r1 = await assignInue(a, year, actor);
    const r2 = await assignInue(b, year, actor);
    const r3 = await assignInue(c, year, actor);

    expect(r1.inue).toBe(formatInue(year, 1));
    expect(r2.inue).toBe(formatInue(year, 2));
    expect(r3.inue).toBe(formatInue(year, 3));
    expect(r1.inue).toMatch(/^\d+$/); // uniquement des chiffres, aucun séparateur
  });

  it("garantit l'unicité sous 100 attributions concurrentes, sans collision", async () => {
    const year = testYear();
    usedYears.add(year);

    const ids = await Promise.all(Array.from({ length: 100 }, () => makeEtudiant()));

    const results = await Promise.all(ids.map((id) => assignInue(id, year, actor)));

    const inues = results.map((r) => r.inue);
    expect(new Set(inues).size).toBe(100); // 100 valeurs distinctes, aucune collision

    const expected = new Set(Array.from({ length: 100 }, (_, i) => formatInue(year, i + 1)));
    expect(new Set(inues)).toEqual(expected);
  }, 30000);

  it("est idempotent : un second appel sur le même étudiant est rejeté, l'INUE initial ne change pas", async () => {
    const year = testYear();
    usedYears.add(year);
    const id = await makeEtudiant();

    const first = await assignInue(id, year, actor);

    await expect(assignInue(id, year, actor)).rejects.toThrow(ConflictError);

    const [row] = await db.select().from(etudiants).where(eq(etudiants.id, id));
    expect(row.inue).toBe(first.inue);
  });

  it("réinitialise la séquence à 0001 au changement d'année", async () => {
    const year = testYear();
    const nextYearValue = testYear();
    usedYears.add(year);
    usedYears.add(nextYearValue);

    const a = await makeEtudiant();
    const b = await makeEtudiant();
    const c = await makeEtudiant();

    await assignInue(a, year, actor);
    await assignInue(b, year, actor);
    const rollover = await assignInue(c, nextYearValue, actor);

    expect(rollover.sequence).toBe(1);
    expect(rollover.inue).toBe(formatInue(nextYearValue, 1));
  });

  it("rejette un étudiant introuvable", async () => {
    const year = testYear();
    usedYears.add(year);
    await expect(assignInue(`etu-does-not-exist-${crypto.randomUUID()}`, year, actor)).rejects.toThrow(NotFoundError);
  });

  it("écrit une entrée d'audit à chaque attribution", async () => {
    const year = testYear();
    usedYears.add(year);
    const id = await makeEtudiant();

    const result = await assignInue(id, year, actor);

    const logs = await db.select().from(auditLogs).where(eq(auditLogs.entityId, id));
    const assignLog = logs.find((l) => l.action === "ASSIGN_INUE");
    expect(assignLog).toBeTruthy();
    expect(assignLog?.entityType).toBe("ETUDIANT");
    expect((assignLog?.details as any)?.inue).toBe(result.inue);
  });
});
