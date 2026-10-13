import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { enProduction, variable } from "./env";

// Envoi d'emails par SMTP (boîte mail de l'hébergeur, Brevo, Resend, etc.).
// Sans configuration, en développement, les emails sont seulement affichés dans la console.

export type Email = { a: string; sujet: string; texte: string; html: string };

const globalPourSmtp = globalThis as unknown as { smtpClans?: Transporter };

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
  });
  return globalPourSmtp.smtpClans;
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

  await smtp.sendMail({
    from: variable("SMTP_FROM") ?? variable("SMTP_USER"),
    to: a,
    subject: sujet,
    text: texte,
    html,
  });
}
