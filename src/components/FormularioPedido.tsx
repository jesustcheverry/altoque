/* ============================================================
   Publicar un pedido
   ------------------------------------------------------------
   Acá es donde el modelo del paso 1 se pone en movimiento: el
   pedido nace, se publica, y le empieza a correr el reloj de
   las 48 horas.

   Los estados y las fechas los pone este código, pero la base
   no acepta cualquier cosa: "estado" solo admite los cinco
   valores de la lista, y el inmueble tiene que ser tuyo. Si nos
   equivocáramos, la base rechaza la operación.
   ============================================================ */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clienteNavegador } from "@/lib/supabase";

type Oficio = { oficio: string; nombre_visible: string };
type Inmueble = { id: string; alias: string; calle: string; altura: string };

const URGENCIAS = [
  {
    valor: "urgente",
    titulo: "Es una urgencia",
    detalle: "Alguien va hoy mismo. Suele tener recargo.",
  },
  {
    valor: "esta_semana",
    titulo: "Esta semana",
    detalle: "Coordinás día y franja horaria.",
  },
  {
    valor: "solo_presupuesto",
    titulo: "Solo quiero saber cuánto sale",
    detalle: "Un estimado, sin visita.",
  },
];

const FRANJAS = ["Mañana 8–12", "Tarde 13–18", "Noche 18–21", "Sábado"];

export default function FormularioPedido({
  oficios,
  inmuebles,
  oficioInicial,
  urgenciaInicial,
}: {
  oficios: Oficio[];
  inmuebles: Inmueble[];
  oficioInicial?: string;
  urgenciaInicial?: string;
}) {
  const router = useRouter();

  const [oficio, setOficio] = useState(
    oficioInicial && oficios.some((o) => o.oficio === oficioInicial)
      ? oficioInicial
      : (oficios[0]?.oficio ?? ""),
  );
  const [inmuebleId, setInmuebleId] = useState(inmuebles[0]?.id ?? "");
  const [descripcion, setDescripcion] = useState("");
  // Si llegó desde el cartel de urgencias, viene ya marcado.
  const [urgencia, setUrgencia] = useState(
    urgenciaInicial === "urgente" ||
      urgenciaInicial === "esta_semana" ||
      urgenciaInicial === "solo_presupuesto"
      ? urgenciaInicial
      : "esta_semana",
  );
  const [franja, setFranja] = useState("Tarde 13–18");

  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function publicar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (descripcion.trim().length < 20) {
      setError(
        "Contá un poco más. Cuanto mejor se entienda el problema, más preciso va a ser el presupuesto.",
      );
      return;
    }

    setEnviando(true);
    const supabase = clienteNavegador();

    const ahora = new Date();
    // Las 48 horas de la regla del paso 1, contadas desde ahora.
    const vence = new Date(ahora.getTime() + 48 * 60 * 60 * 1000);

    const { data, error } = await supabase.from("pedidos").insert({
      inmueble_id: inmuebleId,
      oficio,
      descripcion: descripcion.trim(),
      urgencia,
      franja_horaria: urgencia === "solo_presupuesto" ? null : franja,
      estado: "publicado",
      publicado_el: ahora.toISOString(),
      vence_el: vence.toISOString(),
    })
      // Pedimos que nos devuelva el id del pedido recién creado,
      // para poder llevarlo directo a agregarle las fotos.
      .select("id")
      .single();

    setEnviando(false);

    if (error) {
      setError("No se pudo publicar: " + error.message);
      return;
    }

    router.push(`/pedidos/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={publicar} className="flex flex-col gap-5 px-5 pt-5 pb-10">
      <label className="flex flex-col gap-1.5">
        <span className="text-[12.5px] font-semibold text-tinta">
          ¿Qué oficio necesitás?
        </span>
        <select
          value={oficio}
          onChange={(e) => setOficio(e.target.value)}
          className="rounded-xl border border-linea bg-fondo px-3.5 py-3 text-[14px] text-tinta outline-none focus:border-marca-2"
        >
          {oficios.map((o) => (
            <option key={o.oficio} value={o.oficio}>
              {o.nombre_visible}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[12.5px] font-semibold text-tinta">
          ¿Qué pasa?
          <span className="block font-normal text-tinta-3">
            El modelo del artefacto, desde cuándo pasa, qué probaste.
          </span>
        </span>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={5}
          placeholder="El calefactor del living prende, hace la llama unos segundos y se apaga solo. Es un Eskabe de 5000 kcal, tendrá 12 años. Pasa desde el jueves."
          className="resize-none rounded-xl border border-linea bg-fondo px-3.5 py-3 text-[14px] leading-relaxed text-tinta outline-none placeholder:text-tinta-3 focus:border-marca-2"
        />
        <span className="text-right text-[11px] text-tinta-3 tabular-nums">
          {descripcion.trim().length} caracteres
        </span>
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-[12.5px] font-semibold text-tinta">
          ¿Para cuándo?
        </span>
        {URGENCIAS.map((u) => (
          <button
            key={u.valor}
            type="button"
            onClick={() => setUrgencia(u.valor)}
            className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition ${
              urgencia === u.valor
                ? "border-marca-2 bg-marca-suave"
                : "border-linea bg-white"
            }`}
          >
            <span
              className={`grid size-[18px] shrink-0 place-items-center rounded-full border-2 ${
                urgencia === u.valor ? "border-marca-2" : "border-linea"
              }`}
            >
              {urgencia === u.valor && (
                <span className="size-2.5 rounded-full bg-marca-2" />
              )}
            </span>
            <span>
              <b className="block text-[13.5px] font-semibold text-tinta">
                {u.titulo}
              </b>
              <span className="block text-[11.5px] text-tinta-3">
                {u.detalle}
              </span>
            </span>
          </button>
        ))}
      </div>

      {/* La franja horaria no tiene sentido si solo quiere un
          estimado, así que directamente no la mostramos. */}
      {urgencia !== "solo_presupuesto" && (
        <div className="flex flex-col gap-2">
          <span className="text-[12.5px] font-semibold text-tinta">
            ¿Cuándo te viene bien?
          </span>
          <div className="flex flex-wrap gap-2">
            {FRANJAS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFranja(f)}
                className={`rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition ${
                  franja === f
                    ? "border-acento bg-acento text-acento-tinta"
                    : "border-linea bg-white text-tinta-2"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-[12.5px] font-semibold text-tinta">¿Dónde?</span>
        <select
          value={inmuebleId}
          onChange={(e) => setInmuebleId(e.target.value)}
          className="rounded-xl border border-linea bg-fondo px-3.5 py-3 text-[14px] text-tinta outline-none focus:border-marca-2"
        >
          {inmuebles.map((i) => (
            <option key={i.id} value={i.id}>
              {i.alias} — {i.calle} {i.altura}
            </option>
          ))}
        </select>
      </label>

      {error && (
        <p className="rounded-xl border border-alerta/30 bg-alerta-suave px-3.5 py-3 text-[13px] text-tinta-2">
          {error}
        </p>
      )}

      <div>
        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-xl bg-acento py-3.5 text-[15px] font-bold text-acento-tinta disabled:opacity-60"
        >
          {enviando ? "Publicando…" : "Publicar pedido"}
        </button>
        <p className="mt-2.5 text-center text-[11.5px] leading-snug text-tinta-3">
          En la pantalla siguiente vas a poder agregarle fotos.
          <br />
          Si en 48 horas nadie responde, el pedido se cierra y te avisamos.
        </p>
      </div>
    </form>
  );
}
