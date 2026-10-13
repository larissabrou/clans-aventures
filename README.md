# clans aventures

Site d'adhésion et espace membre de CLANS aventures.
_« Viens avec ta culture. Repars avec une histoire. »_

## Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS 4**, avec la charte graphique déclarée dans `src/app/globals.css`
- Polices **Cormorant Garamond** (titres) et **Montserrat** (textes) via `next/font`
- **PostgreSQL** + **Drizzle ORM** (tables et migrations en TypeScript)
- Connexion des membres par **code à usage unique envoyé par email** (sessions en cookie httpOnly)
- **Emails par SMTP** (Nodemailer) pour les codes et les messages aux membres ; WhatsApp prévu plus tard (`lib/whatsapp.ts`)
- **pg-boss** : file de tâches dans PostgreSQL (messages différés, nouveaux essais automatiques)
- **Zod** pour valider les données reçues
- Paiement Mobile Money (Orange Money, MTN MoMo, Moov Money, Wave) via le **Payment Gateway** de Czotick
- Déploiement sur **Coolify** via le `Dockerfile` (sortie `standalone`)

## Démarrer en local

1. Créer une base vide dans votre PostgreSQL local (pgAdmin, ou `createdb -U postgres clans_aventures`).
2. Copier `.env.example` en `.env.local`, puis renseigner au minimum `DATABASE_URL`.
3. Lancer :

```bash
npm install
npm run dev
```

Puis ouvrir http://localhost:3000. Au démarrage, les migrations sont appliquées automatiquement.

Sans `SMTP_HOST`, les emails (dont **le code de connexion**) s'affichent dans le terminal du serveur : `[Email simulé] à aya@… — Ton code de connexion CLANS : 123456`. En développement, les tâches différées s'exécutent immédiatement.

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement avec rechargement automatique |
| `npm run build` | Build de production (à lancer avant de pousser pour vérifier) |
| `npm run start` | Lance le build de production en local |
| `npm run lint` | Vérifie le code avec ESLint |
| `npm run db:generate` | Crée une migration SQL après une modification de `src/lib/db/schema.ts` |
| `npm run db:migrate` | Applique les migrations (aussi fait automatiquement au démarrage) |
| `npm run db:studio` | Interface web pour consulter et modifier les tables |

## Organisation

```
src/
  app/                    Chaque dossier = une route (URL)
    layout.tsx            Gabarit commun à toutes les pages (polices, <html>)
    globals.css           Charte : couleurs, polices, animations
    page.tsx              /               (landing)
    inscription/          /inscription    (parcours d'adhésion en 5 étapes)
      adhesion-form.tsx     Formulaire interactif ("use client")
      paiement-mobile-money.tsx  Choix de l'opérateur (logos), du pays et du numéro à débiter
    espace-membre/        /espace-membre  (tableau de bord du membre)
      member-shell.tsx      En-tête + menu latéral (mobile inclus)
      messages-*.tsx        Messagerie : état partagé + boîte de réception
      actions.ts            Server Functions : marquer un message comme lu
    connexion/            /connexion      (adresse email → code à 6 chiffres)
      actions.ts            Server Functions : demander / vérifier le code, se déconnecter
    api/paiement/         POST : enregistre la demande et lance le paiement ; GET [reference] : relit son statut
    api/sante/            Contrôle de santé pour Coolify
    webhooks/payment/     Webhook signé du Payment Gateway (POST)
  instrumentation.ts      Démarrage du serveur : migrations + file de tâches
  components/             Composants réutilisables (en-tête, logo, boutons, ...)
  lib/                    Règles métier, côté serveur sauf mention contraire
    db/schema.ts            Tables PostgreSQL (Drizzle)
    adhesions.ts            Enregistrement d'une demande, confirmation du paiement
    auth.ts                 Codes de connexion et sessions
    membres.ts              Données de l'espace membre
    notifications.ts        Contenu des emails (code, accès, bienvenue) aux couleurs de la charte
    email.ts                Envoi SMTP
    whatsapp.ts             Envoi des modèles WhatsApp (pas encore utilisé)
    jobs.ts                 File de tâches pg-boss
    paiement/               Opérateurs et pays (partagé) ; passerelle et suivi des paiements (serveur)
drizzle/                  Migrations SQL générées (appliquées au démarrage)
public/images/            Logos et images servis tels quels
  paiement/               Logos Orange Money, MTN MoMo, Moov Money, Wave
maquettes/                Maquettes HTML d'origine (référence de design)
```

## Charte graphique → classes Tailwind

| Couleur | Hex | Exemples de classes |
|---|---|---|
| forêt | `#123B2A` | `bg-foret`, `text-foret` |
| terre | `#B45A2A` | `bg-terre`, `border-terre` |
| bordeaux | `#6B1835` | `bg-bordeaux` |
| sable | `#D9C29A` | `bg-sable` |
| ivoire | `#F6F0E4` | `bg-ivoire` |
| charbon | `#20201D` | `text-charbon` |

Polices : `font-titre` (Cormorant Garamond) et `font-sans` (Montserrat, par défaut).

## Paiement Mobile Money (Payment Gateway)

Même passerelle que Czotick (AggregPay, `https://payment.czotick.com`). Le serveur Next.js est le seul à lui parler : la clé API ne quitte jamais le serveur.

1. Copier `.env.example` en `.env.local` et renseigner `PAYMENT_GATEWAY_API_KEY` et `PAYMENT_GATEWAY_WEBHOOK_SECRET` (fiche partenaire « Clans aventures » sur `/admin/partners`).
2. Déclarer sur la fiche le webhook `https://clans-aventures.com/webhooks/payment` : chaque appel est vérifié par l'en-tête `X-Gateway-Signature` (HMAC SHA-256 du corps brut).
3. Orange, MTN, Moov : la personne valide sur son téléphone pendant que le formulaire relit le statut (`GET /api/paiement/[reference]`, toutes les 3 s, 3 min). Wave : redirection vers la page Wave, puis retour sur `/inscription?paiement=retour&ref=…`, où le statut est relu auprès de la passerelle. En local, Wave refuse `localhost` : aucune adresse de retour n'est envoyée (laisser `NEXT_PUBLIC_SITE_URL` vide).
4. Le webhook et la relecture du statut passent tous deux par `lib/paiement/suivi.ts` : le statut est **toujours revérifié auprès de la passerelle** avant d'écrire en base. Un webhook falsifié ne peut donc pas valider une adhésion.

## Parcours d'adhésion côté serveur

1. `POST /api/paiement` valide le formulaire (Zod), crée la fiche « en attente » et le paiement, puis lance le payin. Un numéro WhatsApp ou une adresse email déjà membre est refusé.
2. Paiement confirmé (relecture ou webhook) : la fiche devient « membre », reçoit son numéro `CLANS-000001`, trois messages dans l'espace membre (bienvenue, groupes WhatsApp, mission 01), et deux emails sont programmés (accès immédiat, bienvenue 3 h plus tard).
3. Le navigateur qui a payé est connecté directement ; ensuite, la connexion se fait sur `/connexion` avec un code reçu par email.

## Administration (en attendant un back-office)

`npm run db:studio` ouvre une interface web sur la base. On y gère : les **groupes WhatsApp** proposés après l'adhésion (`groupes_whatsapp`, avec l'univers `aventure`, `rencontres`, `culture`, `reseau`, ou vide pour tous), les **événements** (`evenements`), les **étoiles** (`mouvements_etoiles`), les **clans** et le **pin remis** (`membres`).

Pour la base de production : lancer Drizzle Studio en local avec l'URL publique de la base Coolify (à activer temporairement), ou passer par le terminal de la ressource PostgreSQL dans Coolify.

## Emails (SMTP)

Boîte LWS `noreply@clans-aventures.com` : `SMTP_HOST=mail.clans-aventures.com`, `SMTP_PORT=465` (SSL), `SMTP_USER` = l'adresse complète, `SMTP_PASSWORD` = le mot de passe de la boîte.

Pour que les emails n'arrivent pas en courrier indésirable, vérifier dans la zone DNS (Cloudflare) les enregistrements **SPF** (TXT `v=spf1 …` incluant LWS), **DKIM** (fourni par LWS) et **DMARC** (`_dmarc`).

## Plus tard : modèles WhatsApp à faire valider chez Meta

Pour passer les messages sur WhatsApp, créer ces trois modèles en français (langue `fr`) dans le WhatsApp Manager :

| Modèle | Catégorie | Contenu |
|---|---|---|
| `clans_code_connexion` | Authentification | Code à usage unique, avec bouton « Copier le code » |
| `clans_acces_membre` | Utilitaire | « Bienvenue {{1}} ! Ton adhésion CLANS est confirmée. Ton numéro membre : {{2}}. Connecte-toi à ton espace avec ton numéro WhatsApp : {{3}} » |
| `clans_bienvenue` | Utilitaire | « Bienvenue dans CLANS aventures, {{1}} ! Tu viens officiellement de rejoindre une communauté où les cultures se rencontrent… Ta prochaine étape : découvrir ton premier événement. » |

Puis renseigner `WHATSAPP_TOKEN` (jeton permanent d'un utilisateur système) et `WHATSAPP_PHONE_NUMBER_ID`.

## Déployer sur Coolify

1. **Base de données** : dans le projet Coolify, « + New » → **PostgreSQL** (version 16 ou 17). Une fois créée, copier son **Postgres URL (internal)**. Activer les **sauvegardes planifiées** (onglet Backups), idéalement vers un stockage S3 externe.
2. **Application** : « + New » → dépôt GitHub `larissabrou/clans-aventures`, branche `main`, build pack **Dockerfile**, port **3000**.
3. **Variables d'environnement** (onglet Environment Variables) : celles de `.env.example`, avec
   - `DATABASE_URL` = l'URL interne de l'étape 1,
   - `NEXT_PUBLIC_SITE_URL=https://clans-aventures.com` (à cocher aussi comme *Build Variable*),
   - `AUTH_SECRET`, `PAYMENT_GATEWAY_API_KEY`, `PAYMENT_GATEWAY_WEBHOOK_SECRET`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`.
4. **Domaine** : `https://clans-aventures.com` (et `https://www.clans-aventures.com`). Coolify génère le certificat HTTPS. Avec Cloudflare : mode SSL/TLS **Full (strict)**.
5. **Healthcheck** : déjà défini dans le `Dockerfile` (`/api/sante`, qui vérifie aussi la base).
6. **Premier déploiement** : les migrations s'appliquent au démarrage, rien à lancer à la main. Vérifier dans les logs : « migrations appliquées » puis « travailleurs pg-boss démarrés ».
7. Déclarer le webhook `https://clans-aventures.com/webhooks/payment` sur la fiche partenaire du Payment Gateway.
8. Chaque `git push` sur `main` redéploie automatiquement.
