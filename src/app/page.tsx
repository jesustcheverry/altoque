/* ============================================================
   Pantalla de inicio de AlToque
   ------------------------------------------------------------
   NOVEDAD: la grilla de oficios ya NO está escrita a mano acá.
   Sale de la tabla oficios_config de tu base de datos.

   Fijate que la función Inicio ahora dice "async" y adentro
   hace "await". Eso significa: esta pantalla espera a que la
   base conteste antes de dibujarse. La consulta pasa en el
   servidor, no en el navegador del usuario.

   La lista de profesionales sigue escrita a mano por ahora.
   Esa la vamos a conectar cuando existan profesionales de
   verdad, en el paso 4.
   ============================================================ */

import Link from "next/link";
import { clienteServidor } from "@/lib/supabase-servidor";
import BotonSalir from "@/components/BotonSalir";

// ---------- Íconos ----------

const traza = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinejoin: "round" as const,
  strokeLinecap: "round" as const,
};

const Rayo = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" {...traza}>
    <path d="M13.5 2.5L5 13.5h5.5L10 21.5 19 10h-5.5z" />
  </svg>
);
const Llama = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" {...traza}>
    <path d="M12 2.5c3.6 3.4 6.5 6 6.5 10a6.5 6.5 0 1 1-13 0c0-2.3 1-3.9 2.3-5.2.3 1.4 1.2 2.2 2.2 2.2 1.6 0 2.4-2.1 2-7z" />
  </svg>
);
const Gota = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" {...traza}>
    <path d="M12 2.8c3.5 4.3 6.2 7 6.2 10.4a6.2 6.2 0 0 1-12.4 0c0-3.4 2.7-6.1 6.2-10.4z" />
  </svg>
);
const Rodillo = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" {...traza}>
    <rect x="3.5" y="3.5" width="12" height="5.5" rx="1.5" />
    <path d="M15.5 6.2h3.2a1.8 1.8 0 0 1 1.8 1.8v3.5a1.5 1.5 0 0 1-1.5 1.5H11" />
    <rect x="9" y="13" width="4" height="7.5" rx="1.4" />
  </svg>
);
const Ladrillo = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" {...traza}>
    <rect x="2.5" y="5" width="19" height="5" rx="1" />
    <rect x="2.5" y="14" width="19" height="5" rx="1" />
    <path d="M9 5v5M15.5 14v5" />
  </svg>
);
const Llave = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" {...traza}>
    <circle cx="8" cy="8" r="4.5" />
    <path d="M11.4 11.4L20 20M16.5 16.5l2-2M14 14l2-2" />
  </svg>
);
const Copo = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" {...traza}>
    <path d="M12 2.5v19M3.8 7.2l16.4 9.6M20.2 7.2L3.8 16.8M12 6l-2.4-2M12 6l2.4-2M12 18l-2.4 2M12 18l2.4 2" />
  </svg>
);
const Serrucho = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" {...traza}>
    <path d="M3 6h14l-2 4H5zM5 10l1.5 8.5h3L11 10" />
    <path d="M17 6l3.5 3.5-3 3" />
  </svg>
);
const Herramienta = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" {...traza}>
    <path d="M14.5 6a4 4 0 0 0 5 5l-8.5 8.5a2.5 2.5 0 0 1-3.5-3.5z" />
    <path d="M14.5 6 18 2.5" />
  </svg>
);

const Lupa = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...traza} strokeWidth={2}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
);
const Pin = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" {...traza} strokeWidth={2}>
    <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);
const Alerta = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...traza} strokeWidth={2.2}>
    <path d="M12 8v5" />
    <circle cx="12" cy="16.6" r="1.2" fill="currentColor" stroke="none" />
    <path d="M10.3 3.9L2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
  </svg>
);
const Estrella = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
  </svg>
);
const Escudo = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" {...traza} strokeWidth={2.4}>
    <path d="M12 3l7 3v6c0 4.4-3 8-7 9-4-1-7-4.6-7-9V6z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

// A cada oficio de la base le corresponde un dibujo. La base
// guarda el nombre; el dibujo vive acá, en la pantalla.
const ICONOS: Record<string, () => React.ReactElement> = {
  electricista: Rayo,
  gasista: Llama,
  plomero: Gota,
  pintor: Rodillo,
  albanil: Ladrillo,
  cerrajero: Llave,
  aire: Copo,
  carpintero: Serrucho,
};

// ---------- Datos que todavía están a mano ----------

const PROFESIONALES = [
  {
    id: "ruben",
    iniciales: "RO",
    color: "#0e3a34",
    nombre: "Rubén Ortega",
    oficio: "Gasista matriculado",
    zona: "Villa Crespo",
    distancia: "1,2 km",
    puntaje: 4.9,
    resenas: 214,
    visita: "$22.000",
    responde: "12 min",
  },
  {
    id: "marcela",
    iniciales: "MD",
    color: "#175048",
    nombre: "Marcela Duarte",
    oficio: "Electricista matriculada",
    zona: "Almagro",
    distancia: "0,8 km",
    puntaje: 4.8,
    resenas: 167,
    visita: "$18.000",
    responde: "8 min",
  },
  {
    id: "hernan",
    iniciales: "HV",
    color: "#7a4e06",
    nombre: "Hernán Villalba",
    oficio: "Plomero",
    zona: "Caballito",
    distancia: "2,4 km",
    puntaje: 4.7,
    resenas: 98,
    visita: "$16.500",
    responde: "20 min",
  },
];

// ---------- La pantalla ----------

export default async function Inicio() {
  const supabase = await clienteServidor();

  // ¿Quién está mirando esta pantalla? Si nadie entró, user es null.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Si hay alguien, buscamos su nombre. Ojo: esta consulta solo
  // devuelve SU fila, nunca la de otro. Eso no lo decide este
  // código, lo impone la regla "veo mi persona" de la base.
  let nombre: string | null = null;
  if (user) {
    const { data: persona } = await supabase
      .from("personas")
      .select("nombre")
      .eq("id", user.id)
      .single();
    nombre = persona?.nombre ?? null;
  }

  // Su primer inmueble, para mostrar a dónde va a ir el profesional.
  const { data: inmuebles } = await supabase
    .from("inmuebles")
    .select("alias, calle, altura, piso, depto")
    .order("creado_el")
    .limit(1);

  const inmueble = inmuebles?.[0] ?? null;

  // Y acá la lista de oficios, igual que antes.
  const { data: oficios, error } = await supabase
    .from("oficios_config")
    .select("oficio, nombre_visible, exige_matricula, exige_seguro")
    .order("nombre_visible");

  return (
    <main className="mx-auto min-h-screen max-w-md bg-white pb-12">
      <Encabezado nombre={nombre} inmueble={inmueble} />
      <Oficios oficios={oficios} error={error?.message} />
      <BannerUrgencias />
      <CercaTuyo />
    </main>
  );
}

type Inmueble = {
  alias: string;
  calle: string;
  altura: string;
  piso: string | null;
  depto: string | null;
};

function Encabezado({
  nombre,
  inmueble,
}: {
  nombre: string | null;
  inmueble: Inmueble | null;
}) {
  return (
    <header className="bg-marca px-5 pt-6 pb-6 text-white">
      {/* Arriba de todo: quién sos, o cómo entrar. */}
      <div className="mb-4 flex items-center justify-between gap-3">
        {nombre ? (
          <>
            <p className="text-[13px] text-white/60">
              Hola, <b className="font-semibold text-white">{nombre}</b>
            </p>
            <span className="flex items-center gap-3">
              <Link
                href="/pedidos"
                className="text-[12px] font-semibold text-white/80 underline underline-offset-2"
              >
                Mis pedidos
              </Link>
              <BotonSalir />
            </span>
          </>
        ) : (
          <>
            <p className="text-[13px] text-white/60">No entraste todavía</p>
            <span className="flex items-center gap-3 text-[12.5px] font-semibold">
              <Link href="/entrar" className="text-white/80 underline underline-offset-2">
                Entrar
              </Link>
              <Link
                href="/registro"
                className="rounded-lg bg-acento px-2.5 py-1.5 text-acento-tinta"
              >
                Crear cuenta
              </Link>
            </span>
          </>
        )}
      </div>

      <h1 className="font-display mt-1 text-[23px] leading-tight font-extrabold">
        ¿Qué hay que arreglar
        <br />
        en casa?
      </h1>

      <Link
        href="/pedidos/nuevo"
        className="mt-4 flex w-full items-center gap-2.5 rounded-xl bg-white px-3.5 py-3 text-left text-sm text-tinta-3 shadow-lg"
      >
        <span className="text-marca-2">
          <Lupa />
        </span>
        Contá tu problema y recibí presupuestos
      </Link>

      {/* La dirección ya no está escrita a mano: es la que el
          usuario cargó. Si todavía no cargó ninguna, lo invitamos. */}
      <p className="mt-3 flex items-center gap-1.5 text-[12.5px] text-white/60">
        <Pin />
        {inmueble ? (
          <>
            Enviando a{" "}
            <Link href="/inmuebles" className="font-semibold text-white underline underline-offset-2">
              {inmueble.calle} {inmueble.altura}
              {inmueble.piso && `, ${inmueble.piso}.º`}
              {inmueble.depto && ` ${inmueble.depto}`}
            </Link>
          </>
        ) : nombre ? (
          <Link href="/inmuebles" className="font-semibold text-white underline underline-offset-2">
            Agregá tu dirección
          </Link>
        ) : (
          <span>Entrá para guardar tu dirección</span>
        )}
      </p>
    </header>
  );
}

// Esta función ahora recibe los oficios desde afuera, en vez de
// tenerlos escritos adentro.
function Oficios({
  oficios,
  error,
}: {
  oficios:
    | {
        oficio: string;
        nombre_visible: string;
        exige_matricula: boolean;
        exige_seguro: boolean;
      }[]
    | null;
  error?: string;
}) {
  return (
    <section className="px-5 pt-5">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-display text-[15.5px] font-bold text-tinta">
          Oficios
        </h2>
        <span className="text-[11px] text-tinta-3">desde la base de datos</span>
      </div>

      {/* Si la base no contesta, lo decimos en criollo en vez de
          dejar la pantalla vacía sin explicación. */}
      {error && (
        <p className="rounded-xl border border-alerta/30 bg-alerta-suave p-3 text-[13px] text-tinta-2">
          No se pudo leer la base de datos: {error}
        </p>
      )}

      <div className="grid grid-cols-4 gap-2">
        {oficios?.map((o) => {
          const Icono = ICONOS[o.oficio] ?? Herramienta;

          // El escudo significa "a este oficio le exigimos papeles
          // antes de dejarlo trabajar". Al vecino no le importa si
          // el papel se llama matrícula o póliza: le importa saber
          // que el profesional pasó un filtro.
          const exigePapeles = o.exige_matricula || o.exige_seguro;

          return (
            // Cada oficio lleva directo a publicar un pedido de ese
            // oficio. El "?oficio=..." viaja en la dirección y el
            // formulario lo usa para venir ya elegido.
            <Link
              key={o.oficio}
              href={`/pedidos/nuevo?oficio=${o.oficio}`}
              className="relative flex flex-col items-center gap-1.5 rounded-xl border border-linea-2 bg-fondo px-1 pt-3 pb-2.5 transition hover:border-marca-2"
            >
              {exigePapeles && (
                <span
                  className="absolute top-1.5 right-1.5 text-marca"
                  title={
                    o.exige_matricula
                      ? "Exigimos matrícula y seguro vigentes"
                      : "Exigimos seguro vigente"
                  }
                >
                  <Escudo />
                </span>
              )}
              <span className="text-marca">
                <Icono />
              </span>
              <span className="text-center text-[10.5px] leading-tight font-semibold text-tinta-2">
                {o.nombre_visible}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function BannerUrgencias() {
  return (
    <section className="px-5 pt-5">
      <button className="flex w-full items-center gap-3 rounded-2xl border border-alerta/25 bg-alerta-suave p-3.5 text-left">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-alerta text-white">
          <Alerta />
        </span>
        <span>
          <b className="block text-[13.5px] font-bold text-tinta">
            Urgencias 24 hs
          </b>
          <span className="mt-0.5 block text-xs leading-snug text-tinta-2">
            Pérdida de gas, sin luz, caño roto o puerta trabada. Llega alguien en
            menos de 45 min.
          </span>
        </span>
      </button>
    </section>
  );
}

function CercaTuyo() {
  return (
    <section className="px-5 pt-6">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-display text-[15.5px] font-bold text-tinta">
          Bien puntuados cerca tuyo
        </h2>
        <span className="text-[11px] text-tinta-3">datos de ejemplo</span>
      </div>

      <div className="flex flex-col gap-2.5">
        {PROFESIONALES.map((p) => (
          <FichaProfesional key={p.id} p={p} />
        ))}
      </div>
    </section>
  );
}

function FichaProfesional({ p }: { p: (typeof PROFESIONALES)[number] }) {
  return (
    <button className="flex w-full items-start gap-3 rounded-2xl border border-linea bg-white p-3.5 text-left transition hover:border-marca-2">
      <span
        className="font-display grid size-12 shrink-0 place-items-center rounded-xl text-base font-bold text-white"
        style={{ background: p.color }}
      >
        {p.iniciales}
      </span>

      <span className="min-w-0 flex-1">
        <b className="block text-[14.5px] font-bold text-tinta">{p.nombre}</b>
        <span className="mt-0.5 block text-[12.5px] text-tinta-2">
          {p.oficio} · {p.zona}
        </span>

        <span className="mt-1.5 flex items-center gap-2 text-[12.5px]">
          <span className="flex items-center gap-1 font-semibold text-tinta tabular-nums">
            <span className="text-acento">
              <Estrella />
            </span>
            {p.puntaje.toFixed(1)}
            <span className="font-normal text-tinta-3">({p.resenas})</span>
          </span>
          <span className="size-[3px] rounded-full bg-tinta-3" />
          <span className="text-tinta-3 tabular-nums">{p.distancia}</span>
        </span>

        <span className="mt-2 flex flex-wrap gap-1.5">
          <Etiqueta tono="marca">
            <Escudo />
            Verificado
          </Etiqueta>
          <Etiqueta tono="ok">Disponible hoy</Etiqueta>
          <Etiqueta>Responde en {p.responde}</Etiqueta>
        </span>
      </span>

      <span className="shrink-0 text-right">
        <b className="block font-mono text-[13px] font-semibold text-tinta tabular-nums">
          {p.visita}
        </b>
        <span className="mt-0.5 block text-[10px] text-tinta-3">visita</span>
      </span>
    </button>
  );
}

function Etiqueta({
  children,
  tono = "neutro",
}: {
  children: React.ReactNode;
  tono?: "neutro" | "marca" | "ok";
}) {
  const tonos = {
    neutro: "bg-fondo text-tinta-2 border-linea-2",
    marca: "bg-marca-suave text-marca border-transparent",
    ok: "bg-ok-suave text-ok border-transparent",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10.5px] font-semibold ${tonos[tono]}`}
    >
      {children}
    </span>
  );
}
