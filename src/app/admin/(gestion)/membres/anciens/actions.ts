"use server";

import { refresh } from "next/cache";
import { verifierAdmin } from "@/lib/admin";
import { ErreurAnciens, supprimerAncienMembre } from "@/lib/anciens-membres";
import type { EtatAction } from "../../actions";

/** Supprime une ligne de la liste des anciens membres qui n'a pas encore servi. */
export async function actionSupprimerAncien(_: EtatAction, formulaire: FormData): Promise<EtatAction> {
  await verifierAdmin();
  const id = Number(formulaire.get("id"));
  if (!Number.isInteger(id) || id <= 0) return { ok: false, message: "Ligne invalide." };
  try {
    await supprimerAncienMembre(id);
  } catch (erreur) {
    if (erreur instanceof ErreurAnciens) return { ok: false, message: erreur.message };
    throw erreur;
  }
  refresh();
  return { ok: true, message: "Ligne supprimée." };
}
