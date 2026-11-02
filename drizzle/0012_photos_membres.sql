CREATE TABLE "photos_membres" (
	"membre_id" uuid PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"donnees" "bytea" NOT NULL,
	"taille" integer NOT NULL,
	"modifie_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "photos_membres" ADD CONSTRAINT "photos_membres_membre_id_membres_id_fk" FOREIGN KEY ("membre_id") REFERENCES "public"."membres"("id") ON DELETE cascade ON UPDATE no action;