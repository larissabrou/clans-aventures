"use client";

// Partage la liste des messages entre la boîte de réception, le badge du menu
// et la statistique « Messages non lus » : lire un message met tout à jour.
import { createContext, useContext, useState } from "react";
import type { TableauDeBord } from "@/lib/membres";
import { marquerLu } from "./actions";

export type Message = TableauDeBord["messages"][number];

type MessagesContextValue = {
  messages: Message[];
  nonLus: number;
  marquerCommeLu: (id: number) => void;
};

const MessagesContext = createContext<MessagesContextValue | null>(null);

export function MessagesProvider({
  initialMessages,
  children,
}: {
  initialMessages: Message[];
  children: React.ReactNode;
}) {
  const [messages, setMessages] = useState(initialMessages);

  function marquerCommeLu(id: number) {
    // Mise à jour immédiate à l'écran, puis enregistrement sur le serveur.
    if (messages.some((message) => message.id === id && !message.lu)) {
      void marquerLu(id);
    }
    setMessages((liste) =>
      liste.map((message) =>
        message.id === id ? { ...message, lu: true } : message,
      ),
    );
  }

  const nonLus = messages.filter((message) => !message.lu).length;

  return (
    <MessagesContext value={{ messages, nonLus, marquerCommeLu }}>
      {children}
    </MessagesContext>
  );
}

export function useMessages() {
  const context = useContext(MessagesContext);
  if (!context) {
    throw new Error("useMessages doit être utilisé dans <MessagesProvider>.");
  }
  return context;
}

export function NombreNonLus() {
  return <>{useMessages().nonLus}</>;
}
