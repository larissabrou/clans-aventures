CREATE TABLE "types_messages" (
	"cle" text PRIMARY KEY NOT NULL,
	"nom" text NOT NULL,
	"couleur" text DEFAULT 'neutre' NOT NULL,
	"icone" text DEFAULT 'info' NOT NULL,
	"systeme" boolean DEFAULT false NOT NULL,
	"actif" boolean DEFAULT true NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Les 4 types d'origine, utilisés par le site : ils doivent exister avant les clés étrangères.
INSERT INTO "types_messages" ("cle", "nom", "couleur", "icone", "systeme") VALUES
	('info', 'Information', 'neutre', 'info', true),
	('event', 'Événement', 'terre', 'calendrier', true),
	('warning', 'Important', 'bordeaux', 'alerte', true),
	('star', 'Étoiles', 'sable', 'etoile', true);--> statement-breakpoint
-- Ancien type énuméré → texte : la valeur par défaut (de type énuméré) est retirée avant la conversion.
ALTER TABLE "envois" ALTER COLUMN "type" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "envois" ALTER COLUMN "type" SET DATA TYPE text USING "type"::text;--> statement-breakpoint
ALTER TABLE "envois" ALTER COLUMN "type" SET DEFAULT 'info';--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "type" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "type" SET DATA TYPE text USING "type"::text;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "type" SET DEFAULT 'info';--> statement-breakpoint
ALTER TABLE "envois" ADD CONSTRAINT "envois_type_types_messages_cle_fk" FOREIGN KEY ("type") REFERENCES "public"."types_messages"("cle") ON DELETE set default ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_type_types_messages_cle_fk" FOREIGN KEY ("type") REFERENCES "public"."types_messages"("cle") ON DELETE set default ON UPDATE cascade;--> statement-breakpoint
DROP TYPE "public"."type_message";
