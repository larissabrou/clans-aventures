import type { Metadata } from "next";
import { Suspense } from "react";
import { estAdmin } from "@/lib/admin";
import { exigerMembre } from "@/lib/auth";
import { marquerMessageLu, tableauDeBord } from "@/lib/membres";
import { Chargement, PiedEspaceMembre, identite } from "../elements";
import { MemberShell } from "../member-shell";
import { MessagesProvider } from "../messages-context";
import { BoiteMessages } from "./boite-messages";
import { NombreNonLusTexte } from "./nombre-non-lus";

export const metadata: Metadata = { title: "Mes messages" };

// La page lit le cookie de session : elle est rendue à chaque requête, derrière <Suspense>.
export default function MessagesPage({ searchParams }: PageProps<"/espace-membre/messages">) {
  return (
    <Suspense fallback={<Chargement />}>
      <Messages searchParams={searchParams} />
    </Suspense>
  );
}

async function Messages({ searchParams }: Pick<PageProps<"/espace-membre/messages">, "searchParams">) {
  const connecte = await exigerMembre(); // renvoie vers /connexion si besoin
  const { m } = await searchParams;
  const selection = typeof m === "string" && /^\d{1,10}$/.test(m) ? Number(m) : undefined;
  // Message ouvert depuis l'accueil : marqué comme lu avant le chargement de la liste.
  if (selection !== undefined) await marquerMessageLu(connecte.id, selection);

  const donnees = await tableauDeBord(connecte, 200);
  const { nomComplet, initiales } = identite(donnees.membre.prenom, donnees.membre.nom);

  return (
    <MessagesProvider initialMessages={donnees.messages}>
      <MemberShell nomComplet={nomComplet} initiales={initiales} page="messages" admin={estAdmin(connecte)}>
        <div className="mx-auto max-w-6xl">
          <div className="mb-8">
            <p className="text-[0.65rem] font-semibold tracking-[3px] text-sable uppercase">
              Boîte de réception
            </p>
            <h1 className="mt-2 font-titre text-4xl font-semibold sm:text-5xl">Mes messages</h1>
            <p className="mt-2 text-ivoire/70">
              Les nouvelles de l’équipe CLANS : informations, événements et étoiles.{" "}
              <NombreNonLusTexte />
            </p>
          </div>

          <BoiteMessages selectionInitiale={selection} />

          <PiedEspaceMembre />
        </div>
      </MemberShell>
    </MessagesProvider>
  );
}
