import { pingStorage } from "@poramma/storage";

/** Résultat d'une sonde : jamais de message d'erreur brut (il pourrait contenir un hôte ou un identifiant interne). */
export interface Probe {
  ok: boolean;
  ms: number;
}

async function timed(fn: () => Promise<unknown>): Promise<Probe> {
  const t = Date.now();
  try {
    await fn();
    return { ok: true, ms: Date.now() - t };
  } catch {
    return { ok: false, ms: Date.now() - t };
  }
}

/** Le stockage objet (bucket des pièces jointes et médias) répond-il ? */
export function checkStorage(): Promise<Probe> {
  return timed(pingStorage);
}

export { timed as probe };
