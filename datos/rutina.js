/* ============================================================
   RUTINA · las misiones diarias
   Solo referencias al catálogo: aquí se decide cuántas series,
   qué rango de reps y cuánto descanso. Reordenar un día o probar
   otro programa es tocar solo este fichero.

   Tres patrones (empuje, tirón, pierna) cubren el cuerpo entero
   cada uno — incluido lo que antes era un cuarto día suelto de
   hombro pequeño, brazo y cadera, ya repartido dentro de los tres.
   Un PROGRAMA es un calendario de esos patrones sobre la semana:
   PPL3 los pasa una vez, PPL6 los repite para entrenar cada patrón
   dos veces. Añadir un programa nuevo (Upper/Lower, otra frecuencia)
   es construir su calendario con `semana()`; los patrones no cambian.
   ============================================================ */

import { ejercicio } from "./ejercicios.js";

const CALENTAMIENTO = {
  empuje: [
    "5 minutos de cardio suave: bici, remo o cuerda.",
    "Movilidad de hombro: círculos y dislocaciones con palo o banda, 2×10.",
    "2 series ligeras de flexiones o press vacío antes de cargar la barra."
  ],
  tiron: [
    "5 minutos de cardio suave.",
    "Movilidad de cadera y columna torácica, 2×10 por lado.",
    "Dead hang 20-30 s y un par de remos con poco peso para activar la espalda."
  ],
  piernas: [
    "5 minutos de cardio suave.",
    "Sentadilla profunda sostenida 60 s y zancada con giro, 2×8 por lado.",
    "2 series de sentadilla a peso corporal antes de cargar la barra."
  ]
};

/* Lo que antes era el día 4 (suelto) vive ahora dentro de estos tres:
   presslm y fondos/skull entran en empuje, menton/pajaro/curlinv y
   remoinv en tirón, hip en pierna. El volumen semanal total no baja,
   solo se reparte en tres días más largos en vez de cuatro cortos. */
const PATRON_EMPUJE = {
  nombre: "Empuje", lema: "Rompe el muro",
  trabaja: "Pecho, hombro y tríceps",
  calentamiento: CALENTAMIENTO.empuje,
  ejercicios: [
    { ej: "banca",    series: 4, min: 8,  max: 12, descanso: 120 },
    { ej: "militar",  series: 4, min: 8,  max: 12, descanso: 120 },
    { ej: "flexban",  series: 3, min: 8,  max: 20, descanso: 75 },
    { ej: "pullover", series: 3, min: 12, max: 15, descanso: 60 },
    { ej: "lateral",  series: 4, min: 15, max: 25, descanso: 45 },
    { ej: "cerrado",  series: 3, min: 10, max: 12, descanso: 75 },
    { ej: "presslm",  series: 3, min: 10, max: 12, descanso: 75 },
    { ej: "skull",    series: 3, min: 12, max: 15, descanso: 60 },
    { ej: "fondos",   series: 3, min: 12, max: 20, descanso: 60 }
  ]
};

const PATRON_TIRON = {
  nombre: "Tirón", lema: "Levanta lo que hay en el suelo",
  trabaja: "Espalda, bíceps y cadena posterior",
  calentamiento: CALENTAMIENTO.tiron,
  ejercicios: [
    { ej: "muerto",   series: 4, min: 8,  max: 10, descanso: 150 },
    { ej: "negdom",   series: 4, min: 3,  max: 5,  descanso: 105 },
    { ej: "pendlay",  series: 4, min: 8,  max: 12, descanso: 105 },
    { ej: "remolm",   series: 3, min: 12, max: 15, descanso: 75 },
    { ej: "curl",     series: 4, min: 10, max: 12, descanso: 75 },
    { ej: "menton",   series: 3, min: 12, max: 15, descanso: 60 },
    { ej: "pajaro",   series: 3, min: 18, max: 25, descanso: 45 },
    { ej: "curlinv",  series: 3, min: 12, max: 15, descanso: 60 },
    { ej: "remoinv",  series: 3, min: 12, max: 18, descanso: 60 }
  ]
};

const PATRON_PIERNAS = {
  nombre: "Piernas y core", lema: "Cimientos del monarca",
  trabaja: "Pierna completa, glúteo y abdomen",
  calentamiento: CALENTAMIENTO.piernas,
  ejercicios: [
    { ej: "senta",    series: 4, min: 8,  max: 12, descanso: 150, nota: "Tempo 3-1-1." },
    { ej: "rdl",      series: 3, min: 12, max: 15, descanso: 105, nota: "Submáximo: el peso muerto pesado fue el día de tirón." },
    { ej: "bulgara",  series: 3, min: 12, max: 15, descanso: 75 },
    { ej: "gemelo",   series: 4, min: 20, max: 25, descanso: 60 },
    { ej: "rodillas", series: 3, min: 8,  max: 15, descanso: 60 },
    { ej: "plancha",  series: 3, min: 30, max: 60, descanso: 60, nota: "Las reps son segundos." },
    { ej: "hip",      series: 3, min: 15, max: 20, descanso: 90 },
    { ej: "puente1",  series: 3, min: 12, max: 15, descanso: 60 }
  ]
};

/** Calendario de patrones sobre la semana: [{n, cuando, patron}] → días. */
function semana(calendario) {
  return calendario.map(({ n, cuando, patron }) => ({ n, cuando, ...patron }));
}

export const PROGRAMAS = {
  ppl3: {
    id: "ppl3", nombre: "PPL · 3 días", frecuencia: 1,
    resumen: "Tres días: empuje, tirón y pierna, con todo lo de hombro pequeño, " +
             "brazo y cadera ya repartido dentro de cada uno. Doble progresión: " +
             "primero subes reps dentro del rango, y solo al llegar arriba subes peso.",
    descansos: "Miércoles, viernes, sábado y domingo",
    dias: semana([
      { n: 1, cuando: "Lunes",  patron: PATRON_EMPUJE },
      { n: 2, cuando: "Martes", patron: PATRON_TIRON },
      { n: 3, cuando: "Jueves", patron: PATRON_PIERNAS }
    ])
  },
  ppl6: {
    id: "ppl6", nombre: "PPL x2 · 6 días", frecuencia: 2,
    resumen: "Los mismos tres días, dos veces por semana: cada patrón se entrena " +
             "dos veces y el volumen semanal se duplica. Para las épocas con tiempo " +
             "y material de sobra — no es el programa por defecto.",
    descansos: "Domingo",
    dias: semana([
      { n: 1, cuando: "Lunes",     patron: PATRON_EMPUJE },
      { n: 2, cuando: "Martes",    patron: PATRON_TIRON },
      { n: 3, cuando: "Miércoles", patron: PATRON_PIERNAS },
      { n: 4, cuando: "Jueves",    patron: PATRON_EMPUJE },
      { n: 5, cuando: "Viernes",   patron: PATRON_TIRON },
      { n: 6, cuando: "Sábado",    patron: PATRON_PIERNAS }
    ])
  }
};

export const PROGRAMA_DEFECTO = "ppl3";

/** Programa por id, con el de defecto como red de seguridad. */
export const programa = id => PROGRAMAS[id] || PROGRAMAS[PROGRAMA_DEFECTO];

/**
 * Día con los ejercicios ya resueltos contra el catálogo.
 * La clave de sesión lleva el programa y el día delante: el mismo
 * ejercicio puede salir en dos programas o dos días de la semana sin
 * que se pisen las series marcadas.
 */
export function dia(prog, n) {
  const d = prog.dias.find(x => x.n === n);
  if (!d) throw new Error(`No existe el día ${n} en el programa ${prog.id}`);
  return {
    ...d,
    ejercicios: d.ejercicios.map(e => ({
      ...ejercicio(e.ej), ...e, sesionId: `${prog.id}:${d.n}:${e.ej}`
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

/* Los días que sostienen la semana. El resto suma, pero no se echa
   de menos: sin ellos el cuerpo entero sigue entrenado. */
export const nucleo = prog => prog.dias.filter(d => !d.suelto).map(d => d.n);

export const totalSeries = prog => prog.dias.reduce(
  (a, d) => a + d.ejercicios.reduce((b, e) => b + e.series, 0), 0);
