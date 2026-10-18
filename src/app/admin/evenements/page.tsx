import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { exigerAdmin } from "@/lib/admin";
import { formatFcfa } from "@/lib/adhesion";
import { listeTypesActions } from "@/lib/bareme";
import { listeEvenements } from "@/lib/evenements";
import { formaterDateHeure } from "@/lib/membres";
import { actionCreerEvenement } from "../actions";
import { BoutonEnvoi, FormulaireAdmin } from "../formulaire";
import { Carte, EnTete, Vide } from "../ui";
import { ChampsEvenement } from "./champs-evenement";

export const metadata: Metadata = { title: "Événements" };

type Ligne = Awaited<ReturnType<typeof listeEvenements>>["aVenir"][number];

export default async function EvenementsAdmin() {
  await exigerAdmin();
  const [{ aVenir, passes }, types] = await Promise.all([listeEvenements(), listeTypesActions()]);

  return (
    <>
      <EnTete
        titre="Événements"
        texte="Crée les sorties, campings et activités, inscris les participants puis valide leur présence pour créditer leurs étoiles."
      />

      <Carte titre="Créer un événement">
        <FormulaireAdmin action={actionCreerEvenement} className="grid gap-5">
          <ChampsEvenement types={types} />
          <div>
            <BoutonEnvoi>Créer l’événement</BoutonEnvoi>
          </div>
        </FormulaireAdmin>
      </Carte>

      <h2 className="mt-10 mb-4 font-titre text-3xl font-semibold">À venir</h2>
      {aVenir.length === 0 ? <Vide texte="Aucun événement à venir." /> : <Liste evenements={aVenir} />}

      <h2 className="mt-10 mb-4 font-titre text-3xl font-semibold">Passés</h2>
      {passes.length === 0 ? <Vide texte="Aucun événement passé." /> : <Liste evenements={passes} />}
    </>
  );
}

function Liste({ evenements }: { evenements: Ligne[] }) {
  return (
    <ul className="grid gap-3">
      {evenements.map((e) => (
        <li key={e.id}>
          <Link
            href={`/admin/evenements/${e.id}`}
            className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/80 p-5 transition hover:border-sable ${
              e.obligatoire ? "border-l-4 border-l-bordeaux" : ""
            }`}
          >
            <div>
              <p className="font-semibold">
                {e.titre}
                {e.obligatoire && <span className="ml-2 text-xs text-sable">Obligatoire</span>}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ivoire/70">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-4" strokeWidth={1.75} />
                  {formaterDateHeure(e.date)}
                </span>
                {e.lieu && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-4" strokeWidth={1.75} />
                    {e.lieu}
                  </span>
                )}
                <span>{e.prix ? `${formatFcfa(e.prix)} FCFA` : "Gratuit"}</span>
              </p>
            </div>
            <div className="text-right text-sm">
              <p className="flex items-center justify-end gap-1.5">
                <Users className="size-4 text-sable" strokeWidth={1.75} />
                {e.inscrits}
                {e.places ? ` / ${e.places}` : ""} inscrit{e.inscrits > 1 ? "s" : ""}
              </p>
              <p className="mt-1 text-xs text-ivoire/60">
                {e.typeAction ? `${e.typeAction} · ${e.etoiles} ★` : "Sans étoiles"} · {e.presents} présent
                {e.presents > 1 ? "s" : ""}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
