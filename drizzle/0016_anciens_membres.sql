CREATE TABLE "anciens_membres" (
	"id" serial PRIMARY KEY NOT NULL,
	"prenom" text NOT NULL,
	"nom" text NOT NULL,
	"email" text,
	"telephone" text,
	"numero" text,
	"adhere_le" timestamp with time zone,
	"charge_le" timestamp with time zone DEFAULT now() NOT NULL,
	"utilise_le" timestamp with time zone,
	"membre_id" uuid,
	"reconnu_par" text,
	"email_saisi" text
);
--> statement-breakpoint
ALTER TABLE "anciens_membres" ADD CONSTRAINT "anciens_membres_membre_id_membres_id_fk" FOREIGN KEY ("membre_id") REFERENCES "public"."membres"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "anciens_membres_email_idx" ON "anciens_membres" USING btree ("email");--> statement-breakpoint
CREATE INDEX "anciens_membres_telephone_idx" ON "anciens_membres" USING btree ("telephone");