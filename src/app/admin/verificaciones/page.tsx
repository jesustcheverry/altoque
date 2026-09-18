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

  // Los papeles de todos los que están en la cola.
  const idsEnCola = (cola ?? []).map((p) => p.perfil_id);
  const { data: documentos } = idsEnCola.length
    ? await supabase
        .from("documentos_profesional")
        .select("id, perfil_id, tipo, ruta, subido_el")
        .in("perfil_id", idsEnCola)
        .order("subido_el", { ascending: false })
    : { data: [] };

  // Los archivos del bucket son privados: no se abren pegando la
  // dirección. Hay que pedir un permiso temporal, que es esto.
  // Dura cinco minutos y después el enlace deja de servir.
  const enlaces = new Map<string, string>();
  if (documentos && documentos.length > 0) {
    const { data: firmados } = await supabase.storage
      .from("documentos")
      .createSignedUrls(
        documentos.map((d) => d.ruta),
        300,
      );
    for (const f of firmados ?? []) {
      if (f.path && f.signedUrl) enlaces.set(f.path, f.signedUrl);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-md bg-white pb-12">
      <header className="bg-marca-oscura px-5 pt-6 pb-6 text-white">
        <Link
          href="/"
          className="text-apoyo font-semibold text-white/50 underline underline-offset-2"
        >
          ← Volver
        </Link>
        <h1 className="font-display mt-3 text-titulo leading-tight font-extrabold">
          Verificaciones
        </h1>
        <p className="mt-1.5 text-apoyo text-white/50">
          {esAdmin
            ? "Profesionales esperando que alguien mire sus papeles."
            : "Esta sección es para revisores."}
        </p>
      </header>

      <div className="flex flex-col gap-3 px-5 pt-5">
        {!esAdmin && (
          <p className="rounded-2xl border border-dashed border-linea px-4 py-8 text-center text-cuerpo leading-relaxed text-tinta-3">
            Tu cuenta no es revisora, así que no hay nada para ver acá.
          </p>
        )}

        {error && (
          <p className="rounded-xl border border-alerta/30 bg-alerta-suave px-3.5 py-3 text-apoyo text-tinta-2">
            No se pudo leer la cola: {error.message}
          </p>
        )}

        {esAdmin && cola && cola.length === 0 && (
          <p className="rounded-2xl border border-dashed border-linea px-4 py-8 text-center text-cuerpo leading-relaxed text-tinta-3">
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
                    <b className="block text-destacado font-bold text-tinta">
                      {p.nombre}
                    </b>
                    <span className="mt-0.5 block truncate text-apoyo text-tinta-3">
                      {p.email}
                    </span>
                  </div>
                  <span className="shrink-0 rounded-md bg-marca-suave px-2 py-1 text-etiqueta font-bold tracking-wide text-marca">
                    {p.verificacion === "en_revision"
                      ? "EN REVISIÓN"
                      : "PENDIENTE"}
                  </span>
                </div>

                <p className="mt-2 text-apoyo font-semibold text-tinta-2">
                  {oc?.nombre_visible ?? p.oficio}
                  {p.zonas && p.zonas.length > 0 && (
                    <span className="font-normal text-tinta-3">
                      {" · "}
                      {p.zonas.join(" · ")}
                    </span>
                  )}
                </p>

                <div className="mt-2.5 flex flex-col gap-1 rounded-xl bg-fondo p-3 text-apoyo text-tinta-2">
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

                {/* Los papeles. Esto es lo que mirás antes de decidir. */}
                {pidePapeles && (() => {
                  const suyos = (documentos ?? []).filter(
                    (d) => d.perfil_id === p.perfil_id,
                  );

                  if (suyos.length === 0) {
                    return (
                      <p className="mt-2.5 rounded-xl border border-alerta/30 bg-alerta-suave px-3 py-2.5 text-etiqueta leading-snug text-tinta-2">
                        No mandó ningún papel todavía. Lo único que hay es lo
                        que escribió. Verificar esto sería firmar sin leer.
                      </p>
                    );
                  }

                  return (
                    <div className="mt-2.5 flex flex-col gap-1.5">
                      {suyos.map((d) => {
                        const url = enlaces.get(d.ruta);
                        return (
                          <a
                            key={d.id}
                            href={url ?? "#"}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between gap-2 rounded-xl border border-marca-2 bg-marca-suave px-3 py-2.5"
                          >
                            <span>
                              <b className="block text-apoyo font-semibold text-tinta">
                                {d.tipo === "matricula"
                                  ? "Matrícula"
                                  : d.tipo === "seguro"
                                    ? "Certificado de seguro"
                                    : d.tipo}
                              </b>
                              <span className="block text-etiqueta text-tinta-3">
                                Enviado el{" "}
                                {new Date(d.subido_el).toLocaleDateString(
                                  "es-AR",
                                )}
                              </span>
                            </span>
                            <span className="shrink-0 text-etiqueta font-bold text-marca underline underline-offset-2">
                              Abrir →
                            </span>
                          </a>
                        );
                      })}
                    </div>
                  );
                })()}

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
