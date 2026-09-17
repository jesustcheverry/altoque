/* ============================================================
   Mi perfil profesional
   ------------------------------------------------------------
   Se ve en /profesional.

   Esta pantalla muestra, para cada oficio que activaste, si
   estás HABILITADO o no. Y eso no lo calcula este archivo: le
   pregunta a la vista profesionales_habilitados, que es la
   misma que usan las reglas de la base para decidir qué pedidos
   te muestra. O sea: lo que ves acá es exactamente lo que el
   sistema cree. No hay forma de que se desincronicen.

   NOVEDAD: ahora también muestra el estado de VERIFICACIÓN, que
   es otra cosa. Podés tener los papeles cargados y vigentes y
   aun así no estar verificado, porque verificado significa que
   alguien los miró. Antes eso no existía: alcanzaba con
   escribir una fecha.
   ============================================================ */

import Link from "next/link";
import { redirect } from "next/navigation";
import { clienteServidor } from "@/lib/supabase-servidor";
import FormularioProfesional from "@/components/FormularioProfesional";
import EditarPerfil from "@/components/EditarPerfil";
import SubirDocumentos from "@/components/SubirDocumentos";

const VERIFICACION: Record<
  string,
  { texto: string; clase: string; explica: string }
> = {
  pendiente: {
    texto: "SIN VERIFICAR",
    clase: "bg-alerta-suave text-alerta",
    explica:
      "Cargaste tus datos, pero todavía nadie los revisó. Hasta que eso pase no aparecés en las búsquedas ni te llegan pedidos.",
  },
  en_revision: {
    texto: "EN REVISIÓN",
    clase: "bg-marca-suave text-marca",
    explica:
      "Estamos mirando tus papeles. Suele tardar poco. Te avisamos apenas haya novedades.",
  },
  verificado: {
    texto: "VERIFICADO",
    clase: "bg-ok-suave text-ok",
    explica:
      "Alguien revisó tus papeles y están en orden. El vecino ve el escudo al lado de tu nombre.",
  },
  rechazado: {
    texto: "RECHAZADO",
    clase: "bg-alerta-suave text-alerta",
    explica: "",
  },
};

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
      "id, oficio, matricula_nro, matricula_vence, seguro_vence, cuit, bio, zonas, radio_km, activo, verificacion, motivo_rechazo",
    )
    .eq("persona_id", user.id)
    .order("creado_el");

  // Los que el sistema considera habilitados hoy.
  const { data: habilitados } = await supabase
    .from("profesionales_habilitados")
    .select("id");

  // Los papeles que ya mandó, para no pedírselos de nuevo.
  const idsPerfiles = (perfiles ?? []).map((p) => p.id);
  const { data: documentos } = idsPerfiles.length
    ? await supabase
        .from("documentos_profesional")
        .select("id, perfil_id, tipo, subido_el")
        .in("perfil_id", idsPerfiles)
        .order("subido_el", { ascending: false })
    : { data: [] };

  const idsHabilitados = new Set((habilitados ?? []).map((h) => h.id));
  const config = new Map((oficios ?? []).map((o) => [o.oficio, o]));

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
              const oc = config.get(p.oficio);
              const pidePapeles = Boolean(
                oc?.exige_matricula || oc?.exige_seguro,
              );
              const ver = VERIFICACION[p.verificacion] ?? VERIFICACION.pendiente;

              return (
                <div
                  key={p.id}
                  className="rounded-2xl border border-linea bg-white p-3.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <b className="text-[14.5px] font-bold text-tinta">
                      {oc?.nombre_visible ?? p.oficio}
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

                  {/* La verificación solo tiene sentido en los oficios
                      donde hay algo para verificar. A un pintor no le
                      pedimos matrícula, así que tampoco lo hacemos
                      esperar una revisión que no existe. */}
                  {pidePapeles && (
                    <div className="mt-2.5 rounded-xl border border-linea-2 bg-fondo p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11.5px] font-semibold text-tinta-2">
                          Verificación de papeles
                        </span>
                        <span
                          className={`rounded-md px-2 py-1 text-[10px] font-bold tracking-wide ${ver.clase}`}
                        >
                          {ver.texto}
                        </span>
                      </div>

                      <p className="mt-1.5 text-[11.5px] leading-snug text-tinta-2">
                        {p.verificacion === "rechazado"
                          ? (p.motivo_rechazo ??
                            "Tus papeles no pasaron la revisión.")
                          : ver.explica}
                      </p>

                      {p.verificacion === "rechazado" && (
                        <p className="mt-1.5 text-[11.5px] leading-snug text-tinta-3">
                          Corregí lo que falta y volvés a la cola
                          automáticamente.
                        </p>
                      )}

                      <SubirDocumentos
                        perfilId={p.id}
                        personaId={user.id}
                        tipos={
                          [
                            oc?.exige_matricula ? "matricula" : null,
                            oc?.exige_seguro ? "seguro" : null,
                          ].filter(Boolean) as ("matricula" | "seguro")[]
                        }
                        yaSubidos={(documentos ?? []).filter(
                          (d) => d.perfil_id === p.id,
                        )}
                      />
                    </div>
                  )}

                  <EditarPerfil
                    perfil={p}
                    exigeMatricula={Boolean(oc?.exige_matricula)}
                    exigeSeguro={Boolean(oc?.exige_seguro)}
                  />

                  {!habilitado && (
                    <p className="mt-2 rounded-xl bg-alerta-suave px-3 py-2 text-[11.5px] leading-snug text-tinta-2">
                      {pidePapeles && p.verificacion !== "verificado"
                        ? "Mientras no estés verificado no aparecés en las búsquedas ni te llegan pedidos."
                        : "Te faltan papeles vigentes para este oficio, o el perfil está pausado."}
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

        {/* El alta queda abajo y se anuncia como lo que es: agregar
            OTRO oficio, no reemplazar el que ya tenés. */}
        {perfiles && perfiles.length > 0 && (
          <p className="mt-1 text-[12px] text-tinta-3">
            ¿Trabajás de algo más? Agregá otro oficio.
          </p>
        )}
        <FormularioProfesional personaId={user.id} oficios={oficios ?? []} />
      </div>
    </main>
  );
}
