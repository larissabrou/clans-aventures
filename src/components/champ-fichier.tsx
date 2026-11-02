"use client";

import { useState, type Ref } from "react";
import { ImageUp } from "lucide-react";

/**
 * Champ fichier en français : le bouton natif (« Browse… / No file selected ») suit la langue du
 * navigateur et ne se traduit pas. Le vrai champ reste dans le formulaire, masqué, et reçoit le fichier.
 */
export function ChampFichier({
  id,
  name,
  accept,
  libelle = "Choisir une image",
  inputRef,
  onFichier,
  className = "",
}: {
  id: string;
  name: string;
  accept?: string;
  libelle?: string;
  inputRef?: Ref<HTMLInputElement>;
  onFichier?: (fichier: File | null) => void;
  className?: string;
}) {
  const [nom, setNom] = useState<string | null>(null);

  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-xl border border-white/30 bg-white/5 px-3 py-2 ${className}`}>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="file"
        accept={accept}
        className="peer sr-only"
        onChange={(e) => {
          const fichier = e.target.files?.[0] ?? null;
          setNom(fichier?.name ?? null);
          onFichier?.(fichier);
        }}
      />
      <label
        htmlFor={id}
        className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-terre px-4 py-1.5 text-xs font-semibold text-white transition peer-focus-visible:ring-2 peer-focus-visible:ring-sable hover:bg-sable hover:text-charbon"
      >
        <ImageUp className="size-4" />
        {libelle}
      </label>
      <span className="min-w-0 truncate text-sm text-white/70">{nom ?? "Aucun fichier choisi"}</span>
    </div>
  );
}
