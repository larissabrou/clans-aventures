"use client";

import { useRef, useState } from "react";
import { Inbox, X } from "lucide-react";
import { buttonClasses } from "@/components/button-styles";
import { useMessages, type Message } from "./messages-context";

type TypeMessage = Message["type"];

const TYPES: Record<TypeMessage, { label: string; classes: string }> = {
  info: { label: "Information", classes: "bg-white/10 text-white" },
  event: { label: "Événement", classes: "bg-terre/40 text-white" },
  warning: { label: "Important", classes: "bg-bordeaux text-white" },
  star: { label: "Étoiles", classes: "bg-sable/25 text-sable" },
};

export function MessagesInbox() {
  const { messages, nonLus, marquerCommeLu } = useMessages();
  const [ouvert, setOuvert] = useState<Message | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  function ouvrir(message: Message) {
    marquerCommeLu(message.id);
    setOuvert(message);
    dialogRef.current?.showModal();
  }

  function fermer() {
    dialogRef.current?.close();
  }

  return (
    <div className="rounded-2xl border border-white p-5 text-white sm:p-7">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-titre text-xl font-semibold">
          <Inbox className="size-5 text-terre" strokeWidth={1.75} />
          Boîte de réception
        </h3>
        <span className="rounded-full bg-terre px-2.5 py-0.5 text-xs font-bold text-white">
          {nonLus}
        </span>
      </div>

      {messages.length === 0 ? (
        <p className="py-8 text-center text-sm text-white/60">
          Tu n’as aucun message pour le moment.
        </p>
      ) : (
        <ul className="grid gap-3">
          {messages.map((message) => (
            <li key={message.id}>
              <button
                type="button"
                onClick={() => ouvrir(message)}
                className={`w-full rounded-xl border-l-4 p-4 text-left transition hover:bg-white/10 ${
                  message.lu
                    ? "border-transparent ring-1 ring-white/30"
                    : "border-terre bg-white/5 ring-1 ring-white/30"
                }`}
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                  <span className="font-semibold">{message.titre}</span>
                  <span className="text-xs text-white/50">{message.date}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/70">
                  {message.contenu}
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold ${TYPES[message.type].classes}`}
                  >
                    {TYPES[message.type].label}
                  </span>
                  {!message.lu && (
                    <span className="text-xs font-semibold text-sable">
                      ● Nouveau message
                    </span>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Fenêtre de lecture : <dialog> natif, accessible au clavier (Échap pour fermer). */}
      <dialog
        ref={dialogRef}
        onClick={(e) => e.target === dialogRef.current && fermer()}
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl bg-white p-0 text-charbon backdrop:bg-charbon/60"
      >
        {ouvert && (
          <div>
            <div className="flex items-start justify-between gap-4 border-b border-terre/40 bg-charbon px-6 py-5 text-ivoire">
              <h3 className="font-titre text-2xl font-semibold">{ouvert.titre}</h3>
              <button
                type="button"
                onClick={fermer}
                aria-label="Fermer"
                className="rounded-lg p-1 hover:bg-white/10"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="px-6 py-5">
              <p className="mb-4 text-xs text-charbon/50">{ouvert.date}</p>
              <p className="text-sm leading-7 whitespace-pre-line">
                {ouvert.contenu}
              </p>
            </div>
            <div className="flex justify-end border-t border-charbon/10 px-6 py-4">
              <button
                type="button"
                onClick={fermer}
                className={buttonClasses("primary")}
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
