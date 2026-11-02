import type { NextRequest } from "next/server";
import { adminConnecte } from "@/lib/admin";
import { photoMembre, reponsePhoto } from "@/lib/photos-membres";

// Photo d'un membre, pour l'administration uniquement (la mise en page ne protège pas les routes).
export async function GET(_requete: NextRequest, ctx: RouteContext<"/admin/membres/[id]/photo">) {
  if (!(await adminConnecte())) return new Response(null, { status: 401 });
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response(null, { status: 404 });
  return reponsePhoto(await photoMembre(id));
}
