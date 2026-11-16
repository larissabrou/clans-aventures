"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { estPageSuivie } from "@/lib/suivi";

const GTM_ID = "GTM-MV9FN88K";

/**
 * Google Tag Manager (extrait officiel). Les changements de page sans rechargement se suivent
 * dans GTM avec un déclencheur « Modification de l'historique » (History Change).
 */
export function GoogleTagManager() {
  const pathname = usePathname();

  // Arrivée directe sur l'admin : GTM n'est pas chargé.
  if (!estPageSuivie(pathname)) return null;

  return (
    <>
      <Script id="google-tag-manager" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`}
      </Script>
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
        />
      </noscript>
    </>
  );
}
