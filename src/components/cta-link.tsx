import Link from "next/link";

// Bouton principal arrondi, réutilisé sur toute la landing.
export function CtaLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex w-full max-w-80 items-center justify-center rounded-full bg-white px-6 py-4 text-[0.8rem] font-bold tracking-[1.5px] whitespace-nowrap sm:px-9 sm:text-sm sm:tracking-[2px] text-charbon uppercase shadow-[0_10px_40px_rgba(0,0,0,0.25)] transition duration-300 hover:-translate-y-1 hover:bg-sable hover:shadow-[0_15px_45px_rgba(0,0,0,0.4)] sm:w-auto sm:max-w-none"
    >
      {children}
      <span className="ml-3 text-xl" aria-hidden>
        →
      </span>
    </Link>
  );
}
