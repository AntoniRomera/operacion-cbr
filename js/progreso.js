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

/* XP acumulada necesaria para estar en el nivel n.
   La curva está ajustada a sesiones reales de esta rutina, que rondan
   los 1.000-1.500 XP: los primeros niveles caen en la primera semana
   y el rango S (nivel 45) pide alrededor de un año de constancia. */
export const umbral = n => (n <= 1 ? 0 : Math.round(60 * Math.pow(n - 1, 2.3)));

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

/* ---------- récords ----------
   Epley. Sirve para comparar series que no se pueden comparar a ojo:
   60 kg × 12 vale más que 70 × 5, y sin esto no se nota. Por encima de
   quince reps la fórmula se dispara, así que ahí se corta: es una
   referencia para ver progreso, no una marca real de fuerza máxima. */
export const e1RM = (carga, reps) =>
  carga > 0 && reps > 0 ? Math.round(carga * (1 + Math.min(reps, 15) / 30)) : 0;

/* En los corporales no hay 1RM que valga: la carga es tu propio peso.
   Aplicar la fórmula daría 134 kg en unas negativas de dominada, y como
   la carga baja al adelgazar, perder grasa parecería perder fuerza.
   Ahí la marca son las reps, que es lo que de verdad sube. */
export const esCorporal = f => f.implemento === "corporal";

export const e1RMde = f => esCorporal(f) ? 0 : e1RM(f.carga || f.kg || 0, f.reps || 0);

/** La marca que compite consigo misma en cada ejercicio. */
export const marcaDe = f => esCorporal(f) ? (f.reps || 0) : e1RMde(f);
export const unidadMarca = f => esCorporal(f) ? "reps" : "kg estimados";

/** Mejor marca histórica de un ejercicio. */
export function mejorMarca(filas, clave) {
  return filas.reduce((a, f) => f.ej === clave ? Math.max(a, marcaDe(f)) : a, 0);
}

/* ---------- estadísticas desde el historial ---------- */
export function estadisticas(filas) {
  const sesiones = new Map(), ejercicios = new Set();
  let volumen = 0, reps = 0, xp = 0, kgMax = 0;

  for (const f of filas) {
    /* Los minutos van repetidos en cada fila de la sesión: se toma uno. */
    const clave = `${f.f}|${f.dia}`;
    if (!sesiones.has(clave)) sesiones.set(clave, f.minutos || 0);
    else if (f.minutos) sesiones.set(clave, f.minutos);
    if (f.ej) ejercicios.add(f.ej);
    volumen += f.volumen || 0;
    reps += (f.reps || 0) * (f.series || 0);
    xp += f.xp || 0;
    /* Fuerza es peso levantado, no peso propio: si contaran los
       corporales, unas flexiones marcarían más que la banca. */
    if (f.implemento !== "corporal") kgMax = Math.max(kgMax, f.carga || f.kg || 0);
  }
  /* El bono de misión no está en las filas: se reconstruye por sesión. */
  xp += sesiones.size * XP_MISION;
  const minutos = [...sesiones.values()].reduce((a, b) => a + b, 0);

  return {
    sesiones: sesiones.size, series: filas.length, volumen, reps, xp, kgMax, minutos,
    ejerciciosDistintos: ejercicios.size,
    ...nivelDe(xp),
    rango: rangoDe(nivelDe(xp).nivel)
  };
}

/* ---------- racha ----------
   Días de gracia entre sesiones: la rutina tiene descansos, así que
   contar días seguidos castigaría por descansar. Lo que rompe la racha
   es desaparecer, no tomarse el domingo libre. */
export const DIAS_GRACIA = 3;

export function racha(filas) {
  const dias = [...new Set(filas.map(f => f.f))].sort();
  if (!dias.length) {
    return { actual: 0, mejor: 0, diasDesde: null, rota: false, enRiesgo: false, margen: DIAS_GRACIA };
  }

  let cadena = 1, mejor = 1;
  for (let i = 1; i < dias.length; i++) {
    const hueco = Math.round((new Date(dias[i]) - new Date(dias[i - 1])) / 86400000);
    cadena = hueco <= DIAS_GRACIA ? cadena + 1 : 1;
    mejor = Math.max(mejor, cadena);
  }

  const hoy = new Date(new Date().toISOString().slice(0, 10));
  const diasDesde = Math.round((hoy - new Date(dias[dias.length - 1])) / 86400000);
  const rota = diasDesde > DIAS_GRACIA;

  return {
    actual: rota ? 0 : cadena,
    perdida: rota ? cadena : 0,       // lo que había justo antes de romperse
    mejor, diasDesde, rota,
    enRiesgo: !rota && diasDesde >= DIAS_GRACIA - 1,
    margen: Math.max(0, DIAS_GRACIA - diasDesde)
  };
}

/** Sesiones agrupadas, de más reciente a más antigua. */
export function sesiones(filas) {
  const mapa = new Map();
  for (const f of filas) {
    const clave = `${f.f}|${f.dia}`;
    if (!mapa.has(clave)) mapa.set(clave, { f: f.f, dia: f.dia, volumen: 0, series: 0, minutos: f.minutos || 0, filas: [] });
    const s = mapa.get(clave);
    s.volumen += f.volumen || 0;
    s.series += f.series || 0;
    if (f.minutos) s.minutos = f.minutos;
    s.filas.push(f);
  }
  return [...mapa.values()].sort((a, b) => (a.f < b.f ? 1 : a.f > b.f ? -1 : b.dia - a.dia));
}

/** Fuerza, resistencia y demás, en la escala del Sistema. */
export function atributos(st, r = { actual: 0 }) {
  const horas = st.minutos / 60;
  return [
    { clave: "FUE", nombre: "Fuerza",      valor: st.kgMax,                        sufijo: " kg" },
    { clave: "RES", nombre: "Resistencia", valor: st.reps,                         sufijo: " reps" },
    { clave: "VOL", nombre: "Volumen",     valor: +(st.volumen / 1000).toFixed(1), sufijo: " t" },
    { clave: "CON", nombre: "Constancia",  valor: st.sesiones,                     sufijo: " ses." },
    { clave: "TMP", nombre: "Bajo la barra", valor: horas >= 10 ? Math.round(horas) : +horas.toFixed(1), sufijo: " h" },
    { clave: "RCH", nombre: "Racha",       valor: r.actual,                        sufijo: r.actual === 1 ? " ses." : " ses." }
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
    racha: racha(filas),
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
