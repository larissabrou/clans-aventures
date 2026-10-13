// Mention de copyright, partagée par tous les pieds de page.
export function Copyright() {
  return (
    <p>
      © 2026{" "}
      <a
        href="https://10nastie-groupe.com/"
        target="_blank"
        rel="noopener"
        className="underline-offset-4 hover:underline"
      >
        10nastie Groupe &amp; Services
      </a>
    </p>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-charbon px-6 py-8 text-center text-xs leading-6 text-white/70">
      <p>Nos cultures nous distinguent. Nos aventures nous rapprochent.</p>
      <Copyright />
    </footer>
  );
}
