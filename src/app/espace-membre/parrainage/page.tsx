import type { Metadata } from "next";
import { Suspense } from "react";
import { Percent, Star, Users } from "lucide-react";
import { estAdmin } from "@/lib/admin";
import { exigerMembre } from "@/lib/auth";
import { urlSite } from "@/lib/env";
import { REDUCTION_PAR_PARTICIPATION, parrainage, tableauDeBord } from "@/lib/membres";
import { Chargement, PiedEspaceMembre, Section, identite } from "../elements";
import { MemberShell } from "../member-shell";
import { MessagesProvider } from "../messages-context";
import { Invitation } from "./invitation";

export const metadata: Metadata = { title: "Parrainage" };

// La page lit le cookie de session : elle est rendue à chaque requête, derrière <Suspense>.
export default function ParrainagePage() {
  return (
    <Suspense fallback={<Chargement />}>
      <Parrainage />
    </Suspense>
  );
}

async function Parrainage() {
  const connecte = await exigerMembre(); // renvoie vers /connexion si besoin
  // Le tableau de bord fournit aussi les messages du badge « non lus » du menu.
  const [donnees, programme] = await Promise.all([tableauDeBord(connecte), parrainage(connecte)]);
  const { nomComplet, initiales } = identite(donnees.membre.prenom, donnees.membre.nom);

  return (
    <MessagesProvider initialMessages={donnees.messages}>
      <MemberShell nomComplet={nomComplet} initiales={initiales} page="parrainage" admin={estAdmin(connecte)}>
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
          <div className="mb-8">
            <p className="text-[0.65rem] font-semibold tracking-[3px] text-sable uppercase">
              Le programme « Invite ton clan »
            </p>
            <h1 className="mt-2 font-titre text-4xl font-semibold sm:text-5xl">
              Fais grandir l’aventure.
            </h1>
            <p className="mt-2 max-w-2xl text-ivoire/70">
              Invite les personnes qui te ressemblent, partage l’esprit CLANS et profite de
              récompenses à mesure que ton réseau participe à la vie de la communauté.
            </p>
          </div>

          {/* INVITATION */}
          <section
            aria-labelledby="invitation-titre"
            className="relative overflow-hidden rounded-2xl bg-linear-to-br from-terre to-bordeaux p-6 text-ivoire sm:p-8"
          >
            <Star
              aria-hidden
              className="absolute -top-10 -right-6 size-48 fill-sable/10 text-sable/10"
              strokeWidth={1}
            />
            <p className="relative text-[0.65rem] font-semibold tracking-[3px] text-sable uppercase">
              Ton invitation personnelle
            </p>
            <h2 id="invitation-titre" className="relative mt-2 font-titre text-3xl font-semibold">
              Un ami invité, une aventure de plus.
            </h2>
            <p className="relative mt-2 max-w-xl text-sm leading-6 text-ivoire/80">
              Partage ton code de parrainage avec tes proches. Une adhésion payée et confirmée te
              rapporte {programme.etoilesParFilleul} étoile{programme.etoilesParFilleul > 1 ? "s" : ""} ; chaque participation de tes filleuls à un événement ajoute{" "}
              {REDUCTION_PAR_PARTICIPATION} % de réduction à ton cumul.
            </p>
            {programme.code ? (
              <Invitation
                code={programme.code}
                lienInscription={`${urlSite()}/inscription?parrain=${programme.code}`}
              />
            ) : (
              <p className="relative mt-6 text-sm text-sable">
                Ton code apparaîtra dès que ton adhésion sera confirmée.
              </p>
            )}
          </section>

          {/* STATISTIQUES */}
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <Statistique valeur={programme.invites} label="Personnes invitées" detail="Avec ton code" />
            <Statistique valeur={programme.confirmes} label="Adhésions confirmées" detail="Paiement confirmé" />
            <Statistique valeur={`${programme.reduction} %`} label="Réduction cumulée" detail="Sans plafond" />
          </div>

          {/* RÉCOMPENSES */}
          <Section titre="Comment gagner ?">
            <div className="grid gap-4 sm:grid-cols-2">
              <Regle
                Icone={Star}
                titre={`${programme.etoilesParFilleul} étoile${programme.etoilesParFilleul > 1 ? "s" : ""} CLANS`}
              >
                Chaque fois qu’un filleul devient membre — après paiement et confirmation de son
                adhésion — tu gagnes {programme.etoilesParFilleul} étoile{programme.etoilesParFilleul > 1 ? "s" : ""} CLANS.
              </Regle>
              <Regle Icone={Percent} titre={`+${REDUCTION_PAR_PARTICIPATION} % à chaque participation`}>
                Chaque participation effective d’un filleul à un événement ajoute{" "}
                {REDUCTION_PAR_PARTICIPATION} points de pourcentage à ta réduction cumulée pour un
                événement.
              </Regle>
            </div>
            <p className="mt-4 rounded-r-xl border-l-[3px] border-sable bg-white/5 px-4 py-3 text-sm leading-6 text-ivoire/80">
              <strong className="text-sable">Exemple :</strong> 1 participation validée = 5 % ; 2
              participations = 10 % ; 4 participations = 20 % ; 10 participations = 50 %.{" "}
              <strong className="text-ivoire">Aucun plafond n’est prévu.</strong> Le cumul est vérifié
              par CLANS avant d’être appliqué au prix d’un événement.
            </p>
          </Section>

          {/* FILLEULS */}
          <Section titre="Mon réseau de filleuls">
            <div className="rounded-2xl border border-white p-5 text-white sm:p-7">
              {programme.filleuls.length === 0 ? (
                <div className="py-6 text-center text-sm leading-7 text-white/60">
                  <Users className="mx-auto mb-3 size-8 text-sable" strokeWidth={1.5} />
                  <strong className="text-white">Ton aventure de parrainage commence ici.</strong>
                  <br />
                  Tes filleuls apparaîtront dans cette liste dès qu’ils s’inscriront avec ton code.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-120 text-sm">
                    <thead>
                      <tr className="border-b border-white/20 text-left text-[0.65rem] tracking-[1px] text-white/60 uppercase">
                        <th className="px-2 py-3 font-semibold">Filleul</th>
                        <th className="px-2 py-3 font-semibold">Adhésion</th>
                        <th className="px-2 py-3 font-semibold">Participations validées</th>
                        <th className="px-2 py-3 font-semibold">Étoile gagnée</th>
                        <th className="px-2 py-3 font-semibold">Réduction générée</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/15">
                      {programme.filleuls.map((filleul) => (
                        <tr key={filleul.id}>
                          <td className="px-2 py-4 font-semibold">{filleul.nom}</td>
                          <td className="px-2 py-4">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                filleul.confirme ? "bg-sable/20 text-sable" : "bg-white/10 text-white/80"
                              }`}
                            >
                              {filleul.confirme ? "Confirmée" : "En attente"}
                            </span>
                          </td>
                          <td className="px-2 py-4">{filleul.presences}</td>
                          <td className="px-2 py-4">
                            {filleul.confirme ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-sable">
                                +{programme.etoilesParFilleul} <Star className="size-3.5 fill-terre" />
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-2 py-4 font-semibold">{filleul.reduction} %</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Section>

          {/* RÈGLES */}
          <Section titre="Les règles à retenir">
            <ol className="list-decimal rounded-2xl border border-white py-5 pr-5 pl-10 text-sm leading-7 text-white/80 sm:py-7 sm:pr-7 sm:pl-12">
              <li>Le code de parrainage doit être indiqué par le nouveau membre lors de son inscription.</li>
              <li>Les étoiles sont accordées uniquement après confirmation du paiement de l’adhésion du filleul.</li>
              <li>
                Les {REDUCTION_PAR_PARTICIPATION} % sont ajoutés uniquement après confirmation de la
                participation effective du filleul à un événement.
              </li>
              <li>
                Chaque participation validée compte, y compris plusieurs participations d’un même
                filleul à des événements différents.
              </li>
              <li>
                Le cumul est sans plafond. Il est enregistré et vérifié par CLANS avant d’être appliqué
                au prix d’un événement.
              </li>
            </ol>
          </Section>

          <PiedEspaceMembre />
        </div>
      </MemberShell>
    </MessagesProvider>
  );
}

function Statistique({ valeur, label, detail }: { valeur: React.ReactNode; label: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-white p-5 text-white">
      <p className="text-xs font-semibold text-white/60">{label}</p>
      <p className="mt-2 font-titre text-4xl leading-none font-semibold text-sable">{valeur}</p>
      <p className="mt-1 text-xs text-white/50">{detail}</p>
    </div>
  );
}

function Regle({ Icone, titre, children }: { Icone: typeof Star; titre: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white p-5 text-white sm:p-6">
      <span className="flex size-10 items-center justify-center rounded-xl bg-white/10">
        <Icone className="size-5 text-sable" strokeWidth={1.75} />
      </span>
      <h3 className="mt-3 font-titre text-2xl font-semibold">{titre}</h3>
      <p className="mt-1 text-sm leading-6 text-white/70">{children}</p>
    </div>
  );
}
