# Inscription des anciens membres sans paiement — conception (courte)

Date : 17/11/2026

## Intention

Le client veut que les anciens membres (qui ont déjà payé hors du site) s'inscrivent eux-mêmes. Le formulaire d'inscription propose « Nouveau membre » ou « Ancien membre » ; un ancien membre ne paie pas l'adhésion. Pour éviter qu'on se déclare « ancien » pour ne pas payer, l'équipe charge à l'avance la liste des anciens membres, et le site reconnaît la personne à l'inscription.

## Décisions prises avec l'équipe

- **Liste préchargée** par l'admin (fichier Excel) ; l'ancien membre reconnu est activé tout de suite, sans paiement.
- **Reconnaissance par le téléphone ou l'e-mail** de la liste. Risque accepté : quelqu'un qui connaît le téléphone d'un ancien membre pourrait s'inscrire à sa place ; il est limité ci-dessous.
- **Liste dans une table à part**, séparée des membres.

## Objectifs

- L'admin charge, consulte et nettoie la liste des anciens membres.
- Un ancien membre reconnu devient membre comme après une adhésion payée : numéro (son ancien numéro si la liste le donne), mot de passe envoyé par e-mail, messages et e-mail de bienvenue, connexion directe à son espace.
- Un ancien membre non reconnu est guidé : s'inscrire comme nouveau membre (avec paiement) ou contacter l'équipe sur WhatsApp.

## Hors périmètre

- Vérification par code envoyé au téléphone (pas de SMS sur le site).
- Suppression de l'import « Créer les comptes tout de suite », qui reste disponible.

## À ne pas faire

- Activer quelqu'un qui n'est pas dans la liste, ou utiliser deux fois la même ligne.
- Changer le parcours payant des nouveaux membres.
- Faire apparaître les lignes de la liste parmi les membres (statistiques, recherche, envois, parrainage).

## Approches envisagées

1. **Table à part `anciens_membres` (retenue)** : la liste ne se mélange pas aux membres ; le chargement réutilise la lecture Excel et l'aperçu de l'import.
2. Fiches membres « à réclamer » : écartée, ces fiches apparaîtraient partout où le site compte ou liste des membres.

## Conception

### Données (migration)

Table `anciens_membres` : `id`, `prenom`, `nom`, `email` (minuscules, facultatif), `telephone` (normalisé, facultatif), `numero` (CLANS-000000, facultatif), `adhere_le` (facultatif), `charge_le`, `utilise_le` (vide tant que non utilisée), `membre_id` (membre créé, `set null` si supprimé), `reconnu_par` (`email` ou `telephone`), `email_saisi` (e-mail donné à l'inscription). Au moins un e-mail ou un téléphone par ligne.

### Chargement (page d'import de l'admin)

- Choix en haut de la page : « Créer les comptes tout de suite » (import actuel, inchangé) ou « Ajouter à la liste des anciens membres ».
- Même modèle Excel. En mode liste, seuls Prénom, Nom et (E-mail ou Téléphone) sont obligatoires ; Numéro membre et Date d'adhésion sont repris ; les autres colonnes sont ignorées (la personne les remplira à l'inscription).
- Aperçu avec les mêmes règles de format (e-mail, téléphone, numéro, date) ; une ligne est refusée si son e-mail, son téléphone ou son numéro est déjà celui d'un membre du site, d'une ligne de la liste non utilisée, ou d'une ligne précédente du fichier. Aucun e-mail n'est envoyé.

### Page « Anciens membres » (admin)

Liste des lignes : nom, e-mail, téléphone, numéro, état (« en attente » ou « inscrit le … — reconnu par e-mail | téléphone », avec l'e-mail saisi et un lien vers la fiche membre). Recherche simple. Suppression d'une ligne non utilisée. Lien depuis la page Membres et depuis la page d'import.

### Inscription

- En haut du formulaire : « Nouveau membre » (par défaut, parcours actuel) ou « Ancien membre ».
- Ancien membre : mêmes étapes de profil, puis la dernière étape « Paiement » est remplacée par « Valider mon inscription » (texte : « Ton adhésion a déjà été réglée : nous vérifions que tu es dans la liste des anciens membres. »).
- Le serveur cherche une ligne non utilisée dont l'e-mail (en priorité) ou le téléphone correspond à ceux du formulaire.
  - **Trouvée** : en une transaction, la fiche est enregistrée comme pour une inscription, la ligne est marquée utilisée (date, membre, reconnu par, e-mail saisi), puis le membre est activé (ancien numéro et date d'adhésion de la liste s'ils existent, sinon nouveau numéro et date du jour ; pas d'étoiles de parrainage, comme pour l'import). Ensuite : e-mails d'accès et de bienvenue, session ouverte, écran de bienvenue comme après un paiement.
  - **Pas trouvée** : rien n'est créé ; message « Nous ne te trouvons pas dans la liste des anciens membres. » avec deux boutons : « M’inscrire comme nouveau membre » (revient au parcours payant, sans perdre ce qui a été saisi) et « Contacter l’équipe » (lien WhatsApp du site).
- Les règles actuelles de l'inscription restent : une personne déjà membre du site (même e-mail ou téléphone) est refusée avec le message existant.

## Laissé au choix du constructeur

- Emplacement exact des pages et noms des routes.
- Présentation du choix ancien / nouveau dans le formulaire (en respectant le style actuel).
