import type { Metadata } from "next";
import { Suspense } from "react";
import { CalendarDays, CircleCheck, MapPin, Star, Ticket, Users } from "lucide-react";
import { estAdmin } from "@/lib/admin";
import { formatFcfa } from "@/lib/adhesion";
import { exigerMembre } from "@/lib/auth";
import { bonsPlans } from "@/lib/evenements";
import { urlImageEvenement } from "@/lib/images";
import { formaterDateHeure, tableauDeBord } from "@/lib/membres";
import { Chargement, PiedEspaceMembre, identite } from "../elements";
import { MemberShell } from "../member-shell";
import { MessagesProvider } from "../messages-context";

export const metadata: Metadata = { title: "Bon plan" };

// La page lit le cookie de session : elle est rendue à chaque requête, derrière <Suspense>.
export default function BonPlanPage() {
  return (
    <Suspense fallback={<Chargement />}>
      <BonPlan />
    </Suspense>
  );
}

async function BonPlan() {
  const connecte = await exigerMembre(); // renvoie vers /connexion si besoin
  // Le tableau de bord fournit aussi les messages du badge « non lus » du menu.
  const [donnees, plans] = await Promise.all([tableauDeBord(connecte), bonsPlans(connecte.id)]);
  const { nomComplet, initiales } = identite(donnees.membre.prenom, donnees.membre.nom);

  return (
    <MessagesProvider initialMessages={donnees.messages}>
      <MemberShell nomComplet={nomComplet} initiales={initiales} page="bon-plan" admin={estAdmin(connecte)}>
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
          <div className="mb-8">
            <p className="text-[0.65rem] font-semibold tracking-[3px] text-sable uppercase">
              Le programme des sorties
            </p>
            <h1 className="mt-2 font-titre text-4xl font-semibold sm:text-5xl">Bon plan</h1>
            <p className="mt-2 max-w-2xl text-ivoire/70">
              Campings, excursions et activités culturelles à venir : choisis ta prochaine aventure.
            </p>
          </div>

          {plans.length === 0 ? (
            <p className="rounded-2xl border border-white p-6 text-sm text-white/70">
              Aucune sortie programmée pour le moment. Les prochains bons plans arrivent bientôt !
            </p>
          ) : (
            <ul className="grid gap-5">
              {plans.map((plan) => {
                const placesRestantes = plan.places === null ? null : Math.max(plan.places - plan.inscrits, 0);
                const image = urlImageEvenement(plan.id, plan.imageMaj);
                return (
                  <li
                    key={plan.id}
                    className={`overflow-hidden rounded-2xl border border-white text-white ${
                      plan.obligatoire ? "border-l-4 border-l-bordeaux" : ""
                    }`}
                  >
                    {image && (
                      // eslint-disable-next-line @next/next/no-img-element -- image servie par /api (stockée en base)
                      <img src={image} alt={plan.titre} loading="lazy" className="aspect-[16/7] w-full object-cover" />
                    )}
                    <div className="p-6 sm:p-7">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        {plan.typeAction && (
                          <p className="text-[0.65rem] font-semibold tracking-[2px] text-sable uppercase">
                            {plan.typeAction}
                          </p>
                        )}
                        <h2 className="mt-1 font-titre text-3xl font-semibold">{plan.titre}</h2>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {plan.inscrit && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-sable/20 px-3 py-1 text-xs font-semibold text-sable">
                            <CircleCheck className="size-3.5" /> Tu es inscrit
                          </span>
                        )}
                        {plan.obligatoire && (
                          <span className="rounded-full bg-bordeaux px-3 py-1 text-xs font-semibold text-white">
                            Obligatoire
                          </span>
                        )}
                        {plan.etoiles > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-terre/40 px-3 py-1 text-xs font-semibold">
                            +{plan.etoiles} <Star className="size-3.5 fill-sable text-sable" />
                          </span>
                        )}
                      </div>
                    </div>

                    <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                      <Detail Icone={CalendarDays} label="Date" valeur={formaterDateHeure(plan.date)} />
                      <Detail Icone={MapPin} label="Lieu" valeur={plan.lieu ?? "Communiqué bientôt"} />
                      <Detail
                        Icone={Ticket}
                        label="Participation"
                        valeur={plan.prix ? `${formatFcfa(plan.prix)} FCFA` : "Gratuit"}
                      />
                      <Detail
                        Icone={Users}
                        label="Places"
                        valeur={
                          placesRestantes === null
                            ? "Sans limite"
                            : placesRestantes === 0
                              ? "Complet"
                              : `${placesRestantes} restante${placesRestantes > 1 ? "s" : ""}`
                        }
                      />
                    </dl>

                    {plan.description && (
                      <p className="mt-5 text-sm leading-7 whitespace-pre-line text-white/80">{plan.description}</p>
                    )}

                    {(plan.conditions || plan.obligatoire) && (
                      <div className="mt-5 rounded-r-xl border-l-[3px] border-sable bg-white/5 px-4 py-3 text-sm leading-6">
                        <p className="text-[0.65rem] font-semibold tracking-[2px] text-sable uppercase">
                          Conditions de participation
                        </p>
                        {plan.conditions && (
                          <p className="mt-1 whitespace-pre-line text-white/80">{plan.conditions}</p>
                        )}
                        {plan.obligatoire && plan.penalite > 0 && (
                          <p className="mt-1 text-white/80">
                            Absence non justifiée : −{plan.penalite} étoile{plan.penalite > 1 ? "s" : ""}.
                          </p>
                        )}
                      </div>
                    )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <PiedEspaceMembre />
        </div>
      </MemberShell>
    </MessagesProvider>
  );
}

function Detail({ Icone, label, valeur }: { Icone: typeof Star; label: string; valeur: string }) {
  return (
    <div className="flex gap-2.5">
      <Icone className="mt-0.5 size-4 shrink-0 text-sable" strokeWidth={1.75} />
      <div>
        <dt className="text-[0.65rem] font-semibold tracking-[1.5px] text-white/60 uppercase">{label}</dt>
        <dd className="mt-0.5 font-medium">{valeur}</dd>
      </div>
    </div>
  );
}
