"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import type { EtatAction } from "./actions";

type Action = (etat: EtatAction, formulaire: FormData) => Promise<EtatAction>;

/**
 * Formulaire de l'admin relié à une Server Function : affiche le résultat sous les champs.
 * `confirmation` : question posée avant l'envoi (suppressions). `discret` : n'affiche que les erreurs.
 */
export function FormulaireAdmin({
  action,
  children,
  className,
  confirmation,
  discret = false,
}: {
  action: Action;
  children: React.ReactNode;
  className?: string;
  confirmation?: string;
  discret?: boolean;
}) {
  const [etat, envoyer] = useActionState(action, null);

  return (
    <form
      action={envoyer}
      className={className}
      onSubmit={(e) => {
        if (confirmation && !window.confirm(confirmation)) e.preventDefault();
      }}
    >
      {children}
      {etat && (!discret || !etat.ok) && (
        <p
          role="status"
          className={`basis-full text-sm font-medium ${etat.ok ? "text-sable" : "text-[#F2A7A0]"}`}
        >
          {etat.message}
        </p>
      )}
    </form>
  );
}

const styles = {
  principal: "bg-terre text-white hover:bg-sable hover:text-charbon",
  secondaire: "border border-white/30 text-ivoire hover:border-sable hover:text-sable",
  danger: "border border-[#F2A7A0]/50 text-[#F2A7A0] hover:bg-[#F2A7A0]/10",
};

/** Bouton d'envoi qui patiente pendant l'exécution de la Server Function. */
export function BoutonEnvoi({
  children,
  style = "principal",
  className = "",
}: {
  children: React.ReactNode;
  style?: keyof typeof styles;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold tracking-[1px] uppercase transition disabled:cursor-wait disabled:opacity-60 ${styles[style]} ${className}`}
    >
      {pending && <LoaderCircle className="size-3.5 animate-spin" />}
      {children}
    </button>
  );
}
