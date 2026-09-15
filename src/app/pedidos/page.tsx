/* ============================================================
   Mis pedidos
   ------------------------------------------------------------
   Se ve en /pedidos.

   Trae los pedidos junto con el inmueble al que pertenecen. Eso
   es lo que hace el "inmuebles(alias, calle, altura)" adentro
   del select: en una sola consulta la base devuelve el pedido y
   los datos de la propiedad asociada, siguiendo la relación que
   dibujamos en el paso 1.
   ============================================================ */

import Link from "next/link";
import { redirect } from "next/navigation";
import { clienteServidor } from "@/lib/supabase-servidor";

const ESTADOS: Record<string, { texto: string; clase: string }> = {
  borrador: { texto: "BORRADOR", clase: "bg-fondo text-tinta-3" },
  publicado: { texto: "ESPERANDO PRESUPUESTOS", clase: "bg-acento-suave text-acento-tinta" },
  adjudicado: { texto: "ADJUDICADO", clase: "bg-ok-suave text-ok" },
  cancelado: { texto: "CANCELADO", clase: "bg-fondo text-tinta-3" },
  expirado: { texto: "VENCIDO", clase: "bg-alerta-suave text-alerta" },
};

const URGENCIAS: Record<string, string> = {
  urgente: "Urgente",
  esta_semana: "Esta semana",
  solo_presupuesto: "Solo presupuesto",
};

export default async function Pedidos() {
  const supabase = await clienteServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar");

  const { data: pedidos, error } = await supabase
    .from("pedidos")
    .select(
      "id, oficio, descripcion, urgencia, franja_horaria, estado, publicado_el, vence_el, inmuebles(alias, calle, altura)",
    )
    .order("creado_el", { ascending: false });

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
          Mis pedidos
        </h1>
      </header>

      <div className="flex flex-col gap-3 px-5 pt-5">
        {error && (
          <p className="rounded-xl border border-alerta/30 bg-alerta-suave px-3.5 py-3 text-[13px] text-tinta-2">
            No se pudieron leer los pedidos: {error.message}
          </p>
        )}

        {pedidos && pedidos.length > 0 ? (
          pedidos.map((p) => {
            const estado = ESTADOS[p.estado] ?? ESTADOS.borrador;
            // La relación viene como lista o como objeto según el
            // caso, así que la normalizamos antes de mostrarla.
            const inm = Array.isArray(p.inmuebles) ? p.inmuebles[0] : p.inmuebles;

            return (
              <Link
                key={p.id}
                href={`/pedidos/${p.id}`}
                className="block rounded-2xl border border-linea bg-white p-3.5 transition hover:border-marca-2"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span
                    className={`rounded-md px-2 py-1 text-[10.5px] font-bold tracking-wide ${estado.clase}`}
                  >
                    {estado.texto}
                  </span>
                  <span className="text-[11px] text-tinta-3">
                    {p.publicado_el ? fecha(p.publicado_el) : "sin publicar"}
                  </span>
                </div>

                <p className="text-[13.5px] leading-relaxed text-tinta">
                  {p.descripcion}
                </p>

                <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-linea-2 pt-2.5">
                  <Etiqueta>{p.oficio}</Etiqueta>
                  <Etiqueta>{URGENCIAS[p.urgencia] ?? p.urgencia}</Etiqueta>
                  {p.franja_horaria && <Etiqueta>{p.franja_horaria}</Etiqueta>}
                  {inm && <Etiqueta>{inm.alias}</Etiqueta>}
                </div>

                {p.estado === "publicado" && p.vence_el && (
                  <p className="mt-2.5 text-[11.5px] text-tinta-3">
                    Abierto hasta el {fecha(p.vence_el)}. Tocá para ver los
                    presupuestos que llegaron.
                  </p>
                )}
              </Link>
            );
          })
        ) : (
          <p className="rounded-2xl border border-dashed border-linea px-4 py-8 text-center text-[13.5px] leading-relaxed text-tinta-3">
            Todavía no publicaste ningún pedido.
          </p>
        )}

        <Link
          href="/pedidos/nuevo"
          className="mt-2 rounded-xl bg-acento py-3.5 text-center text-[15px] font-bold text-acento-tinta"
        >
          Publicar un pedido
        </Link>
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
