CREATE TABLE "modeles_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"titre" text NOT NULL,
	"contenu" text NOT NULL,
	"type" text DEFAULT 'star' NOT NULL,
	"actif" boolean DEFAULT true NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "modeles_messages" ADD CONSTRAINT "modeles_messages_type_types_messages_cle_fk" FOREIGN KEY ("type") REFERENCES "public"."types_messages"("cle") ON DELETE set default ON UPDATE cascade;--> statement-breakpoint
-- Modèle de départ, modifiable dans l'admin (Modèles de messages).
INSERT INTO "modeles_messages" ("titre", "contenu", "type") VALUES
($$+{etoiles} étoile(s) pour toi, {prenom} !$$,
$$Bravo {prenom} ! 🎉

Tu gagnes {etoiles} étoile(s) CLANS pour : {action} {precision}

Ton nouveau solde : {solde} étoiles.
Continue comme ça, l’aventure ne fait que commencer !$$, 'star');
