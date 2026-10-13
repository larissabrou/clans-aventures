import "server-only";
import { enProduction, variable } from "./env";

// Envoi de messages WhatsApp via la WhatsApp Business Cloud API (Meta).
// Un message envoyé à l'initiative de CLANS doit utiliser un modèle (template) validé par Meta.
// Sans configuration, en développement, les messages sont seulement affichés dans la console.

export type ModeleWhatsapp = "code" | "acces" | "bienvenue";

// Nom du modèle chez Meta pour chaque usage (modifiable par variable d'environnement).
const NOMS_PAR_DEFAUT: Record<ModeleWhatsapp, string> = {
  code: "clans_code_connexion",
  acces: "clans_acces_membre",
  bienvenue: "clans_bienvenue",
};

function nomModele(modele: ModeleWhatsapp) {
  return variable(`WHATSAPP_TEMPLATE_${modele.toUpperCase()}`) ?? NOMS_PAR_DEFAUT[modele];
}

function configuration() {
  const token = variable("WHATSAPP_TOKEN");
  const numeroId = variable("WHATSAPP_PHONE_NUMBER_ID");
  if (!token || !numeroId) return null;
  return {
    token,
    numeroId,
    version: variable("WHATSAPP_API_VERSION") ?? "v21.0",
    langue: variable("WHATSAPP_TEMPLATE_LANGUE") ?? "fr",
  };
}

export function whatsappConfigure(): boolean {
  return configuration() !== null;
}

/**
 * Envoie un modèle WhatsApp. `parametres` remplit les variables {{1}}, {{2}}… du corps du modèle.
 * Le modèle « code » (catégorie Authentification chez Meta) reçoit aussi le code dans son bouton « Copier ».
 */
export async function envoyerModele(
  telephone: string,
  modele: ModeleWhatsapp,
  parametres: string[],
): Promise<void> {
  const config = configuration();

  if (!config) {
    if (enProduction) {
      throw new Error("WhatsApp non configuré : WHATSAPP_TOKEN et WHATSAPP_PHONE_NUMBER_ID dans .env");
    }
    console.info(`[WhatsApp simulé] ${modele} → +${telephone}`, parametres);
    return;
  }

  const composants: unknown[] = [
    { type: "body", parameters: parametres.map((texte) => ({ type: "text", text: texte })) },
  ];
  if (modele === "code") {
    composants.push({
      type: "button",
      sub_type: "url",
      index: "0",
      parameters: [{ type: "text", text: parametres[0] }],
    });
  }

  const reponse = await fetch(
    `https://graph.facebook.com/${config.version}/${config.numeroId}/messages`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: telephone,
        type: "template",
        template: {
          name: nomModele(modele),
          language: { code: config.langue },
          components: composants,
        },
      }),
      signal: AbortSignal.timeout(20_000),
    },
  );

  if (!reponse.ok) {
    const detail = await reponse.text().catch(() => "");
    throw new Error(`WhatsApp ${modele} : HTTP ${reponse.status} ${detail.slice(0, 300)}`);
  }
}
