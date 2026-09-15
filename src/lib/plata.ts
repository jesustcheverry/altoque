/* ============================================================
   Plata
   ------------------------------------------------------------
   La base guarda centavos como números enteros (regla 3 del
   paso 1). Las pantallas muestran pesos. Estas dos funciones
   son la traducción, y viven en un solo lugar para que nadie
   la haga a mano y se equivoque.
   ============================================================ */

export function aPesos(centavos: number) {
  return (centavos / 100).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });
}

export function aCentavos(pesos: string) {
  const limpio = pesos.replace(/[^\d]/g, "");
  return limpio ? Number(limpio) * 100 : 0;
}
