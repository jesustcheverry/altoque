/* ============================================================
   Perfil público de un profesional
   ------------------------------------------------------------
   Se ve en /profesionales/[id]. Es lo que mira el vecino antes
   de decidir a quién deja entrar a su casa.

   Todo lo que hay acá sale de la vista profesionales_publicos,
   que expone nombre, oficio, zonas, bio y reputación — y NO
   expone teléfono ni mail. Esta pantalla no podría filtrar esos
   datos aunque tuviera un error: directamente no los recibe.
   ============================================================ */

import Link from "next/link";
import { notFound } from "next/navigation";
import { clienteServidor } from "@/lib/supabase-servidor";
import { colorDeAvatar, inicialesDe } from "@/lib/avatar";

export default async function PerfilPublico({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await clienteServidor();

  const { data: pro } = await supabase
    .from("profesionales_publicos")
    .select("*")
    .eq("id", id)
    .single();

  if (!pro) notFound();

  const { data: oficio } = await supabase
    .from("oficios_config")
    .select("nombre_visible")
    .eq("oficio", pro.oficio)
    .single();

  // Las reseñas son públicas a propósito: son el motivo por el
  // que alguien elige a un profesional y no a otro.
  const { data: resenas } = await supabase
    .from("resenas")
    .select("id, estrellas, texto, publicada_el, trabajos!inner(profesional_id)")
    .eq("trabajos.profesional_id", id)
    .order("publicada_el", { ascending: false })
    .limit(10);

  const iniciales = inicialesDe(pro.nombre);
  const color = colorDeAvatar(pro.nombre);

  return (
    <main className="mx-auto min-h-screen max-w-md bg-white pb-12">
      <header className="bg-marca px-5 pt-6 pb-6 text-white">
        <Link
          href="/"
          className="text-apoyo font-semibold text-white/60 underline underline-offset-2"
        >
          ← Volver
        </Link>

        <div className="mt-4 flex items-center gap-3.5">
          <span
            className="font-display grid size-16 shrink-0 place-items-center rounded-2xl text-titulo font-bold"
            style={{ background: color }}
          >
            {iniciales}
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-titulo leading-tight font-extrabold">
              {pro.nombre}
            </h1>
            <p className="mt-0.5 text-apoyo text-white/60">
              {oficio?.nombre_visible ?? pro.oficio}
              {pro.zonas?.length > 0 && ` · ${pro.zonas[0]}`}
            </p>
          </div>
        </div>
      </header>

      {/* Los tres números que importan para decidir. */}
      <div className="grid grid-cols-3 border-b border-linea">
        <Numero
          valor={pro.puntaje ? Number(pro.puntaje).toFixed(1) : "—"}
          texto={
            pro.cantidad_resenas === 1
              ? "1 reseña"
              : `${pro.cantidad_resenas ?? 0} reseñas`
          }
        />
        <Numero
          valor={String(pro.trabajos_terminados ?? 0)}
          texto="trabajos hechos"
          borde
        />
        <Numero
          valor={pro.desde ? String(new Date().getFullYear() - pro.desde) : "—"}
          texto="años acá"
        />
      </div>

      {pro.bio && (
        <div className="border-b border-linea px-5 py-4">
          <p className="text-cuerpo leading-relaxed text-tinta-2">{pro.bio}</p>
        </div>
      )}

      {/* Qué verificamos. El vecino tiene derecho a saber qué
          mira la app y qué no. */}
      <div className="border-b border-linea px-5 py-4">
        <h2 className="font-display mb-3 text-cuerpo font-bold text-tinta">
          Qué verificamos
        </h2>
        <div className="flex flex-col gap-2.5">
          <Verificacion
            ok={pro.matricula_vigente}
            titulo="Matrícula vigente"
            detalle={
              pro.matricula_vigente
                ? "Declarada y sin vencer"
                : "No corresponde o no está vigente"
            }
          />
          <Verificacion
            ok={pro.seguro_vigente}
            titulo="Seguro de responsabilidad civil"
            detalle={
              pro.seguro_vigente
                ? "Declarado y sin vencer"
                : "No corresponde o no está vigente"
            }
          />
        </div>
        <p className="mt-3 text-etiqueta leading-snug text-tinta-3">
          Si alguno de estos papeles se vence, el profesional deja de recibir
          pedidos automáticamente.
        </p>
      </div>

      {/* Zonas */}
      {pro.zonas?.length > 0 && (
        <div className="border-b border-linea px-5 py-4">
          <h2 className="font-display mb-2.5 text-cuerpo font-bold text-tinta">
            Dónde trabaja
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {pro.zonas.map((z: string) => (
              <span
                key={z}
                className="rounded-md border border-linea-2 bg-fondo px-2 py-1 text-etiqueta font-semibold text-tinta-2"
              >
                {z}
              </span>
            ))}
            <span className="rounded-md border border-linea-2 bg-fondo px-2 py-1 text-etiqueta font-semibold text-tinta-2">
              hasta {pro.radio_km} km
            </span>
          </div>
        </div>
      )}

      <div className="px-5 py-4">
        <h2 className="font-display mb-3 text-cuerpo font-bold text-tinta">
          Reseñas de vecinos
        </h2>

        {resenas && resenas.length > 0 ? (
          <div className="flex flex-col gap-3.5">
            {resenas.map((r) => (
              <div key={r.id} className="border-b border-linea-2 pb-3.5 last:border-0">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-apoyo text-acento">
                    {"★".repeat(r.estrellas)}
                    <span className="text-linea">
                      {"★".repeat(5 - r.estrellas)}
                    </span>
                  </span>
                  <time className="text-etiqueta text-tinta-3">
                    {new Date(r.publicada_el).toLocaleDateString("es-AR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </time>
                </div>
                {r.texto && (
                  <p className="text-apoyo leading-relaxed text-tinta-2">
                    {r.texto}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-linea px-4 py-6 text-center text-apoyo leading-relaxed text-tinta-3">
            Todavía no tiene reseñas.
            <br />
            Es normal cuando recién empieza.
          </p>
        )}
      </div>
    </main>
  );
}

function Numero({
  valor,
  texto,
  borde = false,
}: {
  valor: string;
  texto: string;
  borde?: boolean;
}) {
  return (
    <div
      className={`px-2 py-3.5 text-center ${borde ? "border-x border-linea" : ""}`}
    >
      <b className="font-display block text-titulo font-bold text-tinta tabular-nums">
        {valor}
      </b>
      <span className="mt-0.5 block text-etiqueta text-tinta-3">{texto}</span>
    </div>
  );
}

function Verificacion({
  ok,
  titulo,
  detalle,
}: {
  ok: boolean;
  titulo: string;
  detalle: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span
        className={`mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-full ${
          ok ? "bg-ok text-white" : "bg-fondo text-tinta-3"
        }`}
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {ok ? <path d="M5 12.5l4.5 4.5L19 7" /> : <path d="M6 6l12 12M18 6L6 18" />}
        </svg>
      </span>
      <div>
        <b className="block text-apoyo font-semibold text-tinta">{titulo}</b>
        <span className="block text-etiqueta text-tinta-3">{detalle}</span>
      </div>
    </div>
  );
}
