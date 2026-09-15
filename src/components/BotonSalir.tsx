/* ============================================================
   Botón de salir
   ------------------------------------------------------------
   Es un archivo aparte porque necesita "use client" (reacciona a
   un clic), pero la pantalla de inicio no lo necesita. Poniendo
   solo este pedacito del lado del navegador, el resto de la
   pantalla sigue armándose en el servidor, que es más rápido.
   ============================================================ */

"use client";

import { useRouter } from "next/navigation";
import { clienteNavegador } from "@/lib/supabase";

export default function BotonSalir() {
  const router = useRouter();

  async function salir() {
    const supabase = clienteNavegador();
    await supabase.auth.signOut();
    router.refresh(); // vuelve a armar la pantalla, ya sin sesión
  }

  return (
    <button
      onClick={salir}
      className="text-[12px] font-semibold text-white/60 underline underline-offset-2"
    >
      Salir
    </button>
  );
}
