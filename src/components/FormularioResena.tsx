/* ============================================================
   Calificar un trabajo
   ------------------------------------------------------------
   La reseña es lo único que hace que un vecino elija a un
   profesional y no a otro. Sin esto, el perfil público que
   armamos muestra un casillero vacío para siempre.

   Las estrellas son obligatorias; el texto no. Mucha gente
   califica y no escribe, y forzarla a escribir hace que no
   califique.
   ============================================================ */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clienteNavegador } from "@/lib/supabase";

const AYUDAS: Record<number, string> = {
  1: "Muy mal",
  2: "Mal",
  3: "Más o menos",
  4: "Bien",
  5: "Excelente",
};

export default function FormularioResena({
  trabajoId,
  autorId,
}: {
  trabajoId: string;
  autorId: string;
}) {
  const router = useRouter();
  const [estrellas, setEstrellas] = useState(0);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (estrellas === 0) {
      setError("Elegí cuántas estrellas antes de enviar.");
      return;
    }

    setEnviando(true);
    const supabase = clienteNavegador();

    const { error } = await supabase.from("resenas").insert({
      trabajo_id: trabajoId,
      autor_id: autorId,
      estrellas,
      texto: texto.trim() || null,
    });

    setEnviando(false);

    if (error) {
      setError("No se pudo guardar: " + error.message);
      return;
    }

    router.refresh();
  }

  return (
    <form
      onSubmit={enviar}
      className="rounded-2xl border border-acento bg-acento-suave p-4"
    >
      <b className="font-display block text-cuerpo font-bold text-tinta">
        ¿Cómo estuvo el trabajo?
      </b>
      <p className="mt-1 text-apoyo leading-snug text-tinta-2">
        Tu reseña es lo que va a leer el próximo vecino antes de elegirlo.
      </p>

      <div className="mt-3 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setEstrellas(n)}
            aria-label={`${n} estrellas`}
            className={`text-numero leading-none transition ${
              n <= estrellas ? "text-acento" : "text-linea"
            }`}
          >
            ★
          </button>
        ))}
        {estrellas > 0 && (
          <span className="ml-2 text-apoyo font-semibold text-tinta-2">
            {AYUDAS[estrellas]}
          </span>
        )}
      </div>

      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={3}
        placeholder="Vino puntual, cambió la termocupla en media hora y me dejó el certificado. (Opcional)"
        className="mt-3 w-full resize-none rounded-xl border border-linea bg-white px-3.5 py-3 text-cuerpo leading-relaxed text-tinta outline-none placeholder:text-tinta-3 focus:border-marca-2"
      />

      {error && (
        <p className="mt-2 rounded-xl border border-alerta/30 bg-white px-3 py-2 text-apoyo text-tinta-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="mt-3 w-full rounded-xl bg-marca py-3 text-cuerpo font-bold text-white disabled:opacity-60"
      >
        {enviando ? "Enviando…" : "Publicar reseña"}
      </button>
    </form>
  );
}
