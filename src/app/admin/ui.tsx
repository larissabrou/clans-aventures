// Éléments visuels communs aux pages de l'admin (même style que l'espace membre).

export const champClasses =
  "w-full rounded-xl border border-white/25 bg-white/5 px-4 py-2.5 text-sm text-ivoire placeholder:text-ivoire/40 focus:border-sable focus:ring-2 focus:ring-sable/20 focus:outline-none [&>option]:bg-charbon";

export const etiquetteClasses = "mb-1.5 block text-[0.65rem] font-semibold tracking-[1.5px] text-sable/90 uppercase";

export function EnTete({ titre, texte }: { titre: string; texte?: string }) {
  return (
    <div className="mb-8">
      <p className="text-[0.65rem] font-semibold tracking-[3px] text-sable uppercase">Administration</p>
      <h1 className="mt-1 font-titre text-4xl font-semibold sm:text-5xl">{titre}</h1>
      {texte && <p className="mt-2 max-w-2xl text-ivoire/70">{texte}</p>}
    </div>
  );
}

export function Carte({ titre, children, className = "" }: { titre?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-white/80 p-5 sm:p-6 ${className}`}>
      {titre && <h2 className="mb-4 font-titre text-2xl font-semibold">{titre}</h2>}
      {children}
    </section>
  );
}

export function Champ({
  label,
  id,
  children,
  className = "",
}: {
  label: string;
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className={etiquetteClasses}>
        {label}
      </label>
      {children}
    </div>
  );
}

export function CaseACocher({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-ivoire/85">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-4 accent-terre" />
      {label}
    </label>
  );
}

export function Vide({ texte }: { texte: string }) {
  return <p className="rounded-2xl border border-white/30 p-5 text-sm text-ivoire/60">{texte}</p>;
}

export function Pastille({ actif, oui = "Actif", non = "Inactif" }: { actif: boolean; oui?: string; non?: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold ${
        actif ? "bg-sable/20 text-sable" : "bg-white/10 text-ivoire/60"
      }`}
    >
      {actif ? oui : non}
    </span>
  );
}
