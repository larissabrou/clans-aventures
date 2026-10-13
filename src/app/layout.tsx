import type { Metadata } from "next";
import { Cormorant_Garamond, Montserrat } from "next/font/google";
import "./globals.css";

// next/font télécharge les polices au build et les sert depuis notre domaine :
// aucune requête vers Google côté visiteur, et pas de saut de mise en page.
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "CLANS aventures — Commence ton aventure",
    template: "%s — CLANS aventures",
  },
  description:
    "CLANS aventures — Une communauté qui rassemble aventure, culture, rencontres et expériences en pleine nature.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${cormorant.variable} ${montserrat.variable} antialiased`}
    >
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
