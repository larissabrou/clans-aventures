// Styles de boutons partagés par <button> et <Link>.
const base =
  "inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-xs font-bold tracking-[1.5px] uppercase transition duration-300 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm";

const variants = {
  // Action principale sur fond clair.
  primary: "bg-foret text-ivoire hover:bg-terre",
  // Action secondaire (retour, annuler).
  secondary:
    "border border-charbon/20 text-charbon hover:border-charbon hover:bg-charbon/5",
};

export function buttonClasses(variant: keyof typeof variants = "primary") {
  return `${base} ${variants[variant]}`;
}
