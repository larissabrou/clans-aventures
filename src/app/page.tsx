import { CtaLink } from "@/components/cta-link";
import { SiteFooter } from "@/components/site-footer";
import { Hero } from "@/components/hero";
import { IconeUnivers } from "@/components/icone-univers";
import { UNIVERS } from "@/lib/univers";

export default function HomePage() {
  return (
    <>
      <main>
        <Hero />

        {/* EXPÉRIENCE */}
        <section
          id="aventure"
          className="bg-ivoire px-6 py-24 text-center text-charbon"
        >
          <p className="mb-4 text-xs tracking-[3px] uppercase opacity-70">
            Bienvenue chez CLANS
          </p>

          <h2 className="mb-6 font-titre text-[clamp(2.5rem,5vw,4rem)] leading-tight font-semibold">
            Ici, tu ne viens pas simplement camper.
          </h2>

          <p className="mx-auto max-w-187 leading-8">
            Tu viens vivre des expériences. Rencontrer des personnes. Découvrir
            nos cultures. Explorer la nature. Et peut-être repartir avec une
            nouvelle histoire à raconter.
            <br />
            <strong>
              <em>Alors descends encore et commence l’aventure.</em>
            </strong>
          </p>

          <div className="mx-auto mt-14 grid max-w-275 grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-5">
            {UNIVERS.map(({ id, titre, texte }) => (
              <div
                key={id}
                className="rounded-2xl bg-white px-6 py-9 transition duration-300 hover:-translate-y-2"
              >
                <IconeUnivers id={id} className="mx-auto mb-4 size-14" />
                <h3 className="mb-2.5 font-titre text-[1.7rem]">{titre}</h3>
                <p className="text-sm leading-7 opacity-75">{texte}</p>
              </div>
            ))}
          </div>
        </section>

        {/* APPEL FINAL */}
        <section className="bg-foret px-6 py-28 text-center">
          <h2 className="mb-5 font-titre text-[clamp(2.5rem,6vw,5rem)] leading-tight font-medium">
            Ton aventure commence ici.
          </h2>

          <p className="mx-auto mb-9 max-w-150 leading-8 opacity-80">
            Rejoins une communauté qui transforme chaque sortie en expérience,
            chaque rencontre en souvenir, et chaque aventure en histoire.
          </p>

          <CtaLink href="/inscription">Commencer l’aventure</CtaLink>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
