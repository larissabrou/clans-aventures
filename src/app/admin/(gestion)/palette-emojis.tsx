"use client";

import { useState } from "react";
import { Smile } from "lucide-react";

// Émojis proposés pour les messages (aventure, nature, culture, fête…). Ils s'enregistrent tels quels.
const EMOJIS = [
  "😊", "😄", "🤩", "😉", "🥳", "🙌", "👏", "🤝", "💪", "🙏", "❤️", "🧡", "💛", "💚",
  "🔥", "✨", "⭐", "🌟", "🎉", "🎊", "🏆", "🎁", "📣", "📢", "📌", "📅", "⏰", "✅",
  "👉", "👇", "🌍", "🌿", "🌳", "🌴", "🌊", "🏖️", "🏕️", "⛺", "🎒", "🧭", "🗺️", "🚌",
  "🌅", "🌙", "🔥", "🍖", "🥘", "🍹", "🥁", "🎶", "💃", "🕺", "📸", "🦁", "🐘", "🇨🇮",
];

/**
 * Palette d'émojis : un clic insère l'émoji à la position du curseur dans le champ `cible` (id).
 * Fonctionne avec les champs non contrôlés des formulaires de l'admin.
 */
export function PaletteEmojis({ cible }: { cible: string }) {
  const [ouverte, setOuverte] = useState(false);

  function inserer(emoji: string) {
    const champ = document.getElementById(cible);
    if (!(champ instanceof HTMLTextAreaElement || champ instanceof HTMLInputElement)) return;
    const debut = champ.selectionStart ?? champ.value.length;
    const fin = champ.selectionEnd ?? debut;
    champ.setRangeText(emoji, debut, fin, "end");
    champ.focus();
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOuverte(!ouverte)}
        aria-expanded={ouverte}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-sable hover:text-ivoire"
      >
        <Smile className="size-4" />
        {ouverte ? "Masquer les émojis" : "Ajouter un émoji"}
      </button>
      {ouverte && (
        <div className="mt-2 flex flex-wrap gap-1 rounded-xl border border-white/20 p-2" role="group" aria-label="Émojis">
          {[...new Set(EMOJIS)].map((emoji) => (
            <button
              key={emoji}
              type="button"
              // onMouseDown empêche le bouton de prendre le focus : la position du curseur est conservée.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => inserer(emoji)}
              className="flex size-9 items-center justify-center rounded-lg text-xl transition hover:bg-white/10"
              aria-label={`Insérer ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
