ALTER TABLE "codes_connexion" ALTER COLUMN "telephone" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "codes_connexion" ADD COLUMN "email" text;--> statement-breakpoint
CREATE INDEX "codes_email_idx" ON "codes_connexion" USING btree ("email");--> statement-breakpoint
CREATE INDEX "membres_email_idx" ON "membres" USING btree ("email");