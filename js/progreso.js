/* ============================================================
   PROGRESO · niveles, rangos, estadísticas y logros
   Nada de esto se guarda por duplicado: el nivel, el rango y las
   estadísticas se calculan siempre desde el historial de series.
   Así no hay contadores que se descuadren con el tiempo.
   ============================================================ */

import { LOGROS } from "../datos/logros.js";

/* XP de una serie: el volumen manda, con un suelo para que las
   series ligeras de aislamiento también sumen algo. */
export const xpDeSerie = (carga, reps) => Math.max(5, Math.round(carga * reps / 10));

/* Bono por cerrar el día entero. Premia terminar, no picotear. */
export const XP_MISION = 100;

/** XP acumulada necesaria para estar en el nivel n. */
export const umbral = n => (n <= 1 ? 0 : Math.round(100 * Math.pow(n - 1, 1.6)));

export function nivelDe(xp) {
  let nivel = 1;
  while (umbral(nivel + 1) <= xp && nivel < 999) nivel++;
  const base = umbral(nivel), techo = umbral(nivel + 1);
  return {
    nivel, xp,
    enNivel: xp - base,
    paraSubir: techo - base,
    progreso: Math.min(1, (xp - base) / (techo - base))
  };
}

export const RANGOS = [
  { rango: "S", desde: 45 }, { rango: "A", desde: 30 }, { rango: "B", desde: 20 },
  { rango: "C", desde: 10 }, { rango: "D", desde: 5 },  { rango: "E", desde: 1 }
];
export const rangoDe = nivel => RANGOS.find(r => nivel >= r.desde).rango;

/** Cuánto falta para el siguiente rango, o null si ya es S. */
export function proximoRango(nivel) {
  const orden = [...RANGOS].reverse();
  const i = orden.findIndex(r => r.rango === rangoDe(nivel));
  return orden[i + 1] ? { ...orden[i + 1], faltan: orden[i + 1].desde - nivel } : null;
}

/* ---------- estadísticas desde el historial ---------- */
export function estadisticas(filas) {
  const sesiones = new Set(), ejercicios = new Set();
  let volumen = 0, reps = 0, xp = 0, kgMax = 0;

  for (const f of filas) {
    sesiones.add(`${f.f}|${f.dia}`);
    if (f.ej) ejercicios.add(f.ej);
    volumen += f.volumen || 0;
    reps += (f.reps || 0) * (f.series || 0);
    xp += f.xp || 0;
    kgMax = Math.max(kgMax, f.carga || f.kg || 0);
  }
  /* El bono de misión no está en las filas: se reconstruye por sesión. */
  xp += sesiones.size * XP_MISION;

  return {
    sesiones: sesiones.size, series: filas.length, volumen, reps, xp, kgMax,
    ejerciciosDistintos: ejercicios.size,
    ...nivelDe(xp),
    rango: rangoDe(nivelDe(xp).nivel)
  };
}

/** Fuerza, resistencia y demás, en la escala del Sistema. */
export function atributos(st) {
  return [
    { clave: "FUE", nombre: "Fuerza",      valor: st.kgMax,                             sufijo: " kg" },
    { clave: "RES", nombre: "Resistencia", valor: st.reps,                              sufijo: " reps" },
    { clave: "VOL", nombre: "Volumen",     valor: +(st.volumen / 1000).toFixed(1),      sufijo: " t" },
    { clave: "CON", nombre: "Constancia",  valor: st.sesiones,                          sufijo: " ses." }
  ];
}

/**
 * Contexto que reciben las condiciones de los logros.
 * `ultima` solo llega justo después de terminar una sesión.
 */
export function contexto({ estado, filas, ultima = null }) {
  const st = estadisticas(filas);
  const diasSemana = new Set(filas.filter(f => f.semana === estado.semana).map(f => f.dia));
  return {
    ...st,
    semana: estado.semana,
    diasEstaSemana: diasSemana.size,
    tecnicasVistas: (estado.tecnicas || []).length,
    ultima
  };
}

/** Devuelve los logros recién desbloqueados, sin repetir los que ya estaban. */
export function evaluar(ctx, desbloqueados = []) {
  const ya = new Set(desbloqueados);
  const nuevos = [];
  for (const l of LOGROS) {
    if (ya.has(l.id)) continue;
    let cumple = false;
    try { cumple = !!l.cond(ctx); }
    catch (e) { console.warn(`Logro "${l.id}" ha fallado al evaluarse:`, e); }
    if (cumple) nuevos.push(l);
  }
  return nuevos;
}
