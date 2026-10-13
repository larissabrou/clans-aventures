"use server";

import { membreConnecte } from "@/lib/auth";
import { marquerMessageLu } from "@/lib/membres";

// Chaque action revérifie la session : elle ne fait jamais confiance au navigateur.
export async function marquerLu(messageId: number) {
  const membre = await membreConnecte();
  if (!membre || !Number.isInteger(messageId)) return;
  await marquerMessageLu(membre.id, messageId);
}
