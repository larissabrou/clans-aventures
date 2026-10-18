import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { exigerAdmin } from "@/lib/admin";
import { listeEvenements } from "@/lib/evenements";
import { derniersMembres, statistiquesAdmin } from "@/lib/gestion-membres";
import { formaterDate, formaterDateHeure } from "@/lib/membres";
import { Carte, EnTete, Vide } from "./ui";

export default async function AdminAccueil() {
  await exigerAdmin();
  const [stats, nouveaux, { aVenir }] = await Promise.all([
    statistiquesAdmin(),
    derniersMembres(),
    listeEvenements(),
  ]);

  return (
    <>
      <EnTete titre="Tableau de bord" texte="Vue d’ensemble de la communauté CLANS." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Chiffre valeur={stats.membres} label="Membres" lien="/admin/membres" />
        <Chiffre valeur={stats.sansClan} label="Sans clan" lien="/admin/membres" />
        <Chiffre valeur={stats.evenementsAVenir} label="Événements à venir" lien="/admin/evenements" />
        <Chiffre valeur={stats.enAttente} label="Adhésions non payées" lien="/admin/membres?statut=en_attente" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Carte titre="Prochains événements">
          {aVenir.length === 0 ? (
            <Vide texte="Aucun événement à venir." />
          ) : (
            <ul className="divide-y divide-white/15">
              {aVenir.slice(0, 5).map((e) => (
                <li key={e.id}>
                  <Link href={`/admin/evenements/${e.id}`} className="flex items-center justify-between gap-4 py-3 hover:text-sable">
                    <span>
                      <span className="block font-semibold">{e.titre}</span>
                      <span className="text-xs text-ivoire/60">{formaterDateHeure(e.date)}</span>
                    </span>
                    <span className="shrink-0 text-xs text-ivoire/60">
                      {e.inscrits} inscrit{e.inscrits > 1 ? "s" : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <LienSuite href="/admin/evenements">Créer ou gérer les événements</LienSuite>
        </Carte>

        <Carte titre="Dernières adhésions">
          {nouveaux.length === 0 ? (
            <Vide texte="Aucun membre pour l’instant." />
          ) : (
            <ul className="divide-y divide-white/15">
              {nouveaux.map((m) => (
                <li key={m.id}>
                  <Link href={`/admin/membres/${m.id}`} className="flex items-center justify-between gap-4 py-3 hover:text-sable">
                    <span>
                      <span className="block font-semibold">
                        {m.prenom} {m.nom}
                      </span>
                      <span className="text-xs text-ivoire/60">{m.numero}</span>
                    </span>
                    <span className="shrink-0 text-xs text-ivoire/60">
                      {m.adhereLe ? formaterDate(m.adhereLe) : "—"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <LienSuite href="/admin/membres">Tous les membres</LienSuite>
        </Carte>
      </div>

      <p className="mt-8 text-sm text-ivoire/50">
        Total des étoiles distribuées : <strong className="text-sable">{stats.etoilesDistribuees} ★</strong>
      </p>
    </>
  );
}

function Chiffre({ valeur, label, lien }: { valeur: number; label: string; lien: string }) {
  return (
    <Link href={lien} className="rounded-2xl border border-white/80 p-5 transition hover:border-sable">
      <p className="font-titre text-4xl leading-none font-semibold text-sable">{valeur}</p>
      <p className="mt-2 text-xs text-ivoire/70">{label}</p>
    </Link>
  );
}

function LienSuite({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-sable hover:text-ivoire">
      {children}
      <ArrowRight className="size-4" />
    </Link>
  );
}
