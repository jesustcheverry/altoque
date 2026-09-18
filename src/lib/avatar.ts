/* ============================================================
   El color del avatar
   ------------------------------------------------------------
   Cuando un profesional todavía no subió foto, mostramos sus
   iniciales sobre un color. Este archivo decide cuál.

   Estaba copiado y pegado en dos pantallas distintas, así que
   si alguien agregaba un color en una, la otra quedaba diferente
   sin que nadie se diera cuenta. Ahora vive en un solo lugar.

   El color sale del nombre, no del azar: la misma persona tiene
   siempre el mismo color, en todas las pantallas y en todas las
   visitas. Un color que cambia cada vez que recargás hace que la
   app se sienta inestable, aunque nadie sepa explicar por qué.
   ============================================================ */

const COLORES = ["#0e3a34", "#175048", "#7a4e06", "#b4381c", "#1a574d"];

export function colorDeAvatar(nombre: string) {
  // Sumamos los códigos de las letras. Es una cuenta tonta a
  // propósito: no necesita ser impredecible, necesita ser
  // siempre igual para el mismo nombre.
  let suma = 0;
  for (const letra of nombre) suma += letra.charCodeAt(0);
  return COLORES[suma % COLORES.length];
}

export function inicialesDe(nombre: string) {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0] ?? "")
    .join("")
    .toUpperCase();
}
