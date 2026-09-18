/* ============================================================
   Activar un perfil profesional
   ------------------------------------------------------------
   Acá una persona que ya tiene cuenta declara que además
   trabaja de algo. Es la decisión del paso 1 hecha pantalla:
   una sola cuenta, dos roles.

   Los papeles que se piden dependen del oficio, y eso no lo
   decide este archivo: sale de la tabla oficios_config.
   ============================================================ */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clienteNavegador } from "@/lib/supabase";

type Oficio = {
  oficio: string;
  nombre_visible: string;
  exige_matricula: boolean;
  exige_seguro: boolean;
};

export default function FormularioProfesional({
  personaId,
  oficios,
}: {
  personaId: string;
  oficios: Oficio[];
}) {
  const router = useRouter();

  const [oficio, setOficio] = useState(oficios[0]?.oficio ?? "");
  const [matriculaNro, setMatriculaNro] = useState("");
  const [matriculaVence, setMatriculaVence] = useState("");
  const [seguroVence, setSeguroVence] = useState("");
  const [cuit, setCuit] = useState("");
  const [zonas, setZonas] = useState("");
  const [radio, setRadio] = useState("3");
  const [bio, setBio] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // El oficio elegido, para saber qué papeles mostrar.
  const elegido = oficios.find((o) => o.oficio === oficio);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);

    const supabase = clienteNavegador();

    const { error } = await supabase.from("perfiles_profesionales").insert({
      persona_id: personaId,
      oficio,
      matricula_nro: matriculaNro || null,
      matricula_vence: matriculaVence || null,
      seguro_vence: seguroVence || null,
      cuit: cuit || null,
      // "Villa Crespo, Almagro" se convierte en una lista de dos.
      zonas: zonas
        .split(",")
        .map((z) => z.trim())
        .filter(Boolean),
      radio_km: Number(radio) || 3,
      bio: bio || null,
      activo: true,
    });

    setGuardando(false);

    if (error) {
      if (error.message.includes("duplicate key")) {
        setError("Ya tenés un perfil de ese oficio.");
      } else {
        setError("No se pudo guardar: " + error.message);
      }
      return;
    }

    router.refresh();
  }

  return (
    <form
      onSubmit={guardar}
      className="flex flex-col gap-3.5 rounded-2xl border border-linea bg-fondo p-4"
    >
      <h2 className="font-display text-destacado font-bold text-tinta">
        Activar un oficio
      </h2>

      <label className="flex flex-col gap-1.5">
        <span className="text-apoyo font-semibold text-tinta">
          ¿De qué trabajás?
        </span>
        <select
          value={oficio}
          onChange={(e) => setOficio(e.target.value)}
          className="rounded-xl border border-linea bg-white px-3.5 py-3 text-cuerpo text-tinta outline-none focus:border-marca-2"
        >
          {oficios.map((o) => (
            <option key={o.oficio} value={o.oficio}>
              {o.nombre_visible}
            </option>
          ))}
        </select>
      </label>

      {/* Lo que se pide cambia según el oficio. Esto no está
          escrito a mano: viene de la base. */}
      {elegido && (elegido.exige_matricula || elegido.exige_seguro) && (
        <p className="rounded-xl border border-acento/30 bg-acento-suave px-3.5 py-2.5 text-apoyo leading-snug text-acento-tinta">
          Para {elegido.nombre_visible.toLowerCase()} pedimos{" "}
          {elegido.exige_matricula && elegido.exige_seguro
            ? "matrícula y seguro vigentes"
            : elegido.exige_matricula
              ? "matrícula vigente"
              : "seguro vigente"}
          . Sin eso no vas a recibir pedidos.
        </p>
      )}

      {elegido?.exige_matricula && (
        <div className="flex gap-2.5">
          <div className="flex-1">
            <Campo
              etiqueta="N.º de matrícula"
              valor={matriculaNro}
              alCambiar={setMatriculaNro}
              ejemplo="27418"
            />
          </div>
          <div className="w-40">
            <Campo
              etiqueta="Vence"
              tipo="date"
              valor={matriculaVence}
              alCambiar={setMatriculaVence}
            />
          </div>
        </div>
      )}

      {elegido?.exige_seguro && (
        <Campo
          etiqueta="Vencimiento del seguro"
          tipo="date"
          valor={seguroVence}
          alCambiar={setSeguroVence}
        />
      )}

      <Campo
        etiqueta="CUIT (opcional)"
        valor={cuit}
        alCambiar={setCuit}
        ejemplo="20-12345678-9"
      />

      <Campo
        etiqueta="Zonas donde trabajás"
        valor={zonas}
        alCambiar={setZonas}
        ejemplo="Villa Crespo, Almagro, Caballito"
      />

      <Campo
        etiqueta="Radio máximo (km)"
        tipo="number"
        valor={radio}
        alCambiar={setRadio}
        ejemplo="3"
      />

      <label className="flex flex-col gap-1.5">
        <span className="text-apoyo font-semibold text-tinta">
          Contá qué hacés
          <span className="block font-normal text-tinta-3">
            Lo que te diferencia del resto. Lo lee el vecino antes de elegir.
          </span>
        </span>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          placeholder="Trabajo en PH y consorcios desde 2016. Hago la prueba de hermeticidad y entrego el certificado firmado."
          className="resize-none rounded-xl border border-linea bg-white px-3.5 py-3 text-cuerpo leading-relaxed text-tinta outline-none placeholder:text-tinta-3 focus:border-marca-2"
        />
      </label>

      {error && (
        <p className="rounded-xl border border-alerta/30 bg-alerta-suave px-3.5 py-3 text-apoyo text-tinta-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={guardando}
        className="mt-1 rounded-xl bg-acento py-3 text-cuerpo font-bold text-acento-tinta disabled:opacity-60"
      >
        {guardando ? "Guardando…" : "Activar oficio"}
      </button>
    </form>
  );
}

function Campo({
  etiqueta,
  valor,
  alCambiar,
  ejemplo,
  tipo = "text",
}: {
  etiqueta: string;
  valor: string;
  alCambiar: (v: string) => void;
  ejemplo?: string;
  tipo?: string;
}) {
  return (
    <label className="flex w-full flex-col gap-1.5">
      <span className="text-apoyo font-semibold text-tinta">{etiqueta}</span>
      <input
        type={tipo}
        value={valor}
        onChange={(e) => alCambiar(e.target.value)}
        placeholder={ejemplo}
        className="w-full rounded-xl border border-linea bg-white px-3.5 py-3 text-cuerpo text-tinta outline-none placeholder:text-tinta-3 focus:border-marca-2"
      />
    </label>
  );
}
