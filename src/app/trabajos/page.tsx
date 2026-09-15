/* ============================================================
   Trabajos disponibles
   ------------------------------------------------------------
   Se ve en /trabajos. Es el feed del profesional.

   Mirá bien la consulta de abajo: dice "dame los pedidos
   publicados". Nada más. No filtra por oficio, ni por zona, ni
   por si tenés los papeles al día.

   Y sin embargo solo vas a ver los pedidos de los oficios en
   los que estás habilitado. Todo ese filtro vive en la regla
   "pedidos abiertos de mi oficio" de la base, que pregunta por
   la vista profesionales_habilitados.

   Consecuencia práctica: el día que se te vence la matrícula,
   este feed se vacía solo. Nadie tiene que acordarse de nada.
   ============================================================ */

import Link from "next/link";
import { redirect } from "next/navigation";
import { clienteServidor } from "@/lib/supabase-servidor";

const URGENCIAS: Record<string, string> = {
  urgente: "Urgente",
  esta_semana: "Esta semana",
  solo_presupuesto: "Solo presupuesto",
};

export default async function Trabajos() {
  const supabase = await clienteServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar");

  const { data: habilitados } = await supabase
    .from("profesionales_habilitados")
    .select("oficio");

  const { data: pedidos, error } = await supabase
    .from("pedidos")
    .select("id, oficio, descripcion, urgencia, franja_horaria, publicado_el")
    .eq("estado", "publicado")
    .order("publicado_el", { ascending: false });

  const sinHabilitar = !habilitados || habilitados.length === 0;

  return (
    <main className="mx-auto min-h-screen max-w-md bg-white pb-12">
      <header className="bg-[#16211f] px-5 pt-6 pb-6 text-white">
        <Link
          href="/"
          className="text-[12.5px] font-semibold text-white/50 underline underline-offset-2"
        >
          ← Volver
        </Link>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-[23px] leading-tight font-extrabold">
              Trabajos disponibles
            </h1>
            <p className="mt-1.5 text-[13px] text-white/50">
              {sinHabilitar
                ? "Todavía no estás habilitado en ningún oficio."
                : `Pedidos abiertos de ${habilitados.map((h) => h.oficio).join(", ")}.`}
            </p>
          </div>
          <Link
            href="/profesional"
            className="shrink-0 text-[12px] font-semibold text-white/70 underline underline-offset-2"
          >
            Mi perfil
          </Link>
        </div>
      </header>

      <div className="flex flex-col gap-3 px-5 pt-5">
        {error && (
          <p className="rounded-xl border border-alerta/30 bg-alerta-suave px-3.5 py-3 text-[13px] text-tinta-2">
            No se pudieron leer los pedidos: {error.message}
          </p>
        )}

        {sinHabilitar ? (
          <div className="rounded-2xl border border-dashed border-linea px-4 py-8 text-center">
            <p className="text-[13.5px] leading-relaxed text-tinta-3">
              Para ver trabajos primero tenés que activar un oficio y tener los
              papeles vigentes.
            </p>
            <Link
              href="/profesional"
              className="mt-4 inline-block rounded-xl bg-acento px-5 py-3 text-[14.5px] font-bold text-acento-tinta"
            >
              Activar mi oficio
            </Link>
          </div>
        ) : pedidos && pedidos.length > 0 ? (
          pedidos.map((p) => (
            <div
              key={p.id}
              className={`rounded-2xl border bg-white p-3.5 ${
                p.urgencia === "urgente"
                  ? "border-l-[3px] border-l-alerta border-linea"
                  : "border-linea"
              }`}
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {p.urgencia === "urgente" && (
                  <span className="rounded-md bg-alerta-suave px-2 py-1 text-[10.5px] font-bold tracking-wide text-alerta">
                    URGENTE
                  </span>
                )}
                <span className="text-[11px] text-tinta-3">
                  {p.publicado_el ? fecha(p.publicado_el) : ""}
                </span>
              </div>

              <p className="text-[13.5px] leading-relaxed text-tinta">
                {p.descripcion}
              </p>

              <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-linea-2 pt-2.5">
                <Etiqueta>{p.oficio}</Etiqueta>
                <Etiqueta>{URGENCIAS[p.urgencia] ?? p.urgencia}</Etiqueta>
                {p.franja_horaria && <Etiqueta>{p.franja_horaria}</Etiqueta>}
              </div>

              <p className="mt-2.5 text-[11.5px] text-tinta-3">
                La dirección exacta y el teléfono aparecen cuando el cliente
                acepta tu presupuesto.
              </p>
            </div>
          ))
        ) : (
          <p className="rounded-2xl border border-dashed border-linea px-4 py-8 text-center text-[13.5px] leading-relaxed text-tinta-3">
            No hay pedidos abiertos de tus oficios en este momento.
          </p>
        )}
      </div>
    </main>
  );
}

function Etiqueta({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md border border-linea-2 bg-fondo px-2 py-1 text-[10.5px] font-semibold text-tinta-2">
      {children}
    </span>
  );
}

function fecha(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
