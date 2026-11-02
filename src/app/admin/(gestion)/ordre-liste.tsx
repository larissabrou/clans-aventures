"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Check, GripVertical, LoaderCircle } from "lucide-react";
import type { EtatAction } from "./actions";

type Element = { id: number; nom: string; actif: boolean };

/**
 * Ordre d'affichage d'une liste de l'inscription (clans, univers) : glisser-déposer à la souris,
 * flèches ↑ ↓ sur téléphone et au clavier. Chaque déplacement est enregistré aussitôt par `action`.
 */
export function OrdreListe({
  elements,
  action,
}: {
  elements: Element[];
  action: (ids: number[]) => Promise<EtatAction>;
}) {
  const [liste, setListe] = useState(elements);
  const [glisse, setGlisse] = useState<number | null>(null);
  const [survol, setSurvol] = useState<number | null>(null);
  const [etat, setEtat] = useState<{ ok: boolean; message: string } | null>(null);
  const [enCours, demarrer] = useTransition();

  function deplacer(de: number, vers: number) {
    if (de === vers || vers < 0 || vers >= liste.length) return;
    const nouvelle = [...liste];
    const [deplace] = nouvelle.splice(de, 1);
    nouvelle.splice(vers, 0, deplace);
    const precedente = liste;
    setListe(nouvelle);
    setEtat(null);
    demarrer(async () => {
      const resultat = await action(nouvelle.map((c) => c.id));
      if (!resultat?.ok) setListe(precedente); // l'écran revient à l'ordre enregistré
      setEtat(resultat);
    });
  }

  return (
    <div>
      <ol className="grid gap-2">
        {liste.map((element, index) => (
          <li
            key={element.id}
            draggable
            onDragStart={(e) => {
              setGlisse(index);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(e) => {
              e.preventDefault(); // autorise le dépôt
              setSurvol(index);
            }}
            onDragLeave={() => setSurvol((s) => (s === index ? null : s))}
            onDrop={(e) => {
              e.preventDefault();
              if (glisse !== null) deplacer(glisse, index);
              setGlisse(null);
              setSurvol(null);
            }}
            onDragEnd={() => {
              setGlisse(null);
              setSurvol(null);
            }}
            className={`flex cursor-grab items-center gap-3 rounded-xl border px-3 py-2.5 transition active:cursor-grabbing ${
              glisse === index
                ? "border-sable/60 opacity-40"
                : survol === index && glisse !== null
                  ? "border-sable bg-sable/10"
                  : "border-white/30 hover:border-white/60"
            }`}
          >
            <GripVertical className="size-5 shrink-0 text-ivoire/40" aria-hidden />
            <span className="w-6 text-right text-sm font-semibold text-sable">{index + 1}</span>
            <span className={`flex-1 font-medium ${element.actif ? "" : "text-ivoire/50"}`}>
              {element.nom}
              {!element.actif && <span className="ml-2 text-xs font-normal">(inactif, non proposé)</span>}
            </span>
            <button
              type="button"
              onClick={() => deplacer(index, index - 1)}
              disabled={index === 0 || enCours}
              aria-label={`Monter ${element.nom}`}
              className="rounded-lg p-1.5 text-ivoire/70 transition hover:bg-white/10 hover:text-ivoire disabled:opacity-25"
            >
              <ArrowUp className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => deplacer(index, index + 1)}
              disabled={index === liste.length - 1 || enCours}
              aria-label={`Descendre ${element.nom}`}
              className="rounded-lg p-1.5 text-ivoire/70 transition hover:bg-white/10 hover:text-ivoire disabled:opacity-25"
            >
              <ArrowDown className="size-4" />
            </button>
          </li>
        ))}
      </ol>
      <p role="status" aria-live="polite" className="mt-3 flex min-h-5 items-center gap-2 text-sm">
        {enCours ? (
          <>
            <LoaderCircle className="size-4 animate-spin text-sable" /> Enregistrement…
          </>
        ) : etat ? (
          <span className={`flex items-center gap-1.5 ${etat.ok ? "text-sable" : "text-[#F2A7A0]"}`}>
            {etat.ok && <Check className="size-4" />}
            {etat.message}
          </span>
        ) : null}
      </p>
    </div>
  );
}
