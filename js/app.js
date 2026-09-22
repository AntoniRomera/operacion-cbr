/* ============================================================
   SISTEMA · interfaz
   Cuatro pantallas: la puerta (elegir o crear cazador), la misión
   del día, los logros y el perfil. Todo se pinta con plantillas de
   texto y un único manejador de clics delegado en el documento.
   ============================================================ */

import { PROGRAMAS, PROGRAMA_DEFECTO, nucleo, bloques, dia as diaRutina, totalSeries } from "../datos/rutina.js";
import { EJERCICIOS, ejercicio } from "../datos/ejercicios.js";
import { MOVILIDAD, XP_MOVILIDAD, esSemanaMovilidad } from "../datos/movilidad.js";
import { CARDIO, XP_CARDIO } from "../datos/cardio.js";
import * as N from "../datos/nutricion.js";
import { LOGO, INSIGNIAS, bloqueDe, rutasSVG } from "../datos/insignias.js";
import { LOGROS, ORDEN_RANGO, COLOR_RANGO } from "../datos/logros.js";
import * as equipo from "../datos/equipo.js";
import { GLOSARIO_MUSCULOS, explicacionDe } from "../datos/musculos.js";
import * as DB from "./db.js";
import * as P from "./progreso.js";
import * as OFF from "./openfoodfacts.js";
import { buildFigure, animate, stopAnim } from "./figuras.js";

/* ---------- estado en memoria ---------- */
let cazador = null;          // perfil activo
let E = null;                // su estado: semana, pesos, sesión a medias
let filas = [];              // historial ya cargado
let filasNutricion = [];     // registro de comida/suplementos ya cargado
let alimentosDB = [];        // catálogo escaneado/manual de Toni (sin los de datos/nutricion.js:ALIMENTOS_BASE)
let desbloqueados = [];      // ids de logros conseguidos
let vista = "puerta";        // puerta · misiones · dia · cardio · nutricion · menus · logros · historial · perfil · manual
let diaActivo = 1;
let resultadoSesion = null;  // tarjeta de la última sesión cerrada
let tecnicaAbierta = null;
let cambioAbierto = null;        // ejercicio con el panel de cambio abierto
let menuCeldaAbierta = null;     // "dia|comida" con el selector de plato abierto en Menús
let menuDiaAbierto = null;       // qué día de la semana está desplegado en Menús
let nuevoPlatoTipo = null;       // tipo de comida elegido en el formulario de "guardar plato"
let escaneando = false;          // cámara abierta buscando un código de barras
let streamCamara = null;
let resultadosBusquedaAlimento = [];   // resultado de buscar en el catálogo de alimentos por nombre
let buscadorDestino = "comida";        // "comida" (Nutrición) | "ingrediente" (Menús, plato en construcción)
let platoDraftIngredientes = [];       // ingredientes del plato que se está montando en Menús
let guiaBatchAbierta = false;          // guía de batch cooking del domingo, desplegada o no
let cambiarComidaAbierto = null;       // qué franja de "Hoy toca" tiene el selector de alternativas abierto
let panelesAbiertos = new Set();       // paneles colapsables abiertos en Nutrición/Menús (spec 010, mejora UI)
let perfilAbierto = null;              // qué tarjeta de Perfil está abierta — una sola a la vez, con botón atrás
let cambioTemporal = true;       // el cambio vale solo para hoy
let pesoBorrador = null;         // peso corporal a medio teclear
let grasaBorrador = null;        // % de grasa corporal a medio teclear
let cron = null;                 // cronómetro de isométricos en marcha
let candado = null;              // bloqueo de apagado de pantalla
let ejercicioActivo = null;      // ficha de ejercicio abierta
let puntoSel = { tipo: null, i: null };   // punto tocado en una gráfica
let editando = null;             // id de la fila del historial en edición
let semanasAbiertas = null;      // Set<número de semana> desplegadas en Historial
let sesionAbierta = null;        // clave "fecha|día" de la sesión abierta en Historial
let fichaTab = "hacer";          // pestaña activa en la ficha de ejercicio (spec 008)
let verMusculos = false;         // false = muñeco animado, true = silueta resaltada
let musculoAbierto = null;       // qué chip de músculo se está explicando ahora mismo
let motor = "";

const CLAVE_SESION = "sistema:cazador";
const CLAVE_TEMA = "sistema:tema";

/* ---------- tema ----------
   El <head> ya resolvió el tema antes de pintar; aquí solo se cambia.
   Las gráficas llevan los colores dentro del SVG, así que al cambiar
   hay que repintar: no basta con que el CSS se actualice solo. */
const temaGuardado = () => { try { return localStorage.getItem(CLAVE_TEMA) || "auto"; } catch (e) { return "auto"; } };
const temaDelMovil = () => matchMedia("(prefers-color-scheme: light)").matches ? "claro" : "oscuro";

function aplicarTema(preferencia) {
  const tema = preferencia === "auto" ? temaDelMovil() : preferencia;
  document.documentElement.dataset.tema = tema;
  const meta = $("metaTema");
  if (meta) meta.content = tema === "claro" ? "#EEF2F7" : "#080B11";
}

function ponerTema(preferencia) {
  try { localStorage.setItem(CLAVE_TEMA, preferencia); } catch (e) {}
  aplicarTema(preferencia);
  pintar();
}

matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => {
  if (temaGuardado() === "auto") { aplicarTema("auto"); pintar(); }
});

/** Color resuelto de una variable, para meterlo en atributos SVG. */
const colorDe = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

/* ---------- utilidades ---------- */
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/** Logo del Sistema: mismo SVG en cabecera, puerta y tarjeta. */
const logoSVG = (tam, color = "currentColor") =>
  `<svg viewBox="${LOGO.viewBox}" width="${tam}" height="${tam}" aria-hidden="true">${rutasSVG(LOGO.rutas, LOGO.trazo, color)}</svg>`;

/** Insignia de bloque con su aro de rango; el rango sale como letra al lado. */
const insigniaSVG = (bloque, tam, colorRango) => {
  const ins = INSIGNIAS[bloque];
  if (!ins) return "";
  return `<svg viewBox="0 0 200 200" width="${tam}" height="${tam}" aria-hidden="true">
      <circle cx="100" cy="100" r="92" fill="none" stroke="${colorRango}" stroke-width="6" stroke-dasharray="14 9"/>
      ${rutasSVG(ins.rutas, ins.trazo, "currentColor")}
    </svg>`;
};
const mmss = s => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
const miles = n => n.toLocaleString("es-ES");
const hoy = () => new Date().toISOString().slice(0, 10);

/* Cuánto se tarda en un bloque, para decidir si cabe en el hueco que
   tienes. Cada serie son unos 40 s de trabajo más su descanso, y en los
   unilaterales el trabajo va doble. Redondeado hacia arriba a cinco. */
function estimaMinutos(lista) {
  const seg = lista.reduce((a, e) =>
    a + e.series * (e.descanso + 40 * (e.unilateral ? 2 : 1)), 0);
  return Math.max(5, Math.round(seg / 300) * 5);
}

/** El programa que sigue el cazador, con el de defecto como red de seguridad. */
const programaActivo = () => PROGRAMAS[E?.programa] || PROGRAMAS[PROGRAMA_DEFECTO];

/** El inventario del cazador; si todavía no ha tocado nada (spec 007 es
    nueva), cae en lo que Toni tiene hoy. No se persiste hasta que edite
    algo — leer nunca escribe. */
const equipoActivo = () => E?.equipo || equipo.configDefecto();

/** Si hay equipo suficiente activo para ofrecer este ejercicio ahora mismo. */
const disponible = ej => equipo.equipoDisponible(equipoActivo(), ej);

/** Catálogo completo de alimentos para calcular platos: los base
    (`datos/nutricion.js`) más los propios de Toni (escaneados o
    manuales) — los suyos ganan si repiten id. */
const catalogoAlimentos = () => {
  const propios = new Map(alimentosDB.map(a => [a.id, a]));
  return [...N.ALIMENTOS_BASE.filter(a => !propios.has(a.id)), ...alimentosDB];
};

/** El perfil nutricional y su objetivo calculado; se persiste solo al
    guardar cambios — leer nunca escribe. */
function nutricionEstado() {
  const n = E.nutricion || (E.nutricion = { perfil: {}, objetivo: null, pesoCalculo: null, suplementos: [], platos: [], menuSemanal: {} });
  if (!n.perfil) n.perfil = {};
  if (!n.suplementos) n.suplementos = [];
  if (!n.platos) n.platos = [];
  if (!n.menuSemanal) n.menuSemanal = {};
  return n;
}

/**
 * Recalcula el objetivo diario si hace falta (primera vez con datos
 * suficientes, o el peso se ha movido ±3 kg desde el último cálculo).
 * Nunca inventa edad, altura o sexo: si faltan, no hace nada. Devuelve
 * si tocó el estado, para que quien llama decida si hay que guardar.
 */
function recalcularNutricionSiHaceFalta() {
  const nutri = nutricionEstado();
  const peso = pesoActual();
  /* El % de grasa viene del historial (E.grasaCorporal), no de un
     campo aparte que haya que mantener sincronizado a mano. */
  const perfil = { ...nutri.perfil, grasaPct: grasaActual() ?? undefined };
  if (!N.datosSuficientes({ ...perfil, pesoKg: peso })) return false;
  if (!N.necesitaRecalculo(peso, nutri.pesoCalculo)) return false;
  nutri.objetivo = N.objetivoDiario({ ...perfil, pesoKg: peso });
  nutri.pesoCalculo = peso;
  return true;
}

/** Cada día registrado, cumplido o no, contra el objetivo actual — no
    se guarda un objetivo distinto por día pasado, se compara con el
    de ahora mismo. */
function porDiaNutricionCumplido() {
  const nutri = nutricionEstado();
  const porDia = new Map();
  for (const f of filasNutricion) {
    if (!porDia.has(f.f)) porDia.set(f.f, []);
    porDia.get(f.f).push(f);
  }
  const resultado = new Map();
  for (const [f, filasDia] of porDia) resultado.set(f, N.diaCumplido(N.totalesDia(filasDia), nutri.objetivo));
  return resultado;
}

/** Filas de nutrición de hoy, comida y suplementos. */
const nutricionHoy = () => filasNutricion.filter(f => f.f === hoy());

/* ---------- captura de alimentos: nombre, código a mano o escáner ----------
   `buscadorDestino` decide qué hacer al elegir un resultado: rellenar
   el formulario de comida suelta ("comida") o añadirlo como
   ingrediente al plato en construcción en Menús ("ingrediente"). */
function prellenarComidaSuelta(alimento) {
  if ($("nutriComNombre")) $("nutriComNombre").value = alimento.nombre;
  if ($("nutriComKcal")) $("nutriComKcal").value = alimento.kcal100 ?? "";
  if ($("nutriComProteina")) $("nutriComProteina").value = alimento.proteina100 ?? "";
  if ($("nutriComGrasa")) $("nutriComGrasa").value = alimento.grasa100 ?? "";
  if ($("nutriComCarbo")) $("nutriComCarbo").value = alimento.carbo100 ?? "";
}

function elegirAlimento(alimento) {
  resultadosBusquedaAlimento = [];
  if (buscadorDestino === "ingrediente") {
    const gramos = +($("nutriIngGramos")?.value || 0);
    if (gramos <= 0) { aviso("Pon los gramos antes de elegir el ingrediente"); return; }
    platoDraftIngredientes.push({ alimentoId: alimento.id, nombre: alimento.nombre, gramos });
    if ($("nutriIngGramos")) $("nutriIngGramos").value = "";
    repintarQuieto();
  } else {
    repintarQuieto();
    prellenarComidaSuelta(alimento);
    aviso(`${alimento.nombre}${alimento.marca ? " · " + alimento.marca : ""} — revisa los macros y pon los gramos`);
  }
}

async function buscarYUsarAlimento(codigo) {
  try {
    let alimento = catalogoAlimentos().find(a => a.id === codigo);
    if (!alimento) {
      const encontrado = await OFF.buscarProducto(codigo);
      if (!encontrado) { aviso("No se encontró ese código — puedes meterlo a mano"); return; }
      alimento = encontrado;
      await DB.alimentos.guardar(alimento);
      alimentosDB.push(alimento);
    }
    elegirAlimento(alimento);
  } catch (e) {
    aviso(e.message || "No se pudo consultar Open Food Facts");
  }
}

async function iniciarEscaner() {
  if (escaneando) return;
  if (!("BarcodeDetector" in window)) { aviso("Este navegador no soporta escanear — escribe el código a mano"); return; }
  escaneando = true;
  repintarQuieto();
  try {
    streamCamara = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    const video = $("videoEscaner");
    video.srcObject = streamCamara;
    await video.play();
    const detector = new BarcodeDetector({ formats: ["ean_13", "ean_8"] });
    const bucle = async () => {
      if (!escaneando) return;
      try {
        const codigos = await detector.detect(video);
        if (codigos.length) { const c = codigos[0].rawValue; pararEscaner(); await buscarYUsarAlimento(c); return; }
      } catch (e) { /* frame sin código legible esta vez, se sigue */ }
      if (escaneando) requestAnimationFrame(bucle);
    };
    bucle();
  } catch (e) {
    escaneando = false;
    aviso("No se pudo abrir la cámara: " + (e.message || "sin permiso"));
    repintarQuieto();
  }
}

function pararEscaner() {
  escaneando = false;
  streamCamara?.getTracks().forEach(t => t.stop());
  streamCamara = null;
  repintarQuieto();
}

/** Buscador reutilizable: nombre (catálogo propio), código a mano, o cámara si el navegador la soporta. */
function buscadorAlimentoHTML() {
  const conCamara = "BarcodeDetector" in window;
  if (escaneando) {
    return `<div class="suelta">
      <video id="videoEscaner" playsinline muted style="width:100%;border-radius:8px;background:#000"></video>
      <button class="btn btn--fantasma" id="pararEscaner" style="margin-top:8px">Cancelar</button>
    </div>`;
  }
  return `
    <label class="campo"><span>Buscar en tu catálogo</span><input id="nutriBuscarNombre" type="text" maxlength="40" placeholder="pollo, arroz..."></label>
    ${resultadosBusquedaAlimento.length ? `<div class="equipo__pesos">
      ${resultadosBusquedaAlimento.map(a => `<button class="mini" data-usar-alimento="${esc(a.id)}">${esc(a.nombre)}</button>`).join("")}
    </div>` : ""}
    <label class="campo"><span>Código de barras</span><input id="nutriCodigoBarras" type="text" inputmode="numeric" maxlength="13" placeholder="EAN-13 u 8"></label>
    <div class="acciones">
      <button class="btn btn--fantasma" data-buscar-nombre="1">Buscar por nombre</button>
      <button class="btn btn--fantasma" data-buscar-codigo="1">Buscar código</button>
      ${conCamara ? `<button class="btn" id="escanearCodigo">Escanear con cámara</button>` : ""}
    </div>`;
}

/** El array de pesos que edita cada categoría del editor de equipo —
    "discos" y "fraccionales" viven los dos dentro de `discos`, no como
    propiedades sueltas. */
function pesosArrayDe(eq, clave) {
  if (clave === "discos") return eq.discos.pesos;
  if (clave === "fraccionales") return eq.discos.fraccionales;
  if (clave === "mancuerna") return eq.mancuerna.pesos;
  if (clave === "banda") return eq.banda.pesos;
  return [];
}

/** Botón de activar/desactivar por categoría, en Perfil → Equipo. "Barra
    olímpica" solo si pesa de verdad 20 kg — si se cambia, es una barra,
    no necesariamente esa. */
function equipoCategoriasHTML(eq) {
  return equipo.CATEGORIAS_EQUIPO.map(c => {
    const nombre = c.clave === "barra"
      ? (eq.barra.kg === 20 ? "Barra olímpica" : `Barra (${eq.barra.kg} kg)`)
      : c.nombre;
    return `<button class="tema__b" data-equipo-toggle="${c.clave}" aria-pressed="${!!eq[c.clave]?.activo}">${esc(nombre)}</button>`;
  }).join("");
}

/** Cuenta cuántos hay de cada peso — dos discos de 5 kg son "5 kg × 2",
    no dos filas iguales. */
function contarPesos(pesos) {
  const cantidadPorValor = new Map();
  const orden = [];
  for (const p of [...pesos].sort((a, b) => b - a)) {
    if (!cantidadPorValor.has(p)) orden.push(p);
    cantidadPorValor.set(p, (cantidadPorValor.get(p) || 0) + 1);
  }
  return orden.map(valor => ({ valor, cantidad: cantidadPorValor.get(valor) }));
}

/** Lista de pesos editable (discos, fraccionales, mancuernas, bandas):
    cada peso con su cantidad y un ± para subirla o bajarla, y un campo
    para dar de alta un peso que todavía no está en la lista. */
function pesosEditorHTML(clave, pesos, sufijo = " kg") {
  const grupos = contarPesos(pesos);
  return `<div class="equipo__pesos">
    ${grupos.map(g => `<span class="equipo__peso">
        <button class="mini mini--x" data-equipo-cantidad="${clave}" data-valor="${g.valor}" data-dir="-1">−</button>
        ${g.valor}${sufijo} × ${g.cantidad}
        <button class="mini mini--x" data-equipo-cantidad="${clave}" data-valor="${g.valor}" data-dir="1">+</button>
      </span>`).join("") || `<span class="equipo__vacio">Sin nada añadido</span>`}
    <span class="equipo__anadir">
      <input type="number" step="0.5" min="0" inputmode="decimal" id="nuevoPeso-${clave}" placeholder="+ kg">
      <button class="mini" data-equipo-anadir="${clave}">Añadir</button>
    </span>
  </div>`;
}

/**
 * El día de la rutina con las sustituciones del cazador aplicadas.
 * Se cambia el movimiento, no la prescripción: las series, el rango de
 * reps y el descanso son del hueco de la rutina, no del ejercicio que
 * se meta en él.
 */
function dia(n) {
  const d = diaRutina(programaActivo(), n);
  if (d.repesca) return { ...d, ejercicios: ejerciciosRepesca(programaActivo()) };
  return {
    ...d,
    ejercicios: d.ejercicios.map(e => {
      const c = (E.cambios || {})[e.sesionId];
      if (!c || !EJERCICIOS[c.ej]) return e;
      return {
        ...ejercicio(c.ej),
        series: e.series, min: e.min, max: e.max, descanso: e.descanso, nota: e.nota,
        bloque: e.bloque, sesionId: e.sesionId, original: e.nombre, temporal: c.temporal
      };
    })
  };
}

/**
 * Ejercicios del día de repesca: lo que falte, ejercicio a ejercicio,
 * en los días núcleo de esta semana — no solo los días que no se han
 * tocado en absoluto. Un día a medias (se hizo algún ejercicio, pero no
 * todos) deja pendientes igual que uno sin empezar. Se reparten por
 * turnos entre los días con algo pendiente (primero el primero de cada
 * uno, luego el segundo...) para no vaciar un solo patrón, y se cortan
 * en 7 — un parche puntual, no una sesión entera de más. Si el mismo
 * patrón falta dos veces (PPL x2), no se repite el ejercicio. Un
 * ejercicio sin equipo activo tampoco se ofrece — spec 007.
 */
const TOPE_REPESCA = 7;
function ejerciciosRepesca(prog) {
  const porDia = nucleo(prog)
    .map(n => {
      const ya = registradosSemana(n);
      return dia(n).ejercicios.filter(e => !ya.has(e.clave) && disponible(e));
    })
    .filter(arr => arr.length);

  const vistos = new Set(), salida = [];
  for (let i = 0; salida.length < TOPE_REPESCA && porDia.some(arr => i < arr.length); i++) {
    for (const arr of porDia) {
      if (salida.length >= TOPE_REPESCA) break;
      const ej = arr[i];
      if (ej && !vistos.has(ej.clave)) { vistos.add(ej.clave); salida.push(ej); }
    }
  }
  return salida;
}

/** El valor que se está ajustando en el perfil, sin guardar todavía. */
const borradorPeso = () => pesoBorrador ?? pesoActual();

/** Peso corporal de hoy: el último anotado, o el del registro. */
const pesoActual = () => {
  const h = E.corporal || [];
  return h.length ? h[h.length - 1].kg : (cazador?.pesoCorporal || 80);
};

/** % de grasa: el último anotado, o `null` si nunca se ha anotado
    ninguno — a diferencia del peso, no hay un valor de partida real
    del que caer, así que no se inventa uno. */
const grasaActual = () => {
  const h = E.grasaCorporal || [];
  return h.length ? h[h.length - 1].pct : null;
};

/** El valor que se está ajustando, sin guardar todavía — 20% es solo
    un punto de partida neutro para el mando +/-, nunca se guarda sin
    pulsar "Anotar hoy". */
const borradorGrasa = () => grasaBorrador ?? grasaActual() ?? 20;

const escalon = ej => equipo.escalonDe(equipoActivo(), ej.implemento);

/** Las veces que se registró este ejercicio, en orden de fecha.
    No vale fiarse del orden de inserción: restaurar una copia puede
    meter filas viejas después de las nuevas. */
function historialDe(clave) {
  return filas.filter(f => f.ej === clave)
              .sort((a, b) => (a.ts || a.f).localeCompare(b.ts || b.f));
}

/** La última vez que se registró este ejercicio, fallada o no. */
function ultimaDe(clave) {
  const h = historialDe(clave);
  return h.length ? h[h.length - 1] : null;
}

/** La última vez que se completó de verdad (sin contar las falladas). */
function ultimaCompletadaDe(clave) {
  const h = historialDe(clave).filter(f => !f.fallado);
  return h.length ? h[h.length - 1] : null;
}

/** Cuántas sesiones distintas (de cualquier ejercicio) han cerrado
    después de la que se indica. Sirve para medir "cuánto hace". */
function sesionesTrasLa(fecha, diaN) {
  const claves = new Set();
  for (const f of filas) {
    if (f.f > fecha || (f.f === fecha && f.dia !== diaN)) claves.add(`${f.f}|${f.dia}`);
  }
  return claves.size;
}

/** Tres sesiones enteras sin tocar este ejercicio: al volver, no se
    confía en un peso al que solo se llegó por "sube el peso" sin
    haberlo probado nunca. */
function ausenciaLarga(clave) {
  const u = ultimaDe(clave);
  return !!u && sesionesTrasLa(u.f, u.dia) >= 3;
}

/**
 * Peso de hoy para un ejercicio. Tras una ausencia larga, se vuelve al
 * último peso completado de verdad (no al que proponía subir antes de
 * desaparecer) y se corrige el guardado, para no repetir el aviso.
 */
const pesoDe = ej => {
  if (ausenciaLarga(ej.clave)) {
    const u = ultimaCompletadaDe(ej.clave);
    if (u && E.pesos[ej.clave] !== u.kg) {
      E.pesos[ej.clave] = u.kg;
      E.listos[ej.clave] = false;
      guardar();
    }
  }
  return E.pesos[ej.clave] ?? ej.kgInicial ?? 0;
};

/** kg que propone el motor de progresión al completar el tope de reps. */
const incrementoDe = ej => ej.incremento ?? P.DEFECTO_INCREMENTO;

/** El escalón real más cercano a un objetivo (no todo kg es montable). */
const masCercano = (pasos, objetivo) =>
  pasos.reduce((a, p) => Math.abs(p - objetivo) < Math.abs(a - objetivo) ? p : a, pasos[0]);

/**
 * Dos fallos seguidos en este ejercicio: 0 reps, o por debajo del
 * rango bajo aunque se registrara algo. Toca bajar un escalón, no
 * insistir con el mismo peso.
 */
function dosFallosSeguidos(ej) {
  const ultimas = historialDe(ej.clave).slice(-2);
  return ultimas.length === 2 && ultimas.every(f => f.fallado || f.reps < ej.min);
}

/**
 * Con qué reps arranca hoy. Si sigues en el mismo peso, donde lo
 * dejaste: la doble progresión consiste en sumar reps, y empezar
 * siempre abajo del rango obligaba a subirlas a mano cada serie.
 * Si has cambiado el peso, se vuelve al principio del rango, que es
 * justo lo que toca al subir carga.
 */
function repsSugeridas(ej, kg) {
  const u = ultimaDe(ej.clave);
  return !u || u.kg !== kg ? ej.min : Math.max(ej.min, u.reps);
}

const serie = ej => {
  if (!E.sesion[ej.sesionId]) {
    E.sesion[ej.sesionId] = {
      hechas: Array(ej.series).fill(false),
      reps: repsSugeridas(ej, pesoDe(ej))
    };
  }
  const st = E.sesion[ej.sesionId];
  /* Reps por serie: se guarda lo que marcaba el contador en el momento
     de marcar esa serie, no un valor compartido. Sesiones a medias de
     antes de este cambio no lo traen: se rellena vacío, sin perder las
     series ya marcadas. */
  if (!Array.isArray(st.repsSerie)) st.repsSerie = Array(ej.series).fill(null);
  /* Peso por serie: mismo motivo que repsSerie — si cambias el peso a
     media sesión, las series ya marcadas no deben mentir sobre lo que
     movieron de verdad. */
  if (!Array.isArray(st.pesoSerie)) st.pesoSerie = Array(ej.series).fill(null);
  return st;
};

/* ---------- avisos del Sistema ---------- */
const cola = [];
let avisando = false;
function aviso(texto, tipo = "info") {
  cola.push({ texto, tipo });
  if (!avisando) siguienteAviso();
}
function siguienteAviso() {
  const a = cola.shift();
  if (!a) { avisando = false; return; }
  avisando = true;
  const n = $("aviso");
  n.className = "aviso on " + a.tipo;
  n.innerHTML = a.texto;
  try { navigator.vibrate?.(a.tipo === "logro" ? [40, 40, 90] : 25); } catch (e) {}
  setTimeout(() => { n.classList.remove("on"); setTimeout(siguienteAviso, 320); }, a.tipo === "logro" ? 3400 : 2200);
}

/* ============================================================
   PUERTA · elegir cazador o registrarse
   ============================================================ */
let puertaModo = "lista";     // lista · pin · alta
let pendiente = null;
let cambiando = false;        // se llegó aquí desde una sesión abierta

async function pintarPuerta() {
  stopAnim();
  const lista = await DB.cazadores.listar();
  document.body.classList.add("puerta-abierta");

  if (!lista.length && puertaModo === "lista") puertaModo = "alta";

  let cuerpo;
  if (puertaModo === "alta") {
    cuerpo = `
      <p class="vt__txt">Registra tu ficha. Se queda en este teléfono, en nadie más.</p>
      <label class="campo"><span>Nombre de cazador</span>
        <input id="fNombre" type="text" maxlength="24" autocomplete="off" placeholder="Jinwoo"></label>
      <label class="campo"><span>Peso corporal · para contar el volumen real</span>
        <input id="fPeso" type="number" inputmode="decimal" min="30" max="250" value="80"></label>
      <label class="campo"><span>PIN de 4 cifras · opcional</span>
        <input id="fPin" type="password" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="····"></label>
      <button class="btn btn--go" id="crear">Registrar cazador</button>
      ${lista.length ? `<button class="btn btn--fantasma" id="volver">Volver a la lista</button>` : ""}`;
  } else if (puertaModo === "pin") {
    cuerpo = `
      <p class="vt__txt">Introduce el PIN de <b>${esc(pendiente.nombre)}</b>.</p>
      <label class="campo"><span>PIN</span>
        <input id="fPinEntrar" type="password" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="····"></label>
      <button class="btn btn--go" id="entrarPin">Entrar</button>
      <button class="btn btn--fantasma" id="volver">Cancelar</button>`;
  } else {
    cuerpo = `
      <p class="vt__txt">Selecciona tu ficha.</p>
      <div class="fichas">${lista.map(c => {
        const actual = cambiando && c.id === cazador?.id;
        return `<button class="ficha ${actual ? "ficha--actual" : ""}" data-entrar="${c.id}">
          <span class="ficha__ini">${esc(c.nombre.slice(0, 1).toUpperCase())}</span>
          <span class="ficha__txt">
            <b>${esc(c.nombre)}</b>
            <small>${actual ? "Ficha actual" : c.pin ? "Con PIN" : "Sin PIN"} · desde ${c.creado.slice(0, 10)}</small>
          </span>
        </button>`;
      }).join("")}</div>
      <button class="btn btn--fantasma" id="nuevo">Registrar otro cazador</button>`;
  }

  /* Si se viene de una sesión abierta, salir de aquí no puede costar
     un PIN: la sesión sigue viva hasta que se elija otra ficha. */
  const vuelta = cambiando && cazador
    ? `<button class="btn btn--fantasma" id="seguir">Seguir como ${esc(cazador.nombre)}</button>`
    : "";

  $("app").innerHTML = `
    <div class="puerta">
      <div class="vt vt--grande">
        <div class="vt__logo">${logoSVG(30, "var(--sis)")}</div>
        <div class="vt__cab">${cambiando ? "Cambio de ficha" : "Notificación"}</div>
        <h1 class="vt__tit">${cambiando ? "Cambiar<br>de cazador" : "El Sistema<br>te ha seleccionado"}</h1>
        ${cuerpo}
        ${vuelta}
        <p class="vt__pie">Acceso local. El PIN separa fichas en el mismo móvil,
        no protege los datos de quien tenga el teléfono desbloqueado.</p>
      </div>
    </div>`;
}

async function entrar(id) {
  cazador = await DB.cazadores.get(id);
  E = await DB.estado.cargar(id);
  filas = await DB.historial.lista(id);
  filasNutricion = await DB.nutricion.lista(id);
  alimentosDB = await DB.alimentos.listar();
  desbloqueados = (await DB.logros.lista(id)).map(l => l.logro);
  localStorage.setItem(CLAVE_SESION, id);
  document.body.classList.remove("puerta-abierta");
  vista = "misiones";
  cambiando = false;
  semanasAbiertas = null;
  sesionAbierta = null;
  await revisarLogros();
  pintar();
}

/* Abre el selector sin cerrar nada: se puede volver sin teclear el PIN. */
function abrirSelector() {
  cambiando = true;
  puertaModo = "lista";
  vista = "puerta";
  pintar();
}

function seguirIgual() {
  cambiando = false;
  document.body.classList.remove("puerta-abierta");
  vista = "misiones";
  pintar();
}

/* ============================================================
   CABECERA · nivel, rango y barra de experiencia
   ============================================================ */
function pintarCabecera() {
  const st = P.estadisticas(filas);
  const sig = P.proximoRango(st.nivel);
  $("cabecera").innerHTML = `
    <div class="top__bar">
      <div class="top__id">
        <span class="top__logo">${logoSVG(16, "var(--tenue)")}</span>
        <span class="rango" style="--rango:${COLOR_RANGO[st.rango]}">${st.rango}</span>
        <span class="top__txt">
          <b>${esc(cazador.nombre)}</b>
          <small>Nivel ${st.nivel}${sig ? ` · rango ${sig.rango} en ${sig.faltan}` : " · rango máximo"}</small>
        </span>
      </div>
      <div class="top__sem">SEMANA <b>${E.semana}</b></div>
    </div>
    <div class="xp"><i style="width:${(st.progreso * 100).toFixed(1)}%"></i></div>
    <div class="xp__txt">${miles(st.enNivel)} / ${miles(st.paraSubir)} XP</div>`;
}

/* ---------- barra inferior ---------- */
const ICONOS = {
  misiones:  `<rect x="3" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6"/>`,
  logros:    `<path d="M8 3h8v6a4 4 0 0 1-8 0V3Z"/><path d="M8 5.5H5V7a3 3 0 0 0 3 3"/><path d="M16 5.5h3V7a3 3 0 0 1-3 3"/><path d="M12 13v4"/><path d="M8.5 21h7"/>`,
  historial: `<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>`,
  perfil:    `<circle cx="12" cy="8" r="3.6"/><path d="M5 20.5a7 7 0 0 1 14 0"/>`,
  manual:    `<path d="M4 5a2 2 0 0 1 2-2h5v18H6a2 2 0 0 0-2 2V5Z"/><path d="M20 5a2 2 0 0 0-2-2h-5v18h5a2 2 0 0 1 2 2V5Z"/>`,
  menus:     `<rect x="4" y="5" width="4" height="4" rx="1"/><path d="M11 7h9"/><rect x="4" y="11" width="4" height="4" rx="1"/><path d="M11 13h9"/><rect x="4" y="17" width="4" height="4" rx="1"/><path d="M11 19h9"/>`
};
const NOMBRE_VISTA = { misiones: "Misiones", logros: "Logros", historial: "Historial", perfil: "Perfil", manual: "Manual", menus: "Menús" };

function pintarNav() {
  const activa = vista === "dia" || vista === "movilidad" || vista === "cardio" || vista === "nutricion" || vista === "resultado" ? "misiones" : vista;
  $("nav").innerHTML = Object.keys(ICONOS).map(v => `
    <button class="nav__b" data-vista="${v}" aria-current="${activa === v}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
           stroke-linecap="round" stroke-linejoin="round">${ICONOS[v]}</svg>
      <span>${NOMBRE_VISTA[v]}</span>
    </button>`).join("");
}

/* ============================================================
   TABLERO DE MISIONES
   La portada: qué toca hoy y cómo va la semana de un vistazo.
   ============================================================ */
/**
 * Qué ejercicios de un día ya están registrados esta semana.
 * En los días sueltos es la única forma de saber qué queda: se pueden
 * cerrar en tres ratos distintos, y cada rato deja su propia sesión.
 */
function registradosSemana(n) {
  return new Set(filas.filter(f => f.semana === E.semana && f.dia === n).map(f => f.ej));
}

function estadoDia(n) {
  const d = dia(n);
  const ya = registradosSemana(n);
  const total = d.ejercicios.reduce((a, e) => a + e.series, 0);
  const marcadas = d.ejercicios.reduce(
    (a, e) => a + (E.sesion[e.sesionId]?.hechas.filter(Boolean).length || 0), 0);

  /* Los bloques de un día suelto se dan por hechos cuando todos sus
     ejercicios han caído esta semana, sin importar en qué sesión. */
  const grupos = bloques(d).map(b => ({
    ...b, hecho: b.ejercicios.every(e => ya.has(e.clave))
  }));

  return {
    dia: d, total, marcadas, grupos,
    cerrados: d.ejercicios.filter(e => ya.has(e.clave)).length,
    bloquesHechos: grupos.filter(b => b.hecho).length,
    /* Un día normal se cierra de una vez; uno suelto, cuando no queda
       ni un ejercicio por tocar. */
    hecha: d.suelto ? d.ejercicios.every(e => ya.has(e.clave)) : ya.size > 0,
    enCurso: marcadas > 0 || (d.suelto && ya.size > 0)
  };
}

/** Volumen de cada sesión anterior de este bloque, en orden cronológico. */
function volumenesDeBloque(bloque, prog) {
  const propias = filas.filter(f => bloqueDe(prog.dias.find(x => x.n === f.dia)?.nombre) === bloque);
  propias.sort((a, b) => (a.ts || a.f).localeCompare(b.ts || b.f));
  const mapa = new Map();
  for (const f of propias) {
    const k = `${f.f}|${f.dia}`;
    mapa.set(k, (mapa.get(k) || 0) + (f.volumen || 0));
  }
  return [...mapa.values()];
}

/**
 * Nombre del bloque (Empuje/Tirón/Piernas...) que más se ha caído en
 * las últimas tres semanas de calendario, o null si van parejos. Un
 * día vale por la sesión en la que se cerró, no por sus filas.
 */
function bloqueAtrasado(prog) {
  const semanas = new Set([E.semana, E.semana - 1, E.semana - 2].filter(s => s >= 1));
  const sesiones = new Set();
  for (const f of filas) if (semanas.has(f.semana)) sesiones.add(`${f.semana}|${f.dia}`);

  const cuenta = new Map(prog.dias.map(d => [d.nombre, 0]));
  for (const clave of sesiones) {
    const diaN = +clave.split("|")[1];
    const d = prog.dias.find(x => x.n === diaN);
    if (d) cuenta.set(d.nombre, (cuenta.get(d.nombre) || 0) + 1);
  }

  const valores = [...cuenta.values()];
  if (!valores.length || Math.max(...valores) === Math.min(...valores)) return null;
  return [...cuenta.entries()].sort((a, b) => a[1] - b[1])[0][0];
}

/** ¿Ya se cerró la sesión de movilidad de esta semana? */
const movilidadHecha = () => filas.some(f => f.dia === 0 && f.semana === E.semana);

/** Cardio es suelto, no semanal: se marca hecho solo hasta medianoche,
 * al día siguiente vuelve a estar disponible. */
const cardioHechaHoy = () => filas.some(f => f.dia === -1 && f.f === hoy());

function tarjetaCardio() {
  const hecha = cardioHechaHoy();
  return `<button class="tarjeta ${hecha ? "tarjeta--hecha" : ""}" data-vista="cardio">
      <span class="tarjeta__n">✚</span>
      <span class="tarjeta__cuando">Cuando puedas</span>
      <h3 class="tarjeta__nom">Cardio</h3>
      <span class="tarjeta__lema">Pies rápidos, manos arriba</span>
      <span class="tarjeta__pie">${hecha ? "Hecho hoy" : `${CARDIO.length} bloques · sombra, pies, comba`}</span>
    </button>`;
}

function tarjetaNutricion() {
  const nutri = nutricionEstado();
  const totales = N.totalesDia(nutricionHoy());
  const pie = !nutri.objetivo
    ? "Configura tu perfil en Ficha"
    : `${miles(totales.kcal)} / ${miles(nutri.objetivo.kcal)} kcal hoy`;
  return `<button class="tarjeta" data-vista="nutricion">
      <span class="tarjeta__n">🍽</span>
      <span class="tarjeta__cuando">Cada día</span>
      <h3 class="tarjeta__nom">Nutrición</h3>
      <span class="tarjeta__lema">Lo que entra, también cuenta</span>
      <span class="tarjeta__pie">${pie}</span>
    </button>`;
}

/** Cuánto falta para la próxima semana de movilidad, en una semana
 * normal — antes no había ninguna pista hasta estar ya dentro. */
function proximaMovilidadTexto(semana) {
  const proxima = Math.ceil((semana + 1) / 5) * 5;
  const faltan = proxima - semana;
  return ` · movilidad en ${faltan} semana${faltan === 1 ? "" : "s"} (semana ${proxima})`;
}

function pintarMovilidadPortada() {
  const r = P.racha(filas);
  const hecha = movilidadHecha();
  $("app").innerHTML = `
    ${penalizacionHTML(r)}
    <div class="portada">
      <div class="portada__cab">Semana ${E.semana} · descarga</div>
      <h2 class="portada__tit">${hecha ? "Movilidad completada" : "Semana de movilidad"}</h2>
      <div class="portada__prog">
        <span class="portada__puntos"><i class="${hecha ? "on" : ""}"></i></span>
        <span class="portada__txt">${hecha ? "1 de 1" : "0 de 1"}</span>
        ${r.actual ? `<span class="racha ${r.enRiesgo ? "racha--riesgo" : ""}">Racha ${r.actual}</span>` : ""}
      </div>
      ${r.enRiesgo ? `<div class="portada__riesgo">
        ${r.margen === 0 ? "Hoy es el último día para mantener la racha"
                         : `Queda ${r.margen} día para mantener la racha`}</div>` : ""}
      <div class="portada__pie">Cada 4 semanas de carga, una de descarga: sin barra, sin discos —
        cadera, dorsal, tobillo, torácica y hombro por tiempo.</div>
    </div>
    <div class="tablero">
      <button class="tarjeta tarjeta--destacada ${hecha ? "tarjeta--hecha" : ""}" data-mision="0">
        <span class="tarjeta__n">✚</span>
        <span class="tarjeta__eti">${hecha ? "Hecha" : "Siguiente misión"}</span>
        <h3 class="tarjeta__nom">Movilidad</h3>
        <span class="tarjeta__lema">Recarga antes de la siguiente carga</span>
        <span class="tarjeta__pie">${hecha ? "Completada" : `${MOVILIDAD.length} posturas · sin cargas`}</span>
      </button>
    </div>
    ${hecha ? `<div class="acciones">
      <button class="btn btn--go" id="semana">Empezar semana ${E.semana + 1}</button>
    </div>` : ""}`;
}

function pintarResultado() {
  stopAnim();
  const r = resultadoSesion;
  if (!r) { vista = "misiones"; pintarMisiones(); return; }
  const colorRango = COLOR_RANGO[r.rango] || COLOR_RANGO.E;

  $("app").innerHTML = `
    <div class="mision">
      <div class="mision__cab">Semana ${E.semana}</div>
      <h2 class="mision__tit">${esc(r.nombreDia)}</h2>
    </div>
    <div class="resultado">
      <div class="resultado__insignia" style="color:${colorRango}">
        ${r.bloque ? insigniaSVG(r.bloque, 132, colorRango) : ""}
        ${r.rango ? `<span class="resultado__rango" style="--rango:${colorRango}">${r.rango}</span>` : ""}
      </div>
      ${r.lema ? `<div class="resultado__lema">${esc(r.lema)}</div>` : ""}
      <div class="atributos">
        <div class="atr"><span class="atr__cl">VOL</span><span class="atr__val">${(r.volumen / 1000).toFixed(1)} t</span><span class="atr__nom">Trabajo</span></div>
        <div class="atr"><span class="atr__cl">MIN</span><span class="atr__val">${r.minutos ?? "—"}</span><span class="atr__nom">Duración</span></div>
        <div class="atr"><span class="atr__cl">SERIES</span><span class="atr__val">${r.series}</span><span class="atr__nom">Completadas</span></div>
        <div class="atr"><span class="atr__cl">XP</span><span class="atr__val">${miles(r.xp)}</span><span class="atr__nom">Ganada</span></div>
      </div>
      ${r.hito ? `<div class="resultado__hito">${esc(r.hito)}</div>` : ""}
      <ul class="resultado__lista">
        ${r.ejercicios.map(e => `<li class="${e.fallado ? "resultado__fallo" : ""}">
            <span>${esc(e.nombre)}${e.unilateral ? " (los dos lados)" : ""}</span>
            <span>${e.fallado ? "Fallado" : e.segundos ? `${e.series} × ${e.reps} s` : `${e.kg} kg × ${e.series} × ${e.reps}`}</span>
          </li>`).join("")}
      </ul>
      <div class="acciones">
        <button class="btn btn--go" id="descargarTarjeta">Descargar tarjeta</button>
        <button class="btn btn--fantasma" id="continuarResultado">Continuar</button>
      </div>
    </div>`;
}

function pintarMovilidad() {
  stopAnim();
  const sesion = E.sesion.movilidad || (E.sesion.movilidad = {});
  const bloques_ = MOVILIDAD.map(b => ({ ...b, hecho: !!sesion[b.clave] }));
  const hechos = bloques_.filter(b => b.hecho).length;

  $("app").innerHTML = `
    <div class="mision">
      <div class="mision__cab">Semana ${E.semana} · descarga</div>
      <h2 class="mision__tit">Movilidad</h2>
      <div class="mision__lema">${hechos} de ${bloques_.length} posturas · sin cargas</div>
    </div>
    <div class="suelta">Mantén cada postura el tiempo indicado, sin dolor agudo. No hay peso que subir
      esta semana: el objetivo es rango de movimiento, no esfuerzo.</div>
    ${bloques_.map(b => `
      <section class="ej">
        <div class="ej__cab">
          <div class="ej__txt">
            <h3 class="ej__nom">${esc(b.nombre)}</h3>
            <div class="ej__meta">${b.segundos} s${b.unilateral ? ` por ${b.unilateral} <em>(los dos lados)</em>` : ""}</div>
            <div class="ej__musc">${b.musculos.map(m => `<span>${esc(m)}</span>`).join("")}</div>
          </div>
        </div>
        <div class="tecnica"><div id="lienzo-${b.clave}"></div>
          <ul class="claves">${b.claves.map(c => `<li>${esc(c)}</li>`).join("")}</ul>
        </div>
        <div class="series">
          <button class="serie ${b.hecho ? "ok" : ""}" style="flex:1" data-movbloque="${b.clave}">
            ${b.hecho ? "✓ Hecha" : `Marcar · ${b.segundos} s`}
          </button>
        </div>
      </section>`).join("")}
    <div class="acciones">
      <button class="btn btn--arise" id="terminarMovilidad">Arise · cerrar movilidad</button>
    </div>`;

  for (const b of bloques_) {
    const host = $("lienzo-" + b.clave);
    if (host) { const fig = buildFigure(b.figura); host.append(fig.svg); animate(fig); }
  }
}

function pintarCardio() {
  stopAnim();
  const sesion = E.sesion.cardio || (E.sesion.cardio = {});
  const bloques_ = CARDIO.map(b => ({ ...b, hecho: !!sesion[b.clave] }));
  const hechos = bloques_.filter(b => b.hecho).length;

  $("app").innerHTML = `
    <div class="mision">
      <div class="mision__cab">Cuando puedas</div>
      <h2 class="mision__tit">Cardio</h2>
      <div class="mision__lema">${hechos} de ${bloques_.length} bloques · sin cargas</div>
    </div>
    <div class="suelta">No cuenta como misión de fuerza ni hace falta para pasar de semana —
      márcalo cuando lo hagas, el día que sea.</div>
    ${bloques_.map(b => `
      <section class="ej">
        <div class="ej__cab">
          <div class="ej__txt">
            <h3 class="ej__nom">${esc(b.nombre)}</h3>
            <div class="ej__meta">${b.rondas} rondas × ${b.segundosRonda}s · descanso ${b.segundosDescanso}s</div>
            <div class="ej__musc">${b.musculos.map(m => `<span>${esc(m)}</span>`).join("")}</div>
          </div>
        </div>
        <div class="tecnica"><div></div>
          <ul class="claves">${b.claves.map(c => `<li>${esc(c)}</li>`).join("")}</ul>
        </div>
        <div class="series">
          <button class="serie ${b.hecho ? "ok" : ""}" style="flex:1" data-cardiobloque="${b.clave}">
            ${b.hecho ? "✓ Hecho" : `Marcar · ${b.rondas} rondas`}
          </button>
        </div>
      </section>`).join("")}
    <div class="acciones">
      <button class="btn btn--arise" id="terminarCardio">Arise · cerrar cardio</button>
    </div>`;
}

/** Anillo SVG de kcal del día — mismo lenguaje de "HUD" que el resto
    del Sistema, no una barra recta con un número al lado. */
function anilloKcalHTML(actual, objetivo) {
  const CIRC = 251.2;
  const frac = objetivo ? Math.min(1, actual / objetivo) : 0;
  return `<div class="anillo">
      <svg width="92" height="92" viewBox="0 0 92 92">
        <circle cx="46" cy="46" r="40" fill="none" stroke="var(--linea)" stroke-width="8"/>
        <circle cx="46" cy="46" r="40" fill="none" stroke="var(--sis)" stroke-width="8"
          stroke-linecap="round" transform="rotate(-90 46 46)"
          stroke-dasharray="${CIRC}" stroke-dashoffset="${(CIRC * (1 - frac)).toFixed(1)}"/>
      </svg>
      <div class="anillo__num">
        <span class="anillo__kcal">${miles(actual)}</span>
        <span class="anillo__obj">/ ${miles(objetivo)} kcal</span>
      </div>
    </div>`;
}

/** Mini barra de un macro, junto al anillo de kcal. */
function macroMiniHTML(etiqueta, actual, objetivo, sufijo) {
  const pct = objetivo ? Math.min(100, Math.round((actual / objetivo) * 100)) : 0;
  return `<div class="macro-mini">
      <span>${etiqueta}</span>
      <span class="barra"><i style="width:${pct}%"></i></span>
      <b>${actual}${sufijo}</b>
    </div>`;
}

/**
 * Sección plegable, cerrada por defecto — Perfil, Nutrición y Menús
 * mostraban todo de golpe ("mucho slide"); ahora solo lo que se está
 * usando ahora mismo se despliega. Mismo patrón visual que las
 * sesiones del Historial, reutilizado en vez de inventar uno nuevo.
 */
function panel(id, titulo, subtitulo, contenidoHTML) {
  const abierto = panelesAbiertos.has(id);
  return `
    <button class="sesion ${abierto ? "sesion--abierta" : ""}" data-panel="${id}">
      <span class="sesion__dia">${esc(titulo)}</span>
      <span class="sesion__meta">${esc(subtitulo)}</span>
    </button>
    ${abierto ? contenidoHTML : ""}`;
}

/**
 * Botón de una rejilla de tarjetas — Perfil usa esto en vez de
 * `panel()`. Solo una tarjeta abierta a la vez (`perfilAbierto`, no
 * un Set): al tocarla, la rejilla se sustituye por su contenido con
 * un botón "Atrás" — no se apila contenido debajo de la rejilla.
 */
function tarjetaPanel(id, icono, titulo, subtitulo) {
  return `<button class="tarjeta-panel" data-perfilpanel="${id}">
      <span class="tarjeta-panel__ic">${icono}</span>
      <span class="tarjeta-panel__nom">${esc(titulo)}</span>
      <span class="tarjeta-panel__meta">${esc(subtitulo)}</span>
    </button>`;
}

function pintarNutricion() {
  stopAnim();
  if (recalcularNutricionSiHaceFalta()) guardar();
  const nutri = nutricionEstado();

  if (!nutri.objetivo) {
    $("app").innerHTML = `
      <div class="mision">
        <div class="mision__cab">Cada día</div>
        <h2 class="mision__tit">Nutrición</h2>
        <div class="mision__lema">Falta tu perfil</div>
      </div>
      <div class="suelta">Sexo y actividad, más (edad y altura) o (% de grasa corporal). Sin esos
        datos no se calcula ningún objetivo — nada se inventa.</div>
      <div class="acciones">
        <button class="btn btn--go" data-vista="perfil">Ir a la Ficha</button>
      </div>`;
    return;
  }

  buscadorDestino = "comida";
  const catalogo = catalogoAlimentos();
  const hoyFilas = nutricionHoy();
  const comidas = hoyFilas.filter(f => f.tipo === "comida");
  const totales = N.totalesDia(hoyFilas);
  const tomadosHoy = new Set(hoyFilas.filter(f => f.tipo === "suplemento").map(f => f.clave));
  const sugeridos = N.SUPLEMENTOS_SUGERIDOS.filter(s => !nutri.suplementos.some(x => x.clave === s.clave));
  const gastoHoy = comidas.reduce((a, f) => a + (f.precio || 0), 0);
  const diaHoy = N.diaSemanaDe(hoy());
  const menuHoy = nutri.menuSemanal[diaHoy] || {};
  const nombreDiaHoy = N.DIAS_SEMANA.find(d => d.clave === diaHoy)?.nombre ?? diaHoy;

  let altListaHTML = "";
  if (cambiarComidaAbierto) {
    const claveActual = menuHoy[cambiarComidaAbierto];
    const platoActual = claveActual && nutri.platos.find(p => p.clave === claveActual);
    if (platoActual) {
      const mActual = N.macrosDePlato(platoActual.ingredientes, catalogo);
      const parecidos = N.platosParecidos(platoActual, nutri.platos, catalogo);
      altListaHTML = `<div class="alt-lista">
          <div class="alt-fila alt-fila--actual">
            <div><div class="alt-fila__nom">${esc(platoActual.nombre)}</div><div class="alt-fila__meta">${miles(mActual.kcal)} kcal · actual</div></div>
          </div>
          ${parecidos.length ? parecidos.map(({ plato: alt, macros }) => `
            <button class="alt-fila" data-menu-asignar="${diaHoy}|${cambiarComidaAbierto}|${alt.clave}">
              <div><div class="alt-fila__nom">${esc(alt.nombre)}</div><div class="alt-fila__meta">${miles(macros.kcal)} kcal · ${macros.proteina} g prot</div></div>
              <span class="alt-fila__accion">Usar</span>
            </button>`).join("") : `<p class="vt__txt">No hay otro plato parecido guardado (±15% kcal) — crea uno en Menús.</p>`}
        </div>`;
    }
  }

  $("app").innerHTML = `
    <div class="mision">
      <div class="mision__cab">Hoy</div>
      <h2 class="mision__tit">Nutrición</h2>
    </div>
    <div class="anillo-wrap">
      ${anilloKcalHTML(totales.kcal, nutri.objetivo.kcal)}
      <div class="macros-mini">
        ${macroMiniHTML("Proteína", totales.proteina, nutri.objetivo.proteina, "g")}
        ${macroMiniHTML("Grasa", totales.grasa, nutri.objetivo.grasa, "g")}
        ${macroMiniHTML("Carbos", totales.carbo, nutri.objetivo.carbo, "g")}
      </div>
    </div>
    ${gastoHoy ? `<div class="ej__meta" style="margin:0 12px">Gasto estimado hoy: <b>${gastoHoy.toFixed(2)} €</b></div>` : ""}

    <section class="ej">
      <div class="ej__cab"><div class="ej__txt"><h3 class="ej__nom">Hoy · ${esc(nombreDiaHoy)}</h3>
        <div class="ej__meta">Lo que tienes planificado — marca lo que te has comido, o toca ⇄ para
        cambiarlo por algo parecido. Planifica la semana en Menús.</div></div></div>
      <div class="tablero-comida">
        ${N.COMIDAS_DIA.map(c => {
          const claveP = menuHoy[c.clave];
          const plato = claveP && nutri.platos.find(p => p.clave === claveP);
          if (!plato) return `<button class="tarjeta-comida tarjeta-comida--vacia" data-vista="menus">
              <span class="tarjeta-comida__ic">＋</span>
              <span class="tarjeta-comida__slot">${esc(c.nombre)}</span>
              <span class="tarjeta-comida__nom">Sin planificar</span>
              <span class="tarjeta-comida__pie">Planificar en Menús</span>
            </button>`;
          const hechoHoy = hoyFilas.some(f => f.tipo === "comida" && f.slot === c.clave);
          const m = N.macrosDePlato(plato.ingredientes, catalogo);
          return `<div class="tarjeta-comida ${hechoHoy ? "tarjeta-comida--hecha" : ""}">
              ${!hechoHoy ? `<button class="cambiar-toque" data-cambiar-comida="${c.clave}" title="Cambiar por algo parecido">⇄</button>` : ""}
              <button class="tarjeta-comida__toque" data-menuhoy-toggle="${c.clave}|${plato.clave}">
                <span class="tarjeta-comida__ic">${hechoHoy ? "✓" : ""}</span>
                <span class="tarjeta-comida__slot">${esc(c.nombre)}</span>
                <span class="tarjeta-comida__nom">${esc(plato.nombre)}</span>
                <span class="tarjeta-comida__pie">${hechoHoy ? "Hecho · " : ""}${miles(m.kcal)} kcal</span>
              </button>
            </div>`;
        }).join("")}
      </div>
      ${altListaHTML}
    </section>

    <section class="ej">
      <div class="ej__cab"><div class="ej__txt"><h3 class="ej__nom">Comidas de hoy</h3></div></div>
      ${comidas.length ? `<table class="tabla">
        <tr><th>Alimento</th><th>Kcal</th><th></th></tr>
        ${comidas.map(f => `<tr>
            <td>${esc(f.nombre)}${f.gramos ? ` · ${f.gramos} g` : ""}${f.precio ? ` · ${f.precio.toFixed(2)} €` : ""}</td>
            <td>${f.sinMacros ? "sin macros" : miles(f.kcal)}</td>
            <td><button class="mini mini--x" data-comida-borrar="${f.id}">×</button></td>
          </tr>`).join("")}
      </table>` : `<p class="vt__txt">Nada registrado todavía hoy.</p>`}
    </section>

    <section class="ej">
      <div class="ej__cab"><div class="ej__txt"><h3 class="ej__nom">Suplementos</h3>
        <div class="ej__meta">Solo registro de toma — no entra en las kcal de arriba</div></div></div>
      <div class="equipo__pesos">
        ${nutri.suplementos.map(s => `<span class="equipo__peso">
            <button class="mini mini--x" data-suplemento-quitar="${s.clave}">×</button>
            ${esc(s.nombre)}
            <button class="mini ${tomadosHoy.has(s.clave) ? "" : "mini--x"}" data-suplemento-tomado="${s.clave}">${tomadosHoy.has(s.clave) ? "✓" : "○"}</button>
          </span>`).join("") || `<span class="equipo__vacio">Sin suplementos añadidos</span>`}
      </div>
      ${sugeridos.length ? `<p class="vt__pie">Sugeridos</p>
      <div class="equipo__pesos">
        ${sugeridos.map(s => `<span class="equipo__peso">
            ${esc(s.nombre)}
            <button class="mini" data-suplemento-anadir="${s.clave}" data-nombre="${esc(s.nombre)}">+</button>
          </span>`).join("")}
      </div>` : ""}
      <div class="equipo__anadir">
        <input type="text" id="nutriSupNombre" maxlength="40" placeholder="Otro...">
        <button class="mini" data-suplemento-anadir="manual">Añadir</button>
      </div>
    </section>

    <div class="paneles">
    ${panel("registrarOtro", "Registrar algo más", "Plato suelto, comida libre, o macros a mano", `
      <section class="ej">
        <div class="ej__cab"><div class="ej__txt"><h3 class="ej__nom">Otro plato guardado</h3>
          <div class="ej__meta">Fuera de lo planificado para hoy. Crea o edita platos en Menús.</div></div></div>
        ${nutri.platos.length ? `<div class="equipo__pesos">
          ${nutri.platos.map(p => `<span class="equipo__peso">
              ${esc(p.nombre)} · ${miles(N.macrosDePlato(p.ingredientes, catalogo).kcal)} kcal
              <button class="mini" data-plato-registrar="${p.clave}">+1 ración</button>
            </span>`).join("")}
        </div>` : `<p class="vt__txt">Todavía no has guardado ningún plato — hazlo en Menús.</p>`}
      </section>

      <section class="ej">
        <div class="ej__cab"><div class="ej__txt"><h3 class="ej__nom">Comida libre</h3>
          <div class="ej__meta">Para cuando no sabes los macros — fuera de casa, en un bar, en casa
          de alguien. No cuenta en los totales de arriba, pero queda constancia.</div></div></div>
        <label class="campo"><span>Qué / dónde</span><input id="nutriLibreNombre" type="text" maxlength="60" placeholder="Comida en bar"></label>
        <button class="btn" data-comida-libre-anadir="1">Registrar</button>
      </section>

      <section class="ej">
        <div class="ej__cab"><div class="ej__txt"><h3 class="ej__nom">Añadir comida suelta</h3>
          <div class="ej__meta">Para lo que no viene de un plato guardado. Busca, escanea o escribe
          el código — o mete los macros a mano por 100 g, se escala a los gramos que pongas.</div></div></div>
        ${buscadorAlimentoHTML()}
        <label class="campo"><span>Nombre</span><input id="nutriComNombre" type="text" maxlength="60" placeholder="Pechuga de pollo"></label>
        <label class="campo"><span>Gramos</span><input id="nutriComGramos" type="number" inputmode="numeric" min="1" placeholder="150"></label>
        <label class="campo"><span>Kcal / 100 g</span><input id="nutriComKcal" type="number" inputmode="numeric" min="0" placeholder="165"></label>
        <label class="campo"><span>Proteína / 100 g</span><input id="nutriComProteina" type="number" inputmode="numeric" min="0" placeholder="31"></label>
        <label class="campo"><span>Grasa / 100 g</span><input id="nutriComGrasa" type="number" inputmode="numeric" min="0" placeholder="4"></label>
        <label class="campo"><span>Carbohidratos / 100 g</span><input id="nutriComCarbo" type="number" inputmode="numeric" min="0" placeholder="0"></label>
        <button class="btn" data-comida-anadir="1">Añadir a hoy</button>
      </section>`)}
    </div>`;
}

/**
 * Gestión de platos (batch cooking, 1-2 veces por semana) y su
 * planificación en el calendario semanal — separado de la vista
 * diaria de Nutrición a propósito: crear/editar un plato no es un
 * gesto de cada día. Registrar que te lo has comido, sí, y eso sigue
 * en Nutrición (spec 010, ampliación "Menús").
 */
function pintarMenus() {
  stopAnim();
  buscadorDestino = "ingrediente";
  const nutri = nutricionEstado();
  const catalogo = catalogoAlimentos();
  const sugeridos = N.PLATOS_SUGERIDOS.filter(s => !nutri.platos.some(p => p.clave === s.clave));
  const nombreTipo = t => N.COMIDAS_DIA.find(c => c.clave === t)?.nombre ?? "Plato";
  const draftTotal = N.macrosDePlato(platoDraftIngredientes, catalogo);
  const nuevoPlatoAbierto = panelesAbiertos.has("nuevoplato");
  const diaHoy = N.diaSemanaDe(hoy());
  const totalComidasSemana = Object.values(nutri.menuSemanal).reduce((a, dia) => a + Object.keys(dia).length, 0);
  const compra = N.listaCompra(nutri.menuSemanal, nutri.platos, catalogo);

  $("app").innerHTML = `
    <div class="mision">
      <div class="mision__cab">1-2 veces por semana</div>
      <h2 class="mision__tit">Menús</h2>
      <div class="mision__lema">${nutri.platos.length} plato${nutri.platos.length === 1 ? "" : "s"} ·
        ${totalComidasSemana} comida${totalComidasSemana === 1 ? "" : "s"} planificada${totalComidasSemana === 1 ? "" : "s"}</div>
    </div>

    <section class="ej">
      <div class="ej__cab"><div class="ej__txt"><h3 class="ej__nom">Tus platos</h3>
        <div class="ej__meta">Macros calculadas por ingrediente — se reutilizan siempre que
        planifiques o registres ese plato.</div></div></div>
      <div class="tablero-comida">
        ${nutri.platos.map(p => {
          const m = N.macrosDePlato(p.ingredientes, catalogo);
          return `<div class="tarjeta-comida">
              <button class="tarjeta-comida__ic tarjeta-comida__borrar" data-plato-quitar="${p.clave}" title="Quitar">×</button>
              <span class="tarjeta-comida__slot">${esc(nombreTipo(p.tipoComida))}</span>
              <span class="tarjeta-comida__nom">${esc(p.nombre)}</span>
              <span class="tarjeta-comida__pie">${miles(m.kcal)} kcal${p.precio ? ` · ${p.precio.toFixed(2)} €` : ""}</span>
            </div>`;
        }).join("")}
        ${sugeridos.map(s => {
          const m = N.macrosDePlato(s.ingredientes, catalogo);
          return `<button class="tarjeta-comida tarjeta-comida--vacia" data-plato-sugerido="${s.clave}">
              <span class="tarjeta-comida__ic">＋</span>
              <span class="tarjeta-comida__slot">${esc(nombreTipo(s.tipoComida))}</span>
              <span class="tarjeta-comida__nom">${esc(s.nombre)}</span>
              <span class="tarjeta-comida__pie">${miles(m.kcal)} kcal${s.precio ? ` · ${s.precio.toFixed(2)} €` : ""}</span>
            </button>`;
        }).join("")}
        <button class="tarjeta-comida tarjeta-comida--vacia" data-panel="nuevoplato">
          <span class="tarjeta-comida__ic">＋</span>
          <span class="tarjeta-comida__slot">Nuevo</span>
          <span class="tarjeta-comida__nom">Nuevo plato</span>
          <span class="tarjeta-comida__pie">Con ingredientes</span>
        </button>
      </div>
    </section>

    ${nuevoPlatoAbierto ? `<div class="paneles">
      <section class="ej">
        <div class="ej__cab"><div class="ej__txt"><h3 class="ej__nom">Nuevo plato</h3>
          <div class="ej__meta">Añade ingredientes con sus gramos — el total sale solo, buscando en
          tu catálogo, escaneando o a mano.</div></div></div>
        <label class="campo"><span>Nombre del plato</span><input id="nutriPlatoNombre" type="text" maxlength="60" placeholder="Pollo con arroz (ración)"></label>
        <p class="vt__pie">Tipo de comida · opcional, solo filtra el selector de la semana</p>
        <div class="tema">
          ${N.COMIDAS_DIA.map(c => `<button class="tema__b" data-nuevoplatotipo="${c.clave}" aria-pressed="${nuevoPlatoTipo === c.clave}">${c.nombre}</button>`).join("")}
        </div>
        <label class="campo"><span>Precio de la ración · opcional, estimado</span><input id="nutriPlatoPrecio" type="number" step="0.1" inputmode="decimal" min="0" placeholder="€"></label>

        ${platoDraftIngredientes.length ? `
          <p class="vt__pie">Ingredientes</p>
          <div class="equipo__pesos">
            ${platoDraftIngredientes.map((ing, i) => `<span class="equipo__peso">
                <button class="mini mini--x" data-ingrediente-quitar="${i}">×</button>
                ${esc(ing.nombre)} · ${ing.gramos} g
              </span>`).join("")}
          </div>
          <p class="vt__pie">Total: ${miles(draftTotal.kcal)} kcal · ${draftTotal.proteina} g prot ·
            ${draftTotal.grasa} g grasa · ${draftTotal.carbo} g carbo</p>
        ` : `<p class="vt__txt">Sin ingredientes todavía — añade el primero abajo.</p>`}

        <label class="campo"><span>Gramos del ingrediente a añadir</span><input id="nutriIngGramos" type="number" inputmode="numeric" min="1" placeholder="150"></label>
        ${buscadorAlimentoHTML()}

        <div class="acciones">
          ${platoDraftIngredientes.length ? `<button class="btn btn--go" data-plato-guardar="1">Guardar plato</button>` : ""}
          <button class="btn btn--fantasma" data-panel="nuevoplato">Cerrar</button>
        </div>
      </section>
    </div>` : ""}

    <section class="ej">
      <div class="ej__cab"><div class="ej__txt"><h3 class="ej__nom">Semana</h3>
        <div class="ej__meta">Toca un día para planificarlo. Se registra de verdad desde Nutrición,
        esto solo planifica.</div></div></div>
      <div class="dias">
      ${N.DIAS_SEMANA.map(d => {
        const asignado = nutri.menuSemanal[d.clave] || {};
        const resumen = N.COMIDAS_DIA
          .map(c => asignado[c.clave] && nutri.platos.find(p => p.clave === asignado[c.clave])?.nombre)
          .filter(Boolean);
        const abierto = menuDiaAbierto === d.clave;
        return `
          <button class="dia-fila ${abierto ? "dia-fila--abierta" : ""} ${d.clave === diaHoy ? "dia-fila--hoy" : ""} ${!resumen.length ? "dia-fila--vacia" : ""}" data-menudia="${d.clave}">
            <div class="dia-fila__cab">
              <span class="dia-fila__nom">${d.nombre}</span>
              <span class="dia-fila__puntos">${N.COMIDAS_DIA.map(c => `<i class="${asignado[c.clave] ? "on" : ""}">${asignado[c.clave] ? "✓" : ""}</i>`).join("")}</span>
            </div>
            <span class="dia-fila__meta">${resumen.length ? resumen.join(" · ") : "Sin planificar"}</span>
          </button>
          ${abierto ? N.COMIDAS_DIA.map(c => {
            const celda = `${d.clave}|${c.clave}`;
            const claveP = asignado[c.clave];
            const plato = claveP && nutri.platos.find(p => p.clave === claveP);
            const abierta = menuCeldaAbierta === celda;
            const opciones = nutri.platos.filter(p => !p.tipoComida || p.tipoComida === c.clave);
            return `
              <div class="series">
                <button class="serie" style="flex:1" data-menucelda="${celda}">
                  ${esc(c.nombre)}: ${plato ? esc(plato.nombre) : "sin planificar"}
                </button>
                ${plato ? `<button class="mini mini--x" data-menu-quitar="${d.clave}|${c.clave}">×</button>` : ""}
              </div>
              ${abierta ? `<div class="equipo__pesos">
                ${opciones.length ? opciones.map(p => `
                  <button class="mini" data-menu-asignar="${d.clave}|${c.clave}|${p.clave}">${esc(p.nombre)}</button>
                `).join("") : `<span class="equipo__vacio">Guarda algún plato de ${nombreTipo(c.clave).toLowerCase()} arriba primero</span>`}
              </div>` : ""}`;
          }).join("") : ""}`;
      }).join("")}
      </div>
    </section>

    <div class="paneles">
    ${panel("listacompra", "Lista de la compra", compra.filas.length ? `${compra.filas.length} artículos · ~${compra.precioTotal.toFixed(2)} €` : "Nada planificado todavía", `
      <section class="ej">
        <div class="ej__cab"><div class="ej__txt"><h3 class="ej__nom">Lista de la compra</h3>
          <div class="ej__meta">De lo planificado esta semana · precio estimado, no garantizado</div></div></div>
        ${compra.filas.length ? N.CATEGORIAS_COMPRA.map(cat => {
          const filas = compra.filas.filter(f => f.categoria === cat.clave);
          if (!filas.length) return "";
          return `<div class="compra-grupo">
              <div class="compra-grupo__nom">${esc(cat.nombre)}</div>
              ${filas.map(f => `<div class="compra-fila">
                  <span class="compra-fila__nom">${esc(f.nombre)}<span class="compra-fila__cant">${N.formatoCantidad(f.gramos)}</span></span>
                </div>`).join("")}
            </div>`;
        }).join("") : `<p class="vt__txt">Planifica algún día en "Semana" para ver aquí lo que hace falta comprar.</p>`}
        ${compra.filas.length ? `<div class="compra-total">
            <span class="compra-total__nom">Total estimado</span>
            <span class="compra-total__val">${compra.precioTotal.toFixed(2)} €</span>
          </div>` : ""}
      </section>`)}
    <button class="sesion ${guiaBatchAbierta ? "sesion--abierta" : ""}" data-guiabatch="1">
      <span class="sesion__dia">Guía de batch cooking · domingo</span>
      <span class="sesion__meta">${guiaBatchAbierta ? "Ocultar" : "Ver pasos, nevera y congelador"}</span>
    </button>
    ${guiaBatchAbierta ? `
    <section class="ej">
      <div class="ej__cab"><div class="ej__txt"><h3 class="ej__nom">Domingo (~2 h)</h3></div></div>
      <ul class="claves">
        <li>1. Horno a 200 °C. Pollo (1,6 kg con pimentón, comino, ajo, sal, pimienta): 25 min. En
          otra bandeja, patata troceada (1,4 kg): 35-40 min.</li>
        <li>2. Arroz: cocer 980 g en crudo (12-15 min) y enfriar rápido.</li>
        <li>3. Verdura congelada (2,8 kg): saltear 8-10 min sin descongelar.</li>
        <li>4. Huevos: 7 duros (12 min), con cáscara.</li>
        <li>5. Tortillas: 2, de 3 huevos + 1 lata de atún cada una.</li>
        <li>6. Pavo (600 g): sofreír con cebolla, ajo y pimentón, 10 min.</li>
        <li>7. Merluza (400 g): horno a 180 °C, 15-20 min, con ajo y pimentón.</li>
        <li>8. Montaje: repartir cada preparación en 7 partes iguales (7 tuppers de comida y 7 de
          cena). La cucharada de AOVE se añade al servir.</li>
        <li>9. Overnight oats: 4 tarros (avena + skyr + agua). La fruta se añade al momento.</li>
      </ul>
      <div class="ej__cab" style="margin-top:14px"><div class="ej__txt"><h3 class="ej__nom">Nevera / congelador</h3></div></div>
      <ul class="claves">
        <li>Nevera (lun-jue): comidas, cenas (tortillas y pavo), 4 tarros de oats y los huevos duros.</li>
        <li>Congelador (vie-dom): comidas y cenas (pavo del sábado, merluza de viernes y domingo).</li>
        <li>Jueves por la noche: pasar los tuppers del congelador a la nevera.</li>
        <li>Miércoles: 3 tarros de oats más (5 min).</li>
      </ul>
      <p class="vt__pie">Del plan de batch cooking que pasaste — texto de referencia, no se calcula
      nada a partir de aquí.</p>
    </section>` : ""}
    </div>`;
}

function pintarMisiones() {
  stopAnim();
  if (esSemanaMovilidad(E.semana)) { pintarMovilidadPortada(); return; }
  const prog = programaActivo();
  const estados = prog.dias.map(d => estadoDia(d.n));
  const nucleoDias = estados.filter(e => !e.dia.suelto);
  const diaInicio = E.diaInicio || 1;
  const nNucleo = nucleo(prog).length;
  const nucleoOrdenado = [...nucleoDias].sort((a, b) =>
    (a.dia.n - diaInicio + nNucleo) % nNucleo - (b.dia.n - diaInicio + nNucleo) % nNucleo
  );
  const atrasado = bloqueAtrasado(prog);
  const pendienteAtrasado = atrasado && nucleoOrdenado.find(e => !e.hecha && e.dia.nombre === atrasado);
  const pendiente = pendienteAtrasado || nucleoOrdenado.find(e => !e.hecha) || estados.find(e => !e.hecha) || estados[0];
  const restantes = estados.filter(e => e.dia.n !== pendiente.dia.n);
  const hechas = nucleoDias.filter(e => e.hecha).length;
  const semanaHecha = hechas === nucleoDias.length;

  const tarjeta = (e, destacada) => {
    const clases = ["tarjeta"];
    if (destacada) clases.push("tarjeta--destacada");
    if (e.dia.suelto) clases.push("tarjeta--suelta");
    if (e.hecha) clases.push("tarjeta--hecha");
    else if (e.enCurso) clases.push("tarjeta--curso");

    /* En las pequeñas cabe una línea justa: solo las series. */
    const pie = e.hecha ? "Completada"
              : e.dia.suelto && e.bloquesHechos ? `${e.bloquesHechos}/${e.grupos.length} bloques`
              : e.enCurso ? `En curso · ${e.marcadas}/${e.total}`
              : e.dia.suelto ? `${e.grupos.length} bloques · ${e.total} series`
              : destacada ? `${e.dia.ejercicios.length} ejercicios · ${e.total} series`
              : `${e.total} series`;
    const via = e.dia.suelto ? e.cerrados / e.dia.ejercicios.length : e.marcadas / e.total;
    return `<button class="${clases.join(" ")}" data-mision="${e.dia.n}">
        <span class="tarjeta__n">${e.dia.n}</span>
        ${destacada ? `<span class="tarjeta__eti">${pendienteAtrasado ? "Grupo atrasado" : "Siguiente misión"}</span>`
                    : `<span class="tarjeta__cuando">${esc(e.dia.cuando)}</span>`}
        <h3 class="tarjeta__nom">${esc(e.dia.nombre)}</h3>
        <span class="tarjeta__lema">${esc(e.dia.lema)}</span>
        ${destacada ? `<span class="tarjeta__cuando">${esc(e.dia.cuando)} · ${esc(e.dia.trabaja)}</span>` : ""}
        <span class="tarjeta__pie">${pie}</span>
        ${!e.hecha && via > 0 ? `<span class="tarjeta__via"><i style="width:${(via * 100).toFixed(0)}%"></i></span>` : ""}
      </button>`;
  };

  const r = P.racha(filas);
  const st = P.estadisticas(filas);
  const remate = estados.find(e => e.dia.suelto);

  $("app").innerHTML = `
    ${penalizacionHTML(r)}
    <div class="portada">
      <div class="portada__cab">Semana ${E.semana}</div>
      <h2 class="portada__tit">${semanaHecha ? "Semana completada" : "Misiones diarias"}</h2>
      <div class="portada__prog">
        <span class="portada__puntos">${nucleoDias.map(e =>
          `<i class="${e.hecha ? "on" : ""}"></i>`).join("")}</span>
        <span class="portada__txt">${hechas} de ${nucleoDias.length}${remate
          ? ` · remate ${remate.bloquesHechos}/${remate.grupos.length}` : ""}</span>
        ${r.actual ? `<span class="racha ${r.enRiesgo ? "racha--riesgo" : ""}">Racha ${r.actual}</span>` : ""}
      </div>
      ${r.enRiesgo ? `<div class="portada__riesgo">
        ${r.margen === 0 ? "Hoy es el último día para mantener la racha"
                         : `Queda ${r.margen} día para mantener la racha`}</div>` : ""}
      <div class="portada__pie">${nNucleo} días sostienen la semana ·
        descanso ${esc(prog.descansos.toLowerCase())}${proximaMovilidadTexto(E.semana)}</div>
    </div>
    ${copiaHTML(st)}
    <div class="tablero">
      ${tarjeta(pendiente, true)}
      ${restantes.map(e => tarjeta(e, false)).join("")}
      ${tarjetaCardio()}
      ${tarjetaNutricion()}
    </div>
    ${semanaHecha ? `<div class="acciones">
      <button class="btn btn--go" id="semana">Empezar semana ${E.semana + 1}</button>
    </div>` : ""}`;
}

/* La penalización cuenta lo que había, no regaña: el camino de vuelta
   es entrenar, y eso ya lo sabe quien abre la app. */
function penalizacionHTML(r) {
  if (!r.rota || r.perdida < 2) return "";
  return `<div class="vt vt--penal">
      <div class="vt__cab">Penalización</div>
      <p class="vt__txt">Han pasado <b>${r.diasDesde} días</b> desde la última misión
      y la racha de ${r.perdida} se ha roto.</p>
      <p class="vt__pie">Tu mejor racha sigue siendo ${r.mejor}. Cualquier misión empieza la siguiente.</p>
    </div>`;
}

/* Recordatorio de copia: molesta poco y evita perderlo todo con el móvil. */
function copiaHTML(st) {
  const guardadas = E.copia?.sesiones ?? 0;
  const desde = st.sesiones - guardadas;
  if (st.sesiones < 3 || desde < 5) return "";
  return `<button class="tira" id="irACopia">
      <span class="tira__txt">${guardadas
        ? `${desde} sesiones sin copia de seguridad`
        : `${st.sesiones} sesiones y ninguna copia guardada`}</span>
      <span class="tira__ir">Guardar</span>
    </button>`;
}

/* ============================================================
   MISIÓN DEL DÍA
   ============================================================ */
const OJO = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="6" r="2.4"/><path d="M12 8.5v5"/><path d="M7 10.5l5 1 5-1"/><path d="M9.5 21l2.5-7.5 2.5 7.5"/></svg>`;

const CAMBIO = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h13"/><path d="M14 5l3 3-3 3"/><path d="M20 16H7"/><path d="M10 13l-3 3 3 3"/></svg>`;

/**
 * Alternativas para un hueco de la rutina: mismo patrón de movimiento.
 * Si el patrón tiene poca cosa, se abre al grupo muscular, que es el
 * siguiente criterio menos malo.
 */
function alternativas(ej) {
  const mismo = p => Object.entries(EJERCICIOS)
    .filter(([k, e]) => k !== ej.clave && p(e))
    .map(([k, e]) => ({ clave: k, ...e }))
    .filter(disponible);
  const porPatron = mismo(e => e.patron === ej.patron);
  return porPatron.length >= 2 ? porPatron
    : [...porPatron, ...mismo(e => e.grupo === ej.grupo && e.patron !== ej.patron)];
}

function cambioHTML(ej) {
  const lista = alternativas(ej);
  return `<div class="cambio">
      <div class="cambio__cab">${esc(ej.patron)} · otras opciones</div>
      <div class="cambio__modo">
        ${[[true, "Solo hoy"], [false, "Siempre"]].map(([v, n]) =>
          `<button class="cambio__m" data-modo="${v}" aria-pressed="${cambioTemporal === v}">${n}</button>`).join("")}
      </div>
      ${lista.map(a => `<button class="cambio__op" data-poner="${ej.sesionId}|${a.clave}">
          <b>${esc(a.nombre)}</b>
          <small>${esc(a.implemento)} · ${a.musculos.slice(0, 2).map(esc).join(" · ")}</small>
        </button>`).join("")}
      ${ej.original ? `<button class="cambio__op cambio__op--volver" data-poner="${ej.sesionId}|">
          Volver a ${esc(ej.original)}</button>` : ""}
    </div>`;
}

function discoHTML(kg) {
  const p = equipo.COLOR_DISCO[kg];
  return `<div class="disco${p.frac ? " disco--frac" : ""}" style="background:${p.fondo};color:${p.texto};height:${p.alto}px;width:${p.ancho}px">${kg}</div>`;
}
function barraHTML(total) {
  const c = equipo.repartoDe(equipoActivo(), total);
  if (!c) return "";
  if (!c.izq.length && !c.der.length) return `<div class="barra"><span class="barra__sola">Barra sola · ${equipoActivo().barra.kg} kg</span></div>`;
  /* Ascendente deja los fraccionales (los pesos más ligeros) en la
     punta, junto al collarín, y los bumpers pegados al eje. */
  const izq = [...c.izq].sort((a, b) => a - b).map(discoHTML).join("");
  const der = [...c.der].sort((a, b) => b - a).map(discoHTML).join("");
  return `<div class="barra">
      <div class="barra__lado barra__lado--i">${izq}</div>
      <div class="barra__eje"></div>
      <div class="barra__lado barra__lado--d">${der}</div>
    </div>
    <div class="barra__pies"><span>Izquierda ${c.izq.join(" + ") || "—"}</span><span>Derecha ${c.der.join(" + ") || "—"}</span></div>
    ${c.cabe ? "" : `<div class="barra__aviso">No cabe entero en el manguito con este reparto</div>`}`;
}

/**
 * El "Ver técnica" de en medio de una serie, en popup — no despliega
 * en línea (movía el resto de ejercicios de sitio cada vez que lo
 * abrías). Mismo contenido reducido que ya se decidió como "modo
 * entreno" en la spec 008: muñeco, claves, dónde notarlo y el aviso
 * fijo, con un enlace a la ficha completa para errores/variantes.
 */
function popupTecnicaHTML(ej) {
  const principal = explicacionDe(ej.musculos[0]);
  return `<div class="modal" data-tecnica="${ej.sesionId}">
    <div class="modal__caja">
      <div class="modal__cab">
        <h3>${esc(ej.nombre)}</h3>
        <button class="modal__cerrar" data-tecnica="${ej.sesionId}" aria-label="Cerrar">✕</button>
      </div>
      <p class="tecnica__musculo">
        <span class="tecnica__muscnom">${esc(principal.comun)}</span>${principal.ubicacion ? ` — ${esc(principal.ubicacion)}` : ""}
        ${ej.musculos.length > 1 ? `<span class="tecnica__muscsec">${ej.musculos.slice(1).map(esc).join(" · ")}</span>` : ""}
      </p>
      <div id="lienzo" class="lienzo"></div>
      <ul class="claves">${ej.claves.map(c => {
        const riesgo = c.startsWith("!");
        return `<li class="${riesgo ? "riesgo" : ""}">${esc(riesgo ? c.slice(1) : c)}</li>`;
      }).join("")}</ul>
      ${ej.dondeNotarlo ? `<p class="tecnica__nota"><b>Dónde notarlo:</b> ${esc(ej.dondeNotarlo)}</p>` : ""}
      <p class="tecnica__aviso">Si sientes dolor punzante en las articulaciones, para el ejercicio.</p>
      <button class="tecnica__masinfo" data-ficha="${ej.clave}">Ver ficha completa ›</button>
    </div>
  </div>`;
}

function pintarDia() {
  const d = dia(diaActivo);
  const ya = registradosSemana(diaActivo);
  /* En un día suelto, lo ya registrado esta semana sale plegado: la
     cuenta de lo que queda no puede incluir lo que ya hiciste el martes. */
  const cerrado = ej => d.suelto && ya.has(ej.clave);
  const vivos = d.ejercicios.filter(ej => !cerrado(ej));
  const total = vivos.reduce((a, e) => a + e.series, 0);
  const hechas = vivos.reduce((a, e) => a + serie(e).hechas.filter(Boolean).length, 0);

  const prog = programaActivo();
  const estados = prog.dias.map(x => estadoDia(x.n));

  let html = `<div class="saltos">
      ${prog.dias.map((x, i) => `<button class="salto ${estados[i].hecha ? "hecha" : ""} ${x.suelto ? "salto--suelto" : ""}"
        data-dia="${x.n}" aria-current="${x.n === diaActivo}" aria-label="Día ${x.n}, ${esc(x.cuando)}">${x.n}</button>`).join("")}
      <span class="saltos__hoy">${esc(d.cuando)}</span>
    </div>
    <div class="mision">
      <div class="mision__cab">${d.suelto ? "Misión suelta" : "Misión diaria"}</div>
      <h2 class="mision__tit">${esc(d.nombre)}</h2>
      <div class="mision__lema">${esc(d.lema)}</div>
      <div class="mision__meta">${vivos.length} ejercicio${vivos.length === 1 ? "" : "s"} ${
        d.suelto && vivos.length < d.ejercicios.length ? "por hacer" : ""} · ${hechas}/${total} series</div>
      <div class="medidor">${vivos.map(e => `<i class="${serie(e).hechas.filter(Boolean).length === e.series ? "on" : ""}"></i>`).join("")}</div>
    </div>`;

  if (d.calentamiento?.length) {
    html += `<div class="vt vt--calienta">
        <div class="vt__cab">Calentamiento</div>
        <ul class="claves">${d.calentamiento.map(c => `<li>${esc(c)}</li>`).join("")}</ul>
      </div>`;
  }

  if (d.suelto) {
    html += `<div class="suelta">Bloques independientes. Haz los que te quepan y pulsa
      <b>Arise</b>: lo guardado queda marcado el resto de la semana y la próxima vez
      solo te sale lo que falta.</div>`;
  }

  const tarjetaEjercicio = ej => {
    const kg = pesoDe(ej), st = serie(ej), pasos = escalon(ej);
    const i = pasos.indexOf(kg);
    const unidad = ej.implemento === "mancuerna" ? "kg ×2" : "kg";
    const abierta = tecnicaAbierta === ej.sesionId;
    const enSeg = ej.unidad === "segundos";

    /* Un fallo pesa más que un "listo": si vienes de dos fallos
       seguidos no tiene sentido proponer subir a la vez. */
    const progresable = ej.implemento !== "mancuerna" && ej.implemento !== "corporal";
    let marcaHtml = "";
    if (progresable && dosFallosSeguidos(ej)) {
      const objetivo = masCercano(pasos, kg - incrementoDe(ej));
      marcaHtml = `<button class="marca marca--baja" data-ajustar="${ej.sesionId}" data-obj="${objetivo}">Baja a ${objetivo} kg</button>`;
    } else if (progresable && E.listos[ej.clave]) {
      const objetivo = masCercano(pasos, kg + incrementoDe(ej));
      marcaHtml = `<button class="marca" data-ajustar="${ej.sesionId}" data-obj="${objetivo}">Sube a ${objetivo} kg</button>`;
    }

    html += `<section class="ej">
      <div class="ej__cab">
        <div class="ej__txt">
          <h3 class="ej__nom"><button class="ej__link" data-ficha="${ej.clave}">${esc(ej.nombre)}</button></h3>
          <div class="ej__meta">${ej.series} × ${ej.min}–${ej.max}${enSeg ? " s" : " reps"}${ej.unilateral ? ` por ${ej.unilateral} <em>(izq + der)</em>` : ""} · RIR 2–3${ej.nota ? ` · <em>${esc(ej.nota)}</em>` : ""}</div>
          <div class="ej__musc">${ej.musculos.map(m => `<span>${esc(m)}</span>`).join("")}</div>
          ${marcaHtml}
        </div>
        <div class="ej__btns">
          <button class="ojo" data-tecnica="${ej.sesionId}" aria-expanded="${abierta}" aria-label="Ver técnica">${OJO}</button>
          <button class="ojo" data-cambiar="${ej.sesionId}" aria-expanded="${cambioAbierto === ej.sesionId}"
                  aria-label="Cambiar ejercicio">${CAMBIO}</button>
        </div>
      </div>
      ${ej.original ? `<div class="sustituido">En vez de ${esc(ej.original)}${ej.temporal ? " · solo hoy" : ""}</div>` : ""}`;

    if (cambioAbierto === ej.sesionId) html += cambioHTML(ej);

    /* El "Ver técnica" ya no despliega en línea — abre en popup (ver
       popupTecnicaHTML), para no mover el resto de ejercicios de sitio
       cada vez que lo tocas a media serie. */

    if (ej.implemento !== "corporal") {
      html += `<div class="carga">
        <div class="carga__fila">
          <button class="paso" data-peso="${ej.sesionId}" data-dir="-1" ${i <= 0 ? "disabled" : ""} aria-label="Bajar peso">−</button>
          <div class="carga__val">${kg}<small>${unidad}</small></div>
          <button class="paso" data-peso="${ej.sesionId}" data-dir="1" ${i >= pasos.length - 1 ? "disabled" : ""} aria-label="Subir peso">+</button>
        </div>`;
      if (ej.implemento === "barra")          html += barraHTML(kg);
      else if (ej.implemento === "landmine")  html += `<div class="carga__nota">Discos en el extremo · la palanca resta carga real</div>`;
      else if (ej.implemento === "mancuerna") html += `<div class="carga__nota">Único par que tienes · aquí se progresa por reps</div>`;
      else                                    html += `<div class="carga__nota">Disco abrazado o apoyado</div>`;

      /* Entrar en frío a una barra cargada es como se rompe la gente.
         Los escalones salen de los discos que tienes, no de porcentajes.
         Se genera siempre, aunque luego no se complete la sesión. */
      if (ej.implemento === "barra") {
        const rampa = equipo.aproximacion(equipoActivo(), kg);
        const igual = Array.isArray(st.aprox) && st.aprox.length === rampa.length
          && st.aprox.every((s, k) => s.kg === rampa[k].kg);
        if (!igual) st.aprox = rampa.map(s => ({ ...s, hecha: false }));
        html += `<div class="calienta">
            <span class="calienta__et">Aproximación</span>
            ${st.aprox.map((s, k) =>
              `<button class="calienta__s ${s.hecha ? "on" : ""}" data-aprox="${ej.sesionId}" data-ak="${k}">${s.kg}<i>×${s.reps}</i></button>`).join("")}
          </div>`;
      }
      html += `</div>`;
    } else {
      html += `<div class="carga carga--corporal">Peso corporal · ~${equipo.cargaReal(ej, 0, pesoActual())} kg efectivos</div>`;
    }

    const contando = cron?.sesionId === ej.sesionId;
    html += `<div class="reps">
        <span class="reps__et">${enSeg ? "Segundos" : "Reps"} logradas</span>
        ${enSeg ? `<button class="crono ${contando ? "crono--on" : ""}" data-crono="${ej.sesionId}">
            ${contando ? "Parar" : "Cronómetro"}</button>` : ""}
        <div class="reps__caja">
          <button class="mini" data-reps="${ej.sesionId}" data-dir="-1" aria-label="Menos">−</button>
          <span class="reps__val" data-cronoval="${ej.sesionId}">${st.reps}</span>
          <button class="mini" data-reps="${ej.sesionId}" data-dir="1" aria-label="Más">+</button>
        </div>
      </div>
      <div class="series">${st.hechas.map((v, k) => {
        const corporal = ej.implemento === "corporal";
        const repsMarca = st.repsSerie[k] || 0;
        const pesoMarca = st.pesoSerie[k] ?? kg;
        const texto = corporal ? `${repsMarca}` : `${pesoMarca}×${repsMarca}`;
        const etiqueta = corporal ? `${repsMarca} reps` : `${pesoMarca} kg × ${repsMarca} reps`;
        return `<button class="serie ${v ? "ok" : ""} ${v && !repsMarca ? "serie--fallida" : ""}"
          data-serie="${ej.sesionId}" data-k="${k}" data-descanso="${ej.descanso}"
          aria-label="${v ? `Serie ${k + 1}, ${etiqueta}` : `Marcar serie ${k + 1}`}"
          >${v ? texto : k + 1}</button>`;
      }).join("")}</div>
    </section>`;
  };

  /* Un día normal es un solo bloque sin nombre y esto no se nota. */
  for (const b of bloques(d)) {
    if (b.nombre) {
      const listo = b.ejercicios.every(cerrado);
      html += `<div class="bloque ${listo ? "bloque--hecho" : ""}">
          <span class="bloque__nom">${esc(b.nombre)}</span>
          <span class="bloque__meta">${listo ? "Hecho esta semana"
            : `${b.ejercicios.reduce((a, e) => a + e.series, 0)} series · ~${estimaMinutos(b.ejercicios)} min`}</span>
        </div>`;
    }
    for (const ej of b.ejercicios) {
      if (cerrado(ej)) html += `<div class="ej ej--cerrado">
          <span class="ej__cerradoNom">${esc(ej.nombre)}</span>
          <span class="ej__cerradoPie">Registrado esta semana</span>
        </div>`;
      else tarjetaEjercicio(ej);
    }
  }

  html += `<div class="nota">
      <label class="nota__et" for="notaSesion">Notas de la sesión</label>
      <textarea id="notaSesion" class="nota__txt" rows="2" maxlength="280"
        placeholder="El hombro tocado, dormí cinco horas, la barra se me fue...">${esc(E.nota || "")}</textarea>
    </div>
    <div class="acciones">
      <button class="btn btn--arise" id="terminar">Arise · ${d.suelto ? "guardar lo hecho" : "terminar sesión"}</button>
      <button class="btn btn--fantasma" id="vaciar">Vaciar día</button>
    </div>`;

  if (tecnicaAbierta) {
    const ejPopup = d.ejercicios.find(e => e.sesionId === tecnicaAbierta);
    if (ejPopup) html += popupTecnicaHTML(ejPopup);
  }

  $("app").innerHTML = html;

  stopAnim();
  if (tecnicaAbierta) {
    const ej = d.ejercicios.find(e => e.sesionId === tecnicaAbierta);
    const host = $("lienzo");
    if (ej?.figura && host) { const fig = buildFigure(ej.figura); host.append(fig.svg); animate(fig); }
  }
}

/* ============================================================
   GRÁFICAS
   Una serie por gráfica y un solo eje. Peso y volumen no comparten
   escala, así que van en dos gráficas separadas y nunca en dos ejes
   de la misma, que es la forma más rápida de mentir con un dibujo.
   Sin leyenda: el título ya nombra la serie. El último valor va
   etiquetado, que es el dato que se viene a mirar, y debajo queda
   siempre la tabla con todos los números.
   ============================================================ */
const GRAF = { w: 320, h: 132, izq: 34, der: 48, arr: 14, aba: 24 };
const diaMes = f => `${f.slice(8, 10)}/${f.slice(5, 7)}`;

function grafica({ nombre, puntos, tipo, color, unidad, sel }) {
  const { w, h, izq, der, arr, aba } = GRAF;
  const n = puntos.length;
  const anchoUtil = w - izq - der, altoUtil = h - arr - aba;

  const vals = puntos.map(p => p.v);
  let min = Math.min(...vals), max = Math.max(...vals);
  if (tipo === "barras") min = 0;
  if (max === min) max = min + Math.max(1, min * 0.2);
  const margen = (max - min) * 0.12;
  const y0 = tipo === "barras" ? 0 : min - margen, y1 = max + margen;

  const ejeY = v => arr + (1 - (v - y0) / (y1 - y0)) * altoUtil;
  const banda = anchoUtil / n;
  const ejeX = i => tipo === "barras"
    ? izq + banda * (i + 0.5)
    : izq + (n === 1 ? anchoUtil / 2 : anchoUtil * i / (n - 1));

  /* Las referencias van en los valores reales, no en el dominio con
     margen: "51 kg" no significa nada, "50 kg" sí. Rejilla recesiva y
     tres líneas, ni una más.
     Los colores van en hexadecimal y el resto por clases: las variables
     CSS no se resuelven dentro de los atributos de presentación SVG. */
  const vMin = Math.min(...vals), vMax = Math.max(...vals);
  const refs = tipo === "barras" ? [0, vMax] : [vMin, vMax];
  const corto = v => (v >= 10000 ? Math.round(v / 1000) + "k" : Math.round(v));
  const rejilla = [...new Set([...refs, (refs[0] + refs[1]) / 2])].map(v =>
    `<line class="graf__rejilla" x1="${izq}" y1="${ejeY(v).toFixed(1)}"
           x2="${w - der}" y2="${ejeY(v).toFixed(1)}"/>`).join("");

  let marcas = "";
  if (tipo === "barras") {
    const ancho = Math.min(16, banda - 2);          // 2px de aire entre barras
    const radio = Math.min(4, ancho / 2);
    marcas = puntos.map((p, i) => {
      const x = ejeX(i) - ancho / 2, y = ejeY(p.v), alto = Math.max(radio, ejeY(y0) - y);
      return `<path d="M${x.toFixed(1)} ${(y + alto).toFixed(1)} V${(y + radio).toFixed(1)}
              a${radio} ${radio} 0 0 1 ${radio} -${radio} h${(ancho - 2 * radio).toFixed(1)}
              a${radio} ${radio} 0 0 1 ${radio} ${radio} V${(y + alto).toFixed(1)} Z"
              fill="${color}" opacity="${sel === i ? 1 : .82}"/>`;
    }).join("");
  } else {
    /* Escalonada: el peso no sube en rampa, salta el día que lo cambias. */
    let d = "";
    puntos.forEach((p, i) => {
      const x = ejeX(i), y = ejeY(p.v);
      d += i === 0 ? `M${x.toFixed(1)} ${y.toFixed(1)}`
                   : `L${ejeX(i).toFixed(1)} ${ejeY(puntos[i - 1].v).toFixed(1)} L${x.toFixed(1)} ${y.toFixed(1)}`;
    });
    marcas = `<path d="${d}" fill="none" stroke="${color}" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round"/>` +
      puntos.map((p, i) => `<circle class="graf__anillo" cx="${ejeX(i).toFixed(1)}"
              cy="${ejeY(p.v).toFixed(1)}" r="${sel === i ? 5 : 4}" fill="${color}"/>`).join("");
  }

  const ultimo = puntos[n - 1];
  const etiqueta = `<text class="graf__valor" x="${w - der + 7}"
      y="${(ejeY(ultimo.v) + 3.5).toFixed(1)}">${ultimo.v}${unidad}</text>`;

  /* Aviso del punto tocado: fecha y valor, sin tener que bajar a la tabla. */
  let globo = "";
  if (sel != null && puntos[sel]) {
    const x = ejeX(sel), p = puntos[sel];
    const ancho = 92, cx = Math.min(Math.max(x - ancho / 2, 2), w - ancho - 2);
    globo = `<line x1="${x.toFixed(1)}" y1="${arr}" x2="${x.toFixed(1)}" y2="${arr + altoUtil}"
                   stroke="${color}" stroke-width="1" opacity=".5" stroke-dasharray="2 3"/>
      <rect class="graf__globo" x="${cx.toFixed(1)}" y="1" width="${ancho}" height="17" rx="3"/>
      <text class="graf__globoTxt" x="${(cx + ancho / 2).toFixed(1)}" y="13"
            >${diaMes(p.f)} · ${p.v}${unidad}</text>`;
  }

  const toques = puntos.map((p, i) =>
    `<rect x="${(ejeX(i) - banda / 2).toFixed(1)}" y="${arr}" width="${banda.toFixed(1)}"
           height="${altoUtil}" fill="transparent" data-punto="${i}" data-graf="${tipo}"/>`).join("");

  return `<div class="graf">
      <div class="graf__cab">${nombre}</div>
      <svg viewBox="0 0 ${w} ${h}" class="graf__svg" role="img"
           aria-label="${nombre}: de ${puntos[0].v}${unidad} el ${diaMes(puntos[0].f)} a ${ultimo.v}${unidad} el ${diaMes(ultimo.f)}">
        ${rejilla}
        ${[...new Set(refs)].map(v => `<text class="graf__eje" x="${izq - 5}"
           y="${(ejeY(v) + 3).toFixed(1)}" text-anchor="end">${corto(v)}</text>`).join("")}
        <text class="graf__eje" x="${izq}" y="${h - 6}">${diaMes(puntos[0].f)}</text>
        <text class="graf__eje" x="${w - der}" y="${h - 6}" text-anchor="end">${diaMes(ultimo.f)}</text>
        ${marcas}${etiqueta}${globo}${toques}
      </svg>
    </div>`;
}

/* ============================================================
   FICHA DE EJERCICIO
   ============================================================ */

/**
 * Silueta genérica (no una por ejercicio) con las zonas del músculo
 * principal y los secundarios resaltadas — spec 008. La vista (frontal
 * o trasera) la decide el grupo del músculo PRINCIPAL: los de tirón
 * (espalda) casi siempre se notan mejor de espaldas.
 */
const ZONAS_SILUETA = {
  frontal: { push: ["torsoSup", "hombroI", "hombroD", "brazoI", "brazoD"], pull: ["brazoI", "brazoD"], legs: ["piernaI", "piernaD"], tronco: ["torsoInf"] },
  trasera: { pull: ["torsoSup", "hombroI", "hombroD", "brazoI", "brazoD"], push: ["hombroI", "hombroD"], legs: ["piernaI", "piernaD", "gluteo"], tronco: ["torsoInf"] }
};
const FORMAS_SILUETA = {
  cabeza:   `<circle cx="60" cy="20" r="14"/>`,
  torsoSup: `<rect x="40" y="38" width="40" height="46" rx="11"/>`,
  torsoInf: `<rect x="44" y="83" width="32" height="34" rx="8"/>`,
  hombroI:  `<circle cx="34" cy="45" r="10"/>`,
  hombroD:  `<circle cx="86" cy="45" r="10"/>`,
  brazoI:   `<rect x="21" y="52" width="14" height="56" rx="7"/>`,
  brazoD:   `<rect x="85" y="52" width="14" height="56" rx="7"/>`,
  piernaI:  `<rect x="42" y="118" width="16" height="70" rx="8"/>`,
  piernaD:  `<rect x="62" y="118" width="16" height="70" rx="8"/>`,
  gluteo:   `<rect x="40" y="110" width="40" height="18" rx="9"/>`
};

function siluetaHTML(ej) {
  const infos = ej.musculos.map(explicacionDe);
  const vista = infos[0]?.cara === "trasera" ? "trasera" : "frontal";
  const mapaZonas = ZONAS_SILUETA[vista];
  const nivel = {};
  infos.forEach((info, i) => {
    for (const z of mapaZonas[info.grupo] || []) {
      if (nivel[z] !== "principal") nivel[z] = i === 0 ? "principal" : "secundario";
    }
  });
  const orden = ["piernaI", "piernaD", "gluteo", "torsoInf", "torsoSup", "hombroI", "hombroD", "brazoI", "brazoD", "cabeza"];
  const zonas = orden.map(clave => {
    const forma = FORMAS_SILUETA[clave];
    const n = nivel[clave];
    return `<g class="silueta__zona ${n ? `silueta__zona--${n}` : ""}">${forma}</g>`;
  }).join("");
  return `<div class="silueta">
      <svg viewBox="0 0 120 195" class="silueta__svg" aria-label="Silueta ${vista}, músculo resaltado">${zonas}</svg>
      <p class="silueta__pie">Vista ${vista} · <span class="silueta__leyenda silueta__leyenda--principal">●</span> principal
        ${infos.length > 1 ? `<span class="silueta__leyenda silueta__leyenda--secundario">●</span> secundario` : ""}</p>
    </div>`;
}

/** Pestañas de la ficha: solo las que tienen contenido para este
 * ejercicio salen — "Cómo hacerlo" (las claves de siempre) es la única
 * que siempre está. */
function pestanasFicha(ej) {
  const tabs = [{ clave: "hacer", nombre: "Cómo hacerlo" }];
  if (ej.dondeNotarlo || ej.senalesMal) tabs.push({ clave: "notar", nombre: "Dónde notarlo" });
  if (ej.errores?.length) tabs.push({ clave: "errores", nombre: "Errores" });
  if (ej.variantes) tabs.push({ clave: "variantes", nombre: "Variantes" });
  return tabs;
}

function contenidoFicha(ej, tab) {
  if (tab === "notar") {
    return `<p class="vt__txt">${esc(ej.dondeNotarlo || "Todavía no hay nota para este ejercicio.")}</p>
      ${ej.senalesMal ? `<p class="vt__pie"><b>Si lo haces mal:</b> ${esc(ej.senalesMal)}</p>` : ""}`;
  }
  if (tab === "errores") {
    return `<ul class="claves">${ej.errores.map(e => `<li><b>${esc(e.error)}.</b> ${esc(e.arreglo)}</li>`).join("")}</ul>`;
  }
  if (tab === "variantes") {
    const v = ej.variantes;
    return `<ul class="claves">
      ${v.facil ? `<li><b>Más fácil:</b> ${esc(v.facil)}</li>` : ""}
      ${v.dificil ? `<li><b>Más difícil:</b> ${esc(v.dificil)}</li>` : ""}
      ${v.alternativaRodilla ? `<li><b>Si la rodilla pide descanso:</b> ${esc(v.alternativaRodilla)}</li>` : ""}
    </ul>`;
  }
  return `<ul class="claves">${ej.claves.map(c => {
    const riesgo = c.startsWith("!");
    return `<li class="${riesgo ? "riesgo" : ""}">${esc(riesgo ? c.slice(1) : c)}</li>`;
  }).join("")}</ul>`;
}

function pintarEjercicio() {
  stopAnim();
  const clave = ejercicioActivo;
  const ej = EJERCICIOS[clave];
  if (!ej) { vista = "perfil"; pintarPerfil(); return; }

  const mias = historialDe(clave);
  const kgActual = E.pesos[clave] ?? ej.kgInicial ?? 0;
  const mejor = mias.reduce((a, f) => Math.max(a, f.kg || 0), 0);
  const volumen = mias.reduce((a, f) => a + (f.volumen || 0), 0);
  const volumenAprox = mias.reduce((a, f) => a + (f.volumenAprox || 0), 0);
  const corporal = ej.implemento === "corporal";
  const marca = P.mejorMarca(filas, clave);
  const ultimaVez = mias.length
    ? Math.round((new Date(hoy()) - new Date(mias[mias.length - 1].f)) / 86400000)
    : "—";

  /* Un fallo parcial parte la sesión en dos filas (trabajo + fallada):
     para "veces" y las gráficas se agrupan de vuelta por sesión, o un
     0kg fantasma del todo o nada duplicaría el punto de ese día. */
  const sesiones = [...mias.reduce((mapa, f) => {
    const k = `${f.f}|${f.dia}`;
    const acc = mapa.get(k);
    if (!acc) mapa.set(k, { f: f.f, kg: f.kg, volumen: f.volumen || 0 });
    else {
      acc.volumen += f.volumen || 0;
      if (!f.fallado) acc.kg = f.kg;
    }
    return mapa;
  }, new Map()).values()];

  const puntosPeso = sesiones.map(s => ({ f: s.f, v: s.kg }));
  const puntosVol = sesiones.map(s => ({ f: s.f, v: Math.round(s.volumen) }));

  const hayGraficas = sesiones.length >= 2;

  const tabs = pestanasFicha(ej);
  const tabActiva = tabs.some(t => t.clave === fichaTab) ? fichaTab : "hacer";

  $("app").innerHTML = `
    <div class="mision">
      <div class="mision__cab">${esc(ej.grupo)} · ${esc(ej.patron)}${ej.rir ? ` · RIR ${esc(ej.rir)}` : ""}</div>
      <h2 class="mision__tit">${esc(ej.nombre)}</h2>
      <div class="ej__musc" style="margin-top:9px">${ej.musculos.map(m =>
        `<button class="ej__muscbtn ${musculoAbierto === m ? "on" : ""}" data-musculo="${esc(m)}">${esc(m)}</button>`).join("")}</div>
      ${musculoAbierto && ej.musculos.includes(musculoAbierto) ? (() => {
        const info = explicacionDe(musculoAbierto);
        return `<p class="ej__muscdef">${esc(info.comun)}${info.ubicacion ? ` — ${esc(info.ubicacion)}` : ""}</p>`;
      })() : ""}
      <p class="ej__aviso">Si sientes dolor punzante en las articulaciones, para el ejercicio.</p>
    </div>

    <div class="atributos">
      <div class="atr"><span class="atr__cl">AHORA</span><span class="atr__val">${kgActual}${ej.implemento === "corporal" ? "" : " kg"}</span><span class="atr__nom">Carga actual</span></div>
      <div class="atr"><span class="atr__cl">${corporal ? "REPS" : "1RM"}</span>
        <span class="atr__val">${marca || "—"}${marca && !corporal ? " kg" : ""}</span>
        <span class="atr__nom">${corporal ? "Mejor serie" : "Máximo estimado"}</span></div>
      <div class="atr"><span class="atr__cl">TOPE</span>
        <span class="atr__val">${corporal ? equipo.cargaReal(ej, 0, pesoActual()) + " kg" : (mejor ? mejor + " kg" : "—")}</span>
        <span class="atr__nom">${corporal ? "Carga efectiva" : "Más peso movido"}</span></div>
      <div class="atr"><span class="atr__cl">VECES</span><span class="atr__val">${sesiones.length}</span><span class="atr__nom">Sesiones</span></div>
      <div class="atr"><span class="atr__cl">VOL</span><span class="atr__val">${(volumen / 1000).toFixed(1)} t</span><span class="atr__nom">Acumulado</span></div>
      <div class="atr"><span class="atr__cl">ÚLTIMA</span><span class="atr__val">${ultimaVez}</span><span class="atr__nom">Días desde</span></div>
      ${volumenAprox > 0 ? `<div class="atr atr--tenue"><span class="atr__cl">APROX.</span><span class="atr__val">${(volumenAprox / 1000).toFixed(1)} t</span><span class="atr__nom">Volumen de calentamiento</span></div>` : ""}
    </div>

    ${hayGraficas ? `
      ${grafica({ nombre: "Carga por sesión", puntos: puntosPeso, tipo: "linea",
                  color: colorDe("--sis"), unidad: " kg", sel: puntoSel.tipo === "linea" ? puntoSel.i : null })}
      ${grafica({ nombre: "Volumen por sesión", puntos: puntosVol, tipo: "barras",
                  color: colorDe("--sis2"), unidad: " kg", sel: puntoSel.tipo === "barras" ? puntoSel.i : null })}`
    : `<div class="vt"><div class="vt__cab">Evolución</div>
        <p class="vt__txt">${mias.length === 1
          ? "Con una sesión no hay evolución que dibujar. A la siguiente aparece la gráfica."
          : "Aún no has registrado este ejercicio."}</p></div>`}

    <div class="vt">
      <div class="vt__cab ej__tecnicacab">
        <span>Técnica</span>
        <button class="ej__vermusc" data-vermusculos="1">${verMusculos ? "Ver movimiento" : "Ver músculos"}</button>
      </div>
      ${verMusculos ? siluetaHTML(ej) : `<div id="lienzo" class="lienzo"></div>`}
      <div class="ej__tabs">${tabs.map(t =>
        `<button class="ej__tab ${t.clave === tabActiva ? "on" : ""}" data-fichatab="${t.clave}">${esc(t.nombre)}</button>`).join("")}</div>
      ${contenidoFicha(ej, tabActiva)}
    </div>

    ${mias.length ? `<div class="vt">
      <div class="vt__cab">Registro</div>
      <table class="tabla">
        <tr><th>Fecha</th><th>Carga</th><th>Series</th><th>${corporal ? "Reps" : "1RM"}</th></tr>
        ${[...mias].reverse().map(f => {
          const m = P.marcaDe(f);
          return `<tr><td>${diaMes(f.f)}${f.fallado ? ` <span class="etq-fallo">Fallado</span>` : ""}</td><td>${f.kg} kg</td>
            <td>${f.series}×${f.reps}${ej.unilateral ? ` /${ej.unilateral}` : ""}</td>
            <td>${m ? `${m}${corporal ? "" : " kg"}${m === marca ? " ★" : ""}` : "—"}</td></tr>
            ${f.nota ? `<tr class="fila-nota"><td colspan="4">“${esc(f.nota)}”</td></tr>` : ""}`;
        }).join("")}
      </table>
    </div>` : ""}`;

  if (ej.figura && !verMusculos) {
    const host = $("lienzo");
    if (host) { const fig = buildFigure(ej.figura); host.append(fig.svg); animate(fig); }
  }
}

/* ============================================================
   LOGROS
   ============================================================ */
function pintarLogros() {
  stopAnim();
  const set = new Set(desbloqueados);
  const porRango = ORDEN_RANGO.map(r => ({ r, lista: LOGROS.filter(l => l.rango === r) }));

  $("app").innerHTML = `
    <div class="mision">
      <div class="mision__cab">Registro de logros</div>
      <h2 class="mision__tit">${set.size} / ${LOGROS.length}</h2>
      <div class="mision__lema">Desbloqueados por el Sistema</div>
    </div>
    ${porRango.map(({ r, lista }) => `
      <div class="grupo">
        <div class="grupo__cab"><span class="rango rango--mini" style="--rango:${COLOR_RANGO[r]}">${r}</span>
          <span>${lista.filter(l => set.has(l.id)).length}/${lista.length}</span></div>
        ${lista.map(l => {
          const ok = set.has(l.id);
          return `<div class="logro ${ok ? "logro--ok" : ""}" style="--rango:${COLOR_RANGO[r]}">
            <span class="logro__ico">${ok ? l.icono : "?"}</span>
            <span class="logro__txt">
              <b>${ok ? esc(l.nombre) : "Bloqueado"}</b>
              <small>${esc(l.desc)}</small>
            </span>
          </div>`;
        }).join("")}
      </div>`).join("")}`;
}

/* ============================================================
   HISTORIAL
   Las sesiones ya cerradas, agrupadas por semana. El día y el bloque
   se resuelven contra el programa activo AHORA, no el de cuando se
   entrenó — si cambiaste de programa entre medias, una fila vieja
   puede salir con el nombre de día de hoy. Es la misma asunción que ya
   hace volumenesDeBloque, no algo nuevo de esta vista.
   ============================================================ */
function pintarHistorial() {
  stopAnim();
  const sesiones = P.sesiones(filas);

  if (!sesiones.length) {
    $("app").innerHTML = `
      <div class="mision">
        <div class="mision__cab">Historial</div>
        <h2 class="mision__tit">Sin sesiones</h2>
        <div class="mision__lema">Todavía no has cerrado ninguna</div>
      </div>
      <div class="vt"><p class="vt__txt">En cuanto cierres tu primera sesión, aparece aquí.</p></div>`;
    return;
  }

  const porSemana = new Map();
  for (const s of sesiones) {
    const sem = s.filas[0].semana;
    if (!porSemana.has(sem)) porSemana.set(sem, []);
    porSemana.get(sem).push(s);
  }
  const semanas = [...porSemana.keys()].sort((a, b) => b - a);
  if (!semanasAbiertas) semanasAbiertas = new Set([semanas[0]]);

  /* El nombre del día puede no existir ya en el programa activo
     (p. ej. veniste de ppl6 y ahora estás en ppl3). */
  const nombreDia = n => { try { return dia(n); } catch { return null; } };

  /* Cardio (dia:-1) y movilidad (dia:0) no son un día de programa: no
     tienen carga que levantar y sus "series" son bloques/posturas, no
     repeticiones. La tabla de siempre (Carga · Series×reps) no encaja
     ahí, así que esas sesiones se listan aparte. */
  const filaSesion = s => {
    const clave = `${s.f}|${s.dia}`;
    const d = nombreDia(s.dia);
    const suelta = s.dia === -1 || s.dia === 0;
    const unidad = s.dia === -1 ? "bloque" : "postura";
    const rango = s.filas[0].rango;
    const huboFallo = s.filas.some(f => f.fallado);
    const xp = s.filas.reduce((a, f) => a + (f.xp || 0), 0);
    const abierta = sesionAbierta === clave;
    return `
      <button class="sesion ${abierta ? "sesion--abierta" : ""}" data-sesion="${esc(clave)}">
        <span class="sesion__dia">${esc(d ? d.nombre : s.filas[0].nombre)}</span>
        <span class="sesion__fecha">${diaMes(s.f)}</span>
        ${rango ? `<span class="rango rango--mini" style="--rango:${COLOR_RANGO[rango]}">${rango}</span>` : ""}
        <span class="sesion__meta">${suelta ? "" : `${miles(s.volumen)} kg · `}${s.minutos || "—"} min${
          huboFallo ? ` · <span class="etq-fallo">Fallo</span>` : ""}</span>
      </button>
      ${abierta ? `
        <div class="sesion__detalle">
          <table class="tabla">
            <tr><th>Ejercicio</th>${suelta ? "" : "<th>Carga</th>"}<th>${suelta ? "Hecho" : "Series"}</th></tr>
            ${s.filas.filter(f => f.series > 0).map(f => `
              <tr>
                <td>${esc(f.nombre)}${f.fallado ? ` <span class="etq-fallo">Fallado</span>` : ""}</td>
                ${suelta ? "" : `<td>${f.kg} kg</td>`}
                <td>${suelta
                  ? `${f.series} ${unidad}${f.series === 1 ? "" : "s"}`
                  : `${f.series}×${f.reps}${EJERCICIOS[f.ej]?.unilateral ? ` /${EJERCICIOS[f.ej].unilateral}` : ""}`}</td>
              </tr>`).join("")}
          </table>
          <p class="vt__pie">${miles(xp)} XP aprox.${suelta ? "" : ` · ${s.series} series`}</p>
        </div>` : ""}`;
  };

  $("app").innerHTML = `
    <div class="mision">
      <div class="mision__cab">Historial</div>
      <h2 class="mision__tit">${sesiones.length} sesión${sesiones.length === 1 ? "" : "es"}</h2>
      <div class="mision__lema">Todo lo entrenado, semana a semana</div>
    </div>
    ${semanas.map(sem => {
      const lista = porSemana.get(sem);
      const abierta = semanasAbiertas.has(sem);
      return `
      <div class="vt">
        <button class="vt__cab vt__cab--toggle" data-semana="${sem}">
          <span>Semana ${sem}</span>
          <span>${lista.length} sesión${lista.length === 1 ? "" : "es"} ${abierta ? "▾" : "▸"}</span>
        </button>
        ${abierta ? `<div class="sesiones">${lista.map(filaSesion).join("")}</div>` : ""}
      </div>`;
    }).join("")}`;
}

/* ============================================================
   MAPA DE CONSTANCIA
   La racha da un número; esto da la forma: dónde se rompió y cuánto
   duró. Escala secuencial de un solo tono, de claro a oscuro, con los
   cortes puestos en los tercios del propio historial — así el mapa
   dice algo tanto si mueves cinco toneladas por sesión como si mueves
   una.
   ============================================================ */
const SEMANAS_MAPA = 16;

function mapaHTML() {
  const porDia = new Map();
  for (const s of P.sesiones(filas)) porDia.set(s.f, (porDia.get(s.f) || 0) + s.volumen);
  if (!porDia.size) return "";

  const vols = [...porDia.values()].sort((a, b) => a - b);
  const corte = p => vols[Math.floor(vols.length * p)] ?? 0;
  const bajo = corte(0.34), medio = corte(0.67);
  const nivel = v => !v ? 0 : v <= bajo ? 1 : v <= medio ? 2 : 3;

  /* Se empieza en lunes para que cada columna sea una semana natural. */
  const fin = new Date(hoy());
  const inicio = new Date(fin);
  inicio.setDate(inicio.getDate() - (SEMANAS_MAPA * 7 - 1));
  inicio.setDate(inicio.getDate() - ((inicio.getDay() + 6) % 7));

  const celdas = [];
  for (let d = new Date(inicio); d <= fin; d.setDate(d.getDate() + 1)) {
    const f = d.toISOString().slice(0, 10);
    const v = porDia.get(f) || 0;
    celdas.push(`<i data-nivel="${nivel(v)}" title="${f}${v ? ` · ${miles(v)} kg` : ""}"></i>`);
  }

  return `<div class="vt">
      <div class="vt__cab">Constancia</div>
      <div class="mapa">${celdas.join("")}</div>
      <div class="mapa__pie">
        <span>${SEMANAS_MAPA} semanas</span>
        <span class="mapa__leyenda">menos
          <i data-nivel="0"></i><i data-nivel="1"></i><i data-nivel="2"></i><i data-nivel="3"></i>
        más</span>
      </div>
    </div>`;
}

/* ---------- peso corporal ---------- */
function corporalHTML() {
  const h = E.corporal || [];
  const actual = borradorPeso();
  const sinGuardar = pesoBorrador !== null && pesoBorrador !== pesoActual();
  const primero = h.length ? h[0].kg : null;
  const cambio = primero !== null && h.length > 1 ? +(actual - primero).toFixed(1) : null;

  return `<div class="vt">
      <div class="vt__cab">Peso corporal</div>
      <p class="vt__txt">Se usa para contar el volumen real de flexiones, dominadas y fondos,
      así que conviene que esté al día.${cambio !== null
        ? ` Desde el primer apunte: <b>${cambio > 0 ? "+" : ""}${cambio} kg</b>.` : ""}</p>
      <div class="corporal">
        <button class="mini" data-corporal="-1">−</button>
        <span class="corporal__val">${actual}<small>kg</small></span>
        <button class="mini" data-corporal="1">+</button>
        <button class="btn ${sinGuardar ? "btn--go" : ""}" id="anotarPeso">Anotar hoy</button>
      </div>
      ${h.length >= 2 ? grafica({
        nombre: "Peso corporal", tipo: "linea", unidad: " kg",
        puntos: h.map(p => ({ f: p.f, v: p.kg })),
        color: colorDe("--exito"), sel: puntoSel.tipo === "linea" ? puntoSel.i : null
      }) : `<p class="vt__pie">Con dos apuntes en días distintos aparece la gráfica.</p>`}
    </div>`;
}

/**
 * Gráfica de dos líneas (peso, masa grasa estimada) para cruzar la
 * evolución del peso con la de la composición corporal — SVG propio,
 * sin las anotaciones interactivas de `grafica()` (esto es un
 * resumen, no una serie con puntos que se puedan tocar uno a uno).
 */
function graficaComposicionHTML(puntos) {
  const W = 290, H = 120, IZQ = 10, DER = 10, ARR = 10, ABA = 6;
  const anchoUtil = W - IZQ - DER, altoUtil = H - ARR - ABA;
  const pesos = puntos.map(p => p.pesoKg), grasas = puntos.map(p => p.masaGrasaKg);
  const todos = [...pesos, ...grasas];
  let min = Math.min(...todos), max = Math.max(...todos);
  if (max === min) max += 1;
  const margen = (max - min) * 0.1;
  const y0 = min - margen, y1 = max + margen;
  const ejeY = v => ARR + (1 - (v - y0) / (y1 - y0)) * altoUtil;
  const ejeX = i => puntos.length === 1 ? IZQ + anchoUtil / 2 : IZQ + anchoUtil * i / (puntos.length - 1);
  const linea = (vals, color, punteada) => {
    const pts = vals.map((v, i) => `${ejeX(i).toFixed(1)},${ejeY(v).toFixed(1)}`).join(" ");
    return `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="${punteada ? 2 : 2.5}"
      ${punteada ? `stroke-dasharray="4 3"` : ""} stroke-linecap="round" stroke-linejoin="round"/>`;
  };
  const primero = puntos[0], ultimo = puntos[puntos.length - 1];
  const cSis = colorDe("--sis"), cSis2 = colorDe("--sis2"), cLinea = colorDe("--linea");

  return `<div class="grafica-combo">
      <svg viewBox="0 0 ${W} ${H}">
        <line x1="${IZQ}" y1="${ARR}" x2="${IZQ}" y2="${H - ABA}" stroke="${cLinea}" stroke-width="1"/>
        <line x1="${IZQ}" y1="${H - ABA}" x2="${W - DER}" y2="${H - ABA}" stroke="${cLinea}" stroke-width="1"/>
        ${linea(pesos, cSis, false)}
        ${linea(grasas, cSis2, true)}
      </svg>
      <div class="grafica-combo__leyenda">
        <span><i style="background:${cSis}"></i>Peso · ${primero.pesoKg} → ${ultimo.pesoKg} kg</span>
        <span><i style="background:${cSis2}"></i>Masa grasa est. · ${primero.masaGrasaKg} → ${ultimo.masaGrasaKg} kg</span>
      </div>
    </div>`;
}

function grasaCorporalHTML() {
  const h = E.grasaCorporal || [];
  const actual = borradorGrasa();
  const sinGuardar = grasaBorrador !== null && grasaBorrador !== grasaActual();
  const cruce = N.composicionCorporal(E.corporal || [], h);

  return `<div class="vt">
      <div class="vt__cab">% de grasa corporal</div>
      <p class="vt__txt">Opcional — en cuanto lo anotas, el cálculo de objetivo pasa de Mifflin-St
      Jeor a Katch-McArdle (más preciso con buena masa muscular). Se anota menos a menudo que el
      peso: los días sin apunte usan el último dato real, nunca uno inventado.</p>
      <div class="corporal">
        <button class="mini" data-grasa="-1">−</button>
        <span class="corporal__val">${actual}<small>%</small></span>
        <button class="mini" data-grasa="1">+</button>
        <button class="btn ${sinGuardar || !h.length ? "btn--go" : ""}" id="anotarGrasa">Anotar hoy</button>
      </div>
      ${cruce.length >= 2
        ? graficaComposicionHTML(cruce)
        : `<p class="vt__pie">Con un apunte de grasa y dos de peso en días distintos aparece la
           gráfica cruzada.</p>`}
    </div>`;
}

/* ============================================================
   PERFIL
   ============================================================ */
function pintarPerfil() {
  stopAnim();
  const st = P.estadisticas(filas);
  const r = P.racha(filas);
  const ultimas = [...filas]
    .sort((a, b) => (b.ts || b.f).localeCompare(a.ts || a.f))
    .slice(0, 10);

  if (recalcularNutricionSiHaceFalta()) guardar();
  const nutri = nutricionEstado();
  const rNutri = N.rachaNutricion(porDiaNutricionCumplido());

  /* Ejercicios ya registrados primero: son los que se vienen a mirar. */
  const entrenados = new Set(filas.map(f => f.ej).filter(Boolean));
  const eqActivo = equipoActivo();
  const cargasBarraActuales = equipo.cargasBarra(eqActivo);
  const arsenal = Object.entries(EJERCICIOS)
    .map(([clave, e]) => ({ clave, ...e, veces: filas.filter(f => f.ej === clave).length }))
    .sort((a, b) => b.veces - a.veces || a.nombre.localeCompare(b.nombre));

  const editor = f => `<tr class="fila-edit"><td colspan="5">
      <div class="edit">
        <div class="edit__campo"><span>Carga</span>
          <button class="mini" data-editar="${f.id}" data-campo="kg" data-dir="-1">−</button>
          <b>${f.kg} kg</b>
          <button class="mini" data-editar="${f.id}" data-campo="kg" data-dir="1">+</button>
        </div>
        <div class="edit__campo"><span>Series</span>
          <button class="mini" data-editar="${f.id}" data-campo="series" data-dir="-1">−</button>
          <b>${f.series}</b>
          <button class="mini" data-editar="${f.id}" data-campo="series" data-dir="1">+</button>
        </div>
        <div class="edit__campo"><span>Reps</span>
          <button class="mini" data-editar="${f.id}" data-campo="reps" data-dir="-1">−</button>
          <b>${f.reps}</b>
          <button class="mini" data-editar="${f.id}" data-campo="reps" data-dir="1">+</button>
        </div>
        <button class="btn btn--fantasma btn--peligro" data-borrar="${f.id}">Borrar esta línea</button>
      </div>
    </td></tr>`;

  /* Rejilla de tarjetas (spec 010, mejora UI) en vez de una lista de
     filas: mismo estado `panelesAbiertos`, contenido calculado aquí y
     pintado debajo de la rejilla solo para las tarjetas abiertas. */
  const secciones = [
    r.mejor && { id: "racha", icono: "🔥", titulo: "Racha",
      subtitulo: r.rota ? `Rota · mejor ${r.mejor}` : `${r.actual} sesiones · mejor ${r.mejor}`,
      contenido: `
        <div class="vt">
          <p class="vt__txt">${r.rota
            ? `Sin entrenar desde hace <b>${r.diasDesde} días</b>. La racha está a cero.`
            : `<b>${r.actual} sesiones</b> seguidas sin dejar pasar más de ${P.DIAS_GRACIA} días.`}
            Tu mejor marca son <b>${r.mejor}</b>.</p>
          <p class="vt__pie">Cuentan los días entre sesiones, no los días seguidos:
          descansar forma parte del plan, desaparecer no.</p>
        </div>` },

    { id: "nutricion", icono: "🍽", titulo: "Nutrición",
      subtitulo: nutri.objetivo ? `${miles(nutri.objetivo.kcal)} kcal objetivo` : "Sin configurar",
      contenido: `
        ${corporalHTML()}
        ${grasaCorporalHTML()}
        <div class="vt">
          <p class="vt__txt">Edad y altura son opcionales — hacen falta para Mifflin-St Jeor a menos
          que ya hayas anotado un % de grasa arriba (entonces se usa Katch-McArdle, más preciso). El
          objetivo se recalcula solo si el peso o el % de grasa cambian.</p>

          <p class="vt__pie">Sexo</p>
          <div class="tema">
            ${[["hombre", "Hombre"], ["mujer", "Mujer"]].map(([v, n]) =>
              `<button class="tema__b" data-nutrisexo="${v}" aria-pressed="${nutri.perfil.sexo === v}">${n}</button>`).join("")}
          </div>

          <p class="vt__pie">Actividad</p>
          <div class="tema" style="grid-template-columns:1fr 1fr">
            ${N.NIVELES_ACTIVIDAD.map(a =>
              `<button class="tema__b" data-nutriactividad="${a.clave}" aria-pressed="${nutri.perfil.actividad === a.clave}">${esc(a.nombre.split(" (")[0])}</button>`).join("")}
          </div>

          <p class="vt__pie">Objetivo</p>
          <div class="tema">
            ${[[-15, "Déficit"], [0, "Mantenimiento"], [10, "Superávit"]].map(([v, n]) =>
              `<button class="tema__b" data-nutriobjetivo="${v}" aria-pressed="${nutri.perfil.objetivoPct === v}">${n}</button>`).join("")}
          </div>

          <label class="campo"><span>Edad · opcional</span>
            <input id="nutriEdad" type="number" inputmode="numeric" min="10" max="100" placeholder="años" value="${nutri.perfil.edad ?? ""}"></label>
          <label class="campo"><span>Altura · opcional</span>
            <input id="nutriAltura" type="number" inputmode="numeric" min="100" max="230" placeholder="cm" value="${nutri.perfil.alturaCm ?? ""}"></label>
          <button class="btn" id="guardarNutriPerfil">Guardar datos</button>

          ${nutri.objetivo ? `
            <p class="vt__pie" style="margin-top:12px">Objetivo diario (con ${pesoActual()} kg)</p>
            <div class="atributos">
              <div class="atr"><span class="atr__cl">KCAL</span><span class="atr__val">${miles(nutri.objetivo.kcal)}</span><span class="atr__nom">Objetivo</span></div>
              <div class="atr"><span class="atr__cl">PROT</span><span class="atr__val">${nutri.objetivo.proteina}</span><span class="atr__nom">g</span></div>
              <div class="atr"><span class="atr__cl">GRASA</span><span class="atr__val">${nutri.objetivo.grasa}</span><span class="atr__nom">g</span></div>
              <div class="atr"><span class="atr__cl">CARBO</span><span class="atr__val">${nutri.objetivo.carbo}</span><span class="atr__nom">g</span></div>
            </div>
            ${rNutri.actual ? `<p class="vt__pie">Racha de nutrición: <b>${rNutri.actual}</b> día${rNutri.actual === 1 ? "" : "s"} cumplidos seguidos (mejor: ${rNutri.mejor})</p>` : ""}
          ` : `<p class="vt__pie" style="margin-top:12px">Faltan datos: sexo y actividad, más (edad y altura) o (% de grasa).</p>`}
        </div>` },

    { id: "equipo", icono: "🏋️", titulo: "Equipo",
      subtitulo: `${eqActivo.barra.activo ? eqActivo.barra.kg + " kg" : "sin barra"} · ${cargasBarraActuales.length} cargas`,
      contenido: `
        <div class="vt">
          <p class="vt__txt">Activa o desactiva lo que tengas a mano — lo desactivado no se ofrece en la
          repesca ni al cambiar un ejercicio de sitio.</p>
          <div class="equipo__cats">${equipoCategoriasHTML(eqActivo)}</div>

          <p class="vt__pie" style="margin-top:12px">Barra</p>
          <div class="corporal">
            <button class="mini" data-equipo-barra="-1">−</button>
            <span class="corporal__val">${eqActivo.barra.kg}<small>kg</small></span>
            <button class="mini" data-equipo-barra="1">+</button>
          </div>

          <p class="vt__pie">Discos (bumpers)</p>
          ${pesosEditorHTML("discos", eqActivo.discos.pesos)}

          <p class="vt__pie">Fraccionales</p>
          ${pesosEditorHTML("fraccionales", eqActivo.discos.fraccionales)}

          <p class="vt__pie">Mancuernas</p>
          ${pesosEditorHTML("mancuerna", eqActivo.mancuerna.pesos)}

          <p class="vt__pie">Bandas elásticas (resistencia equivalente)</p>
          ${pesosEditorHTML("banda", eqActivo.banda.pesos)}

          <p class="vt__txt" style="margin-top:10px">${cargasBarraActuales.length
            ? `Salen <b>${cargasBarraActuales.length} cargas</b> de barra distintas, de ${cargasBarraActuales[0].total} a ${equipo.topeBarra(eqActivo)} kg.`
            : "Barra o discos desactivados: no hay cargas de barra que montar ahora mismo."}</p>
          ${cargasBarraActuales.length ? `<table class="tabla">
            <tr><th>Total</th><th>Izquierda</th><th>Derecha</th></tr>
            ${cargasBarraActuales.map(c => `<tr><td>${c.total} kg</td><td>${c.izq.join(" + ") || "—"}</td><td>${c.der.join(" + ") || "—"}</td></tr>`).join("")}
          </table>` : ""}
        </div>` },

    { id: "arsenal", icono: "⚔️", titulo: "Arsenal", subtitulo: `${arsenal.length} ejercicios`,
      contenido: `
        <div class="vt">
          <div class="arsenal">${arsenal.map(e => {
            const sinMaterial = !disponible(e);
            return `
            <button class="arma ${entrenados.has(e.clave) ? "" : "arma--nueva"} ${sinMaterial ? "arma--sinmaterial" : ""}" data-ficha="${e.clave}">
              <span class="arma__nom">${esc(e.nombre)}</span>
              <span class="arma__meta">${sinMaterial
                ? "Sin material"
                : `<i class="arma__punto" title="Con material para hacerlo"></i>${esc(e.grupo)}${e.veces ? ` · ${e.veces} ses.` : " · sin estrenar"}`}</span>
            </button>`;
          }).join("")}</div>
        </div>` },

    { id: "programa", icono: "📋", titulo: "Programa", subtitulo: esc(programaActivo().nombre),
      contenido: `
        <div class="vt">
          <div class="arsenal">${Object.values(PROGRAMAS).map(p => `
            <button class="arma ${p.id === programaActivo().id ? "" : "arma--nueva"}" data-programa="${p.id}">
              <span class="arma__nom">${esc(p.nombre)}</span>
              <span class="arma__meta">${nucleo(p).length} días · ${totalSeries(p)} series/semana</span>
            </button>`).join("")}</div>
          <p class="vt__pie">${esc(programaActivo().resumen)}</p>
        </div>` },

    ultimas.length && { id: "ultimas", icono: "📈", titulo: "Últimas series", subtitulo: `${ultimas.length} recientes`,
      contenido: `
        <div class="vt">
          <p class="vt__pie" style="margin:0 0 8px">Toca una línea para corregirla o borrarla.</p>
          <table class="tabla tabla--editable">
            <tr><th>Fecha</th><th>Ejercicio</th><th>Carga</th><th>Series</th><th></th></tr>
            ${ultimas.map(f => `
              <tr class="${editando === f.id ? "fila--abierta" : ""}" data-fila="${f.id}">
                <td>${diaMes(f.f)}</td><td>${esc(f.nombre)}${f.fallado ? ` <span class="etq-fallo">Fallado</span>` : ""}</td><td>${f.kg} kg</td>
                <td>${f.series}×${f.reps}${EJERCICIOS[f.ej]?.unilateral ? ` /${EJERCICIOS[f.ej].unilateral}` : ""}</td><td class="tabla__ir">${editando === f.id ? "×" : "✎"}</td>
              </tr>
              ${editando === f.id ? editor(f) : ""}`).join("")}
          </table>
        </div>` },

    { id: "aspecto", icono: "🎨", titulo: "Aspecto",
      subtitulo: { auto: "Automático", oscuro: "Oscuro", claro: "Claro" }[temaGuardado()] ?? "Automático",
      contenido: `
        <div class="vt">
          <p class="vt__txt">En automático sigue lo que tenga puesto el móvil.
          La cabecera y el menú se quedan oscuros siempre: encima va la hora
          y la batería del iPhone, en blanco.</p>
          <div class="tema">
            ${[["auto", "Automático"], ["oscuro", "Oscuro"], ["claro", "Claro"]].map(([v, n]) =>
              `<button class="tema__b" data-tema="${v}" aria-pressed="${temaGuardado() === v}">${n}</button>`).join("")}
          </div>
        </div>` },

    { id: "datos", icono: "💾", titulo: "Datos", subtitulo: `${filas.length} series · motor ${motor}`,
      contenido: `
        <div class="vt">
          <p class="vt__txt">Motor: <code>${motor}</code> · <b>${filas.length}</b> series guardadas en este móvil.</p>
          <p class="vt__txt">${E.copia
            ? `Última copia: <b>${E.copia.fecha}</b>, con ${E.copia.sesiones} sesiones.`
            : "Todavía no has guardado ninguna copia."}
            Si borras el icono de la pantalla de inicio o limpias Safari, se va todo.</p>
          <p class="vt__pie">${esc(OFF.ATRIBUCION_ODBL)}</p>
          <div class="acciones">
            <button class="btn" id="expJson">Descargar copia de seguridad</button>
            <button class="btn" id="impJson">Añadir copia</button>
            <button class="btn" id="expCsv">Exportar historial (CSV)</button>
            <button class="btn" id="semana">Empezar semana ${E.semana + 1}</button>
            <button class="btn btn--fantasma" id="cambiarFicha">Cambiar de cazador</button>
          </div>
          <input type="file" id="ficheroCopia" accept="application/json,.json" hidden>
        </div>` }
  ].filter(Boolean);

  $("app").innerHTML = `
    <div class="mision">
      <div class="mision__cab">Ficha de cazador</div>
      <h2 class="mision__tit">${esc(cazador.nombre)}</h2>
      <div class="mision__lema">Rango ${st.rango} · nivel ${st.nivel} · ${miles(st.xp)} XP</div>
    </div>

    <div class="atributos">
      ${P.atributos(st, r).map(a => `
        <div class="atr">
          <span class="atr__cl">${a.clave}</span>
          <span class="atr__val">${a.valor}${a.sufijo}</span>
          <span class="atr__nom">${a.nombre}</span>
        </div>`).join("")}
    </div>

    ${mapaHTML()}

    ${perfilAbierto ? `
      <div class="paneles">
        <button class="btn btn--fantasma" data-perfil-atras="1">← Atrás</button>
        ${secciones.find(s => s.id === perfilAbierto)?.contenido ?? ""}
      </div>
    ` : `
      <div class="tablero-panel">
        ${secciones.map(s => tarjetaPanel(s.id, s.icono, s.titulo, s.subtitulo)).join("")}
      </div>
    `}`;
}

/* ============================================================
   MANUAL
   ============================================================ */
function pintarManual() {
  stopAnim();
  $("app").innerHTML = `<div class="manual">
    <div class="vt">
      <div class="vt__cab">Cómo funciona</div>
      <p class="vt__txt">Cada día es una misión. Marcas las series conforme las haces, ajustas
      las reps logradas y al acabar pulsas <b>Arise</b>: ahí se guarda todo, se reparte la XP y
      el Sistema comprueba si has desbloqueado algo.</p>
    </div>

    <h2>La semana</h2>
    <p class="vt__pie">Programa activo: <b>${esc(programaActivo().nombre)}</b>. Se cambia
    desde la ficha de cazador.</p>
    <table class="tabla">
      <tr><th>Día</th><th>Misión</th><th>Qué toca</th></tr>
      ${programaActivo().dias.map(d => `<tr><td>${esc(d.cuando)}</td>
        <td>${esc(d.nombre)}${d.suelto ? " · suelta" : ""}</td><td>${esc(d.trabaja)}</td></tr>`).join("")}
      <tr><td colspan="3">Descanso: ${esc(programaActivo().descansos)}</td></tr>
    </table>
    <p>Cada patrón (empuje, tirón, pierna) cubre el cuerpo entero, hombro pequeño, brazo
    y cadera incluidos. El programa de 6 días repite los mismos tres patrones dos veces por
    semana. El peso muerto pesado va siempre en el día de tirón y el rumano en el de pierna,
    así que nunca caen en el mismo día ni la lumbar carga dos veces seguidas sin haber
    tocado antes otro patrón.</p>

    <h2>Elegir programa</h2>
    <p>Por defecto sigues el <strong>PPL de 3 días</strong>: empuje, tirón y pierna, una vez
    por semana, con hueco de sobra para trabajo, estudios y vida. Si hay más tiempo y ganas
    de volumen, cambia a <strong>PPL x2 de 6 días</strong> desde la ficha de cazador: los
    mismos tres patrones, dos veces por semana. Cambiar de programa no borra historial ni
    pesos guardados — solo cambia qué días salen y cuántos hay.</p>

    <h2>Repesca</h2>
    <p>El último día del programa (4 en PPL3, 7 en PPL6) es la <strong>repesca</strong>: se
    rellena solo con lo que se haya quedado sin ninguna serie esa semana, hasta un tope de
    <strong>7 ejercicios</strong> repartidos entre los días que falten. Si no falta nada,
    sale vacía. No cuenta como núcleo — no hace falta completarla para pasar de semana ni
    suma al contador de días — pero sí suma a volumen, XP y estadísticas como cualquier otra
    serie.</p>
    <div class="alerta"><p>No la uses para meter una sesión entera perdida: el tope de 7 es
    a propósito. Colar sesiones seguidas sin descanso acumula fatiga y a las tres semanas se
    te caen las reps en todo.</p></div>

    <h2>Calentamiento y aproximación</h2>
    <p>Antes del primer ejercicio de cada día hay un bloque de <strong>calentamiento
    general</strong>: cardio suave y movilidad del patrón de ese día. No se marca, es la
    entrada en calor antes de cargar la barra.</p>
    <p>Si el peso de trabajo pide más de 10 kg sobre la barra vacía, debajo del selector de
    peso sale la <strong>rampa de aproximación</strong>: series con menos peso y más reps
    para llegar fresco a la serie de trabajo. Se marcan igual que las series normales, pero
    no cuentan como ninguna de las series efectivas ni activan <em>Sube el peso</em> — son
    calentamiento, no trabajo.</p>

    <h2>Cómo elegir el peso</h2>
    <p>Cada serie termina con <strong>2–3 reps en recámara</strong>. Si acabas y podrías hacer cinco más, es calentamiento. Si fallas antes de llegar al rango, has puesto demasiado. Ajusta el mismo día, no la semana siguiente.</p>

    <h2>Los que van por lado</h2>
    <p>La búlgara, el remo landmine y el press landmine salen marcados como <em>(izq + der)</em>. El rango de reps es de <strong>un solo miembro</strong>, y la serie no está hecha hasta que has completado los dos: marcas el botón al terminar el segundo. El descanso es entre series — entre pierna y pierna basta con lo que tardas en cambiar.</p>
    <p>Anota las reps de un lado, las que has hecho con el más flojo. El Sistema ya cuenta el volumen y la XP por los dos.</p>

    <h2>Doble progresión</h2>
    <p>Tus discos solo permiten saltos de 10 kg, y eso es brutal en press militar (30→40 es un +33%). Por eso no se sube peso hasta agotar las reps:</p>
    <ul>
      <li>Empiezas abajo del rango — por ejemplo <code>4×8</code>.</li>
      <li>Sumas reps cada semana con el mismo peso hasta el techo — <code>4×12</code>.</li>
      <li>Cuando completas todas las series arriba del rango, el Sistema marca <em>Sube el peso</em>.</li>
      <li>Subes 10 kg y vuelves abajo del rango. Otra vez a escalar.</li>
    </ul>
    <p>Si el salto de 10 te tumba, haz un microciclo: dos series con el peso nuevo y dos con el viejo hasta que aguantes las cuatro.</p>

    <h2>Descarga</h2>
    <p>Cada <strong>seis u ocho semanas</strong>, una semana suave: mismos días y mismos ejercicios, pero <strong>la mitad de series</strong> y el mismo peso. No se pierde nada — es cuando el cuerpo termina de asimilar lo anterior y lo que se vino abajo vuelve arriba. Si llevas tres semanas notando que las reps bajan en todo a la vez, no esperes a la octava: descarga ya.</p>

    <h2>Seguridad entrenando solo</h2>
    <div class="alerta"><p>Esto no es opcional. Entrenas en casa sin nadie que te saque de debajo de la barra.</p></div>
    <ul>
      <li>Banco <strong>dentro del rack</strong>, pines a la altura del pecho, siempre.</li>
      <li>En banca, <strong>sin collarines</strong>. Si te quedas atrapado, inclinas la barra y los discos caen solos.</li>
      <li>En banca no llegues nunca al fallo.</li>
      <li>En sentadilla, pines a la altura del punto más bajo del recorrido.</li>
      <li>Peso muerto: si la espalda se redondea, la serie ha terminado. Da igual lo que ponga la app.</li>
    </ul>

    <h2>Los muñecos</h2>
    <p>El botón del ojo abre un esquema animado que alterna entre las dos posiciones del movimiento, más las claves de ejecución. Los pines rojos del rack están dibujados a propósito: son la parte que te saca de debajo de la barra.</p>
    <p>Son esquemas, no un vídeo. Sirven para recordar el patrón, no para aprenderlo de cero. Si un movimiento es nuevo para ti, grábate de lado la primera serie y compárala.</p>

    <h2>Niveles y rangos</h2>
    <p>Cada serie da XP según el peso movido por las reps. Cerrar la misión entera suma ${P.XP_MISION} XP de golpe. Los rangos van de <strong>E</strong> a <strong>S</strong>:</p>
    <table class="tabla">
      <tr><th>Rango</th><th>Desde nivel</th></tr>
      ${[...P.RANGOS].reverse().map(r => `<tr><td>${r.rango}</td><td>${r.desde}</td></tr>`).join("")}
    </table>
    <p>No es una medida científica de nada: es una forma de que un martes de noviembre apetezca bajar al garaje.</p>

    <h2>Cuando 100 kg se queden cortos</h2>
    <p>Te pasará antes en peso muerto, sentadilla y gemelo. A partir de ahí el estímulo sale de otro sitio: 4 segundos de bajada, pausas de 2–3 s en el punto difícil, reps 1.5, descansos más cortos, o pasar a unilateral. Con trabajo a una pierna y 100 kg tienes cuerda para muchísimo tiempo.</p>

    <h2>Cardio y déficit</h2>
    <ul>
      <li>Nada de correr por ahora — las rodillas te lo cobrarían. Caminar rápido, bici o elíptica.</li>
      <li>Los pasos diarios mueven más la báscula que cualquier sesión de cardio machaque.</li>
      <li>Proteína alta y dormir. Sin eso, el déficit se come el músculo en lugar de la grasa.</li>
      <li>Si a las 3–4 semanas se te caen las reps <em>en todo a la vez</em>, no es falta de ganas: es déficit demasiado agresivo o poco sueño.</li>
    </ul>

    <h2>Salud de iPhone</h2>
    <p>Ninguna web puede escribir en Salud — Apple solo lo permite a apps nativas. La vía real es <strong>Atajos</strong>: acción <code>Iniciar entrenamiento</code> de tipo <em>Fuerza funcional</em>, y otro atajo con <code>Finalizar entrenamiento</code> al acabar. Añádelo a la pantalla de inicio junto a esta app.</p>
  </div>`;
}

/* ============================================================
   PINTADO GENERAL
   ============================================================ */
function pintar() {
  if (vista === "puerta" || !cazador) {
    $("cabecera").innerHTML = ""; $("nav").innerHTML = "";
    pintarPuerta(); return;
  }
  pintarCabecera();
  pintarNav();
  if (vista === "logros") pintarLogros();
  else if (vista === "historial") pintarHistorial();
  else if (vista === "perfil") pintarPerfil();
  else if (vista === "manual") pintarManual();
  else if (vista === "menus") pintarMenus();
  else if (vista === "ejercicio") pintarEjercicio();
  else if (vista === "movilidad") pintarMovilidad();
  else if (vista === "cardio") pintarCardio();
  else if (vista === "nutricion") pintarNutricion();
  else if (vista === "resultado") pintarResultado();
  else if (vista === "dia") pintarDia();
  else pintarMisiones();
}

/* ---------- descanso ----------
   Contra el reloj, no contando tics: al bloquear la pantalla o irte a
   otra app, el navegador congela los temporizadores y el descanso se
   quedaba parado. Guardando la hora de fin, al volver sale la cuenta
   de verdad aunque no haya corrido nada mientras tanto. */
let idDescanso = null, finDescanso = 0, totalDescanso = 0;

function empezarDescanso(seg) {
  clearInterval(idDescanso);
  totalDescanso = seg;
  finDescanso = Date.now() + seg * 1000;
  $("descanso").classList.add("on");
  ticDescanso();
  idDescanso = setInterval(ticDescanso, 250);
}
function ticDescanso() {
  const quedan = Math.max(0, Math.ceil((finDescanso - Date.now()) / 1000));
  $("descansoT").textContent = mmss(quedan);
  $("descansoF").style.width = (quedan / totalDescanso * 100) + "%";
  if (quedan <= 0) acabarDescanso(true);
}
function acabarDescanso(completo) {
  clearInterval(idDescanso); idDescanso = null;
  $("descanso").classList.remove("on");
  if (completo) { try { navigator.vibrate?.([120, 60, 120]); } catch (e) {} }
}
/* Al volver a la app, recalcular ya: puede que el descanso haya acabado. */
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && idDescanso) ticDescanso();
});

/* ---------- pantalla encendida ----------
   Entre series pasan dos minutos y el móvil se bloquea solo; vuelves
   con las manos ocupadas y hay que despertarlo. El bloqueo se suelta
   al terminar la sesión, y el navegador lo suelta también al pasar a
   segundo plano: por eso se vuelve a pedir al recuperar el foco. */
async function mantenerPantalla(encendida) {
  try {
    if (encendida && !candado && navigator.wakeLock) {
      candado = await navigator.wakeLock.request("screen");
      candado.addEventListener("release", () => { candado = null; });
    } else if (!encendida && candado) {
      await candado.release();
      candado = null;
    }
  } catch (e) { candado = null; }        // sin permiso o sin soporte: da igual
}
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && E?.iniciada) mantenerPantalla(true);
});

/* ---------- cronómetro de isométricos ----------
   La plancha se mide en segundos y contarlos de cabeza mientras
   aguantas no sale bien. Escribe directamente en el número para no
   repintar la vista entera cuatro veces por segundo. */
function alternarCrono(ej) {
  if (cron?.sesionId === ej.sesionId) { pararCrono(ej); return; }
  if (cron) clearInterval(cron.id);
  cron = { sesionId: ej.sesionId, desde: Date.now() };
  cron.id = setInterval(() => {
    const el = document.querySelector(`[data-cronoval="${cron.sesionId}"]`);
    if (el) el.textContent = Math.round((Date.now() - cron.desde) / 1000);
  }, 250);
  repintarQuieto();
}

async function pararCrono(ej) {
  if (!cron) return;
  const segundos = Math.round((Date.now() - cron.desde) / 1000);
  clearInterval(cron.id);
  cron = null;
  if (ej && segundos > 0) { serie(ej).reps = segundos; await guardar(); }
  repintarQuieto();
}

/* ---------- guardar ---------- */
const guardar = () => DB.estado.guardar(E);

/* Ahora scrollea el contenedor del contenido, no la ventana. */
const arriba = () => { $("app").scrollTop = 0; };
function repintarQuieto() {
  const y = $("app").scrollTop;
  pintar();
  $("app").scrollTop = y;
}

/* ---------- logros ---------- */
async function revisarLogros(ultima = null, diasNucleo = nucleo(programaActivo()).length) {
  const ctx = P.contexto({ estado: E, filas, ultima, diasNucleo });
  const nuevos = P.evaluar(ctx, desbloqueados);
  for (const l of nuevos) {
    desbloqueados.push(l.id);
    await DB.logros.desbloquear(cazador.id, l.id);
    aviso(`<b>Logro desbloqueado</b><span>${l.icono} ${esc(l.nombre)}</span>`, "logro");
  }
  return nuevos;
}

/* ---------- terminar sesión ---------- */
let cerrando = false;

async function terminarSesion() {
  /* Guardar tarda: sin esto, dos toques separados podrían solaparse. */
  if (cerrando) return;
  cerrando = true;
  try { await cerrarSesion(); } finally { cerrando = false; }
}

/**
 * Cierra la semana de movilidad. Una sola fila para toda la sesión:
 * no hay volumen ni progresión que repartir por postura. El XP es
 * fijo y solo se gana completando las cinco, no a prorrata.
 */
async function cerrarMovilidad() {
  if (cerrando) return;
  cerrando = true;
  try {
    const sesion = E.sesion.movilidad || {};
    const hechos = MOVILIDAD.filter(b => sesion[b.clave]).length;
    if (!hechos) { aviso("No has marcado ninguna postura"); return; }

    const completa = hechos === MOVILIDAD.length;
    const fecha = hoy(), ahora = new Date();
    const nota = ($("notaSesion")?.value ?? E.nota ?? "").trim().slice(0, 280);
    const brutos = E.iniciada ? Math.round((ahora - new Date(E.iniciada)) / 60000) : null;
    const minutos = brutos != null && brutos > 0 && brutos <= 300 ? brutos : null;
    const antes = P.estadisticas(filas);

    /* Sin volumen ni récord que valga aquí: el rango de una semana de
       movilidad se limita a lo hecho, nunca sube a A o S. */
    const rango = P.rangoSesion({ pct: hechos / MOVILIDAD.length, volumen: 0, volMedio3: null, volRecordBloque: false, huboFallo: false });
    const fila = {
      cazador: cazador.id, f: fecha, ts: ahora.toISOString(),
      semana: E.semana, dia: 0, ej: "movilidad", nombre: "Semana de movilidad",
      implemento: "corporal", kg: 0, carga: 0, minutos, nota, lados: 1,
      series: hechos, reps: 0, volumen: 0, xp: completa ? XP_MOVILIDAD : 0, rango
    };
    await DB.historial.anadir([fila]);
    filas.push(fila);
    delete E.sesion.movilidad;
    E.iniciada = null; E.nota = "";
    mantenerPantalla(false);
    await guardar();

    const despues = P.estadisticas(filas);
    if (despues.rango !== antes.rango) {
      aviso(`<b>Ascenso de rango</b><span>Rango ${despues.rango}</span>`, "rango");
    } else if (despues.nivel > antes.nivel) {
      aviso(`<b>Subida de nivel</b><span>Nivel ${despues.nivel}</span>`, "nivel");
    }

    /* Una semana de movilidad solo tiene un "día": completarla ya es
       la semana entera, para los logros que miran días distintos. */
    await revisarLogros({
      dia: 0, volumen: 0, series: hechos, subidas: 0, completa,
      hora: ahora.getHours(), diasParado: 0, minutos, records: 0
    }, completa ? 1 : nucleo(programaActivo()).length);

    resultadoSesion = {
      bloque: "movilidad", nombreDia: "Movilidad", lema: "Recarga antes de la siguiente carga",
      rango, fecha, volumen: 0, minutos, series: hechos, xp: completa ? XP_MOVILIDAD : 0,
      hito: null,
      ejercicios: MOVILIDAD.filter(b => sesion[b.clave]).map(b => ({
        nombre: b.nombre, kg: 0, series: 1, reps: b.segundos, fallado: false, unilateral: !!b.unilateral, segundos: true
      }))
    };
    vista = "resultado";
    pintar(); arriba();
  } finally { cerrando = false; }
}

/**
 * Cierra el cardio suelto. Transversal, no semanal — se puede hacer
 * cualquier día, antes o después de la sesión de fuerza, o los dos:
 * `dia: -1` como sentinela (movilidad ya usa 0) para que sea su propia
 * fila, sin pisar ningún día real de programa.
 */
async function cerrarCardio() {
  if (cerrando) return;
  cerrando = true;
  try {
    const sesion = E.sesion.cardio || {};
    const hechos = CARDIO.filter(b => sesion[b.clave]).length;
    if (!hechos) { aviso("No has marcado ningún bloque"); return; }

    const completa = hechos === CARDIO.length;
    const fecha = hoy(), ahora = new Date();
    const nota = ($("notaSesion")?.value ?? E.nota ?? "").trim().slice(0, 280);
    const brutos = E.iniciada ? Math.round((ahora - new Date(E.iniciada)) / 60000) : null;
    const minutos = brutos != null && brutos > 0 && brutos <= 300 ? brutos : null;
    const antes = P.estadisticas(filas);

    const rango = P.rangoSesion({ pct: hechos / CARDIO.length, volumen: 0, volMedio3: null, volRecordBloque: false, huboFallo: false });
    const fila = {
      cazador: cazador.id, f: fecha, ts: ahora.toISOString(),
      semana: E.semana, dia: -1, ej: "cardio", nombre: "Cardio suelto",
      implemento: "corporal", kg: 0, carga: 0, minutos, nota, lados: 1,
      series: hechos, reps: 0, volumen: 0, xp: completa ? XP_CARDIO : 0, rango
    };
    await DB.historial.anadir([fila]);
    filas.push(fila);
    delete E.sesion.cardio;
    E.iniciada = null; E.nota = "";
    mantenerPantalla(false);
    await guardar();

    const despues = P.estadisticas(filas);
    if (despues.rango !== antes.rango) {
      aviso(`<b>Ascenso de rango</b><span>Rango ${despues.rango}</span>`, "rango");
    } else if (despues.nivel > antes.nivel) {
      aviso(`<b>Subida de nivel</b><span>Nivel ${despues.nivel}</span>`, "nivel");
    }

    /* No cuenta como día núcleo — cardio no sustituye ni hace falta
       para cerrar semana, igual que la repesca no lo hace. */
    await revisarLogros({
      dia: -1, volumen: 0, series: hechos, subidas: 0, completa,
      hora: ahora.getHours(), diasParado: 0, minutos, records: 0
    }, nucleo(programaActivo()).length);

    resultadoSesion = {
      bloque: null, nombreDia: "Cardio", lema: "Pies rápidos, manos arriba",
      rango, fecha, volumen: 0, minutos, series: hechos, xp: completa ? XP_CARDIO : 0,
      hito: null,
      ejercicios: CARDIO.filter(b => sesion[b.clave]).map(b => ({
        nombre: b.nombre, kg: 0, series: b.rondas, reps: b.segundosRonda, fallado: false, unilateral: false, segundos: true
      }))
    };
    vista = "resultado";
    pintar(); arriba();
  } finally { cerrando = false; }
}

async function cerrarSesion() {
  const d = dia(diaActivo);
  const nuevas = [], records = [];
  let subidas = 0, volumen = 0, xp = 0, completa = true;
  /* Se lee del campo, no del estado: pulsar Arise sin salir del texto
     dispara el guardado justo después de este momento. */
  const nota = ($("notaSesion")?.value ?? E.nota ?? "").trim().slice(0, 280);
  const fecha = hoy(), ahora = new Date();
  const antes = P.estadisticas(filas);
  /* En un día suelto lo cerrado en otro rato de esta semana ya cuenta:
     no puede impedir que este quede como misión completa. */
  const ya = d.suelto ? registradosSemana(d.n) : new Set();

  /* Duración real, si se marcó alguna serie. Más de cinco horas es que
     la app se quedó abierta toda la tarde: mejor no guardar nada que
     guardar una mentira. */
  const brutos = E.iniciada ? Math.round((ahora - new Date(E.iniciada)) / 60000) : null;
  const minutos = brutos != null && brutos > 0 && brutos <= 300 ? brutos : null;

  for (const ej of d.ejercicios) {
    const st = serie(ej);
    /* Cada serie lleva su propio peso, no el del ejercicio entero: si
       cambiaste de escalón a media sesión, cada tanda se valora con el
       peso que de verdad tenía puesto, no con el que quede al cerrar. */
    const marcas = st.hechas.map((v, k) => v
      ? { reps: st.repsSerie[k] ?? 0, kg: st.pesoSerie[k] ?? pesoDe(ej) }
      : null).filter(m => m !== null);
    const hechas = marcas.length;
    /* La rampa no cuenta como serie de trabajo, pero si se marcó algo
       de calentar sí queda su volumen aparte, en gris, en el historial. */
    const volumenAprox = (st.aprox || []).filter(s => s.hecha).reduce((a, s) => a + s.kg * s.reps, 0);
    if (hechas < ej.series && !ya.has(ej.clave)) completa = false;
    if (!hechas) { delete E.sesion[ej.sesionId]; continue; }

    const lados = P.ladosDe(ej);

    /* Rango de reps agotado en todas las series marcadas: toca subir
       peso. Solo cuentan las hechas al peso actual — si alguna se hizo
       a otro peso, no es lo mismo que agotar el rango de hoy. Un fallo
       (0 reps) nunca cuenta como listo. */
    const kgActual = pesoDe(ej);
    const alActual = marcas.filter(m => m.kg === kgActual);
    if (hechas === ej.series && alActual.length === ej.series && alActual.every(m => m.reps >= ej.max)
        && ej.implemento !== "mancuerna" && ej.implemento !== "corporal") {
      if (!E.listos[ej.clave]) subidas++;
      E.listos[ej.clave] = true;
    }

    /* Una fila del historial por peso distinto usado en el ejercicio:
       así el volumen, la XP y el récord de cada tanda se calculan con
       su carga real, no con una mezcla. Lo normal (un solo peso) sigue
       dando una sola fila, como siempre. */
    const porPeso = new Map();
    for (const m of marcas) {
      if (!porPeso.has(m.kg)) porPeso.set(m.kg, []);
      porPeso.get(m.kg).push(m.reps);
    }

    let primeraFila = true;
    for (const [kg, reps] of porPeso) {
      const carga = equipo.cargaReal(ej, kg, pesoActual());
      /* 0 reps en una serie marcada es un intento fallido, no un hueco:
         no suma volumen ni XP, y queda su propia fila en el historial. */
      const buenas = reps.filter(r => r > 0);
      const fallidas = reps.length - buenas.length;
      const aprox = primeraFila ? volumenAprox : 0;

      if (buenas.length) {
        const vol = carga * buenas.reduce((a, r) => a + r, 0) * lados * (ej.volumenEscala ?? 1);
        const xpEj = buenas.reduce((a, r) => a + P.xpDeSerie(carga, r), 0) * lados;
        /* Reps representativas de la fila: la media, para que series×reps
           siga midiendo el total real aunque hayan variado entre sí. */
        const repsMedia = Math.round(buenas.reduce((a, r) => a + r, 0) / buenas.length);

        /* Récord contra la mejor marca anterior de ese ejercicio. La primera
           vez no cuenta: cualquier número sería un récord y no significa nada. */
        const marcaPrevia = P.mejorMarca(filas, ej.clave);
        const fila = { implemento: ej.implemento, carga, reps: repsMedia };
        const marca = P.marcaDe(fila);
        if (marcaPrevia > 0 && marca > marcaPrevia) {
          records.push({ nombre: ej.nombre, marca, unidad: P.unidadMarca(fila) });
        }

        nuevas.push({
          cazador: cazador.id, f: fecha, ts: ahora.toISOString(),
          semana: E.semana, dia: d.n, ej: ej.clave, nombre: ej.nombre,
          implemento: ej.implemento, kg, carga, minutos, nota, lados,
          series: buenas.length, reps: repsMedia, volumen: vol, xp: xpEj, volumenAprox: aprox
        });
        volumen += vol; xp += xpEj;
        primeraFila = false;
      }

      if (fallidas) {
        nuevas.push({
          cazador: cazador.id, f: fecha, ts: ahora.toISOString(),
          semana: E.semana, dia: d.n, ej: ej.clave, nombre: ej.nombre,
          implemento: ej.implemento, kg, carga, minutos, nota, lados,
          series: fallidas, reps: 0, volumen: 0, xp: 0,
          volumenAprox: buenas.length ? 0 : aprox, fallado: true
        });
        primeraFila = false;
      }
    }
    delete E.sesion[ej.sesionId];
  }

  if (!nuevas.length) { aviso("No has marcado ninguna serie"); return; }

  const anteriores = filas.map(f => f.f).sort();
  const ultimaFecha = anteriores[anteriores.length - 1];
  const diasParado = ultimaFecha
    ? Math.round((new Date(fecha) - new Date(ultimaFecha)) / 86400000) : 0;

  /* Rango de la sesión: se calcula contra el historial ANTES de meter
     las filas de hoy, y se guarda en cada una — así queda fijado para
     siempre, no recalculado cada vez que se mire ese día. */
  const prog = programaActivo();
  const bloque = bloqueDe(d.nombre);
  const totalPlaneado = d.ejercicios.reduce((a, e) => a + e.series, 0);
  const completadas = nuevas.filter(f => !f.fallado).reduce((a, f) => a + f.series, 0);
  const pct = totalPlaneado ? completadas / totalPlaneado : 1;
  const huboFallo = nuevas.some(f => f.fallado);
  const historicos = bloque ? volumenesDeBloque(bloque, prog) : [];
  const volMedio3 = historicos.length
    ? historicos.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, historicos.length) : null;
  const volRecordBloque = historicos.length > 0 && volumen > Math.max(...historicos);
  const rango = bloque ? P.rangoSesion({ pct, volumen, volMedio3, volRecordBloque, huboFallo }) : null;
  if (rango) for (const f of nuevas) f.rango = rango;

  await DB.historial.anadir(nuevas);
  filas.push(...nuevas);
  tecnicaAbierta = null;
  cambioAbierto = null;
  E.iniciada = null;
  E.nota = "";
  /* Los cambios de "solo hoy" mueren con la sesión. */
  for (const k of Object.keys(E.cambios || {})) if (E.cambios[k].temporal) delete E.cambios[k];
  mantenerPantalla(false);
  await guardar();

  /* El orden de los avisos importa: primero lo gordo. */
  const despues = P.estadisticas(filas);
  if (despues.rango !== antes.rango) {
    aviso(`<b>Ascenso de rango</b><span>Rango ${despues.rango}</span>`, "rango");
  } else if (despues.nivel > antes.nivel) {
    aviso(`<b>Subida de nivel</b><span>Nivel ${despues.nivel}</span>`, "nivel");
  }

  for (const r of records) {
    aviso(`<b>Nuevo récord</b><span>${esc(r.nombre)} · ${r.marca} ${r.unidad}</span>`, "rango");
  }

  await revisarLogros({
    dia: d.n, volumen, series: nuevas.length, subidas, completa,
    hora: ahora.getHours(), diasParado, minutos, records: records.length
  });

  /* Línea de hito de la tarjeta: lo más gordo que haya pasado hoy,
     una sola cosa. Un récord de ejercicio pesa más que uno de bloque,
     y ese más que cerrar la semana. */
  let hito = null;
  if (records.length) hito = `Récord · ${records[0].nombre} ${records[0].marca} ${records[0].unidad}`;
  else if (volRecordBloque) hito = `Récord de volumen · ${esc(d.nombre)}`;
  else if (nucleo(prog).every(n => estadoDia(n).hecha)) hito = `Semana ${E.semana} cerrada`;

  resultadoSesion = {
    bloque, nombreDia: d.nombre, lema: d.lema, rango, fecha,
    volumen, minutos, series: completadas, xp: xp + P.XP_MISION, hito,
    ejercicios: nuevas.filter(f => f.series > 0).map(f => ({
      nombre: f.nombre, kg: f.kg, series: f.series, reps: f.reps,
      fallado: !!f.fallado, unilateral: EJERCICIOS[f.ej]?.unilateral,
      segundos: EJERCICIOS[f.ej]?.unidad === "segundos"
    }))
  };
  vista = "resultado";
  pintar(); arriba();
  if (subidas) {
    setTimeout(() => aviso(`${subidas} ejercicio${subidas > 1 ? "s" : ""} listo${subidas > 1 ? "s" : ""} para subir peso`), 600);
  }
}

/* ---------- descargas ---------- */
function bajar(nombre, texto, tipo) {
  const url = URL.createObjectURL(new Blob([texto], { type: tipo }));
  const a = document.createElement("a");
  a.href = url; a.download = nombre; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- tarjeta de resumen ----------
   Un <canvas> de verdad, no una foto del HTML: así se puede compartir
   como imagen suelta. Los trazos del logo y de la insignia son los
   mismos "d" que el SVG — Path2D los entiende igual. */
async function dibujarTarjeta(r) {
  const W = 1080, H = 1350, cx = W / 2;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d");
  const colorRango = COLOR_RANGO[r.rango] || COLOR_RANGO.E;
  try { await document.fonts.ready; } catch (e) {}

  const fondo = ctx.createLinearGradient(0, 0, 0, H);
  fondo.addColorStop(0, "#0B1018"); fondo.addColorStop(.55, "#0E1522"); fondo.addColorStop(1, "#120F1C");
  ctx.fillStyle = fondo; ctx.fillRect(0, 0, W, H);
  const halo = ctx.createRadialGradient(W * .22, 40, 0, W * .22, 40, W * .8);
  halo.addColorStop(0, "rgba(56,189,248,.20)"); halo.addColorStop(1, "rgba(56,189,248,0)");
  ctx.fillStyle = halo; ctx.fillRect(0, 0, W, H);

  const trazar = (rutas, x, y, escala, color, grosor) => {
    ctx.save();
    ctx.translate(x, y); ctx.scale(escala, escala);
    ctx.strokeStyle = color; ctx.lineWidth = grosor / escala;
    ctx.lineCap = "square"; ctx.lineJoin = "miter";
    for (const d of rutas) ctx.stroke(new Path2D(d));
    ctx.restore();
  };

  /* logo, arriba a la izquierda */
  trazar(LOGO.rutas, 66, 66, .58, "#E6EDF7", LOGO.trazo);

  /* fecha, arriba a la derecha */
  ctx.fillStyle = "#4E6076"; ctx.font = "500 22px 'IBM Plex Mono', monospace";
  ctx.textAlign = "right"; ctx.textBaseline = "middle";
  const fechaTxt = new Date(r.fecha + "T12:00:00").toLocaleDateString("es-ES",
    { weekday: "short", day: "2-digit", month: "short" }).toUpperCase();
  ctx.fillText(fechaTxt, W - 66, 84);

  /* insignia central con aro de rango */
  const cy = 340, radio = 156, tamIns = radio * 1.55;
  ctx.save();
  ctx.setLineDash([28, 18]);
  ctx.strokeStyle = colorRango; ctx.lineWidth = 11;
  ctx.beginPath(); ctx.arc(cx, cy, radio, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  if (r.bloque && INSIGNIAS[r.bloque]) {
    const ins = INSIGNIAS[r.bloque];
    trazar(ins.rutas, cx - tamIns / 2, cy - tamIns / 2, tamIns / 200, "#E6EDF7", ins.trazo);
  }
  if (r.rango) {
    const px = cx + radio * .74, py = cy + radio * .68;
    ctx.fillStyle = "#0B1018"; ctx.strokeStyle = colorRango; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(px, py, 48, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = colorRango; ctx.font = "700 48px Oswald, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(r.rango, px, py + 3);
  }

  /* nombre del bloque y lema */
  ctx.fillStyle = "#E6EDF7"; ctx.font = "700 56px Oswald, sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  ctx.fillText((r.nombreDia || "").toUpperCase(), cx, 570);
  if (r.lema) {
    ctx.fillStyle = "#8395AE"; ctx.font = "italic 400 27px 'IBM Plex Sans', sans-serif";
    ctx.fillText(`"${r.lema}"`, cx, 610);
  }

  /* cuatro cifras */
  const stats = [
    [r.volumen ? (r.volumen / 1000).toFixed(1) + "t" : "—", "VOL"],
    [String(r.minutos ?? "—"), "MIN"],
    [String(r.series), "SERIES"],
    [miles(r.xp), "XP"]
  ];
  const yStats = 700, colW = W / 4;
  stats.forEach(([val, lab], i) => {
    const x = colW * i + colW / 2;
    ctx.fillStyle = "#E6EDF7"; ctx.font = "600 42px 'IBM Plex Mono', monospace"; ctx.textAlign = "center";
    ctx.fillText(val, x, yStats);
    ctx.fillStyle = "#4E6076"; ctx.font = "500 18px 'IBM Plex Mono', monospace";
    ctx.fillText(lab, x, yStats + 32);
  });

  ctx.strokeStyle = "#22304A"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(70, 770); ctx.lineTo(W - 70, 770); ctx.stroke();

  /* lista de ejercicios, fallados en rojo */
  let y = 826;
  for (const e of r.ejercicios) {
    if (y > 1240) break;
    const color = e.fallado ? "#F87171" : "#E6EDF7";
    ctx.textAlign = "left"; ctx.font = "500 27px 'IBM Plex Sans', sans-serif";
    ctx.fillStyle = color;
    ctx.fillText(e.nombre + (e.unilateral ? " (los dos lados)" : ""), 70, y);
    ctx.textAlign = "right"; ctx.font = "500 24px 'IBM Plex Mono', monospace";
    ctx.fillStyle = e.fallado ? "#F87171" : "#8395AE";
    ctx.fillText(e.fallado ? "FALLADO" : e.segundos ? `${e.series} × ${e.reps} s` : `${e.kg} kg × ${e.series} × ${e.reps}`, W - 70, y);
    y += 48;
  }

  /* línea de hito, si hay algo que contar */
  if (r.hito) {
    ctx.textAlign = "center"; ctx.fillStyle = "#38BDF8"; ctx.font = "600 25px 'IBM Plex Mono', monospace";
    ctx.fillText(r.hito.toUpperCase(), cx, 1300);
  }

  return new Promise(ok => cv.toBlob(ok, "image/png"));
}

/** Comparte la tarjeta como imagen; si el navegador no sabe compartir
    ficheros (Safari de escritorio, algún Android viejo), la descarga
    directamente — en iOS Safari eso abre la imagen para guardarla a mano. */
async function compartirTarjeta(r) {
  if (!r) return;
  let blob;
  try { blob = await dibujarTarjeta(r); }
  catch (err) { aviso("No se pudo generar la tarjeta"); return; }

  const nombre = `sistema-${r.bloque || "movilidad"}-${r.fecha}.png`;
  const file = new File([blob], nombre, { type: "image/png" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: "Sistema", text: `${r.nombreDia} · rango ${r.rango || "—"}` }); return; }
    catch (err) { if (err?.name === "AbortError") return; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nombre; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ============================================================
   EVENTOS
   ============================================================ */
/* ---------- margen contra el toque doble ----------
   Con las manos con prisa entre series se cuela un segundo toque sin
   querer: marcabas y desmarcabas la serie sin enterarte, o te saltabas
   una semana entera. El segundo toque sobre el mismo botón dentro del
   margen se ignora.

   Solo afecta a las series y a los botones con identificador, que son
   los de una sola vez. Los de más y menos peso o reps no llevan ninguno
   a propósito: ahí sí quieres poder machacar el botón. */
const MARGEN_TOQUE = 500;
let ultimoToque = { marca: null, t: -Infinity };

function repetido(b) {
  const marca = b.dataset.serie ? `serie:${b.dataset.serie}:${b.dataset.k}`
              : b.id ? `id:${b.id}`
              : null;
  if (!marca) return false;
  const ahora = performance.now();
  if (marca === ultimoToque.marca && ahora - ultimoToque.t < MARGEN_TOQUE) return true;
  ultimoToque = { marca, t: ahora };
  return false;
}

document.addEventListener("click", async e => {
  const b = e.target.closest("button");
  if (!b) return;
  if (repetido(b)) return;

  /* --- puerta --- */
  if (b.id === "seguir") { seguirIgual(); return; }
  if (b.dataset.entrar) {
    const id = +b.dataset.entrar;
    /* Volver a la ficha que ya estaba abierta no es entrar: no pide PIN. */
    if (cambiando && id === cazador?.id) { seguirIgual(); return; }
    const c = await DB.cazadores.get(id);
    if (c.pin) { pendiente = c; puertaModo = "pin"; pintarPuerta(); }
    else entrar(c.id);
    return;
  }
  if (b.id === "nuevo") { puertaModo = "alta"; pintarPuerta(); return; }
  if (b.id === "volver") { puertaModo = "lista"; pintarPuerta(); return; }
  if (b.id === "entrarPin") {
    const ok = await DB.cazadores.comprobarPin(pendiente.id, $("fPinEntrar").value);
    if (ok) entrar(pendiente.id);
    else { aviso("PIN incorrecto"); $("fPinEntrar").value = ""; }
    return;
  }
  if (b.id === "crear") {
    const nombre = $("fNombre").value.trim();
    if (!nombre) { aviso("Ponte un nombre de cazador"); return; }
    const id = await DB.cazadores.crear({
      nombre, pin: $("fPin").value.trim(), pesoCorporal: $("fPeso").value
    });
    if (await DB.hayDatosAntiguos() && confirm("He encontrado datos de la versión anterior de la app. ¿Los traigo a esta ficha?")) {
      const n = await DB.rescatarAntiguos(id);
      if (n) aviso(`${n} series rescatadas de la versión anterior`);
    }
    entrar(id);
    return;
  }

  if (!cazador || vista === "puerta") return;

  /* --- navegación --- */
  if (b.dataset.mision || b.dataset.dia) {
    diaActivo = +(b.dataset.mision || b.dataset.dia);
    vista = esSemanaMovilidad(E.semana) ? "movilidad" : "dia";
    tecnicaAbierta = null;
    pintar(); arriba();
    return;
  }
  if (b.dataset.vista) { vista = b.dataset.vista; tecnicaAbierta = null; editando = null; perfilAbierto = null; cambiarComidaAbierto = null; pintar(); arriba(); return; }
  if (b.dataset.semana) {
    const sem = +b.dataset.semana;
    if (semanasAbiertas.has(sem)) semanasAbiertas.delete(sem); else semanasAbiertas.add(sem);
    repintarQuieto();
    return;
  }
  if (b.dataset.sesion) {
    sesionAbierta = sesionAbierta === b.dataset.sesion ? null : b.dataset.sesion;
    repintarQuieto();
    return;
  }
  if (b.dataset.ficha) {
    ejercicioActivo = b.dataset.ficha;
    puntoSel = { tipo: null, i: null };
    fichaTab = "hacer"; verMusculos = false; musculoAbierto = null; tecnicaAbierta = null;
    vista = "ejercicio"; pintar(); arriba();
    return;
  }
  if (b.id === "irACopia") { vista = "perfil"; pintar(); arriba(); return; }

  /* --- ficha de ejercicio: pestañas, silueta, glosario (spec 008) --- */
  if (b.dataset.fichatab) { fichaTab = b.dataset.fichatab; repintarQuieto(); return; }
  if (b.dataset.vermusculos) { verMusculos = !verMusculos; repintarQuieto(); return; }
  if (b.dataset.musculo) {
    musculoAbierto = musculoAbierto === b.dataset.musculo ? null : b.dataset.musculo;
    repintarQuieto();
    return;
  }

  /* --- cambiar un ejercicio por otro del mismo patrón --- */
  if (b.dataset.cambiar) {
    cambioAbierto = cambioAbierto === b.dataset.cambiar ? null : b.dataset.cambiar;
    tecnicaAbierta = null;
    repintarQuieto();
    return;
  }
  if (b.dataset.modo) { cambioTemporal = b.dataset.modo === "true"; repintarQuieto(); return; }
  if (b.dataset.poner !== undefined) {
    const [sesionId, clave] = b.dataset.poner.split("|");
    E.cambios = E.cambios || {};
    if (clave) E.cambios[sesionId] = { ej: clave, temporal: cambioTemporal };
    else delete E.cambios[sesionId];
    delete E.sesion[sesionId];          // el hueco arranca limpio
    cambioAbierto = null;
    await guardar();
    repintarQuieto();
    aviso(clave ? "Ejercicio cambiado" : "Ejercicio original restaurado");
    return;
  }

  if (b.dataset.corporal) {
    const paso = +b.dataset.corporal * 0.5;
    pesoBorrador = Math.max(30, Math.min(250, +(borradorPeso() + paso).toFixed(1)));
    repintarQuieto();
    return;
  }
  if (b.id === "anotarPeso") {
    const kg = borradorPeso();
    E.corporal = (E.corporal || []).filter(p => p.f !== hoy());
    E.corporal.push({ f: hoy(), kg });
    E.corporal.sort((a, b) => a.f.localeCompare(b.f));
    pesoBorrador = null;
    await guardar();
    pintar();
    aviso(`Peso anotado · ${kg} kg`);
    return;
  }

  if (b.dataset.crono) {
    const ej = dia(diaActivo).ejercicios.find(x => x.sesionId === b.dataset.crono);
    if (cron?.sesionId === ej.sesionId) await pararCrono(ej);
    else alternarCrono(ej);
    return;
  }
  if (b.dataset.tema) { ponerTema(b.dataset.tema); return; }

  /* --- equipo (spec 007) --- */
  if (b.dataset.equipoToggle) {
    E.equipo = E.equipo || equipo.configDefecto();
    const c = E.equipo[b.dataset.equipoToggle];
    if (c) c.activo = !c.activo;
    await guardar();
    repintarQuieto();
    return;
  }
  if (b.dataset.equipoBarra) {
    E.equipo = E.equipo || equipo.configDefecto();
    E.equipo.barra.kg = Math.max(0, E.equipo.barra.kg + (+b.dataset.equipoBarra));
    await guardar();
    repintarQuieto();
    return;
  }
  if (b.dataset.equipoAnadir) {
    const clave = b.dataset.equipoAnadir;
    const campo = $(`nuevoPeso-${clave}`);
    const v = +campo?.value;
    if (!v || v <= 0) return;
    E.equipo = E.equipo || equipo.configDefecto();
    pesosArrayDe(E.equipo, clave).push(v);
    await guardar();
    repintarQuieto();
    return;
  }
  if (b.dataset.equipoCantidad) {
    E.equipo = E.equipo || equipo.configDefecto();
    const arr = pesosArrayDe(E.equipo, b.dataset.equipoCantidad);
    const valor = +b.dataset.valor;
    if (+b.dataset.dir > 0) arr.push(valor);
    else { const i = arr.indexOf(valor); if (i >= 0) arr.splice(i, 1); }
    await guardar();
    repintarQuieto();
    return;
  }

  /* --- perfil nutricional (bloque B, spec 010) --- */
  if (b.dataset.nutrisexo) {
    nutricionEstado().perfil.sexo = b.dataset.nutrisexo;
    recalcularNutricionSiHaceFalta();
    await guardar();
    repintarQuieto();
    return;
  }
  if (b.dataset.nutriactividad) {
    nutricionEstado().perfil.actividad = b.dataset.nutriactividad;
    recalcularNutricionSiHaceFalta();
    await guardar();
    repintarQuieto();
    return;
  }
  if (b.dataset.nutriobjetivo) {
    nutricionEstado().perfil.objetivoPct = +b.dataset.nutriobjetivo;
    recalcularNutricionSiHaceFalta();
    await guardar();
    repintarQuieto();
    return;
  }
  if (b.id === "guardarNutriPerfil") {
    const perfil = nutricionEstado().perfil;
    const edad = +($("nutriEdad")?.value || 0), altura = +($("nutriAltura")?.value || 0);
    perfil.edad = edad > 0 ? edad : undefined;
    perfil.alturaCm = altura > 0 ? altura : undefined;
    nutricionEstado().pesoCalculo = null;          // fuerza el recálculo aunque el peso no se haya movido
    recalcularNutricionSiHaceFalta();
    await guardar();
    repintarQuieto();
    aviso(nutricionEstado().objetivo ? "Objetivo actualizado" : "Guardado — faltan datos para calcular el objetivo");
    return;
  }
  if (b.dataset.grasa) {
    const paso = +b.dataset.grasa * 0.5;
    grasaBorrador = Math.max(3, Math.min(60, +(borradorGrasa() + paso).toFixed(1)));
    repintarQuieto();
    return;
  }
  if (b.id === "anotarGrasa") {
    const pct = borradorGrasa();
    E.grasaCorporal = (E.grasaCorporal || []).filter(p => p.f !== hoy());
    E.grasaCorporal.push({ f: hoy(), pct });
    E.grasaCorporal.sort((a, b) => a.f.localeCompare(b.f));
    grasaBorrador = null;
    nutricionEstado().pesoCalculo = null;          // fuerza el recálculo: cambia la fórmula (Katch-McArdle)
    recalcularNutricionSiHaceFalta();
    await guardar();
    pintar();
    aviso(`% de grasa anotado · ${pct}%`);
    return;
  }
  if (b.dataset.suplementoAnadir) {
    const nutri = nutricionEstado();
    let nombre, clave;
    if (b.dataset.suplementoAnadir === "manual") {
      nombre = ($("nutriSupNombre")?.value || "").trim().slice(0, 40);
      if (!nombre) return;
      clave = nombre.toLowerCase().replace(/[^a-z0-9]+/g, "");
    } else {
      clave = b.dataset.suplementoAnadir;
      nombre = b.dataset.nombre || clave;
    }
    if (!nutri.suplementos.some(s => s.clave === clave)) nutri.suplementos.push({ clave, nombre });
    await guardar();
    repintarQuieto();
    return;
  }
  if (b.dataset.suplementoQuitar) {
    const nutri = nutricionEstado();
    nutri.suplementos = nutri.suplementos.filter(s => s.clave !== b.dataset.suplementoQuitar);
    await guardar();
    repintarQuieto();
    return;
  }
  if (b.dataset.suplementoTomado) {
    const clave = b.dataset.suplementoTomado;
    const nutri = nutricionEstado();
    const s = nutri.suplementos.find(x => x.clave === clave);
    if (!s) return;
    const yaHoy = nutricionHoy().find(f => f.tipo === "suplemento" && f.clave === clave);
    if (yaHoy) { await DB.nutricion.borrar(yaHoy.id); filasNutricion = filasNutricion.filter(f => f.id !== yaHoy.id); }
    else {
      const fila = { cazador: cazador.id, f: hoy(), ts: new Date().toISOString(), tipo: "suplemento", clave, nombre: s.nombre };
      const id = await DB.nutricion.anadir([fila]);
      filasNutricion.push({ ...fila, id: Array.isArray(id) ? id[0] : id });
    }
    repintarQuieto();
    return;
  }
  if (b.dataset.comidaAnadir) {
    const nombre = ($("nutriComNombre")?.value || "").trim().slice(0, 60);
    const gramos = +($("nutriComGramos")?.value || 0);
    const kcal100 = +($("nutriComKcal")?.value || 0);
    const proteina100 = +($("nutriComProteina")?.value || 0);
    const grasa100 = +($("nutriComGrasa")?.value || 0);
    const carbo100 = +($("nutriComCarbo")?.value || 0);
    if (!nombre || gramos <= 0) { aviso("Falta el nombre o los gramos"); return; }
    const factor = gramos / 100;
    const fila = {
      cazador: cazador.id, f: hoy(), ts: new Date().toISOString(), tipo: "comida",
      nombre, gramos,
      kcal: Math.round(kcal100 * factor), proteina: Math.round(proteina100 * factor),
      grasa: Math.round(grasa100 * factor), carbo: Math.round(carbo100 * factor)
    };
    const id = await DB.nutricion.anadir([fila]);
    filasNutricion.push({ ...fila, id: Array.isArray(id) ? id[0] : id });
    repintarQuieto();
    return;
  }
  if (b.dataset.comidaBorrar) {
    const id = +b.dataset.comidaBorrar;
    await DB.nutricion.borrar(id);
    filasNutricion = filasNutricion.filter(f => f.id !== id);
    repintarQuieto();
    return;
  }
  if (b.dataset.comidaLibreAnadir) {
    const nombre = ($("nutriLibreNombre")?.value || "").trim().slice(0, 60);
    if (!nombre) return;
    const fila = { cazador: cazador.id, f: hoy(), ts: new Date().toISOString(), tipo: "comida", nombre, sinMacros: true };
    const id = await DB.nutricion.anadir([fila]);
    filasNutricion.push({ ...fila, id: Array.isArray(id) ? id[0] : id });
    repintarQuieto();
    return;
  }
  if (b.dataset.menuhoyToggle) {
    const [slot, platoClave] = b.dataset.menuhoyToggle.split("|");
    const yaHoy = nutricionHoy().find(f => f.tipo === "comida" && f.slot === slot);
    if (yaHoy) {
      await DB.nutricion.borrar(yaHoy.id);
      filasNutricion = filasNutricion.filter(f => f.id !== yaHoy.id);
    } else {
      const plato = nutricionEstado().platos.find(p => p.clave === platoClave);
      if (!plato) { aviso("Ese plato ya no existe"); return; }
      const m = N.macrosDePlato(plato.ingredientes, catalogoAlimentos());
      const fila = {
        cazador: cazador.id, f: hoy(), ts: new Date().toISOString(), tipo: "comida",
        nombre: plato.nombre, kcal: m.kcal, proteina: m.proteina, grasa: m.grasa,
        carbo: m.carbo, precio: plato.precio, platoClave: plato.clave, slot
      };
      const id = await DB.nutricion.anadir([fila]);
      filasNutricion.push({ ...fila, id: Array.isArray(id) ? id[0] : id });
    }
    repintarQuieto();
    return;
  }
  if (b.dataset.cambiarComida) {
    cambiarComidaAbierto = cambiarComidaAbierto === b.dataset.cambiarComida ? null : b.dataset.cambiarComida;
    repintarQuieto();
    return;
  }
  if (b.dataset.menucelda) {
    menuCeldaAbierta = menuCeldaAbierta === b.dataset.menucelda ? null : b.dataset.menucelda;
    repintarQuieto();
    return;
  }
  if (b.dataset.menudia) {
    menuDiaAbierto = menuDiaAbierto === b.dataset.menudia ? null : b.dataset.menudia;
    menuCeldaAbierta = null;
    repintarQuieto();
    return;
  }
  if (b.dataset.nuevoplatotipo) {
    nuevoPlatoTipo = nuevoPlatoTipo === b.dataset.nuevoplatotipo ? null : b.dataset.nuevoplatotipo;
    repintarQuieto();
    return;
  }
  if (b.dataset.menuAsignar) {
    const [dia, comida, platoClave] = b.dataset.menuAsignar.split("|");
    const nutri = nutricionEstado();
    if (!nutri.menuSemanal[dia]) nutri.menuSemanal[dia] = {};
    nutri.menuSemanal[dia][comida] = platoClave;
    menuCeldaAbierta = null;
    cambiarComidaAbierto = null;
    await guardar();
    repintarQuieto();
    return;
  }
  if (b.dataset.menuQuitar) {
    const [dia, comida] = b.dataset.menuQuitar.split("|");
    const nutri = nutricionEstado();
    if (nutri.menuSemanal[dia]) delete nutri.menuSemanal[dia][comida];
    await guardar();
    repintarQuieto();
    return;
  }
  if (b.dataset.platoSugerido) {
    const sugerido = N.PLATOS_SUGERIDOS.find(p => p.clave === b.dataset.platoSugerido);
    if (!sugerido) return;
    const nutri = nutricionEstado();
    if (!nutri.platos.some(p => p.clave === sugerido.clave)) nutri.platos.push({ ...sugerido });
    await guardar();
    repintarQuieto();
    return;
  }
  if (b.dataset.ingredienteQuitar !== undefined) {
    platoDraftIngredientes.splice(+b.dataset.ingredienteQuitar, 1);
    repintarQuieto();
    return;
  }
  if (b.dataset.platoGuardar) {
    const nombre = ($("nutriPlatoNombre")?.value || "").trim().slice(0, 60);
    const precio = +($("nutriPlatoPrecio")?.value || 0) || undefined;
    if (!nombre) { aviso("Falta el nombre del plato"); return; }
    if (!platoDraftIngredientes.length) { aviso("Añade al menos un ingrediente"); return; }
    const clave = `${nombre.toLowerCase().replace(/[^a-z0-9]+/g, "")}-${Date.now().toString(36)}`;
    nutricionEstado().platos.push({
      clave, nombre, precio, tipoComida: nuevoPlatoTipo || undefined,
      ingredientes: platoDraftIngredientes.map(({ alimentoId, gramos }) => ({ alimentoId, gramos }))
    });
    platoDraftIngredientes = [];
    nuevoPlatoTipo = null;
    await guardar();
    repintarQuieto();
    return;
  }
  if (b.dataset.platoRegistrar) {
    const plato = nutricionEstado().platos.find(p => p.clave === b.dataset.platoRegistrar);
    if (!plato) return;
    const m = N.macrosDePlato(plato.ingredientes, catalogoAlimentos());
    const fila = {
      cazador: cazador.id, f: hoy(), ts: new Date().toISOString(), tipo: "comida",
      nombre: plato.nombre, kcal: m.kcal, proteina: m.proteina, grasa: m.grasa,
      carbo: m.carbo, precio: plato.precio
    };
    const id = await DB.nutricion.anadir([fila]);
    filasNutricion.push({ ...fila, id: Array.isArray(id) ? id[0] : id });
    repintarQuieto();
    return;
  }
  if (b.dataset.platoQuitar) {
    const nutri = nutricionEstado();
    nutri.platos = nutri.platos.filter(p => p.clave !== b.dataset.platoQuitar);
    await guardar();
    repintarQuieto();
    return;
  }
  if (b.dataset.buscarNombre) {
    const q = ($("nutriBuscarNombre")?.value || "").trim().toLowerCase();
    if (!q) return;
    resultadosBusquedaAlimento = catalogoAlimentos().filter(a => a.nombre.toLowerCase().includes(q)).slice(0, 8);
    repintarQuieto();
    return;
  }
  if (b.dataset.usarAlimento) {
    const alimento = catalogoAlimentos().find(a => a.id === b.dataset.usarAlimento);
    if (!alimento) return;
    elegirAlimento(alimento);
    return;
  }
  if (b.dataset.buscarCodigo) {
    const codigo = ($("nutriCodigoBarras")?.value || "").trim();
    if (!codigo) return;
    await buscarYUsarAlimento(codigo);
    return;
  }
  if (b.id === "escanearCodigo") { await iniciarEscaner(); return; }
  if (b.id === "pararEscaner") { pararEscaner(); return; }
  if (b.dataset.guiabatch) {
    guiaBatchAbierta = !guiaBatchAbierta;
    repintarQuieto();
    return;
  }
  if (b.dataset.panel) {
    if (panelesAbiertos.has(b.dataset.panel)) panelesAbiertos.delete(b.dataset.panel);
    else panelesAbiertos.add(b.dataset.panel);
    repintarQuieto();
    return;
  }
  if (b.dataset.perfilpanel) {
    perfilAbierto = b.dataset.perfilpanel;
    repintarQuieto();
    return;
  }
  if (b.dataset.perfilAtras) {
    perfilAbierto = null;
    repintarQuieto();
    return;
  }

  /* --- técnica --- */
  if (b.dataset.tecnica) {
    const clave = b.dataset.tecnica.split(":")[1];
    tecnicaAbierta = tecnicaAbierta === b.dataset.tecnica ? null : b.dataset.tecnica;
    if (tecnicaAbierta && !(E.tecnicas || []).includes(clave)) {
      E.tecnicas = [...(E.tecnicas || []), clave];
      await guardar();
      await revisarLogros();
    }
    repintarQuieto();
    return;
  }

  /* --- aceptar la subida o bajada que propone el motor de progresión --- */
  if (b.dataset.ajustar) {
    const ej = dia(diaActivo).ejercicios.find(x => x.sesionId === b.dataset.ajustar);
    E.pesos[ej.clave] = +b.dataset.obj;
    E.listos[ej.clave] = false;
    const st = serie(ej);
    if (!st.hechas.some(Boolean)) st.reps = repsSugeridas(ej, +b.dataset.obj);
    await guardar();
    repintarQuieto();
    return;
  }

  /* --- carga --- */
  if (b.dataset.peso) {
    const ej = dia(diaActivo).ejercicios.find(x => x.sesionId === b.dataset.peso);
    const pasos = escalon(ej), i = pasos.indexOf(pesoDe(ej)) + (+b.dataset.dir);
    if (i >= 0 && i < pasos.length) {
      E.pesos[ej.clave] = pasos[i];
      E.listos[ej.clave] = false;
      /* Cambiar de peso antes de empezar recoloca las reps de partida. */
      const st = serie(ej);
      if (!st.hechas.some(Boolean)) st.reps = repsSugeridas(ej, pasos[i]);
      await guardar();
      repintarQuieto();
    }
    return;
  }

  /* --- reps --- */
  if (b.dataset.reps) {
    const ej = dia(diaActivo).ejercicios.find(x => x.sesionId === b.dataset.reps);
    const st = serie(ej);
    st.reps = Math.max(0, st.reps + (+b.dataset.dir) * (ej.unidad === "segundos" ? 5 : 1));
    await guardar();
    repintarQuieto();
    return;
  }

  /* --- marcar serie de aproximación (calentamiento, no cuenta como trabajo) --- */
  if (b.dataset.aprox) {
    const ej = dia(diaActivo).ejercicios.find(x => x.sesionId === b.dataset.aprox);
    const st = serie(ej), k = +b.dataset.ak;
    st.aprox[k].hecha = !st.aprox[k].hecha;
    /* Cuenta como tiempo de sesión aunque no sea la primera serie de
       trabajo: calentar ya es parte de la sesión. */
    if (st.aprox[k].hecha && !E.iniciada) {
      E.iniciada = new Date().toISOString();
      mantenerPantalla(true);
    }
    await guardar();
    repintarQuieto();
    return;
  }

  /* --- marcar serie --- */
  if (b.dataset.serie) {
    const ej = dia(diaActivo).ejercicios.find(x => x.sesionId === b.dataset.serie);
    const st = serie(ej), k = +b.dataset.k;
    st.hechas[k] = !st.hechas[k];
    /* Se guarda lo que marcaba el contador en este instante; si luego
       lo subes o lo bajas, las series ya marcadas no cambian. Marcar
       con el contador a 0 es marcarla como fallada, a propósito. */
    st.repsSerie[k] = st.hechas[k] ? st.reps : null;
    st.pesoSerie[k] = st.hechas[k] ? pesoDe(ej) : null;
    /* La primera serie marcada arranca la sesión: cronómetro y pantalla. */
    if (st.hechas[k] && !E.iniciada) {
      E.iniciada = new Date().toISOString();
      mantenerPantalla(true);
    }
    await guardar();
    repintarQuieto();
    if (st.hechas[k]) empezarDescanso(+b.dataset.descanso);
    return;
  }

  /* --- acciones --- */
  if (b.id === "terminar") { await terminarSesion(); return; }
  if (b.id === "terminarMovilidad") { await cerrarMovilidad(); return; }
  if (b.id === "terminarCardio") { await cerrarCardio(); return; }
  if (b.id === "continuarResultado") { resultadoSesion = null; vista = "misiones"; pintar(); arriba(); return; }
  if (b.id === "descargarTarjeta") { await compartirTarjeta(resultadoSesion); return; }

  if (b.dataset.movbloque) {
    const sesion = E.sesion.movilidad || (E.sesion.movilidad = {});
    const clave = b.dataset.movbloque;
    sesion[clave] = !sesion[clave];
    if (sesion[clave] && !E.iniciada) {
      E.iniciada = new Date().toISOString();
      mantenerPantalla(true);
    }
    await guardar();
    repintarQuieto();
    return;
  }
  if (b.dataset.cardiobloque) {
    const sesion = E.sesion.cardio || (E.sesion.cardio = {});
    const clave = b.dataset.cardiobloque;
    sesion[clave] = !sesion[clave];
    await guardar();
    repintarQuieto();
    return;
  }
  if (b.id === "vaciar") {
    dia(diaActivo).ejercicios.forEach(ej => delete E.sesion[ej.sesionId]);
    E.iniciada = null;
    mantenerPantalla(false);
    await guardar(); pintar(); aviso("Día vaciado");
    return;
  }

  /* --- corregir una serie ya guardada --- */
  if (b.dataset.editar) {
    const f = filas.find(x => x.id === +b.dataset.editar);
    if (!f) return;
    const dir = +b.dataset.dir, ej = EJERCICIOS[f.ej];
    if (b.dataset.campo === "kg") {
      const pasos = ej ? equipo.escalonDe(equipoActivo(), ej.implemento) : [];
      if (pasos.length > 1) {
        const i = Math.min(pasos.length - 1, Math.max(0, pasos.indexOf(f.kg) + dir));
        f.kg = pasos[i];
      } else {
        f.kg = Math.max(0, f.kg + dir * 5);
      }
      f.carga = ej ? equipo.cargaReal(ej, f.kg, pesoActual()) : f.kg;
    }
    if (b.dataset.campo === "series") f.series = Math.max(1, f.series + dir);
    if (b.dataset.campo === "reps")   f.reps   = Math.max(1, f.reps + dir);
    /* Volumen y XP se recalculan: si no, la corrección mentiría en el nivel. */
    const lados = P.ladosDe(f);
    f.volumen = f.carga * f.series * f.reps * lados;
    f.xp = P.xpDeSerie(f.carga, f.reps) * f.series * lados;
    await DB.historial.guardar(f);
    repintarQuieto();
    return;
  }

  if (b.dataset.borrar) {
    const id = +b.dataset.borrar;
    const f = filas.find(x => x.id === id);
    if (!f || !confirm(`¿Borrar ${f.nombre} del ${f.f}?`)) return;
    await DB.historial.borrar(id);
    filas = filas.filter(x => x.id !== id);
    editando = null;
    pintar();
    aviso("Línea borrada");
    return;
  }
  if (b.id === "semana") {
    const nucleoActivo = nucleo(programaActivo());
    const diasNucleo = filas.filter(f => f.semana === E.semana && nucleoActivo.includes(f.dia));
    const ultimo = diasNucleo.length ? Math.max(...diasNucleo.map(f => f.dia)) : 0;
    E.diaInicio = ultimo ? (ultimo % nucleoActivo.length) + 1 : 1;
    diaActivo = E.diaInicio;
    E.semana++;
    await guardar(); await revisarLogros(); pintar(); aviso("Semana " + E.semana); return;
  }
  if (b.id === "cambiarFicha") { abrirSelector(); return; }

  if (b.dataset.programa) {
    if (b.dataset.programa !== E.programa) {
      E.programa = b.dataset.programa;
      diaActivo = 1;
      E.diaInicio = 1;
      await guardar();
      aviso(`Programa: ${programaActivo().nombre}`);
    }
    pintar();
    return;
  }

  if (b.id === "expCsv") {
    if (!filas.length) { aviso("Todavía no hay sesiones guardadas"); return; }
    const csv = "fecha,semana,dia,ejercicio,kg,carga_real,series,reps,lados,volumen,xp\n" +
      filas.map(f => [f.f, f.semana, f.dia, `"${f.nombre}"`, f.kg, f.carga, f.series, f.reps, P.ladosDe(f), f.volumen, f.xp].join(",")).join("\n");
    bajar("sistema-historial.csv", csv, "text/csv");
    aviso(filas.length + " series exportadas");
    return;
  }
  if (b.id === "expJson") {
    const c = await DB.copia.exportar(cazador.id);
    bajar(`sistema-${cazador.nombre.toLowerCase().replace(/\W+/g, "-")}-${hoy()}.json`, JSON.stringify(c), "application/json");
    E.copia = { fecha: hoy(), sesiones: P.estadisticas(filas).sesiones };
    await guardar();
    repintarQuieto();
    aviso("Copia descargada");
    return;
  }
  if (b.id === "impJson") { $("ficheroCopia").click(); return; }
});

/* Toques que no son botones: los puntos de las gráficas y las filas
   del historial, que son celdas de tabla. */
document.addEventListener("click", e => {
  if (!cazador || vista === "puerta") return;

  const punto = e.target.closest("[data-punto]");
  if (punto) {
    const i = +punto.dataset.punto, tipo = punto.dataset.graf;
    puntoSel = puntoSel.tipo === tipo && puntoSel.i === i ? { tipo: null, i: null } : { tipo, i };
    repintarQuieto();
    return;
  }

  const fila = e.target.closest("tr[data-fila]");
  if (fila) {
    const id = +fila.dataset.fila;
    editando = editando === id ? null : id;
    repintarQuieto();
    return;
  }

  /* Tocar el fondo del popup de técnica lo cierra — pero solo si el
     toque fue en el fondo de verdad, no en algo de dentro de la caja
     (si no, cualquier toque dentro cerraría el popup al burbujear). */
  if (e.target.classList.contains("modal") && e.target.dataset.tecnica) {
    tecnicaAbierta = null;
    repintarQuieto();
  }
});

document.addEventListener("change", async e => {
  if (e.target.id === "notaSesion") { E.nota = e.target.value.trim(); await guardar(); return; }
  if (e.target.id !== "ficheroCopia") return;
  const file = e.target.files[0]; e.target.value = "";
  if (!file) return;
  if (!confirm(`Esto añade los datos del fichero al historial de ${cazador.nombre} en este móvil. ¿Seguimos?`)) return;
  try {
    const datos = JSON.parse(await file.text());
    const posibles = await DB.copia.contarDuplicados(cazador.id, datos);
    const incluirDuplicados = posibles === 0 || confirm(
      `${posibles} fila${posibles > 1 ? "s" : ""} del fichero (entreno o nutrición) parece${posibles > 1 ? "n" : ""} ya estar ` +
      `guardada${posibles > 1 ? "s" : ""} (mismo día y datos, a menos de 15 min). ¿Las añado también? Cancelar las omite.`
    );
    const r = await DB.copia.importar(cazador.id, datos, { incluirDuplicados });
    const anadidas = typeof r === "number" ? r : r.anadidas;
    E = await DB.estado.cargar(cazador.id);
    filas = await DB.historial.lista(cazador.id);
    filasNutricion = await DB.nutricion.lista(cazador.id);
    alimentosDB = await DB.alimentos.listar();
    desbloqueados = (await DB.logros.lista(cazador.id)).map(l => l.logro);
    pintar();
    aviso(`Añadido · ${anadidas} filas${posibles && !incluirDuplicados ? ` · ${posibles} duplicadas omitidas` : ""}`);
  } catch (err) { aviso(err.message || "No se pudo leer el archivo"); }
});

document.addEventListener("keydown", e => {
  if (e.key !== "Enter") return;
  if ($("fPinEntrar") === document.activeElement) $("entrarPin")?.click();
  else if (document.activeElement?.closest(".puerta")) $("crear")?.click();
});

/* ============================================================
   ARRANQUE
   ============================================================ */
(async () => {
  motor = await DB.iniciar();
  $("descansoSaltar").addEventListener("click", () => acabarDescanso(false));

  const guardado = +localStorage.getItem(CLAVE_SESION);
  if (guardado && await DB.cazadores.get(guardado)) await entrar(guardado);
  else pintar();
})();

/**
 * El `aviso()` normal se borra solo a los 2 s — para una versión
 * nueva eso es al revés de lo que hace falta: hasta que no se recarga
 * de verdad, la app puede seguir sirviendo JS viejo sin decir nada
 * (así se coló el `DB.nutricion.lista undefined` dos veces seguidas).
 * Este banner se queda fijo hasta que se toca.
 */
function mostrarActualizacionDisponible() {
  if ($("actualizarBanner")) return;
  const b = document.createElement("div");
  b.id = "actualizarBanner";
  b.className = "actualizar-banner";
  b.innerHTML = `<span>Hay una versión nueva de la app</span><button>Actualizar ahora</button>`;
  b.querySelector("button").addEventListener("click", () => location.reload());
  document.body.appendChild(b);
}

/* Service worker: que la app abra sin cobertura. */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").then(reg => {
      reg.addEventListener("updatefound", () => {
        const nuevo = reg.installing;
        nuevo?.addEventListener("statechange", () => {
          if (nuevo.state === "installed" && navigator.serviceWorker.controller) {
            mostrarActualizacionDisponible();
          }
        });
      });
    }).catch(err => console.warn("Service worker no registrado:", err));
  });
}
