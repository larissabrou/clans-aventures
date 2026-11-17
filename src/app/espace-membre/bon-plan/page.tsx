import type { Metadata } from "next";
import { Suspense } from "react";
import { ListeSorties } from "@/components/sorties/liste-sorties";
import { aUnCompteAdmin } from "@/lib/admin";
import { exigerMembre } from "@/lib/auth";
import { bonsPlans } from "@/lib/evenements";
import { tableauDeBord } from "@/lib/membres";
import { lireParametresSorties, versAffichage } from "@/lib/sorties-affichage";
import { Chargement, PiedEspaceMembre, identite } from "../elements";
import { MemberShell } from "../member-shell";
import { MessagesProvider } from "../messages-context";

export const metadata: Metadata = { title: "Bon plan" };

// La page lit le cookie de session : elle est rendue à chaque requête, derrière <Suspense>.
export default function BonPlanPage({ searchParams }: PageProps<"/espace-membre/bon-plan">) {
  return (
    <Suspense fallback={<Chargement />}>
      <BonPlan searchParams={searchParams} />
    </Suspense>
  );
}

async function BonPlan({ searchParams }: Pick<PageProps<"/espace-membre/bon-plan">, "searchParams">) {
  const connecte = await exigerMembre(); // renvoie vers /connexion si besoin
  // Le tableau de bord fournit aussi les messages du badge « non lus » du menu.
  const [donnees, plans, parametres] = await Promise.all([tableauDeBord(connecte), bonsPlans(connecte.id), searchParams]);
  const { nomComplet, initiales } = identite(donnees.membre.prenom, donnees.membre.nom);
  const { selection, retour } = lireParametresSorties(parametres);

  const sorties = plans.map((plan) => ({
    ...versAffichage(plan),
    inscrit: plan.inscrit,
    etoiles: plan.etoiles,
    obligatoire: plan.obligatoire,
    penalite: plan.penalite,
  }));

  return (
    <MessagesProvider initialMessages={donnees.messages}>
      <MemberShell nomComplet={nomComplet} initiales={initiales} page="bon-plan" admin={await aUnCompteAdmin(connecte.email)}
        photo={donnees.membre.photo}>
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col">
          <div className="mb-8">
            <p className="text-[0.65rem] font-semibold tracking-[3px] text-sable uppercase">
              Le programme des sorties
            </p>
            <h1 className="mt-2 font-titre text-4xl font-semibold sm:text-5xl">Bon plan</h1>
            <p className="mt-2 max-w-2xl text-ivoire/70">
              Campings, excursions et activités culturelles à venir : choisis ta prochaine aventure.
            </p>
          </div>

          {sorties.length === 0 ? (
            <p className="rounded-2xl border border-white p-6 text-sm text-white/70">
              Aucune sortie programmée pour le moment. Les prochains bons plans arrivent bientôt !
            </p>
          ) : (
            <ListeSorties sorties={sorties} mode="membre" selectionInitiale={selection} retour={retour} />
          )}

          <PiedEspaceMembre />
        </div>
      </MemberShell>
    </MessagesProvider>
  );
}
