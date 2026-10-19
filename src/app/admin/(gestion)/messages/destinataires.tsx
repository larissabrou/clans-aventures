"use client";

import { useState } from "react";
import { Champ, champClasses } from "../ui";

type Genre = "tous" | "clan" | "membre";

/** Choix des destinataires : le champ utile (clan ou numéro) n'apparaît que lorsqu'il sert. */
export function ChoixDestinataires({ clans }: { clans: { id: number; nom: string }[] }) {
  const [genre, setGenre] = useState<Genre>("tous");

  const options: { valeur: Genre; label: string }[] = [
    { valeur: "tous", label: "Tous les membres" },
    { valeur: "clan", label: "Un clan" },
    { valeur: "membre", label: "Un membre" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <fieldset>
        <legend className="mb-1.5 block text-[0.65rem] font-semibold tracking-[1.5px] text-sable/90 uppercase">
          Destinataires
        </legend>
        <div className="flex flex-wrap gap-2">
          {options.map((o) => (
            <label
              key={o.valeur}
              className={`cursor-pointer rounded-full border px-4 py-2 text-sm transition ${
                genre === o.valeur
                  ? "border-sable bg-sable font-semibold text-charbon"
                  : "border-white/30 text-ivoire/80 hover:border-sable"
              }`}
            >
              <input
                type="radio"
                name="genre"
                value={o.valeur}
                checked={genre === o.valeur}
                onChange={() => setGenre(o.valeur)}
                className="sr-only"
              />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>

      {genre === "clan" && (
        <Champ label="Clan" id="envoi-clan">
          <select id="envoi-clan" name="clanId" required defaultValue="" className={champClasses}>
            <option value="" disabled>
              Choisir un clan
            </option>
            {clans.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        </Champ>
      )}
      {genre === "membre" && (
        <Champ label="Numéro du membre" id="envoi-numero">
          <input
            id="envoi-numero"
            name="numero"
            required
            placeholder="CLANS-000012 ou 12"
            className={`${champClasses} uppercase placeholder:normal-case`}
          />
        </Champ>
      )}
    </div>
  );
}
