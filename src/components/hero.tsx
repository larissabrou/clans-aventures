import { CtaLink } from "@/components/cta-link";
import { SiteHeader } from "@/components/site-header";

// Hero de l'accueil : en-tête sur barre blanche avec le logo complet, et en fond la vidéo HD
// du campement de nuit (tente, feu, lac ; paysage 1920×1080, sans son, lue en boucle).
const VIDEO_HERO = "/videos/clans-aventures-hero-hd.mp4";

export function Hero() {
  return (
    <section className="relative flex min-h-svh items-center justify-center overflow-hidden bg-charbon text-center text-white">
      <SiteHeader fond="barre" />

      <video
        // Sur écran étroit, garde la tente et le feu (à gauche de l'image) dans le cadre.
        className="absolute inset-0 h-full w-full object-cover object-[28%_center] md:object-center"
        src={VIDEO_HERO}
        autoPlay
        muted
        loop
        playsInline
        aria-hidden
      />
      {/* Voile léger pour la lisibilité du texte ; le haut est sous la barre blanche. */}
      <div className="absolute inset-0 bg-linear-to-b from-charbon/30 via-charbon/25 to-charbon/75" />

      {/* Le nom « clans aventures » est déjà dans le logo de l'en-tête : le hero commence par la devise. */}
      <div className="relative max-w-212 px-5 pt-28 pb-8 sm:px-6 sm:pt-32 sm:pb-10">
        <p className="mb-6 text-[clamp(1rem,2vw,1.35rem)] tracking-[2px] text-sable uppercase sm:tracking-[4px]">
          Nature · Culture · Rencontres
        </p>

        <h1 className="mb-5 font-titre text-[clamp(2rem,5vw,4rem)] leading-[1.05] font-medium">
          Et si ta prochaine histoire commençait autour d’un feu ?
        </h1>

        <p className="mx-auto mb-9 max-w-162 text-sm leading-7 text-white/90 sm:text-base sm:leading-8">
          Une communauté africaine qui se retrouve, explore, partage et crée des
          souvenirs loin du quotidien.
          <br />
          Des campings. Des découvertes. Des rencontres. Des histoires.
        </p>

        <CtaLink href="#aventure" fond="noir">
          Commencer l’aventure
        </CtaLink>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[0.7rem] tracking-[3px] text-white/70 uppercase">
        Découvrir
        <div className="mx-auto mt-2 h-10 w-px animate-scroll-line bg-white" />
      </div>
    </section>
  );
}
