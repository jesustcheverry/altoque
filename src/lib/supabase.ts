/* ============================================================
   Conexión con Supabase — lado NAVEGADOR
   ------------------------------------------------------------
   Este es el que usan las pantallas donde el usuario escribe
   cosas: el formulario de registro, el de ingreso, el botón de
   salir.

   Guarda la sesión en una cookie del navegador, y esa cookie es
   la que después lee el servidor para saber quién sos. Por eso
   hay dos archivos y no uno.
   ============================================================ */

import { createBrowserClient } from "@supabase/ssr";

export function clienteNavegador() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
