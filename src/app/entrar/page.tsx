/* ============================================================
   Entrar
   ------------------------------------------------------------
   Está en src/app/entrar/, así que se ve en /entrar.
   Es casi igual al registro, pero en vez de crear la cuenta
   la busca.
   ============================================================ */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clienteNavegador } from "@/lib/supabase";

export default function Entrar() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);

    const supabase = clienteNavegador();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: clave,
    });

    setEnviando(false);

    if (error) {
      setError(traducir(error.message));
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="mx-auto min-h-screen max-w-md bg-white">
      <header className="bg-marca px-5 pt-8 pb-7 text-white">
        <h1 className="font-display text-titulo leading-tight font-extrabold">
          Entrá a tu cuenta
        </h1>
        <p className="mt-1.5 text-cuerpo text-white/60">
          Bienvenido de vuelta.
        </p>
      </header>

      <form onSubmit={entrar} className="flex flex-col gap-4 px-5 pt-6">
        <label className="flex flex-col gap-1.5">
          <span className="text-apoyo font-semibold text-tinta">Mail</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vos@mail.com"
            required
            className="rounded-xl border border-linea bg-fondo px-3.5 py-3 text-cuerpo text-tinta outline-none placeholder:text-tinta-3 focus:border-marca-2"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-apoyo font-semibold text-tinta">
            Contraseña
          </span>
          <input
            type="password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            required
            className="rounded-xl border border-linea bg-fondo px-3.5 py-3 text-cuerpo text-tinta outline-none placeholder:text-tinta-3 focus:border-marca-2"
          />
        </label>

        {error && (
          <p className="rounded-xl border border-alerta/30 bg-alerta-suave px-3.5 py-3 text-apoyo text-tinta-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="mt-1 rounded-xl bg-acento py-3.5 text-destacado font-bold text-acento-tinta disabled:opacity-60"
        >
          {enviando ? "Entrando…" : "Entrar"}
        </button>

        <p className="pb-10 text-center text-apoyo text-tinta-3">
          ¿Todavía no tenés cuenta?{" "}
          <Link href="/registro" className="font-semibold text-marca">
            Creala acá
          </Link>
        </p>
      </form>
    </main>
  );
}

function traducir(mensaje: string) {
  if (mensaje.includes("Invalid login credentials"))
    return "El mail o la contraseña no coinciden.";
  if (mensaje.includes("Email not confirmed"))
    return "Todavía no confirmaste la cuenta. Revisá tu mail.";
  return "No pudimos entrar: " + mensaje;
}
