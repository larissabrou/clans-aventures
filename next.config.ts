import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produit .next/standalone : un serveur Node minimal, utilisé par le Dockerfile (Coolify).
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  // Chargés tels quels depuis node_modules au lieu d'être empaquetés (file de tâches, emails).
  serverExternalPackages: ["pg-boss", "nodemailer"],
  experimental: {
    // Images des événements (4 Mo, voir lib/images.ts) et fichiers d'import des membres (5 Mo,
    // vérifiés par l'action avec un message clair) + marge de l'envoi du formulaire.
    serverActions: { bodySizeLimit: "6mb" },
  },
  // La fiche partenaire de la passerelle a pu être saisie au singulier : même webhook.
  async rewrites() {
    return [{ source: "/webhook/payment", destination: "/webhooks/payment" }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
