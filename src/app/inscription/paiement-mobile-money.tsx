"use client";

// Choix de l'opérateur Mobile Money (logos), du pays et du numéro à débiter.
import Image from "next/image";
import { Check } from "lucide-react";
import { OPERATEURS, PAYS, type Operateur, type Pays } from "@/lib/paiement/operateurs";

const labelClasses =
  "mb-2 block text-xs font-semibold tracking-[1px] text-charbon/70 uppercase";

export function PaiementMobileMoney({
  pays,
  operateur,
  telephone,
  onPays,
  onOperateur,
  onTelephone,
}: {
  pays: Pays;
  operateur: Operateur;
  telephone: string;
  onPays: (pays: Pays) => void;
  onOperateur: (operateur: Operateur) => void;
  onTelephone: (telephone: string) => void;
}) {
  const disponibles = PAYS[pays].operateurs;

  function changerPays(nouveau: Pays) {
    onPays(nouveau);
    // L'opérateur choisi n'existe pas forcément dans le nouveau pays.
    if (!PAYS[nouveau].operateurs.includes(operateur)) {
      onOperateur(PAYS[nouveau].operateurs[0]);
    }
  }

  return (
    <div className="mt-6 grid gap-5">
      <fieldset>
        <legend className={labelClasses}>Opérateur</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {disponibles.map((code) => {
            const choisi = code === operateur;
            return (
              <label
                key={code}
                className={`relative flex cursor-pointer flex-col items-center gap-2 rounded-2xl border p-4 text-center transition ${
                  choisi
                    ? "border-terre bg-sable/25"
                    : "border-charbon/15 hover:border-charbon/40"
                }`}
              >
                <input
                  type="radio"
                  name="operateur"
                  value={code}
                  className="sr-only"
                  checked={choisi}
                  onChange={() => onOperateur(code)}
                />
                <Image
                  src={OPERATEURS[code].logo}
                  alt=""
                  width={300}
                  height={300}
                  className="size-14 rounded-xl object-contain"
                />
                <span className="text-xs font-semibold">{OPERATEURS[code].nom}</span>
                {choisi && (
                  <Check className="absolute top-2 right-2 size-4 text-terre" />
                )}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="pays" className={labelClasses}>
            Pays
          </label>
          <select
            id="pays"
            className="w-full rounded-xl border border-charbon/15 bg-white px-4 py-3 text-sm text-charbon focus:border-terre focus:ring-2 focus:ring-terre/20 focus:outline-none"
            value={pays}
            onChange={(e) => changerPays(e.target.value as Pays)}
          >
            {(Object.keys(PAYS) as Pays[]).map((code) => (
              <option key={code} value={code}>
                {PAYS[code].nom} (+{PAYS[code].indicatif})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="telephonePaiement" className={labelClasses}>
            Numéro à débiter
          </label>
          <div className="flex items-stretch overflow-hidden rounded-xl border border-charbon/15 bg-white focus-within:border-terre focus-within:ring-2 focus-within:ring-terre/20">
            <span className="flex items-center border-r border-charbon/10 bg-ivoire px-3 text-sm font-semibold text-charbon/70">
              +{PAYS[pays].indicatif}
            </span>
            <input
              id="telephonePaiement"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="07 00 00 00 00"
              className="w-full bg-transparent px-4 py-3 text-sm text-charbon placeholder:text-charbon/40 focus:outline-none"
              value={telephone}
              onChange={(e) => onTelephone(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
