/* ============================================================
   Las dos pestañas: Mi casa y Mi oficio
   ------------------------------------------------------------
   Una persona, dos lados. Esa fue la decisión del paso 1 y hasta
   ahora no se veía en ningún lado: estaba todo mezclado y había
   que adivinar en cuál de los dos mundos estabas parado.

   Dos cosas a propósito:

   1. "Mi oficio" se ve SIEMPRE, aunque no tengas ninguno. No es
      un descuido. Los mejores profesionales de una app así salen
      de sus propios usuarios: el vecino que la usó dos veces y
      le fue bien confía mucho más que cualquiera que llegue por
      un anuncio. Si le escondemos la puerta, no se entera nunca.
      Adentro no hay un formulario, hay una invitación.

   2. Si no entraste, no aparece nada. Alguien que llega por
      primera vez no necesita elegir un bando: necesita ver que
      puede pedir un presupuesto.
   ============================================================ */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const CASA = ["/", "/inmuebles", "/pedidos"];
const OFICIO = ["/profesional", "/trabajos", "/mis-trabajos"];

function pertenece(camino: string, lista: string[]) {
  return lista.some((base) =>
    base === "/" ? camino === "/" : camino === base || camino.startsWith(base + "/"),
  );
}

export default function Pestanias({ hayUsuario }: { hayUsuario: boolean }) {
  const camino = usePathname();

  if (!hayUsuario) return null;

  const enCasa = pertenece(camino, CASA);
  const enOficio = pertenece(camino, OFICIO);

  // Pantallas que no son de ninguno de los dos mundos (entrar,
  // registro, el panel de revisión): no llevan pestañas.
  if (!enCasa && !enOficio) return null;

  return (
    <nav className="mx-auto flex max-w-md bg-marca-noche">
      <Solapa href="/" activa={enCasa}>
        Mi casa
      </Solapa>
      <Solapa href="/profesional" activa={enOficio}>
        Mi oficio
      </Solapa>
    </nav>
  );
}

function Solapa({
  href,
  activa,
  children,
}: {
  href: string;
  activa: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex-1 border-b-[2.5px] py-3 text-center text-apoyo font-bold transition ${
        activa
          ? "border-acento text-white"
          : "border-transparent text-white/40 hover:text-white/70"
      }`}
    >
      {children}
    </Link>
  );
}
