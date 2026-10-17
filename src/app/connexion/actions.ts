"use server";

// Server Functions de la connexion : exécutées sur le serveur, appelées depuis le formulaire.
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  connexionParMotDePasse,
  envoyerCodeConnexion,
  fermerSession,
  reinitialiserMotDePasse,
  verifierCodeConnexion,
} from "@/lib/auth";
import { erreurNouveauMotDePasse } from "@/lib/mot-de-passe";

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

/** Connexion habituelle : email + mot de passe reçu à l'adhésion. */
export async function connexion(saisie: string, motDePasse: string): Promise<EtatConnexion> {
  const email = emailValide(saisie);
  if (!email || !String(motDePasse ?? "").trim()) {
    return { ok: false, message: "Indique ton adresse email et ton mot de passe." };
  }

  const valide = await connexionParMotDePasse(email, String(motDePasse).trim());
  if (!valide) {
    return {
      ok: false,
      message: "Email ou mot de passe incorrect. Si tu l’as oublié, clique sur « Mot de passe oublié ? ».",
    };
  }
  redirect("/espace-membre");
}

/** Secours : un code à usage unique envoyé par email. */
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

/** Mot de passe oublié : code reçu par email + nouveau mot de passe, puis connexion. */
export async function reinitialiser(
  saisie: string,
  code: string,
  nouveau: string,
  confirmation: string,
): Promise<EtatConnexion> {
  const email = emailValide(saisie);
  const chiffres = String(code ?? "").replace(/\D/g, "");
  if (!email || chiffres.length !== 6) {
    return { ok: false, message: "Le code reçu par email contient 6 chiffres." };
  }
  const erreur = erreurNouveauMotDePasse(String(nouveau ?? ""), String(confirmation ?? ""));
  if (erreur) return { ok: false, message: erreur };

  const valide = await reinitialiserMotDePasse(email, chiffres, String(nouveau));
  if (!valide) {
    return { ok: false, message: "Code incorrect ou expiré. Vérifie-le ou demande un nouveau code." };
  }
  redirect("/espace-membre");
}

export async function deconnexion() {
  await fermerSession();
  redirect("/connexion");
}
