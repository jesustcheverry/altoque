/* ============================================================
   Conexión con Supabase — lado SERVIDOR
   ------------------------------------------------------------
   Este lo usan las pantallas que se arman antes de llegar al
   navegador, como la de inicio.

   Lee la cookie de sesión para saber quién está mirando. Gracias
   a eso, las reglas de seguridad de la base (auth.uid()) saben
   qué le corresponde ver a cada uno.

   No hace falta que entiendas el detalle de las cookies: esto se
   escribe una vez y no se toca más.
   ============================================================ */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function clienteServidor() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Cuando esto se llama desde una pantalla (y no desde
            // el middleware), Next no deja escribir cookies. No es
            // un problema: el middleware ya se encarga de
            // refrescar la sesión.
          }
        },
      },
    },
  );
}
