/* ============================================================
   Cola de verificación (pantalla del revisor)
   ------------------------------------------------------------
   Se ve en /admin/verificaciones.

   Esta pantalla NO tiene ningún candado escrito en el código.
   No chequea roles, no esconde botones, no redirige a nadie.

   Y sin embargo alguien que no sea revisor no ve un solo dato:
   la vista cola_de_verificacion tiene un "where soy_admin()"
   adentro, así que para cualquier otro devuelve cero filas.
   Y si igual se copiara el ID de un perfil y llamara a la
   función a mano, la función también pregunta.

   Esa es la diferencia entre esconder un botón y proteger un
   dato. Lo primero se saltea con la consola del navegador; lo
   segundo no.
   ============================================================ */

import Link from "next/link";
import { redirect } from "next/navigation";
import { clienteServidor } from "@/lib/supabase-servidor";
import BotonVerificar from "@/components/BotonVerificar";

export default async function Verificaciones() {
  const supabase = await clienteServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar");

  const { data: esAdmin } = await supabase.rpc("soy_admin");

  const { data: cola, error } = await supabase
    .from("cola_de_verificacion")
    .select("*");

  const { data: oficios } = await supabase
    .from("oficios_config")
    .select("oficio, nombre_visible, exige_matricula, exige_seguro");

  const config = new Map((oficios ?? []).map((o) => [o.oficio, o]));

  return (
    <main className="mx-auto min-h-screen max-w-md bg-white pb-12">
      <header className="bg-[#16211f] px-5 pt-6 pb-6 text-white">
        <Link
          href="/"
          className="text-[12.5px] font-semibold text-white/50 underline underline-offset-2"
        >
          ← Volver
        </Link>
        <h1 className="font-display mt-3 text-[23px] leading-tight font-extrabold">
          Verificaciones
        </h1>
        <p className="mt-1.5 text-[13px] text-white/50">
          {esAdmin
            ? "Profesionales esperando que alguien mire sus papeles."
            : "Esta sección es para revisores."}
        </p>
      </header>

      <div className="flex flex-col gap-3 px-5 pt-5">
        {!esAdmin && (
          <p className="rounded-2xl border border-dashed border-linea px-4 py-8 text-center text-[13.5px] leading-relaxed text-tinta-3">
            Tu cuenta no es revisora, así que no hay nada para ver acá.
          </p>
        )}

        {error && (
          <p className="rounded-xl border border-alerta/30 bg-alerta-suave px-3.5 py-3 text-[13px] text-tinta-2">
            No se pudo leer la cola: {error.message}
          </p>
        )}

        {esAdmin && cola && cola.length === 0 && (
          <p className="rounded-2xl border border-dashed border-linea px-4 py-8 text-center text-[13.5px] leading-relaxed text-tinta-3">
            No hay nadie esperando. Todo al día.
          </p>
        )}

        {esAdmin &&
          cola?.map((p) => {
            const oc = config.get(p.oficio);
            const pidePapeles = oc?.exige_matricula || oc?.exige_seguro;

            return (
              <div
                key={p.perfil_id}
                className="rounded-2xl border border-linea bg-white p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <b className="block text-[15px] font-bold text-tinta">
                      {p.nombre}
                    </b>
                    <span className="mt-0.5 block truncate text-[12px] text-tinta-3">
                      {p.email}
                    </span>
                  </div>
                  <span className="shrink-0 rounded-md bg-marca-suave px-2 py-1 text-[10.5px] font-bold tracking-wide text-marca">
                    {p.verificacion === "en_revision"
                      ? "EN REVISIÓN"
                      : "PENDIENTE"}
                  </span>
                </div>

                <p className="mt-2 text-[13px] font-semibold text-tinta-2">
                  {oc?.nombre_visible ?? p.oficio}
                  {p.zonas && p.zonas.length > 0 && (
                    <span className="font-normal text-tinta-3">
                      {" · "}
                      {p.zonas.join(" · ")}
                    </span>
                  )}
                </p>

                <div className="mt-2.5 flex flex-col gap-1 rounded-xl bg-fondo p-3 text-[12.5px] text-tinta-2">
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

                {/* La parte incómoda, dicha en voz alta. */}
                {pidePapeles && (
                  <p className="mt-2.5 rounded-xl border border-alerta/30 bg-alerta-suave px-3 py-2.5 text-[11.5px] leading-snug text-tinta-2">
                    Todavía no podés ver ningún documento: esto es lo que la
                    persona escribió, nada más. Verificar esto tal cual está
                    sería firmar sin leer.
                  </p>
                )}

                <BotonVerificar perfilId={p.perfil_id} />
              </div>
            );
          })}
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
        {valor ?? "no cargó"}
      </span>
    </span>
  );
}
