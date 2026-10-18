CREATE TABLE "clans" (
	"id" serial PRIMARY KEY NOT NULL,
	"nom" text NOT NULL,
	"description" text,
	"actif" boolean DEFAULT true NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clans_nom_unique" UNIQUE("nom")
);
--> statement-breakpoint
CREATE TABLE "parametres" (
	"cle" text PRIMARY KEY NOT NULL,
	"valeur" text NOT NULL,
	"modifie_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "types_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"nom" text NOT NULL,
	"etoiles" integer DEFAULT 0 NOT NULL,
	"code" text,
	"actif" boolean DEFAULT true NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "types_actions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "evenements" ADD COLUMN "type_action_id" integer;--> statement-breakpoint
ALTER TABLE "evenements" ADD COLUMN "prix" integer;--> statement-breakpoint
ALTER TABLE "evenements" ADD COLUMN "places" integer;--> statement-breakpoint
ALTER TABLE "membres" ADD COLUMN "clan_id" integer;--> statement-breakpoint
ALTER TABLE "mouvements_etoiles" ADD COLUMN "type_action_id" integer;--> statement-breakpoint
ALTER TABLE "mouvements_etoiles" ADD COLUMN "participation_id" integer;--> statement-breakpoint
ALTER TABLE "mouvements_etoiles" ADD COLUMN "filleul_id" uuid;--> statement-breakpoint
ALTER TABLE "evenements" ADD CONSTRAINT "evenements_type_action_id_types_actions_id_fk" FOREIGN KEY ("type_action_id") REFERENCES "public"."types_actions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membres" ADD CONSTRAINT "membres_clan_id_clans_id_fk" FOREIGN KEY ("clan_id") REFERENCES "public"."clans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mouvements_etoiles" ADD CONSTRAINT "mouvements_etoiles_type_action_id_types_actions_id_fk" FOREIGN KEY ("type_action_id") REFERENCES "public"."types_actions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mouvements_etoiles" ADD CONSTRAINT "mouvements_etoiles_participation_id_participations_id_fk" FOREIGN KEY ("participation_id") REFERENCES "public"."participations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mouvements_etoiles" ADD CONSTRAINT "mouvements_etoiles_filleul_id_membres_id_fk" FOREIGN KEY ("filleul_id") REFERENCES "public"."membres"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mouvements_etoiles" ADD CONSTRAINT "mouvements_etoiles_participation_id_unique" UNIQUE("participation_id");--> statement-breakpoint
ALTER TABLE "mouvements_etoiles" ADD CONSTRAINT "mouvements_etoiles_filleul_id_unique" UNIQUE("filleul_id");--> statement-breakpoint
-- Barème de départ : les étoiles sont ensuite réglées depuis l'admin.
INSERT INTO "types_actions" ("nom", "etoiles", "code") VALUES
	('Participation à un camping', 0, NULL),
	('Participation excursion', 0, NULL),
	('Participation activités culturelles', 0, NULL),
	('Parrainage membre', 1, 'parrainage');--> statement-breakpoint
INSERT INTO "parametres" ("cle", "valeur") VALUES ('prix_adhesion', '2500');
