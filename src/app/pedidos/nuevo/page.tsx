/* ============================================================
   Nuevo pedido
   ------------------------------------------------------------
   Se ve en /pedidos/nuevo. Si venís desde la grilla de oficios
   de la pantalla de inicio, llega con el oficio ya elegido:
   /pedidos/nuevo?oficio=gasista

   También puede llegar con la urgencia ya marcada, desde el
   cartel de urgencias:  /pedidos/nuevo?urgencia=urgente

   Esta pantalla solo junta los datos que necesita el formulario
   y se los pasa. El formulario es el que escribe en la base.
   ============================================================ */

import Link from "next/link";
import { redirect } from "next/navigation";
import { clienteServidor } from "@/lib/supabase-servidor";
import FormularioPedido from "@/components/FormularioPedido";

export default async function NuevoPedido({
  searchParams,
}: {
  searchParams: Promise<{ oficio?: string; urgencia?: string }>;
}) {
  const { oficio, urgencia } = await searchParams;
  const supabase = await clienteServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar");

  const { data: oficios } = await supabase
    .from("oficios_config")
    .select("oficio, nombre_visible")
    .order("nombre_visible");

  const { data: inmuebles } = await supabase
    .from("inmuebles")
    .select("id, alias, calle, altura")
    .order("creado_el");

  return (
    <main className="mx-auto min-h-screen max-w-md bg-white">
      <header className="bg-marca px-5 pt-6 pb-6 text-white">
        <Link
          href="/"
          className="text-[12.5px] font-semibold text-white/60 underline underline-offset-2"
        >
          ← Volver
        </Link>
        <h1 className="font-display mt-3 text-[23px] leading-tight font-extrabold">
          Contanos qué pasa
        </h1>
        <p className="mt-1.5 text-[13px] text-white/60">
          Lo publicamos y te responden varios. Sin cargo.
        </p>
      </header>

      {/* Sin inmueble no hay pedido: el pedido cuelga de una
          propiedad, no de una persona. Así que si todavía no
          cargó ninguna, lo mandamos a cargarla primero. */}
      {!inmuebles || inmuebles.length === 0 ? (
        <div className="px-5 pt-6">
          <p className="rounded-2xl border border-dashed border-linea px-4 py-6 text-center text-[13.5px] leading-relaxed text-tinta-3">
            Antes de publicar un pedido necesitamos saber dónde es.
          </p>
          <Link
            href="/inmuebles"
            className="mt-4 block rounded-xl bg-acento py-3.5 text-center text-[15px] font-bold text-acento-tinta"
          >
            Cargar mi dirección
          </Link>
        </div>
      ) : (
        <FormularioPedido
          oficios={oficios ?? []}
          inmuebles={inmuebles}
          oficioInicial={oficio}
          urgenciaInicial={urgencia}
        />
      )}
    </main>
  );
}
