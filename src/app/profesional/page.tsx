/* ============================================================
   Mi perfil profesional
   ------------------------------------------------------------
   Se ve en /profesional.

   Lo interesante de esta pantalla es que muestra, para cada
   oficio que activaste, si estás HABILITADO o no. Y eso no lo
   calcula este archivo: le pregunta a la vista
   profesionales_habilitados, que es la misma que usan las
   reglas de la base para decidir qué pedidos te muestra.

   O sea: lo que ves acá es exactamente lo que el sistema cree.
   No hay forma de que se desincronicen.
   ============================================================ */

import Link from "next/link";
import { redirect } from "next/navigation";
import { clienteServidor } from "@/lib/supabase-servidor";
import FormularioProfesional from "@/components/FormularioProfesional";

export default async function Profesional() {
  const supabase = await clienteServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar");

  const { data: oficios } = await supabase
    .from("oficios_config")
    .select("oficio, nombre_visible, exige_matricula, exige_seguro")
    .order("nombre_visible");

  const { data: perfiles } = await supabase
    .from("perfiles_profesionales")
    .select(
      "id, oficio, matricula_nro, matricula_vence, seguro_vence, zonas, radio_km, activo",
    )
    .eq("persona_id", user.id)
    .order("creado_el");

  // Los que el sistema considera habilitados hoy.
  const { data: habilitados } = await supabase
    .from("profesionales_habilitados")
    .select("id");

  const idsHabilitados = new Set((habilitados ?? []).map((h) => h.id));
  const nombreOficio = new Map(
    (oficios ?? []).map((o) => [o.oficio, o.nombre_visible]),
  );

  return (
    <main className="mx-auto min-h-screen max-w-md bg-white pb-12">
      <header className="bg-marca px-5 pt-6 pb-6 text-white">
        <Link
          href="/"
          className="text-[12.5px] font-semibold text-white/60 underline underline-offset-2"
        >
          ← Volver
        </Link>
        <h1 className="font-display mt-3 text-[23px] leading-tight font-extrabold">
          Trabajar en AlToque
        </h1>
        <p className="mt-1.5 text-[13px] text-white/60">
          Activá tu oficio y empezá a recibir pedidos de tu zona.
        </p>
      </header>

      <div className="flex flex-col gap-4 px-5 pt-5">
        {perfiles && perfiles.length > 0 && (
          <div className="flex flex-col gap-2.5">
            {perfiles.map((p) => {
              const habilitado = idsHabilitados.has(p.id);
              return (
                <div
                  key={p.id}
                  className="rounded-2xl border border-linea bg-white p-3.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <b className="text-[14.5px] font-bold text-tinta">
                      {nombreOficio.get(p.oficio) ?? p.oficio}
                    </b>
                    <span
                      className={`rounded-md px-2 py-1 text-[10.5px] font-bold tracking-wide ${
                        habilitado
                          ? "bg-ok-suave text-ok"
                          : "bg-alerta-suave text-alerta"
                      }`}
                    >
                      {habilitado ? "RECIBIENDO PEDIDOS" : "SIN HABILITAR"}
                    </span>
                  </div>

                  <p className="mt-1.5 text-[12.5px] text-tinta-2">
                    {p.zonas && p.zonas.length > 0
                      ? p.zonas.join(" · ")
                      : "Sin zonas cargadas"}
                    {` · hasta ${p.radio_km} km`}
                  </p>

                  <div className="mt-2 flex flex-col gap-0.5 border-t border-linea-2 pt-2 text-[11.5px] text-tinta-3">
                    {p.matricula_nro && (
                      <span>
                        Matrícula {p.matricula_nro}
                        {p.matricula_vence && ` · vence ${p.matricula_vence}`}
                      </span>
                    )}
                    {p.seguro_vence && <span>Seguro vence {p.seguro_vence}</span>}
                    {!p.activo && <span>Tu perfil está pausado.</span>}
                  </div>

                  {!habilitado && (
                    <p className="mt-2 rounded-xl bg-alerta-suave px-3 py-2 text-[11.5px] leading-snug text-tinta-2">
                      Te faltan papeles vigentes para este oficio, o el perfil
                      está pausado. Mientras tanto no aparecés en las búsquedas
                      ni te llegan pedidos.
                    </p>
                  )}
                </div>
              );
            })}

            <Link
              href="/trabajos"
              className="rounded-xl bg-marca py-3.5 text-center text-[15px] font-bold text-white"
            >
              Ver trabajos disponibles
            </Link>
          </div>
        )}

        <FormularioProfesional personaId={user.id} oficios={oficios ?? []} />
      </div>
    </main>
  );
}
