"use client";

import { useState } from "react";
import { champClasses } from "./ui";

// Les champs <input type="date"> s'affichent dans la langue du navigateur (souvent mm/dd/yyyy) :
// ce champ s'écrit toujours en français, jj/mm/aaaa, et transmet la date au format AAAA-MM-JJ.

/** « 01022026 » → « 01/02/2026 » au fil de la saisie. */
function formater(saisie: string) {
  const chiffres = saisie.replace(/\D/g, "").slice(0, 8);
  return [chiffres.slice(0, 2), chiffres.slice(2, 4), chiffres.slice(4)].filter(Boolean).join("/");
}

/** « 01/02/2026 » → « 2026-02-01 », ou "" si la date est incomplète ou n'existe pas (31/02…). */
function versIso(saisie: string) {
  const morceaux = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(saisie);
  if (!morceaux) return "";
  const [, jour, mois, annee] = morceaux;
  const date = new Date(Date.UTC(Number(annee), Number(mois) - 1, Number(jour)));
  const existe = date.getUTCDate() === Number(jour) && date.getUTCMonth() === Number(mois) - 1;
  return existe ? `${annee}-${mois}-${jour}` : "";
}

/** « 2026-02-01 » → « 01/02/2026 ». */
const versFrancais = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "");

export function ChampDateFr({ id, name, valeur }: { id: string; name: string; valeur: string | null }) {
  const [saisie, setSaisie] = useState(versFrancais(valeur));
  const iso = versIso(saisie);
  const invalide = saisie.length === 10 && !iso;

  return (
    <>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="jj/mm/aaaa"
        maxLength={10}
        value={saisie}
        onChange={(e) => setSaisie(formater(e.target.value))}
        aria-invalid={invalide}
        title={invalide ? "Cette date n’existe pas." : undefined}
        className={`${champClasses} w-36 tabular-nums ${invalide ? "border-[#F2A7A0]" : ""}`}
      />
      <input type="hidden" name={name} value={iso} />
    </>
  );
}

/** « 1930 » → « 19:30 » au fil de la saisie. */
function formaterHeure(saisie: string) {
  const chiffres = saisie.replace(/\D/g, "").slice(0, 4);
  return chiffres.length > 2 ? `${chiffres.slice(0, 2)}:${chiffres.slice(2)}` : chiffres;
}

const heureValide = (saisie: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(saisie);

/**
 * Date et heure en français (jj/mm/aaaa et hh:mm, 24 h), transmises au format AAAA-MM-JJTHH:MM,
 * comme le faisait <input type="datetime-local">.
 */
export function ChampDateHeureFr({ id, name, valeur }: { id: string; name: string; valeur: string | null }) {
  const [date, setDate] = useState(valeur ? versFrancais(valeur.slice(0, 10)) : "");
  const [heure, setHeure] = useState(valeur ? valeur.slice(11, 16) : "");
  const iso = versIso(date);
  const dateInvalide = date.length === 10 && !iso;
  const heureInvalide = heure.length === 5 && !heureValide(heure);

  return (
    <div className="flex flex-wrap gap-2">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="jj/mm/aaaa"
        maxLength={10}
        required
        value={date}
        onChange={(e) => setDate(formater(e.target.value))}
        aria-invalid={dateInvalide}
        aria-label="Date (jj/mm/aaaa)"
        className={`${champClasses} w-36 tabular-nums ${dateInvalide ? "border-[#F2A7A0]" : ""}`}
      />
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="hh:mm"
        maxLength={5}
        required
        value={heure}
        onChange={(e) => setHeure(formaterHeure(e.target.value))}
        aria-invalid={heureInvalide}
        aria-label="Heure (hh:mm, 24 h)"
        className={`${champClasses} w-24 tabular-nums ${heureInvalide ? "border-[#F2A7A0]" : ""}`}
      />
      <input type="hidden" name={name} value={iso && heureValide(heure) ? `${iso}T${heure}` : ""} />
    </div>
  );
}
