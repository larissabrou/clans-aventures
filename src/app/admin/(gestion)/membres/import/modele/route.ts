// Modèle Excel d'import des anciens membres, avec les valeurs acceptées (clans, univers…) à jour.
import { NextResponse, connection } from "next/server";
import { TRANCHES_AGE } from "@/lib/adhesion";
import { adminConnecte } from "@/lib/admin";
import { clansProposes } from "@/lib/clans";
import { modeleExcel } from "@/lib/import-membres/lecture";
import { UNIVERS } from "@/lib/univers";
import { universProposes } from "@/lib/univers-culturels";

export async function GET() {
  await connection();
  if (!(await adminConnecte())) {
    return NextResponse.json({ message: "Accès réservé à l'administration CLANS." }, { status: 401 });
  }

  const [clans, universCulturels] = await Promise.all([clansProposes(), universProposes()]);
  const fichier = await modeleExcel({
    tranches: TRANCHES_AGE.map((t) => t.label),
    univers: UNIVERS.map((u) => u.titre),
    clans: clans.map((c) => c.nom),
    universCulturels: universCulturels.map((u) => u.nom),
  });

  return new NextResponse(new Uint8Array(fichier), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="modele-import-membres-clans.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
