/* ============================================================
   Mis trabajos (lado profesional)
   ------------------------------------------------------------
   Se ve en /mis-trabajos. Son los trabajos que le adjudicaron.

   Acá aparece la dirección exacta y el teléfono del cliente, que
   hasta ahora nunca se mostraban. No es que antes estuvieran
   ocultos por la pantalla: la base directamente no se los daba.
   Las reglas nuevas los destraban solo para el profesional
   asignado a ese trabajo.
   ============================================================ */

import Link from "next/link";
import { redirect } from "next/navigation";
import { clienteServidor } from "@/lib/supabase-servidor";
import BotonAvanzar from "@/components/BotonAvanzar";
import { aPesos } from "@/lib/plata";

const PASOS: Record<
  string,
  { texto: string; clase: string; siguiente?: { estado: string; boton: string } }
> = {
  agendado: {
    texto: "AGENDADO",
    clase: "bg-acento-suave text-acento-tinta",
    siguiente: { estado: "en_camino", boton: "Voy en camino" },
  },
  en_camino: {
    texto: "EN CAMINO",
    clase: "bg-acento-suave text-acento-tinta",
    siguiente: { estado: "en_curso", boton: "Llegué, empiezo" },
  },
  en_curso: {
    texto: "EN CURSO",
    clase: "bg-acento-suave text-acento-tinta",
    siguiente: { estado: "terminado", boton: "Terminé el trabajo" },
  },
  terminado: { texto: "ESPERANDO CONFIRMACIÓN", clase: "bg-marca-suave text-marca" },
  confirmado: { texto: "CONFIRMADO", clase: "bg-ok-suave text-ok" },
  pagado: { texto: "PAGADO", clase: "bg-ok-suave text-ok" },
  cancelado: { texto: "CANCELADO", clase: "bg-fondo text-tinta-3" },
  en_disputa: { texto: "EN DISPUTA", clase: "bg-alerta-suave text-alerta" },
};

export default async function MisTrabajos() {
  const supabase = await clienteServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar");

  const { data: perfiles } = await supabase
    .from("perfiles_profesionales")
    .select("id")
    .eq("persona_id", user.id);

  const ids = (perfiles ?? []).map((p) => p.id);

  const { data: trabajos } = ids.length
    ? await supabase
        .from("trabajos")
        .select(
          "id, estado, agendado_para, termino_el, pedidos(id, oficio, descripcion, franja_horaria, inmuebles(alias, calle, altura, piso, depto, barrio, instrucciones, persona_id)), presupuestos(total_centavos)",
        )
        .in("profesional_id", ids)
        .order("creado_el", { ascending: false })
    : { data: [] };

  // Los teléfonos de los clientes, que ahora sí podemos leer.
  const idsClientes = (trabajos ?? [])
    .map((t) => inmuebleDe(t)?.persona_id)
    .filter((v): v is string => Boolean(v));

  const contactos = new Map<string, { nombre: string; telefono: string | null }>();
  if (idsClientes.length > 0) {
    const { data: personas } = await supabase
      .from("personas")
      .select("id, nombre, telefono")
      .in("id", idsClientes);
    for (const p of personas ?? []) contactos.set(p.id, p);
  }

  return (
    <main className="mx-auto min-h-screen max-w-md bg-white pb-12">
      <header className="bg-[#16211f] px-5 pt-6 pb-6 text-white">
        <Link
          href="/trabajos"
          className="text-[12.5px] font-semibold text-white/50 underline underline-offset-2"
        >
          ← Trabajos disponibles
        </Link>
        <h1 className="font-display mt-3 text-[23px] leading-tight font-extrabold">
          Mis trabajos
        </h1>
        <p className="mt-1.5 text-[13px] text-white/50">
          Los que ya te adjudicaron.
        </p>
      </header>

      <div className="flex flex-col gap-3 px-5 pt-5">
        {trabajos && trabajos.length > 0 ? (
          trabajos.map((t) => {
            const ped = pedidoDe(t);
            const inm = inmuebleDe(t);
            const pres = presupuestoDe(t);
            const paso = PASOS[t.estado] ?? PASOS.agendado;
            const contacto = inm?.persona_id
              ? contactos.get(inm.persona_id)
              : null;

            return (
              <div
                key={t.id}
                className="rounded-2xl border border-linea bg-white p-4"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span
                    className={`rounded-md px-2 py-1 text-[10.5px] font-bold tracking-wide ${paso.clase}`}
                  >
                    {paso.texto}
                  </span>
                  <b className="font-mono text-[14px] font-semibold text-tinta tabular-nums">
                    {pres ? aPesos(pres.total_centavos) : "—"}
                  </b>
                </div>

                <p className="text-[13.5px] leading-relaxed text-tinta">
                  {ped?.descripcion}
                </p>

                {/* Acá está lo que antes no se veía. */}
                {inm && (
                  <div className="mt-3 rounded-xl bg-fondo p-3">
                    <b className="block text-[13px] font-semibold text-tinta">
                      {inm.calle} {inm.altura}
                      {inm.piso && `, piso ${inm.piso}`}
                      {inm.depto && ` ${inm.depto}`}
                    </b>
                    {inm.barrio && (
                      <span className="block text-[12px] text-tinta-2">
                        {inm.barrio}
                      </span>
                    )}
                    {inm.instrucciones && (
                      <span className="mt-1 block text-[11.5px] leading-snug text-tinta-3">
                        {inm.instrucciones}
                      </span>
                    )}
                    {contacto && (
                      <div className="mt-2 border-t border-linea pt-2 text-[12.5px]">
                        <span className="text-tinta-2">{contacto.nombre}</span>
                        {contacto.telefono ? (
                          <a
                            href={`tel:${contacto.telefono}`}
                            className="ml-2 font-semibold text-marca underline underline-offset-2"
                          >
                            {contacto.telefono}
                          </a>
                        ) : (
                          <span className="ml-2 text-tinta-3">
                            (no cargó teléfono)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {t.agendado_para && (
                  <p className="mt-2.5 text-[11.5px] text-tinta-3">
                    Acordado para el{" "}
                    {new Date(t.agendado_para).toLocaleString("es-AR", {
                      weekday: "long",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}

                {paso.siguiente && (
                  <div className="mt-3">
                    <BotonAvanzar
                      trabajoId={t.id}
                      nuevo={paso.siguiente.estado}
                      texto={paso.siguiente.boton}
                    />
                  </div>
                )}

                {t.estado === "terminado" && (
                  <p className="mt-3 rounded-xl bg-marca-suave px-3 py-2.5 text-[11.5px] leading-snug text-tinta-2">
                    Avisamos al cliente. Cuando confirme se libera tu pago, y si
                    no dice nada se libera solo a las 72 horas.
                  </p>
                )}

                {(t.estado === "confirmado" || t.estado === "pagado") && (
                  <p className="mt-3 rounded-xl bg-ok-suave px-3 py-2.5 text-[11.5px] leading-snug text-tinta-2">
                    Trabajo confirmado por el cliente. El pago quedó liberado.
                  </p>
                )}
              </div>
            );
          })
        ) : (
          <p className="rounded-2xl border border-dashed border-linea px-4 py-8 text-center text-[13.5px] leading-relaxed text-tinta-3">
            Todavía no te adjudicaron ningún trabajo.
            <br />
            Mandá presupuestos desde “Trabajos disponibles”.
          </p>
        )}
      </div>
    </main>
  );
}

// Normalizadores de las relaciones anidadas.
type Inm = {
  alias: string;
  calle: string;
  altura: string;
  piso: string | null;
  depto: string | null;
  barrio: string | null;
  instrucciones: string | null;
  persona_id: string;
};

function uno<T>(v: unknown): T | null {
  if (!v) return null;
  return (Array.isArray(v) ? (v[0] ?? null) : v) as T | null;
}

function pedidoDe(t: { pedidos: unknown }) {
  return uno<{ id: string; oficio: string; descripcion: string }>(t.pedidos);
}

function inmuebleDe(t: { pedidos: unknown }): Inm | null {
  const ped = uno<{ inmuebles: unknown }>(t.pedidos);
  return ped ? uno<Inm>(ped.inmuebles) : null;
}

function presupuestoDe(t: { presupuestos: unknown }) {
  return uno<{ total_centavos: number }>(t.presupuestos);
}
