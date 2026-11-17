"use server";

import { refresh } from "next/cache";
import { verifierAdmin } from "@/lib/admin";
import { ajouterALaListe, analyserListeAnciens } from "@/lib/anciens-membres";
import { analyserImport, type LigneRefusee } from "@/lib/import-membres/analyse";
import { importerMembres } from "@/lib/import-membres/import";
import { ErreurFichier, lireClasseur } from "@/lib/import-membres/lecture";

/** « comptes » : créer les membres tout de suite ; « liste » : ajouter à la liste des anciens membres. */
export type CibleImport = "comptes" | "liste";

export type EtatImport =
  | { etape: "choix" }
  | {
      etape: "apercu";
      cible: CibleImport;
      aImporter: number;
      refusees: LigneRefusee[];
      nomFichier: string;
      /** Prochain numéro des inscriptions en ligne (import des comptes seulement). */
      prochainNumero?: string;
    }
  | { etape: "termine"; cible: CibleImport; importes: number }
  | { etape: "erreur"; message: string };

const TAILLE_MAX = 5 * 1024 * 1024;

/**
 * Import du fichier des anciens membres en deux temps, avec le même fichier :
 * mode « analyser » = aperçu sans rien écrire ; mode « importer » = nouvelle analyse puis écriture
 * (comptes créés avec leurs e-mails, ou lignes ajoutées à la liste des anciens membres, sans e-mail).
 */
export async function actionImportMembres(_: EtatImport, formulaire: FormData): Promise<EtatImport> {
  await verifierAdmin();
  // Nouveau fichier choisi : l'aperçu précédent ne vaut plus, sans message d'erreur.
  if (formulaire.get("mode") === "reinitialiser") return { etape: "choix" };
  const cible: CibleImport = formulaire.get("cible") === "comptes" ? "comptes" : "liste";

  const fichier = formulaire.get("fichier");
  if (!(fichier instanceof File) || fichier.size === 0) {
    return { etape: "erreur", message: "Choisis le fichier Excel (.xlsx) à importer." };
  }
  if (!fichier.name.toLowerCase().endsWith(".xlsx")) {
    return { etape: "erreur", message: "Le fichier doit être au format Excel .xlsx (utilise le modèle)." };
  }
  if (fichier.size > TAILLE_MAX) {
    return { etape: "erreur", message: "Le fichier dépasse 5 Mo : découpe-le en plusieurs fichiers." };
  }

  try {
    const lignes = await lireClasseur(await fichier.arrayBuffer());
    const importer = formulaire.get("mode") === "importer";

    if (cible === "liste") {
      const { aAjouter, refusees } = await analyserListeAnciens(lignes);
      if (!importer) return { etape: "apercu", cible, aImporter: aAjouter.length, refusees, nomFichier: fichier.name };
      const { ajoutes } = await ajouterALaListe(aAjouter);
      refresh();
      return { etape: "termine", cible, importes: ajoutes };
    }

    const { aImporter, refusees, prochainNumero } = await analyserImport(lignes);
    if (!importer) {
      return { etape: "apercu", cible, aImporter: aImporter.length, refusees, nomFichier: fichier.name, prochainNumero };
    }
    const { importes } = await importerMembres(aImporter);
    refresh(); // liste des membres et tableau de bord à jour
    return { etape: "termine", cible, importes };
  } catch (erreur) {
    if (erreur instanceof ErreurFichier) return { etape: "erreur", message: erreur.message };
    console.error("Import des membres : échec", erreur);
    return { etape: "erreur", message: "L’import a échoué : rien n’a été enregistré. Réessaie dans un instant." };
  }
}
