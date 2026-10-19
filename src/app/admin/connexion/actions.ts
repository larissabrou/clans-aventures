"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { connexionAdmin, envoyerCodeAdmin, fermerSessionAdmin, reinitialiserAdmin } from "@/lib/admin";
import { erreurNouveauMotDePasse } from "@/lib/mot-de-passe";

// Connexion à l'administration. Comme pour les membres, le navigateur charge lui-même /admin
// après succès (voir formulaire-connexion.tsx) : la page reçoit ainsi le nouveau cookie.

export type ResultatAdmin = { ok: true } | { ok: false; message: string };

const emailValide = (saisie: unknown) => {
  const resultat = z.email().safeParse(String(saisie ?? "").trim().toLowerCase());
  return resultat.success ? resultat.data : null;
};

export async function seConnecterAdmin(saisie: string, motDePasse: string): Promise<ResultatAdmin> {
  const email = emailValide(saisie);
  if (!email || !String(motDePasse ?? "").trim()) {
    return { ok: false, message: "Indique ton adresse email et ton mot de passe." };
  }
  if (!(await connexionAdmin(email, String(motDePasse).trim()))) {
    return {
      ok: false,
      message: "Email ou mot de passe incorrect. Première connexion ou oubli : clique sur « Mot de passe oublié ? ».",
    };
  }
  return { ok: true };
}

export async function demanderCodeAdmin(saisie: string): Promise<ResultatAdmin> {
  const email = emailValide(saisie);
  if (!email) return { ok: false, message: "Indique ton adresse email." };
  try {
    return await envoyerCodeAdmin(email);
  } catch (erreur) {
    console.error("Admin : envoi du code impossible", erreur);
    return { ok: false, message: "Impossible d’envoyer le code pour le moment. Réessaie dans un instant." };
  }
}

export async function choisirMotDePasseAdmin(
  saisie: string,
  code: string,
  nouveau: string,
  confirmation: string,
): Promise<ResultatAdmin> {
  const email = emailValide(saisie);
  const chiffres = String(code ?? "").replace(/\D/g, "");
  if (!email || chiffres.length !== 6) return { ok: false, message: "Le code reçu par email contient 6 chiffres." };
  const erreur = erreurNouveauMotDePasse(String(nouveau ?? ""), String(confirmation ?? ""));
  if (erreur) return { ok: false, message: erreur };

  if (!(await reinitialiserAdmin(email, chiffres, String(nouveau)))) {
    return { ok: false, message: "Code incorrect ou expiré. Vérifie-le ou demande un nouveau code." };
  }
  return { ok: true };
}

export async function deconnexionAdmin() {
  await fermerSessionAdmin();
  redirect("/admin/connexion");
}
