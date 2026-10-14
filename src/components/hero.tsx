import { CtaLink } from "@/components/cta-link";
import { SiteHeader } from "@/components/site-header";

// Vidéos de fond (sans son, lues en boucle).
const FEU_DE_CAMP = "/videos/clans-aventures-presentation.mp4"; // portrait 360×640
const CAMPEMENT_HD = "/videos/clans-aventures-hero-hd.mp4"; // paysage 1920×1080 : tente, feu, lac

// Trois versions, la vidéo en fond dans tous les cas :
// - "blanc"      : feu de camp sous un voile blanc, logo coloré, textes foncés ;
// - "vert"       : feu de camp sous un voile vert forêt, logo blanc, textes clairs ;
// - "campement"  : campement de nuit en HD sous un voile léger, logo blanc, textes clairs ;
// - "barre"      : comme « campement », avec un en-tête sur barre blanche et le logo coloré.
// `entete` : style de l'en-tête ; `fond` : style du bouton (clair = bouton vert, sombre = bouton blanc).
const VERSIONS = {
  blanc: {
    video: FEU_DE_CAMP,
    cadrage: "object-center",
    entete: "clair",
    fond: "clair",
    section: "bg-white text-charbon",
    voile: "bg-linear-to-b from-white/85 via-white/70 to-white/90",
    marque: "text-foret",
    devise: "text-terre",
    description: "text-charbon/75",
    decouvrir: "text-charbon/60",
    trait: "bg-charbon/40",
  },
  vert: {
    video: FEU_DE_CAMP,
    cadrage: "object-center",
    entete: "sombre",
    fond: "sombre",
    section: "bg-charbon text-white",
    voile: "bg-linear-to-b from-foret/55 via-charbon/45 to-foret/85",
    marque: "",
    devise: "text-sable",
    description: "text-white/85",
    decouvrir: "text-white/70",
    trait: "bg-white",
  },
  campement: {
    video: CAMPEMENT_HD,
    // Sur écran étroit, garde la tente et le feu (à gauche de l'image) dans le cadre.
    cadrage: "object-[28%_center] md:object-center",
    entete: "sombre",
    fond: "sombre",
    section: "bg-charbon text-white",
    voile: "bg-linear-to-b from-charbon/50 via-charbon/25 to-charbon/75",
    marque: "",
    devise: "text-sable",
    description: "text-white/90",
    decouvrir: "text-white/70",
    trait: "bg-white",
  },
  barre: {
    video: CAMPEMENT_HD,
    cadrage: "object-[28%_center] md:object-center",
    entete: "barre",
    fond: "sombre",
    section: "bg-charbon text-white",
    // Le haut de la vidéo est sous la barre blanche : voile plus léger en haut.
    voile: "bg-linear-to-b from-charbon/30 via-charbon/25 to-charbon/75",
    marque: "",
    devise: "text-sable",
    description: "text-white/90",
    decouvrir: "text-white/70",
    trait: "bg-white",
  },
} as const;

export type VersionHero = keyof typeof VERSIONS;

export function Hero({ version }: { version: VersionHero }) {
  const v = VERSIONS[version];

  return (
    <section
      className={`relative flex min-h-svh items-center justify-center overflow-hidden text-center ${v.section}`}
    >
      <SiteHeader fond={v.entete} />

      <video
        className={`absolute inset-0 h-full w-full object-cover ${v.cadrage}`}
        src={v.video}
        autoPlay
        muted
        loop
        playsInline
        aria-hidden
      />
      <div className={`absolute inset-0 ${v.voile}`} />

      <div className="relative max-w-212 px-5 pt-24 pb-8 sm:px-6 sm:pt-28 sm:pb-10">
        <p
          className={`mb-2.5 font-titre text-[clamp(3rem,8vw,6.5rem)] leading-none font-semibold tracking-[3px] ${v.marque}`}
        >
          clans <span className="italic">aventures</span>
        </p>

        <p
          className={`mb-9 text-[clamp(1rem,2vw,1.35rem)] tracking-[2px] uppercase sm:tracking-[4px] ${v.devise}`}
        >
          Nature · Culture · Rencontres
        </p>

        <h1 className="mb-5 font-titre text-[clamp(2rem,5vw,4rem)] leading-[1.05] font-medium">
          Et si ta prochaine histoire commençait autour d’un feu ?
        </h1>

        <p
          className={`mx-auto mb-9 max-w-162 text-sm leading-7 sm:text-base sm:leading-8 ${v.description}`}
        >
          Une communauté africaine qui se retrouve, explore, partage et crée des
          souvenirs loin du quotidien.
          <br />
          Des campings. Des découvertes. Des rencontres. Des histoires.
        </p>

        <CtaLink href="#aventure" fond={v.fond}>
          Commencer l’aventure
        </CtaLink>
      </div>

      <div
        className={`absolute bottom-6 left-1/2 -translate-x-1/2 text-[0.7rem] tracking-[3px] uppercase ${v.decouvrir}`}
      >
        Découvrir
        <div className={`mx-auto mt-2 h-10 w-px animate-scroll-line ${v.trait}`} />
      </div>
    </section>
  );
}
