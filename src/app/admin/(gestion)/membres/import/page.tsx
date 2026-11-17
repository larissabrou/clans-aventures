import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { COLONNES } from "@/lib/import-membres/colonnes";
import { Carte, EnTete } from "../../ui";
import { FormulaireImport } from "./formulaire-import";

export const metadata: Metadata = { title: "Importer des membres" };

// Pas de lecture de session ici (elle bloquerait le rendu hors <Suspense>) : la mise en page de
// l'admin vérifie déjà la session, et l'action d'import comme le modèle la revérifient eux-mêmes.
export default function ImportMembresAdmin() {
  return (
    <>
      <Link href="/admin/membres" className="mb-4 inline-flex items-center gap-2 text-sm text-sable hover:text-ivoire">
        <ArrowLeft className="size-4" />
        Tous les membres
      </Link>
      <EnTete
        titre="Importer des membres"
        texte="Anciens membres ayant déjà payé leur adhésion : chacun reçoit son numéro, ses e-mails d’accès et de bienvenue, comme après une inscription."
      />

      <Carte titre="1. Le modèle">
        <p className="mb-4 text-sm leading-6 text-ivoire/75">
          Remplis une ligne par membre. Colonnes obligatoires :{" "}
          {COLONNES.filter((c) => c.obligatoire)
            .map((c) => c.entete)
            .join(", ")}
          . « Numéro membre » garde l’ancien numéro (sinon un nouveau est attribué) ; « Date d’adhésion » garde
          l’ancienneté (sinon la date de l’import). La feuille « Valeurs acceptées » liste les tranches d’âge, univers,
          clans et univers culturels reconnus.
        </p>
        {/* Téléchargement d'un fichier : un lien classique, pas une navigation <Link>. */}
        <a
          href="/admin/membres/import/modele"
          download
          className="inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-2.5 text-xs font-semibold tracking-[1.5px] text-ivoire uppercase hover:border-sable hover:text-sable"
        >
          <Download className="size-4" />
          Télécharger le modèle Excel
        </a>
      </Carte>

      <Carte titre="2. Vérifier puis importer" className="mt-8">
        <p className="mb-4 text-sm leading-6 text-ivoire/75">
          Rien n’est créé tant que tu n’as pas cliqué sur « Importer ». Les personnes déjà membres du site et les lignes
          incomplètes sont signalées et ignorées.
        </p>
        <FormulaireImport />
      </Carte>
    </>
  );
}
