import Link from "next/link";

// Bouton principal arrondi, réutilisé sur toute la landing.
// fond "sombre" : bouton blanc (sections vertes) ; "clair" : bouton vert forêt (hero blanc).
export function CtaLink({
  href,
  fond = "sombre",
  children,
}: {
  href: string;
  fond?: "clair" | "sombre";
  children: React.ReactNode;
}) {
  const couleurs =
    fond === "clair"
      ? "bg-foret text-ivoire shadow-[0_10px_30px_rgba(18,59,42,0.25)] hover:bg-terre hover:shadow-[0_15px_40px_rgba(18,59,42,0.3)]"
      : "bg-white text-charbon shadow-[0_10px_40px_rgba(0,0,0,0.25)] hover:bg-sable hover:shadow-[0_15px_45px_rgba(0,0,0,0.4)]";

  return (
    <Link
      href={href}
      className={`inline-flex w-full max-w-80 items-center justify-center rounded-full px-6 py-4 text-[0.8rem] font-bold tracking-[1.5px] whitespace-nowrap uppercase transition duration-300 hover:-translate-y-1 sm:w-auto sm:max-w-none sm:px-9 sm:text-sm sm:tracking-[2px] ${couleurs}`}
    >
      {children}
      <span className="ml-3 text-xl" aria-hidden>
        →
      </span>
    </Link>
  );
}
