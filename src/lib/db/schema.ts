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
    // Numéro WhatsApp international, chiffres uniquement (ex. 2250700000000) : sert à la connexion.
    telephone: text("telephone").notNull(),
    ville: text("ville"),
    trancheAge: text("tranche_age"),

    interets: text("interets").array().notNull().default([]),
    appartenance: text("appartenance"),
    appartenanceAutre: text("appartenance_autre"),
    universADecouvrir: text("univers_a_decouvrir"),
    attente: text("attente"),

    clan: text("clan"),
    parrainId: uuid("parrain_id").references((): AnyPgColumn => membres.id, {
      onDelete: "set null",
    }),
    pinRemis: boolean("pin_remis").notNull().default(false),

    charteAccepteeLe: horodatage("charte_acceptee_le").notNull(),
    adhereLe: horodatage("adhere_le"),
    creeLe: horodatage("cree_le").notNull().defaultNow(),
    modifieLe: horodatage("modifie_le").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("membres_telephone_idx").on(t.telephone)],
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
    creeLe: horodatage("cree_le").notNull().defaultNow(),
  },
  (t) => [index("mouvements_membre_idx").on(t.membreId)],
);

export const typeEvenement = pgEnum("type_evenement", [
  "meet", // CLANS MEET : rencontre urbaine
  "escape", // CLANS ESCAPE : petite sortie
  "camp", // CLANS CAMP
  "rassemblement",
  "autre",
]);

export const evenements = pgTable("evenements", {
  id: serial("id").primaryKey(),
  titre: text("titre").notNull(),
  description: text("description"),
  type: typeEvenement("type").notNull().default("autre"),
  date: horodatage("date").notNull(),
  lieu: text("lieu"),
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

/** Codes de connexion à usage unique envoyés sur WhatsApp (stockés signés, jamais en clair). */
export const codesConnexion = pgTable(
  "codes_connexion",
  {
    id: serial("id").primaryKey(),
    telephone: text("telephone").notNull(),
    empreinte: text("empreinte").notNull(),
    tentatives: integer("tentatives").notNull().default(0),
    expireLe: horodatage("expire_le").notNull(),
    creeLe: horodatage("cree_le").notNull().defaultNow(),
  },
  (t) => [index("codes_telephone_idx").on(t.telephone)],
);

export type Membre = typeof membres.$inferSelect;
export type Message = typeof messages.$inferSelect;
