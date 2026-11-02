ALTER TABLE "clans" ADD COLUMN "ordre" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Ordre de départ : l'ordre alphabétique affiché jusqu'ici.
UPDATE "clans" SET "ordre" = numerotes."rang"
FROM (SELECT "id", row_number() OVER (ORDER BY "nom") AS "rang" FROM "clans") AS numerotes
WHERE "clans"."id" = numerotes."id";
