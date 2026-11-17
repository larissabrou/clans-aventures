# Inscription des anciens membres sans paiement — plan de mise en œuvre

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un ancien membre présent dans la liste chargée par l'admin s'inscrit lui-même sans payer et devient membre immédiatement ; l'admin charge et consulte cette liste.

**Architecture:** Table `anciens_membres` à part. Chargement via la page d'import existante (nouveau mode « liste », lecture Excel réutilisée). Inscription : la partie « enregistrer la fiche » de `enregistrerDemande` est extraite et partagée ; `inscrireAncienMembre` reconnaît la ligne, enregistre la fiche et réutilise `activerMembre` / `programmerEmailsAdhesion`. Nouvelle route `POST /api/inscription/ancien`, nouveau parcours dans `adhesion-form.tsx`.

**Tech Stack:** Next.js 16.4, Drizzle + PostgreSQL, zod 4, ExcelJS (déjà installé), Vitest + PGlite.

**Spec:** `docs/superpowers/specs/2026-11-17-anciens-membres-inscription-design.md`

## Global Constraints

- Le parcours payant des nouveaux membres ne change pas de comportement (`enregistrerDemande`, `/api/paiement`).
- Reconnaissance : ligne **non utilisée** dont l'e-mail (prioritaire, insensible à la casse) ou le téléphone normalisé correspond au formulaire.
- Une ligne ne sert qu'une fois ; aucun e-mail n'est envoyé au chargement de la liste.
- Ancien membre activé : ancien numéro et date d'adhésion de la liste si présents, pas d'étoiles de parrainage, e-mails `acces` + `bienvenue` (3 h), session ouverte.
- Textes exacts : « Nous ne te trouvons pas dans la liste des anciens membres. », « M’inscrire comme nouveau membre », « Contacter l’équipe », « Valider mon inscription », « Ton adhésion a déjà été réglée : nous vérifions que tu es dans la liste des anciens membres. »
- Les lignes de la liste n'apparaissent jamais parmi les membres (statistiques, recherche, envois, parrainage).

## Review Focus

1. **Même ligne réclamée deux fois en même temps** (double clic, deux appareils) : une seule activation ; la seconde reçoit « déjà membre ». Test en Task 2.
2. **E-mail d'une ligne A, téléphone d'une ligne B** : la ligne A (e-mail) est utilisée, la ligne B reste disponible. Test en Task 2.
3. **Numéro de la ligne déjà pris entre-temps** (import « comptes » du même numéro) : activation quand même avec un nouveau numéro, sans erreur, journalisée. Test en Task 2.
4. **Personne déjà membre du site** qui choisit « ancien membre » : refus avec le message actuel de l'inscription, la ligne n'est pas consommée. Test en Task 2.
5. **Ligne avec téléphone seulement, e-mail du formulaire différent** : reconnue par téléphone ; `reconnu_par = telephone` et `email_saisi` enregistrés. Test en Task 2.

---

### Task 1: Table et chargement de la liste

**Files:**
- Create: `src/lib/anciens-membres.ts`, `tests/anciens-liste.test.ts`, migration `drizzle/0016_anciens_membres.sql` (générée)
- Modify: `src/lib/db/schema.ts`

**Interfaces:**
- Consumes: `LigneBrute` (`@/lib/import-membres/lecture`), `normaliserTelephone`, `telephoneValide`, `normaliserCodeParrainage`, `NUMERO_MAX_IMPORT`.
- Produces:
  - Table `ancienMembres` (`anciens_membres`) : `id` serial, `prenom`, `nom` (requis), `email`, `telephone`, `numero`, `adhereLe`, `chargeLe` (défaut now), `utiliseLe`, `membreId` (→ `membres.id`, `set null`), `reconnuPar` (texte `email|telephone`), `emailSaisi`.
  - `analyserListeAnciens(lignes: LigneBrute[]): Promise<{ aAjouter: AncienAAjouter[]; refusees: LigneRefusee[] }>` avec `AncienAAjouter = { ligne: number; prenom: string; nom: string; email: string | null; telephone: string | null; numero: string | null; adhereLe: Date | null }`. Obligatoires : Prénom, Nom, et e-mail ou téléphone (raison « e-mail ou téléphone obligatoire »). Mêmes formats et raisons que `analyserImport` pour e-mail, téléphone, numéro (dont « numéro membre trop grand »), date. Doublons refusés contre les membres du site (« déjà membre du site (même e-mail | même téléphone) », « numéro déjà attribué : … »), contre les lignes **non utilisées** de la liste (« déjà dans la liste des anciens membres (même e-mail | même téléphone | même numéro) ») et dans le fichier (« doublon de la ligne n (…) »).
  - `ajouterALaListe(aAjouter: AncienAAjouter[]): Promise<{ ajoutes: number }>`.
  - `listeAnciensMembres(recherche: string): Promise<LigneListe[]>` (au plus 500, non utilisées d'abord, recherche sur nom/e-mail/téléphone/numéro) avec `LigneListe = typeof ancienMembres.$inferSelect & { membreNumero: string | null }`.
  - `supprimerAncienMembre(id: number): Promise<void>` — ne supprime que si `utiliseLe` est vide, sinon `ErreurAnciens("Cette ligne a déjà servi à une inscription.")`.
- Mutualisation : extraire de `src/lib/import-membres/analyse.ts` les vérifications de format (e-mail, téléphone, numéro, date) dans des fonctions exportées réutilisées par les deux analyses ; `analyserImport` garde exactement ses messages (ses tests le prouvent).

- [ ] **Step 1: Tests qui échouent** — `tests/anciens-liste.test.ts` : un test par raison propre à la liste ; `accepte une ligne avec téléphone seulement` ; `refuse un e-mail déjà dans la liste (ligne non utilisée)` ; `accepte un e-mail d'une ligne déjà utilisée` ; `ajouterALaListe n'envoie aucun e-mail et ne crée aucun membre` ; `listeAnciensMembres cherche par nom et par numéro` ; `supprimerAncienMembre refuse une ligne utilisée`.
- [ ] **Step 2:** `npx vitest run tests/anciens-liste.test.ts` → FAIL.
- [ ] **Step 3:** Schéma, `npx drizzle-kit generate --name anciens_membres`, implémentation.
- [ ] **Step 4:** `npx vitest run` → PASS (dont tous les tests d'import existants).
- [ ] **Step 5:** Commit `Anciens membres : liste préchargée (table, vérification, chargement)`.

### Task 2: Inscription d'un ancien membre (règles)

**Files:**
- Modify: `src/lib/adhesions.ts`, `src/lib/anciens-membres.ts`
- Create: `tests/anciens-inscription.test.ts`, `tests/adhesion-demande.test.ts`

**Interfaces:**
- Consumes: `activerMembre`, `programmerEmailsAdhesion`, `demandeAdhesionSchema`, table `ancienMembres`.
- Produces:
  - Dans `adhesions.ts` : `enregistrerFiche(tx: Transaction, demande: DemandeProfil): Promise<{ membreId: string; telephone: string }>` extrait de `enregistrerDemande` (profil, doublons, parrain, clan, insertion/remplacement de la fiche `en_attente`), avec `DemandeProfil = Omit<DemandeAdhesion, "pays" | "operateur" | "telephonePaiement"> & { pays?: string }` ; `enregistrerDemande` l'appelle puis insère le paiement (comportement inchangé). `demandeAncienSchema = demandeAdhesionSchema.omit({ pays: true, operateur: true, telephonePaiement: true })`.
  - Dans `anciens-membres.ts` : `inscrireAncienMembre(demande: z.infer<typeof demandeAncienSchema>): Promise<{ resultat: "active"; membreId: string } | { resultat: "inconnu" }>` — transaction : recherche de la ligne non utilisée (`for update`, e-mail d'abord puis téléphone normalisé indicatif 225) ; pas de ligne → `inconnu` sans rien écrire ; sinon `enregistrerFiche` (lève `ErreurAdhesion` comme l'inscription si déjà membre — la ligne n'est alors pas consommée), ligne marquée (`utiliseLe`, `membreId`, `reconnuPar`, `emailSaisi`), `activerMembre(..., { numero: numéroDeLaLigneSiLibre, adhereLe, recompenserParrain: false })` ; après la transaction `programmerEmailsAdhesion`.

- [ ] **Step 1: Non-régression qui passe AVANT le refactor** — `tests/adhesion-demande.test.ts` : `enregistrerDemande crée la fiche en attente et le paiement` et `enregistrerDemande refuse une personne déjà membre (même e-mail)` (message actuel exact). Run → PASS.
- [ ] **Step 2: Tests qui échouent** — `tests/anciens-inscription.test.ts` :
  - `active un ancien reconnu par e-mail avec son ancien numéro et sa date` (statut `membre`, numéro et date de la liste, ligne `reconnuPar = "email"`, 2 notifications `acces` puis `bienvenue` à 3 h).
  - `reconnaît par téléphone quand l'e-mail diffère` (Review Focus 5).
  - `inconnu : rien n'est créé` (aucun membre, aucune notification).
  - `ligne déjà utilisée : inconnu`.
  - `deux inscriptions simultanées de la même ligne : une seule activation` (`Promise.allSettled`, 1 membre actif, l'autre rejetée avec le message « déjà membre » actuel) (Review Focus 1).
  - `e-mail de la ligne A et téléphone de la ligne B : la ligne A est utilisée` (Review Focus 2).
  - `numéro de la ligne déjà pris : nouveau numéro attribué` (Review Focus 3).
  - `personne déjà membre : refus, ligne non consommée` (Review Focus 4).
  - `pas d'étoiles pour le parrain`.
- [ ] **Step 3:** `npx vitest run tests/anciens-inscription.test.ts` → FAIL.
- [ ] **Step 4:** Extraire `enregistrerFiche`, implémenter `inscrireAncienMembre`.
- [ ] **Step 5:** `npx vitest run` → PASS.
- [ ] **Step 6:** Commit `Anciens membres : inscription sans paiement après reconnaissance`.

### Task 3: Route d'inscription des anciens membres

**Files:**
- Create: `src/app/api/inscription/ancien/route.ts`, `tests/anciens-route.test.ts`

**Interfaces:**
- Consumes: `demandeAncienSchema`, `inscrireAncienMembre`, `ErreurAdhesion`, `ouvrirSession`.
- Produces: `POST /api/inscription/ancien` → `{ statut: "active" }` (session ouverte) | `{ statut: "inconnu" }` | `{ statut: "error"; message }` (422 validation, 409 `ErreurAdhesion`, 503 autre).

- [ ] **Step 1: Tests qui échouent** — `tests/anciens-route.test.ts` (même style que `tests/sorties-routes.test.ts`, `ouvrirSession` simulée) : `active et ouvre la session`, `inconnu`, `422 si la charte n'est pas acceptée`, `409 si déjà membre`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implémenter. **Step 4:** `npx vitest run` → PASS.
- [ ] **Step 5:** Commit `Anciens membres : route d'inscription`.

### Task 4: Parcours « ancien membre » dans le formulaire

**Files:**
- Modify: `src/app/inscription/adhesion-form.tsx`, `src/app/inscription/page.tsx` (lien de contact), `.env.example`

**Interfaces:**
- Consumes: `POST /api/inscription/ancien` (Task 3).
- Produces: champ d'état `ancien: boolean` ; choix « Nouveau membre » / « Ancien membre » au-dessus de l'étape 1 ; étape 5 « Validation » (titre) pour un ancien : texte de la Global Constraints + bouton « Valider mon inscription » ; `active` → écran de succès existant ; `inconnu` → message + bouton « M’inscrire comme nouveau membre » (repasse `ancien` à faux et reste à l'étape 5, données conservées) + lien « Contacter l’équipe » vers `https://wa.me/<WHATSAPP_CONTACT>` (variable d'environnement `WHATSAPP_CONTACT`, chiffres sans « + » ; lien masqué si absente), passée par `page.tsx` au formulaire. `.env.example` documente `WHATSAPP_CONTACT`.

- [ ] **Step 1:** Implémenter.
- [ ] **Step 2:** `npx tsc --noEmit`, `npx eslint`, `npx next build` → OK.
- [ ] **Step 3:** Commit `Inscription : choix ancien ou nouveau membre`.

### Task 5: Administration de la liste

**Files:**
- Modify: `src/app/admin/(gestion)/membres/import/actions.ts`, `formulaire-import.tsx`, `page.tsx`, `src/app/admin/(gestion)/membres/page.tsx` (lien)
- Create: `src/app/admin/(gestion)/membres/anciens/page.tsx`, `src/app/admin/(gestion)/membres/anciens/actions.ts`, `tests/anciens-action.test.ts`

**Interfaces:**
- Consumes: Task 1 (`analyserListeAnciens`, `ajouterALaListe`, `listeAnciensMembres`, `supprimerAncienMembre`).
- Produces: champ `cible` (`comptes` | `liste`) envoyé avec le fichier ; `EtatImport` gagne `cible` dans `apercu` et `termine` (`termine` liste : « N anciens membres ajoutés à la liste. ») ; radio « Créer les comptes tout de suite » / « Ajouter à la liste des anciens membres » (par défaut : liste) ; page `/admin/membres/anciens` (recherche GET `q`, tableau nom / e-mail / téléphone / numéro / état, bouton « Supprimer » pour les lignes non utilisées via `actionSupprimerAncien`) ; liens depuis Membres et Import.

- [ ] **Step 1: Test qui échoue** — `tests/anciens-action.test.ts` : `en mode liste, l'aperçu compte les lignes à ajouter et n'importe aucun membre` (action simulée avec un classeur en mémoire et la base PGlite).
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implémenter. **Step 4:** `npx vitest run`, `npx tsc --noEmit`, `npx eslint`, `npx next build` → OK.
- [ ] **Step 5:** Commit `Admin : liste des anciens membres`.

### Task 6: Vérification de bout en bout

- [ ] **Step 1:** Base PGlite locale + `next start` (build de production, panneau navigateur **visible** ou Playwright : un panneau caché empêche l'hydratation et fausse le test).
- [ ] **Step 2:** Charger une liste de 3 anciens (dont un avec numéro `CLANS-000350`, un avec téléphone seulement) ; page Anciens membres : 3 « en attente ».
- [ ] **Step 3:** Inscription « ancien » reconnu par e-mail → espace membre, numéro 350, e-mails dans la console ; ligne « inscrit — reconnu par e-mail ». Inscription « ancien » inconnue → message, bascule « nouveau membre » qui mène au paiement avec les données conservées.
- [ ] **Step 4:** `npx vitest run`, `npx eslint`, `npx tsc --noEmit`, `npx next build` → tout passe.
