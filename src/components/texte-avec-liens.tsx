// Texte de message dont les adresses (https://…, www.…) deviennent des liens cliquables.
// Le texte reste du texte : aucun HTML n'est interprété, seules les adresses sont transformées.

const ADRESSE = /((?:https?:\/\/|www\.)[^\s<>"«»]+)/gi;
// Ponctuation collée à la fin d'une adresse dans une phrase (« … : https://x.com. ») : hors du lien.
const PONCTUATION_FINALE = /[.,;:!?)\]]+$/;

export function TexteAvecLiens({
  texte,
  classeLien = "font-semibold text-sable underline decoration-sable/50 underline-offset-4 hover:decoration-sable",
}: {
  texte: string;
  classeLien?: string;
}) {
  return (
    <>
      {texte.split(ADRESSE).map((morceau, index) => {
        // split avec un groupe capturant : les indices impairs sont les adresses trouvées.
        if (index % 2 === 0) return morceau;
        const fin = PONCTUATION_FINALE.exec(morceau)?.[0] ?? "";
        const adresse = fin ? morceau.slice(0, -fin.length) : morceau;
        const lien = adresse.toLowerCase().startsWith("www.") ? `https://${adresse}` : adresse;
        return (
          <span key={index}>
            <a href={lien} target="_blank" rel="noopener noreferrer" className={`break-all ${classeLien}`}>
              {adresse}
            </a>
            {fin}
          </span>
        );
      })}
    </>
  );
}
