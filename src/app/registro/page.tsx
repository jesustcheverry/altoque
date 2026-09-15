/* ============================================================
   Crear cuenta
   ------------------------------------------------------------
   Está en src/app/registro/, así que se ve en /registro.

   Arriba de todo dice "use client". Eso significa que esta
   pantalla corre en el navegador del usuario y puede reaccionar
   a lo que él escribe. Las pantallas que solo muestran cosas no
   lo necesitan; las que tienen formularios, sí.
   ============================================================ */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clienteNavegador } from "@/lib/supabase";

export default function Registro() {
  const router = useRouter();

  // "useState" es la memoria de la pantalla. Cada vez que el
  // usuario escribe una letra, esto se actualiza y la pantalla
  // se vuelve a dibujar.
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function crearCuenta(e: React.FormEvent) {
    e.preventDefault(); // evita que el navegador recargue la página
    setError(null);
    setAviso(null);
    setEnviando(true);

    const supabase = clienteNavegador();

    const { data, error } = await supabase.auth.signUp({
      email,
      password: clave,
      // El nombre viaja acá. El disparador que creamos en la base
      // lo agarra de este lugar para armar la fila en "personas".
      options: { data: { nombre } },
    });

    setEnviando(false);

    if (error) {
      setError(traducir(error.message));
      return;
    }

    if (!data.session) {
      // Pasa cuando la confirmación por mail está activada.
      setAviso(
        "Te mandamos un mail para confirmar la cuenta. Abrilo y después entrá.",
      );
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="mx-auto min-h-screen max-w-md bg-white">
      <header className="bg-marca px-5 pt-8 pb-7 text-white">
        <h1 className="font-display text-[24px] leading-tight font-extrabold">
          Creá tu cuenta
        </h1>
        <p className="mt-1.5 text-[13.5px] text-white/60">
          Para pedir presupuestos y seguir tus trabajos.
        </p>
      </header>

      <form onSubmit={crearCuenta} className="flex flex-col gap-4 px-5 pt-6">
        <Campo
          etiqueta="Tu nombre"
          tipo="text"
          valor={nombre}
          alCambiar={setNombre}
          ejemplo="Jesús Etcheverry"
        />
        <Campo
          etiqueta="Mail"
          tipo="email"
          valor={email}
          alCambiar={setEmail}
          ejemplo="vos@mail.com"
        />
        <Campo
          etiqueta="Contraseña"
          tipo="password"
          valor={clave}
          alCambiar={setClave}
          ejemplo="Mínimo 6 caracteres"
        />

        {error && (
          <p className="rounded-xl border border-alerta/30 bg-alerta-suave px-3.5 py-3 text-[13px] text-tinta-2">
            {error}
          </p>
        )}
        {aviso && (
          <p className="rounded-xl border border-marca/20 bg-marca-suave px-3.5 py-3 text-[13px] text-tinta-2">
            {aviso}
          </p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="mt-1 rounded-xl bg-acento py-3.5 text-[15px] font-bold text-acento-tinta disabled:opacity-60"
        >
          {enviando ? "Creando…" : "Crear cuenta"}
        </button>

        <p className="pb-10 text-center text-[13px] text-tinta-3">
          ¿Ya tenés cuenta?{" "}
          <Link href="/entrar" className="font-semibold text-marca">
            Entrá
          </Link>
        </p>
      </form>
    </main>
  );
}

// Un campo de formulario. Lo escribimos una vez y lo usamos tres.
function Campo({
  etiqueta,
  tipo,
  valor,
  alCambiar,
  ejemplo,
}: {
  etiqueta: string;
  tipo: string;
  valor: string;
  alCambiar: (v: string) => void;
  ejemplo: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12.5px] font-semibold text-tinta">{etiqueta}</span>
      <input
        type={tipo}
        value={valor}
        onChange={(e) => alCambiar(e.target.value)}
        placeholder={ejemplo}
        required
        className="rounded-xl border border-linea bg-fondo px-3.5 py-3 text-[14px] text-tinta outline-none placeholder:text-tinta-3 focus:border-marca-2"
      />
    </label>
  );
}

// Supabase contesta en inglés. Acá lo pasamos a criollo, porque
// un mensaje de error que no se entiende es un usuario perdido.
function traducir(mensaje: string) {
  if (mensaje.includes("already registered"))
    return "Ese mail ya tiene una cuenta. Probá entrar en vez de registrarte.";
  if (mensaje.includes("Password should be"))
    return "La contraseña tiene que tener al menos 6 caracteres.";
  if (mensaje.includes("valid email"))
    return "Ese mail no parece válido. Fijate si no le falta algo.";
  return "No pudimos crear la cuenta: " + mensaje;
}
