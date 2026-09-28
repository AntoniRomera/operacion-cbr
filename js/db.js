/* ============================================================
   BASE DE DATOS LOCAL
   IndexedDB con seis almacenes. Todo vive en el teléfono: no hay
   servidor, ni cuenta, ni nada que viaje por la red.

     cazadores → los perfiles (nombre, PIN, peso corporal)
     estado    → una fila por cazador: semana, pesos, sesión a medias
     historial → una fila por serie, con índice por cazador
     logros    → qué ha desbloqueado cada uno y cuándo
     alimentos → catálogo de comida (escaneada o manual), compartido
     nutricion → una fila por comida o toma de suplemento registrada

   Si IndexedDB no está disponible (Safari en navegación privada)
   el mismo interfaz funciona sobre localStorage. Por eso hay dos
   motores y una sola API encima.
   ============================================================ */

const NOMBRE = "sistema", VERSION = 2;

const ESQUEMA = {
  cazadores: { clave: "id",      auto: true },
  estado:    { clave: "cazador" },
  historial: { clave: "id",      auto: true, indices: { porCazador: "cazador" } },
  logros:    { clave: ["cazador", "logro"] },
  alimentos: { clave: "id" },
  nutricion: { clave: "id",      auto: true, indices: { porCazador: "cazador" } }
};

/* ---------- motor IndexedDB ---------- */
function motorIDB() {
  let dbp = null;
  const abrir = () => dbp || (dbp = new Promise((ok, ko) => {
    const rq = indexedDB.open(NOMBRE, VERSION);
    rq.onupgradeneeded = () => {
      const db = rq.result;
      for (const [nombre, cfg] of Object.entries(ESQUEMA)) {
        if (db.objectStoreNames.contains(nombre)) continue;
        const st = db.createObjectStore(nombre, { keyPath: cfg.clave, autoIncrement: !!cfg.auto });
        for (const [idx, campo] of Object.entries(cfg.indices || {})) st.createIndex(idx, campo);
      }
    };
    rq.onsuccess = () => ok(rq.result);
    rq.onerror = () => ko(rq.error);
    rq.onblocked = () => ko(new Error("Hay otra pestaña con la app abierta"));
  }));

  const pedir = r => new Promise((ok, ko) => { r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
  const cerrar = t => new Promise((ok, ko) => { t.oncomplete = () => ok(); t.onerror = () => ko(t.error); t.onabort = () => ko(t.error); });

  const leer = async (almacen, fn) => {
    const db = await abrir();
    return pedir(fn(db.transaction(almacen, "readonly").objectStore(almacen)));
  };
  const escribir = async (almacen, fn) => {
    const db = await abrir();
    const t = db.transaction(almacen, "readwrite");
    const r = fn(t.objectStore(almacen));
    await cerrar(t);
    return r && r.result;
  };

  return {
    nombre: "IndexedDB",
    iniciar: () => abrir(),
    get:    (a, k)      => leer(a, s => s.get(k)),
    todos:  (a, i, v)   => leer(a, s => (i ? s.index(i).getAll(v) : s.getAll())),
    contar: (a, i, v)   => leer(a, s => (i ? s.index(i).count(v) : s.count())),
    poner:  (a, v)      => escribir(a, s => s.put(v)),
    anadir: (a, v)      => escribir(a, s => s.add(v)),
    /* `escribir` solo lee un `.result` — con varias filas hacen falta
       varios, uno por request. Sin esto, quien llama nunca sabe el id
       real que asignó IndexedDB y cualquier borrado inmediato de esa
       misma fila (en la misma sesión, antes de releer de la base)
       falla contra un id `undefined`, sin avisar. */
    anadirVarios: async (a, vs) => {
      const db = await abrir();
      const t = db.transaction(a, "readwrite");
      const reqs = vs.map(v => t.objectStore(a).add(v));
      await cerrar(t);
      return reqs.map(r => r.result);
    },
    borrar: (a, k)      => escribir(a, s => s.delete(k)),
    vaciar: (a)         => escribir(a, s => s.clear())
  };
}

/* ---------- motor localStorage ---------- */
function motorLS() {
  const raiz = a => `sistema:${a}`;
  const leer = a => { try { return JSON.parse(localStorage.getItem(raiz(a)) || "[]"); } catch (e) { return []; } };
  const grabar = (a, filas) => localStorage.setItem(raiz(a), JSON.stringify(filas));
  const claveDe = (a, v) => {
    const c = ESQUEMA[a].clave;
    return Array.isArray(c) ? c.map(k => v[k]).join(" ") : v[c];
  };
  const igual = (a, v, k) => String(claveDe(a, v)) === String(Array.isArray(k) ? k.join(" ") : k);
  const siguienteId = a => {
    const n = +(localStorage.getItem(raiz(a) + ":seq") || 0) + 1;
    localStorage.setItem(raiz(a) + ":seq", n);
    return n;
  };
  const meter = (a, v) => {
    const cfg = ESQUEMA[a], filas = leer(a);
    if (cfg.auto && v[cfg.clave] == null) v = { ...v, [cfg.clave]: siguienteId(a) };
    const i = filas.findIndex(f => igual(a, f, claveDe(a, v)));
    if (i >= 0) filas[i] = v; else filas.push(v);
    grabar(a, filas);
    return v[Array.isArray(cfg.clave) ? cfg.clave[0] : cfg.clave];
  };

  const api = {
    nombre: "localStorage",
    iniciar: async () => {},
    get:    async (a, k)    => leer(a).find(f => igual(a, f, k)) || undefined,
    todos:  async (a, i, v) => { const f = leer(a); return i == null || v === undefined ? f : f.filter(x => x[ESQUEMA[a].indices[i]] === v); },
    contar: async (a, i, v) => (await api.todos(a, i, v)).length,
    poner:  async (a, v)    => meter(a, v),
    anadir: async (a, v)    => meter(a, v),
    anadirVarios: async (a, vs) => vs.map(v => meter(a, v)),
    borrar: async (a, k)    => grabar(a, leer(a).filter(f => !igual(a, f, k))),
    vaciar: async (a)       => grabar(a, [])
  };
  return api;
}

let motor = null;

/** Elige motor una sola vez. Devuelve su nombre, para poder enseñarlo. */
export async function iniciar() {
  if (motor) return motor.nombre;
  if (self.indexedDB) {
    try { motor = motorIDB(); await motor.iniciar(); return motor.nombre; }
    catch (e) { console.warn("IndexedDB no disponible:", e.message); }
  }
  motor = motorLS();
  return motor.nombre;
}
export const motorActual = () => (motor ? motor.nombre : "sin iniciar");

/* ---------- PIN ----------
   Se guarda el resumen, no el PIN. Que quede claro: esto no protege
   nada contra alguien con el móvil en la mano y ganas de mirar; solo
   evita que otro entre por descuido y te ensucie el historial. */
async function resumir(pin) {
  if (!pin) return null;
  const txt = "sistema:" + pin;
  if (!self.crypto?.subtle) return "sin-cifrar:" + txt;
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(txt));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}

/* ---------- cazadores ---------- */
export const cazadores = {
  listar: () => motor.todos("cazadores"),
  get: id => motor.get("cazadores", id),

  async crear({ nombre, pin = "", pesoCorporal = 80 }) {
    const id = await motor.anadir("cazadores", {
      nombre: nombre.trim().slice(0, 24) || "Cazador",
      pin: await resumir(pin),
      pesoCorporal: +pesoCorporal || 80,
      creado: new Date().toISOString()
    });
    await motor.poner("estado", nuevoEstado(id));
    return id;
  },

  async comprobarPin(id, pin) {
    const c = await motor.get("cazadores", id);
    if (!c?.pin) return true;                       // sin PIN, entra directo
    return c.pin === await resumir(pin);
  },

  async actualizar(id, campos) {
    const c = await motor.get("cazadores", id);
    if (!c) return;
    if (campos.pin !== undefined) campos.pin = await resumir(campos.pin);
    await motor.poner("cazadores", { ...c, ...campos });
  },

  async borrar(id) {
    const filas = await motor.todos("historial", "porCazador", id);
    for (const f of filas) await motor.borrar("historial", f.id);
    const filasNutricion = await motor.todos("nutricion", "porCazador", id);
    for (const f of filasNutricion) await motor.borrar("nutricion", f.id);
    for (const l of await logros.lista(id)) await motor.borrar("logros", [id, l.logro]);
    await motor.borrar("estado", id);
    await motor.borrar("cazadores", id);
  }
};

export const nuevoEstado = cazador => ({
  cazador, semana: 1, pesos: {}, listos: {}, sesion: {}, tecnicas: [], xp: 0, programa: "ppl3"
});

/* ---------- estado ---------- */
export const estado = {
  async cargar(cazador) {
    return (await motor.get("estado", cazador)) || nuevoEstado(cazador);
  },
  guardar(e) {
    return motor.poner("estado", JSON.parse(JSON.stringify(e)));
  }
};

/* ---------- historial ---------- */
export const historial = {
  anadir(filas) { return filas.length ? motor.anadirVarios("historial", filas.map(f => ({ ...f }))) : null; },
  lista(cazador) { return motor.todos("historial", "porCazador", cazador); },
  contar(cazador) { return motor.contar("historial", "porCazador", cazador); },
  /* Para arreglar una serie mal metida sin restaurar una copia entera. */
  guardar(fila) { return motor.poner("historial", { ...fila }); },
  borrar(id) { return motor.borrar("historial", id); },
  async vaciar(cazador) {
    for (const f of await motor.todos("historial", "porCazador", cazador)) await motor.borrar("historial", f.id);
  }
};

/* ---------- alimentos ----------
   Catálogo de comida: escaneada (Open Food Facts) o manual. Es un
   dato del alimento, no de quién se lo come — compartido entre
   cazadores del mismo aparato, sin campo `cazador`. */
export const alimentos = {
  get(id) { return motor.get("alimentos", id); },
  listar() { return motor.todos("alimentos"); },
  guardar(a) { return motor.poner("alimentos", { ...a }); },
  borrar(id) { return motor.borrar("alimentos", id); }
};

/* ---------- nutrición ----------
   Una fila por comida o toma de suplemento registrada — mismo patrón
   que historial, pero en su propio almacén: son datos de comida, no
   de series de un ejercicio. */
export const nutricion = {
  anadir(filas) { return filas.length ? motor.anadirVarios("nutricion", filas.map(f => ({ ...f }))) : null; },
  lista(cazador) { return motor.todos("nutricion", "porCazador", cazador); },
  guardar(fila) { return motor.poner("nutricion", { ...fila }); },
  borrar(id) { return motor.borrar("nutricion", id); },
  async vaciar(cazador) {
    for (const f of await motor.todos("nutricion", "porCazador", cazador)) await motor.borrar("nutricion", f.id);
  }
};

/* ---------- logros ---------- */
export const logros = {
  async lista(cazador) {
    return (await motor.todos("logros")).filter(l => l.cazador === cazador);
  },
  desbloquear(cazador, logro) {
    return motor.poner("logros", { cazador, logro, fecha: new Date().toISOString() });
  }
};

/* ---------- copia de seguridad ---------- */
export const copia = {
  async exportar(cazador) {
    const c = await motor.get("cazadores", cazador);
    return {
      app: "sistema", v: 4, exportado: new Date().toISOString(),
      cazador: { nombre: c.nombre, pesoCorporal: c.pesoCorporal, creado: c.creado },
      estado: await estado.cargar(cazador),
      historial: (await historial.lista(cazador)).map(({ id, cazador: _, ...r }) => r),
      logros: (await logros.lista(cazador)).map(({ cazador: _, ...r }) => r),
      /* Catálogo de comida: compartido entre cazadores, se lleva entero
         igualmente — así la copia es autosuficiente por su cuenta. */
      alimentos: await alimentos.listar(),
      nutricion: (await nutricion.lista(cazador)).map(({ id, cazador: _, ...r }) => r)
    };
  },

  /**
   * Casi idéntica a una que ya está: mismo día, ejercicio, peso, series
   * y reps, con menos de 15 minutos de diferencia en el ts. El estado
   * (semana, pesos, XP...) no tiene un "duplicado" con sentido: ese se
   * reemplaza siempre por el del fichero, solo el historial se fusiona.
   */
  async esDuplicado(existentes, r) {
    const t = new Date(r.ts || r.f).getTime();
    return existentes.some(e =>
      e.f === r.f && e.ej === r.ej && e.kg === r.kg && e.series === r.series && e.reps === r.reps
      && Math.abs(new Date(e.ts || e.f).getTime() - t) < 15 * 60000
    );
  },

  /** Mismo criterio que `esDuplicado`, pero para una fila de nutrición
      (comida o suplemento): mismo día, tipo y nombre, kcal iguales, a
      menos de 15 min de diferencia. */
  async esDuplicadoNutricion(existentes, r) {
    const t = new Date(r.ts || r.f).getTime();
    return existentes.some(e =>
      e.f === r.f && e.tipo === r.tipo && e.nombre === r.nombre && (e.kcal || 0) === (r.kcal || 0)
      && Math.abs(new Date(e.ts || e.f).getTime() - t) < 15 * 60000
    );
  },

  /** Cuántas filas del fichero (historial o nutrición) parecen ya estar guardadas, sin escribir nada. */
  async contarDuplicados(cazador, datos) {
    if (!datos || datos.app !== "sistema") return 0;
    let n = 0;
    if (datos.historial?.length) {
      const existentes = await historial.lista(cazador);
      for (const r of datos.historial) if (await copia.esDuplicado(existentes, r)) n++;
    }
    if (datos.nutricion?.length) {
      const existentesNutri = await nutricion.lista(cazador);
      for (const r of datos.nutricion) if (await copia.esDuplicadoNutricion(existentesNutri, r)) n++;
    }
    return n;
  },

  /**
   * Añade los datos del fichero a los que ya hay — nunca borra el
   * historial ni el registro de nutrición existentes. Las filas casi
   * idénticas a una que ya está se omiten salvo que se pida lo
   * contrario explícitamente. El catálogo de `alimentos` es
   * compartido: se sube (upsert por id), nunca se duplica.
   */
  async importar(cazador, datos, { incluirDuplicados = false } = {}) {
    if (!datos || (datos.app !== "sistema" && datos.app !== "operacion-cbr"))
      throw new Error("Ese archivo no es una copia de esta app");

    if (datos.app === "operacion-cbr") return importarAntiguo(cazador, datos);

    const existentes = await historial.lista(cazador);
    const entrantes = (datos.historial || []).map(r => ({ ...r, cazador }));
    let duplicados = 0;
    const nuevas = [];
    for (const r of entrantes) {
      const dup = await copia.esDuplicado(existentes, r);
      if (dup) duplicados++;
      if (!dup || incluirDuplicados) nuevas.push(r);
    }

    const existentesNutri = await nutricion.lista(cazador);
    const entrantesNutri = (datos.nutricion || []).map(r => ({ ...r, cazador }));
    const nuevasNutri = [];
    for (const r of entrantesNutri) {
      const dup = await copia.esDuplicadoNutricion(existentesNutri, r);
      if (dup) duplicados++;
      if (!dup || incluirDuplicados) nuevasNutri.push(r);
    }

    await estado.guardar({ ...datos.estado, cazador });
    await historial.anadir(nuevas);
    await nutricion.anadir(nuevasNutri);
    for (const a of datos.alimentos || []) await alimentos.guardar(a);
    for (const l of datos.logros || []) await motor.poner("logros", { ...l, cazador });
    return { anadidas: nuevas.length + nuevasNutri.length, duplicados };
  }
};

/* ---------- rescate de la versión anterior ----------
   La primera versión de la app guardaba en la base "operacion-cbr",
   sin cazadores. Si sigue ahí, se ofrece traer sus series. */
async function importarAntiguo(cazador, datos) {
  const filas = (datos.historial || []).map(r => ({
    cazador, f: r.f, semana: r.sem, dia: r.dia,
    ej: null, nombre: r.ej, kg: r.kg, series: r.series, reps: r.reps,
    volumen: (r.kg || 0) * (r.series || 0) * (r.reps || 0)
  }));
  await historial.anadir(filas);
  const e = await estado.cargar(cazador);
  await estado.guardar({ ...e, semana: datos.estado?.week || 1, pesos: datos.estado?.weights || {} });
  return filas.length;
}

/** ¿Queda algo de la versión vieja por rescatar? */
export async function hayDatosAntiguos() {
  try {
    if (!indexedDB.databases) return false;
    const bases = await indexedDB.databases();
    return bases.some(b => b.name === "operacion-cbr");
  } catch (e) { return false; }
}

export function rescatarAntiguos(cazador) {
  return new Promise(ok => {
    const rq = indexedDB.open("operacion-cbr");
    rq.onerror = () => ok(0);
    rq.onsuccess = async () => {
      const db = rq.result;
      try {
        const t = db.transaction(["estado", "historial"], "readonly");
        const est = await new Promise(r => { const q = t.objectStore("estado").get("estado"); q.onsuccess = () => r(q.result); q.onerror = () => r(null); });
        const his = await new Promise(r => { const q = t.objectStore("historial").getAll(); q.onsuccess = () => r(q.result || []); q.onerror = () => r([]); });
        db.close();
        ok(await importarAntiguo(cazador, { estado: est, historial: his }));
      } catch (e) { db.close(); ok(0); }
    };
  });
}
