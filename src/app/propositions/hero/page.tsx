// PAGE TEMPORAIRE : comparaison des deux versions du hero. À supprimer une fois le choix fait.
import type { Metadata } from "next";
import { Hero, type VersionHero } from "@/components/hero";

export const metadata: Metadata = {
  title: "Propositions hero",
  robots: { index: false },
};

const PROPOSITIONS: { version: VersionHero; titre: string; note: string }[] = [
  {
    version: "blanc",
    titre: "Version A — fond blanc",
    note: "Vidéo sous un voile blanc · logo coloré · textes foncés · bouton vert forêt",
  },
  {
    version: "vert",
    titre: "Version B — fond vert forêt",
    note: "Vidéo sous un voile vert forêt · logo blanc · textes clairs · bouton blanc",
  },
  {
    version: "campement",
    titre: "Version C — campement de nuit (HD)",
    note: "Vidéo paysage HD sous un voile léger · logo blanc · textes clairs · bouton blanc",
  },
  {
    version: "barre",
    titre: "Version D — en-tête blanc + campement (HD)",
    note: "Barre d’en-tête blanche avec logo coloré · vidéo HD en fond · textes clairs · bouton blanc",
  },
];

export default function PropositionsHeroPage() {
  return (
    <main>
      {PROPOSITIONS.map((p) => (
        <div key={p.version}>
          <div className="bg-charbon px-6 py-4 text-center">
            <p className="font-titre text-2xl font-semibold text-ivoire">{p.titre}</p>
            <p className="text-xs text-sable">{p.note}</p>
          </div>
          <Hero version={p.version} />
        </div>
      ))}
    </main>
  );
}
