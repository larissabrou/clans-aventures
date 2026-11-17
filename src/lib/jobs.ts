import "server-only";
import { PgBoss } from "pg-boss";
import { envoyerNotification, type Notification } from "./notifications";

// File de tâches pg-boss, stockée dans PostgreSQL (schéma « pgboss »).
// Sert aux envois différés (« quelques heures après l'adhésion ») et réessaie en cas d'échec.

export const FILE_NOTIFICATIONS = "notifications";
/** Relecture des paiements de sorties restés en attente (webhook perdu, page fermée). */
export const FILE_RELECTURE_SORTIES = "relecture-paiements-sorties";

/** Messages programmables (les codes de vérification, eux, partent immédiatement sans file). */
export type TacheNotification = Exclude<Notification, { modele: "code" | "code-admin" }>;

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
    await instance.createQueue(FILE_NOTIFICATIONS, { retryLimit: 5, retryDelay: 60, retryBackoff: true });
    await instance.createQueue(FILE_RELECTURE_SORTIES);
    return instance;
  })().catch((erreur) => {
    globalPourBoss.bossClans = undefined; // on retentera au prochain appel
    throw erreur;
  });
  return globalPourBoss.bossClans;
}

/** Programme un message, immédiatement ou après un délai (en secondes). */
export async function programmerNotification(tache: TacheNotification, delaiSecondes = 0) {
  if (!fileActive) {
    console.info(`[Tâche exécutée immédiatement en dev, délai prévu : ${delaiSecondes} s]`);
    await envoyerNotification(tache);
    return;
  }
  const instance = await boss();
  await instance.send(FILE_NOTIFICATIONS, tache, delaiSecondes > 0 ? { startAfter: delaiSecondes } : {});
}

/** Démarre le traitement des tâches (appelé une fois au démarrage du serveur). */
export async function demarrerTravailleurs(): Promise<boolean> {
  if (!fileActive) return false;
  const instance = await boss();
  await instance.work<TacheNotification>(FILE_NOTIFICATIONS, async (taches) => {
    for (const { data, retryCount } of taches) {
      try {
        await envoyerNotification(data);
      } catch (erreur) {
        // Visible dans les logs Coolify ; pg-boss réessaiera (5 fois, avec délai croissant).
        console.error(`Tâche « ${data.modele} » échouée (essai ${retryCount + 1})`, erreur);
        throw erreur;
      }
    }
  });

  // Toutes les 5 minutes : paiements de sorties en attente depuis moins de 24 h, revérifiés
  // auprès de la passerelle (import différé : lib/sorties utilise lui-même cette file).
  await instance.schedule(FILE_RELECTURE_SORTIES, "*/5 * * * *");
  await instance.work(FILE_RELECTURE_SORTIES, async () => {
    const { relancerPaiementsSortiesEnAttente } = await import("./paiement/suivi-sorties");
    const relus = await relancerPaiementsSortiesEnAttente();
    if (relus > 0) console.info(`Sorties : ${relus} paiement(s) en attente relu(s)`);
  });
  return true;
}
