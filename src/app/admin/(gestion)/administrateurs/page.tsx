import type { Metadata } from "next";
import { exigerAdmin } from "@/lib/admin";
import { listeAdministrateurs } from "@/lib/administrateurs";
import { formaterDateHeure } from "@/lib/membres";
import {
  actionCreerAdministrateur,
  actionModifierAdministrateur,
  actionRenvoyerMotDePasse,
  actionSupprimerAdministrateur,
} from "../actions";
import { BoutonEnvoi, FormulaireAdmin } from "../formulaire";
import { CaseACocher, Carte, Champ, EnTete, Pastille, champClasses } from "../ui";

export const metadata: Metadata = { title: "Administrateurs" };

const ROLES = [
  { valeur: "admin", label: "Admin — tout sauf administrateurs et réglages" },
  { valeur: "super_admin", label: "Super admin — tous les droits" },
] as const;

export default async function AdministrateursAdmin() {
  const moi = await exigerAdmin("super_admin");
  const comptes = await listeAdministrateurs();

  return (
    <>
      <EnTete
        titre="Administrateurs"
        texte="Les comptes d’administration sont indépendants des comptes membres. Chaque nouvel administrateur reçoit son mot de passe par email et se connecte sur /admin/connexion."
      />

      <Carte titre="Nouvel administrateur">
        <FormulaireAdmin action={actionCreerAdministrateur} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <Champ label="Prénom" id="admin-prenom">
            <input id="admin-prenom" name="prenom" required maxLength={60} className={champClasses} />
          </Champ>
          <Champ label="Nom" id="admin-nom">
            <input id="admin-nom" name="nom" maxLength={60} className={champClasses} />
          </Champ>
          <Champ label="Email" id="admin-email">
            <input id="admin-email" name="email" type="email" required maxLength={200} className={champClasses} />
          </Champ>
          <Champ label="Rôle" id="admin-role">
            <select id="admin-role" name="role" defaultValue="admin" className={champClasses}>
              {ROLES.map((r) => (
                <option key={r.valeur} value={r.valeur}>
                  {r.label}
                </option>
              ))}
            </select>
          </Champ>
          <div className="sm:col-span-2 lg:col-span-4">
            <BoutonEnvoi>Créer et envoyer le mot de passe</BoutonEnvoi>
          </div>
        </FormulaireAdmin>
      </Carte>

      <h2 className="mt-10 mb-4 font-titre text-3xl font-semibold">Comptes</h2>
      <ul className="grid gap-4">
        {comptes.map((admin) => {
          const estMoi = admin.id === moi.id;
          const verrouille = admin.variable || estMoi;
          return (
            <li key={admin.id} className="rounded-2xl border border-white/80 p-5">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <p className="font-titre text-2xl font-semibold">
                  {admin.prenom} {admin.nom}
                </p>
                <span className="rounded-full bg-terre/40 px-2.5 py-0.5 text-[0.7rem] font-semibold text-white">
                  {admin.role === "super_admin" ? "Super admin" : "Admin"}
                </span>
                <Pastille actif={admin.actif} />
                {estMoi && <span className="text-xs text-sable">C’est toi</span>}
                {admin.variable && <span className="text-xs text-ivoire/55">Défini par ADMIN_EMAILS</span>}
              </div>
              <p className="mb-4 text-sm text-ivoire/70">
                {admin.email} · Dernière connexion :{" "}
                {admin.derniereConnexion ? formaterDateHeure(admin.derniereConnexion) : "jamais"}
              </p>

              <FormulaireAdmin
                action={actionModifierAdministrateur}
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.4fr_auto_auto] lg:items-end"
              >
                <input type="hidden" name="id" value={admin.id} />
                <Champ label="Prénom" id={`admin-${admin.id}-prenom`}>
                  <input id={`admin-${admin.id}-prenom`} name="prenom" required maxLength={60} defaultValue={admin.prenom} className={champClasses} />
                </Champ>
                <Champ label="Nom" id={`admin-${admin.id}-nom`}>
                  <input id={`admin-${admin.id}-nom`} name="nom" maxLength={60} defaultValue={admin.nom} className={champClasses} />
                </Champ>
                <Champ label="Rôle" id={`admin-${admin.id}-role`}>
                  {/* Rôle et statut verrouillés pour soi-même et les comptes de ADMIN_EMAILS (contrôlé aussi côté serveur). */}
                  {verrouille && <input type="hidden" name="role" value={admin.role} />}
                  <select
                    id={`admin-${admin.id}-role`}
                    name={verrouille ? undefined : "role"}
                    defaultValue={admin.role}
                    disabled={verrouille}
                    className={`${champClasses} disabled:opacity-60`}
                  >
                    {ROLES.map((r) => (
                      <option key={r.valeur} value={r.valeur}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </Champ>
                <div className="pb-2.5">
                  {verrouille ? (
                    <input type="hidden" name="actif" value={admin.actif ? "1" : "0"} />
                  ) : (
                    <CaseACocher name="actif" label="Actif" defaultChecked={admin.actif} />
                  )}
                </div>
                <BoutonEnvoi style="secondaire">Enregistrer</BoutonEnvoi>
              </FormulaireAdmin>

              <div className="mt-3 flex flex-wrap gap-3">
                <FormulaireAdmin
                  action={actionRenvoyerMotDePasse}
                  confirmation={`Envoyer un nouveau mot de passe à ${admin.email} ? L’ancien ne fonctionnera plus.`}
                >
                  <input type="hidden" name="id" value={admin.id} />
                  <BoutonEnvoi style="secondaire">Envoyer un nouveau mot de passe</BoutonEnvoi>
                </FormulaireAdmin>
                {!verrouille && (
                  <FormulaireAdmin
                    action={actionSupprimerAdministrateur}
                    confirmation={`Supprimer le compte de ${admin.prenom} ${admin.nom} ?`}
                  >
                    <input type="hidden" name="id" value={admin.id} />
                    <BoutonEnvoi style="danger">Supprimer</BoutonEnvoi>
                  </FormulaireAdmin>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
