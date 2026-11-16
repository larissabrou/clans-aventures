"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// Identifiant public du pixel Meta (visible dans le code de toute page qui l'utilise).
const PIXEL_ID = "2505314090003466";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

// L'espace d'administration n'est pas suivi.
function estSuivi(pathname: string) {
  return !pathname.startsWith("/admin");
}

/**
 * Pixel Meta (Facebook). Le script officiel envoie le PageView du premier chargement ;
 * les navigations côté client (sans rechargement) sont signalées ici à chaque changement de page.
 */
export function FacebookPixel() {
  const pathname = usePathname();
  const pagePrecedente = useRef(pathname);

  useEffect(() => {
    if (pagePrecedente.current === pathname) return;
    pagePrecedente.current = pathname;
    if (estSuivi(pathname)) window.fbq?.("track", "PageView");
  }, [pathname]);

  // Arrivée directe sur l'admin : le pixel n'est pas chargé du tout.
  if (!estSuivi(pathname)) return null;

  return (
    <>
      <Script id="facebook-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${PIXEL_ID}');
fbq('track', 'PageView');`}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element -- pixel de suivi 1×1, pas une image affichée */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          alt=""
          src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}
