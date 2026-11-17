# Paiement en ligne des sorties — conception

Date : 17/11/2026

## Intention

L'équipe CLANS veut que les places aux sorties (campings, excursions, soirées) se paient en ligne, par Mobile Money, sans passer par un administrateur. Elle veut aussi ouvrir les sorties aux personnes qui ne sont pas membres, pour remplir les sorties et faire découvrir la communauté.

Aujourd'hui :
- les sorties ne sont visibles que dans l'espace membre (page « Bon plan ») ;
- un administrateur inscrit les participants à la main, par numéro de membre ;
- le seul paiement en ligne est celui de l'adhésion (passerelle AggregPay de Czotick : Orange, MTN, Moov, Wave).

## Décisions prises avec l'équipe

1. **Page publique des sorties** : le programme des sorties à venir est visible de tous sur le site, sans connexion. Chaque sortie a une case « Visible sur la page publique » dans l'admin, cochée par défaut ; une sortie décochée reste réservée à l'espace membre (réunions internes, sorties entre membres).
2. **Même prix pour tous** : membres et non-membres paient le prix de la sortie réglé dans l'admin (champ `evenements.prix`, inchangé).
3. **Circuit de paiement séparé de l'adhésion** : le paiement des sorties a sa propre table et sa propre logique de validation. Le code qui valide les adhésions n'est pas modifié.
4. **Recadrage de « Bon plan » comme la page Messages** : liste des sorties à gauche, sortie ouverte à droite ; sur mobile, la liste puis la sortie avec un bouton retour.

## Objectifs

- Un membre connecté paie sa place depuis Bon plan et se retrouve inscrit à la sortie.
- Un non-membre paie sa place depuis la page publique en donnant prénom, nom, téléphone et e-mail, et se retrouve dans la liste des participants.
- L'admin voit membres et non-membres dans la liste des participants d'une sortie, et peut marquer leur présence.
- Le nombre de places restantes tient compte des places payées ; une sortie complète ne peut plus être payée.

## Hors périmètre

- Prix différent pour les non-membres.
- Plusieurs places dans un seul paiement (une place par paiement).
- Remboursement ou annulation en ligne : l'équipe gère à la main, comme aujourd'hui.
- Inscription en ligne aux sorties gratuites (sans prix) : elles restent affichées, sans bouton de paiement ; l'inscription reste faite par l'admin.
- Page admin listant tous les paiements de sorties.

## À ne pas faire (ce qui ferait échouer le projet même si « ça marche »)

- Casser ou ralentir le paiement d'adhésion, qui encaisse déjà de l'argent réel.
- Inscrire quelqu'un sans paiement confirmé par la passerelle (on ne fait jamais confiance au seul webhook ni au navigateur).
- Encaisser un paiement sans inscrire la personne.
- Montrer publiquement des informations réservées aux membres (étoiles, pénalités, mention « obligatoire », liste des participants).

## Approches envisagées

1. **Circuit séparé (retenu).** Nouvelle table de paiements de sorties, référence `CLANS-EVT-…`, validation propre. On réutilise la connexion à la passerelle (`lib/paiement/gateway.ts`), les opérateurs (`lib/paiement/operateurs.ts`) et le composant de choix d'opérateur. Le webhook et la relecture du statut aiguillent selon le préfixe de la référence. Avantage : l'adhésion n'est pas touchée. Inconvénient : un peu de code proche de celui de l'adhésion.
2. **Circuit partagé.** Généraliser la table `paiements` (membre facultatif, type, sortie, coordonnées) et faire choisir la validation selon le type. Écarté : il faut modifier et migrer le cœur du paiement d'adhésion, avec un risque de bloquer les nouvelles adhésions.
3. **Créer un « membre » fantôme pour chaque non-membre.** Écarté : mélange les non-membres avec les membres (index unique sur le téléphone, statistiques, envois de messages).

## Conception

### Données (une migration Drizzle, `drizzle/0015_…`)

- **`evenements`** : nouvelle colonne `publique` (booléen, vrai par défaut, y compris pour les sorties existantes), réglable par une case dans le formulaire admin. La page publique et le paiement non-membre ne concernent que les sorties publiques.

- **`participations`** accepte des non-membres :
  - `membre_id` devient facultatif ;
  - nouvelles colonnes facultatives `prenom`, `nom`, `telephone`, `email` (renseignées pour un non-membre) ;
  - nouvelle colonne facultative `paiement_reference` (la référence du paiement qui a créé l'inscription) ;
  - l'index unique (membre, sortie) reste valable pour les membres ; il ne s'applique pas aux lignes sans membre.
- **Nouvelle table `paiements_sorties`** : `reference` (clé, `CLANS-EVT-…`), `evenement_id`, `membre_id` (facultatif), `prenom`, `nom`, `telephone`, `email` (pour un non-membre), `montant`, `devise`, `operateur`, `pays`, `telephone_debite`, `statut` (même énumération que les paiements d'adhésion), `derniere_reponse`, `cree_le`, `confirme_le`.

### Places

- Places prises = participations de la sortie (membres et non-membres).
- Au lancement d'un paiement, la sortie est refusée si `places prises + paiements en attente de moins de 15 minutes >= places`. Ainsi deux personnes ne paient pas en même temps la dernière place.
- À la confirmation, la personne est **toujours** inscrite, même si la sortie s'est remplie entre-temps (l'argent est encaissé) ; ce cas est journalisé pour l'équipe.
- Un membre déjà inscrit ne peut pas payer une deuxième fois la même sortie.
- Une sortie passée ne peut plus être payée.

### Parcours membre (espace membre, Bon plan)

- Bon plan prend la disposition de Messages : liste (vignette, titre, date, prix, badge « Tu es inscrit ») et sortie ouverte (image en hauteur limitée, bandeau or avec type et titre, détails, description, conditions).
- Dans la sortie ouverte, si elle est payante, à venir, non complète et que le membre n'est pas inscrit : bouton « Payer ma participation » qui ouvre le choix opérateur / pays / numéro (composant existant `PaiementMobileMoney`), puis le même suivi d'état que l'adhésion (en attente avec instruction, payé, échec).
- Après paiement : le membre est inscrit, reçoit un message dans sa boîte CLANS et un e-mail de confirmation.

### Parcours non-membre (page publique)

- Nouvelle page publique `/sorties`, dans le style du site public, avec la même disposition liste + sortie ouverte. Lien « Sorties » dans l'en-tête du site.
- Affiché : image, type, titre, date, lieu, prix, places restantes, description, conditions. Masqué : étoiles, pénalités, « obligatoire », participants.
- Bouton « Payer ma place » : formulaire prénom, nom, téléphone, e-mail, puis choix opérateur / pays / numéro à débiter, puis suivi d'état.
- Un membre qui arrive sur `/sorties` est invité à se connecter pour payer depuis son espace (pour être inscrit comme membre et gagner ses étoiles).
- Après paiement : écran de confirmation et e-mail de confirmation.
- Les outils de suivi (pixel Meta, Google Tag Manager) sont déjà actifs sur cette page.

### Paiement et validation

- Lancement : `POST /api/sorties/paiement` (membre identifié par sa session, non-membre par le formulaire), validation zod, contrôle des places, enregistrement du paiement, appel `creerPayin` avec `metadata.type = "participation"`. Retour Wave vers `/sorties?paiement=retour&ref=…` ou `/espace-membre/bon-plan?paiement=retour&ref=…`.
- Relecture : `GET /api/sorties/paiement/[reference]`.
- Webhook : `/webhooks/payment` reste l'unique adresse ; une référence `CLANS-EVT-` est envoyée vers le suivi des sorties, une référence `CLANS-ADH-` vers le suivi existant.
- Validation (idempotente, en transaction avec verrou) : statut revérifié auprès de la passerelle, montant reçu ≥ montant attendu, passage à « réussi », création de la participation. Puis e-mail (via la file existante, nouveau modèle de notification « participation ») et, pour un membre, message dans sa boîte.

### Admin

- Fiche d'une sortie : la liste des participants affiche aussi les non-membres (nom, téléphone, e-mail, badge « Non-membre ») et, pour chaque inscription payée en ligne, la référence du paiement.
- Marquer la présence fonctionne pour tous ; les étoiles ne sont attribuées qu'aux membres.
- L'ajout manuel par numéro de membre reste possible.

## Précisions (choix de conception, à corriger si besoin)

- **Montant minimum de la passerelle** (500 FCFA par défaut) : le montant débité est exactement le prix de la sortie. Si ce prix est inférieur au minimum, la sortie s'affiche sans bouton de paiement en ligne (« Paiement auprès de l'équipe »), et le formulaire admin le signale.
- **Non-membre dont le téléphone ou l'e-mail correspond à un membre** : le paiement est refusé avec le message « Tu es déjà membre : connecte-toi pour payer depuis ton espace » et un lien vers la connexion. Ainsi un membre est toujours inscrit comme membre (étoiles, pas de doublon).
- **Plusieurs paiements d'un non-membre** : autorisés. Chaque paiement correspond à une place, et le formulaire demande le nom de la personne qui participe ; on peut donc payer la place d'un ami en saisissant son nom.
- **Paiement perdu** (webhook non reçu et page fermée) : une tâche récurrente de la file existante (pg-boss) relit toutes les 5 minutes les paiements de sorties encore en attente depuis moins de 24 heures, et les valide ou les marque en échec.
- **Ajout manuel par l'admin** : la réservation de 15 minutes ne s'applique pas ; l'admin peut toujours ajouter un membre.
- **Suppression d'une sortie ou d'un participant** : les paiements de sorties sont conservés pour garder la trace des encaissements (lien vers la sortie mis à vide, titre et date de la sortie recopiés dans le paiement). Si une sortie a des participants qui ont payé en ligne, sa suppression demande une confirmation explicite dans l'admin.

## Laissé au choix du constructeur

- Découpage exact des fichiers et des composants partagés entre `/sorties` et Bon plan.
- Textes exacts des boutons, messages et e-mails (en français, ton CLANS).
- Gestion de l'état de chargement et des erreurs passagères de la passerelle, sur le modèle du formulaire d'adhésion.
