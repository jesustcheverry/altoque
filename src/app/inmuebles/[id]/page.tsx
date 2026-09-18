/* ============================================================
   Historial de un inmueble
   ------------------------------------------------------------
   Se ve en /inmuebles/[id].

   Esta pantalla es la razón por la que en el paso 1 decidimos
   que el pedido cuelga del inmueble y no de la persona. Si
   colgara de la persona, el día que vendés el departamento el
   historial se va con vos y el comprador empieza de cero.

   Colgando del inmueble, cada propiedad acumula su ficha: qué
   se arregló, cuándo, quién, cuánto salió y qué garantía tenía.
   Eso es lo único que la competencia no puede copiar rápido,
   porque se construye con el tiempo.
   ============================================================ */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { clienteServidor } from "@/lib/supabase-servidor";
import { aPesos } from "@/lib/plata";

const TIPOS: Record<string, string> = {
  departamento: "Departamento",
  ph: "PH",
  casa: "Casa",
  local: "Local",
  otro: "Otro",
};

const ESTADOS_TRABAJO: Record<string, { texto: string; clase: string }> = {
  agendado: { texto: "AGENDADO", clase: "bg-acento-suave text-acento-tinta" },
  en_camino: { texto: "EN CAMINO", clase: "bg-acento-suave text-acento-tinta" },
  en_curso: { texto: "EN CURSO", clase: "bg-acento-suave text-acento-tinta" },
  terminado: { texto: "TERMINADO", clase: "bg-marca-suave text-marca" },
  confirmado: { texto: "CONFIRMADO", clase: "bg-ok-suave text-ok" },
  pagado: { texto: "PAGADO", clase: "bg-ok-suave text-ok" },
  cancelado: { texto: "CANCELADO", clase: "bg-fondo text-tinta-3" },
  en_disputa: { texto: "EN DISPUTA", clase: "bg-alerta-suave text-alerta" },
};

export default async function InmuebleDetalle({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await clienteServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar");

  const { data: inmueble } = await supabase
    .from("inmuebles")
    .select("id, alias, calle, altura, piso, depto, barrio, tipo, anio, instrucciones")
    .eq("id", id)
    .single();

  if (!inmueble) notFound();

  // Todo lo que pasó en esta propiedad. El trabajo cuelga del
  // pedido, y el presupuesto aceptado cuelga del trabajo, así
  // que la base los trae encadenados en una sola consulta.
  const { data: pedidos } = await supabase
    .from("pedidos")
    .select(
      "id, oficio, descripcion, estado, creado_el, trabajos(id, estado, agendado_para, termino_el, confirmado_el, profesional_id, presupuestos(total_centavos, incluye))",
    )
    .eq("inmueble_id", id)
    .order("creado_el", { ascending: false });

  // Los nombres de los profesionales salen de la vista pública,
  // que expone nombre y reputación pero no teléfono ni mail.
  const idsProfesionales = (pedidos ?? [])
    .flatMap((p) => (Array.isArray(p.trabajos) ? p.trabajos : p.trabajos ? [p.trabajos] : []))
    .map((t) => t.profesional_id)
    .filter(Boolean);

  const mapaProfesionales = new Map<string, { nombre: string; oficio: string }>();
  if (idsProfesionales.length > 0) {
    const { data: profesionales } = await supabase
      .from("profesionales_publicos")
      .select("id, nombre, oficio")
      .in("id", idsProfesionales);

    for (const pr of profesionales ?? []) {
      mapaProfesionales.set(pr.id, { nombre: pr.nombre, oficio: pr.oficio });
    }
  }

  const conTrabajo = (pedidos ?? []).filter((p) => primerTrabajo(p));
  const gastado = conTrabajo.reduce((suma, p) => {
    const t = primerTrabajo(p);
    return suma + (presupuestoDe(t)?.total_centavos ?? 0);
  }, 0);

  return (
    <main className="mx-auto min-h-screen max-w-md bg-white pb-12">
      <header className="bg-marca px-5 pt-6 pb-6 text-white">
        <Link
          href="/inmuebles"
          className="text-apoyo font-semibold text-white/60 underline underline-offset-2"
        >
          ← Mis inmuebles
        </Link>
        <h1 className="font-display mt-3 text-titulo leading-tight font-extrabold">
          {inmueble.alias}
        </h1>
        <p className="mt-1 text-apoyo text-white/60">
          {inmueble.calle} {inmueble.altura}
          {inmueble.piso && `, piso ${inmueble.piso}`}
          {inmueble.depto && ` ${inmueble.depto}`}
          {inmueble.barrio && ` · ${inmueble.barrio}`}
        </p>

        {/* La ficha de la propiedad, de un vistazo. */}
        <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-white/15">
          <Dato valor={TIPOS[inmueble.tipo ?? "otro"] ?? "—"} texto="TIPO" />
          <Dato valor={String(conTrabajo.length)} texto="ARREGLOS" />
          <Dato
            valor={gastado > 0 ? aPesos(gastado) : "—"}
            texto="INVERTIDO"
          />
        </div>
      </header>

      {inmueble.instrucciones && (
        <div className="border-b border-linea px-5 py-3">
          <p className="text-apoyo leading-snug text-tinta-3">
            <b className="font-semibold text-tinta-2">Cómo entrar: </b>
            {inmueble.instrucciones}
          </p>
        </div>
      )}

      <div className="px-5 pt-5">
        <h2 className="font-display mb-3 text-destacado font-bold text-tinta">
          Historial
        </h2>

        {pedidos && pedidos.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {pedidos.map((p) => {
              const t = primerTrabajo(p);
              const pres = presupuestoDe(t);
              const prof = t?.profesional_id
                ? mapaProfesionales.get(t.profesional_id)
                : null;
              const est = t ? ESTADOS_TRABAJO[t.estado] : null;

              return (
                <Link
                  key={p.id}
                  href={`/pedidos/${p.id}`}
                  className="block rounded-2xl border border-linea bg-white p-3.5 transition hover:border-marca-2"
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="text-etiqueta font-semibold tracking-wide text-tinta-3 uppercase">
                      {p.oficio}
                    </span>
                    <span className="text-etiqueta text-tinta-3">
                      {fechaCorta(p.creado_el)}
                    </span>
                  </div>

                  <p className="text-cuerpo leading-relaxed text-tinta">
                    {p.descripcion.slice(0, 110)}
                    {p.descripcion.length > 110 && "…"}
                  </p>

                  {t ? (
                    <div className="mt-2.5 border-t border-linea-2 pt-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-apoyo text-tinta-2">
                          {prof ? prof.nombre : "Profesional"}
                        </span>
                        <b className="font-mono text-apoyo font-semibold text-tinta tabular-nums">
                          {pres ? aPesos(pres.total_centavos) : "—"}
                        </b>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {est && (
                          <span
                            className={`rounded-md px-2 py-0.5 text-etiqueta font-bold tracking-wide ${est.clase}`}
                          >
                            {est.texto}
                          </span>
                        )}
                        {(pres?.incluye ?? []).map((i: string) => (
                          <span
                            key={i}
                            className="rounded-md border border-linea-2 bg-fondo px-2 py-0.5 text-etiqueta font-semibold text-tinta-2"
                          >
                            {i}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2.5 border-t border-linea-2 pt-2.5 text-etiqueta text-tinta-3">
                      {p.estado === "publicado"
                        ? "Esperando presupuestos."
                        : "No se llegó a contratar a nadie."}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-linea px-4 py-8 text-center text-cuerpo leading-relaxed text-tinta-3">
            Todavía no pasó nada en esta propiedad.
            <br />
            Cuando pidas tu primer arreglo, va a quedar acá.
          </p>
        )}

        <Link
          href={`/pedidos/nuevo`}
          className="mt-4 block rounded-xl bg-acento py-3.5 text-center text-destacado font-bold text-acento-tinta"
        >
          Pedir un arreglo
        </Link>
      </div>
    </main>
  );
}

// Las relaciones de Supabase vienen a veces como lista y a veces
// como objeto. Estas dos funciones lo normalizan en un solo lugar
// para que la pantalla de arriba quede limpia.
type Trabajo = {
  id: string;
  estado: string;
  termino_el: string | null;
  profesional_id: string;
  presupuestos: unknown;
};

function primerTrabajo(p: { trabajos: unknown }): Trabajo | null {
  const t = p.trabajos;
  if (!t) return null;
  return (Array.isArray(t) ? (t[0] ?? null) : t) as Trabajo | null;
}

function presupuestoDe(
  t: Trabajo | null,
): { total_centavos: number; incluye: string[] } | null {
  if (!t) return null;
  const pr = t.presupuestos;
  if (!pr) return null;
  return (Array.isArray(pr) ? (pr[0] ?? null) : pr) as {
    total_centavos: number;
    incluye: string[];
  } | null;
}

function Dato({ valor, texto }: { valor: string; texto: string }) {
  return (
    <div className="bg-marca px-2 py-2.5 text-center">
      <b className="font-display block text-cuerpo font-bold text-white tabular-nums">
        {valor}
      </b>
      <span className="mt-0.5 block text-etiqueta tracking-wide text-white/50">
        {texto}
      </span>
    </div>
  );
}

function fechaCorta(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
