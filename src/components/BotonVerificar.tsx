/* ============================================================
   Aprobar o rechazar un profesional
   ------------------------------------------------------------
   Los dos botones del revisor. Fijate que no hacen ningún
   update: llaman a verificar_profesional, que es una función
   de la base.

   ¿Por qué el rodeo? Porque un update desde acá lo puede imitar
   cualquiera desde la consola del navegador. La función, en
   cambio, pregunta primero si sos admin. El permiso no vive en
   este archivo, vive en la base.

   Fijate también que rechazar OBLIGA a escribir un motivo. Un
   rechazo sin explicación deja al profesional sin saber qué
   corregir, y lo perdés para siempre.
   ============================================================ */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clienteNavegador } from "@/lib/supabase";

export default function BotonVerificar({ perfilId }: { perfilId: string }) {
  const router = useRouter();
  const [rechazando, setRechazando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function decidir(decision: "verificado" | "rechazado") {
    setError(null);

    if (decision === "rechazado" && motivo.trim() === "") {
      setError("Escribí qué le falta antes de rechazar.");
      return;
    }

    setEnviando(true);
    const supabase = clienteNavegador();

    const { error } = await supabase.rpc("verificar_profesional", {
      p_perfil: perfilId,
      p_decision: decision,
      p_motivo: decision === "rechazado" ? motivo.trim() : null,
    });

    setEnviando(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.refresh();
  }

  if (rechazando) {
    return (
      <div className="mt-3 rounded-xl border border-alerta/30 bg-alerta-suave p-3">
        <b className="block text-apoyo font-semibold text-tinta">
          ¿Qué le falta?
        </b>
        <p className="mt-0.5 text-etiqueta leading-snug text-tinta-2">
          Esto lo va a leer el profesional. Sé concreto.
        </p>

        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={2}
          placeholder="La matrícula que cargaste no figura en el registro."
          className="mt-2 w-full resize-none rounded-lg border border-linea bg-white px-3 py-2 text-apoyo leading-relaxed text-tinta outline-none placeholder:text-tinta-3 focus:border-marca-2"
        />

        {error && (
          <p className="mt-1.5 text-etiqueta text-alerta">{error}</p>
        )}

        <div className="mt-2 flex gap-2">
          <button
            onClick={() => decidir("rechazado")}
            disabled={enviando}
            className="flex-1 rounded-lg bg-alerta py-2.5 text-apoyo font-bold text-white disabled:opacity-60"
          >
            {enviando ? "Enviando…" : "Confirmar rechazo"}
          </button>
          <button
            onClick={() => {
              setRechazando(false);
              setError(null);
            }}
            className="rounded-lg border border-linea bg-white px-3 py-2.5 text-apoyo font-semibold text-tinta-2"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3">
      {error && (
        <p className="mb-2 rounded-lg border border-alerta/30 bg-alerta-suave px-3 py-2 text-apoyo text-tinta-2">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => decidir("verificado")}
          disabled={enviando}
          className="flex-1 rounded-lg bg-ok py-2.5 text-cuerpo font-bold text-white disabled:opacity-60"
        >
          {enviando ? "Guardando…" : "Verificar"}
        </button>
        <button
          onClick={() => setRechazando(true)}
          disabled={enviando}
          className="rounded-lg border border-linea bg-white px-4 py-2.5 text-cuerpo font-semibold text-tinta-2"
        >
          Rechazar
        </button>
      </div>
    </div>
  );
}
