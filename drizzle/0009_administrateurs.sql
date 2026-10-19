CREATE TYPE "public"."role_admin" AS ENUM('super_admin', 'admin');--> statement-breakpoint
CREATE TABLE "administrateurs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"prenom" text NOT NULL,
	"nom" text DEFAULT '' NOT NULL,
	"role" "role_admin" DEFAULT 'admin' NOT NULL,
	"mot_de_passe_hash" text,
	"actif" boolean DEFAULT true NOT NULL,
	"derniere_connexion" timestamp with time zone,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "administrateurs_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "sessions_admin" (
	"id" text PRIMARY KEY NOT NULL,
	"admin_id" uuid NOT NULL,
	"expire_le" timestamp with time zone NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessions_admin" ADD CONSTRAINT "sessions_admin_admin_id_administrateurs_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."administrateurs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sessions_admin_admin_idx" ON "sessions_admin" USING btree ("admin_id");