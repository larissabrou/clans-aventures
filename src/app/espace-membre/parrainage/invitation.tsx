"use client";

import { useEffect, useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";

const bouton =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-xs font-bold tracking-[1.5px] uppercase transition";

/** Code de parrainage à copier ou à partager sur WhatsApp. */
export function Invitation({ code, lienInscription }: { code: string; lienInscription: string }) {
  const [copie, setCopie] = useState(false);

  useEffect(() => {
    if (!copie) return;
    const minuteur = setTimeout(() => setCopie(false), 2400);
    return () => clearTimeout(minuteur);
  }, [copie]);

  async function copier() {
    try {
      await navigator.clipboard.writeText(code);
      setCopie(true);
    } catch {
      // Presse-papiers indisponible (navigateur ancien, page non sécurisée) : le code reste sélectionnable.
      window.getSelection()?.selectAllChildren(document.getElementById("code-parrainage")!);
    }
  }

  const message =
    "Salut ! Je t’invite à découvrir CLANS aventures, une communauté de nature, de culture, " +
    `de rencontres et d’expériences. Inscris-toi sur ${lienInscription} avec mon code de parrainage ` +
    `${code}. Au plaisir de vivre une aventure ensemble !`;

  return (
    <div className="relative mt-6 flex flex-wrap items-center gap-3">
      <span
        id="code-parrainage"
        className="rounded-xl border border-dashed border-ivoire/50 bg-white/10 px-4 py-3 font-semibold tracking-[3px] select-all"
      >
        {code}
      </span>
      <button
        type="button"
        onClick={copier}
        className={`${bouton} bg-sable text-charbon hover:bg-ivoire`}
      >
        {copie ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copie ? "Code copié" : "Copier le code"}
      </button>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(message)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`${bouton} bg-white text-charbon hover:bg-ivoire`}
      >
        <MessageCircle className="size-4" />
        Inviter sur WhatsApp
      </a>
      <span role="status" aria-live="polite" className="sr-only">
        {copie ? "Code copié" : ""}
      </span>
    </div>
  );
}
