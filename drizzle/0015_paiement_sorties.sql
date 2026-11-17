CREATE TABLE "paiements_sorties" (
	"reference" text PRIMARY KEY NOT NULL,
	"evenement_id" integer,
	"membre_id" uuid,
	"prenom" text,
	"nom" text,
	"telephone" text,
	"email" text,
	"evenement_titre" text NOT NULL,
	"evenement_date" timestamp with time zone NOT NULL,
	"montant" integer NOT NULL,
	"devise" text NOT NULL,
	"operateur" text NOT NULL,
	"pays" text NOT NULL,
	"telephone_debite" text NOT NULL,
	"statut" "statut_paiement" DEFAULT 'en_attente' NOT NULL,
	"derniere_reponse" jsonb,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"confirme_le" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "participations" ALTER COLUMN "membre_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "evenements" ADD COLUMN "publique" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "participations" ADD COLUMN "prenom" text;--> statement-breakpoint
ALTER TABLE "participations" ADD COLUMN "nom" text;--> statement-breakpoint
ALTER TABLE "participations" ADD COLUMN "telephone" text;--> statement-breakpoint
ALTER TABLE "participations" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "participations" ADD COLUMN "paiement_reference" text;--> statement-breakpoint
ALTER TABLE "paiements_sorties" ADD CONSTRAINT "paiements_sorties_evenement_id_evenements_id_fk" FOREIGN KEY ("evenement_id") REFERENCES "public"."evenements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paiements_sorties" ADD CONSTRAINT "paiements_sorties_membre_id_membres_id_fk" FOREIGN KEY ("membre_id") REFERENCES "public"."membres"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "paiements_sorties_evenement_idx" ON "paiements_sorties" USING btree ("evenement_id","statut");