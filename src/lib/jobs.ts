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

// En développement, des travailleurs pg-boss actifs dans le serveur `next dev` font recharger
// les pages en boucle. Les tâches y sont donc exécutées tout de suite, sans file ni délai.
const fileActive = process.env.NODE_ENV === "production";

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
  if (!fileActive) {
    console.info(`[Tâche exécutée immédiatement en dev, délai prévu : ${delaiSecondes} s]`);
    await envoyerModele(tache.telephone, tache.modele, tache.parametres);
    return;
  }
  const instance = await boss();
  await instance.send(FILE_WHATSAPP, tache, delaiSecondes > 0 ? { startAfter: delaiSecondes } : {});
}

/** Démarre le traitement des tâches (appelé une fois au démarrage du serveur). */
export async function demarrerTravailleurs(): Promise<boolean> {
  if (!fileActive) return false;
  const instance = await boss();
  await instance.work<TacheWhatsapp>(FILE_WHATSAPP, async (taches) => {
    for (const { data, retryCount } of taches) {
      try {
        await envoyerModele(data.telephone, data.modele, data.parametres);
      } catch (erreur) {
        // Visible dans les logs Coolify ; pg-boss réessaiera (5 fois, avec délai croissant).
        console.error(`Tâche WhatsApp « ${data.modele} » échouée (essai ${retryCount + 1})`, erreur);
        throw erreur;
      }
    }
  });
  return true;
}
