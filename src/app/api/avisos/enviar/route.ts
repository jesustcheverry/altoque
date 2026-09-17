/* ============================================================
   El enviador de avisos
   ------------------------------------------------------------
   Se llama en /api/avisos/enviar. No es una pantalla: nadie la
   mira. Es una dirección que, cuando alguien la golpea, agarra
   los avisos pendientes de la cola y los manda.

   POR QUÉ ESTÁ SEPARADO DE TODO
   Los disparadores de la base anotan el aviso. Esto lo manda.
   Si el envío falla, el renglón queda pendiente y se reintenta
   en la vuelta siguiente. Nadie pierde un mail porque se cortó
   internet en el momento equivocado.

   POR QUÉ PIDE UNA CLAVE
   Sin clave, cualquiera que descubra la dirección la puede
   golpear mil veces por minuto y quemarte la cuota de Resend.
   Vercel manda esa clave sola cuando la programemos.

   CUÁNTOS MANDA POR VUELTA
   De a 20. Es a propósito: si un día se acumulan quinientos, no
   queremos que una sola llamada tarde diez minutos y se corte
   por la mitad. Prefiero varias vueltas cortas.
   ============================================================ */

import { clienteAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const POR_VUELTA = 20;
const MAX_INTENTOS = 5;

function responder(cuerpo: object, estado = 200) {
  return new Response(JSON.stringify(cuerpo, null, 2), {
    status: estado,
    headers: { "content-type": "application/json" },
  });
}

async function manejar(request: Request) {
  const secreto = process.env.CRON_SECRET;
  const apiKey = process.env.RESEND_API_KEY;
  const desde = process.env.AVISOS_DESDE;

  if (!secreto || !apiKey || !desde) {
    return responder(
      {
        error:
          "Falta configurar CRON_SECRET, RESEND_API_KEY o AVISOS_DESDE en .env.local",
      },
      500,
    );
  }

  // Dos formas de pasar la clave: la cabecera (que es la que usa
  // Vercel) o ?clave= en la dirección, para poder probarlo a mano
  // desde el navegador. La segunda queda escrita en el historial,
  // así que sirve para probar y no para producción.
  const cabecera = request.headers.get("authorization");
  const enLaUrl = new URL(request.url).searchParams.get("clave");

  if (cabecera !== `Bearer ${secreto}` && enLaUrl !== secreto) {
    return responder({ error: "No autorizado" }, 401);
  }

  const supabase = clienteAdmin();

  const { data: pendientes, error } = await supabase
    .from("avisos")
    .select("id, email, asunto, cuerpo, intentos")
    .eq("estado", "pendiente")
    .order("creado_el")
    .limit(POR_VUELTA);

  if (error) {
    return responder({ error: "No se pudo leer la cola: " + error.message }, 500);
  }

  let enviados = 0;
  let fallidos = 0;
  const errores: string[] = [];

  for (const aviso of pendientes ?? []) {
    const intentos = (aviso.intentos ?? 0) + 1;

    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from: desde,
          to: [aviso.email],
          subject: aviso.asunto,
          text: aviso.cuerpo,
        }),
      });

      if (!r.ok) {
        throw new Error(`Resend contestó ${r.status}: ${await r.text()}`);
      }

      await supabase
        .from("avisos")
        .update({
          estado: "enviado",
          enviado_el: new Date().toISOString(),
          intentos,
          ultimo_error: null,
        })
        .eq("id", aviso.id);

      enviados++;
    } catch (e) {
      // A los cinco intentos lo damos por perdido. Si no,
      // un mail con una dirección inválida se reintenta para
      // siempre y tapa la cola.
      const mensaje = e instanceof Error ? e.message : String(e);

      await supabase
        .from("avisos")
        .update({
          estado: intentos >= MAX_INTENTOS ? "fallido" : "pendiente",
          intentos,
          ultimo_error: mensaje.slice(0, 500),
        })
        .eq("id", aviso.id);

      fallidos++;
      errores.push(mensaje.slice(0, 200));
    }
  }

  return responder({
    revisados: pendientes?.length ?? 0,
    enviados,
    fallidos,
    errores: errores.length > 0 ? errores : undefined,
  });
}

export async function GET(request: Request) {
  return manejar(request);
}

export async function POST(request: Request) {
  return manejar(request);
}
