CREATE TABLE "univers_culturels" (
	"id" serial PRIMARY KEY NOT NULL,
	"nom" text NOT NULL,
	"actif" boolean DEFAULT true NOT NULL,
	"ordre" integer DEFAULT 0 NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "univers_culturels_nom_unique" UNIQUE("nom")
);
--> statement-breakpoint
-- Univers proposés jusqu'ici (anciennement écrits dans le code).
INSERT INTO "univers_culturels" ("nom", "ordre") VALUES
	('Univers Akan', 1),
	('Univers Krou', 2),
	('Univers Mandé', 3),
	('Univers Gur', 4),
	('Tous les univers', 5);--> statement-breakpoint
-- Les membres gardaient un code (« akan ») : on enregistre désormais le nom de l'univers.
UPDATE "membres" SET "univers_a_decouvrir" = CASE "univers_a_decouvrir"
	WHEN 'akan' THEN 'Univers Akan'
	WHEN 'krou' THEN 'Univers Krou'
	WHEN 'mande' THEN 'Univers Mandé'
	WHEN 'gur' THEN 'Univers Gur'
	WHEN 'tous' THEN 'Tous les univers'
	ELSE "univers_a_decouvrir"
END
WHERE "univers_a_decouvrir" IS NOT NULL;
