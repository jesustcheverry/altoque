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
import BotonAvanzar from "@/components/BotonAvanzar";
import FormularioResena from "@/components/FormularioResena";
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

  const { data: presupuestos } = await supabase
    .from("presupuestos")
    .select(
      "id, profesional_id, total_centavos, mano_obra_centavos, repuestos_centavos, incluye, mensaje, disponible_el, estado, enviado_el",
    )
    .eq("pedido_id", id)
    .order("total_centavos");

  // Y los nombres salen de la vista pública.
  //
  // Antes esta pantalla intentaba leerlos de la tabla "personas"
  // y volvían vacíos, porque la regla de esa tabla dice que cada
  // uno ve solo su propia fila. Está bien que sea así: ahí está
  // el teléfono. La vista expone nombre y reputación, y nada más.
  const idsProf = (presupuestos ?? []).map((p) => p.profesional_id);
  const mapaProf = new Map<
    string,
    { nombre: string; puntaje: number | null; cantidad_resenas: number }
  >();
  if (idsProf.length > 0) {
    const { data: profs } = await supabase
      .from("profesionales_publicos")
      .select("id, nombre, puntaje, cantidad_resenas")
      .in("id", idsProf);
    for (const pr of profs ?? []) mapaProf.set(pr.id, pr);
  }

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

  // El trabajo que nació al aceptar un presupuesto, si ya existe.
  const { data: trabajo } = await supabase
    .from("trabajos")
    .select(
      "id, estado, agendado_para, en_camino_el, empezo_el, termino_el, confirmado_el",
    )
    .eq("pedido_id", id)
    .maybeSingle();

  const { data: resena } = trabajo
    ? await supabase
        .from("resenas")
        .select("id, estrellas, texto")
        .eq("trabajo_id", trabajo.id)
        .maybeSingle()
    : { data: null };

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
              Elegiste a{" "}
              {mapaProf.get(aceptado.profesional_id)?.nombre ?? "un profesional"}
            </b>
            <p className="mt-1 text-[13px] text-tinta-2">
              Por {aPesos(aceptado.total_centavos)}. El trabajo ya está creado y
              el pago quedó retenido hasta que confirmes que terminó.
            </p>
          </div>
        )}

        {trabajo && (
          <div className="rounded-2xl border border-linea bg-white p-4">
            <b className="font-display block text-[14px] font-bold text-tinta">
              Estado del trabajo
            </b>

            <div className="mt-3">
              <Paso hecho texto="Aceptaste el presupuesto" />
              <Paso
                hecho={Boolean(trabajo.en_camino_el)}
                texto="El profesional salió para allá"
              />
              <Paso
                hecho={Boolean(trabajo.empezo_el)}
                texto="Llegó y empezó el trabajo"
              />
              <Paso
                hecho={Boolean(trabajo.termino_el)}
                texto="Marcó que terminó"
              />
              <Paso
                hecho={Boolean(trabajo.confirmado_el)}
                texto="Confirmaste y se liberó el pago"
                ultimo
              />
            </div>

            {trabajo.estado === "terminado" && (
              <div className="mt-4 flex flex-col gap-2">
                <p className="text-[12px] leading-snug text-tinta-2">
                  El profesional marcó que terminó. Si está todo bien,
                  confirmalo y se le libera el pago. Si hay un problema, abrí
                  una disputa y el pago queda frenado.
                </p>
                <BotonAvanzar
                  trabajoId={trabajo.id}
                  nuevo="confirmado"
                  texto="Confirmar que terminó"
                />
                <BotonAvanzar
                  trabajoId={trabajo.id}
                  nuevo="en_disputa"
                  texto="Tengo un problema"
                  tono="suave"
                />
                <p className="text-center text-[11px] text-tinta-3">
                  Si no hacés nada, se confirma solo a las 72 horas.
                </p>
              </div>
            )}

            {trabajo.estado === "en_disputa" && (
              <p className="mt-3 rounded-xl bg-alerta-suave px-3 py-2.5 text-[12px] leading-snug text-tinta-2">
                Abriste una disputa. El pago quedó frenado hasta que se
                resuelva.
              </p>
            )}
          </div>
        )}

        {trabajo &&
          (trabajo.estado === "confirmado" || trabajo.estado === "pagado") &&
          (resena ? (
            <div className="rounded-2xl border border-linea bg-white p-4">
              <b className="font-display block text-[14px] font-bold text-tinta">
                Tu reseña
              </b>
              <div className="mt-1 text-[16px] text-acento">
                {"\u2605".repeat(resena.estrellas)}
                <span className="text-linea">
                  {"\u2605".repeat(5 - resena.estrellas)}
                </span>
              </div>
              {resena.texto && (
                <p className="mt-1.5 text-[13px] leading-relaxed text-tinta-2">
                  {resena.texto}
                </p>
              )}
            </div>
          ) : (
            <FormularioResena trabajoId={trabajo.id} autorId={user.id} />
          ))}

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
                <Link
                  href={`/profesionales/${p.profesional_id}`}
                  className="block text-[14.5px] font-bold text-tinta underline decoration-linea underline-offset-2"
                >
                  {mapaProf.get(p.profesional_id)?.nombre ?? "Profesional"}
                </Link>
                <span className="mt-0.5 block text-[11px] text-tinta-3">
                  {mapaProf.get(p.profesional_id)?.puntaje
                    ? `★ ${Number(mapaProf.get(p.profesional_id)!.puntaje).toFixed(1)} · ${mapaProf.get(p.profesional_id)!.cantidad_resenas} reseñas`
                    : "Todavía sin reseñas"}
                </span>
                {p.id === masBarato && vigentes.length > 1 && (
                  <span className="mt-0.5 block text-[11px] font-semibold text-acento-tinta">
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

function fecha(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Un pasito del recorrido. Lo hecho queda marcado; lo que falta,
// en gris. Sirve para que el cliente sepa en qué anda sin tener
// que llamar a nadie.
function Paso({
  hecho,
  texto,
  ultimo = false,
}: {
  hecho: boolean;
  texto: string;
  ultimo?: boolean;
}) {
  return (
    <div className="relative flex gap-3 pb-3.5 last:pb-0">
      {!ultimo && (
        <span
          className={`absolute top-4 left-[7px] bottom-0 w-0.5 ${hecho ? "bg-ok" : "bg-linea"}`}
        />
      )}
      <span
        className={`z-10 mt-0.5 grid size-4 shrink-0 place-items-center rounded-full ${
          hecho ? "bg-ok text-white" : "border-2 border-linea bg-white"
        }`}
      >
        {hecho && (
          <svg
            width="9"
            height="9"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12.5l4.5 4.5L19 7" />
          </svg>
        )}
      </span>
      <span
        className={`text-[13px] ${hecho ? "font-medium text-tinta" : "text-tinta-3"}`}
      >
        {texto}
      </span>
    </div>
  );
}
