import { Suspense } from "react";
import { exigerAdmin } from "@/lib/admin";
import { Chargement } from "../../espace-membre/elements";
import { AdminShell } from "./admin-shell";

// Toute l'administration lit le cookie de session : rendue à chaque requête, derrière <Suspense>.
export default function GestionLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<Chargement />}>
      <Garde>{children}</Garde>
    </Suspense>
  );
}

async function Garde({ children }: { children: React.ReactNode }) {
  const admin = await exigerAdmin(); // renvoie vers /admin/connexion si besoin
  return (
    <AdminShell nomComplet={`${admin.prenom} ${admin.nom}`.trim()} role={admin.role}>
      {children}
    </AdminShell>
  );
}
