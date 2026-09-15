/* ============================================================
   Subir fotos a un pedido
   ------------------------------------------------------------
   Las fotos van a dos lugares distintos y eso es a propósito:

   1. El archivo en sí va al "bucket" pedidos, con el camino
      <id del pedido>/<nombre al azar>.jpg

   2. Una fila en la tabla pedido_fotos guarda ese camino.

   ¿Por qué separado? Porque las tablas son buenas para buscar y
   relacionar, y malas para guardar cosas pesadas. Meter una
   foto adentro de una tabla hace que toda la base se arrastre.

   El nombre del archivo es al azar a propósito: si usáramos el
   nombre original, alguien podría subir dos fotos que se llaman
   igual y una pisaría a la otra.
   ============================================================ */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clienteNavegador } from "@/lib/supabase";

export default function SubirFotos({
  pedidoId,
  cantidadActual,
}: {
  pedidoId: string;
  cantidadActual: number;
}) {
  const router = useRouter();
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function alElegir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files ?? []);
    if (archivos.length === 0) return;

    setError(null);
    setSubiendo(true);

    const supabase = clienteNavegador();

    for (const [i, archivo] of archivos.entries()) {
      const extension = archivo.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const camino = `${pedidoId}/${crypto.randomUUID()}.${extension}`;

      const { error: errorSubida } = await supabase.storage
        .from("pedidos")
        .upload(camino, archivo);

      if (errorSubida) {
        setError("No se pudo subir " + archivo.name + ": " + errorSubida.message);
        break;
      }

      const { error: errorFila } = await supabase.from("pedido_fotos").insert({
        pedido_id: pedidoId,
        url: camino,
        orden: cantidadActual + i,
      });

      if (errorFila) {
        setError("La foto se subió pero no se pudo registrar: " + errorFila.message);
        break;
      }
    }

    setSubiendo(false);
    e.target.value = ""; // permite volver a elegir el mismo archivo
    router.refresh();
  }

  return (
    <div>
      <label
        className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-linea bg-fondo px-4 py-4 text-[13.5px] font-semibold text-tinta-2 ${
          subiendo ? "opacity-60" : "hover:border-marca-2"
        }`}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 8h3.5L8 6h8l1.5 2H21v11H3z" />
          <circle cx="12" cy="13" r="3.4" />
        </svg>
        {subiendo ? "Subiendo…" : "Agregar fotos"}
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={subiendo}
          onChange={alElegir}
          className="hidden"
        />
      </label>

      {error && (
        <p className="mt-2 rounded-xl border border-alerta/30 bg-alerta-suave px-3 py-2 text-[12px] text-tinta-2">
          {error}
        </p>
      )}
    </div>
  );
}
