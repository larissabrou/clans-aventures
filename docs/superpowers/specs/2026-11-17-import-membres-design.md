# Import Excel des anciens membres — conception (courte)

Date : 17/11/2026

## Intention

L'équipe CLANS a d'anciens membres qui ont déjà payé leur adhésion hors du site. L'admin veut les faire entrer sur le site depuis un fichier Excel, pour qu'ils reçoivent exactement ce que reçoit un nouvel inscrit (numéro, accès, messages et e-mails de bienvenue) sans repasser par l'inscription ni par le paiement.

## Décisions prises avec l'équipe

- **Contenu du fichier** : les informations demandées à l'inscription.
- **Paiement** : ces membres ont déjà payé ; ils deviennent membres sans paiement en ligne.
- **Numéro membre** : l'ancien numéro est conservé quand il est fourni.
- **Lecture du fichier sur le serveur** (approche 1 ci-dessous).

## Objectifs

- Depuis l'admin (rubrique Membres) : télécharger un modèle Excel, choisir un fichier, voir un aperçu, puis confirmer l'import.
- Chaque membre importé reçoit le même traitement qu'après une adhésion payée : numéro, mot de passe envoyé dans l'e-mail « Ton accès membre », messages de bienvenue réglés dans l'admin déposés dans sa boîte CLANS, e-mail « Bienvenue » environ 3 heures plus tard.

## Hors périmètre

- Mise à jour de membres déjà présents sur le site (ils sont signalés et ignorés).
- Import de leurs étoiles, participations ou historique.
- Formats autres que .xlsx (pas de .xls ni .csv).

## À ne pas faire

- Créer des doublons (même e-mail, même téléphone ou même numéro qu'un membre existant ou qu'une autre ligne du fichier).
- Créer quoi que ce soit avant la confirmation de l'aperçu.
- Laisser une inscription en ligne recevoir plus tard un numéro déjà attribué à un ancien membre.
- Envoyer un e-mail pour une ligne refusée.

## Approches envisagées

1. **Lecture sur le serveur (retenue)** : le fichier est envoyé au serveur (action d'admin), lu avec la bibliothèque ExcelJS, vérifié, et l'aperçu est affiché. « Importer » renvoie le même fichier, qui est relu et vérifié à nouveau avant la création. Avantages : une seule vérification, côté serveur, et rien de temporaire stocké. Inconvénient : le fichier part deux fois (5 Mo maximum, limite déjà en place).
2. **Lecture dans le navigateur** : écartée, car la bibliothèque alourdit la page admin, le serveur doit tout revérifier de toute façon, et SheetJS sur npm n'est plus maintenu (failles connues).

## Conception

### Modèle Excel (téléchargeable depuis l'admin)

Une feuille, une ligne d'en-têtes, une ligne d'exemple. Colonnes (✱ = obligatoire) :

| Colonne | Contenu |
|---|---|
| Prénom ✱ | texte |
| Nom ✱ | texte |
| E-mail ✱ | adresse e-mail valide |
| Téléphone WhatsApp ✱ | numéro ; sans indicatif = Côte d'Ivoire (+225), comme à l'inscription |
| Tranche d'âge ✱ | une des valeurs de l'inscription (listées dans le modèle) |
| Univers ✱ | un ou plusieurs parmi les univers de l'inscription, séparés par des virgules |
| Ville | texte |
| Univers culturel | nom d'un univers culturel de l'admin |
| Attentes | texte |
| Clan | nom d'un clan actif de l'admin ; vide = « À définir » |
| Code de parrainage | numéro du parrain (CLANS-000012 ou 12) |
| Numéro membre | ancien numéro (CLANS-000012, CLANS-12 ou 12) ; vide = nouveau numéro |
| Date d'adhésion | date (cellule date Excel ou jj/mm/aaaa) ; vide = date de l'import |

Les en-têtes sont reconnus sans tenir compte des majuscules et des accents. Une deuxième feuille du modèle liste les valeurs acceptées (tranches d'âge, univers, clans, univers culturels).

### Vérification et aperçu

Pour chaque ligne : champs obligatoires, formats, valeurs reconnues, et absence de doublon (e-mail, téléphone, numéro) avec les membres du site et avec les autres lignes. Un code de parrainage inconnu, ou un parrain présent seulement dans le même fichier, est accepté si le parrain est trouvé (sur le site ou plus haut dans le fichier) ; sinon la ligne est signalée.

Aperçu : « N membres prêts à être importés », puis la liste des lignes refusées avec la raison (« ligne 7 : e-mail invalide », « ligne 12 : déjà membre du site (même téléphone) »). Bouton « Importer les N membres » si N > 0. Les lignes refusées ne bloquent pas les autres.

### Import

En une transaction pour l'ensemble des lignes valides :
- membre créé avec statut « membre », numéro conservé (normalisé en CLANS-000000) ou attribué par la séquence, date d'adhésion (fournie ou date de l'import), charte considérée acceptée à la date de l'import, mot de passe généré (seule son empreinte est gardée) ;
- messages de bienvenue de l'admin déposés dans sa boîte, avec les variables remplacées ;
- lien avec le parrain conservé, **sans** étoiles de parrainage (parrainages antérieurs au site).

Après la transaction : la séquence des numéros est avancée au-delà du plus grand numéro existant ; pour chaque membre, e-mail « acces » tout de suite et e-mail « bienvenue » 3 heures plus tard, via la file existante (réessais automatiques).

Résultat affiché : « N membres importés », avec un rappel que les e-mails partent en arrière-plan.

### Réutilisation

La création d'un membre « comme après un paiement » (numéro, mot de passe, messages, e-mails) est aujourd'hui dans `confirmerPaiement` (`src/lib/adhesions.ts`). Les parties communes sont extraites pour être partagées, sans changer le comportement de l'adhésion en ligne.

## Laissé au choix du constructeur

- Emplacement exact dans l'admin (page `/admin/membres/import` reliée depuis la liste des membres).
- Limite de lignes par fichier (au moins 1 000).
- Présentation de l'aperçu.
