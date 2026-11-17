"use client";

import { startTransition, useActionState, useState } from "react";
import { CircleCheck, FileSpreadsheet, LoaderCircle, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { actionImportMembres, type CibleImport, type EtatImport } from "./actions";

const bouton =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold tracking-[1.5px] uppercase transition disabled:opacity-50";

/**
 * Choix du fichier, aperçu, puis import. Le fichier est gardé en mémoire entre l'aperçu et
 * la confirmation (le formulaire n'est pas réinitialisé) : l'import relit exactement le même.
 */
export function FormulaireImport() {
  const [fichier, setFichier] = useState<File | null>(null);
  const [cible, setCible] = useState<CibleImport>("liste");
  const [etat, executer, enCours] = useActionState(actionImportMembres, { etape: "choix" } as EtatImport);

  function envoyer(mode: "analyser" | "importer") {
    if (!fichier) return;
    const donnees = new FormData();
    donnees.set("fichier", fichier);
    donnees.set("mode", mode);
    donnees.set("cible", cible);
    startTransition(() => executer(donnees));
  }

  function reinitialiser() {
    const donnees = new FormData();
    donnees.set("mode", "reinitialiser");
    startTransition(() => executer(donnees));
  }

  const libelleImport = (n: number) =>
    cible === "liste"
      ? `Ajouter ${n} ancien${n > 1 ? "s" : ""} membre${n > 1 ? "s" : ""} à la liste`
      : `Importer les ${n} membre${n > 1 ? "s" : ""}`;

  return (
    <div className="grid gap-5">
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 text-sm text-ivoire/75">Que faire de ce fichier ?</legend>
        {(
          [
            ["liste", "Ajouter à la liste des anciens membres", "Aucun compte créé, aucun e-mail : chacun s’inscrit lui-même sans payer."],
            ["comptes", "Créer les comptes tout de suite", "Chaque personne devient membre et reçoit ses e-mails d’accès."],
          ] as const
        ).map(([valeur, titre, detail]) => (
          <label
            key={valeur}
            className={`cursor-pointer rounded-2xl border p-4 text-sm transition ${
              cible === valeur ? "border-sable bg-white/10" : "border-white/25 hover:border-white/50"
            }`}
          >
            <input
              type="radio"
              name="cible"
              value={valeur}
              checked={cible === valeur}
              onChange={() => {
                setCible(valeur);
                reinitialiser(); // l'aperçu dépend du choix
              }}
              className="sr-only"
            />
            <span className="block font-semibold text-ivoire">{titre}</span>
            <span className="mt-1 block text-ivoire/65">{detail}</span>
          </label>
        ))}
      </fieldset>

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
              const question =
                etat.cible === "liste"
                  ? `Ajouter ${etat.aImporter} ligne(s) à la liste des anciens membres ? Aucun e-mail n’est envoyé.`
                  : `Importer ${etat.aImporter} membre(s) ? Chacun recevra ses e-mails d’accès et de bienvenue.`;
              if (window.confirm(question)) envoyer("importer");
            }}
            className={`${bouton} bg-terre text-white hover:bg-sable hover:text-charbon`}
          >
            {libelleImport(etat.aImporter)}
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
            {etat.aImporter} {etat.cible === "liste" ? "ancien" : ""}
            {etat.cible === "liste" && etat.aImporter > 1 ? "s" : ""} membre{etat.aImporter > 1 ? "s" : ""} prêt
            {etat.aImporter > 1 ? "s" : ""} {etat.cible === "liste" ? "à ajouter à la liste" : `à être importé${etat.aImporter > 1 ? "s" : ""}`}
            {etat.refusees.length > 0 &&
              ` · ${etat.refusees.length} ligne${etat.refusees.length > 1 ? "s" : ""} à corriger (non retenue${etat.refusees.length > 1 ? "s" : ""})`}
          </p>
          {etat.aImporter > 0 && etat.prochainNumero && (
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
          {etat.cible === "liste" ? (
            <span>
              {etat.importes} ancien{etat.importes > 1 ? "s" : ""} membre{etat.importes > 1 ? "s" : ""} ajouté
              {etat.importes > 1 ? "s" : ""} à la liste.{" "}
              <Link href="/admin/membres/anciens" className="underline underline-offset-4">
                Voir la liste
              </Link>
            </span>
          ) : (
            <span>
              {etat.importes} membre{etat.importes > 1 ? "s" : ""} importé{etat.importes > 1 ? "s" : ""}. Les e-mails
              d’accès partent en arrière-plan.
            </span>
          )}
        </p>
      )}
    </div>
  );
}
