/* ============================================================
   Aceptar un presupuesto
   ------------------------------------------------------------
   Fijate lo poco que hace este archivo. No cambia estados, no
   crea el trabajo, no calcula la comisión. Solo le dice a la
   base: "aceptá este presupuesto".

   Todo lo demás pasa adentro de la función aceptar_presupuesto,
   donde las cuatro cosas ocurren juntas o no ocurre ninguna. Si
   la pantalla intentara hacerlas de a una y se cortara internet
   en el medio, quedarían datos rotos para siempre.
   ============================================================ */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clienteNavegador } from "@/lib/supabase";

export default function BotonAceptar({
  presupuestoId,
}: {
  presupuestoId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function aceptar() {
    setError(null);
    setEnviando(true);

    const supabase = clienteNavegador();

    // "rpc" es llamar a una función que vive en la base.
    const { error } = await supabase.rpc("aceptar_presupuesto", {
      p_presupuesto: presupuestoId,
    });

    setEnviando(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.refresh();
  }

  return (
    <div className="mt-2">
      <button
        onClick={aceptar}
        disabled={enviando}
        className="w-full rounded-xl bg-acento py-3 text-[14px] font-bold text-acento-tinta disabled:opacity-60"
      >
        {enviando ? "Aceptando…" : "Aceptar y agendar"}
      </button>
      {error && (
        <p className="mt-2 rounded-xl border border-alerta/30 bg-alerta-suave px-3 py-2 text-[12px] text-tinta-2">
          {error}
        </p>
      )}
    </div>
  );
}
