CREATE TABLE "images_evenements" (
	"evenement_id" integer PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"donnees" "bytea" NOT NULL,
	"taille" integer NOT NULL,
	"modifie_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "images_evenements" ADD CONSTRAINT "images_evenements_evenement_id_evenements_id_fk" FOREIGN KEY ("evenement_id") REFERENCES "public"."evenements"("id") ON DELETE cascade ON UPDATE no action;