/* ============================================================
   Números de emergencia
   ------------------------------------------------------------
   Se ve en /emergencias.

   POR QUÉ ESTA PANTALLA EXISTE
   Porque hay situaciones en las que lo peor que podemos hacer
   es ofrecerle presupuestos a alguien. Si hay fuego, si alguien
   se desmayó, si huele a gas, la app no es la respuesta: el
   teléfono sí.

   Manda gente afuera del producto y no genera un peso. Y es,
   probablemente, lo que más va a hacer que alguien nos
   recomiende hablando.

   DOS DECISIONES TÉCNICAS
   - No pide estar registrado. Una emergencia no es momento de
     acordarse de una contraseña.
   - No consulta la base de datos. Es texto fijo, así que
     funciona aunque Supabase esté caído y aunque la conexión
     esté pésima. Es la única pantalla de la app que puede
     prometer eso, y justo es la que más lo necesita.

   ⚠️ SI ALGUIEN TOCA ESTE ARCHIVO: verificar cada número contra
   la fuente oficial antes de cambiarlo. Un número de emergencia
   equivocado es peor que no tener esta pantalla.
   Verificados en septiembre de 2026.
   ============================================================ */

import Link from "next/link";

export const metadata = {
  title: "Números de emergencia · AlToque",
  description:
    "Policía, bomberos, ambulancia, escape de gas y cortes de luz. Los números que sirven cuando la app no es la respuesta.",
};

export default function Emergencias() {
  return (
    <main className="mx-auto min-h-screen max-w-md bg-white pb-12">
      <header className="bg-alerta px-5 pt-6 pb-6 text-white">
        <Link
          href="/"
          className="text-apoyo font-semibold text-white/70 underline underline-offset-2"
        >
          ← Volver
        </Link>
        <h1 className="font-display mt-3 text-titulo leading-tight font-extrabold">
          Emergencias
        </h1>
        <p className="mt-1.5 text-apoyo leading-snug text-white/80">
          Si es grave, no publiques un pedido. Llamá.
        </p>
      </header>

      <section className="px-5 pt-5">
        <div className="flex flex-col gap-2">
          <Grande numero="911" titulo="Policía y emergencias" />
          <Grande numero="100" titulo="Bomberos" />
          <Grande
            numero="107"
            titulo="Ambulancia · SAME"
            nota="En la Ciudad de Buenos Aires. Fuera de CABA, llamá al 911."
          />
        </div>
      </section>

      <section className="px-5 pt-6">
        <h2 className="font-display mb-2.5 text-destacado font-bold text-tinta">
          Servicios
        </h2>
        <div className="flex flex-col gap-2">
          <Chico
            numero="0800-999-1050"
            marcar="08009991050"
            titulo="Escape de gas · Metrogas"
            nota="Las 24 horas. Abrí las ventanas, no toques llaves de luz y salí."
          />
          <Chico
            numero="0800-333-3000"
            marcar="08003333000"
            titulo="Cortes de luz · Edenor y Edesur"
            nota="Línea oficial del ENRE, las 24 horas. Alternativa: 0800-345-6000."
          />
        </div>
      </section>

      <section className="px-5 pt-6">
        <h2 className="font-display mb-2.5 text-destacado font-bold text-tinta">
          Otras líneas
        </h2>
        <div className="flex flex-col gap-2">
          <Chico
            numero="103"
            marcar="103"
            titulo="Defensa Civil"
            nota="Inundaciones, derrumbes, escapes de sustancias. Las 24 horas."
          />
          <Chico
            numero="144"
            marcar="144"
            titulo="Violencia de género"
            nota="Atención, contención y asesoramiento. Las 24 horas, todo el país."
          />
        </div>
      </section>

      {/* Y recién al final, cuando ya dijimos lo importante. */}
      <section className="px-5 pt-7">
        <div className="rounded-2xl border border-linea bg-fondo p-4">
          <b className="font-display block text-cuerpo font-bold text-tinta">
            ¿Y si no es una emergencia?
          </b>
          <p className="mt-1.5 text-apoyo leading-relaxed text-tinta-2">
            Un caño que pierde, una canilla que gotea, el tablero que salta, una
            puerta trabada. Para eso sí servimos: publicás el problema y te
            responden profesionales con los papeles al día.
          </p>
          <Link
            href="/pedidos/nuevo"
            className="mt-3 block rounded-xl bg-marca py-3 text-center text-cuerpo font-bold text-white"
          >
            Publicar un pedido
          </Link>
        </div>

        <p className="mt-4 text-center text-etiqueta leading-snug text-tinta-3">
          Números verificados en septiembre de 2026 contra las fuentes
          oficiales. Si encontrás uno desactualizado, avisanos.
        </p>
      </section>
    </main>
  );
}

function Grande({
  numero,
  titulo,
  nota,
}: {
  numero: string;
  titulo: string;
  nota?: string;
}) {
  return (
    <a
      href={`tel:${numero}`}
      className="flex items-center gap-4 rounded-2xl border border-alerta/30 bg-alerta-suave p-4 transition hover:border-alerta"
    >
      <span className="font-display w-[68px] shrink-0 text-numero leading-none font-extrabold text-alerta tabular-nums">
        {numero}
      </span>
      <span className="min-w-0">
        <b className="block text-cuerpo font-bold text-tinta">{titulo}</b>
        {nota && (
          <span className="mt-0.5 block text-etiqueta leading-snug text-tinta-2">
            {nota}
          </span>
        )}
      </span>
    </a>
  );
}

function Chico({
  numero,
  marcar,
  titulo,
  nota,
}: {
  numero: string;
  marcar: string;
  titulo: string;
  nota?: string;
}) {
  return (
    <a
      href={`tel:${marcar}`}
      className="block rounded-2xl border border-linea bg-white p-3.5 transition hover:border-marca-2"
    >
      <b className="block text-cuerpo font-bold text-tinta">{titulo}</b>
      {nota && (
        <span className="mt-0.5 block text-etiqueta leading-snug text-tinta-2">
          {nota}
        </span>
      )}
      <span className="font-display mt-1.5 block text-destacado font-extrabold text-marca tabular-nums">
        {numero}
      </span>
    </a>
  );
}
