import { membreConnecte } from "@/lib/auth";
import { photoMembre, reponsePhoto } from "@/lib/photos-membres";

// Photo de profil du membre connecté (et de lui seul).
export async function GET() {
  const membre = await membreConnecte();
  if (!membre) return new Response(null, { status: 401 });
  return reponsePhoto(await photoMembre(membre.id));
}
