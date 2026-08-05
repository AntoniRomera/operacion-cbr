/* ============================================================
   LOGROS
   Se evalúan al terminar una sesión y también al arrancar, por si
   una condición se cumple sin entrenar (subir de nivel, por ejemplo).

   cond(c) recibe un contexto ya calculado; devolver true desbloquea.
   Campos del contexto en js/progreso.js → contexto().

   rango: E D C B A S — solo estética, ordena la lista y da color.
   Añadir un logro es añadir una línea. No hace falta tocar nada más.
   ============================================================ */

export const LOGROS = [
  /* ---------- rango E ---------- */
  { id: "despertar", rango: "E", icono: "◈",
    nombre: "Despertar",
    desc: "Termina tu primera sesión.",
    cond: c => c.sesiones >= 1 },

  { id: "mision", rango: "E", icono: "✓",
    nombre: "Misión diaria completada",
    desc: "Marca todas las series de un día.",
    cond: c => c.ultima?.completa },

  { id: "manual", rango: "E", icono: "◉",
    nombre: "Ojo del cazador",
    desc: "Consulta la técnica de 5 ejercicios distintos.",
    cond: c => c.tecnicasVistas >= 5 },

  { id: "tonelada", rango: "E", icono: "▬",
    nombre: "Una tonelada",
    desc: "Acumula 1.000 kg movidos.",
    cond: c => c.volumen >= 1000 },

  /* ---------- rango D ---------- */
  { id: "cazador", rango: "D", icono: "⌖",
    nombre: "Cazador registrado",
    desc: "Cinco sesiones terminadas.",
    cond: c => c.sesiones >= 5 },

  { id: "tressemana", rango: "D", icono: "⋯",
    nombre: "Sin penalización",
    desc: "Tres días distintos en la misma semana.",
    cond: c => c.diasEstaSemana >= 3 },

  { id: "dieztone", rango: "D", icono: "▰",
    nombre: "Diez toneladas",
    desc: "Acumula 10.000 kg movidos.",
    cond: c => c.volumen >= 10000 },

  { id: "amanecer", rango: "D", icono: "☀",
    nombre: "Puerta al amanecer",
    desc: "Termina una sesión antes de las 8:00.",
    cond: c => c.ultima && c.ultima.hora < 8 },

  { id: "nocturna", rango: "D", icono: "☾",
    nombre: "Incursión nocturna",
    desc: "Termina una sesión después de las 22:00.",
    cond: c => c.ultima && c.ultima.hora >= 22 },

  /* ---------- rango C ---------- */
  { id: "diez", rango: "C", icono: "❖",
    nombre: "Diez incursiones",
    desc: "Diez sesiones terminadas.",
    cond: c => c.sesiones >= 10 },

  { id: "semanaperfecta", rango: "C", icono: "★",
    nombre: "Semana perfecta",
    desc: "Los cinco días de una misma semana.",
    cond: c => c.diasEstaSemana >= 5 },

  { id: "doblefilo", rango: "C", icono: "⚔",
    nombre: "Doble filo",
    desc: "Dos ejercicios listos para subir peso el mismo día.",
    cond: c => (c.ultima?.subidas || 0) >= 2 },

  { id: "arise", rango: "C", icono: "↑",
    nombre: "¡Levántate!",
    desc: "Vuelve a entrenar tras siete días o más parado.",
    cond: c => (c.ultima?.diasParado || 0) >= 7 },

  { id: "cientone", rango: "C", icono: "▮",
    nombre: "Cien toneladas",
    desc: "Acumula 100.000 kg movidos.",
    cond: c => c.volumen >= 100000 },

  { id: "cienseries", rango: "C", icono: "≡",
    nombre: "Cien series",
    desc: "Cien series registradas en el historial.",
    cond: c => c.series >= 100 },

  /* ---------- rango B ---------- */
  { id: "tresdigitos", rango: "B", icono: "◆",
    nombre: "Tres dígitos",
    desc: "Mueve 100 kg en cualquier ejercicio.",
    cond: c => c.kgMax >= 100 },

  { id: "cincuenta", rango: "B", icono: "✦",
    nombre: "Cincuenta incursiones",
    desc: "Cincuenta sesiones terminadas.",
    cond: c => c.sesiones >= 50 },

  { id: "puertaroja", rango: "B", icono: "⬢",
    nombre: "Puerta roja",
    desc: "Diez toneladas movidas en una sola sesión.",
    cond: c => (c.ultima?.volumen || 0) >= 10000 },

  { id: "quinientas", rango: "B", icono: "▉",
    nombre: "Quinientas toneladas",
    desc: "Acumula 500.000 kg movidos.",
    cond: c => c.volumen >= 500000 },

  { id: "catalogo", rango: "B", icono: "⊞",
    nombre: "Arsenal completo",
    desc: "Registra series de veinte ejercicios distintos.",
    cond: c => c.ejerciciosDistintos >= 20 },

  /* ---------- rango A ---------- */
  { id: "cien", rango: "A", icono: "✧",
    nombre: "Cien incursiones",
    desc: "Cien sesiones terminadas.",
    cond: c => c.sesiones >= 100 },

  { id: "millon", rango: "A", icono: "█",
    nombre: "Un millón de kilos",
    desc: "Acumula 1.000.000 kg movidos.",
    cond: c => c.volumen >= 1000000 },

  { id: "ejercito", rango: "A", icono: "▚",
    nombre: "Ejército de sombras",
    desc: "Quinientas series registradas.",
    cond: c => c.series >= 500 },

  /* ---------- rango S ---------- */
  { id: "monarca", rango: "S", icono: "♛",
    nombre: "Monarca de las sombras",
    desc: "Alcanza el nivel 45 y el rango S.",
    cond: c => c.nivel >= 45 }
];

export const LOGRO = Object.fromEntries(LOGROS.map(l => [l.id, l]));

export const ORDEN_RANGO = ["E", "D", "C", "B", "A", "S"];

export const COLOR_RANGO = {
  E: "#8496A6", D: "#2E8B57", C: "#2B5FA8",
  B: "#8B5CF6", A: "#D9A521", S: "#C8342E"
};
