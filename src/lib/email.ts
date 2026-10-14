import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { enProduction, variable } from "./env";

// Envoi d'emails par SMTP (boîte mail de l'hébergeur, Brevo, Resend, etc.).
// Sans configuration, en développement, les emails sont seulement affichés dans la console.

export type Email = { a: string; sujet: string; texte: string; html: string };

const globalPourSmtp = globalThis as unknown as { smtpClans?: Transporter };

export function smtpConfigure(): boolean {
  return variable("SMTP_HOST") !== undefined;
}

function transporteur(): Transporter | null {
  const hote = variable("SMTP_HOST");
  if (!hote) return null;

  const port = Number(variable("SMTP_PORT") ?? 465);
  globalPourSmtp.smtpClans ??= nodemailer.createTransport({
    host: hote,
    port,
    secure: port === 465, // 465 : TLS direct ; 587 : STARTTLS
    auth: variable("SMTP_USER")
      ? { user: variable("SMTP_USER"), pass: variable("SMTP_PASSWORD") }
      : undefined,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
  });
  return globalPourSmtp.smtpClans;
}

/** Message d'erreur SMTP lisible, sans jamais inclure le mot de passe. */
export function erreurLisible(erreur: unknown): string {
  const e = erreur as { code?: string; responseCode?: number; message?: string };
  const message = (e.message ?? String(erreur)).replace(/\s+/g, " ").slice(0, 200);
  const code = e.code ?? (e.responseCode ? `SMTP ${e.responseCode}` : "");
  return code ? `${code} — ${message}` : message;
}

/**
 * Teste la connexion et l'authentification SMTP (sans envoyer d'email).
 * Appelé au démarrage du serveur et par /api/sante.
 */
export async function verifierSmtp(): Promise<{ ok: boolean; detail: string }> {
  const smtp = transporteur();
  if (!smtp) return { ok: false, detail: "non configuré (SMTP_HOST absent)" };
  try {
    await smtp.verify();
    return { ok: true, detail: `connexion et authentification OK (${variable("SMTP_HOST")}:${variable("SMTP_PORT") ?? 465})` };
  } catch (erreur) {
    return { ok: false, detail: erreurLisible(erreur) };
  }
}

export async function envoyerEmail({ a, sujet, texte, html }: Email): Promise<void> {
  const smtp = transporteur();

  if (!smtp) {
    if (enProduction) {
      throw new Error("Email non configuré : SMTP_HOST, SMTP_USER, SMTP_PASSWORD et SMTP_FROM dans .env");
    }
    console.info(`[Email simulé] à ${a} — ${sujet}\n${texte}`);
    return;
  }

  try {
    const info = await smtp.sendMail({
      from: variable("SMTP_FROM") ?? variable("SMTP_USER"),
      to: a,
      subject: sujet,
      text: texte,
      html,
    });
    console.info(`Email envoyé à ${a} — « ${sujet} » — réponse serveur : ${info.response}`);
  } catch (erreur) {
    console.error(`Email NON envoyé à ${a} — « ${sujet} » — ${erreurLisible(erreur)}`);
    throw erreur;
  }
}
