/* ============================================================
   Enviar un presupuesto
   ------------------------------------------------------------
   Dos decisiones de producto viven acá:

   1. La comisión se muestra MIENTRAS el profesional escribe el
      precio. Esconderla hasta el final es la forma más rápida
      de perder al lado que más cuesta conseguir.

   2. Un presupuesto enviado no se edita nunca (regla 2 del
      paso 1). Si se equivocó, manda otro. La base tiene un
      disparador que rechaza cualquier intento de editarlo, así
      que esto no es una promesa de la pantalla.
   ============================================================ */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clienteNavegador } from "@/lib/supabase";
import { aPesos, aCentavos } from "@/lib/plata";

const INCLUYE = [
  "Diagnóstico",
  "Repuesto",
  "Certificado de gas",
  "Prueba de hermeticidad",
  "Garantía 6 meses",
];

export default function FormularioPresupuesto({
  pedidoId,
  perfilId,
  comisionPct,
}: {
  pedidoId: string;
  perfilId: string;
  comisionPct: number;
}) {
  const router = useRouter();

  const [manoObra, setManoObra] = useState("");
  const [repuestos, setRepuestos] = useState("");
  const [incluye, setIncluye] = useState<string[]>(["Diagnóstico"]);
  const [mensaje, setMensaje] = useState("");
  const [disponible, setDisponible] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const manoObraCent = aCentavos(manoObra);
  const repuestosCent = aCentavos(repuestos);
  const totalCent = manoObraCent + repuestosCent;
  const comisionCent = Math.round((totalCent * comisionPct) / 100);
  const netoCent = totalCent - comisionCent;

  function alternar(item: string) {
    setIncluye((actual) =>
      actual.includes(item)
        ? actual.filter((i) => i !== item)
        : [...actual, item],
    );
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (totalCent <= 0) {
      setError("Poné al menos el precio de la mano de obra.");
      return;
    }

    setEnviando(true);
    const supabase = clienteNavegador();

    const { error } = await supabase.from("presupuestos").insert({
      pedido_id: pedidoId,
      profesional_id: perfilId,
      mano_obra_centavos: manoObraCent,
      repuestos_centavos: repuestosCent,
      incluye,
      mensaje: mensaje || null,
      disponible_el: disponible ? new Date(disponible).toISOString() : null,
    });

    setEnviando(false);

    if (error) {
      setError("No se pudo enviar: " + error.message);
      return;
    }

    router.push("/trabajos");
    router.refresh();
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4 px-5 pt-5 pb-10">
      <label className="flex flex-col gap-1.5">
        <span className="text-apoyo font-semibold text-tinta">
          Mano de obra
        </span>
        <input
          inputMode="numeric"
          value={manoObra}
          onChange={(e) => setManoObra(e.target.value)}
          placeholder="28000"
          className="rounded-xl border border-linea bg-fondo px-3.5 py-3 font-mono text-destacado font-semibold text-tinta tabular-nums outline-none placeholder:font-sans placeholder:font-normal placeholder:text-tinta-3 focus:border-marca-2"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-apoyo font-semibold text-tinta">
          Repuestos
          <span className="block font-normal text-tinta-3">
            Dejalo vacío si no llevás nada.
          </span>
        </span>
        <input
          inputMode="numeric"
          value={repuestos}
          onChange={(e) => setRepuestos(e.target.value)}
          placeholder="18000"
          className="rounded-xl border border-linea bg-fondo px-3.5 py-3 font-mono text-destacado font-semibold text-tinta tabular-nums outline-none placeholder:font-sans placeholder:font-normal placeholder:text-tinta-3 focus:border-marca-2"
        />
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-apoyo font-semibold text-tinta">
          Qué incluye
        </span>
        <div className="flex flex-wrap gap-2">
          {INCLUYE.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => alternar(item)}
              className={`rounded-full border px-3 py-1.5 text-apoyo font-semibold transition ${
                incluye.includes(item)
                  ? "border-acento bg-acento text-acento-tinta"
                  : "border-linea bg-white text-tinta-2"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-apoyo font-semibold text-tinta">
          Mensaje al cliente
          <span className="block font-normal text-tinta-3">
            Qué creés que es y cómo lo vas a resolver.
          </span>
        </span>
        <textarea
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          rows={4}
          placeholder="Por lo que contás es la termocupla. La llevo en el auto, lo resuelvo en la misma visita y te dejo el certificado firmado."
          className="resize-none rounded-xl border border-linea bg-fondo px-3.5 py-3 text-cuerpo leading-relaxed text-tinta outline-none placeholder:text-tinta-3 focus:border-marca-2"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-apoyo font-semibold text-tinta">
          ¿Cuándo podés ir?
        </span>
        <input
          type="datetime-local"
          value={disponible}
          onChange={(e) => setDisponible(e.target.value)}
          className="rounded-xl border border-linea bg-fondo px-3.5 py-3 text-cuerpo text-tinta outline-none focus:border-marca-2"
        />
      </label>

      {/* La cuenta, a la vista, mientras escribe. */}
      <div className="rounded-2xl border border-linea bg-fondo p-4">
        <Fila texto="Total que ve el cliente" monto={aPesos(totalCent)} />
        <Fila
          texto={`Comisión AlToque (${comisionPct} %)`}
          monto={"– " + aPesos(comisionCent)}
          rojo
        />
        <div className="mt-1 flex items-center justify-between border-t border-linea pt-3">
          <span className="text-cuerpo font-semibold text-tinta">
            Te queda
          </span>
          <b className="font-mono text-destacado font-semibold text-tinta tabular-nums">
            {aPesos(netoCent)}
          </b>
        </div>
        <p className="mt-2.5 text-etiqueta leading-snug text-tinta-3">
          Se acredita cuando el cliente confirma que el trabajo está terminado,
          o automáticamente a las 72 horas.
        </p>
      </div>

      {error && (
        <p className="rounded-xl border border-alerta/30 bg-alerta-suave px-3.5 py-3 text-apoyo text-tinta-2">
          {error}
        </p>
      )}

      <div>
        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-xl bg-acento py-3.5 text-destacado font-bold text-acento-tinta disabled:opacity-60"
        >
          {enviando ? "Enviando…" : "Enviar presupuesto"}
        </button>
        <p className="mt-2.5 text-center text-etiqueta leading-snug text-tinta-3">
          Una vez enviado no se puede editar. Si te equivocás, mandás uno nuevo
          y el anterior queda reemplazado.
        </p>
      </div>
    </form>
  );
}

function Fila({
  texto,
  monto,
  rojo = false,
}: {
  texto: string;
  monto: string;
  rojo?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-apoyo text-tinta-2">{texto}</span>
      <b
        className={`font-mono text-cuerpo font-semibold tabular-nums ${
          rojo ? "text-alerta" : "text-tinta"
        }`}
      >
        {monto}
      </b>
    </div>
  );
}
