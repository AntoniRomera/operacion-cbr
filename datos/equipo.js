/* ============================================================
   INVENTARIO Y CARGAS
   El inventario ya no es una constante fija: vive por cazador, en
   E.equipo (ver spec 007), y se edita desde Perfil. Aquí solo quedan
   las FORMAS (qué pinta tiene un inventario) y los cálculos puros —
   cargas de barra, escalones — que reciben ese inventario como
   parámetro. `configDefecto()` es la semilla: lo que Toni tiene hoy,
   activo; belt squat y bandas, ya en el catálogo pero desactivados
   hasta que existan de verdad.

   Nada de listas escritas a mano en los cálculos: las combinaciones de
   barra se resuelven probando todos los repartos posibles de bumpers
   entre los dos lados y, sobre cada uno, todas las combinaciones de
   pares de fraccionales. Se hace al entrar a un día y no se nota.
   ============================================================ */

/** Categorías de equipo que la app sabe nombrar, aunque no estén
 * activas — para el editor de Perfil, en este orden. */
export const CATEGORIAS_EQUIPO = [
  /* "Barra olímpica" es una etiqueta que se gana, no un nombre fijo:
     solo se llama así si pesa 20 kg de verdad — lo resuelve
     `equipoCategoriasHTML` en app.js, este nombre es solo el respaldo. */
  { clave: "barra",     nombre: "Barra" },
  { clave: "discos",    nombre: "Discos y fraccionales" },
  { clave: "landmine",  nombre: "Landmine" },
  { clave: "mancuerna", nombre: "Mancuernas" },
  { clave: "banda",     nombre: "Bandas elásticas" },
  { clave: "beltsquat", nombre: "Belt squat" }
];

/** El inventario real de Toni hoy, todo activo — la semilla de un
 * cazador nuevo. Belt squat y bandas quedan en el catálogo pero
 * desactivadas: existen como tipo, no hay que darlas de alta a mano
 * para desactivarlas. */
export function configDefecto() {
  return {
    barra: { activo: true, kg: 20 },
    discos: { activo: true, pesos: [25, 20, 15, 10, 5, 5], fraccionales: [0.5, 1, 1.5, 2] },
    landmine: { activo: true },
    mancuerna: { activo: true, pesos: [5] },
    banda: { activo: false, pesos: [] },
    beltsquat: { activo: false }
  };
}

/* Grosores asumidos para el aviso de manguito lleno (no hay dato real
   de fábrica): 30 mm por bumper, cualquiera que sea su peso, y menos
   por fraccional al ser mucho más finos. 410 mm es lo útil del manguito
   antes del collarín. Son hechos físicos de la barra, no inventario. */
const GROSOR_BUMPER_MM = 30;
const GROSOR_FRACCIONAL_MM = 8;
const MANGUITO_UTIL_MM = 410;

/* Colores oficiales de competición. Los usa el dibujo de la barra.
   Diámetro (alto) igual para los cinco bumpers; el ancho sí decrece
   con el peso, que es donde de verdad varía el grosor real.

   Los fraccionales son bumpers también, de 50 mm de diámetro exterior:
   mismo código de color que su equivalente en peso (blanco/verde/
   amarillo/azul), mucho más finos en el dibujo. */
export const COLOR_DISCO = {
  25:  { fondo: "var(--p25)", texto: "#fff",    alto: 64, ancho: 19 },
  20:  { fondo: "var(--p20)", texto: "#fff",    alto: 64, ancho: 17 },
  15:  { fondo: "var(--p15)", texto: "#1A1305", alto: 64, ancho: 15 },
  10:  { fondo: "var(--p10)", texto: "#fff",    alto: 64, ancho: 13 },
  5:   { fondo: "var(--p5)",  texto: "#1A1F25", alto: 64, ancho: 10 },
  2:   { fondo: "var(--p20)", texto: "#fff",    alto: 20, ancho: 8, frac: true },
  1.5: { fondo: "var(--p15)", texto: "#1A1305", alto: 20, ancho: 7, frac: true },
  1:   { fondo: "var(--p10)", texto: "#fff",    alto: 20, ancho: 6, frac: true },
  0.5: { fondo: "var(--p5)",  texto: "#1A1F25", alto: 20, ancho: 5, frac: true }
};

/* ---------- resolver de cargas de barra ---------- */

/** Todos los subconjuntos de una lista (incluido el vacío). Con cuatro
 * fraccionales son 16; nada que no se pueda hacer al entrar a un día. */
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
function resolverBarraDesde(discos, fraccionales, barraKg) {
  const bases = repartosBumper(discos, barraKg);
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

/** Sumas posibles con cualquier combinación de bumpers (disco suelto, landmine, belt squat). */
function sumasPosibles(discos) {
  const set = new Set([0]);
  for (const d of discos) {
    for (const s of [...set]) set.add(s + d);
  }
  return [...set].filter(s => s > 0).sort((a, b) => a - b);
}

/** Cargas de barra posibles con este inventario — vacío si no hay
 * barra activa o no hay discos activos para cargarla. */
export function cargasBarra(config) {
  if (!config.barra?.activo || !config.discos?.activo) return [];
  return resolverBarraDesde(config.discos.pesos, config.discos.fraccionales || [], config.barra.kg);
}

/** Sumas posibles con los discos sueltos — vacío si los discos están desactivados. */
export function cargasSueltas(config) {
  return config.discos?.activo ? sumasPosibles(config.discos.pesos) : [];
}

export function discosSueltos(config) {
  return config.discos?.activo ? [...new Set(config.discos.pesos)].sort((a, b) => a - b) : [];
}

export function topeBarra(config) {
  const c = cargasBarra(config);
  return c.length ? c[c.length - 1].total : 0;
}

/** Reparto de discos para un peso concreto de barra, para dibujarla. */
export function repartoDe(config, total) {
  return cargasBarra(config).find(c => c.total === total) || null;
}

/**
 * Escalón de pesos disponibles para un ejercicio, según su implemento
 * y lo que esté activo en el inventario. Vacío si ese equipo está
 * desactivado — es la señal que usa `equipoDisponible` para saber si
 * el ejercicio se puede ofrecer.
 */
export function escalonDe(config, implemento) {
  switch (implemento) {
    case "barra":     return config.barra?.activo ? cargasBarra(config).map(c => c.total) : [];
    case "landmine":  return config.landmine?.activo ? cargasSueltas(config) : [];
    case "disco":     return discosSueltos(config);
    case "mancuerna": return config.mancuerna?.activo ? (config.mancuerna.pesos || []) : [];
    case "banda":     return config.banda?.activo ? (config.banda.pesos || []) : [];
    /* El belt squat se carga con los mismos discos sueltos que landmine. */
    case "beltsquat": return config.beltsquat?.activo ? cargasSueltas(config) : [];
    default:          return [0];          // peso corporal
  }
}

/** Si hay equipo suficiente activo para ofrecer este ejercicio. */
export function equipoDisponible(config, ejercicio) {
  if (ejercicio.implemento === "corporal") return true;
  return escalonDe(config, ejercicio.implemento).length > 0;
}

/**
 * Series de aproximación para una carga de trabajo con barra: barra
 * vacía × 8, 50 % × 5, 75 % × 3. No son las series de trabajo — se
 * marcan aparte y no suman volumen ni XP, solo tiempo de sesión.
 * Los porcentajes se redondean al escalón que de verdad puedes montar
 * con tus discos, que es lo único que vas a poner.
 */
export function aproximacion(config, kgTrabajo) {
  const totales = cargasBarra(config).map(c => c.total);
  if (!totales.length) return [];
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

/** Peso movido de verdad en una serie, para contar volumen y XP. No
 * depende del inventario, solo del implemento del ejercicio. */
export function cargaReal(ejercicio, kg, pesoCorporal = 80) {
  if (ejercicio.implemento === "corporal") {
    return Math.round(pesoCorporal * (ejercicio.factorPeso ?? 0.6));
  }
  if (ejercicio.implemento === "mancuerna") return kg * 2;
  /* La palanca del landmine descuenta cerca de un tercio de la carga. */
  if (ejercicio.implemento === "landmine") return Math.round(kg * 0.65);
  return kg;
}
