/* ============================================================
   Mi oficio
   ------------------------------------------------------------
   Se ve en /profesional. Es el lado profesional de la persona.

   ESTA PANTALLA SE REORDENÓ ENTERA.
   Antes tenía cinco cosas apiladas: tu estado, tus datos, tus
   papeles, el formulario de editar y el de alta de otro oficio,
   este último desplegado y enorme aunque ya tuvieras perfil.

   Ahora responde primero la única pregunta que trae al
   profesional acá: "¿puedo trabajar, o qué me falta?". Eso va
   arriba de todo, en una sola línea. Lo demás está plegado.

   El detalle está en un <details> del propio navegador, sin
   JavaScript. Menos código nuestro que se pueda romper.
   ============================================================ */

import Link from "next/link";
import { redirect } from "next/navigation";
import { clienteServidor } from "@/lib/supabase-servidor";
import AltaDeOficio from "@/components/AltaDeOficio";
import EditarPerfil from "@/components/EditarPerfil";
import SubirDocumentos from "@/components/SubirDocumentos";

type Perfil = {
  id: string;
  oficio: string;
  matricula_nro: string | null;
  matricula_vence: string | null;
  seguro_vence: string | null;
  cuit: string | null;
  bio: string | null;
  zonas: string[] | null;
  radio_km: number;
  activo: boolean;
  verificacion: string;
  motivo_rechazo: string | null;
};

type Config = {
  oficio: string;
  nombre_visible: string;
  exige_matricula: boolean;
  exige_seguro: boolean;
};

// ------------------------------------------------------------
//  La línea de arriba de todo.
//  ------------------------------------------------------------
//  Un solo mensaje, el más urgente. Si a un profesional le
//  faltan tres cosas, mostrarle las tres juntas no lo ayuda:
//  lo paraliza. Le decimos la primera.
// ------------------------------------------------------------

function proximoPaso(
  p: Perfil,
  oc: Config | undefined,
  habilitado: boolean,
  documentos: { tipo: string }[],
): { texto: string; tono: "ok" | "espera" | "accion" } {
  if (!p.activo) {
    return {
      texto: "Tu perfil está pausado. Reactivalo para volver a recibir pedidos.",
      tono: "accion",
    };
  }

  if (habilitado) {
    return { texto: "Estás recibiendo pedidos de tu zona.", tono: "ok" };
  }

  const pidePapeles = Boolean(oc?.exige_matricula || oc?.exige_seguro);
  const hoy = new Date().toISOString().slice(0, 10);

  if (pidePapeles) {
    if (p.verificacion === "rechazado") {
      return {
        texto:
          p.motivo_rechazo ??
          "Tus papeles no pasaron la revisión. Corregilos y volvés a la cola.",
        tono: "accion",
      };
    }

    if (p.verificacion === "en_revision") {
      return {
        texto: "Estamos revisando tus papeles. Te avisamos por mail.",
        tono: "espera",
      };
    }

    // Pendiente: ¿qué falta exactamente?
    const tiene = new Set(documentos.map((d) => d.tipo));

    if (oc?.exige_matricula && !tiene.has("matricula")) {
      return { texto: "Subí la foto de tu matrícula.", tono: "accion" };
    }
    if (oc?.exige_seguro && !tiene.has("seguro")) {
      return { texto: "Subí tu certificado de seguro.", tono: "accion" };
    }
  }

  if (oc?.exige_matricula && !p.matricula_nro) {
    return { texto: "Cargá tu número de matrícula.", tono: "accion" };
  }
  if (p.matricula_vence && p.matricula_vence < hoy) {
    return { texto: "Tu matrícula está vencida. Actualizá la fecha.", tono: "accion" };
  }
  if (oc?.exige_seguro && (!p.seguro_vence || p.seguro_vence < hoy)) {
    return { texto: "Tu seguro está vencido o sin cargar.", tono: "accion" };
  }

  return {
    texto: "Falta que un revisor mire tus papeles.",
    tono: "espera",
  };
}

const TONOS = {
  ok: "border-ok/30 bg-ok-suave text-tinta",
  espera: "border-marca-2/30 bg-marca-suave text-tinta",
  accion: "border-alerta/30 bg-alerta-suave text-tinta",
};

export default async function MiOficio() {
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

  const idsPerfiles = (perfiles ?? []).map((p) => p.id);

  const { data: documentos } = idsPerfiles.length
    ? await supabase
        .from("documentos_profesional")
        .select("id, perfil_id, tipo, subido_el")
        .in("perfil_id", idsPerfiles)
        .order("subido_el", { ascending: false })
    : { data: [] };

  const { data: habilitados } = await supabase
    .from("profesionales_habilitados")
    .select("id");

  const idsHabilitados = new Set((habilitados ?? []).map((h) => h.id));
  const config = new Map((oficios ?? []).map((o) => [o.oficio, o]));
  const tieneAlguno = (perfiles ?? []).length > 0;

  return (
    <main className="mx-auto min-h-screen max-w-md bg-white pb-12">
      <header className="bg-marca-oscura px-5 pt-6 pb-6 text-white">
        <h1 className="font-display text-titulo leading-tight font-extrabold">
          Mi oficio
        </h1>
        <p className="mt-1.5 text-apoyo text-white/50">
          {tieneAlguno
            ? "Tu perfil profesional y los papeles que lo respaldan."
            : "Del otro lado del mostrador."}
        </p>

        {tieneAlguno && (
          <div className="mt-4 flex gap-2">
            <Link
              href="/trabajos"
              className="flex-1 rounded-xl bg-acento py-2.5 text-center text-cuerpo font-bold text-acento-tinta"
            >
              Trabajos disponibles
            </Link>
            <Link
              href="/mis-trabajos"
              className="flex-1 rounded-xl border border-white/20 py-2.5 text-center text-cuerpo font-bold text-white"
            >
              Mis trabajos
            </Link>
          </div>
        )}
      </header>

      <div className="flex flex-col gap-3 px-5 pt-5">
        {(perfiles ?? []).map((p) => {
          const oc = config.get(p.oficio);
          const habilitado = idsHabilitados.has(p.id);
          const pidePapeles = Boolean(oc?.exige_matricula || oc?.exige_seguro);
          const suyos = (documentos ?? []).filter((d) => d.perfil_id === p.id);
          const paso = proximoPaso(p, oc, habilitado, suyos);

          return (
            <div
              key={p.id}
              className="rounded-2xl border border-linea bg-white p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <b className="font-display text-destacado font-bold text-tinta">
                  {oc?.nombre_visible ?? p.oficio}
                </b>
                <span
                  className={`rounded-md px-2 py-1 text-etiqueta font-bold tracking-wide ${
                    habilitado
                      ? "bg-ok-suave text-ok"
                      : "bg-alerta-suave text-alerta"
                  }`}
                >
                  {habilitado ? "ACTIVO" : "SIN HABILITAR"}
                </span>
              </div>

              {/* La línea que contesta la pregunta. */}
              <p
                className={`mt-2.5 rounded-xl border px-3.5 py-3 text-apoyo leading-snug ${TONOS[paso.tono]}`}
              >
                {paso.texto}
              </p>

              <p className="mt-2.5 text-apoyo text-tinta-3">
                {p.zonas && p.zonas.length > 0
                  ? p.zonas.join(" · ")
                  : "Sin zonas cargadas"}
                {` · hasta ${p.radio_km} km`}
              </p>

              {/* Todo lo demás, plegado. Lo mirás una vez y no
                  volvés nunca, así que no puede ocupar pantalla
                  para siempre. */}
              <details className="group mt-3">
                <summary className="cursor-pointer list-none rounded-xl border border-linea bg-fondo px-3.5 py-2.5 text-apoyo font-semibold text-tinta-2 transition hover:border-marca-2">
                  Papeles y datos
                  <span className="float-right text-tinta-3 group-open:hidden">
                    ▾
                  </span>
                  <span className="float-right hidden text-tinta-3 group-open:inline">
                    ▴
                  </span>
                </summary>

                <div className="mt-2.5">
                  <div className="flex flex-col gap-0.5 rounded-xl bg-fondo p-3 text-apoyo text-tinta-2">
                    <Dato
                      etiqueta="Matrícula"
                      valor={
                        p.matricula_nro
                          ? `${p.matricula_nro}${p.matricula_vence ? ` · vence ${p.matricula_vence}` : ""}`
                          : null
                      }
                    />
                    <Dato
                      etiqueta="Seguro"
                      valor={p.seguro_vence ? `vence ${p.seguro_vence}` : null}
                    />
                    <Dato etiqueta="CUIT" valor={p.cuit} />
                  </div>

                  {pidePapeles && (
                    <SubirDocumentos
                      perfilId={p.id}
                      personaId={user.id}
                      tipos={
                        [
                          oc?.exige_matricula ? "matricula" : null,
                          oc?.exige_seguro ? "seguro" : null,
                        ].filter(Boolean) as ("matricula" | "seguro")[]
                      }
                      yaSubidos={suyos}
                    />
                  )}

                  <EditarPerfil
                    perfil={p}
                    exigeMatricula={Boolean(oc?.exige_matricula)}
                    exigeSeguro={Boolean(oc?.exige_seguro)}
                  />
                </div>
              </details>
            </div>
          );
        })}

        <AltaDeOficio
          personaId={user.id}
          oficios={oficios ?? []}
          yaTieneAlguno={tieneAlguno}
        />
      </div>
    </main>
  );
}

function Dato({
  etiqueta,
  valor,
}: {
  etiqueta: string;
  valor: string | null | undefined;
}) {
  return (
    <span className="flex justify-between gap-3">
      <span className="text-tinta-3">{etiqueta}</span>
      <span className={valor ? "font-semibold text-tinta" : "text-tinta-3"}>
        {valor ?? "sin cargar"}
      </span>
    </span>
  );
}
