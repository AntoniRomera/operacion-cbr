/* ============================================================
   NUTRICIÓN — motor de cálculo
   TMB por Mifflin-St Jeor, mantenimiento por nivel de actividad y
   objetivo diario de kcal/macros según el % de déficit/superávit del
   perfil. Puro: nada de DB ni de DOM aquí, para poder probarlo con
   datos reales sin levantar la app — ver spec 010.
   ============================================================ */

export const NIVELES_ACTIVIDAD = [
  { clave: "sedentario", nombre: "Sedentario (trabajo de mesa, poco movimiento)", factor: 1.2 },
  { clave: "ligera",     nombre: "Ligera (2-3 días de entreno)",                  factor: 1.375 },
  { clave: "moderada",   nombre: "Moderada (4-5 días de entreno)",                factor: 1.55 },
  { clave: "alta",       nombre: "Alta (entreno duro casi a diario)",             factor: 1.725 },
  { clave: "muyalta",    nombre: "Muy alta (entreno + trabajo físico)",           factor: 1.9 }
];

const factorDe = clave => NIVELES_ACTIVIDAD.find(n => n.clave === clave)?.factor ?? 1.55;

/**
 * Edad, altura y % de grasa son opcionales en el formulario — nunca se
 * inventan. Con % de grasa, ni edad ni altura hacen falta (Katch-McArdle).
 * Sin él, hacen falta las dos para Mifflin-St Jeor. Sexo y peso siempre
 * hacen falta: son la base de cualquiera de las dos fórmulas.
 */
export function datosSuficientes({ pesoKg, sexo, edad, alturaCm, grasaPct } = {}) {
  if (!pesoKg || !sexo) return false;
  if (grasaPct != null) return true;
  return edad != null && alturaCm != null;
}

/**
 * Mifflin-St Jeor si no hay % de grasa corporal; Katch-McArdle (más
 * preciso con buena masa muscular, y no necesita edad ni altura) en
 * cuanto Toni lo rellena. `grasaPct` es opcional — en su ausencia cae
 * al cálculo de siempre. `sexo`: "hombre" | "mujer".
 */
export function tmb({ pesoKg, alturaCm, edad, sexo, grasaPct = null }) {
  if (grasaPct != null) {
    const masaMagraKg = pesoKg * (1 - grasaPct / 100);
    return 370 + 21.6 * masaMagraKg;
  }
  const base = 10 * pesoKg + 6.25 * alturaCm - 5 * edad;
  return sexo === "mujer" ? base - 161 : base + 5;
}

export function mantenimiento({ pesoKg, alturaCm, edad, sexo, grasaPct, actividad }) {
  return tmb({ pesoKg, alturaCm, edad, sexo, grasaPct }) * factorDe(actividad);
}

/**
 * Objetivo diario completo. `objetivoPct`: negativo para déficit (p.
 * ej. -15), positivo para superávit, 0 para mantenimiento.
 * Proteína a 2 g/kg, grasa al 25% de las kcal objetivo, el resto en
 * carbohidratos — valores de partida, ajustables desde el perfil.
 */
export function objetivoDiario(perfil) {
  const tmbValor = tmb(perfil);
  const mant = mantenimiento(perfil);
  const kcal = Math.round(mant * (1 + (perfil.objetivoPct || 0) / 100));
  const proteina = Math.round(perfil.pesoKg * 2);
  const grasa = Math.round((kcal * 0.25) / 9);
  const carbo = Math.max(0, Math.round((kcal - proteina * 4 - grasa * 9) / 4));
  return { tmb: Math.round(tmbValor), mantenimiento: Math.round(mant), kcal, proteina, grasa, carbo };
}

/** El objetivo se recalcula si no hay uno todavía, o si el peso se ha movido ±3 kg desde el último cálculo. */
export function necesitaRecalculo(pesoActual, pesoCalculo) {
  return pesoCalculo == null || Math.abs(pesoActual - pesoCalculo) >= 3;
}

/**
 * Suma de kcal/proteína/grasa/carbo de las filas de tipo "comida" de
 * un día. Los suplementos no aportan macros, y una "comida libre"
 * (sin macros conocidos — bar, casa de alguien) tampoco cuenta: no se
 * inventa un 0 que falsearía si el día se dio por cumplido.
 */
export function totalesDia(filasDia) {
  return filasDia
    .filter(f => f.tipo === "comida" && !f.sinMacros)
    .reduce((a, f) => ({
      kcal: a.kcal + (f.kcal || 0),
      proteina: a.proteina + (f.proteina || 0),
      grasa: a.grasa + (f.grasa || 0),
      carbo: a.carbo + (f.carbo || 0)
    }), { kcal: 0, proteina: 0, grasa: 0, carbo: 0 });
}

/** Dentro de ±10% de las kcal objetivo y al menos el 90% de la proteína objetivo. */
export function diaCumplido(totales, objetivo) {
  if (!objetivo?.kcal) return false;
  const dentroKcal = Math.abs(totales.kcal - objetivo.kcal) <= objetivo.kcal * 0.1;
  const proteinaOk = totales.proteina >= objetivo.proteina * 0.9;
  return dentroKcal && proteinaOk;
}

/**
 * Racha de días nutricionalmente cumplidos, con el mismo margen de
 * gracia (4 días) que la racha de entreno — mismo criterio, por
 * consistencia. `porDia` es un Map de fecha ("AAAA-MM-DD") a boolean
 * (día cumplido o no), ya calculado por el llamador.
 */
export const DIAS_GRACIA_NUTRICION = 4;

export function rachaNutricion(porDia) {
  const diasCumplidos = [...porDia.entries()].filter(([, ok]) => ok).map(([f]) => f).sort();
  if (!diasCumplidos.length) return { actual: 0, mejor: 0, rota: false };

  let cadena = 1, mejor = 1;
  for (let i = 1; i < diasCumplidos.length; i++) {
    const hueco = Math.round((new Date(diasCumplidos[i]) - new Date(diasCumplidos[i - 1])) / 86400000);
    cadena = hueco <= DIAS_GRACIA_NUTRICION ? cadena + 1 : 1;
    mejor = Math.max(mejor, cadena);
  }
  const hoy = new Date(new Date().toISOString().slice(0, 10));
  const diasDesde = Math.round((hoy - new Date(diasCumplidos[diasCumplidos.length - 1])) / 86400000);
  const rota = diasDesde > DIAS_GRACIA_NUTRICION;
  return { actual: rota ? 0 : cadena, mejor, rota };
}

/**
 * Sugerencias para el picker de "añadir suplemento" — la lista real de
 * lo que se toma vive en el estado del cazador (`E.nutricion.suplementos`),
 * nunca aquí: no hay forma de adivinar qué toma cada cazador.
 */
export const SUPLEMENTOS_SUGERIDOS = [
  { clave: "creatina", nombre: "Creatina" },
  { clave: "betaalanina", nombre: "Beta-alanina" },
  { clave: "omega3", nombre: "Omega-3" },
  { clave: "magnesio", nombre: "Magnesio" },
  { clave: "ashwagandha", nombre: "Ashwagandha" },
  { clave: "vitaminad", nombre: "Vitamina D" },
  { clave: "multivitaminico", nombre: "Multivitamínico" }
];

/* ============================================================
   MENÚS — planificación semanal (spec 010, ampliación "Menús")
   ============================================================ */

export const DIAS_SEMANA = [
  { clave: "lunes", nombre: "Lunes" },
  { clave: "martes", nombre: "Martes" },
  { clave: "miercoles", nombre: "Miércoles" },
  { clave: "jueves", nombre: "Jueves" },
  { clave: "viernes", nombre: "Viernes" },
  { clave: "sabado", nombre: "Sábado" },
  { clave: "domingo", nombre: "Domingo" }
];

export const COMIDAS_DIA = [
  { clave: "desayuno", nombre: "Desayuno" },
  { clave: "comida", nombre: "Comida" },
  { clave: "cena", nombre: "Cena" },
  { clave: "snack", nombre: "Snack" }
];

/** El día de la semana de hoy, en la misma clave que `DIAS_SEMANA`. */
export function diaSemanaDe(fechaISO) {
  const idx = (new Date(fechaISO + "T00:00:00").getDay() + 6) % 7;   // getDay(): 0=domingo
  return DIAS_SEMANA[idx].clave;
}

/**
 * Propuestas para arrancar "Tus platos" si todavía no hay ninguno —
 * igual que los suplementos sugeridos, son un punto de partida para
 * tocar "+", nunca datos reales de Toni ya asumidos. Salen del plan
 * de batch cooking semanal que pasó (pollo/arroz, pavo/merluza/
 * tortilla de cena rotando, overnight oats de desayuno).
 *
 * Macros calculadas a partir de tablas de composición estándar por
 * cada ingrediente en crudo y su cantidad — no son las que traía el
 * prompt (que daba un objetivo de día completo, ≈2050 kcal), que
 * salen algo más altas al sumar plato a plato (≈2300-2350 kcal el
 * día completo con estas raciones). Es la diferencia normal entre un
 * objetivo redondeado y una ración real pesada — se ajustan los
 * gramos o los números aquí en cuanto Toni los mida de verdad; nunca
 * se han forzado para que cuadren con el objetivo.
 *
 * `tipoComida` es una pista para el selector de Menús (qué plato
 * ofrecer en qué franja) — no es una restricción dura.
 * Un plato es una lista de ingredientes + gramos, no un total escrito
 * a mano: así el escáner (que llena el catálogo de `alimentos`, por
 * ingrediente) alimenta también los platos, no solo la comida suelta.
 * El total se calcula con `macrosDePlato()`.
 */
export const PLATOS_SUGERIDOS = [
  { clave: "oats-skyr-platano-huevo", nombre: "Oats con skyr, plátano y huevo",
    tipoComida: "desayuno", precio: 1.5, etiquetas: ["batch cooking", "aguanta en tupper"],
    ingredientes: [
      { alimentoId: "base-avena", gramos: 50 },
      { alimentoId: "base-skyr", gramos: 150 },
      { alimentoId: "base-platano", gramos: 120 },
      { alimentoId: "base-huevo", gramos: 50 }
    ] },
  { clave: "pollo-arroz-verdura", nombre: "Pollo con arroz y verdura",
    tipoComida: "comida", precio: 2.6, etiquetas: ["batch cooking", "aguanta en tupper"],
    ingredientes: [
      { alimentoId: "base-pechuga-pollo", gramos: 230 },
      { alimentoId: "base-arroz-blanco", gramos: 140 },
      { alimentoId: "base-verdura-mixta", gramos: 200 },
      { alimentoId: "base-aove", gramos: 13.5 }
    ] },
  { clave: "manzana", nombre: "Manzana",
    tipoComida: "snack", precio: 0.3, etiquetas: ["sin cocinar", "0 min"],
    ingredientes: [{ alimentoId: "base-manzana", gramos: 150 }] },
  { clave: "tortilla-atun-patata-verdura", nombre: "Tortilla de atún con patata y verdura",
    tipoComida: "cena", precio: 1.9, etiquetas: ["batch cooking", "aguanta en tupper"],
    ingredientes: [
      { alimentoId: "base-huevo", gramos: 150 },
      { alimentoId: "base-atun-natural", gramos: 120 },
      { alimentoId: "base-patata", gramos: 200 },
      { alimentoId: "base-verdura-mixta", gramos: 200 },
      { alimentoId: "base-aove", gramos: 13.5 }
    ] },
  { clave: "pavo-patata-verdura", nombre: "Pavo con patata y verdura",
    tipoComida: "cena", precio: 2.2, etiquetas: ["batch cooking", "aguanta en tupper"],
    ingredientes: [
      { alimentoId: "base-pavo", gramos: 200 },
      { alimentoId: "base-patata", gramos: 200 },
      { alimentoId: "base-verdura-mixta", gramos: 200 },
      { alimentoId: "base-aove", gramos: 13.5 }
    ] },
  { clave: "merluza-patata-verdura", nombre: "Merluza con patata y verdura",
    tipoComida: "cena", precio: 2.5, etiquetas: ["batch cooking", "aguanta en tupper"],
    ingredientes: [
      { alimentoId: "base-merluza", gramos: 200 },
      { alimentoId: "base-patata", gramos: 200 },
      { alimentoId: "base-verdura-mixta", gramos: 200 },
      { alimentoId: "base-aove", gramos: 13.5 }
    ] }
];

/**
 * Catálogo base de ingredientes crudos, por 100 g — de tablas de
 * composición estándar (no de Open Food Facts). Punto de partida para
 * componer platos sin tener que escanear cada cosa primero; se trata
 * igual que cualquier alimento del catálogo, editable si Toni mide
 * distinto.
 */
export const ALIMENTOS_BASE = [
  { id: "base-pechuga-pollo", nombre: "Pechuga de pollo (cruda)", kcal100: 165, proteina100: 31, grasa100: 3.6, carbo100: 0, fuente: "base", categoria: "proteina" },
  { id: "base-arroz-blanco", nombre: "Arroz blanco (crudo)", kcal100: 365, proteina100: 7, grasa100: 0.7, carbo100: 80, fuente: "base", categoria: "hidratos" },
  { id: "base-avena", nombre: "Avena", kcal100: 379, proteina100: 13, grasa100: 7, carbo100: 67, fuente: "base", categoria: "hidratos" },
  { id: "base-skyr", nombre: "Skyr 0%", kcal100: 63, proteina100: 11, grasa100: 0.2, carbo100: 4, fuente: "base", categoria: "proteina" },
  { id: "base-platano", nombre: "Plátano", kcal100: 89, proteina100: 1.1, grasa100: 0.3, carbo100: 23, fuente: "base", categoria: "hidratos" },
  { id: "base-huevo", nombre: "Huevo (cocido)", kcal100: 155, proteina100: 13, grasa100: 11, carbo100: 1.1, fuente: "base", categoria: "proteina" },
  { id: "base-verdura-mixta", nombre: "Verdura mixta (congelada)", kcal100: 35, proteina100: 2.5, grasa100: 0.3, carbo100: 6, fuente: "base", categoria: "verdura" },
  { id: "base-aove", nombre: "Aceite de oliva virgen extra", kcal100: 884, proteina100: 0, grasa100: 100, carbo100: 0, fuente: "base", categoria: "verdura" },
  { id: "base-atun-natural", nombre: "Atún al natural (escurrido)", kcal100: 116, proteina100: 26, grasa100: 1, carbo100: 0, fuente: "base", categoria: "proteina" },
  { id: "base-pavo", nombre: "Solomillo de pavo (crudo)", kcal100: 104, proteina100: 24, grasa100: 1, carbo100: 0, fuente: "base", categoria: "proteina" },
  { id: "base-merluza", nombre: "Merluza (cruda)", kcal100: 86, proteina100: 17, grasa100: 1.3, carbo100: 0, fuente: "base", categoria: "proteina" },
  { id: "base-patata", nombre: "Patata (cruda)", kcal100: 77, proteina100: 2, grasa100: 0.1, carbo100: 17, fuente: "base", categoria: "hidratos" },
  { id: "base-manzana", nombre: "Manzana", kcal100: 52, proteina100: 0.3, grasa100: 0.2, carbo100: 14, fuente: "base", categoria: "hidratos" }
];

export const CATEGORIAS_COMPRA = [
  { clave: "proteina", nombre: "Proteína" },
  { clave: "hidratos", nombre: "Hidratos" },
  { clave: "verdura", nombre: "Verdura y grasa" },
  { clave: "otros", nombre: "Otros" }
];

/**
 * Total de un plato a partir de sus ingredientes (gramos) y el
 * catálogo de alimentos disponible (`ALIMENTOS_BASE` + los propios de
 * Toni, escaneados o manuales). Un ingrediente cuyo alimento ya no
 * está en el catálogo (se borró) simplemente no suma — no rompe el
 * cálculo del resto.
 */
export function macrosDePlato(ingredientes, catalogo) {
  return (ingredientes || []).reduce((a, ing) => {
    const al = catalogo.find(x => x.id === ing.alimentoId);
    if (!al) return a;
    const f = ing.gramos / 100;
    return {
      kcal: a.kcal + Math.round((al.kcal100 || 0) * f),
      proteina: a.proteina + Math.round((al.proteina100 || 0) * f),
      grasa: a.grasa + Math.round((al.grasa100 || 0) * f),
      carbo: a.carbo + Math.round((al.carbo100 || 0) * f)
    };
  }, { kcal: 0, proteina: 0, grasa: 0, carbo: 0 });
}

/* ============================================================
   COMPOSICIÓN CORPORAL (spec 011)
   ============================================================ */

/**
 * Cruza el historial de peso con el de % de grasa — casi nunca
 * coinciden en fecha — para estimar masa grasa/magra en cada fecha de
 * peso. Usa el % de grasa real más cercano en el tiempo, nunca uno
 * calculado a medias: si el dato más próximo es de hace tres semanas,
 * se usa ese, no se inventa un punto intermedio.
 * Sin historial de grasa, no hay nada que cruzar: devuelve `[]`.
 */
export function composicionCorporal(historialPeso, historialGrasa) {
  if (!historialGrasa?.length || !historialPeso?.length) return [];
  return historialPeso.map(p => {
    let mejor = historialGrasa[0], mejorDist = Math.abs(new Date(p.f) - new Date(historialGrasa[0].f));
    for (const g of historialGrasa) {
      const dist = Math.abs(new Date(p.f) - new Date(g.f));
      if (dist < mejorDist) { mejor = g; mejorDist = dist; }
    }
    const masaGrasaKg = +(p.kg * mejor.pct / 100).toFixed(1);
    return { f: p.f, pesoKg: p.kg, grasaPct: mejor.pct, masaGrasaKg, masaMagraKg: +(p.kg - masaGrasaKg).toFixed(1) };
  });
}

/* ============================================================
   LISTA DE LA COMPRA (bloque B, resto de "contenido")
   ============================================================ */

/**
 * Suma los ingredientes de los platos planificados esta semana
 * (contando cuántas veces se repite cada uno), agrupados por
 * categoría. El precio total es la suma de los precios por ración de
 * los platos planificados — no hay precio por ingrediente suelto, así
 * que no se inventa uno; el total ya avisa de que es estimado.
 */
export function listaCompra(menuSemanal, platos, catalogo) {
  const usosPlato = new Map();
  for (const dia of Object.values(menuSemanal || {})) {
    for (const claveP of Object.values(dia)) usosPlato.set(claveP, (usosPlato.get(claveP) || 0) + 1);
  }

  const gramosPorIngrediente = new Map();
  let precioTotal = 0;
  for (const [claveP, veces] of usosPlato) {
    const plato = platos.find(p => p.clave === claveP);
    if (!plato) continue;
    precioTotal += (plato.precio || 0) * veces;
    for (const ing of plato.ingredientes || []) {
      gramosPorIngrediente.set(ing.alimentoId, (gramosPorIngrediente.get(ing.alimentoId) || 0) + ing.gramos * veces);
    }
  }

  const filas = [...gramosPorIngrediente.entries()].map(([id, gramos]) => {
    const al = catalogo.find(a => a.id === id);
    return { alimentoId: id, nombre: al?.nombre ?? id, categoria: al?.categoria ?? "otros", gramos: Math.round(gramos) };
  });

  return { filas, precioTotal: +precioTotal.toFixed(2) };
}

/** "1620 g" -> "1,6 kg"; deja los gramos tal cual por debajo de 1 kg. */
export function formatoCantidad(gramos) {
  return gramos >= 1000 ? `${(gramos / 1000).toFixed(1).replace(".", ",")} kg` : `${gramos} g`;
}

/* ============================================================
   CAMBIAR COMIDA (bloque B, resto de "contenido")
   ============================================================ */

/**
 * Platos "parecidos" a uno dado: mismo tipo de comida (si alguno de
 * los dos lo tiene definido) y dentro de ±15% de sus kcal — nunca
 * cualquier plato del catálogo, aunque esté guardado.
 */
export function platosParecidos(plato, todosPlatos, catalogo) {
  const base = macrosDePlato(plato.ingredientes, catalogo);
  if (!base.kcal) return [];
  return todosPlatos
    .filter(p => p.clave !== plato.clave)
    .filter(p => !plato.tipoComida || !p.tipoComida || p.tipoComida === plato.tipoComida)
    .map(p => ({ plato: p, macros: macrosDePlato(p.ingredientes, catalogo) }))
    .filter(({ macros }) => Math.abs(macros.kcal - base.kcal) <= base.kcal * 0.15);
}
