"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  LogOut,
  Shield,
  Menu,
  MessageCircle,
  Tent,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { deconnexion } from "../connexion/actions";
import { useMessages } from "./messages-context";

type Lien = {
  label: string;
  Icone: LucideIcon;
  // Section du tableau de bord ou page de l'espace ; absent = rubrique pas encore disponible.
  href?: string;
  badgeMessages?: boolean;
};

const MON_ESPACE: Lien[] = [
  { label: "Tableau CLANS", Icone: LayoutDashboard, href: "/espace-membre#tableau-de-bord" },
  { label: "Messages", Icone: MessageCircle, href: "/espace-membre#messages", badgeMessages: true },
  { label: "Bon plan", Icone: Tent, href: "/espace-membre/bon-plan" },
  { label: "Parrainage", Icone: Users, href: "/espace-membre/parrainage" },
];

export function MemberShell({
  nomComplet,
  initiales,
  page = "tableau",
  admin = false,
  children,
}: {
  nomComplet: string;
  initiales: string;
  // Page affichée : "profil" met la pastille en avant, aucune rubrique du menu n'est active.
  page?: "tableau" | "profil" | "parrainage" | "bon-plan";
  // Affiche le lien vers l'administration (emails listés dans ADMIN_EMAILS).
  admin?: boolean;
  children: React.ReactNode;
}) {
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [actif, setActif] = useState<string>(
    page === "tableau" ? (MON_ESPACE[0].href ?? "") : page === "profil" ? "" : `/espace-membre/${page}`,
  );
  const { nonLus } = useMessages();

  // La rubrique active suit le défilement : celle dont la section occupe le haut de l'écran.
  useEffect(() => {
    if (page !== "tableau") return;
    const sections = MON_ESPACE.flatMap(({ href }) => {
      const id = href?.split("#")[1];
      const section = id ? document.getElementById(id) : null;
      return section ? [section] : [];
    });
    if (sections.length === 0) return;

    const observateur = new IntersectionObserver(
      (entrees) => {
        const visible = entrees.find((e) => e.isIntersecting);
        if (visible) setActif(`/espace-membre#${visible.target.id}`);
      },
      // Zone d'observation : bande sous l'en-tête collant, en haut de l'écran.
      { rootMargin: "-80px 0px -60% 0px" },
    );
    sections.forEach((s) => observateur.observe(s));
    return () => observateur.disconnect();
  }, [page]);

  function lien({ label, Icone, href, badgeMessages }: Lien) {
    const estActif = href !== undefined && href === actif;
    const contenu = (
      <>
        <Icone className="size-[18px] shrink-0" strokeWidth={1.75} />
        <span className="flex-1">{label}</span>
        {badgeMessages && nonLus > 0 && (
          <span className="flex size-5 items-center justify-center rounded-full bg-terre text-[0.65rem] font-bold text-white">
            {nonLus}
          </span>
        )}
        {!href && (
          <span className="text-[0.6rem] tracking-[1px] text-sable/50 uppercase">
            Bientôt
          </span>
        )}
      </>
    );

    const classes =
      "flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition";

    return (
      <li key={label}>
        {href ? (
          <a
            href={href}
            aria-current={estActif ? (href.includes("#") ? "location" : "page") : undefined}
            onClick={() => {
              setActif(href);
              setMenuOuvert(false);
            }}
            className={`${classes} border-l-[3px] ${
              estActif
                ? "border-sable bg-terre/35 font-semibold text-ivoire"
                : "border-transparent text-sable hover:bg-terre/20 hover:text-ivoire"
            }`}
          >
            {contenu}
          </a>
        ) : (
          <span className={`${classes} cursor-default border-l-[3px] border-transparent text-sable/55`}>
            {contenu}
          </span>
        )}
      </li>
    );
  }

  return (
    <div className="min-h-svh bg-charbon text-ivoire">
      {/* EN-TÊTE */}
      <header className="sticky top-0 z-30 flex h-18 items-center justify-between border-b border-terre/40 bg-charbon px-4 text-ivoire sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <Logo className="h-10 w-auto" />
          <span className="font-titre text-2xl font-semibold">
            clans <span className="italic">aventures</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {/* Nom + pastille : ouvre la page « Mon profil » (infos et mot de passe). */}
          <Link
            href="/espace-membre/profil"
            onClick={() => setMenuOuvert(false)}
            aria-label="Mon profil"
            aria-current={page === "profil" ? "page" : undefined}
            title="Mon profil"
            className="group flex items-center gap-3 rounded-full transition"
          >
            <span className="hidden text-sm group-hover:text-sable sm:inline">{nomComplet}</span>
            <span
              className={`flex size-10 items-center justify-center rounded-full bg-terre text-sm font-bold text-white ring-2 transition group-hover:ring-sable ${
                page === "profil" ? "ring-sable" : "ring-transparent"
              }`}
            >
              {initiales}
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setMenuOuvert(!menuOuvert)}
            className="rounded-lg p-2 hover:bg-white/10 lg:hidden"
            aria-label={menuOuvert ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={menuOuvert}
          >
            {menuOuvert ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Voile derrière le menu mobile */}
        {menuOuvert && (
          <div
            className="fixed inset-0 top-18 z-10 bg-charbon/50 lg:hidden"
            onClick={() => setMenuOuvert(false)}
          />
        )}

        {/* MENU LATÉRAL */}
        <aside
          className={`fixed top-18 bottom-0 left-0 z-20 w-64 shrink-0 overflow-y-auto border-r border-terre/30 bg-charbon px-3 py-6 text-ivoire transition-transform lg:sticky lg:h-[calc(100svh-4.5rem)] lg:translate-x-0 ${
            menuOuvert ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <nav aria-label="Espace membre">
            <p className="mx-4 mb-3 text-[0.65rem] tracking-[2px] text-terre uppercase">
              Mon espace
            </p>
            <ul className="grid gap-1">{MON_ESPACE.map(lien)}</ul>
          </nav>

          {admin && (
            <Link
              href="/admin"
              className="mt-8 flex items-center gap-3 rounded-xl border-t border-terre/30 px-4 pt-5 pb-1 text-sm text-sable transition hover:text-ivoire"
            >
              <Shield className="size-[18px] shrink-0" strokeWidth={1.75} />
              Administration
            </Link>
          )}

          <form action={deconnexion} className={`${admin ? "mt-4" : "mt-8"} border-t border-terre/30 pt-4`}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-sable/80 transition hover:bg-terre/25 hover:text-ivoire"
            >
              <LogOut className="size-[18px] shrink-0" strokeWidth={1.75} />
              Se déconnecter
            </button>
          </form>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:px-12 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
