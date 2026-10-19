"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { apparenceMessage } from "@/lib/apparence-messages";
import { useMessages } from "./messages-context";

const NOMBRE_APERCU = 3;

/** Les derniers messages sur l'accueil ; la lecture se fait sur la page Messages. */
export function ApercuMessages() {
  const { messages, nonLus } = useMessages();
  const derniers = messages.slice(0, NOMBRE_APERCU);

  return (
    <div className="rounded-2xl border border-white p-5 text-white sm:p-6">
      {derniers.length === 0 ? (
        <p className="py-4 text-center text-sm text-white/60">Tu n’as aucun message pour le moment.</p>
      ) : (
        <ul className="divide-y divide-white/15">
          {derniers.map((message) => {
            const { Icone, fondIcone } = apparenceMessage(message.couleur, message.icone);
            return (
              <li key={message.id}>
                <Link
                  href={`/espace-membre/messages?m=${message.id}`}
                  className="group flex items-center gap-4 py-3 first:pt-0"
                >
                  <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${fondIcone}`}>
                    <Icone className="size-[18px]" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate group-hover:text-sable ${message.lu ? "text-white/80" : "font-semibold"}`}
                    >
                      {message.titre}
                    </span>
                    <span className="block text-xs text-white/50">{message.date}</span>
                  </span>
                  {!message.lu && <span className="size-2.5 shrink-0 rounded-full bg-terre" aria-label="Non lu" />}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Link
        href="/espace-membre/messages"
        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-sable transition hover:text-ivoire"
      >
        Voir tous mes messages
        {nonLus > 0 && (
          <span className="rounded-full bg-terre px-2 py-0.5 text-xs text-white">
            {nonLus} non lu{nonLus > 1 ? "s" : ""}
          </span>
        )}
        <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}
