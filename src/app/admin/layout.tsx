import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Administration", template: "%s · Administration CLANS" },
  robots: { index: false, follow: false },
};

// Les pages protégées sont dans (gestion), dont la mise en page vérifie la session ;
// /admin/connexion reste accessible sans être connecté.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return children;
}
