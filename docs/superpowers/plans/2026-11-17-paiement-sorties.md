# Paiement en ligne des sorties — plan de mise en œuvre

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membres et non-membres paient leur place à une sortie par Mobile Money ; Bon plan et la nouvelle page publique `/sorties` affichent les sorties en liste + sortie ouverte, comme la page Messages.

**Architecture:** Circuit de paiement séparé de l'adhésion : table `paiements_sorties`, références `CLANS-EVT-…`, logique dans `src/lib/sorties.ts` et `src/lib/paiement/suivi-sorties.ts`. On réutilise `creerPayin` / `statutPaiement` / `PaiementMobileMoney`. Le webhook unique aiguille selon le préfixe. `participations` accepte des non-membres (membre facultatif + coordonnées).

**Tech Stack:** Next.js 16.4 (App Router, `cacheComponents`), React 19, Drizzle ORM + PostgreSQL, pg-boss, zod 4, Tailwind 4. Tests : Vitest + PGlite (Postgres en mémoire, migrations réelles de `/drizzle`), ajoutés en devDependencies.

**Spec:** `docs/superpowers/specs/2026-11-17-paiement-sorties-design.md`

## Global Constraints

- Le code de validation des adhésions (`confirmerPaiement`, `suivrePaiement`, `/api/paiement`) ne change pas de comportement ; seul le webhook aiguille par préfixe.
- Préfixe des références de sorties : `CLANS-EVT-` (adhésion : `CLANS-ADH-`, inchangé).
- Montant débité = `evenements.prix` exactement ; paiement en ligne seulement si `prix >= MONTANT_MINIMUM` (500 par défaut, `PAYMENT_GATEWAY_MIN_AMOUNT`).
- Une place par paiement. Réservation des paiements en attente : 15 minutes. Relecture automatique des paiements en attente : toutes les 5 minutes, pendant 24 heures.
- Inscription seulement après statut `SUCCESS` revérifié auprès de la passerelle et montant reçu ≥ montant attendu.
- `evenements.publique` : vrai par défaut (y compris sorties existantes).
- Page publique : jamais d'étoiles, de pénalité, de mention « obligatoire » ni de liste de participants.
- Textes de l'interface en français, ton CLANS (tutoiement), comme le reste du site.
- Commits locaux à chaque tâche ; pas de push sans accord explicite.

## Review Focus

1. **Double clic / deux onglets** : un membre qui relance alors qu'un paiement de la même sortie est en attente (< 15 min) est refusé (« Un paiement est déjà en cours pour cette sortie »). Test en Task 2.
2. **Webhook et relecture simultanés** : deux confirmations du même paiement ne créent qu'une participation et un seul e-mail. Test en Task 3.
3. **Sortie supprimée pendant un paiement** : la confirmation marque le paiement réussi, ne crée pas de participation, ne plante pas et journalise. Test en Task 3.
4. **Téléphone saisi dans un autre format** (`07 07…`, `+225 07…`) par un non-membre qui est en fait membre : normalisé avant comparaison, donc refusé. Test en Task 2.
5. **Dernière place payée par deux personnes** : la seconde est refusée au lancement grâce à la réservation ; si les deux paiements aboutissent malgré tout, les deux sont inscrits et un avertissement est journalisé. Tests en Tasks 2 et 3.

---

### Task 1: Banc de test et schéma de données

**Files:**
- Create: `vitest.config.ts`, `tests/setup/db.ts`, `tests/schema.test.ts`, `drizzle/0015_paiement_sorties.sql` (généré)
- Modify: `package.json` (script `test`, devDependencies `vitest`, `@electric-sql/pglite`), `src/lib/db/schema.ts`

**Interfaces:**
- Produces: `tests/setup/db.ts` exporte `creerBaseDeTest(): Promise<{ db: PgliteDatabase<typeof schema>; fermer(): Promise<void> }>` (applique toutes les migrations de `/drizzle`) et `viderBase(db)` ; `vitest.config.ts` résout `@/` vers `src/` et remplace `server-only` par un module vide. Les tests remplacent `@/lib/db` par `vi.mock` vers la base PGlite.
- Produces (schéma) : `evenements.publique: boolean notNull default true` ; `participations.membreId` facultatif, nouvelles colonnes `prenom`, `nom`, `telephone`, `email`, `paiementReference` (texte, facultatives) ; table `paiementsSorties` (`reference` PK, `evenementId` → `evenements.id` `on delete set null`, `membreId` → `membres.id` `on delete set null`, `prenom`, `nom`, `telephone`, `email`, `evenementTitre`, `evenementDate`, `montant`, `devise`, `operateur`, `pays`, `telephoneDebite`, `statut` (enum `statut_paiement` existant), `derniereReponse` jsonb, `creeLe`, `confirmeLe`), index sur `(evenement_id, statut)`.

- [ ] **Step 1:** `npm install -D vitest @electric-sql/pglite --ignore-scripts`, script `"test": "vitest run"`, `vitest.config.ts` et `tests/setup/db.ts` (migrator `drizzle-orm/pglite/migrator`).
- [ ] **Step 2: Test qui échoue** — `tests/schema.test.ts` :
  - `toutes les migrations s'appliquent` : `creerBaseDeTest()` ne lève pas.
  - `une sortie est publique par défaut` : insertion sans `publique` → `publique === true`.
  - `une participation sans membre est acceptée` : insert `{ evenementId, prenom: "Awa", nom: "Koné", telephone: "2250707070707", email: "awa@example.com" }` → OK.
  - `un membre ne peut pas être inscrit deux fois` : deux inserts même `(membreId, evenementId)` → le second lève.
- [ ] **Step 3:** `npm test` → échec (colonnes absentes).
- [ ] **Step 4:** Modifier `schema.ts`, puis `npm run db:generate -- --name paiement_sorties` ; relire le SQL généré (pas de suppression de données).
- [ ] **Step 5:** `npm test` → PASS ; `npx tsc --noEmit` → erreurs attendues seulement là où `participations.membreId` est maintenant `string | null` (corrigées en Task 7 ; noter la liste).
- [ ] **Step 6:** Commit `Sorties : schéma du paiement en ligne et banc de test`.

### Task 2: Lancement d'un paiement de sortie (règles métier)

**Files:**
- Create: `src/lib/sorties.ts`, `tests/sorties-lancement.test.ts`
- Modify: `src/lib/paiement/gateway.ts` (ajout de `PREFIXE_REFERENCE_SORTIE = "CLANS-EVT-"`)

**Interfaces:**
- Consumes: schéma de Task 1 ; `normaliserTelephone` (`@/lib/telephone`) ; `MONTANT_MINIMUM`, `DEVISE` (`@/lib/paiement/gateway`) ; `estPays`, `estOperateur` (`@/lib/paiement/operateurs`).
- Produces (dans `src/lib/sorties.ts`) :
  - `class ErreurSortie extends Error {}`
  - `paiementEnLignePossible(prix: number | null): boolean`
  - `const DELAI_RESERVATION_MINUTES = 15`
  - `moyenPaiementSchema` (zod : `pays`, `operateur`, `telephonePaiement`) et `participantSchema` (zod : `prenom`, `nom`, `email`, `telephone`), mêmes messages d'erreur que `demandeAdhesionSchema`.
  - `type Payeur = { membreId: string } | { prenom: string; nom: string; email: string; telephone: string }` (téléphone déjà normalisé)
  - `enregistrerPaiementSortie(evenementId: number, payeur: Payeur, paiement: { reference: string; operateur: string; pays: string; telephoneDebite: string }): Promise<{ montant: number; titre: string }>` — en transaction, verrou `for update` sur la sortie, puis contrôles dans cet ordre, chacun levant `ErreurSortie` :
    1. sortie introuvable → « Cette sortie n’existe plus. »
    2. date passée → « Cette sortie est déjà passée. »
    3. non-membre et sortie non publique → « Cette sortie est réservée aux membres. »
    4. `!paiementEnLignePossible(prix)` → « Le paiement en ligne n’est pas disponible pour cette sortie. »
    5. membre déjà inscrit → « Tu es déjà inscrit à cette sortie. »
    6. membre avec paiement `en_attente` de moins de 15 min pour cette sortie → « Un paiement est déjà en cours pour cette sortie. »
    7. non-membre dont le téléphone ou l'e-mail (insensible à la casse) correspond à un membre → « Tu es déjà membre : connecte-toi pour payer depuis ton espace. »
    8. `places !== null` et `participations + paiements en_attente de moins de 15 min >= places` → « Cette sortie est complète. »
    puis insère la ligne `paiements_sorties` (statut `en_attente`, titre et date recopiés).
  - `sortiesPubliques()` : sorties à venir avec `publique = true`, champs affichables publiquement seulement (id, titre, description, conditions, date, lieu, prix, places, inscrits, typeAction, imageMaj).

- [ ] **Step 1: Tests qui échouent** — `tests/sorties-lancement.test.ts`, un test par contrôle 1 à 8 (`rejects.toThrow("<message exact>")`), plus :
  - `enregistre un paiement en attente avec le prix de la sortie` (montant = prix, titre recopié).
  - `un paiement en attente de plus de 15 minutes ne bloque plus la place` (`creeLe` forcé à -16 min).
  - `le téléphone +225 07 07 07 07 07 d'un membre est reconnu` (Review Focus 4).
  - `sortiesPubliques n'expose ni etoiles, ni penalite, ni obligatoire` (clés absentes de l'objet).
- [ ] **Step 2:** `npm test -- sorties-lancement` → FAIL (module absent).
- [ ] **Step 3:** Implémenter `src/lib/sorties.ts` (+ constante dans `gateway.ts`).
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `Sorties : règles de lancement d'un paiement`.

### Task 3: Confirmation et suivi d'un paiement de sortie

**Files:**
- Create: `src/lib/paiement/suivi-sorties.ts`, `tests/sorties-confirmation.test.ts`
- Modify: `src/lib/sorties.ts`, `src/lib/notifications.ts` (modèle `participation`), `src/lib/jobs.ts` (type `TacheNotification` couvre le nouveau modèle)

**Interfaces:**
- Consumes: `statutPaiement`, `encoreEnCours`, `type ReponsePasserelle` (`gateway.ts`) ; `programmerNotification` (`jobs.ts`) ; table `messages` (type `"evenement"` s'il existe dans `types_messages`, sinon `"information"` — vérifier les clés système).
- Produces:
  - Dans `sorties.ts` : `confirmerPaiementSortie(reference: string, montantRecu?: number): Promise<{ resultat: "confirme" | "deja_confirme"; participationId: number | null } | { resultat: "introuvable" | "montant_incorrect" }>` — transaction, verrou sur le paiement, statut `reussi`, insertion de la participation (membre : `onConflictDoNothing` ; non-membre : coordonnées + `paiementReference`) ; sortie supprimée → `participationId: null` + `console.error` ; dépassement des places → inscrit quand même + `console.warn`. Après la transaction, uniquement si `confirme` : e-mail `participation` via `programmerNotification`, et pour un membre un message dans sa boîte. `marquerPaiementSortieEchoue(reference, "echoue" | "annule")`, `noterReponseSortie(reference, reponse)`.
  - Dans `suivi-sorties.ts` : `suivrePaiementSortie(reference: string): Promise<{ etat: "paye" } | { etat: "en_attente" } | { etat: "echoue"; message: string }>`, même logique de statut terminal que `suivi.ts` ; `relancerPaiementsSortiesEnAttente(): Promise<number>` (paiements `en_attente` de moins de 24 h, chacun suivi, erreurs passagères ignorées et journalisées ; renvoie le nombre traité).
  - Notification : `{ modele: "participation"; email: string; prenom: string; titre: string; date: string; lieu: string | null; reference: string }`.

- [ ] **Step 1: Tests qui échouent** — `tests/sorties-confirmation.test.ts` (`vi.mock` de `gateway.ts` et `jobs.ts`) :
  - `inscrit un membre et envoie un e-mail` (1 participation, 1 appel `programmerNotification`, 1 message en boîte).
  - `inscrit un non-membre avec ses coordonnées et la référence`.
  - `deux confirmations simultanées ne créent qu'une participation` (`Promise.all` de deux appels ; 1 participation, 1 notification) — Review Focus 2.
  - `montant reçu insuffisant → montant_incorrect, pas d'inscription`.
  - `sortie supprimée → paiement réussi sans participation` — Review Focus 3.
  - `sortie complète entre-temps → inscrit quand même` — Review Focus 5.
  - `suivrePaiementSortie : SUCCESS → paye ; FAILED en cours → en_attente ; CANCELLED → echoue et statut annule`.
  - `relancerPaiementsSortiesEnAttente ignore les paiements de plus de 24 h`.
- [ ] **Step 2:** `npm test -- sorties-confirmation` → FAIL.
- [ ] **Step 3:** Implémenter.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `Sorties : confirmation, suivi et e-mail de participation`.

### Task 4: Routes API, webhook et relecture automatique

**Files:**
- Create: `src/app/api/sorties/paiement/route.ts`, `src/app/api/sorties/paiement/[reference]/route.ts`
- Modify: `src/app/webhooks/payment/route.ts`, `src/lib/jobs.ts`

**Interfaces:**
- Consumes: Task 2 (`enregistrerPaiementSortie`, schémas, `ErreurSortie`), Task 3 (`suivrePaiementSortie`, `relancerPaiementsSortiesEnAttente`, `confirmerPaiementSortie`, `marquerPaiementSortieEchoue`, `noterReponseSortie`), `membreConnecte` (`@/lib/auth`), `creerPayin`, `lienWave`, `encoreEnCours`, `OPERATEURS`, `PAYS`, `telephonePasserelle`.
- Produces:
  - `POST /api/sorties/paiement` — corps `{ evenementId: number, pays, operateur, telephonePaiement, participant?: { prenom, nom, email, telephone } }` ; membre connecté → payeur membre (champ `participant` ignoré), sinon `participant` obligatoire. Réponses : type `ResultatPaiement` existant. Erreurs `ErreurSortie` → 409 avec le message. `metadata.type = "participation"`. Wave : `success_url` = `${site}/espace-membre/bon-plan?paiement=retour&ref=…` (membre) ou `${site}/sorties?paiement=retour&ref=…`, même garde localhost que l'adhésion.
  - `GET /api/sorties/paiement/[reference]` — refuse toute référence sans préfixe `CLANS-EVT-` (404) ; renvoie `pending` / `paid` / `failed` comme `/api/paiement/[reference]`, sans ouvrir de session.
  - Webhook : `CLANS-EVT-` → `suivrePaiementSortie`, `CLANS-ADH-` → `suivrePaiement` (inchangé), autre → `found: false`.
  - `jobs.ts` : file `FILE_RELECTURE_SORTIES = "relecture-paiements-sorties"`, créée dans `boss()`, planifiée `schedule(FILE_RELECTURE_SORTIES, "*/5 * * * *")` et traitée dans `demarrerTravailleurs()` par `relancerPaiementsSortiesEnAttente()` (production seulement, comme les notifications).

- [ ] **Step 1:** Implémenter les deux routes, l'aiguillage du webhook et la tâche planifiée.
- [ ] **Step 2:** `npx tsc --noEmit` et `npx eslint` → aucune nouvelle erreur.
- [ ] **Step 3:** Test manuel avec la base locale (voir Task 8) : `curl -X POST /api/sorties/paiement` avec une sortie passée → 409 « Cette sortie est déjà passée. » ; `GET /api/sorties/paiement/CLANS-ADH-XXX` → 404.
- [ ] **Step 4:** Commit `Sorties : routes de paiement, webhook et relecture automatique`.

### Task 5: Bon plan recadré et paiement membre

**Files:**
- Create: `src/components/sorties/liste-sorties.tsx` (liste + sortie ouverte, client), `src/components/sorties/paiement-sortie.tsx` (panneau de paiement, client)
- Modify: `src/app/espace-membre/bon-plan/page.tsx`, `src/app/inscription/paiement-mobile-money.tsx` (prop facultative `theme: "clair" | "sombre"` si le composant n'est pas lisible sur fond sombre)

**Interfaces:**
- Consumes: `PaiementMobileMoney` ; `POST /api/sorties/paiement` et `GET /api/sorties/paiement/[reference]` (Task 4) ; `paiementEnLignePossible` ; `urlImageEvenement`, `formaterDateHeure`, `formatFcfa`.
- Produces:
  - `type SortieAffichee = { id: number; titre: string; description: string | null; conditions: string | null; date: string /* formatée */; lieu: string | null; prix: number | null; placesRestantes: number | null; typeAction: string | null; image: string | null; payable: boolean; inscrit?: boolean; etoiles?: number; obligatoire?: boolean; penalite?: number }`
  - `ListeSorties({ sorties, mode, selectionInitiale }: { sorties: SortieAffichee[]; mode: "membre" | "public"; selectionInitiale?: number })` — reprend la disposition de `boite-messages.tsx` : grille `lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]`, liste (vignette 16:9 réduite, titre, date, prix, badge « Tu es inscrit »), sortie ouverte collante (`lg:sticky lg:top-24`) : image `aspect-[16/9]` limitée, bandeau or (type + titre + date), détails, description (avec `TexteAvecLiens`), conditions, puis `PaiementSortie`. Mobile : liste ou sortie, bouton « Toutes les sorties ». Première sortie ouverte par défaut sur grand écran.
  - `PaiementSortie({ sortie, mode })` — bouton « Payer ma participation » (membre) / « Payer ma place » (public) ; non affiché si `!payable`, complet, passé ou déjà inscrit ; si prix trop bas : « Paiement auprès de l'équipe ». Mode public : champs prénom, nom, e-mail, téléphone avant le moyen de paiement. Suivi : relecture toutes les 3 s pendant 3 minutes (comme `adhesion-form.tsx`), redirection Wave, retour `?paiement=retour&ref=…` relu au chargement. Succès : membre → `router.refresh()` et badge inscrit ; public → message de confirmation.

- [ ] **Step 1:** Implémenter les deux composants et brancher Bon plan (le serveur prépare des `SortieAffichee` à partir de `bonsPlans`).
- [ ] **Step 2:** `npx tsc --noEmit`, `npx eslint`, `npx next build` → OK.
- [ ] **Step 3:** Vérification navigateur (Task 8, parcours membre) à 1280 px et 375 px.
- [ ] **Step 4:** Commit `Bon plan : liste et sortie ouverte, paiement de la participation`.

### Task 6: Page publique `/sorties`

**Files:**
- Create: `src/app/sorties/page.tsx`
- Modify: `src/components/site-header.tsx` (lien « Sorties »)

**Interfaces:**
- Consumes: `sortiesPubliques()` (Task 2), `ListeSorties` en mode `"public"` (Task 5), `membreConnecte` (`@/lib/auth`), `SiteHeader`, `SiteFooter`.
- Produces: page `/sorties` (titre « Nos sorties »), rendue derrière `<Suspense>` comme les autres pages qui lisent la base ; si un membre est connecté, un bandeau « Tu es membre : paie depuis ton espace » avec lien vers `/espace-membre/bon-plan` remplace les boutons de paiement.

- [ ] **Step 1:** Implémenter la page et le lien d'en-tête.
- [ ] **Step 2:** `npx next build` → OK ; `/sorties` apparaît dans la liste des routes.
- [ ] **Step 3:** Vérification navigateur (Task 8, parcours public) : aucune étoile, pénalité ni « Obligatoire » dans le texte de la page (`get_page_text`).
- [ ] **Step 4:** Commit `Sorties : page publique et paiement non-membre`.

### Task 7: Administration

**Files:**
- Modify: `src/lib/evenements.ts`, `src/app/admin/(gestion)/evenements/champs-evenement.tsx`, `src/app/admin/(gestion)/evenements/[id]/page.tsx`, actions admin des événements (fichier `actions.ts` voisin), `tests/` (nouveau `tests/evenements-admin.test.ts`)

**Interfaces:**
- Consumes: schéma Task 1, `paiementEnLignePossible`, `MONTANT_MINIMUM`.
- Produces:
  - `DonneesEvenement.publique: boolean` ; case « Visible sur la page publique » (cochée par défaut) dans `champs-evenement.tsx` ; sous le prix, avertissement si `0 < prix < MONTANT_MINIMUM` : « En dessous de 500 FCFA, le paiement en ligne n’est pas proposé. »
  - `evenementDetail` : `leftJoin` sur `membres`, chaque participant expose `membre: boolean`, nom/téléphone/e-mail du membre ou des colonnes de la participation, `paiementReference`.
  - Fiche admin : badge « Non-membre », e-mail, référence de paiement.
  - `marquerPresence` : aucune étoile si `membreId` est nul.
  - `supprimerEvenement(id, confirmerPaiements = false)` : lève `ErreurEvenement("Des participants ont payé en ligne : confirme la suppression.")` s'il existe des paiements réussis et que `confirmerPaiements` est faux ; le formulaire admin affiche cette confirmation.
  - Toutes les autres erreurs de type nées de `membreId: string | null` (liste notée en Task 1) corrigées.

- [ ] **Step 1: Tests qui échouent** — `tests/evenements-admin.test.ts` :
  - `marquer présent un non-membre ne crée aucun mouvement d'étoiles`.
  - `evenementDetail liste membres et non-membres`.
  - `supprimer une sortie avec paiements réussis exige la confirmation` puis `avec confirmation, le paiement reste en base avec evenementId null`.
- [ ] **Step 2:** `npm test -- evenements-admin` → FAIL.
- [ ] **Step 3:** Implémenter.
- [ ] **Step 4:** `npm test`, `npx tsc --noEmit`, `npx eslint` → OK.
- [ ] **Step 5:** Commit `Admin des sorties : visibilité publique, participants non-membres`.

### Task 8: Vérification de bout en bout

**Files:** aucun fichier du dépôt (base locale jetable).

- [ ] **Step 1:** Base locale : Docker Desktop démarré puis `docker run --rm -d -p 5432:5432 -e POSTGRES_PASSWORD=dev postgres:17`, `.env.local` avec `DATABASE_URL`, sans clé de passerelle réelle. Si Docker est indisponible, le dire et s'appuyer sur les tests PGlite.
- [ ] **Step 2:** Créer via l'admin une sortie publique payante (20 000 FCFA, 30 places), une sortie non publique et une sortie à 300 FCFA.
- [ ] **Step 3:** Parcours public `/sorties` : seules les sorties publiques ; « Paiement auprès de l'équipe » pour 300 FCFA ; formulaire non-membre jusqu'à l'appel de la passerelle (erreur attendue sans clé : message lisible, paiement marqué échoué).
- [ ] **Step 4:** Parcours membre Bon plan à 1280 px et 375 px : liste + sortie ouverte, retour liste sur mobile.
- [ ] **Step 5:** Simuler une confirmation (`confirmerPaiementSortie` via un script `npx tsx` local non commité) et vérifier : badge « Tu es inscrit », places restantes −1, participant visible dans l'admin, e-mail affiché dans la console (pas de SMTP en local).
- [ ] **Step 6:** `npm test`, `npx eslint`, `npx tsc --noEmit`, `npx next build` → tout passe.
