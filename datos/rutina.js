/* ============================================================
   RUTINA · las misiones diarias
   Solo referencias al catálogo: aquí se decide cuántas series,
   qué rango de reps y cuánto descanso. Reordenar un día o probar
   otro programa es tocar solo este fichero.
   ============================================================ */

import { ejercicio } from "./ejercicios.js";

export const RUTINA = {
  nombre: "Protocolo de despertar",
  resumen: "Cinco días, torso-pierna repartido por zonas. Doble progresión: " +
           "primero subes reps dentro del rango, y solo al llegar arriba subes peso.",

  dias: [
    {
      n: 1, nombre: "Pecho", lema: "Rompe el muro",
      ejercicios: [
        { ej: "banca",    series: 4, min: 8,  max: 12, descanso: 120 },
        { ej: "bancap",   series: 3, min: 8,  max: 10, descanso: 90 },
        { ej: "pullover", series: 3, min: 12, max: 15, descanso: 60 },
        { ej: "flexban",  series: 3, min: 8,  max: 20, descanso: 60 },
        { ej: "cerrado",  series: 3, min: 10, max: 12, descanso: 75 }
      ]
    },
    {
      n: 2, nombre: "Espalda", lema: "Levanta lo que hay en el suelo",
      ejercicios: [
        { ej: "muerto",   series: 4, min: 8,  max: 10, descanso: 150 },
        { ej: "pendlay",  series: 4, min: 8,  max: 12, descanso: 105 },
        { ej: "negdom",   series: 5, min: 3,  max: 5,  descanso: 105 },
        { ej: "remolm",   series: 4, min: 12, max: 15, descanso: 75 },
        { ej: "remoinv",  series: 3, min: 12, max: 18, descanso: 60 }
      ]
    },
    {
      n: 3, nombre: "Piernas", lema: "Cimientos del monarca",
      ejercicios: [
        { ej: "senta",    series: 4, min: 8,  max: 12, descanso: 150, nota: "Tempo 3-1-1." },
        { ej: "rdl",      series: 4, min: 12, max: 15, descanso: 105 },
        { ej: "bulgara",  series: 3, min: 12, max: 15, descanso: 75 },
        { ej: "hip",      series: 3, min: 15, max: 20, descanso: 90 },
        { ej: "gemelo",   series: 4, min: 20, max: 25, descanso: 60 }
      ]
    },
    {
      n: 4, nombre: "Hombros", lema: "Corona de hierro",
      ejercicios: [
        { ej: "militar",  series: 4, min: 8,  max: 12, descanso: 120 },
        { ej: "presslm",  series: 4, min: 10, max: 12, descanso: 75 },
        { ej: "lateral",  series: 4, min: 15, max: 25, descanso: 45 },
        { ej: "menton",   series: 3, min: 12, max: 15, descanso: 60 },
        { ej: "pajaro",   series: 3, min: 18, max: 25, descanso: 45 }
      ]
    },
    {
      n: 5, nombre: "Brazos y core", lema: "Últimos golpes",
      ejercicios: [
        { ej: "curl",     series: 4, min: 10, max: 12, descanso: 75 },
        { ej: "cerrado",  series: 4, min: 10, max: 12, descanso: 75 },
        { ej: "curlinv",  series: 3, min: 12, max: 15, descanso: 60 },
        { ej: "skull",    series: 3, min: 12, max: 15, descanso: 60 },
        { ej: "fondos",   series: 3, min: 12, max: 20, descanso: 60 },
        { ej: "rodillas", series: 3, min: 8,  max: 15, descanso: 60 },
        { ej: "plancha",  series: 3, min: 30, max: 60, descanso: 60, nota: "Las reps son segundos." }
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

export const DIAS = RUTINA.dias.map(d => d.n);
export const TOTAL_SERIES = RUTINA.dias.reduce(
  (a, d) => a + d.ejercicios.reduce((b, e) => b + e.series, 0), 0);
