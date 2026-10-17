"use server";

import { changerMotDePasse, membreConnecte } from "@/lib/auth";
import { marquerMessageLu } from "@/lib/membres";
import { erreurNouveauMotDePasse } from "@/lib/mot-de-passe";

// Chaque action revérifie la session : elle ne fait jamais confiance au navigateur.
export async function marquerLu(messageId: number) {
  const membre = await membreConnecte();
  if (!membre || !Number.isInteger(messageId)) return;
  await marquerMessageLu(membre.id, messageId);
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
