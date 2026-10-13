import "server-only";
import { PgBoss } from "pg-boss";
import { envoyerModele, type ModeleWhatsapp } from "./whatsapp";

// File de tâches pg-boss, stockée dans PostgreSQL (schéma « pgboss »).
// Sert aux envois différés (« quelques heures après l'adhésion ») et réessaie en cas d'échec.

export const FILE_WHATSAPP = "whatsapp";

export type TacheWhatsapp = {
  telephone: string;
  modele: Exclude<ModeleWhatsapp, "code">;
  parametres: string[];
};

const globalPourBoss = globalThis as unknown as { bossClans?: Promise<PgBoss> };

/** Instance démarrée de pg-boss (une seule par processus). */
export function boss(): Promise<PgBoss> {
  globalPourBoss.bossClans ??= (async () => {
    const instance = new PgBoss(process.env.DATABASE_URL ?? "");
    instance.on("error", (erreur) => console.error("pg-boss :", erreur));
    await instance.start();
    await instance.createQueue(FILE_WHATSAPP, { retryLimit: 5, retryDelay: 60, retryBackoff: true });
    return instance;
  })().catch((erreur) => {
    globalPourBoss.bossClans = undefined; // on retentera au prochain appel
    throw erreur;
  });
  return globalPourBoss.bossClans;
}

/** Programme un message WhatsApp, immédiatement ou après un délai (en secondes). */
export async function programmerWhatsapp(tache: TacheWhatsapp, delaiSecondes = 0) {
  const instance = await boss();
  await instance.send(FILE_WHATSAPP, tache, delaiSecondes > 0 ? { startAfter: delaiSecondes } : {});
}

/** Démarre le traitement des tâches (appelé une fois au démarrage du serveur). */
export async function demarrerTravailleurs() {
  const instance = await boss();
  await instance.work<TacheWhatsapp>(FILE_WHATSAPP, async (taches) => {
    for (const { data } of taches) {
      await envoyerModele(data.telephone, data.modele, data.parametres);
    }
  });
}
