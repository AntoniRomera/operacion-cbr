/* ============================================================
   INVENTARIO Y CARGAS
   Esto es lo que hay en casa. Cambia los números de aquí y toda
   la app se recalcula sola: las cargas posibles, los saltos de
   peso y el dibujo de la barra.

   Nada de listas escritas a mano: las combinaciones se resuelven
   probando todos los repartos posibles de discos entre los dos
   lados. Con seis discos son 729 repartos, se hace al arrancar y
   no se nota.
   ============================================================ */

export const BARRA = { nombre: "Barra olímpica", kg: 20 };

/* Los discos que tienes, uno por entrada. Hay dos de 5 kg. */
export const DISCOS = [25, 20, 15, 10, 5, 5];

/* Mancuernas fijas: pares completos disponibles, en kg por mano. */
export const MANCUERNAS = [5];

/* Colores oficiales de competición. Los usa el dibujo de la barra. */
export const COLOR_DISCO = {
  25: { fondo: "var(--p25)", texto: "#fff",    alto: 64, ancho: 19 },
  20: { fondo: "var(--p20)", texto: "#fff",    alto: 59, ancho: 17 },
  15: { fondo: "var(--p15)", texto: "#1A1305", alto: 53, ancho: 15 },
  10: { fondo: "var(--p10)", texto: "#fff",    alto: 46, ancho: 13 },
  5:  { fondo: "var(--p5)",  texto: "#1A1F25", alto: 37, ancho: 10 },
  2.5:{ fondo: "#5C6C7A",    texto: "#fff",    alto: 30, ancho: 8 },
  1.25:{fondo: "#8496A6",    texto: "#1A1F25", alto: 26, ancho: 7 }
};

/* ---------- resolver de cargas de barra ---------- */

/**
 * Todos los pesos montables en la barra, con el reparto de discos.
 * Cada disco puede ir al lado izquierdo, al derecho o quedarse fuera;
 * solo valen los repartos con el mismo peso a cada lado.
 * @returns {{total:number, izq:number[], der:number[]}[]} de menor a mayor
 */
function resolverBarra(discos = DISCOS, barra = BARRA.kg) {
  const mejores = new Map();

  const repartir = (i, izq, der) => {
    if (i === discos.length) {
      const pIzq = izq.reduce((a, b) => a + b, 0);
      const pDer = der.reduce((a, b) => a + b, 0);
      if (pIzq !== pDer) return;
      const total = barra + pIzq + pDer;
      const cand = { total, izq: [...izq], der: [...der] };
      const previo = mejores.get(total);
      if (!previo || puntua(cand) < puntua(previo)) mejores.set(total, cand);
      return;
    }
    repartir(i + 1, izq, der);                       // este disco se queda fuera
    izq.push(discos[i]); repartir(i + 1, izq, der); izq.pop();
    der.push(discos[i]); repartir(i + 1, izq, der); der.pop();
  };

  /* Menos discos es mejor: menos cambios entre series y menos jaleo. */
  const puntua = c => c.izq.length + c.der.length;

  repartir(0, [], []);
  return [...mejores.values()].sort((a, b) => a.total - b.total);
}

/** Sumas posibles con cualquier combinación de discos (disco suelto, landmine). */
function sumasPosibles(discos = DISCOS) {
  const set = new Set([0]);
  for (const d of discos) {
    for (const s of [...set]) set.add(s + d);
  }
  return [...set].filter(s => s > 0).sort((a, b) => a - b);
}

export const CARGAS_BARRA = resolverBarra();
export const CARGAS_SUELTAS = sumasPosibles();
export const DISCOS_SUELTOS = [...new Set(DISCOS)].sort((a, b) => a - b);
export const TOPE_BARRA = CARGAS_BARRA[CARGAS_BARRA.length - 1].total;

/** Reparto de discos para un peso concreto de barra. */
export const repartoDe = total => CARGAS_BARRA.find(c => c.total === total) || null;

/**
 * Escalón de pesos disponibles para un ejercicio, según su implemento.
 * Devuelve siempre un array ordenado; el ejercicio guarda su posición.
 */
export function escalonDe(implemento) {
  switch (implemento) {
    case "barra":     return CARGAS_BARRA.map(c => c.total);
    case "landmine":  return CARGAS_SUELTAS;
    case "disco":     return DISCOS_SUELTOS;
    case "mancuerna": return MANCUERNAS;
    default:          return [0];          // peso corporal
  }
}

/**
 * Series de aproximación para una carga de trabajo con barra.
 * No son porcentajes de manual: se redondean al escalón que de verdad
 * puedes montar con tus discos, que es lo único que vas a poner.
 * Bajan de reps según sube el peso — calentar no es fatigarse.
 */
export function aproximacion(kgTrabajo) {
  const totales = CARGAS_BARRA.map(c => c.total);
  const barra = totales[0];
  if (kgTrabajo <= barra + 10) return [{ kg: barra, reps: 10 }];

  const vistos = new Set();
  const series = [];
  for (const { parte, reps } of [{ parte: .45, reps: 8 }, { parte: .65, reps: 5 }, { parte: .85, reps: 3 }]) {
    const ideal = kgTrabajo * parte;
    const kg = totales.filter(t => t < kgTrabajo)
                      .reduce((a, t) => Math.abs(t - ideal) < Math.abs(a - ideal) ? t : a, barra);
    if (!vistos.has(kg)) { vistos.add(kg); series.push({ kg, reps }); }
  }
  return series;
}

/** Peso movido de verdad en una serie, para contar volumen y XP. */
export function cargaReal(ejercicio, kg, pesoCorporal = 80) {
  if (ejercicio.implemento === "corporal") {
    return Math.round(pesoCorporal * (ejercicio.factorPeso ?? 0.6));
  }
  if (ejercicio.implemento === "mancuerna") return kg * 2;
  /* La palanca del landmine descuenta cerca de un tercio de la carga. */
  if (ejercicio.implemento === "landmine") return Math.round(kg * 0.65);
  return kg;
}
