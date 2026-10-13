// Appelé une fois au démarrage du serveur Next.js, avant la première requête.
export async function register() {
  // Uniquement dans l'environnement Node.js (pas dans le runtime Edge).
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { demarrer } = await import("./lib/demarrage");
    await demarrer();
  }
}
