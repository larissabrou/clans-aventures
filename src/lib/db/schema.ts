// Tables de la base PostgreSQL, décrites en TypeScript avec Drizzle.
// Après une modification : `npm run db:generate` crée la migration SQL dans /drizzle.
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgSequence,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

const horodatage = (nom: string) =>
  timestamp(nom, { withTimezone: true, mode: "date" });

/** Numéros membres CLANS-000001, CLANS-000002… attribués au paiement. */
export const numeroMembreSeq = pgSequence("numero_membre_seq", { startWith: 1 });

/** Clans CLANS, enregistrés depuis l'administration et proposés à l'inscription. */
export const clans = pgTable("clans", {
  id: serial("id").primaryKey(),
  nom: text("nom").notNull().unique(),
  description: text("description"),
  // Un clan inactif n'est plus proposé à l'inscription mais reste sur les cartes existantes.
  actif: boolean("actif").notNull().default(true),
  creeLe: horodatage("cree_le").notNull().defaultNow(),
});

/** Actions qui rapportent des étoiles (camping, excursion…), avec leur barème fixé dans l'admin. */
export const typesActions = pgTable("types_actions", {
  id: serial("id").primaryKey(),
  nom: text("nom").notNull(),
  etoiles: integer("etoiles").notNull().default(0),
  // Action attribuée automatiquement par le site : "parrainage" (adhésion payée d'un filleul).
  code: text("code").unique(),
  actif: boolean("actif").notNull().default(true),
  creeLe: horodatage("cree_le").notNull().defaultNow(),
});

/** Réglages modifiables depuis l'admin (ex. « prix_adhesion »), stockés en texte. */
export const parametres = pgTable("parametres", {
  cle: text("cle").primaryKey(),
  valeur: text("valeur").notNull(),
  modifieLe: horodatage("modifie_le").notNull().defaultNow(),
});

export const statutMembre = pgEnum("statut_membre", [
  "en_attente", // formulaire rempli, paiement pas encore confirmé
  "membre", // adhésion payée
  "suspendu",
]);

export const membres = pgTable(
  "membres",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    numero: text("numero").unique(),
    statut: statutMembre("statut").notNull().default("en_attente"),

    prenom: text("prenom").notNull(),
    nom: text("nom").notNull(),
    email: text("email").notNull(),
    // Numéro WhatsApp international, chiffres uniquement (ex. 2250700000000).
    telephone: text("telephone").notNull(),
    ville: text("ville"),
    trancheAge: text("tranche_age"),

    interets: text("interets").array().notNull().default([]),
    appartenance: text("appartenance"),
    appartenanceAutre: text("appartenance_autre"),
    universADecouvrir: text("univers_a_decouvrir"),
    attente: text("attente"),

    // Choisi à l'inscription ou attribué par l'admin ; vide = « À définir ».
    clanId: integer("clan_id").references(() => clans.id, { onDelete: "set null" }),
    parrainId: uuid("parrain_id").references((): AnyPgColumn => membres.id, {
      onDelete: "set null",
    }),
    pinRemis: boolean("pin_remis").notNull().default(false),
    // Empreinte scrypt du mot de passe envoyé par email à l'adhésion (voir lib/mot-de-passe.ts).
    motDePasseHash: text("mot_de_passe_hash"),

    charteAccepteeLe: horodatage("charte_acceptee_le").notNull(),
    adhereLe: horodatage("adhere_le"),
    creeLe: horodatage("cree_le").notNull().defaultNow(),
    modifieLe: horodatage("modifie_le").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("membres_telephone_idx").on(t.telephone), index("membres_email_idx").on(t.email)],
);

export const statutPaiement = pgEnum("statut_paiement", [
  "en_attente",
  "reussi",
  "echoue",
  "annule",
]);

export const paiements = pgTable(
  "paiements",
  {
    // order_id envoyé à la passerelle (CLANS-ADH-…)
    reference: text("reference").primaryKey(),
    membreId: uuid("membre_id")
      .notNull()
      .references(() => membres.id, { onDelete: "cascade" }),
    montant: integer("montant").notNull(),
    devise: text("devise").notNull(),
    operateur: text("operateur").notNull(),
    pays: text("pays").notNull(),
    telephone: text("telephone").notNull(),
    statut: statutPaiement("statut").notNull().default("en_attente"),
    derniereReponse: jsonb("derniere_reponse"),
    creeLe: horodatage("cree_le").notNull().defaultNow(),
    confirmeLe: horodatage("confirme_le"),
  },
  (t) => [index("paiements_membre_idx").on(t.membreId)],
);

export const typeMessage = pgEnum("type_message", ["info", "event", "warning", "star"]);

export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    membreId: uuid("membre_id")
      .notNull()
      .references(() => membres.id, { onDelete: "cascade" }),
    titre: text("titre").notNull(),
    contenu: text("contenu").notNull(),
    type: typeMessage("type").notNull().default("info"),
    lu: boolean("lu").notNull().default(false),
    creeLe: horodatage("cree_le").notNull().defaultNow(),
  },
  (t) => [index("messages_membre_idx").on(t.membreId)],
);

/** Chaque gain ou perte d'étoiles ; le solde est la somme des variations. */
export const mouvementsEtoiles = pgTable(
  "mouvements_etoiles",
  {
    id: serial("id").primaryKey(),
    membreId: uuid("membre_id")
      .notNull()
      .references(() => membres.id, { onDelete: "cascade" }),
    libelle: text("libelle").notNull(),
    variation: integer("variation").notNull(),
    typeActionId: integer("type_action_id").references(() => typesActions.id, {
      onDelete: "set null",
    }),
    // Présence validée à l'origine des étoiles : décocher la présence retire le mouvement.
    participationId: integer("participation_id")
      .unique()
      .references((): AnyPgColumn => participations.id, { onDelete: "cascade" }),
    // Filleul dont l'adhésion a rapporté ces étoiles : une seule fois par filleul.
    filleulId: uuid("filleul_id")
      .unique()
      .references(() => membres.id, { onDelete: "cascade" }),
    creeLe: horodatage("cree_le").notNull().defaultNow(),
  },
  (t) => [index("mouvements_membre_idx").on(t.membreId)],
);

export const evenements = pgTable("evenements", {
  id: serial("id").primaryKey(),
  titre: text("titre").notNull(),
  description: text("description"),
  // Conditions de participation affichées dans « Bon plan » (âge, tenue, matériel, paiement…).
  conditions: text("conditions"),
  // Type d'action : fixe les étoiles gagnées par chaque participant présent.
  typeActionId: integer("type_action_id").references(() => typesActions.id, {
    onDelete: "set null",
  }),
  date: horodatage("date").notNull(),
  lieu: text("lieu"),
  // Prix en FCFA (vide = gratuit) et nombre de places (vide = sans limite).
  prix: integer("prix"),
  places: integer("places"),
  obligatoire: boolean("obligatoire").notNull().default(false),
  // Étoiles retirées en cas d'absence non justifiée à un événement obligatoire.
  penalite: integer("penalite").notNull().default(0),
  creeLe: horodatage("cree_le").notNull().defaultNow(),
});

export const participations = pgTable(
  "participations",
  {
    id: serial("id").primaryKey(),
    membreId: uuid("membre_id")
      .notNull()
      .references(() => membres.id, { onDelete: "cascade" }),
    evenementId: integer("evenement_id")
      .notNull()
      .references(() => evenements.id, { onDelete: "cascade" }),
    present: boolean("present").notNull().default(false),
    creeLe: horodatage("cree_le").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("participations_unique_idx").on(t.membreId, t.evenementId)],
);

/** Groupes WhatsApp proposés après l'adhésion, selon les univers choisis. */
export const groupesWhatsapp = pgTable("groupes_whatsapp", {
  id: serial("id").primaryKey(),
  nom: text("nom").notNull(),
  lien: text("lien").notNull(),
  // Univers (aventure, rencontres, culture, reseau) ; vide = groupe proposé à tous.
  univers: text("univers"),
  actif: boolean("actif").notNull().default(true),
});

export const sessions = pgTable(
  "sessions",
  {
    // Empreinte SHA-256 du jeton du cookie : le jeton lui-même n'est jamais stocké.
    id: text("id").primaryKey(),
    membreId: uuid("membre_id")
      .notNull()
      .references(() => membres.id, { onDelete: "cascade" }),
    expireLe: horodatage("expire_le").notNull(),
    creeLe: horodatage("cree_le").notNull().defaultNow(),
  },
  (t) => [index("sessions_membre_idx").on(t.membreId)],
);

/** Codes de connexion à usage unique (stockés signés, jamais en clair). */
export const codesConnexion = pgTable(
  "codes_connexion",
  {
    id: serial("id").primaryKey(),
    // Destinataire du code : email pour l'instant, téléphone quand WhatsApp sera branché.
    email: text("email"),
    telephone: text("telephone"),
    empreinte: text("empreinte").notNull(),
    tentatives: integer("tentatives").notNull().default(0),
    expireLe: horodatage("expire_le").notNull(),
    creeLe: horodatage("cree_le").notNull().defaultNow(),
  },
  (t) => [index("codes_telephone_idx").on(t.telephone), index("codes_email_idx").on(t.email)],
);

export type Membre = typeof membres.$inferSelect;
export type Clan = typeof clans.$inferSelect;
export type TypeAction = typeof typesActions.$inferSelect;
export type Evenement = typeof evenements.$inferSelect;
export type Message = typeof messages.$inferSelect;
