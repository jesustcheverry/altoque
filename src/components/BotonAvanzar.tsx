/* ============================================================
   Avanzar un trabajo
   ------------------------------------------------------------
   Igual que el botón de aceptar: este archivo no decide nada.
   Le dice a la base "pasá este trabajo a tal estado" y la base
   verifica si quien lo pide tiene derecho.

   Por eso el mismo botón sirve para el profesional y para el
   cliente: la diferencia no está acá, está en la función
   avanzar_trabajo.
   ============================================================ */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clienteNavegador } from "@/lib/supabase";

export default function BotonAvanzar({
  trabajoId,
  nuevo,
  texto,
  tono = "acento",
}: {
  trabajoId: string;
  nuevo: string;
  texto: string;
  tono?: "acento" | "marca" | "suave";
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const estilos = {
    acento: "bg-acento text-acento-tinta",
    marca: "bg-marca text-white",
    suave: "bg-fondo text-tinta-2 border border-linea",
  };

  async function avanzar() {
    setError(null);
    setEnviando(true);

    const supabase = clienteNavegador();
    const { error } = await supabase.rpc("avanzar_trabajo", {
      p_trabajo: trabajoId,
      p_nuevo: nuevo,
    });

    setEnviando(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.refresh();
  }

  return (
    <div>
      <button
        onClick={avanzar}
        disabled={enviando}
        className={`w-full rounded-xl py-3 text-cuerpo font-bold disabled:opacity-60 ${estilos[tono]}`}
      >
        {enviando ? "Un momento…" : texto}
      </button>
      {error && (
        <p className="mt-2 rounded-xl border border-alerta/30 bg-alerta-suave px-3 py-2 text-apoyo text-tinta-2">
          {error}
        </p>
      )}
    </div>
  );
}
