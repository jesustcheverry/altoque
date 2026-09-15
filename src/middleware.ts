/* ============================================================
   Middleware
   ------------------------------------------------------------
   Esto corre antes de cada pantalla. Su único trabajo es
   mantener viva la sesión del usuario: las sesiones vencen cada
   tanto por seguridad, y esto las renueva sin que nadie tenga
   que volver a escribir la contraseña.

   Sin este archivo, la app te echaría cada una hora.
   Se escribe una vez y no se toca nunca más.
   ============================================================ */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Esta llamada es la que renueva la sesión. No borrar.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  // En qué direcciones corre. Se saltea los archivos internos de
  // Next y las imágenes, porque ahí no hace falta.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
