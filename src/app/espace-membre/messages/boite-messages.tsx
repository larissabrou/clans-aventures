"use client";

import { useState } from "react";
import { ArrowLeft, CheckCheck, Inbox, MailOpen } from "lucide-react";
import { useMessages, type Message } from "../messages-context";
import { TYPES_MESSAGES } from "../types-messages";

type Filtre = "tous" | "non-lus" | Message["type"];

/** Boîte de réception complète : filtres, liste et lecture (côte à côte sur grand écran). */
export function BoiteMessages({ selectionInitiale }: { selectionInitiale?: number }) {
  const { messages, nonLus, marquerCommeLu, toutMarquerCommeLu } = useMessages();
  const [filtre, setFiltre] = useState<Filtre>("tous");
  // Message demandé depuis l'accueil (?m=12) : ouvert d'emblée (le serveur l'a déjà marqué comme lu).
  const [ouvertId, setOuvertId] = useState<number | null>(
    messages.some((m) => m.id === selectionInitiale) ? (selectionInitiale ?? null) : null,
  );

  const ouvert = messages.find((m) => m.id === ouvertId) ?? null;
  const visibles = messages.filter((m) =>
    filtre === "tous" ? true : filtre === "non-lus" ? !m.lu : m.type === filtre,
  );

  function ouvrir(message: Message) {
    marquerCommeLu(message.id);
    setOuvertId(message.id);
  }

  const filtres: { valeur: Filtre; label: string; nombre: number }[] = [
    { valeur: "tous", label: "Tous", nombre: messages.length },
    { valeur: "non-lus", label: "Non lus", nombre: nonLus },
    ...(Object.keys(TYPES_MESSAGES) as Message["type"][]).map((type) => ({
      valeur: type,
      label: TYPES_MESSAGES[type].pluriel,
      nombre: messages.filter((m) => m.type === type).length,
    })),
  ];

  return (
    <div>
      {/* FILTRES */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrer les messages">
          {filtres
            .filter((f) => f.valeur === "tous" || f.valeur === "non-lus" || f.nombre > 0)
            .map((f) => (
              <button
                key={f.valeur}
                type="button"
                role="tab"
                aria-selected={filtre === f.valeur}
                onClick={() => setFiltre(f.valeur)}
                className={`rounded-full border px-4 py-1.5 text-sm transition ${
                  filtre === f.valeur
                    ? "border-sable bg-sable font-semibold text-charbon"
                    : "border-white/40 text-white/80 hover:border-sable hover:text-sable"
                }`}
              >
                {f.label}
                <span className={`ml-2 text-xs ${filtre === f.valeur ? "text-charbon/70" : "text-white/50"}`}>
                  {f.nombre}
                </span>
              </button>
            ))}
        </div>
        {nonLus > 0 && (
          <button
            type="button"
            onClick={toutMarquerCommeLu}
            className="inline-flex items-center gap-2 text-sm font-semibold text-sable transition hover:text-ivoire"
          >
            <CheckCheck className="size-4" />
            Tout marquer comme lu
          </button>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        {/* LISTE (cachée sur mobile pendant la lecture) */}
        <div className={ouvert ? "hidden lg:block" : ""}>
          {visibles.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-white p-10 text-center text-sm text-white/70">
              <Inbox className="size-8 text-sable" strokeWidth={1.5} />
              {filtre === "non-lus" ? "Tu as tout lu, bravo !" : "Aucun message ici pour le moment."}
            </div>
          ) : (
            <ul className="grid gap-3">
              {visibles.map((message) => {
                const { Icone, icone } = TYPES_MESSAGES[message.type];
                const actif = message.id === ouvertId;
                return (
                  <li key={message.id}>
                    <button
                      type="button"
                      onClick={() => ouvrir(message)}
                      aria-current={actif ? "true" : undefined}
                      className={`flex w-full gap-4 rounded-2xl border p-4 text-left transition ${
                        actif
                          ? "border-sable bg-white/10"
                          : message.lu
                            ? "border-white/40 hover:border-white hover:bg-white/5"
                            : "border-white bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${icone}`}>
                        <Icone className="size-5" strokeWidth={1.75} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-3">
                          <span className={`truncate ${message.lu ? "text-white/85" : "font-semibold text-white"}`}>
                            {message.titre}
                          </span>
                          {!message.lu && (
                            <span className="size-2.5 shrink-0 rounded-full bg-terre" aria-label="Non lu" />
                          )}
                        </span>
                        <span className="mt-1 line-clamp-2 block text-sm leading-6 text-white/60">
                          {message.contenu}
                        </span>
                        <span className="mt-2 block text-xs text-white/45">{message.date}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* LECTURE */}
        <div className={ouvert ? "" : "hidden lg:block"}>
          <div className="rounded-2xl border border-white lg:sticky lg:top-24">
            {ouvert ? (
              <article>
                <header className="border-b border-white/20 p-6 sm:p-8">
                  <button
                    type="button"
                    onClick={() => setOuvertId(null)}
                    className="mb-4 inline-flex items-center gap-2 text-sm text-sable hover:text-ivoire lg:hidden"
                  >
                    <ArrowLeft className="size-4" />
                    Tous les messages
                  </button>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${TYPES_MESSAGES[ouvert.type].pastille}`}
                  >
                    {TYPES_MESSAGES[ouvert.type].label}
                  </span>
                  <h2 className="mt-3 font-titre text-3xl leading-tight font-semibold">{ouvert.titre}</h2>
                  <p className="mt-2 text-xs text-white/50">{ouvert.date}</p>
                </header>
                <p className="p-6 text-[0.95rem] leading-8 whitespace-pre-line text-white/85 sm:p-8">
                  {ouvert.contenu}
                </p>
                <footer className="border-t border-white/20 px-6 py-4 text-xs text-white/45 sm:px-8">
                  L’équipe CLANS aventures
                </footer>
              </article>
            ) : (
              <div className="flex min-h-80 flex-col items-center justify-center gap-3 p-10 text-center text-sm text-white/60">
                <MailOpen className="size-10 text-sable" strokeWidth={1.25} />
                Sélectionne un message pour le lire.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
