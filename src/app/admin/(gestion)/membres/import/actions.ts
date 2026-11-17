"use server";

import { refresh } from "next/cache";
import { verifierAdmin } from "@/lib/admin";
import { analyserImport, type LigneRefusee } from "@/lib/import-membres/analyse";
import { importerMembres } from "@/lib/import-membres/import";
import { ErreurFichier, lireClasseur } from "@/lib/import-membres/lecture";

export type EtatImport =
  | { etape: "choix" }
  | { etape: "apercu"; aImporter: number; refusees: LigneRefusee[]; nomFichier: string }
  | { etape: "termine"; importes: number }
  | { etape: "erreur"; message: string };

const TAILLE_MAX = 5 * 1024 * 1024;

/**
 * Import des anciens membres en deux temps, avec le même fichier :
 * mode « analyser » = aperçu sans rien écrire ; mode « importer » = nouvelle analyse puis création.
 */
export async function actionImportMembres(_: EtatImport, formulaire: FormData): Promise<EtatImport> {
  await verifierAdmin();

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
    const { aImporter, refusees } = await analyserImport(await lireClasseur(await fichier.arrayBuffer()));
    if (formulaire.get("mode") !== "importer") {
      return { etape: "apercu", aImporter: aImporter.length, refusees, nomFichier: fichier.name };
    }
    const { importes } = await importerMembres(aImporter);
    refresh(); // liste des membres et tableau de bord à jour
    return { etape: "termine", importes };
  } catch (erreur) {
    if (erreur instanceof ErreurFichier) return { etape: "erreur", message: erreur.message };
    console.error("Import des membres : échec", erreur);
    return { etape: "erreur", message: "L’import a échoué : aucun membre n’a été créé. Réessaie dans un instant." };
  }
}
