CREATE TYPE "public"."statut_membre" AS ENUM('en_attente', 'membre', 'suspendu');--> statement-breakpoint
CREATE TYPE "public"."statut_paiement" AS ENUM('en_attente', 'reussi', 'echoue', 'annule');--> statement-breakpoint
CREATE TYPE "public"."type_evenement" AS ENUM('meet', 'escape', 'camp', 'rassemblement', 'autre');--> statement-breakpoint
CREATE TYPE "public"."type_message" AS ENUM('info', 'event', 'warning', 'star');--> statement-breakpoint
CREATE SEQUENCE "public"."numero_membre_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "codes_connexion" (
	"id" serial PRIMARY KEY NOT NULL,
	"telephone" text NOT NULL,
	"empreinte" text NOT NULL,
	"tentatives" integer DEFAULT 0 NOT NULL,
	"expire_le" timestamp with time zone NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evenements" (
	"id" serial PRIMARY KEY NOT NULL,
	"titre" text NOT NULL,
	"description" text,
	"type" "type_evenement" DEFAULT 'autre' NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"lieu" text,
	"obligatoire" boolean DEFAULT false NOT NULL,
	"penalite" integer DEFAULT 0 NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "groupes_whatsapp" (
	"id" serial PRIMARY KEY NOT NULL,
	"nom" text NOT NULL,
	"lien" text NOT NULL,
	"univers" text,
	"actif" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "membres" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero" text,
	"statut" "statut_membre" DEFAULT 'en_attente' NOT NULL,
	"prenom" text NOT NULL,
	"nom" text NOT NULL,
	"email" text NOT NULL,
	"telephone" text NOT NULL,
	"ville" text,
	"tranche_age" text,
	"interets" text[] DEFAULT '{}' NOT NULL,
	"appartenance" text,
	"appartenance_autre" text,
	"univers_a_decouvrir" text,
	"attente" text,
	"clan" text,
	"parrain_id" uuid,
	"pin_remis" boolean DEFAULT false NOT NULL,
	"charte_acceptee_le" timestamp with time zone NOT NULL,
	"adhere_le" timestamp with time zone,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"modifie_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "membres_numero_unique" UNIQUE("numero")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"membre_id" uuid NOT NULL,
	"titre" text NOT NULL,
	"contenu" text NOT NULL,
	"type" "type_message" DEFAULT 'info' NOT NULL,
	"lu" boolean DEFAULT false NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mouvements_etoiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"membre_id" uuid NOT NULL,
	"libelle" text NOT NULL,
	"variation" integer NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paiements" (
	"reference" text PRIMARY KEY NOT NULL,
	"membre_id" uuid NOT NULL,
	"montant" integer NOT NULL,
	"devise" text NOT NULL,
	"operateur" text NOT NULL,
	"pays" text NOT NULL,
	"telephone" text NOT NULL,
	"statut" "statut_paiement" DEFAULT 'en_attente' NOT NULL,
	"derniere_reponse" jsonb,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"confirme_le" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "participations" (
	"id" serial PRIMARY KEY NOT NULL,
	"membre_id" uuid NOT NULL,
	"evenement_id" integer NOT NULL,
	"present" boolean DEFAULT false NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"membre_id" uuid NOT NULL,
	"expire_le" timestamp with time zone NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "membres" ADD CONSTRAINT "membres_parrain_id_membres_id_fk" FOREIGN KEY ("parrain_id") REFERENCES "public"."membres"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_membre_id_membres_id_fk" FOREIGN KEY ("membre_id") REFERENCES "public"."membres"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mouvements_etoiles" ADD CONSTRAINT "mouvements_etoiles_membre_id_membres_id_fk" FOREIGN KEY ("membre_id") REFERENCES "public"."membres"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paiements" ADD CONSTRAINT "paiements_membre_id_membres_id_fk" FOREIGN KEY ("membre_id") REFERENCES "public"."membres"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participations" ADD CONSTRAINT "participations_membre_id_membres_id_fk" FOREIGN KEY ("membre_id") REFERENCES "public"."membres"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participations" ADD CONSTRAINT "participations_evenement_id_evenements_id_fk" FOREIGN KEY ("evenement_id") REFERENCES "public"."evenements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_membre_id_membres_id_fk" FOREIGN KEY ("membre_id") REFERENCES "public"."membres"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "codes_telephone_idx" ON "codes_connexion" USING btree ("telephone");--> statement-breakpoint
CREATE UNIQUE INDEX "membres_telephone_idx" ON "membres" USING btree ("telephone");--> statement-breakpoint
CREATE INDEX "messages_membre_idx" ON "messages" USING btree ("membre_id");--> statement-breakpoint
CREATE INDEX "mouvements_membre_idx" ON "mouvements_etoiles" USING btree ("membre_id");--> statement-breakpoint
CREATE INDEX "paiements_membre_idx" ON "paiements" USING btree ("membre_id");--> statement-breakpoint
CREATE UNIQUE INDEX "participations_unique_idx" ON "participations" USING btree ("membre_id","evenement_id");--> statement-breakpoint
CREATE INDEX "sessions_membre_idx" ON "sessions" USING btree ("membre_id");