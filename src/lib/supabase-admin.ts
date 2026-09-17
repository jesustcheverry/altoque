/* ============================================================
   Conexión con Supabase — LLAVE MAESTRA
   ------------------------------------------------------------
   ⚠️  ESTE ARCHIVO ES DISTINTO A LOS OTROS DOS.

   supabase.ts y supabase-servidor.ts usan la clave pública, y
   por eso las reglas de la base los vigilan: cada consulta pasa
   por auth.uid() y por las políticas de RLS.

   Este usa la clave de servicio, que IGNORA TODAS LAS REGLAS.
   Con ella se lee cualquier tabla y se escribe cualquier fila,
   como si fueras el dueño de la base. Que es exactamente lo que
   necesita el enviador de avisos: la tabla "avisos" no le da
   permiso a nadie, a propósito.

   DOS REGLAS QUE NO SE ROMPEN NUNCA:

   1. Esta función no se puede importar desde un archivo que
      diga "use client". Si lo hacés, la clave termina viajando
      al navegador de cualquiera que abra la app.

   2. La variable se llama SUPABASE_SERVICE_ROLE_KEY, SIN el
      prefijo NEXT_PUBLIC_. Ese prefijo es lo que le dice a Next
      "esto se puede mandar al navegador". Agregárselo a esta
      clave sería regalar la base entera.
   ============================================================ */

import { createClient } from "@supabase/supabase-js";

export function clienteAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !clave) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local",
    );
  }

  return createClient(url, clave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
