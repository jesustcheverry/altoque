/* ============================================================
   La conexión con la base de datos
   ------------------------------------------------------------
   Este archivo se escribe una sola vez y después lo usa toda la
   app. Cada vez que una pantalla necesite datos, va a decir
   "importá supabase de acá" y listo.

   Las dos claves salen de .env.local, el archivo que creaste
   vos. Nunca se escriben acá adentro: si estuvieran en el
   código, se subirían a GitHub.
   ============================================================ */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const clave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Si alguna de las dos falta, mejor avisar con un mensaje claro
// ahora que perseguir un error raro dentro de media hora.
if (!url || !clave) {
  throw new Error(
    "Faltan las claves de Supabase. Revisá que .env.local tenga NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY, y reiniciá el servidor.",
  );
}

export const supabase = createClient(url, clave);
