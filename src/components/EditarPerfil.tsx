/* ============================================================
   Editar un perfil profesional
   ------------------------------------------------------------
   Hasta ahora se podía crear un perfil y nunca más tocarlo. Si
   te equivocabas en una fecha, quedabas casado con el error.

   Dos cosas que vale la pena mirar acá:

   1. El aviso naranja. Si estás verificado y tocás un papel,
      volvés a la cola de revisión. Eso NO lo decide este
      archivo: lo hace un disparador en la base. Pero avisarlo
      antes sí es responsabilidad de la pantalla. Que la regla
      sea justa no alcanza si al usuario lo agarra de sorpresa.

   2. "Recibir pedidos" es el interruptor de pausa. Un gasista
      que se va de vacaciones necesita poder desaparecer sin
      borrar nada ni perder su reputación.
   ============================================================ */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clienteNavegador } from "@/lib/supabase";

type Perfil = {
  id: string;
  matricula_nro: string | null;
  matricula_vence: string | null;
  seguro_vence: string | null;
  cuit: string | null;
  zonas: string[] | null;
  radio_km: number;
  bio: string | null;
  activo: boolean;
  verificacion: string;
};

export default function EditarPerfil({
  perfil,
  exigeMatricula,
  exigeSeguro,
}: {
  perfil: Perfil;
  exigeMatricula: boolean;
  exigeSeguro: boolean;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);

  const [matriculaNro, setMatriculaNro] = useState(perfil.matricula_nro ?? "");
  const [matriculaVence, setMatriculaVence] = useState(
    perfil.matricula_vence ?? "",
  );
  const [seguroVence, setSeguroVence] = useState(perfil.seguro_vence ?? "");
  const [cuit, setCuit] = useState(perfil.cuit ?? "");
  const [zonas, setZonas] = useState((perfil.zonas ?? []).join(", "));
  const [radio, setRadio] = useState(String(perfil.radio_km));
  const [bio, setBio] = useState(perfil.bio ?? "");
  const [activo, setActivo] = useState(perfil.activo);

  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // ¿Está por tocar algo que lo devuelve a la cola? Lo calculamos
  // mientras escribe, para avisarle antes y no después.
  const tocoPapeles =
    matriculaNro !== (perfil.matricula_nro ?? "") ||
    matriculaVence !== (perfil.matricula_vence ?? "") ||
    seguroVence !== (perfil.seguro_vence ?? "") ||
    cuit !== (perfil.cuit ?? "");

  const perderaVerificacion =
    perfil.verificacion === "verificado" && tocoPapeles;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);

    const supabase = clienteNavegador();

    const { error } = await supabase
      .from("perfiles_profesionales")
      .update({
        matricula_nro: matriculaNro || null,
        matricula_vence: matriculaVence || null,
        seguro_vence: seguroVence || null,
        cuit: cuit || null,
        zonas: zonas
          .split(",")
          .map((z) => z.trim())
          .filter(Boolean),
        radio_km: Number(radio) || 3,
        bio: bio || null,
        activo,
      })
      .eq("id", perfil.id);

    setGuardando(false);

    if (error) {
      setError("No se pudo guardar: " + error.message);
      return;
    }

    setAbierto(false);
    router.refresh();
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="mt-2.5 w-full rounded-xl border border-linea bg-white py-2.5 text-apoyo font-semibold text-tinta-2 transition hover:border-marca-2"
      >
        Editar este oficio
      </button>
    );
  }

  return (
    <form
      onSubmit={guardar}
      className="mt-2.5 flex flex-col gap-3 rounded-xl border border-marca-2 bg-fondo p-3.5"
    >
      {exigeMatricula && (
        <div className="flex gap-2.5">
          <div className="flex-1">
            <Campo
              etiqueta="N.º de matrícula"
              valor={matriculaNro}
              alCambiar={setMatriculaNro}
            />
          </div>
          <div className="w-36">
            <Campo
              etiqueta="Vence"
              tipo="date"
              valor={matriculaVence}
              alCambiar={setMatriculaVence}
            />
          </div>
        </div>
      )}

      {exigeSeguro && (
        <Campo
          etiqueta="Vencimiento del seguro"
          tipo="date"
          valor={seguroVence}
          alCambiar={setSeguroVence}
        />
      )}

      <Campo etiqueta="CUIT" valor={cuit} alCambiar={setCuit} />

      <Campo
        etiqueta="Zonas donde trabajás"
        valor={zonas}
        alCambiar={setZonas}
        ayuda="Separadas por coma: Villa Crespo, Almagro"
      />

      <Campo
        etiqueta="Radio en km"
        tipo="number"
        valor={radio}
        alCambiar={setRadio}
      />

      <label className="flex flex-col gap-1.5">
        <span className="text-apoyo font-semibold text-tinta">
          Sobre vos
        </span>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          placeholder="Veinte años instalando y reparando calefacción."
          className="resize-none rounded-xl border border-linea bg-white px-3.5 py-3 text-cuerpo leading-relaxed text-tinta outline-none placeholder:text-tinta-3 focus:border-marca-2"
        />
      </label>

      {/* El interruptor de pausa. */}
      <label className="flex items-start gap-2.5 rounded-xl border border-linea bg-white px-3.5 py-3">
        <input
          type="checkbox"
          checked={activo}
          onChange={(e) => setActivo(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-marca"
        />
        <span>
          <b className="block text-apoyo font-semibold text-tinta">
            Recibir pedidos
          </b>
          <span className="mt-0.5 block text-etiqueta leading-snug text-tinta-2">
            Si lo destildás desaparecés de las búsquedas y dejan de llegarte
            pedidos. No se borra nada: tus trabajos y tus reseñas quedan.
          </span>
        </span>
      </label>

      {/* El aviso honesto, antes de apretar guardar. */}
      {perderaVerificacion && (
        <p className="rounded-xl border border-alerta/30 bg-alerta-suave px-3.5 py-3 text-apoyo leading-snug text-tinta-2">
          <b className="font-semibold">Ojo:</b> estás cambiando un papel, así
          que tu verificación se cae y volvés a la cola de revisión. Hasta que
          alguien mire los datos nuevos vas a dejar de recibir pedidos.
        </p>
      )}

      {error && (
        <p className="rounded-xl border border-alerta/30 bg-white px-3.5 py-3 text-apoyo text-tinta-2">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={guardando}
          className="flex-1 rounded-xl bg-marca py-3 text-cuerpo font-bold text-white disabled:opacity-60"
        >
          {guardando ? "Guardando…" : "Guardar cambios"}
        </button>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="rounded-xl border border-linea bg-white px-4 py-3 text-cuerpo font-semibold text-tinta-2"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function Campo({
  etiqueta,
  valor,
  alCambiar,
  tipo = "text",
  ayuda,
}: {
  etiqueta: string;
  valor: string;
  alCambiar: (v: string) => void;
  tipo?: string;
  ayuda?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-apoyo font-semibold text-tinta">{etiqueta}</span>
      <input
        type={tipo}
        value={valor}
        onChange={(e) => alCambiar(e.target.value)}
        className="rounded-xl border border-linea bg-white px-3.5 py-3 text-cuerpo text-tinta outline-none focus:border-marca-2"
      />
      {ayuda && (
        <span className="text-etiqueta leading-snug text-tinta-3">{ayuda}</span>
      )}
    </label>
  );
}
