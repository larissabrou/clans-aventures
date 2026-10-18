"use client";

import { useMessages } from "../messages-context";

/** « 3 messages non lus. », mis à jour dès qu'un message est lu. */
export function NombreNonLusTexte() {
  const { nonLus } = useMessages();
  if (nonLus === 0) return null;
  return (
    <strong className="text-sable">
      {nonLus} message{nonLus > 1 ? "s" : ""} non lu{nonLus > 1 ? "s" : ""}.
    </strong>
  );
}
