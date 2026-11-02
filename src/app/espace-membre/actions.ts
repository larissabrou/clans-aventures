"use server";

import { refresh } from "next/cache";
import { changerMotDePasse, membreConnecte } from "@/lib/auth";
import { ErreurImage, lireImageEnvoyee } from "@/lib/images";
import { enregistrerPhoto, supprimerPhoto } from "@/lib/photos-membres";
import { marquerMessageLu, marquerTousLus } from "@/lib/membres";
import { erreurNouveauMotDePasse } from "@/lib/mot-de-passe";

// Chaque action revérifie la session : elle ne fait jamais confiance au navigateur.
export async function marquerLu(messageId: number) {
  const membre = await membreConnecte();
  if (!membre || !Number.isInteger(messageId)) return;
  await marquerMessageLu(membre.id, messageId);
}

export async function marquerToutLu() {
  const membre = await membreConnecte();
  if (!membre) return;
  await marquerTousLus(membre.id);
}

export type ResultatMotDePasse = { ok: boolean; message: string };

export async function modifierMotDePasse(
  actuel: string,
  nouveau: string,
  confirmation: string,
): Promise<ResultatMotDePasse> {
  const membre = await membreConnecte();
  if (!membre) return { ok: false, message: "Ta session a expiré. Reconnecte-toi." };

  const erreur = erreurNouveauMotDePasse(String(nouveau ?? ""), String(confirmation ?? ""));
  if (erreur) return { ok: false, message: erreur };

  const resultat = await changerMotDePasse(membre, String(actuel ?? ""), String(nouveau));
  if (resultat === "actuel_incorrect") {
    return { ok: false, message: "Ton mot de passe actuel est incorrect." };
  }
  return {
    ok: true,
    message: "Ton mot de passe a été modifié. Tes autres appareils ont été déconnectés.",
  };
}

export type ResultatPhoto = { ok: boolean; message: string } | null;

/** Photo de profil : JPEG, PNG ou WebP de 4 Mo maximum (type vérifié d'après le contenu). */
export async function changerPhoto(_: ResultatPhoto, formulaire: FormData): Promise<ResultatPhoto> {
  const membre = await membreConnecte();
  if (!membre) return { ok: false, message: "Ta session a expiré. Reconnecte-toi." };
  try {
    const image = await lireImageEnvoyee(formulaire.get("photo"));
    if (!image) return { ok: false, message: "Choisis une photo." };
    await enregistrerPhoto(membre.id, image);
  } catch (erreur) {
    if (erreur instanceof ErreurImage) return { ok: false, message: erreur.message };
    throw erreur;
  }
  refresh();
  return { ok: true, message: "Photo enregistrée." };
}

export async function retirerPhoto(): Promise<ResultatPhoto> {
  const membre = await membreConnecte();
  if (!membre) return { ok: false, message: "Ta session a expiré. Reconnecte-toi." };
  await supprimerPhoto(membre.id);
  refresh();
  return { ok: true, message: "Photo retirée." };
}
