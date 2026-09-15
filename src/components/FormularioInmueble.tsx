/* ============================================================
   Formulario para agregar un inmueble
   ------------------------------------------------------------
   Esta es la primera vez que la app ESCRIBE en la base de datos.
   Hasta ahora solo leía.

   Fijate que le mandamos persona_id. Podríamos mentir y poner
   el id de otro: la regla "mis inmuebles" de la base lo
   rechazaría igual, porque exige que persona_id sea el de quien
   está pidiendo. Ese es el sentido de tener las reglas en la
   base y no en la pantalla.
   ============================================================ */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clienteNavegador } from "@/lib/supabase";

const TIPOS = [
  { valor: "departamento", texto: "Departamento" },
  { valor: "ph", texto: "PH" },
  { valor: "casa", texto: "Casa" },
  { valor: "local", texto: "Local" },
  { valor: "otro", texto: "Otro" },
];

export default function FormularioInmueble({
  personaId,
}: {
  personaId: string;
}) {
  const router = useRouter();

  const [alias, setAlias] = useState("");
  const [calle, setCalle] = useState("");
  const [altura, setAltura] = useState("");
  const [piso, setPiso] = useState("");
  const [depto, setDepto] = useState("");
  const [barrio, setBarrio] = useState("");
  const [tipo, setTipo] = useState("departamento");
  const [instrucciones, setInstrucciones] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);

    const supabase = clienteNavegador();

    // Los campos vacíos se mandan como null, no como texto vacío.
    // "" y "sin dato" no son lo mismo, y mezclarlos ensucia la base.
    const { error } = await supabase.from("inmuebles").insert({
      persona_id: personaId,
      alias,
      calle,
      altura,
      piso: piso || null,
      depto: depto || null,
      barrio: barrio || null,
      tipo,
      instrucciones: instrucciones || null,
    });

    setGuardando(false);

    if (error) {
      setError("No se pudo guardar: " + error.message);
      return;
    }

    // Limpiamos el formulario y le pedimos a la pantalla que se
    // vuelva a armar, para que aparezca el inmueble recién creado.
    setAlias("");
    setCalle("");
    setAltura("");
    setPiso("");
    setDepto("");
    setBarrio("");
    setInstrucciones("");
    router.refresh();
  }

  return (
    <form
      onSubmit={guardar}
      className="flex flex-col gap-3.5 rounded-2xl border border-linea bg-fondo p-4"
    >
      <h2 className="font-display text-[15px] font-bold text-tinta">
        Agregar un inmueble
      </h2>

      <Campo
        etiqueta="¿Cómo lo llamás?"
        valor={alias}
        alCambiar={setAlias}
        ejemplo="Casa, Depto de mamá, El local"
        requerido
      />

      <div className="flex gap-2.5">
        <div className="flex-1">
          <Campo
            etiqueta="Calle"
            valor={calle}
            alCambiar={setCalle}
            ejemplo="Av. Corrientes"
            requerido
          />
        </div>
        <div className="w-24">
          <Campo
            etiqueta="Altura"
            valor={altura}
            alCambiar={setAltura}
            ejemplo="4820"
            requerido
          />
        </div>
      </div>

      <div className="flex gap-2.5">
        <div className="w-20">
          <Campo etiqueta="Piso" valor={piso} alCambiar={setPiso} ejemplo="6" />
        </div>
        <div className="w-20">
          <Campo etiqueta="Depto" valor={depto} alCambiar={setDepto} ejemplo="B" />
        </div>
        <div className="flex-1">
          <Campo
            etiqueta="Barrio"
            valor={barrio}
            alCambiar={setBarrio}
            ejemplo="Villa Crespo"
          />
        </div>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-[12.5px] font-semibold text-tinta">
          Tipo de propiedad
        </span>
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          className="rounded-xl border border-linea bg-white px-3.5 py-3 text-[14px] text-tinta outline-none focus:border-marca-2"
        >
          {TIPOS.map((t) => (
            <option key={t.valor} value={t.valor}>
              {t.texto}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[12.5px] font-semibold text-tinta">
          Cómo entrar
          <span className="block font-normal text-tinta-3">
            Portero, timbre, cochera. Lo que le sirva al profesional.
          </span>
        </span>
        <textarea
          value={instrucciones}
          onChange={(e) => setInstrucciones(e.target.value)}
          rows={2}
          placeholder="Portero hasta las 20. Timbre 6B."
          className="resize-none rounded-xl border border-linea bg-white px-3.5 py-3 text-[14px] text-tinta outline-none placeholder:text-tinta-3 focus:border-marca-2"
        />
      </label>

      {error && (
        <p className="rounded-xl border border-alerta/30 bg-alerta-suave px-3.5 py-3 text-[13px] text-tinta-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={guardando}
        className="mt-1 rounded-xl bg-acento py-3 text-[14.5px] font-bold text-acento-tinta disabled:opacity-60"
      >
        {guardando ? "Guardando…" : "Guardar inmueble"}
      </button>
    </form>
  );
}

function Campo({
  etiqueta,
  valor,
  alCambiar,
  ejemplo,
  requerido = false,
}: {
  etiqueta: string;
  valor: string;
  alCambiar: (v: string) => void;
  ejemplo: string;
  requerido?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12.5px] font-semibold text-tinta">{etiqueta}</span>
      <input
        type="text"
        value={valor}
        onChange={(e) => alCambiar(e.target.value)}
        placeholder={ejemplo}
        required={requerido}
        className="w-full rounded-xl border border-linea bg-white px-3.5 py-3 text-[14px] text-tinta outline-none placeholder:text-tinta-3 focus:border-marca-2"
      />
    </label>
  );
}
