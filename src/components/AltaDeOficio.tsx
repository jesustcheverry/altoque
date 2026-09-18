/* ============================================================
   La invitación a trabajar en la app
   ------------------------------------------------------------
   Antes acá había un formulario enorme, siempre desplegado,
   aunque ya tuvieras tu perfil cargado. Ocupaba media pantalla
   para algo que se hace una vez en la vida.

   Ahora es un párrafo y un botón. El formulario aparece solo si
   alguien lo pide.

   El texto cambia según si es tu primer oficio o si estás
   sumando otro, porque no es la misma conversación: al primero
   hay que explicarle de qué se trata, al segundo no.
   ============================================================ */

"use client";

import { useState } from "react";
import FormularioProfesional from "@/components/FormularioProfesional";

type Oficio = {
  oficio: string;
  nombre_visible: string;
  exige_matricula: boolean;
  exige_seguro: boolean;
};

export default function AltaDeOficio({
  personaId,
  oficios,
  yaTieneAlguno,
}: {
  personaId: string;
  oficios: Oficio[];
  yaTieneAlguno: boolean;
}) {
  const [abierto, setAbierto] = useState(false);

  if (abierto) {
    return (
      <div className="flex flex-col gap-2">
        <FormularioProfesional personaId={personaId} oficios={oficios} />
        <button
          onClick={() => setAbierto(false)}
          className="py-1 text-apoyo font-semibold text-tinta-3 underline underline-offset-2"
        >
          Cancelar
        </button>
      </div>
    );
  }

  if (yaTieneAlguno) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="rounded-2xl border border-dashed border-linea px-4 py-4 text-cuerpo font-semibold text-tinta-2 transition hover:border-marca-2"
      >
        + Agregar otro oficio
      </button>
    );
  }

  return (
    <div className="rounded-2xl bg-marca-oscura p-5 text-white">
      <b className="font-display block text-destacado leading-tight font-extrabold">
        ¿Trabajás de algún oficio?
      </b>
      <p className="mt-2 text-apoyo leading-relaxed text-white/60">
        Activá tu perfil y empezá a recibir pedidos de tu zona. Te pedimos
        matrícula y seguro vigentes según el oficio: es lo que hace que el
        vecino te deje entrar a su casa.
      </p>
      <p className="mt-2 text-apoyo leading-relaxed text-white/40">
        No cobramos nada hasta que cobres un trabajo.
      </p>

      <button
        onClick={() => setAbierto(true)}
        className="mt-4 w-full rounded-xl bg-acento py-3.5 text-destacado font-bold text-acento-tinta"
      >
        Activar mi oficio
      </button>
    </div>
  );
}
