import { CtaLink } from "@/components/cta-link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { UNIVERS } from "@/lib/univers";

// Hero sur fond blanc avec le logo coloré. Pour une vidéo plein écran, la mettre dans public/videos/
// et renseigner son chemin ici (ex. "/videos/camping-foret.mp4") : un voile blanc garde le texte lisible.
const HERO_VIDEO: string | null = null;

export default function HomePage() {
  return (
    <>
      <SiteHeader fond="clair" />

      <main>
        {/* HERO */}
        <section className="relative flex min-h-svh items-center justify-center overflow-hidden bg-white text-center text-charbon">
          {HERO_VIDEO && (
            <video
              className="absolute inset-0 h-full w-full object-cover"
              autoPlay
              muted
              loop
              playsInline
            >
              <source src={HERO_VIDEO} type="video/mp4" />
            </video>
          )}

          {HERO_VIDEO && <div className="absolute inset-0 bg-white/75" />}

          <div className="relative max-w-212 px-5 py-8 sm:px-6 sm:py-10">
            <p className="mb-2.5 font-titre text-[clamp(3rem,8vw,6.5rem)] leading-none font-semibold tracking-[3px] text-foret">
              clans <span className="italic">aventures</span>
            </p>

            <p className="mb-9 text-[clamp(1rem,2vw,1.35rem)] tracking-[2px] text-terre uppercase sm:tracking-[4px]">
              Nature · Culture · Rencontres
            </p>

            <h1 className="mb-5 font-titre text-[clamp(2rem,5vw,4rem)] leading-[1.05] font-medium">
              Et si ta prochaine histoire commençait autour d’un feu ?
            </h1>

            <p className="mx-auto mb-9 max-w-162 text-sm leading-7 text-charbon/75 sm:text-base sm:leading-8">
              Une communauté africaine qui se retrouve, explore, partage et crée
              des souvenirs loin du quotidien.
              <br />
              Des campings. Des découvertes. Des rencontres. Des histoires.
            </p>

            <CtaLink href="#aventure" fond="clair">
              Commencer l’aventure
            </CtaLink>
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[0.7rem] tracking-[3px] text-charbon/60 uppercase">
            Découvrir
            <div className="mx-auto mt-2 h-10 w-px animate-scroll-line bg-charbon/40" />
          </div>
        </section>

        {/* VIDÉO DE PRÉSENTATION (format portrait, sans son : lecture automatique en boucle) */}
        <section className="bg-foret px-6 py-20 sm:py-24">
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-12 md:flex-row md:justify-between">
            <div className="max-w-md text-center md:text-left">
              <p className="mb-4 text-xs tracking-[3px] text-sable uppercase">
                CLANS en images
              </p>
              <p className="font-titre text-[clamp(2.25rem,5vw,3.75rem)] leading-tight font-medium">
                Viens avec ta culture.
                <br />
                <span className="italic">Repars avec une histoire.</span>
              </p>
            </div>

            <video
              className="w-full max-w-72 rounded-3xl shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:max-w-80"
              src="/videos/clans-aventures-presentation.mp4"
              width={360}
              height={640}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label="Vidéo de présentation de CLANS aventures"
            />
          </div>
        </section>

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
            {UNIVERS.map(({ id, titre, texte, Icone }) => (
              <div
                key={id}
                className="rounded-2xl bg-white px-6 py-9 transition duration-300 hover:-translate-y-2"
              >
                <Icone
                  className="mx-auto mb-4 size-8 text-terre"
                  strokeWidth={1.5}
                  aria-hidden
                />
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
