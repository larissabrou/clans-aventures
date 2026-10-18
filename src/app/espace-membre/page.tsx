import type { Metadata } from "next";
import { Suspense } from "react";
import { CalendarDays, Star, Tent, Users } from "lucide-react";
import { Logo } from "@/components/logo";
import { estAdmin } from "@/lib/admin";
import { exigerMembre } from "@/lib/auth";
import { tableauDeBord } from "@/lib/membres";
import { NIVEAUX, libelleSeuil, progression } from "@/lib/niveaux";
import { Chargement, PiedEspaceMembre, Section, identite } from "./elements";
import { MemberShell } from "./member-shell";
import { ApercuMessages } from "./apercu-messages";
import { MessagesProvider } from "./messages-context";

export const metadata: Metadata = { title: "Espace membre" };

// La page lit le cookie de session : elle est rendue à chaque requête, derrière <Suspense>.
export default function EspaceMembrePage() {
  return (
    <Suspense fallback={<Chargement />}>
      <EspaceMembre />
    </Suspense>
  );
}

async function EspaceMembre() {
  const connecte = await exigerMembre(); // renvoie vers /connexion si besoin
  const donnees = await tableauDeBord(connecte);
  const { membre } = donnees;
  const { nomComplet, initiales } = identite(membre.prenom, membre.nom);
  const { niveau, pourcentage, message } = progression(membre.etoiles);

  return (
    <MessagesProvider initialMessages={donnees.messages}>
      <MemberShell nomComplet={nomComplet} initiales={initiales} admin={estAdmin(connecte)}>
        <div className="mx-auto max-w-5xl">
          {/* BIENVENUE */}
          <div id="tableau-de-bord" className="mb-8 scroll-mt-24">
            <h1 className="font-titre text-4xl font-semibold sm:text-5xl">
              Bonjour {membre.prenom}
            </h1>
            <p className="mt-2 text-ivoire/70">
              Bienvenue dans ton espace membre CLANS aventures.
            </p>
          </div>

          {/* CARTE + PROGRESSION */}
          <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
            <div
              id="carte"
              // Carte sombre, dégradé or vers le coin bas droit (bronze puis or clair, sans teinte olive au milieu).
              className="relative scroll-mt-24 overflow-hidden rounded-2xl bg-linear-to-br from-charbon from-45% via-[#8A6A2E] via-80% to-[#E6C877] p-6 text-ivoire ring-1 ring-sable/50 sm:p-8"
            >
              <MotifTextile />

              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-[0.65rem] tracking-[3px] text-sable uppercase">
                    Carte membre
                  </p>
                  <p className="mt-1 text-sm font-semibold tracking-[2px]">
                    {membre.numero}
                  </p>
                </div>
                <Logo className="h-14 w-auto opacity-90" />
              </div>

              <div className="relative mt-12">
                <p className="font-titre text-3xl font-semibold sm:text-4xl">
                  {nomComplet}
                </p>
                <p className="mt-1 text-sm text-ivoire/80">
                  Clan : <strong className="text-ivoire">{membre.clan}</strong>
                </p>
                <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-[1px] uppercase">
                  <Star className="size-3.5 fill-sable text-sable" />
                  {niveau.nom}
                </p>
              </div>
            </div>

            {/* Colonne de droite : progression (compacte) + 2 statistiques, à la hauteur de la carte membre. */}
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl border border-white p-5 text-white sm:px-6">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-titre text-xl font-semibold">Ma progression</h2>
                  <p className="flex items-baseline gap-1.5">
                    <strong className="font-titre text-4xl leading-none font-semibold text-terre">
                      {membre.etoiles}
                    </strong>
                    <span className="text-xs text-white/70">étoiles</span>
                  </p>
                </div>

                <div className="mt-3">
                  <div className="mb-1.5 flex justify-between text-xs font-semibold">
                    <span>{niveau.nom}</span>
                    <span className="text-white/60">
                      {niveau.suivant === null ? "Maximum" : `${niveau.suivant} ★`}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-sable/40">
                    <div
                      className="h-full rounded-full bg-terre"
                      style={{ width: `${pourcentage}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-white/70">{message}</p>
                </div>
              </div>

              <div className="grid flex-1 grid-cols-2 gap-4">
                <Statistique Icone={Tent} valeur={membre.experiences} label="Expériences réalisées" />
                <Statistique Icone={Users} valeur={membre.filleuls} label="Filleuls" />
              </div>
            </div>
          </div>

          {/* MESSAGES : les derniers seulement, la boîte complète a sa page */}
          <Section titre="Mes derniers messages">
            <ApercuMessages />
          </Section>

          {/* ÉVÉNEMENTS OBLIGATOIRES */}
          <Section titre="Événements obligatoires">
            {donnees.evenementsObligatoires.length === 0 && (
              <Vide texte="Aucun événement obligatoire à venir." />
            )}
            <ul className="grid gap-3">
              {donnees.evenementsObligatoires.map((evenement) => (
                <li
                  key={evenement.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-l-4 border-white border-l-bordeaux p-5 text-white"
                >
                  <div>
                    <p className="font-semibold">{evenement.titre}</p>
                    <p className="mt-1 flex items-center gap-2 text-sm text-white/70">
                      <CalendarDays className="size-4" strokeWidth={1.75} />
                      {evenement.date}
                    </p>
                    <p className="mt-1 text-xs text-sable">
                      Absence non justifiée : −{evenement.penalite} étoiles
                    </p>
                  </div>
                  <strong className="shrink-0 font-titre text-2xl text-terre">
                    −{evenement.penalite} ★
                  </strong>
                </li>
              ))}
            </ul>
          </Section>

          {/* HISTORIQUE */}
          <Section id="etoiles" titre="Historique de mes étoiles">
            {donnees.historique.length === 0 ? (
              <Vide texte="Tes premières étoiles arriveront avec tes premières expériences CLANS." />
            ) : (
            <ul className="divide-y divide-white/15 rounded-2xl border border-white px-5 text-white sm:px-7">
              {donnees.historique.map((ligne) => (
                <li
                  key={ligne.id}
                  className="flex items-center justify-between gap-4 py-4"
                >
                  <div>
                    <p className="text-sm font-medium">{ligne.libelle}</p>
                    <p className="text-xs text-white/50">{ligne.date}</p>
                  </div>
                  <span
                    className={`font-semibold ${ligne.variation >= 0 ? "text-sable" : "text-terre"}`}
                  >
                    {ligne.variation >= 0 ? "+" : "−"}
                    {Math.abs(ligne.variation)} ★
                  </span>
                </li>
              ))}
            </ul>
            )}
          </Section>

          {/* NIVEAUX */}
          <Section titre="Les niveaux CLANS">
            <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {NIVEAUX.map((n) => {
                const actuel = n.nom === niveau.nom;
                const atteint = membre.etoiles >= n.min;
                return (
                  <li
                    key={n.nom}
                    aria-current={actuel ? "step" : undefined}
                    className={`rounded-2xl border p-4 text-center ${
                      actuel
                        ? "border-terre bg-sable text-charbon"
                        : "border-white text-white"
                    }`}
                  >
                    <Star
                      className={`mx-auto size-6 ${atteint ? "fill-terre text-terre" : "text-white/30"}`}
                      strokeWidth={1.5}
                    />
                    <p className="mt-2 text-sm font-semibold">{n.nom}</p>
                    <p className={`mt-1 text-xs ${actuel ? "text-charbon/60" : "text-white/60"}`}>
                      {libelleSeuil(n)} ★
                    </p>
                  </li>
                );
              })}
            </ol>
          </Section>

          <PiedEspaceMembre />
        </div>
      </MemberShell>
    </MessagesProvider>
  );
}

function Vide({ texte }: { texte: string }) {
  return <p className="rounded-2xl border border-white p-5 text-sm text-white/70">{texte}</p>;
}

function Statistique({
  Icone,
  valeur,
  label,
}: {
  Icone: typeof Star;
  valeur: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex flex-col justify-center rounded-2xl border border-white p-4 text-white">
      <Icone className="size-5 text-terre" strokeWidth={1.75} />
      <p className="mt-2 font-titre text-3xl leading-none font-semibold">{valeur}</p>
      <p className="mt-1 text-xs text-white/60">{label}</p>
    </div>
  );
}

// Triangles inspirés des textiles africains et des motifs du symbole CLANS.
// Fondu vers la gauche pour que le motif reste discret derrière le texte.
function MotifTextile() {
  return (
    <svg
      aria-hidden
      className="absolute inset-y-0 right-0 h-full w-3/5 text-sable opacity-20"
      style={{ maskImage: "linear-gradient(to left, black, transparent)" }}
    >
      <defs>
        <pattern
          id="motif-textile"
          width="28"
          height="28"
          patternUnits="userSpaceOnUse"
        >
          <path d="M0 28 L7 16 L14 28 Z M14 28 L21 16 L28 28 Z" fill="currentColor" />
          <path d="M0 0 H28" stroke="currentColor" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#motif-textile)" />
    </svg>
  );
}
