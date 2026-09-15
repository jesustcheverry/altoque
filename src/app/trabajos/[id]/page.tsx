/* ============================================================
   Un pedido, visto por el profesional
   ------------------------------------------------------------
   Se ve en /trabajos/[id]. La carpeta se llama [id] con
   corchetes: eso le dice a Next que esa parte de la dirección
   es variable. /trabajos/abc123 y /trabajos/xyz789 entran los
   dos por este archivo.

   Para poder presupuestar hacen falta dos cosas: que el pedido
   exista y esté abierto, y que el profesional esté habilitado
   en ese oficio. Si no, mostramos por qué no.
   ============================================================ */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { clienteServidor } from "@/lib/supabase-servidor";
import FormularioPresupuesto from "@/components/FormularioPresupuesto";
import { aPesos } from "@/lib/plata";

const URGENCIAS: Record<string, string> = {
  urgente: "Urgente · hoy",
  esta_semana: "Esta semana",
  solo_presupuesto: "Solo quiere un estimado",
};

export default async function TrabajoDetalle({
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

  const { data: pedido } = await supabase
    .from("pedidos")
    .select("id, oficio, descripcion, urgencia, franja_horaria, estado, publicado_el")
    .eq("id", id)
    .single();

  if (!pedido) notFound();

  // ¿Estoy habilitado en el oficio de este pedido?
  const { data: perfiles } = await supabase
    .from("profesionales_habilitados")
    .select("id, oficio")
    .eq("oficio", pedido.oficio);

  const perfil = perfiles?.[0] ?? null;

  // ¿Ya mandé un presupuesto para este pedido?
  const { data: mios } = await supabase
    .from("presupuestos")
    .select("id, total_centavos, estado, enviado_el")
    .eq("pedido_id", id)
    .order("enviado_el", { ascending: false });

  // Las mismas fotos, ahora del lado del profesional. Las puede
  // ver porque la regla del bucket se lo permite mientras el
  // pedido esté abierto y él esté habilitado en ese oficio.
  const { data: fotos } = await supabase
    .from("pedido_fotos")
    .select("id, url")
    .eq("pedido_id", id)
    .order("orden");

  let fotosFirmadas: string[] = [];
  if (fotos && fotos.length > 0) {
    const { data: firmadas } = await supabase.storage
      .from("pedidos")
      .createSignedUrls(
        fotos.map((f) => f.url),
        3600,
      );
    fotosFirmadas = (firmadas ?? [])
      .map((f) => f.signedUrl)
      .filter((u): u is string => Boolean(u));
  }

  const { data: config } = await supabase
    .from("configuracion")
    .select("valor")
    .eq("clave", "comision_pct")
    .single();

  const comisionPct = Number(config?.valor ?? 12);

  return (
    <main className="mx-auto min-h-screen max-w-md bg-white">
      <header className="bg-[#16211f] px-5 pt-6 pb-6 text-white">
        <Link
          href="/trabajos"
          className="text-[12.5px] font-semibold text-white/50 underline underline-offset-2"
        >
          ← Volver a trabajos
        </Link>
        <h1 className="font-display mt-3 text-[20px] leading-snug font-extrabold">
          {URGENCIAS[pedido.urgencia] ?? pedido.urgencia}
        </h1>
        <p className="mt-1 text-[13px] text-white/50">
          {pedido.oficio}
          {pedido.franja_horaria && ` · ${pedido.franja_horaria}`}
        </p>
      </header>

      <div className="border-b border-linea px-5 py-4">
        <p className="text-[14px] leading-relaxed text-tinta">
          “{pedido.descripcion}”
        </p>
        {fotosFirmadas.length > 0 && (
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {fotosFirmadas.map((url) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={url}
                src={url}
                alt="Foto del problema"
                className="size-28 shrink-0 rounded-xl border border-linea object-cover"
              />
            ))}
          </div>
        )}

        <p className="mt-3 text-[11.5px] leading-snug text-tinta-3">
          La dirección exacta y el teléfono del cliente aparecen cuando acepta
          tu presupuesto.
        </p>
      </div>

      {mios && mios.length > 0 && (
        <div className="border-b border-linea bg-fondo px-5 py-4">
          <p className="mb-2 text-[12px] font-semibold text-tinta">
            Ya mandaste {mios.length === 1 ? "un presupuesto" : `${mios.length} presupuestos`}
          </p>
          {mios.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between py-1 text-[13px]"
            >
              <span className="text-tinta-2">{estadoTexto(m.estado)}</span>
              <b className="font-mono font-semibold text-tinta tabular-nums">
                {aPesos(m.total_centavos)}
              </b>
            </div>
          ))}
        </div>
      )}

      {pedido.estado !== "publicado" ? (
        <p className="m-5 rounded-2xl border border-dashed border-linea px-4 py-8 text-center text-[13.5px] leading-relaxed text-tinta-3">
          Este pedido ya no está abierto.
        </p>
      ) : !perfil ? (
        <div className="m-5 rounded-2xl border border-dashed border-linea px-4 py-8 text-center">
          <p className="text-[13.5px] leading-relaxed text-tinta-3">
            No estás habilitado en {pedido.oficio}. Revisá tus papeles para
            poder presupuestar.
          </p>
          <Link
            href="/profesional"
            className="mt-4 inline-block rounded-xl bg-acento px-5 py-3 text-[14.5px] font-bold text-acento-tinta"
          >
            Ver mi perfil
          </Link>
        </div>
      ) : (
        <FormularioPresupuesto
          pedidoId={pedido.id}
          perfilId={perfil.id}
          comisionPct={comisionPct}
        />
      )}
    </main>
  );
}

function estadoTexto(estado: string) {
  const mapa: Record<string, string> = {
    enviado: "Esperando respuesta",
    aceptado: "Aceptado",
    rechazado: "El cliente eligió a otro",
    reemplazado: "Reemplazado por uno nuevo",
    expirado: "Vencido",
  };
  return mapa[estado] ?? estado;
}
