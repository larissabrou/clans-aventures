// PAGE TEMPORAIRE : comparaison des fonds de hero. À supprimer une fois le choix fait.
import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Propositions hero",
  robots: { index: false },
};

const PROPOSITIONS = [
  {
    id: "A",
    nom: "Forêt + logo blanc",
    fond: "bg-foret",
    logo: "/images/logo-clans-blanc.png",
    cta: "hover:bg-sable",
    accent: "text-sable",
    recommande: true,
    note: "Nature · Aventure · Stabilité. Couleur la plus « CLANS » : elle porte le cœur de la direction créative (nature & aventure) et elle est déjà utilisée dans l’adhésion et l’espace membre. Le logo blanc y est net et élégant.",
  },
  {
    id: "B",
    nom: "Charbon + logo couleur",
    fond: "bg-charbon",
    logo: "/images/logo-clans.png",
    cta: "hover:bg-sable",
    accent: "text-sable",
    note: "Modernité · Lisibilité · Premium. Le fond neutre fait ressortir toutes les couleurs du symbole. Très chic, mais moins « nature » : idéal pour CLANS FESTIVAL ou l’univers PREMIUM.",
  },
  {
    id: "C",
    nom: "Bordeaux + logo blanc",
    fond: "bg-bordeaux",
    logo: "/images/logo-clans-blanc.png",
    cta: "hover:bg-sable",
    accent: "text-sable",
    note: "Caractère · Tradition · Élégance. Forte personnalité, chaleureux. À réserver aux univers LOVE ou CULTURE : en page d’accueil, il éloigne de l’idée de plein air.",
  },
  {
    id: "D",
    nom: "Terre + logo blanc",
    fond: "bg-terre",
    logo: "/images/logo-clans-blanc.png",
    cta: "hover:bg-ivoire",
    accent: "text-ivoire",
    note: "Chaleur · Énergie · Authenticité. Évoque le feu de camp, mais la couleur est mieux utilisée en accent (boutons, icônes) : en grand aplat, elle fatigue et réduit le contraste du texte.",
  },
];

export default function PropositionsHeroPage() {
  return (
    <main className="min-h-svh bg-ivoire px-4 py-12 text-charbon sm:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs tracking-[3px] text-terre uppercase">
          Proposition design · page temporaire
        </p>
        <h1 className="mt-2 font-titre text-5xl font-semibold">
          Fond du hero
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-charbon/70">
          Le même hero décliné sur les fonds sombres de la charte. Avec la
          vidéo, cette couleur sert aussi de voile teinté par-dessus l’image.
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          {PROPOSITIONS.map((p) => (
            <article key={p.id}>
              <div
                className={`relative flex aspect-[4/3] flex-col overflow-hidden rounded-2xl text-white ${p.fond} ${p.recommande ? "ring-4 ring-terre ring-offset-4 ring-offset-ivoire" : ""}`}
              >
                <div className="flex items-center justify-between px-5 py-4">
                  <Image
                    src={p.logo}
                    alt=""
                    width={788}
                    height={1333}
                    className="h-14 w-auto"
                  />
                  <span className="rounded-full border border-white/75 px-3 py-1.5 text-[0.55rem] font-semibold tracking-[1.5px] uppercase">
                    Espace membre
                  </span>
                </div>

                <div className="flex flex-1 flex-col items-center justify-center px-6 pb-8 text-center">
                  <p className="font-titre text-5xl leading-none font-semibold tracking-[2px]">
                    clans <span className="italic">aventures</span>
                  </p>
                  <p className={`mt-2 text-[0.65rem] tracking-[3px] uppercase ${p.accent}`}>
                    Nature · Culture · Rencontres
                  </p>
                  <p className="mt-5 font-titre text-2xl leading-tight">
                    Et si ta prochaine histoire commençait autour d’un feu ?
                  </p>
                  <span
                    className={`mt-6 rounded-full bg-white px-6 py-3 text-[0.65rem] font-bold tracking-[1.5px] text-charbon uppercase transition ${p.cta}`}
                  >
                    Commencer l’aventure →
                  </span>
                </div>
              </div>

              <h2 className="mt-4 flex items-center gap-3 font-titre text-2xl font-semibold">
                {p.id}. {p.nom}
                {p.recommande && (
                  <span className="rounded-full bg-terre px-2.5 py-0.5 font-sans text-[0.65rem] font-bold tracking-[1px] text-white uppercase">
                    Recommandé
                  </span>
                )}
              </h2>
              <p className="mt-1 text-sm leading-6 text-charbon/70">{p.note}</p>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
