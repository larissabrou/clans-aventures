CREATE TABLE "envois" (
	"id" serial PRIMARY KEY NOT NULL,
	"titre" text NOT NULL,
	"contenu" text NOT NULL,
	"type" "type_message" DEFAULT 'info' NOT NULL,
	"cible" text NOT NULL,
	"destinataires" integer DEFAULT 0 NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "envoi_id" integer;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_envoi_id_envois_id_fk" FOREIGN KEY ("envoi_id") REFERENCES "public"."envois"("id") ON DELETE cascade ON UPDATE no action;