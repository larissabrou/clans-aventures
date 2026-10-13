"use server";

// Server Functions de la connexion : exécutées sur le serveur, appelées depuis le formulaire.
import { redirect } from "next/navigation";
import { z } from "zod";
import { envoyerCodeConnexion, fermerSession, verifierCodeConnexion } from "@/lib/auth";

export type EtatConnexion = { ok: true; emailMasque: string } | { ok: false; message: string };

const emailValide = (saisie: unknown) => {
  const resultat = z.email().safeParse(String(saisie ?? "").trim().toLowerCase());
  return resultat.success ? resultat.data : null;
};

/** a••••@exemple.com */
const masquer = (email: string) => {
  const [nom, domaine] = email.split("@");
  return `${nom.slice(0, 1)}${"•".repeat(Math.max(nom.length - 1, 3))}@${domaine}`;
};

export async function demanderCode(saisie: string): Promise<EtatConnexion> {
  const email = emailValide(saisie);
  if (!email) {
    return { ok: false, message: "Indique l’adresse email utilisée lors de ton adhésion." };
  }

  try {
    const resultat = await envoyerCodeConnexion(email);
    if (!resultat.ok) return resultat;
  } catch (erreur) {
    console.error("Connexion : envoi du code impossible", erreur);
    return { ok: false, message: "Impossible d’envoyer le code pour le moment. Réessaie dans un instant." };
  }
  return { ok: true, emailMasque: masquer(email) };
}

export async function verifierCode(saisie: string, code: string): Promise<EtatConnexion> {
  const email = emailValide(saisie);
  const chiffres = String(code ?? "").replace(/\D/g, "");
  if (!email || chiffres.length !== 6) {
    return { ok: false, message: "Le code contient 6 chiffres." };
  }

  const valide = await verifierCodeConnexion(email, chiffres);
  if (!valide) {
    return { ok: false, message: "Code incorrect ou expiré. Vérifie-le ou demande un nouveau code." };
  }
  redirect("/espace-membre");
}

export async function deconnexion() {
  await fermerSession();
  redirect("/connexion");
}
