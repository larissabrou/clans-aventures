"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  CalendarDays,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Settings,
  Shield,
  Star,
  Tags,
  UserCog,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { deconnexionAdmin } from "../connexion/actions";

type Role = "super_admin" | "admin";

// superAdmin : rubrique réservée au super admin (les pages le vérifient aussi côté serveur).
const RUBRIQUES: { label: string; Icone: LucideIcon; href: string; superAdmin?: boolean }[] = [
  { label: "Tableau de bord", Icone: LayoutDashboard, href: "/admin" },
  { label: "Membres", Icone: Users, href: "/admin/membres" },
  { label: "Événements", Icone: CalendarDays, href: "/admin/evenements" },
  { label: "Messages", Icone: MessageCircle, href: "/admin/messages" },
  { label: "Types de messages", Icone: Tags, href: "/admin/types-messages" },
  { label: "Types d’actions", Icone: Star, href: "/admin/types-actions" },
  { label: "Clans", Icone: Shield, href: "/admin/clans" },
  { label: "Administrateurs", Icone: UserCog, href: "/admin/administrateurs", superAdmin: true },
  { label: "Réglages", Icone: Settings, href: "/admin/reglages", superAdmin: true },
];

export function AdminShell({
  nomComplet,
  role,
  children,
}: {
  nomComplet: string;
  role: Role;
  children: React.ReactNode;
}) {
  const [menuOuvert, setMenuOuvert] = useState(false);
  const chemin = usePathname();

  // Rubrique active : correspondance exacte pour le tableau de bord, par préfixe pour les autres.
  const estActif = (href: string) => (href === "/admin" ? chemin === href : chemin.startsWith(href));

  return (
    <div className="min-h-svh bg-charbon text-ivoire">
      {/* Même en-tête que l'espace membre : barre blanche, logo complet en couleur. */}
      <header className="sticky top-0 z-30 flex h-18 items-center justify-between border-b border-charbon/10 bg-white px-4 text-charbon shadow-sm sm:px-6">
        <Link href="/admin" className="flex items-center gap-3" aria-label="Administration CLANS">
          <Logo variant="complet" className="h-12 w-auto sm:h-14" preload />
          <span className="rounded-full bg-terre px-2.5 py-0.5 text-[0.65rem] font-semibold tracking-[2px] text-white uppercase">
            Admin
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-right text-sm leading-tight font-medium sm:block">
            {nomComplet}
            <span className="block text-xs font-normal text-charbon/55">
              {role === "super_admin" ? "Super admin" : "Admin"}
            </span>
          </span>
          <button
            type="button"
            onClick={() => setMenuOuvert(!menuOuvert)}
            className="rounded-lg p-2 hover:bg-charbon/5 lg:hidden"
            aria-label={menuOuvert ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={menuOuvert}
          >
            {menuOuvert ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </header>

      <div className="flex">
        {menuOuvert && (
          <div className="fixed inset-0 top-18 z-10 bg-charbon/50 lg:hidden" onClick={() => setMenuOuvert(false)} />
        )}

        <aside
          className={`fixed top-18 bottom-0 left-0 z-20 w-64 shrink-0 overflow-y-auto border-r border-terre/30 bg-charbon px-3 py-6 transition-transform lg:sticky lg:h-[calc(100svh-4.5rem)] lg:translate-x-0 ${
            menuOuvert ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <nav aria-label="Administration">
            <p className="mx-4 mb-3 text-[0.65rem] tracking-[2px] text-terre uppercase">Administration</p>
            <ul className="grid gap-1">
              {RUBRIQUES.filter((r) => !r.superAdmin || role === "super_admin").map(({ label, Icone, href }) => {
                const actif = estActif(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setMenuOuvert(false)}
                      aria-current={actif ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-xl border-l-[3px] px-4 py-3 text-sm transition ${
                        actif
                          ? "border-sable bg-terre/35 font-semibold text-ivoire"
                          : "border-transparent text-sable hover:bg-terre/20 hover:text-ivoire"
                      }`}
                    >
                      <Icone className="size-[18px] shrink-0" strokeWidth={1.75} />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="mt-8 grid gap-1 border-t border-terre/30 pt-4">
            <Link
              href="/"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-sable/80 transition hover:bg-terre/20 hover:text-ivoire"
            >
              <ExternalLink className="size-[18px] shrink-0" strokeWidth={1.75} />
              Voir le site
            </Link>
            <form action={deconnexionAdmin}>
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-sable/80 transition hover:bg-terre/20 hover:text-ivoire"
              >
                <LogOut className="size-[18px] shrink-0" strokeWidth={1.75} />
                Se déconnecter
              </button>
            </form>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:px-12 lg:py-10">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
