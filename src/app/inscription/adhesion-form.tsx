"use client";

// Composant client : il garde en mémoire l'étape et les réponses pendant que la personne remplit le parcours.
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  CreditCard,
  Info,
  LoaderCircle,
  Smartphone,
} from "lucide-react";
import { buttonClasses } from "@/components/button-styles";
import { IconeUnivers } from "@/components/icone-univers";
import {
  APPARTENANCES_CULTURELLES,
  AVANTAGES_ADHESION,
  PRIX_ADHESION,
  TRANCHES_AGE,
  UNIVERS_A_DECOUVRIR,
  formatFcfa,
} from "@/lib/adhesion";
import {
  type Operateur,
  type Pays,
  type ResultatPaiement,
} from "@/lib/paiement/operateurs";
import { UNIVERS, type Univers } from "@/lib/univers";
import { PaiementMobileMoney } from "./paiement-mobile-money";

type Etape = 1 | 2 | 3 | 4 | 5 | "succes";

type Donnees = {
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  ville: string;
  age: string;
  interets: Univers["id"][];
  appartenance: string;
  appartenanceAutre: string;
  universADecouvrir: string;
  attente: string;
  charteAcceptee: boolean;
  moyenPaiement: "mobile-money" | "carte";
  pays: Pays;
  operateur: Operateur;
  telephonePaiement: string;
};

// Paiement Mobile Money en attente de validation sur le téléphone (ou sur la page Wave).
type Paiement =
  | { etat: "inactif" }
  | { etat: "en-cours"; reference: string; instruction: string };

/** Retour de la page Wave : /inscription?paiement=retour&ref=…[&annule=1] */
export type RetourWave = { reference: string; annule: boolean };

const DONNEES_INITIALES: Donnees = {
  prenom: "",
  nom: "",
  email: "",
  telephone: "",
  ville: "",
  age: "",
  interets: [],
  appartenance: "",
  appartenanceAutre: "",
  universADecouvrir: "",
  attente: "",
  charteAcceptee: false,
  moyenPaiement: "mobile-money",
  pays: "CI",
  operateur: "orange",
  telephonePaiement: "",
};

const TOTAL_ETAPES = 5;

// Relecture du statut toutes les 3 s, pendant 3 minutes.
const INTERVALLE_STATUT_MS = 3000;
const MAX_TENTATIVES = 60;

const TITRES_ETAPES: Record<number, string> = {
  1: "Ton profil",
  2: "Tes intérêts",
  3: "Ton univers",
  4: "Validation",
  5: "Paiement",
};

const inputClasses =
  "w-full rounded-xl border border-charbon/15 bg-white px-4 py-3 text-sm text-charbon placeholder:text-charbon/40 focus:border-terre focus:ring-2 focus:ring-terre/20 focus:outline-none";

const labelClasses =
  "mb-2 block text-xs font-semibold tracking-[1px] text-charbon/70 uppercase";

function libelle(options: { value: string; label: string }[], value: string) {
  return options.find((option) => option.value === value)?.label;
}

export function AdhesionForm({ retourWave }: { retourWave?: RetourWave }) {
  const reprise = retourWave && !retourWave.annule ? retourWave : undefined;

  const [etape, setEtape] = useState<Etape>(reprise ? 5 : 1);
  const [donnees, setDonnees] = useState<Donnees>(
    reprise ? { ...DONNEES_INITIALES, operateur: "wave" } : DONNEES_INITIALES,
  );
  const [erreur, setErreur] = useState<string | null>(
    retourWave?.annule
      ? "Le paiement Wave a été annulé. Reprends ton adhésion : tes réponses n’ont pas été conservées."
      : null,
  );
  const [paiementEnCours, setPaiementEnCours] = useState(false);
  const [paiement, setPaiement] = useState<Paiement>(
    reprise
      ? { etat: "en-cours", reference: reprise.reference, instruction: "Nous vérifions ton paiement Wave." }
      : { etat: "inactif" },
  );
  const [tentative, setTentative] = useState(0);

  function maj<K extends keyof Donnees>(champ: K, valeur: Donnees[K]) {
    setDonnees((precedentes) => ({ ...precedentes, [champ]: valeur }));
  }

  function basculerInteret(id: Univers["id"]) {
    maj(
      "interets",
      donnees.interets.includes(id)
        ? donnees.interets.filter((interet) => interet !== id)
        : [...donnees.interets, id],
    );
  }

  function allerA(cible: Etape) {
    setErreur(null);
    setEtape(cible);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Renvoie un message d'erreur si l'étape courante n'est pas complète.
  function verifierEtape(): string | null {
    if (etape === 1) {
      const { prenom, nom, email, telephone, age } = donnees;
      if (!prenom.trim() || !nom.trim() || !email.trim() || !telephone.trim() || !age) {
        return "Merci de compléter tous les champs marqués d’un astérisque.";
      }
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
        return "Ton adresse email ne semble pas valide.";
      }
    }
    if (etape === 2 && donnees.interets.length === 0) {
      return "Sélectionne au moins un univers qui t’intéresse.";
    }
    if (etape === 3 && !donnees.appartenance) {
      return "Merci d’indiquer ton univers culturel.";
    }
    if (etape === 4 && !donnees.charteAcceptee) {
      return "Tu dois accepter la charte de CLANS aventures pour continuer.";
    }
    return null;
  }

  function suivant() {
    const message = verifierEtape();
    if (message) {
      setErreur(message);
      return;
    }
    if (etape === 4 && !donnees.telephonePaiement) {
      // Le numéro WhatsApp est souvent aussi le numéro Mobile Money.
      maj("telephonePaiement", donnees.telephone);
    }
    if (typeof etape === "number" && etape < TOTAL_ETAPES) {
      allerA((etape + 1) as Etape);
    }
  }

  function precedent() {
    if (typeof etape === "number" && etape > 1) {
      allerA((etape - 1) as Etape);
    }
  }

  // Lance le paiement sur le Payment Gateway (la passerelle Mobile Money de Czotick).
  async function payer() {
    if (donnees.moyenPaiement !== "mobile-money") {
      setErreur("Le paiement par carte arrive bientôt : choisis Mobile Money pour l’instant.");
      return;
    }
    if (donnees.telephonePaiement.replace(/\D/g, "").length < 8) {
      setErreur("Indique le numéro Mobile Money à débiter.");
      return;
    }

    setErreur(null);
    setPaiementEnCours(true);
    try {
      const reponse = await fetch("/api/paiement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Tout le profil est envoyé : le serveur l'enregistre avant de lancer le paiement.
        body: JSON.stringify({
          prenom: donnees.prenom,
          nom: donnees.nom,
          email: donnees.email,
          telephone: donnees.telephone,
          ville: donnees.ville,
          age: donnees.age,
          interets: donnees.interets,
          appartenance: donnees.appartenance,
          appartenanceAutre: donnees.appartenanceAutre,
          universADecouvrir: donnees.universADecouvrir,
          attente: donnees.attente,
          charteAcceptee: donnees.charteAcceptee,
          pays: donnees.pays,
          operateur: donnees.operateur,
          telephonePaiement: donnees.telephonePaiement,
        }),
      });
      const resultat = (await reponse.json().catch(() => null)) as ResultatPaiement | null;

      if (resultat?.statut === "redirect") {
        window.location.assign(resultat.url);
        return;
      }
      if (resultat?.statut === "paid") {
        allerA("succes");
        return;
      }
      if (resultat?.statut === "pending") {
        setTentative(0);
        setPaiement({ etat: "en-cours", reference: resultat.reference, instruction: resultat.instruction });
        return;
      }
      setErreur(
        (resultat && "message" in resultat && resultat.message) ||
          "Le paiement n’a pas pu être lancé. Réessaie ou choisis un autre opérateur.",
      );
    } catch {
      setErreur("Connexion impossible. Vérifie ton réseau et réessaie.");
    } finally {
      setPaiementEnCours(false);
    }
  }

  // Tant que le paiement est en cours, relit son statut jusqu'à confirmation, refus ou délai dépassé.
  useEffect(() => {
    if (paiement.etat !== "en-cours") return;
    const { reference } = paiement;
    let tentatives = 0;
    let actif = true;

    const minuteur = setInterval(async () => {
      tentatives += 1;
      if (tentatives > MAX_TENTATIVES) {
        clearInterval(minuteur);
        setPaiement({ etat: "inactif" });
        setErreur(
          `Nous n’avons pas encore reçu la confirmation. Si tu as validé le paiement, écris-nous sur WhatsApp avec la référence ${reference} ; sinon, relance-le.`,
        );
        return;
      }
      try {
        const reponse = await fetch(`/api/paiement/${encodeURIComponent(reference)}`, { cache: "no-store" });
        if (!reponse.ok || !actif) return; // erreur passagère : on réessaie
        const resultat = (await reponse.json()) as ResultatPaiement;
        if (!actif) return;

        if (resultat.statut === "paid") {
          clearInterval(minuteur);
          setPaiement({ etat: "inactif" });
          setErreur(null);
          setEtape("succes");
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else if (resultat.statut === "failed" || resultat.statut === "error") {
          clearInterval(minuteur);
          setPaiement({ etat: "inactif" });
          setErreur(resultat.message);
        } else {
          setTentative(tentatives);
        }
      } catch {
        // réseau instable : on réessaie au prochain tour
      }
    }, INTERVALLE_STATUT_MS);

    return () => {
      actif = false;
      clearInterval(minuteur);
    };
  }, [paiement]);

  const pourcentage =
    etape === "succes" ? 100 : (etape / TOTAL_ETAPES) * 100;

  return (
    <div className="overflow-hidden rounded-3xl bg-white text-charbon shadow-[0_30px_80px_rgba(32,32,29,0.18)]">
      {/* PROGRESSION */}
      <div className="border-b border-charbon/10 px-6 pt-6 pb-5 sm:px-10">
        <div className="mb-3 flex items-center justify-between text-xs font-semibold tracking-[1.5px] uppercase">
          <span className="text-charbon/70">
            {etape === "succes" ? "Bienvenue" : TITRES_ETAPES[etape]}
          </span>
          <span className="text-terre">
            {etape === "succes"
              ? "✓"
              : `${String(etape).padStart(2, "0")} / ${String(TOTAL_ETAPES).padStart(2, "0")}`}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-sable/40">
          <div
            className="h-full rounded-full bg-terre transition-[width] duration-500"
            style={{ width: `${pourcentage}%` }}
          />
        </div>
      </div>

      <div className="px-6 py-8 sm:px-10 sm:py-10">
        {/* ÉTAPE 1 */}
        {etape === 1 && (
          <section>
            <EnteteEtape
              numero={1}
              titre="Faisons connaissance."
              texte="Commençons simplement. Ces informations nous permettront de créer ton profil membre."
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <Champ label="Prénom" id="prenom" requis>
                <input
                  id="prenom"
                  className={inputClasses}
                  placeholder="Ton prénom"
                  autoComplete="given-name"
                  value={donnees.prenom}
                  onChange={(e) => maj("prenom", e.target.value)}
                />
              </Champ>
              <Champ label="Nom" id="nom" requis>
                <input
                  id="nom"
                  className={inputClasses}
                  placeholder="Ton nom"
                  autoComplete="family-name"
                  value={donnees.nom}
                  onChange={(e) => maj("nom", e.target.value)}
                />
              </Champ>
              <Champ label="Email" id="email" requis>
                <input
                  id="email"
                  type="email"
                  className={inputClasses}
                  placeholder="ton@email.com"
                  autoComplete="email"
                  value={donnees.email}
                  onChange={(e) => maj("email", e.target.value)}
                />
              </Champ>
              <Champ label="Téléphone (WhatsApp)" id="telephone" requis>
                <input
                  id="telephone"
                  type="tel"
                  className={inputClasses}
                  placeholder="+225 07 00 00 00 00"
                  autoComplete="tel"
                  value={donnees.telephone}
                  onChange={(e) => maj("telephone", e.target.value)}
                />
              </Champ>
              <Champ label="Ville de résidence" id="ville">
                <input
                  id="ville"
                  className={inputClasses}
                  placeholder="Abidjan"
                  autoComplete="address-level2"
                  value={donnees.ville}
                  onChange={(e) => maj("ville", e.target.value)}
                />
              </Champ>
              <Champ label="Tranche d’âge" id="age" requis>
                <select
                  id="age"
                  className={inputClasses}
                  value={donnees.age}
                  onChange={(e) => maj("age", e.target.value)}
                >
                  <option value="">Sélectionner</option>
                  {TRANCHES_AGE.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Champ>
            </div>
          </section>
        )}

        {/* ÉTAPE 2 */}
        {etape === 2 && (
          <section>
            <EnteteEtape
              numero={2}
              titre="Qu’est-ce qui t’attire ?"
              texte="CLANS rassemble plusieurs univers. Dis-nous ce que tu aimerais vivre."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              {UNIVERS.map(({ id, titre, texte }) => {
                const choisi = donnees.interets.includes(id);
                return (
                  <label
                    key={id}
                    className={`relative flex cursor-pointer gap-4 rounded-2xl border p-5 transition ${
                      choisi
                        ? "border-terre bg-sable/25"
                        : "border-charbon/15 hover:border-charbon/40"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={choisi}
                      onChange={() => basculerInteret(id)}
                    />
                    <IconeUnivers id={id} className="size-10 shrink-0" />
                    <span>
                      <strong className="mb-1 block font-titre text-xl">
                        {titre}
                      </strong>
                      <span className="text-sm leading-6 text-charbon/70">
                        {texte}
                      </span>
                    </span>
                    {choisi && (
                      <Check className="absolute top-4 right-4 size-4 text-terre" />
                    )}
                  </label>
                );
              })}
            </div>
          </section>
        )}

        {/* ÉTAPE 3 */}
        {etape === 3 && (
          <section>
            <EnteteEtape
              numero={3}
              titre="Ton univers culturel."
              texte="CLANS valorise les cultures qui composent notre richesse. Les questions marquées d’un astérisque sont obligatoires."
            />
            <div className="grid gap-5">
              <Champ
                label="À quel univers culturel te sens-tu rattaché·e ?"
                id="appartenance"
                requis
              >
                <select
                  id="appartenance"
                  className={inputClasses}
                  value={donnees.appartenance}
                  onChange={(e) => maj("appartenance", e.target.value)}
                >
                  <option value="">Sélectionner</option>
                  {APPARTENANCES_CULTURELLES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Champ>

              {donnees.appartenance === "autre" && (
                <Champ label="Précise ton horizon culturel" id="appartenanceAutre">
                  <input
                    id="appartenanceAutre"
                    className={inputClasses}
                    value={donnees.appartenanceAutre}
                    onChange={(e) => maj("appartenanceAutre", e.target.value)}
                  />
                </Champ>
              )}

              <p className="flex gap-3 rounded-xl bg-ivoire px-4 py-3 text-sm leading-6 text-charbon/80">
                <Info className="mt-0.5 size-4 shrink-0 text-foret" />
                Ton identité culturelle peut nous aider à mieux organiser les
                clans, mais elle ne définit pas ta place dans CLANS.
              </p>

              <Champ
                label="Clan / univers que tu souhaites découvrir"
                id="universADecouvrir"
              >
                <select
                  id="universADecouvrir"
                  className={inputClasses}
                  value={donnees.universADecouvrir}
                  onChange={(e) => maj("universADecouvrir", e.target.value)}
                >
                  <option value="">Je souhaite découvrir</option>
                  {UNIVERS_A_DECOUVRIR.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Champ>

              <Champ label="Qu’aimerais-tu vivre avec CLANS ?" id="attente">
                <textarea
                  id="attente"
                  rows={4}
                  className={inputClasses}
                  placeholder="Parle-nous de ce que tu recherches…"
                  value={donnees.attente}
                  onChange={(e) => maj("attente", e.target.value)}
                />
              </Champ>
            </div>
          </section>
        )}

        {/* ÉTAPE 4 */}
        {etape === 4 && (
          <section>
            <EnteteEtape
              numero={4}
              titre="Vérifie ton adhésion."
              texte="Voici le récapitulatif des informations que tu nous as communiquées."
            />
            <dl className="divide-y divide-charbon/10 rounded-2xl bg-ivoire px-5">
              <LigneRecap label="Nom" valeur={`${donnees.prenom} ${donnees.nom}`} />
              <LigneRecap label="Email" valeur={donnees.email} />
              <LigneRecap label="Téléphone" valeur={donnees.telephone} />
              <LigneRecap label="Ville" valeur={donnees.ville} />
              <LigneRecap
                label="Tranche d’âge"
                valeur={libelle(TRANCHES_AGE, donnees.age)}
              />
              <LigneRecap
                label="Intérêts"
                valeur={UNIVERS.filter((u) => donnees.interets.includes(u.id))
                  .map((u) => u.titre)
                  .join(", ")}
              />
              <LigneRecap
                label="Univers culturel"
                valeur={
                  donnees.appartenance === "autre"
                    ? donnees.appartenanceAutre || "Autres horizons"
                    : libelle(APPARTENANCES_CULTURELLES, donnees.appartenance)
                }
              />
              <LigneRecap
                label="À découvrir"
                valeur={libelle(UNIVERS_A_DECOUVRIR, donnees.universADecouvrir)}
              />
            </dl>

            <label className="mt-6 flex cursor-pointer gap-3 text-sm leading-6 text-charbon/80">
              <input
                type="checkbox"
                className="mt-1 size-4 shrink-0 accent-foret"
                checked={donnees.charteAcceptee}
                onChange={(e) => maj("charteAcceptee", e.target.checked)}
              />
              <span>
                Je reconnais avoir pris connaissance de la{" "}
                <a
                  href="/documents/charte-clans-aventures.pdf"
                  download="Charte CLANS aventures.pdf"
                  className="font-bold text-foret underline underline-offset-4 hover:text-terre"
                >
                  charte de CLANS aventures
                </a>{" "}
                et j’accepte de respecter les valeurs, règles et principes de la
                communauté.
              </span>
            </label>
          </section>
        )}

        {/* ÉTAPE 5 */}
        {etape === 5 && (
          <section>
            <EnteteEtape
              numero={5}
              titre="Ton aventure commence."
              texte="Il ne te reste qu’une étape pour entrer officiellement dans l’aventure."
            />

            <div className="rounded-2xl bg-foret p-6 text-ivoire sm:p-8">
              <p className="text-xs font-semibold tracking-[3px] text-sable uppercase">
                Adhésion CLANS
              </p>
              <p className="mt-2 font-titre text-2xl italic">
                Une adhésion. Une communauté. Une aventure à vie.
              </p>
              <p className="mt-5 flex items-baseline gap-2">
                <strong className="font-titre text-6xl font-semibold">
                  {formatFcfa(PRIX_ADHESION)}
                </strong>
                <span className="text-sm font-semibold tracking-[2px] uppercase">
                  FCFA · à vie
                </span>
              </p>
              <ul className="mt-6 grid gap-3 text-sm leading-6 text-ivoire/90">
                {AVANTAGES_ADHESION.map((avantage) => (
                  <li key={avantage} className="flex gap-3">
                    <Check className="mt-1 size-4 shrink-0 text-sable" />
                    {avantage}
                  </li>
                ))}
              </ul>
            </div>

            {paiement.etat === "en-cours" ? (
              <div
                role="status"
                aria-live="polite"
                className="mt-6 flex gap-4 rounded-2xl border border-terre/40 bg-sable/20 p-5"
              >
                <LoaderCircle className="mt-1 size-5 shrink-0 animate-spin text-terre" />
                <div className="text-sm leading-6">
                  <p className="font-semibold text-charbon">{paiement.instruction}</p>
                  <p className="mt-1 text-charbon/70">
                    Vérification en cours
                    {tentative > 0 && ` (${tentative}/${MAX_TENTATIVES})`}… Ne
                    ferme pas cette page.
                  </p>
                  <p className="mt-2 text-xs text-charbon/50">
                    Référence : {paiement.reference}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <fieldset className="mt-6">
                  <legend className={labelClasses}>Moyen de paiement</legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <MoyenPaiement
                      actif={donnees.moyenPaiement === "mobile-money"}
                      onChoisir={() => maj("moyenPaiement", "mobile-money")}
                      Icone={Smartphone}
                      titre="Mobile Money"
                      detail="Orange, MTN, Moov, Wave"
                    />
                    <MoyenPaiement
                      actif={donnees.moyenPaiement === "carte"}
                      onChoisir={() => maj("moyenPaiement", "carte")}
                      Icone={CreditCard}
                      titre="Carte bancaire"
                      detail="Bientôt disponible"
                      desactive
                    />
                  </div>
                </fieldset>

                {donnees.moyenPaiement === "mobile-money" && (
                  <PaiementMobileMoney
                    pays={donnees.pays}
                    operateur={donnees.operateur}
                    telephone={donnees.telephonePaiement}
                    onPays={(pays) => maj("pays", pays)}
                    onOperateur={(operateur) => maj("operateur", operateur)}
                    onTelephone={(telephone) => maj("telephonePaiement", telephone)}
                  />
                )}

                <p className="mt-4 text-xs leading-5 text-charbon/60">
                  Paiement sécurisé par notre passerelle Mobile Money. Le
                  montant est débité sur le numéro indiqué, après validation
                  sur ton téléphone.
                </p>
              </>
            )}
          </section>
        )}

        {/* SUCCÈS */}
        {etape === "succes" && (
          <section className="animate-apparition py-4 text-center">
            <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-foret">
              <Check className="size-9 text-sable" strokeWidth={2.5} />
            </div>
            <h2 className="font-titre text-4xl font-semibold sm:text-5xl">
              Bienvenue dans CLANS{donnees.prenom ? `, ${donnees.prenom}` : ""} !
            </h2>
            <p className="mx-auto mt-4 max-w-md leading-7 text-charbon/75">
              Tu viens officiellement de rejoindre une communauté où les
              cultures se rencontrent et où chaque rencontre peut devenir une
              histoire. Ton aventure vient de commencer.
            </p>

            <div className="mx-auto mt-8 grid max-w-md gap-3 text-left text-sm leading-6">
              <p className="flex gap-3 rounded-xl bg-bordeaux px-4 py-3 text-ivoire">
                <BadgeCheck className="mt-0.5 size-5 shrink-0 text-sable" />
                <span>
                  Ton <strong>pin officiel CLANS</strong> te sera remis lors de
                  ta première participation physique.
                </span>
              </p>
              <p className="flex gap-3 rounded-xl bg-ivoire px-4 py-3">
                <Smartphone className="mt-0.5 size-5 shrink-0 text-foret" />
                <span>
                  Tu vas recevoir par email ton mot de passe d’accès à ton espace membre. Les liens des
                  groupes qui te correspondent t’attendent dans ton espace.
                </span>
              </p>
            </div>

            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/espace-membre" className={buttonClasses("primary")}>
                Découvrir mon espace
                <ArrowRight className="size-4" />
              </Link>
              <Link href="/" className={buttonClasses("secondary")}>
                Retour à l’accueil
              </Link>
            </div>
          </section>
        )}

        {/* ERREUR + BOUTONS */}
        {etape !== "succes" && (
          <>
            <p
              role="alert"
              className="mt-6 min-h-6 text-sm font-medium text-bordeaux"
            >
              {erreur}
            </p>

            <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              {etape > 1 && paiement.etat === "inactif" ? (
                <button
                  type="button"
                  onClick={precedent}
                  className={buttonClasses("secondary")}
                >
                  <ArrowLeft className="size-4" />
                  Retour
                </button>
              ) : (
                <span />
              )}

              {etape < TOTAL_ETAPES ? (
                <button
                  type="button"
                  onClick={suivant}
                  className={buttonClasses("primary")}
                >
                  {etape === 4 ? "Passer au paiement" : "Continuer"}
                  <ArrowRight className="size-4" />
                </button>
              ) : paiement.etat === "en-cours" ? (
                <button
                  type="button"
                  onClick={() => setPaiement({ etat: "inactif" })}
                  className={buttonClasses("secondary")}
                >
                  Changer de moyen de paiement
                </button>
              ) : (
                <button
                  type="button"
                  onClick={payer}
                  disabled={paiementEnCours}
                  className={buttonClasses("primary")}
                >
                  {paiementEnCours ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" />
                      Traitement…
                    </>
                  ) : (
                    <>
                      Je rejoins CLANS · {formatFcfa(PRIX_ADHESION)} FCFA
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EnteteEtape({
  numero,
  titre,
  texte,
}: {
  numero: number;
  titre: string;
  texte: string;
}) {
  return (
    <header className="mb-8">
      <small className="text-xs font-semibold tracking-[3px] text-terre uppercase">
        Étape {String(numero).padStart(2, "0")}
      </small>
      <h2 className="mt-2 font-titre text-4xl leading-tight font-semibold">
        {titre}
      </h2>
      <p className="mt-2 leading-7 text-charbon/70">{texte}</p>
    </header>
  );
}

function Champ({
  label,
  id,
  requis = false,
  children,
}: {
  label: string;
  id: string;
  requis?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClasses}>
        {label}
        {requis && (
          <span className="ml-1 text-bordeaux" title="Obligatoire" aria-label="obligatoire">
            *
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

function LigneRecap({ label, valeur }: { label: string; valeur?: string }) {
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:justify-between sm:gap-6">
      <dt className="text-xs font-semibold tracking-[1px] text-charbon/60 uppercase">
        {label}
      </dt>
      <dd className="text-sm font-medium sm:text-right">
        {valeur?.trim() || "Non renseigné"}
      </dd>
    </div>
  );
}

function MoyenPaiement({
  actif,
  onChoisir,
  Icone,
  titre,
  detail,
  desactive = false,
}: {
  actif: boolean;
  onChoisir: () => void;
  Icone: typeof Smartphone;
  titre: string;
  detail: string;
  desactive?: boolean;
}) {
  return (
    <label
      className={`flex items-center gap-4 rounded-2xl border p-4 transition ${
        desactive
          ? "cursor-not-allowed border-charbon/10 opacity-60"
          : actif
            ? "cursor-pointer border-terre bg-sable/25"
            : "cursor-pointer border-charbon/15 hover:border-charbon/40"
      }`}
    >
      <input
        type="radio"
        name="moyenPaiement"
        className="sr-only"
        checked={actif}
        disabled={desactive}
        onChange={onChoisir}
      />
      <Icone className="size-6 shrink-0 text-terre" strokeWidth={1.5} />
      <span>
        <strong className="block text-sm">{titre}</strong>
        <span className="text-xs text-charbon/60">{detail}</span>
      </span>
    </label>
  );
}
