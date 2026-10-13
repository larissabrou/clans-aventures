import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produit .next/standalone : un serveur Node minimal, utilisé par le Dockerfile (Coolify).
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  // Chargés tels quels depuis node_modules au lieu d'être empaquetés (file de tâches PostgreSQL).
  serverExternalPackages: ["pg-boss"],
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
