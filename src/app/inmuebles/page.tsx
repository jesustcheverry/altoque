/* ============================================================
   Mis inmuebles
   ------------------------------------------------------------
   Se ve en /inmuebles.

   Esta pantalla es la primera que exige estar adentro: si no
   entraste, te manda a /entrar. No es solo una cortesía — abajo
   además la base se niega a mostrar inmuebles ajenos, así que
   aunque alguien se saltee esta pantalla no vería nada.
   ============================================================ */

import Link from "next/link";
import { redirect } from "next/navigation";
import { clienteServidor } from "@/lib/supabase-servidor";
import FormularioInmueble from "@/components/FormularioInmueble";

const TIPOS: Record<string, string> = {
  departamento: "Departamento",
  ph: "PH",
  casa: "Casa",
  local: "Local",
  otro: "Otro",
};

export default async function Inmuebles() {
  const supabase = await clienteServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar");

  // Fijate que no decimos "dame los inmuebles DE ESTA PERSONA".
  // Pedimos todos, y la base devuelve solo los tuyos. Esa es la
  // regla "mis inmuebles" trabajando por nosotros.
  const { data: inmuebles, error } = await supabase
    .from("inmuebles")
    .select("id, alias, calle, altura, piso, depto, barrio, tipo, instrucciones")
    .order("creado_el");

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
          Mis inmuebles
        </h1>
        <p className="mt-1.5 text-[13px] text-white/60">
          Cada propiedad guarda su propio historial de arreglos.
        </p>
      </header>

      <div className="flex flex-col gap-4 px-5 pt-5">
        {error && (
          <p className="rounded-xl border border-alerta/30 bg-alerta-suave px-3.5 py-3 text-[13px] text-tinta-2">
            No se pudieron leer los inmuebles: {error.message}
          </p>
        )}

        {inmuebles && inmuebles.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {inmuebles.map((i) => (
              <Link
                key={i.id}
                href={`/inmuebles/${i.id}`}
                className="block rounded-2xl border border-linea bg-white p-3.5 transition hover:border-marca-2"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <b className="text-[14.5px] font-bold text-tinta">{i.alias}</b>
                  <span className="text-[11px] text-tinta-3">
                    {TIPOS[i.tipo ?? "otro"] ?? "Otro"}
                  </span>
                </div>
                <p className="mt-1 text-[13px] text-tinta-2">
                  {i.calle} {i.altura}
                  {i.piso && `, piso ${i.piso}`}
                  {i.depto && ` ${i.depto}`}
                  {i.barrio && ` · ${i.barrio}`}
                </p>
                <p className="mt-2 border-t border-linea-2 pt-2 text-[11.5px] font-semibold text-marca">
                  Ver el historial de esta propiedad →
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-linea px-4 py-6 text-center text-[13.5px] text-tinta-3">
            Todavía no cargaste ninguna propiedad.
            <br />
            Agregá la primera acá abajo.
          </p>
        )}

        <FormularioInmueble personaId={user.id} />
      </div>
    </main>
  );
}
