import type { NextRequest } from "next/server";
import { imageEvenement } from "@/lib/images";

// Image d'un événement (stockée en base). L'URL porte ?v=<date de modification> :
// le navigateur peut la garder en cache longtemps, une nouvelle image change l'adresse.
export async function GET(_requete: NextRequest, ctx: RouteContext<"/api/evenements/[id]/image">) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return new Response(null, { status: 404 });

  const image = await imageEvenement(id);
  if (!image) return new Response(null, { status: 404 });

  return new Response(new Uint8Array(image.donnees), {
    headers: {
      "Content-Type": image.type,
      "Content-Length": String(image.donnees.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      // Le type annoncé a été vérifié à l'envoi : le navigateur ne doit pas en deviner un autre.
      "X-Content-Type-Options": "nosniff",
    },
  });
}
