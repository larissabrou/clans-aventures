import type { Metadata } from "next";
import { Suspense } from "react";
import { estAdmin } from "@/lib/admin";
import { exigerMembre } from "@/lib/auth";
import { tableauDeBord } from "@/lib/membres";
import { ChangerMotDePasse } from "../changer-mot-de-passe";
import { Chargement, PiedEspaceMembre, identite } from "../elements";
import { MemberShell } from "../member-shell";
import { MessagesProvider } from "../messages-context";

export const metadata: Metadata = { title: "Mon profil" };

// La page lit le cookie de session : elle est rendue à chaque requête, derrière <Suspense>.
export default function ProfilPage() {
  return (
    <Suspense fallback={<Chargement />}>
      <Profil />
    </Suspense>
  );
}

async function Profil() {
  const connecte = await exigerMembre(); // renvoie vers /connexion si besoin
  // Les messages alimentent le badge « non lus » du menu.
  const donnees = await tableauDeBord(connecte);
  const { membre } = donnees;
  const { nomComplet, initiales } = identite(membre.prenom, membre.nom);

  return (
    <MessagesProvider initialMessages={donnees.messages}>
      <MemberShell nomComplet={nomComplet} initiales={initiales} page="profil" admin={estAdmin(connecte)}>
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
          <div className="mb-8">
            <h1 className="font-titre text-4xl font-semibold sm:text-5xl">Mon profil</h1>
            <p className="mt-2 text-ivoire/70">
              Tes informations de membre et ton mot de passe.
            </p>
          </div>

          <dl className="grid gap-5 rounded-2xl border border-white p-6 text-white sm:grid-cols-2 sm:p-8 lg:grid-cols-3">
            <InfoProfil label="Nom complet" valeur={nomComplet} />
            <InfoProfil label="Numéro membre" valeur={membre.numero} />
            <InfoProfil label="Clan" valeur={membre.clan} />
            <InfoProfil label="Date d’adhésion" valeur={membre.dateAdhesion} />
            <InfoProfil label="Adhésion" valeur="À vie" />
          </dl>

          <ChangerMotDePasse aUnMotDePasse={Boolean(connecte.motDePasseHash)} />

          <PiedEspaceMembre />
        </div>
      </MemberShell>
    </MessagesProvider>
  );
}

function InfoProfil({ label, valeur }: { label: string; valeur: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-[1px] text-white/60 uppercase">
        {label}
      </dt>
      <dd className="mt-1 font-medium">{valeur}</dd>
    </div>
  );
}
