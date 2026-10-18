import type { Metadata } from "next";
import { Suspense } from "react";
import { exigerAdmin } from "@/lib/admin";
import { Chargement } from "../espace-membre/elements";
import { AdminShell } from "./admin-shell";

export const metadata: Metadata = {
  title: { default: "Administration", template: "%s · Administration CLANS" },
  robots: { index: false, follow: false },
};

// Toute l'administration lit le cookie de session : rendue à chaque requête, derrière <Suspense>.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<Chargement />}>
      <Garde>{children}</Garde>
    </Suspense>
  );
}

async function Garde({ children }: { children: React.ReactNode }) {
  const admin = await exigerAdmin();
  return <AdminShell nomComplet={`${admin.prenom} ${admin.nom}`}>{children}</AdminShell>;
}
