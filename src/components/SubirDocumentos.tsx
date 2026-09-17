/* ============================================================
   Subir los papeles
   ------------------------------------------------------------
   El archivo va al bucket "documentos", con el camino
     <id de la persona>/<id del perfil>/<al azar>.jpg

   El primer pedazo de ese camino no es decorativo: la regla del
   paso 004 mira justamente ese pedazo para decidir si el archivo
   es tuyo. Si lo cambiaras, la base rechazaría la subida.

   Después de subir, llamamos a registrar_documento, que anota el
   papel Y te pone en la fila del revisor. Las dos cosas en una
   sola llamada: si fueran dos, un error en el medio dejaría un
   papel subido que nadie sabe que existe.

   Subir NO es aprobarse. Pasás a "en revisión", que quiere decir
   "hay algo para mirar", no "está bien".
   ============================================================ */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clienteNavegador } from "@/lib/supabase";

const NOMBRES: Record<string, string> = {
  matricula: "Matrícula",
  seguro: "Certificado de seguro",
};

export default function SubirDocumentos({
  perfilId,
  personaId,
  tipos,
  yaSubidos,
}: {
  perfilId: string;
  personaId: string;
  tipos: ("matricula" | "seguro")[];
  yaSubidos: { id: string; tipo: string; subido_el: string }[];
}) {
  const router = useRouter();
  const [subiendo, setSubiendo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function alElegir(
    e: React.ChangeEvent<HTMLInputElement>,
    tipo: string,
  ) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setError(null);
    setSubiendo(tipo);

    const supabase = clienteNavegador();
    const extension = archivo.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const camino = `${personaId}/${perfilId}/${crypto.randomUUID()}.${extension}`;

    const { error: errorSubida } = await supabase.storage
      .from("documentos")
      .upload(camino, archivo);

    if (errorSubida) {
      setError("No se pudo subir: " + errorSubida.message);
      setSubiendo(null);
      e.target.value = "";
      return;
    }

    const { error: errorRegistro } = await supabase.rpc("registrar_documento", {
      p_perfil: perfilId,
      p_tipo: tipo,
      p_ruta: camino,
    });

    setSubiendo(null);
    e.target.value = "";

    if (errorRegistro) {
      setError("Se subió pero no se pudo registrar: " + errorRegistro.message);
      return;
    }

    router.refresh();
  }

  return (
    <div className="mt-2.5 rounded-xl border border-linea-2 bg-fondo p-3">
      <b className="block text-[11.5px] font-semibold text-tinta-2">
        Tus papeles
      </b>
      <p className="mt-0.5 text-[11px] leading-snug text-tinta-3">
        Foto o PDF. Los ve solo el revisor, nunca los clientes.
      </p>

      <div className="mt-2.5 flex flex-col gap-2">
        {tipos.map((tipo) => {
          const subido = yaSubidos.find((d) => d.tipo === tipo);

          return (
            <label
              key={tipo}
              className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2.5 transition ${
                subido
                  ? "border-ok/40"
                  : "border-dashed border-linea hover:border-marca-2"
              } ${subiendo === tipo ? "opacity-60" : ""}`}
            >
              <span className="min-w-0">
                <b className="block text-[12.5px] font-semibold text-tinta">
                  {NOMBRES[tipo]}
                </b>
                <span className="block text-[11px] text-tinta-3">
                  {subiendo === tipo
                    ? "Subiendo…"
                    : subido
                      ? `Enviado el ${new Date(subido.subido_el).toLocaleDateString("es-AR")}`
                      : "Sin enviar"}
                </span>
              </span>

              <span
                className={`shrink-0 rounded-md px-2.5 py-1.5 text-[11.5px] font-bold ${
                  subido
                    ? "bg-fondo text-tinta-2"
                    : "bg-acento text-acento-tinta"
                }`}
              >
                {subido ? "Reemplazar" : "Elegir archivo"}
              </span>

              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => alElegir(e, tipo)}
                disabled={subiendo !== null}
                className="hidden"
              />
            </label>
          );
        })}
      </div>

      {error && (
        <p className="mt-2 rounded-lg border border-alerta/30 bg-white px-3 py-2 text-[11.5px] leading-snug text-tinta-2">
          {error}
        </p>
      )}
    </div>
  );
}
