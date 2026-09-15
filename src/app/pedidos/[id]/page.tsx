/* ============================================================
   Un pedido, visto por el cliente
   ------------------------------------------------------------
   Se ve en /pedidos/[id]. Acá es donde el vecino compara los
   presupuestos que le llegaron y elige uno.

   Esta pantalla es, para mí, el corazón del producto. Es lo que
   hoy no existe: poder poner tres precios al lado del otro,
   con lo que incluye cada uno y quién lo manda, antes de
   decidir a quién dejás entrar a tu casa.
   ============================================================ */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { clienteServidor } from "@/lib/supabase-servidor";
import BotonAceptar from "@/components/BotonAceptar";
import SubirFotos from "@/components/SubirFotos";
import { aPesos } from "@/lib/plata";

const ESTADOS: Record<string, { texto: string; clase: string }> = {
  borrador: { texto: "BORRADOR", clase: "bg-fondo text-tinta-3" },
  publicado: { texto: "ABIERTO", clase: "bg-acento-suave text-acento-tinta" },
  adjudicado: { texto: "ADJUDICADO", clase: "bg-ok-suave text-ok" },
  cancelado: { texto: "CANCELADO", clase: "bg-fondo text-tinta-3" },
  expirado: { texto: "VENCIDO", clase: "bg-alerta-suave text-alerta" },
};

export default async function PedidoDetalle({
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
    .select(
      "id, oficio, descripcion, urgencia, franja_horaria, estado, vence_el, inmuebles(alias, calle, altura)",
    )
    .eq("id", id)
    .single();

  if (!pedido) notFound();

  // Los presupuestos, con el nombre de quien los mandó. La base
  // sigue la relación presupuesto → perfil → persona sola.
  const { data: presupuestos } = await supabase
    .from("presupuestos")
    .select(
      "id, total_centavos, mano_obra_centavos, repuestos_centavos, incluye, mensaje, disponible_el, estado, enviado_el, perfiles_profesionales(oficio, personas(nombre))",
    )
    .eq("pedido_id", id)
    .order("total_centavos");

  // Las fotos del pedido. En la tabla guardamos el camino del
  // archivo; para poder mostrarlo hay que pedirle a Supabase una
  // dirección firmada, que vence sola en una hora. Así una foto
  // de adentro de tu casa no queda accesible para siempre.
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

  const vigentes = (presupuestos ?? []).filter((p) => p.estado === "enviado");
  const aceptado = (presupuestos ?? []).find((p) => p.estado === "aceptado");
  const estado = ESTADOS[pedido.estado] ?? ESTADOS.borrador;
  const inm = Array.isArray(pedido.inmuebles)
    ? pedido.inmuebles[0]
    : pedido.inmuebles;

  // El más barato de los vigentes, para marcarlo.
  const masBarato = vigentes[0]?.id;

  return (
    <main className="mx-auto min-h-screen max-w-md bg-white pb-12">
      <header className="bg-marca px-5 pt-6 pb-6 text-white">
        <Link
          href="/pedidos"
          className="text-[12.5px] font-semibold text-white/60 underline underline-offset-2"
        >
          ← Mis pedidos
        </Link>
        <div className="mt-3 flex items-center gap-2">
          <span
            className={`rounded-md px-2 py-1 text-[10.5px] font-bold tracking-wide ${estado.clase}`}
          >
            {estado.texto}
          </span>
        </div>
        <h1 className="font-display mt-2 text-[19px] leading-snug font-extrabold">
          {pedido.descripcion.slice(0, 70)}
          {pedido.descripcion.length > 70 && "…"}
        </h1>
        <p className="mt-1.5 text-[12.5px] text-white/60">
          {pedido.oficio}
          {inm && ` · ${inm.calle} ${inm.altura}`}
          {pedido.franja_horaria && ` · ${pedido.franja_horaria}`}
        </p>
      </header>

      <div className="flex flex-col gap-3 px-5 pt-5">
        {aceptado && (
          <div className="rounded-2xl border border-ok/30 bg-ok-suave p-4">
            <b className="font-display block text-[14.5px] font-bold text-tinta">
              Elegiste a {nombreDe(aceptado)}
            </b>
            <p className="mt-1 text-[13px] text-tinta-2">
              Por {aPesos(aceptado.total_centavos)}. El trabajo ya está creado y
              el pago quedó retenido hasta que confirmes que terminó.
            </p>
          </div>
        )}

        {/* Las fotos. Van arriba porque son lo que más mejora la
            calidad de los presupuestos que vas a recibir. */}
        <div className="rounded-2xl border border-linea bg-white p-4">
          <b className="font-display block text-[14px] font-bold text-tinta">
            Fotos del problema
          </b>
          <p className="mt-1 mb-3 text-[12px] leading-snug text-tinta-3">
            Una foto de la chapa con el modelo, y otra de cómo está instalado.
            Con eso el profesional te da un precio firme en vez de un “a ver
            qué es”.
          </p>

          {fotosFirmadas.length > 0 && (
            <div className="mb-3 flex gap-2 overflow-x-auto">
              {fotosFirmadas.map((url) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={url}
                  src={url}
                  alt="Foto del problema"
                  className="size-24 shrink-0 rounded-xl border border-linea object-cover"
                />
              ))}
            </div>
          )}

          {pedido.estado === "publicado" && (
            <SubirFotos pedidoId={pedido.id} cantidadActual={fotos?.length ?? 0} />
          )}
        </div>

        {pedido.estado === "publicado" && (
          <p className="text-[12.5px] text-tinta-3">
            {vigentes.length === 0
              ? "Todavía no llegó ningún presupuesto."
              : `Llegaron ${vigentes.length} ${vigentes.length === 1 ? "presupuesto" : "presupuestos"}. Podés elegir uno o esperar más.`}
          </p>
        )}

        {vigentes.map((p) => (
          <div
            key={p.id}
            className={`rounded-2xl border p-4 ${
              p.id === masBarato && vigentes.length > 1
                ? "border-acento bg-acento-suave"
                : "border-linea bg-white"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <b className="block text-[14.5px] font-bold text-tinta">
                  {nombreDe(p)}
                </b>
                {p.id === masBarato && vigentes.length > 1 && (
                  <span className="text-[11px] font-semibold text-acento-tinta">
                    El más barato
                  </span>
                )}
              </div>
              <div className="shrink-0 text-right">
                <div className="font-mono text-[18px] font-semibold text-tinta tabular-nums">
                  {aPesos(p.total_centavos)}
                </div>
                <div className="text-[10px] text-tinta-3">
                  {p.repuestos_centavos > 0
                    ? `${aPesos(p.mano_obra_centavos)} + repuestos`
                    : "mano de obra"}
                </div>
              </div>
            </div>

            {p.mensaje && (
              <p className="mt-2.5 text-[13px] leading-relaxed text-tinta-2">
                {p.mensaje}
              </p>
            )}

            {p.incluye && p.incluye.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {p.incluye.map((i: string) => (
                  <span
                    key={i}
                    className="rounded-md border border-linea-2 bg-white px-2 py-1 text-[10.5px] font-semibold text-tinta-2"
                  >
                    {i}
                  </span>
                ))}
              </div>
            )}

            {p.disponible_el && (
              <p className="mt-2.5 text-[11.5px] text-tinta-3">
                Puede ir el {fecha(p.disponible_el)}
              </p>
            )}

            {pedido.estado === "publicado" && (
              <BotonAceptar presupuestoId={p.id} />
            )}
          </div>
        ))}
      </div>
    </main>
  );
}

// El nombre viaja anidado: presupuesto → perfil → persona.
// Esta función desenreda eso sin ensuciar la pantalla.
function nombreDe(p: {
  perfiles_profesionales?: unknown;
}): string {
  const perfil = Array.isArray(p.perfiles_profesionales)
    ? p.perfiles_profesionales[0]
    : p.perfiles_profesionales;
  const persona = (perfil as { personas?: unknown } | null)?.personas;
  const p2 = Array.isArray(persona) ? persona[0] : persona;
  return (p2 as { nombre?: string } | null)?.nombre ?? "Profesional";
}

function fecha(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
