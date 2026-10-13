import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ConnexionForm } from "./connexion-form";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connecte-toi à ton espace membre CLANS aventures.",
};

export default function ConnexionPage() {
  return (
    <>
      <SiteHeader variant="retour" />

      <main className="bg-ivoire">
        <section className="bg-foret px-6 pt-36 pb-32 text-center">
          <p className="mb-4 text-xs tracking-[3px] text-sable uppercase">Espace membre</p>
          <h1 className="font-titre text-[clamp(2.75rem,7vw,4.5rem)] leading-none font-medium">
            Bon retour <span className="italic">parmi nous.</span>
          </h1>
        </section>

        <div className="mx-auto -mt-20 max-w-md px-4 pb-24">
          <ConnexionForm />
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
