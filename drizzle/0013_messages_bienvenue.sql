CREATE TABLE "messages_bienvenue" (
	"id" serial PRIMARY KEY NOT NULL,
	"titre" text NOT NULL,
	"contenu" text NOT NULL,
	"type" text DEFAULT 'info' NOT NULL,
	"ordre" integer DEFAULT 0 NOT NULL,
	"actif" boolean DEFAULT true NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clans" ADD COLUMN "salutation" text;--> statement-breakpoint
ALTER TABLE "clans" ADD COLUMN "lien_whatsapp" text;--> statement-breakpoint
ALTER TABLE "messages_bienvenue" ADD CONSTRAINT "messages_bienvenue_type_types_messages_cle_fk" FOREIGN KEY ("type") REFERENCES "public"."types_messages"("cle") ON DELETE set default ON UPDATE cascade;--> statement-breakpoint
-- Salutations de départ, d'après le nom des clans existants (modifiables dans l'admin).
UPDATE "clans" SET "salutation" = CASE
	WHEN "nom" ILIKE '%akan%' THEN 'AKWABA'
	WHEN "nom" ILIKE '%gur%' OR "nom" ILIKE '%gour%' THEN 'FOTAMANA'
	WHEN "nom" ILIKE '%mand%' THEN 'INITCHE'
	WHEN "nom" ILIKE '%krou%' THEN 'ASSê oh'
	ELSE "salutation"
END;--> statement-breakpoint
-- Messages de bienvenue de départ : les deux premiers reprennent ceux du site, les deux suivants
-- les textes fournis par CLANS (mission 01, modèle de présentation).
INSERT INTO "messages_bienvenue" ("titre", "contenu", "type", "ordre") VALUES
($$Bienvenue dans CLANS aventures, {prenom} !$$,
$$Tu viens officiellement de rejoindre une communauté où les cultures se rencontrent, où les aventures se vivent ensemble et où chaque rencontre peut devenir une histoire.

Ton numéro membre : {numero}.
Ton pin officiel CLANS te sera remis lors de ta première participation physique.

Ton aventure vient de commencer.$$, 'info', 1),
($$Rejoins le groupe WhatsApp de ton clan$$,
$${salutation} {prenom} !

Voici le lien pour rejoindre le groupe WhatsApp du clan {clan} :

{lien_whatsapp_clan}$$, 'info', 2),
($$Ta première mission CLANS$$,
$${salutation} au clan !

Félicitations, ton aventure commence !
Tu fais désormais partie d'une communauté où les cultures se rencontrent, les amitiés naissent et les expériences se partagent.
Mais avant de préparer ton sac à dos, il reste une petite mission…

MISSION 01 : FAIS TON ENTRÉE ET PRESENTE-TOI AU CLAN !

Dans CLANS, on n'aime pas les présentations ennuyeuses.
On veut découvrir ta personnalité, ton énergie et ce petit quelque chose qui te rend unique.
Pour cela, nous avons proposé notre modèle de présentation : un rituel de bienvenue aussi cool que convivial.

Comment faire ?
1. Copie le modèle que tu as reçu en message.
2. Personnalise tes réponses avec ton style et ton humour.
3. Rejoins les groupes WhatsApp officiels à l'aide des liens qui t'ont été communiqués.
4. Publie ta présentation et laisse les autres membres te souhaiter la bienvenue !

Le petit plus : accompagne ta présentation d'une photo sympa de toi.
Pas besoin de tout raconter : partage uniquement ceux avec quoi tu es à l'aise.

Prêt(e) à faire ton entrée ?
Le clan t'attend !

Nos cultures nous distinguent. Nos aventures nous rapprochent.$$, 'star', 3),
($$Ton modèle de présentation$$,
$$Nouveau membre !
Bonjour le CLAN !
Moi c'est ..., Oui, vous pouvez déjà faire comme si on se connaissait depuis longtemps.
Mon QG : Cocody, Abidjan.
Mon clan : Akan, (mais mon cœur a un visa pour tous les clans !  - Facultatif)
Dans la vraie vie : Je travaille dans le digital. Et hors boulot, je suis un explorateur de bons restaurants.
Mon énergie en 3 mots : Sociable, taquin, aventurier.
Je débarque chez CLANS pour : Rencontrer du beau monde, vivre des expériences inédites et agrandir mon cercle d'amis. Pour le reste, la vie fera son casting.
Mon aventure de rêve : Une nuit sous les étoiles, au bord d'une plage, avec un feu de camp et de bonnes conversations.
Mon petit côté décalé : Je danse très bien… dans ma tête. Mes pieds ne sont pas toujours d'accord.
À une soirée CLANS, vous me trouverez : Près du barbecue au début, au milieu des discussions ensuite.
Pour briser la glace, posez-moi cette question : « Si tu pouvais partir demain en aventure avec trois objets, tu prendrais quoi ? »
Voilà pour moi !
À très vite !$$, 'info', 4);
