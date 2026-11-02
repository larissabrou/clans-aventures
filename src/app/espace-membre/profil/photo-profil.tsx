"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Camera, LoaderCircle, Trash2 } from "lucide-react";
import { ChampFichier } from "@/components/champ-fichier";
import { changerPhoto, retirerPhoto, type ResultatPhoto } from "../actions";

const bouton =
  "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-xs font-bold tracking-[1.5px] uppercase transition disabled:cursor-not-allowed disabled:opacity-60";

/** Photo de profil : aperçu immédiat de l'image choisie, puis envoi au serveur. */
export function PhotoProfil({ photo, initiales }: { photo: string | null; initiales: string }) {
  const [resultat, envoyer, envoiEnCours] = useActionState(changerPhoto, null);
  const [retrait, setRetrait] = useState<ResultatPhoto>(null);
  const [retraitEnCours, demarrer] = useTransition();
  const [apercu, setApercu] = useState<string | null>(null);
  // Change après chaque envoi : le champ fichier repart de zéro (nom affiché compris).
  const [envoi, setEnvoi] = useState(0);

  // L'aperçu local est libéré quand il est remplacé ou quand le composant disparaît.
  useEffect(() => () => {
    if (apercu) URL.revokeObjectURL(apercu);
  }, [apercu]);

  const message = retrait ?? resultat;
  const affichee = apercu ?? photo;

  return (
    <section className="mt-6 rounded-2xl border border-white p-6 text-white sm:p-8">
      <h2 className="mb-5 font-titre text-2xl font-semibold">Ma photo</h2>
      <div className="flex flex-wrap items-center gap-6">
        {affichee ? (
          // eslint-disable-next-line @next/next/no-img-element -- photo privée servie par une route du site
          <img src={affichee} alt="Ta photo de profil" className="size-28 rounded-full object-cover ring-2 ring-sable" />
        ) : (
          <span className="flex size-28 items-center justify-center rounded-full bg-terre font-titre text-4xl font-semibold text-white">
            {initiales}
          </span>
        )}

        <form
          action={(formulaire) => {
            setRetrait(null);
            envoyer(formulaire);
            setApercu(null);
            setEnvoi((n) => n + 1);
          }}
          className="grid min-w-60 flex-1 gap-3"
        >
          <label className="text-sm text-white/70" htmlFor="photo">
            JPEG, PNG ou WebP, 4 Mo maximum. Elle apparaît en haut de ton espace membre.
          </label>
          <ChampFichier
            key={envoi}
            id="photo"
            name="photo"
            accept="image/jpeg,image/png,image/webp"
            libelle="Choisir une photo"
            onFichier={(fichier) => setApercu(fichier ? URL.createObjectURL(fichier) : null)}
          />
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={!apercu || envoiEnCours} className={`${bouton} bg-terre text-white hover:bg-sable hover:text-charbon`}>
              {envoiEnCours ? <LoaderCircle className="size-4 animate-spin" /> : <Camera className="size-4" />}
              Enregistrer la photo
            </button>
            {photo && !apercu && (
              <button
                type="button"
                disabled={retraitEnCours}
                onClick={() => demarrer(async () => setRetrait(await retirerPhoto()))}
                className={`${bouton} border border-white/40 text-white hover:border-sable hover:text-sable`}
              >
                {retraitEnCours ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                Retirer
              </button>
            )}
          </div>
          {message && (
            <p role="status" className={`text-sm font-medium ${message.ok ? "text-sable" : "text-[#F2A7A0]"}`}>
              {message.message}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
