/* ============================================================
   INVENTARIO Y CARGAS
   Esto es lo que hay en casa. Cambia los números de aquí y toda
   la app se recalcula sola: las cargas posibles, los saltos de
   peso y el dibujo de la barra.

   Nada de listas escritas a mano: las combinaciones se resuelven
   probando todos los repartos posibles de bumpers entre los dos
   lados (729 repartos con seis bumpers) y, sobre cada uno, todas
   las combinaciones de pares de fraccionales (16 con cuatro pares).
   Se hace al arrancar y no se nota.
   ============================================================ */

export const BARRA = { nombre: "Barra olímpica", kg: 20 };

/* Bumpers, uno por entrada. Hay dos de 5 kg. Todos de 450 mm de
   diámetro: lo que cambia con el peso es el grosor, no el diámetro. */
export const DISCOS = [25, 20, 15, 10, 5, 5];

/* Fraccionales FitnessTech por pares (uno a cada lado, para afinar sin
   descuadrar la barra). No son de acero: son bumper también, solo que
   pequeños. Con estos cuatro pares se cubre cualquier entero de 0 a
   10 kg por encima de lo que pongan los bumpers. */
export const FRACCIONALES = [0.5, 1, 1.5, 2];

/* Mancuernas hexagonales fijas: por ahora solo el par de 5 kg. El de
   8 kg se compra más adelante — no se ofrece hasta que exista. Son de
   peso fijo: en ellas se progresa por reps, nunca proponiéndoles kilos. */
export const MANCUERNAS = [5];

/* Elásticos: todavía no hay ninguno en casa. Cuando lleguen, se listan
   aquí por su resistencia equivalente en kg y "banda" ya funciona como
   implemento en el catálogo sin tocar nada más. */
export const BANDAS = [];

/* Grosores asumidos para el aviso de manguito lleno (no hay dato real
   de fábrica): 30 mm por bumper, cualquiera que sea su peso, y menos
   por fraccional al ser mucho más finos. 410 mm es lo útil del manguito
   antes del collarín. */
export const GROSOR_BUMPER_MM = 30;
export const GROSOR_FRACCIONAL_MM = 8;
export const MANGUITO_UTIL_MM = 410;

/* Colores oficiales de competición. Los usa el dibujo de la barra.
   Diámetro (alto) igual para los cinco bumpers; el ancho sí decrece
   con el peso, que es donde de verdad varía el grosor real. */
export const COLOR_DISCO = {
  25:  { fondo: "var(--p25)", texto: "#fff",    alto: 64, ancho: 19 },
  20:  { fondo: "var(--p20)", texto: "#fff",    alto: 64, ancho: 17 },
  15:  { fondo: "var(--p15)", texto: "#1A1305", alto: 64, ancho: 15 },
  10:  { fondo: "var(--p10)", texto: "#fff",    alto: 64, ancho: 13 },
  5:   { fondo: "var(--p5)",  texto: "#1A1F25", alto: 64, ancho: 10 },
  2:   { fondo: "#5C6C7A",    texto: "#fff",    alto: 24, ancho: 8, frac: true },
  1.5: { fondo: "#6C7A88",    texto: "#fff",    alto: 21, ancho: 7, frac: true },
  1:   { fondo: "#7C8A98",    texto: "#fff",    alto: 18, ancho: 6, frac: true },
  0.5: { fondo: "#8C9AA8",    texto: "#1A1F25", alto: 15, ancho: 5, frac: true }
};

/* ---------- resolver de cargas de barra ---------- */

/** Todos los subconjuntos de una lista (incluido el vacío). Con cuatro
 * fraccionales son 16; nada que no se pueda hacer al arrancar. */
function subconjuntos(pesos) {
  let out = [[]];
  for (const p of pesos) out = out.concat(out.map(s => [...s, p]));
  return out;
}

/**
 * Repartos de bumpers entre los dos lados, uno por total alcanzable.
 * Cada bumper puede ir al lado izquierdo, al derecho o quedarse fuera;
 * solo valen los repartos con el mismo peso a cada lado. Con varios
 * repartos posibles para el mismo total, gana el de menos discos.
 */
function repartosBumper(discos, barra) {
  const mejores = new Map();
  const puntua = c => c.izq.length + c.der.length;

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
    repartir(i + 1, izq, der);                       // este bumper se queda fuera
    izq.push(discos[i]); repartir(i + 1, izq, der); izq.pop();
    der.push(discos[i]); repartir(i + 1, izq, der); der.pop();
  };

  repartir(0, [], []);
  return [...mejores.values()];
}

/**
 * Combina cada reparto de bumpers con cada combinación de pares de
 * fraccionales (siempre uno a cada lado, para no descuadrar la barra)
 * y se queda con el mejor candidato por total: primero que quepa en
 * el manguito, y si hay empate, el de menos discos.
 */
function resolverBarra(discos = DISCOS, fraccionales = FRACCIONALES, barra = BARRA.kg) {
  const bases = repartosBumper(discos, barra);
  const pares = subconjuntos(fraccionales);
  const mejorQue = (a, b) => a.cabe !== b.cabe
    ? a.cabe
    : (a.izq.length + a.der.length) < (b.izq.length + b.der.length);

  const combos = new Map();
  for (const base of bases) {
    const grosorBaseIzq = base.izq.length * GROSOR_BUMPER_MM;
    const grosorBaseDer = base.der.length * GROSOR_BUMPER_MM;
    for (const par of pares) {
      const total = base.total + par.reduce((a, b) => a + b, 0) * 2;
      const grosorFrac = par.length * GROSOR_FRACCIONAL_MM;
      const cand = {
        total,
        izq: [...base.izq, ...par],
        der: [...base.der, ...par],
        cabe: grosorBaseIzq + grosorFrac <= MANGUITO_UTIL_MM
           && grosorBaseDer + grosorFrac <= MANGUITO_UTIL_MM
      };
      const previo = combos.get(total);
      if (!previo || mejorQue(cand, previo)) combos.set(total, cand);
    }
  }
  return [...combos.values()].sort((a, b) => a.total - b.total);
}

/** Sumas posibles con cualquier combinación de bumpers (disco suelto, landmine). */
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
    case "banda":     return BANDAS;
    default:          return [0];          // peso corporal
  }
}

/**
 * Series de aproximación para una carga de trabajo con barra: barra
 * vacía × 8, 50 % × 5, 75 % × 3. No son las series de trabajo — se
 * marcan aparte y no suman volumen ni XP, solo tiempo de sesión.
 * Los porcentajes se redondean al escalón que de verdad puedes montar
 * con tus discos, que es lo único que vas a poner.
 */
export function aproximacion(kgTrabajo) {
  const totales = CARGAS_BARRA.map(c => c.total);
  const barra = totales[0];
  const vistos = new Set([barra]);
  const series = [{ kg: barra, reps: 8 }];
  for (const { parte, reps } of [{ parte: .5, reps: 5 }, { parte: .75, reps: 3 }]) {
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
