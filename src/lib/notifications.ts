import "server-only";
import { envoyerEmail } from "./email";
import { urlSite } from "./env";

// Messages envoyés aux membres. Pour l'instant par email ; whatsapp.ts reste prêt pour plus tard.

export type Notification =
  | { modele: "code"; email: string; code: string }
  | { modele: "acces"; email: string; prenom: string; numero: string; motDePasse: string }
  | { modele: "bienvenue"; email: string; prenom: string };

export async function envoyerNotification(notification: Notification) {
  const { sujet, paragraphes, bouton } = contenu(notification);
  await envoyerEmail({
    a: notification.email,
    sujet,
    texte: [...paragraphes.map(sansBalises), bouton ? `${bouton.libelle} : ${bouton.lien}` : ""].join("\n\n"),
    html: gabarit(paragraphes, bouton),
  });
}

const sansBalises = (html: string) =>
  html.replace(/<[^>]+>/g, "").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

type Contenu = {
  sujet: string;
  paragraphes: string[];
  bouton?: { libelle: string; lien: string };
};

/** Les valeurs saisies par les membres (prénom…) sont échappées avant d'entrer dans le HTML. */
function echapper(texte: string) {
  return texte.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function contenu(notification: Notification): Contenu {
  const connexion = `${urlSite()}/connexion`;

  switch (notification.modele) {
    case "code":
      return {
        sujet: "Ton code de vérification CLANS",
        paragraphes: [
          "Voici ton code de vérification pour choisir un nouveau mot de passe sur ton espace membre CLANS aventures :",
          `<strong style="font-size:32px;letter-spacing:8px;color:#123B2A">${notification.code}</strong>`,
          "Il est valable 10 minutes. Si tu n’as rien demandé, ignore simplement cet email : ton mot de passe actuel reste inchangé.",
        ],
      };
    case "acces":
      return {
        sujet: "Ton accès membre CLANS aventures",
        paragraphes: [
          `Bienvenue ${echapper(notification.prenom)} !`,
          `Ton adhésion est confirmée. Ton numéro membre : <strong>${echapper(notification.numero)}</strong>.`,
          `Ton mot de passe : <strong style="font-size:20px;letter-spacing:3px;color:#123B2A">${echapper(notification.motDePasse)}</strong>`,
          "Pour te connecter à ton espace membre, utilise ton adresse email et ce mot de passe. Garde cet email précieusement.",
          "Dans ton espace, tu retrouveras ta progression, tes messages et les liens de tes groupes WhatsApp.",
        ],
        bouton: { libelle: "Accéder à mon espace", lien: connexion },
      };
    case "bienvenue":
      return {
        sujet: `Bienvenue dans CLANS aventures, ${notification.prenom} !`,
        paragraphes: [
          `Bienvenue dans CLANS aventures, ${echapper(notification.prenom)} !`,
          "Tu viens officiellement de rejoindre une communauté où les cultures se rencontrent, où les aventures se vivent ensemble et où chaque rencontre peut devenir une histoire.",
          "Ton aventure vient de commencer. Ton profil CLANS est prêt.",
          "<strong>Ta prochaine étape : découvrir ton premier événement.</strong>",
        ],
        bouton: { libelle: "Voir mon espace membre", lien: connexion },
      };
  }
}

// Email simple aux couleurs de la charte (styles en ligne : seuls compris par les messageries).
function gabarit(paragraphes: string[], bouton?: { libelle: string; lien: string }) {
  const corps = paragraphes
    .map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#20201D">${p}</p>`)
    .join("");
  const action = bouton
    ? `<p style="margin:24px 0 0"><a href="${bouton.lien}" style="display:inline-block;background:#123B2A;color:#F6F0E4;text-decoration:none;font-weight:bold;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;padding:14px 26px;border-radius:999px">${bouton.libelle}</a></p>`
    : "";

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#F6F0E4">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F0E4;padding:32px 16px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;font-family:Arial,Helvetica,sans-serif">
<tr><td style="background:#ffffff;padding:24px 32px;border-bottom:4px solid #123B2A">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="padding-right:14px"><img src="${urlSite()}/images/logo-clans.png" width="33" height="56" alt="CLANS aventures" style="display:block;border:0"></td>
<td style="font-family:Georgia,'Times New Roman',serif;font-size:26px;color:#123B2A;white-space:nowrap">clans <em>aventures</em></td>
</tr></table>
</td></tr>
<tr><td style="padding:32px">${corps}${action}</td></tr>
<tr><td style="padding:20px 32px;background:#20201D;color:#D9C29A;font-size:12px;line-height:1.6">Nos cultures nous distinguent. Nos aventures nous rapprochent.</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}
