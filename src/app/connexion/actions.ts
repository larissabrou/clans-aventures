"use server";

// Server Functions de la connexion : exécutées sur le serveur, appelées depuis le formulaire.
import { redirect } from "next/navigation";
import { envoyerCodeConnexion, fermerSession, verifierCodeConnexion } from "@/lib/auth";
import { masquerTelephone, normaliserTelephone, telephoneValide } from "@/lib/telephone";

export type EtatConnexion = { ok: true; telephoneMasque: string } | { ok: false; message: string };

export async function demanderCode(saisie: string): Promise<EtatConnexion> {
  const telephone = normaliserTelephone(String(saisie ?? ""));
  if (!telephoneValide(telephone)) {
    return { ok: false, message: "Indique ton numéro WhatsApp, par exemple +225 07 00 00 00 00." };
  }

  try {
    const resultat = await envoyerCodeConnexion(telephone);
    if (!resultat.ok) return resultat;
  } catch (erreur) {
    console.error("Connexion : envoi du code impossible", erreur);
    return { ok: false, message: "Impossible d’envoyer le code pour le moment. Réessaie dans un instant." };
  }
  return { ok: true, telephoneMasque: masquerTelephone(telephone) };
}

export async function verifierCode(saisie: string, code: string): Promise<EtatConnexion> {
  const telephone = normaliserTelephone(String(saisie ?? ""));
  const chiffres = String(code ?? "").replace(/\D/g, "");
  if (!telephoneValide(telephone) || chiffres.length !== 6) {
    return { ok: false, message: "Le code contient 6 chiffres." };
  }

  const valide = await verifierCodeConnexion(telephone, chiffres);
  if (!valide) {
    return { ok: false, message: "Code incorrect ou expiré. Vérifie-le ou demande un nouveau code." };
  }
  redirect("/espace-membre");
}

export async function deconnexion() {
  await fermerSession();
  redirect("/connexion");
}
