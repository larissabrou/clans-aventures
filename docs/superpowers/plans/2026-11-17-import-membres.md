# Import Excel des anciens membres — plan de mise en œuvre

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** L'admin importe un fichier .xlsx d'anciens membres (déjà payés) ; chacun devient membre avec son ancien numéro (ou un nouveau) et reçoit exactement ce que reçoit un nouvel adhérent.

**Architecture:** Module `src/lib/import-membres/` : lecture du classeur (ExcelJS), analyse (vérifications + doublons, sans écriture), import (transaction). La logique « activer un membre » est extraite de `confirmerPaiement` pour être partagée, sans changer l'adhésion en ligne. Page admin `/admin/membres/import` : modèle à télécharger, aperçu, confirmation (le fichier est renvoyé et ré-analysé).

**Tech Stack:** Next.js 16.4 (server actions, `cacheComponents`), Drizzle + PostgreSQL, pg-boss, zod 4, ExcelJS 4.4.0 (nouvelle dépendance), Vitest + PGlite.

**Spec:** `docs/superpowers/specs/2026-11-17-import-membres-design.md`

## Global Constraints

- Format accepté : `.xlsx` seulement ; taille ≤ 5 Mo (limite des server actions déjà réglée) ; au plus 1 000 lignes par fichier.
- Rien n'est écrit en base ni envoyé avant la confirmation ; la confirmation ré-analyse le fichier.
- Numéros normalisés `CLANS-` + 6 chiffres (`CLANS-000012`, `CLANS-12`, `12` → `CLANS-000012`), via `normaliserCodeParrainage`.
- Après import : `numero_membre_seq` placée au-delà du plus grand numéro `CLANS-NNNNNN` existant.
- Membre importé : statut `membre`, charte acceptée et (si vide) date d'adhésion = date de l'import, mot de passe généré, messages de bienvenue de l'admin, e-mail `acces` immédiat, e-mail `bienvenue` après 3 h (`DELAI_MESSAGE_BIENVENUE_SECONDES`), lien parrain gardé **sans** étoiles de parrainage.
- L'adhésion en ligne (`confirmerPaiement`) garde exactement son comportement (récompense du parrain comprise).
- Textes en français, ton CLANS.

## Review Focus

1. **Téléphone saisi comme nombre dans Excel** (`707070707`, le 0 initial perdu) : relu comme `0707070707` puis normalisé `2250707070707`. Test en Task 1.
2. **Cellules « lien » ou texte enrichi** (Excel transforme souvent un e-mail en lien hypertexte) : le texte est lu, pas `[object Object]`. Test en Task 1.
3. **Date d'adhésion** en cellule date Excel ou en texte `jj/mm/aaaa` : les deux lues ; date invalide = ligne refusée. Tests en Tasks 1 et 2.
4. **Même fichier importé deux fois** : le second aperçu refuse toutes les lignes (« déjà membre du site »), aucun e-mail. Test en Task 3.
5. **Doublons à l'intérieur du fichier** (même e-mail en casse différente, même téléphone dans deux formats, même numéro) : seule la première occurrence est acceptée. Test en Task 2.

---

### Task 1: Lecture du classeur et modèle Excel

**Files:**
- Create: `src/lib/import-membres/lecture.ts`, `src/lib/import-membres/colonnes.ts`, `tests/import-lecture.test.ts`
- Modify: `package.json` (dépendance `exceljs@4.4.0`)

**Interfaces:**
- Produces (`colonnes.ts`, sans dépendance serveur) : `COLONNES` = tableau ordonné `{ cle: CleColonne; entete: string; obligatoire: boolean }` avec les clés `prenom, nom, email, telephone, trancheAge, univers, ville, universCulturel, attentes, clan, codeParrainage, numero, dateAdhesion` et les en-têtes exacts du tableau de la spec (« Prénom », « Nom », « E-mail », « Téléphone WhatsApp », « Tranche d'âge », « Univers », « Ville », « Univers culturel », « Attentes », « Clan », « Code de parrainage », « Numéro membre », « Date d'adhésion ») ; `normaliserEntete(texte: string): string` (minuscules, sans accents, sans espaces superflus, apostrophes unifiées).
- Produces (`lecture.ts`) :
  - `type LigneBrute = { ligne: number /* numéro de ligne Excel */; valeurs: Partial<Record<CleColonne, string>>; dateAdhesion?: Date }`
  - `class ErreurFichier extends Error {}`
  - `lireClasseur(octets: ArrayBuffer): Promise<LigneBrute[]>` — première feuille, première ligne = en-têtes ; lève `ErreurFichier` avec : « Ce fichier n’est pas un fichier Excel (.xlsx) lisible. », « Colonne obligatoire absente : <entête>. », « Le fichier ne contient aucun membre. », « Le fichier dépasse 1 000 membres : découpe-le en plusieurs fichiers. ». Lignes entièrement vides ignorées. Cellule lien/texte enrichi/formule → son texte ; nombre → chaîne sans notation scientifique ; colonne `telephone` numérique de 9 chiffres → préfixée de `0` ; colonne `dateAdhesion` cellule date → `dateAdhesion`, texte conservé dans `valeurs.dateAdhesion` sinon.
  - `modeleExcel(listes: { tranches: string[]; univers: string[]; clans: string[]; universCulturels: string[] }): Promise<Buffer>` — feuille « Membres » (en-têtes de `COLONNES` + une ligne d'exemple) et feuille « Valeurs acceptées » (une colonne par liste).

- [ ] **Step 1:** `npm install exceljs@4.4.0`, puis `npm audit --omit=dev` : noter le résultat.
- [ ] **Step 2: Tests qui échouent** — `tests/import-lecture.test.ts` (classeurs construits en mémoire avec ExcelJS) :
  - `lit les colonnes par leur en-tête, quelle que soit la casse ou l'accent` (en-têtes `PRENOM`, `e-mail`, `Telephone whatsapp`… dans le désordre → valeurs bien rangées).
  - `numérote les lignes comme Excel et ignore les lignes vides` (ligne 2 et ligne 4, ligne 3 vide).
  - `relit un téléphone saisi comme nombre sans son 0 initial` : cellule `707070707` → `"0707070707"` (Review Focus 1).
  - `lit le texte d'un e-mail transformé en lien` : cellule `{ text: "awa@example.com", hyperlink: "mailto:awa@example.com" }` → `"awa@example.com"` (Review Focus 2).
  - `lit une date d'adhésion en cellule date et en texte` : cellule Date → `dateAdhesion` ; `"15/03/2022"` → `valeurs.dateAdhesion === "15/03/2022"` (Review Focus 3).
  - `refuse une colonne obligatoire absente` → `"Colonne obligatoire absente : E-mail."`.
  - `refuse un fichier qui n'est pas un .xlsx` (octets d'un texte) → message exact.
  - `refuse plus de 1 000 membres`.
  - `le modèle se relit sans erreur et contient la feuille des valeurs acceptées`.
- [ ] **Step 3:** `npx vitest run tests/import-lecture.test.ts` → FAIL (module absent).
- [ ] **Step 4:** Implémenter `colonnes.ts` et `lecture.ts`.
- [ ] **Step 5:** `npx vitest run` → PASS.
- [ ] **Step 6:** Commit `Import des membres : lecture du fichier Excel et modèle`.

### Task 2: Analyse des lignes (sans écriture)

**Files:**
- Create: `src/lib/import-membres/analyse.ts`, `tests/import-analyse.test.ts`

**Interfaces:**
- Consumes: `LigneBrute` (Task 1) ; `TRANCHES_AGE` (`@/lib/adhesion`), `UNIVERS` (`@/lib/univers`), `normaliserCodeParrainage` (`@/lib/adhesions`), `normaliserTelephone`, `telephoneValide` (`@/lib/telephone`) ; tables `membres`, `clans` (actifs), `universCulturels` (actifs).
- Produces:
  - `type MembreAImporter = { ligne: number; prenom: string; nom: string; email: string /* minuscules */; telephone: string /* normalisé */; trancheAge: string /* value */; interets: string[] /* ids UNIVERS */; ville: string | null; universADecouvrir: string | null; attente: string | null; clanId: number | null; parrain: { id: string } | { ligne: number } | null; numero: string | null; adhereLe: Date | null }`
  - `type LigneRefusee = { ligne: number; raison: string }`
  - `analyserImport(lignes: LigneBrute[]): Promise<{ aImporter: MembreAImporter[]; refusees: LigneRefusee[] }>` — lecture seule. Tranche d'âge et univers acceptés par libellé ou valeur (insensible casse/accents), univers séparés par des virgules ; clan et univers culturel par nom (insensible casse/accents). Raisons exactes : « champ obligatoire vide : <entête> », « e-mail invalide », « téléphone invalide », « tranche d’âge inconnue : <valeur> », « univers inconnu : <valeur> », « clan inconnu : <valeur> », « univers culturel inconnu : <valeur> », « numéro membre invalide : <valeur> », « date d’adhésion invalide : <valeur> », « déjà membre du site (même e-mail) », « déjà membre du site (même téléphone) », « numéro déjà attribué : <numéro> », « doublon de la ligne <n> (même e-mail | même téléphone | même numéro) », « code de parrainage inconnu : <valeur> ». Un parrain est trouvé parmi les membres du site ou une ligne acceptée plus haut dans le fichier. Une fiche `en_attente` (inscription non payée) avec le même e-mail ou téléphone n'est **pas** un doublon : elle sera remplacée par la ligne importée (Task 3).

- [ ] **Step 1: Tests qui échouent** — `tests/import-analyse.test.ts` (PGlite, `vi.mock("@/lib/db")` comme les tests des sorties) : un test par raison ci-dessus (raison exacte), plus :
  - `accepte une ligne complète et la convertit` (valeurs attendues de `MembreAImporter`, téléphone `"07 07 07 07 07"` → `"2250707070707"`, numéro `"12"` → `"CLANS-000012"`).
  - `accepte la tranche d'âge et les univers par leur libellé` (`"25 – 34 ans"`, `"Aventure, rencontres"`).
  - `doublons dans le fichier : seule la première occurrence est gardée` (même e-mail en casse différente ; même téléphone `0707070707` / `+225 07 07 07 07 07` ; même numéro `12` / `CLANS-000012`) — Review Focus 5.
  - `parrain trouvé plus haut dans le fichier` et `parrain plus bas dans le fichier → refusé`.
  - `une inscription en attente de paiement n'empêche pas l'import`.
  - `n'écrit rien en base` (nombre de membres inchangé).
- [ ] **Step 2:** `npx vitest run tests/import-analyse.test.ts` → FAIL.
- [ ] **Step 3:** Implémenter `analyse.ts`.
- [ ] **Step 4:** `npx vitest run` → PASS.
- [ ] **Step 5:** Commit `Import des membres : vérification des lignes et doublons`.

### Task 3: Activation partagée et import en base

**Files:**
- Create: `src/lib/import-membres/import.ts`, `tests/adhesion-confirmation.test.ts`, `tests/import-membres.test.ts`
- Modify: `src/lib/adhesions.ts`

**Interfaces:**
- Consumes: `MembreAImporter`, `analyserImport` (Task 2) ; `messagesBienvenuePour` ; `programmerNotification` ; `genererMotDePasse`, `hacherMotDePasse`.
- Produces (dans `adhesions.ts`, exportés) :
  - `activerMembre(tx: Transaction, membreId: string, options: { numero?: string | null; adhereLe?: Date | null; recompenserParrain: boolean }): Promise<{ membre: Membre; motDePasse: string }>` — ce que fait aujourd'hui la transaction de `confirmerPaiement` après la mise à jour du paiement (statut, numéro conservé ou séquence, date d'adhésion, mot de passe, messages de bienvenue, parrain si demandé).
  - `programmerEmailsAdhesion(membre: Membre, motDePasse: string): Promise<void>` — e-mail `acces` puis `bienvenue` à 3 h, erreurs journalisées sans lever.
  - `confirmerPaiement` réécrit avec ces deux fonctions (`recompenserParrain: true`), comportement inchangé.
- Produces (`import.ts`) : `importerMembres(aImporter: MembreAImporter[]): Promise<{ importes: number }>` — une transaction : insertion (ou remplacement d'une fiche `en_attente` de même e-mail/téléphone), parrains résolus (ligne du fichier → id créé), `activerMembre(..., { recompenserParrain: false })`, puis `select setval('numero_membre_seq', greatest(<max numéro>, last_value))` ; après la transaction, `programmerEmailsAdhesion` pour chacun.

- [ ] **Step 1: Test de non-régression qui passe AVANT le refactor** — `tests/adhesion-confirmation.test.ts` : `confirmerPaiement attribue un numéro, envoie acces et bienvenue, dépose les messages de bienvenue et récompense le parrain` (fiche `en_attente` + paiement `en_attente` insérés ; `programmerNotification` simulé). Run → PASS (comportement actuel figé).
- [ ] **Step 2: Tests qui échouent** — `tests/import-membres.test.ts` :
  - `importe un membre avec son ancien numéro et sa date d'adhésion` (statut `membre`, `numero === "CLANS-000350"`, `adhereLe` conservée, mot de passe haché présent).
  - `attribue un nouveau numéro après le plus grand numéro existant` (import `CLANS-000350` puis une ligne sans numéro → `CLANS-000351` ; puis `confirmerPaiement` d'un nouvel adhérent → `CLANS-000352`).
  - `envoie acces puis bienvenue à 3 h et dépose les messages de bienvenue` (appels de `programmerNotification`, délai `3 * 3600`).
  - `garde le parrain sans lui donner d'étoiles` (parrain du site et parrain d'une ligne précédente ; aucun `mouvements_etoiles`).
  - `remplace une inscription en attente de paiement`.
  - `réimporter le même fichier refuse toutes les lignes et n'envoie rien` (analyse + import, puis analyse du même contenu → 0 à importer) — Review Focus 4.
- [ ] **Step 3:** `npx vitest run tests/import-membres.test.ts` → FAIL.
- [ ] **Step 4:** Extraire `activerMembre` / `programmerEmailsAdhesion`, implémenter `importerMembres`.
- [ ] **Step 5:** `npx vitest run` → PASS (y compris la non-régression de Step 1).
- [ ] **Step 6:** Commit `Import des membres : création des membres comme après une adhésion`.

### Task 4: Page d'import dans l'admin

**Files:**
- Create: `src/app/admin/(gestion)/membres/import/page.tsx`, `src/app/admin/(gestion)/membres/import/formulaire-import.tsx` (client), `src/app/admin/(gestion)/membres/import/modele/route.ts`
- Modify: `src/app/admin/(gestion)/actions.ts`, `src/app/admin/(gestion)/membres/page.tsx` (lien « Importer des membres »)

**Interfaces:**
- Consumes: `lireClasseur`, `ErreurFichier`, `modeleExcel` (Task 1) ; `analyserImport` (Task 2) ; `importerMembres` (Task 3) ; `verifierAdmin` / `exigerAdmin`.
- Produces:
  - `actionAnalyserImport(_: EtatImport, formulaire: FormData): Promise<EtatImport>` et `actionImporterMembres(_: EtatImport, formulaire: FormData): Promise<EtatImport>` avec `type EtatImport = { etape: "choix" } | { etape: "apercu"; aImporter: number; refusees: LigneRefusee[]; nomFichier: string } | { etape: "termine"; importes: number } | { etape: "erreur"; message: string }`. Fichier attendu dans le champ `fichier` ; type/extension `.xlsx` vérifiés ; `importerMembres` ré-analyse le fichier renvoyé.
  - `GET /admin/membres/import/modele` : admin connecté exigé, réponse `.xlsx` (`Content-Disposition: attachment; filename="modele-import-membres-clans.xlsx"`).
  - Formulaire client : un seul `<input type="file" accept=".xlsx">` conservé entre l'aperçu et la confirmation ; boutons « Vérifier le fichier », puis « Importer les N membres » (désactivé si N = 0) ; liste des lignes refusées « Ligne 7 : e-mail invalide » ; après import : « N membres importés. Les e-mails d’accès partent en arrière-plan. »

- [ ] **Step 1:** Implémenter route, actions, page et lien.
- [ ] **Step 2:** `npx tsc --noEmit`, `npx eslint`, `npx next build` → OK.
- [ ] **Step 3:** Commit `Admin : import Excel des anciens membres`.

### Task 5: Vérification de bout en bout

- [ ] **Step 1:** Base locale PGlite (`pglite-server` du dossier de travail temporaire, comme pour les sorties) et `npx next dev` avec un `.env.local` jetable (supprimé à la fin).
- [ ] **Step 2:** Dans l'admin : télécharger le modèle, le remplir (3 lignes valides dont une avec ancien numéro `CLANS-000350`, un parrain dans le fichier, 2 lignes en erreur), vérifier l'aperçu (2 refusées avec la bonne raison), importer.
- [ ] **Step 3:** Vérifier : membres visibles dans l'admin avec leurs numéros ; e-mails `acces` affichés dans la console (pas de SMTP en local) ; connexion d'un membre importé avec le mot de passe reçu ; messages de bienvenue dans sa boîte ; réimport du même fichier → 0 à importer.
- [ ] **Step 4:** `npx vitest run`, `npx eslint`, `npx tsc --noEmit`, `npx next build` → tout passe.
