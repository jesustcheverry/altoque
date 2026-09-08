/* ============================================================
   Layout raíz
   ------------------------------------------------------------
   Este archivo envuelve TODAS las pantallas de la app. Lo que
   pongas acá aparece en todos lados: las tipografías, el idioma
   de la página y el título que se ve en la pestaña del navegador.
   ============================================================ */

import type { Metadata } from "next";
import { Archivo, Public_Sans } from "next/font/google";
import "./globals.css";

// Next descarga estas fuentes de Google y las sirve desde tu propio
// servidor, así la app no depende de que Google esté disponible.
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-archivo",
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-public-sans",
});

// Esto es lo que ve Google y lo que aparece cuando alguien comparte
// el link de la app por WhatsApp.
export const metadata: Metadata = {
  title: "AlToque · oficios verificados cerca tuyo",
  description:
    "Encontrá electricistas, gasistas, plomeros y pintores matriculados en tu barrio. Pedí presupuesto y compará antes de decidir.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR">
      <body
        className={`${archivo.variable} ${publicSans.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
