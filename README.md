# clans aventures

Site d'adhésion et espace membre de CLANS aventures.
_« Viens avec ta culture. Repars avec une histoire. »_

## Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS 4**, avec la charte graphique déclarée dans `src/app/globals.css`
- Polices **Cormorant Garamond** (titres) et **Montserrat** (textes) via `next/font`
- Déploiement sur **Coolify** via le `Dockerfile` (sortie `standalone`)

Paiement de l'adhésion par Mobile Money (Orange Money, MTN MoMo, Moov Money, Wave) via le **Payment Gateway**, la passerelle de Czotick (voir plus bas).

À venir : PostgreSQL + Drizzle, Better Auth (connexion par code), API WhatsApp Cloud, pg-boss.

## Démarrer en local

```bash
npm install
npm run dev
```

Puis ouvrir http://localhost:3000.

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement avec rechargement automatique |
| `npm run build` | Build de production (à lancer avant de pousser pour vérifier) |
| `npm run start` | Lance le build de production en local |
| `npm run lint` | Vérifie le code avec ESLint |

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
    api/paiement/         POST : lance le paiement ; GET [reference] : relit son statut
    webhooks/payment/     Webhook signé du Payment Gateway (POST)
  components/             Composants réutilisables (en-tête, logo, boutons, ...)
  lib/                    Données et règles métier (univers, niveaux, prix, démo)
    paiement/             Opérateurs et pays (partagé) ; client de la passerelle (serveur)
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
4. Sans base de données pour l'instant, le webhook vérifie la signature et journalise ; l'enregistrement de l'adhésion payée (et l'envoi de l'accès WhatsApp) se branchera là quand PostgreSQL + Drizzle arriveront.

## Déployer sur Coolify

1. Nouvelle ressource → dépôt GitHub `larissabrou/clans-aventures`, branche `main`.
2. Build pack : **Dockerfile**. Port exposé : **3000**.
3. Ajouter le domaine : Coolify génère le certificat HTTPS.
4. Variables d'environnement : celles de `.env.example`, avec `NEXT_PUBLIC_SITE_URL=https://clans-aventures.com`.
5. Chaque `git push` sur `main` redéploie automatiquement.
