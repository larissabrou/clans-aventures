// Envoie un email de test avec les variables SMTP_* du serveur.
// Sur Coolify (onglet Terminal de l'application) :  node scripts/test-email.mjs votre@adresse.com
import nodemailer from "nodemailer";

const destinataire = process.argv[2];
if (!destinataire) {
  console.log("Usage : node scripts/test-email.mjs adresse@exemple.com");
  process.exit(1);
}

const { SMTP_HOST, SMTP_PORT = "465", SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = process.env;
console.log("Configuration :", {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASSWORD: SMTP_PASSWORD ? `(${SMTP_PASSWORD.length} caractères)` : "(vide)",
  SMTP_FROM,
});
if (!SMTP_HOST) {
  console.log("ÉCHEC : SMTP_HOST n'est pas défini dans les variables d'environnement.");
  process.exit(1);
}

const port = Number(SMTP_PORT);
const smtp = nodemailer.createTransport({
  host: SMTP_HOST,
  port,
  secure: port === 465,
  auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASSWORD } : undefined,
  connectionTimeout: 15_000,
  greetingTimeout: 15_000,
  logger: true, // affiche le dialogue SMTP complet (le mot de passe est masqué par nodemailer)
});

try {
  await smtp.verify();
  console.log("Connexion et authentification SMTP : OK");
  const info = await smtp.sendMail({
    from: SMTP_FROM ?? SMTP_USER,
    to: destinataire,
    subject: "Test CLANS aventures",
    text: "Si tu lis ceci, l'envoi SMTP depuis le serveur fonctionne.",
  });
  console.log("Email envoyé. Réponse du serveur :", info.response);
} catch (erreur) {
  console.log("ÉCHEC :", erreur.code ?? "", erreur.message);
  process.exit(1);
}
