"use client";

import { startTransition, useActionState, useState } from "react";
import { CircleCheck, FileSpreadsheet, LoaderCircle, TriangleAlert } from "lucide-react";
import { actionImportMembres, type EtatImport } from "./actions";

const bouton =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold tracking-[1.5px] uppercase transition disabled:opacity-50";

/**
 * Choix du fichier, aperçu, puis import. Le fichier est gardé en mémoire entre l'aperçu et
 * la confirmation (le formulaire n'est pas réinitialisé) : l'import relit exactement le même.
 */
export function FormulaireImport() {
  const [fichier, setFichier] = useState<File | null>(null);
  const [etat, executer, enCours] = useActionState(actionImportMembres, { etape: "choix" } as EtatImport);

  function envoyer(mode: "analyser" | "importer") {
    if (!fichier) return;
    const donnees = new FormData();
    donnees.set("fichier", fichier);
    donnees.set("mode", mode);
    startTransition(() => executer(donnees));
  }

  return (
    <div className="grid gap-5">
      <label className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border border-dashed border-white/30 p-8 text-center hover:border-sable">
        <FileSpreadsheet className="size-8 text-sable" strokeWidth={1.5} />
        <span className="text-sm text-ivoire/80">
          {fichier ? <strong className="text-ivoire">{fichier.name}</strong> : "Choisis le fichier Excel (.xlsx) rempli"}
        </span>
        <input
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          onChange={(e) => {
            setFichier(e.target.files?.[0] ?? null);
            // Nouveau fichier : l'ancien aperçu ne vaut plus.
            const donnees = new FormData();
            donnees.set("mode", "reinitialiser");
            startTransition(() => executer(donnees));
          }}
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!fichier || enCours}
          onClick={() => envoyer("analyser")}
          className={`${bouton} border border-white/30 text-ivoire hover:border-sable hover:text-sable`}
        >
          {enCours && <LoaderCircle className="size-4 animate-spin" />}
          Vérifier le fichier
        </button>
        {etat.etape === "apercu" && etat.aImporter > 0 && (
          <button
            type="button"
            disabled={enCours}
            onClick={() => {
              if (window.confirm(`Importer ${etat.aImporter} membre(s) ? Chacun recevra ses e-mails d’accès et de bienvenue.`)) {
                envoyer("importer");
              }
            }}
            className={`${bouton} bg-terre text-white hover:bg-sable hover:text-charbon`}
          >
            Importer les {etat.aImporter} membre{etat.aImporter > 1 ? "s" : ""}
          </button>
        )}
      </div>

      {etat.etape === "erreur" && fichier && (
        <p role="alert" className="flex items-start gap-2 text-sm text-[#F2A7A0]">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" /> {etat.message}
        </p>
      )}

      {etat.etape === "apercu" && (
        <div className="grid gap-3 text-sm" role="status">
          <p className="font-semibold text-ivoire">
            {etat.aImporter} membre{etat.aImporter > 1 ? "s" : ""} prêt{etat.aImporter > 1 ? "s" : ""} à être importé
            {etat.aImporter > 1 ? "s" : ""}
            {etat.refusees.length > 0 &&
              ` · ${etat.refusees.length} ligne${etat.refusees.length > 1 ? "s" : ""} à corriger (non importée${etat.refusees.length > 1 ? "s" : ""})`}
          </p>
          {etat.aImporter > 0 && (
            <p className="text-ivoire/70">
              Après l’import, la prochaine inscription en ligne recevra le numéro{" "}
              <strong className="text-ivoire">{etat.prochainNumero}</strong>.
            </p>
          )}
          {etat.refusees.length > 0 && (
            <ul className="max-h-72 overflow-y-auto rounded-xl border border-white/15 bg-white/5 p-4 text-ivoire/80">
              {etat.refusees.map((r) => (
                <li key={r.ligne}>
                  Ligne {r.ligne} : {r.raison}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {etat.etape === "termine" && (
        <p role="status" className="flex items-start gap-2 text-sm font-medium text-sable">
          <CircleCheck className="mt-0.5 size-4 shrink-0" />
          {etat.importes} membre{etat.importes > 1 ? "s" : ""} importé{etat.importes > 1 ? "s" : ""}. Les e-mails d’accès
          partent en arrière-plan.
        </p>
      )}
    </div>
  );
}
