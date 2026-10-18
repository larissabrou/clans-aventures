import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produit .next/standalone : un serveur Node minimal, utilisé par le Dockerfile (Coolify).
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  // Chargés tels quels depuis node_modules au lieu d'être empaquetés (file de tâches, emails).
  serverExternalPackages: ["pg-boss", "nodemailer"],
  experimental: {
    // Images des événements envoyées depuis l'admin (4 Mo maximum, voir lib/images.ts) + marge du formulaire.
    serverActions: { bodySizeLimit: "5mb" },
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
