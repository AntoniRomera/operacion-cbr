/* ============================================================
   RUTINA · las misiones diarias
   Solo referencias al catálogo: aquí se decide cuántas series,
   qué rango de reps y cuánto descanso. Reordenar un día o probar
   otro programa es tocar solo este fichero.

   Cuatro días encajados en una semana con trabajo, estudios y vida:
   lunes y martes, miércoles libre, jueves y viernes, fin de semana
   libre. Dos días seguidos como mucho, y nunca dos veces el mismo
   patrón sin un día de por medio.

   Los tres primeros días cubren el cuerpo entero: si una semana solo
   salen tres, no falta ningún grupo grande. El cuarto es el remate
   —hombro pequeño, brazo, cadera— y va marcado como `suelto`: se
   puede hacer del tirón o por bloques sueltos de doce minutos.
   ============================================================ */

import { ejercicio } from "./ejercicios.js";

export const RUTINA = {
  nombre: "Protocolo de despertar",
  resumen: "Cuatro días: empuje, tirón, pierna y remate. Los tres primeros " +
           "cubren todo el cuerpo; el cuarto es extra y se puede trocear. " +
           "Doble progresión: primero subes reps dentro del rango, y solo " +
           "al llegar arriba subes peso.",
  descansos: "Miércoles, sábado y domingo",

  dias: [
    {
      n: 1, cuando: "Lunes", nombre: "Empuje", lema: "Rompe el muro",
      trabaja: "Pecho, hombro y tríceps",
      ejercicios: [
        { ej: "banca",    series: 4, min: 8,  max: 12, descanso: 120 },
        { ej: "militar",  series: 4, min: 8,  max: 12, descanso: 120 },
        { ej: "flexban",  series: 3, min: 8,  max: 20, descanso: 75 },
        { ej: "pullover", series: 3, min: 12, max: 15, descanso: 60 },
        { ej: "lateral",  series: 4, min: 15, max: 25, descanso: 45 },
        { ej: "cerrado",  series: 3, min: 10, max: 12, descanso: 75 }
      ]
    },
    {
      n: 2, cuando: "Martes", nombre: "Tirón", lema: "Levanta lo que hay en el suelo",
      trabaja: "Espalda, bíceps y cadena posterior",
      ejercicios: [
        { ej: "muerto",   series: 4, min: 8,  max: 10, descanso: 150 },
        { ej: "negdom",   series: 4, min: 3,  max: 5,  descanso: 105 },
        { ej: "pendlay",  series: 4, min: 8,  max: 12, descanso: 105 },
        { ej: "remolm",   series: 3, min: 12, max: 15, descanso: 75 },
        { ej: "curl",     series: 4, min: 10, max: 12, descanso: 75 }
      ]
    },
    {
      n: 3, cuando: "Jueves", nombre: "Piernas y core", lema: "Cimientos del monarca",
      trabaja: "Pierna completa y abdomen",
      ejercicios: [
        { ej: "senta",    series: 4, min: 8,  max: 12, descanso: 150, nota: "Tempo 3-1-1." },
        { ej: "rdl",      series: 3, min: 12, max: 15, descanso: 105, nota: "Submáximo: el peso muerto pesado fue el martes." },
        { ej: "bulgara",  series: 3, min: 12, max: 15, descanso: 75 },
        { ej: "gemelo",   series: 4, min: 20, max: 25, descanso: 60 },
        { ej: "rodillas", series: 3, min: 8,  max: 15, descanso: 60 },
        { ej: "plancha",  series: 3, min: 30, max: 60, descanso: 60, nota: "Las reps son segundos." }
      ]
    },
    {
      n: 4, cuando: "Viernes", nombre: "Remate", lema: "Últimos golpes",
      trabaja: "Hombro pequeño, brazo y cadera",
      suelto: true,
      /* Tres bloques independientes. Ninguno necesita estar fresco ni
         tener a nadie cerca: son los que se pueden hacer un martes por
         la noche o partidos en tres ratos distintos de la semana. */
      ejercicios: [
        { ej: "presslm",  series: 3, min: 10, max: 12, descanso: 75, bloque: "Hombro" },
        { ej: "menton",   series: 3, min: 12, max: 15, descanso: 60, bloque: "Hombro" },
        { ej: "pajaro",   series: 3, min: 18, max: 25, descanso: 45, bloque: "Hombro" },

        { ej: "curlinv",  series: 3, min: 12, max: 15, descanso: 60, bloque: "Brazo" },
        { ej: "skull",    series: 3, min: 12, max: 15, descanso: 60, bloque: "Brazo" },
        { ej: "fondos",   series: 3, min: 12, max: 20, descanso: 60, bloque: "Brazo" },

        { ej: "hip",      series: 3, min: 15, max: 20, descanso: 90, bloque: "Cadera y espalda" },
        { ej: "remoinv",  series: 3, min: 12, max: 18, descanso: 60, bloque: "Cadera y espalda" }
      ]
    }
  ]
};

/**
 * Día con los ejercicios ya resueltos contra el catálogo.
 * La clave de sesión lleva el día delante: el mismo ejercicio puede
 * salir en dos días sin que se pisen las series marcadas.
 */
export function dia(n) {
  const d = RUTINA.dias.find(x => x.n === n);
  if (!d) throw new Error(`No existe el día ${n}`);
  return {
    ...d,
    ejercicios: d.ejercicios.map(e => ({
      ...ejercicio(e.ej), ...e, sesionId: `${d.n}:${e.ej}`
    }))
  };
}

/**
 * Los ejercicios de un día agrupados por bloque, en el orden en que
 * aparecen. Un día normal devuelve un solo bloque sin nombre, así que
 * la vista puede recorrer siempre lo mismo sin preguntar.
 */
export function bloques(d) {
  const salida = [];
  for (const ej of d.ejercicios) {
    const nombre = ej.bloque || null;
    const ultimo = salida[salida.length - 1];
    if (ultimo && ultimo.nombre === nombre) ultimo.ejercicios.push(ej);
    else salida.push({ nombre, ejercicios: [ej] });
  }
  return salida;
}

export const DIAS = RUTINA.dias.map(d => d.n);

/* Los días que sostienen la semana. El resto suma, pero no se echa
   de menos: sin ellos el cuerpo entero sigue entrenado. */
export const NUCLEO = RUTINA.dias.filter(d => !d.suelto).map(d => d.n);

export const TOTAL_SERIES = RUTINA.dias.reduce(
  (a, d) => a + d.ejercicios.reduce((b, e) => b + e.series, 0), 0);
