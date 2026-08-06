/* ============================================================
   SISTEMA · interfaz
   Cuatro pantallas: la puerta (elegir o crear cazador), la misión
   del día, los logros y el perfil. Todo se pinta con plantillas de
   texto y un único manejador de clics delegado en el documento.
   ============================================================ */

import { RUTINA, dia as diaRutina } from "../datos/rutina.js";
import { EJERCICIOS, ejercicio } from "../datos/ejercicios.js";
import { LOGROS, ORDEN_RANGO, COLOR_RANGO } from "../datos/logros.js";
import * as equipo from "../datos/equipo.js";
import * as DB from "./db.js";
import * as P from "./progreso.js";
import { buildFigure, animate, stopAnim } from "./figuras.js";

/* ---------- estado en memoria ---------- */
let cazador = null;          // perfil activo
let E = null;                // su estado: semana, pesos, sesión a medias
let filas = [];              // historial ya cargado
let desbloqueados = [];      // ids de logros conseguidos
let vista = "puerta";        // puerta · misiones · dia · logros · perfil · manual
let diaActivo = 1;
let tecnicaAbierta = null;
let cambioAbierto = null;        // ejercicio con el panel de cambio abierto
let cambioTemporal = true;       // el cambio vale solo para hoy
let pesoBorrador = null;         // peso corporal a medio teclear
let cron = null;                 // cronómetro de isométricos en marcha
let candado = null;              // bloqueo de apagado de pantalla
let ejercicioActivo = null;      // ficha de ejercicio abierta
let puntoSel = { tipo: null, i: null };   // punto tocado en una gráfica
let editando = null;             // id de la fila del historial en edición
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
const mmss = s => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
const miles = n => n.toLocaleString("es-ES");
const hoy = () => new Date().toISOString().slice(0, 10);

/**
 * El día de la rutina con las sustituciones del cazador aplicadas.
 * Se cambia el movimiento, no la prescripción: las series, el rango de
 * reps y el descanso son del hueco de la rutina, no del ejercicio que
 * se meta en él.
 */
function dia(n) {
  const d = diaRutina(n);
  return {
    ...d,
    ejercicios: d.ejercicios.map(e => {
      const c = (E.cambios || {})[e.sesionId];
      if (!c || !EJERCICIOS[c.ej]) return e;
      return {
        ...ejercicio(c.ej),
        series: e.series, min: e.min, max: e.max, descanso: e.descanso, nota: e.nota,
        sesionId: e.sesionId, original: e.nombre, temporal: c.temporal
      };
    })
  };
}

/** El valor que se está ajustando en el perfil, sin guardar todavía. */
const borradorPeso = () => pesoBorrador ?? pesoActual();

/** Peso corporal de hoy: el último anotado, o el del registro. */
const pesoActual = () => {
  const h = E.corporal || [];
  return h.length ? h[h.length - 1].kg : (cazador?.pesoCorporal || 80);
};

const pesoDe = ej => E.pesos[ej.clave] ?? ej.kgInicial ?? 0;
const escalon = ej => equipo.escalonDe(ej.implemento);

/** Las veces que se registró este ejercicio, en orden de fecha.
    No vale fiarse del orden de inserción: restaurar una copia puede
    meter filas viejas después de las nuevas. */
function historialDe(clave) {
  return filas.filter(f => f.ej === clave)
              .sort((a, b) => (a.ts || a.f).localeCompare(b.ts || b.f));
}

/** La última vez que se registró este ejercicio. */
function ultimaDe(clave) {
  const h = historialDe(clave);
  return h.length ? h[h.length - 1] : null;
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
  return E.sesion[ej.sesionId];
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
  desbloqueados = (await DB.logros.lista(id)).map(l => l.logro);
  localStorage.setItem(CLAVE_SESION, id);
  document.body.classList.remove("puerta-abierta");
  vista = "misiones";
  cambiando = false;
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
  misiones: `<rect x="3" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6"/>`,
  logros:   `<path d="M8 3h8v6a4 4 0 0 1-8 0V3Z"/><path d="M8 5.5H5V7a3 3 0 0 0 3 3"/><path d="M16 5.5h3V7a3 3 0 0 1-3 3"/><path d="M12 13v4"/><path d="M8.5 21h7"/>`,
  perfil:   `<circle cx="12" cy="8" r="3.6"/><path d="M5 20.5a7 7 0 0 1 14 0"/>`,
  manual:   `<path d="M4 5a2 2 0 0 1 2-2h5v18H6a2 2 0 0 0-2 2V5Z"/><path d="M20 5a2 2 0 0 0-2-2h-5v18h5a2 2 0 0 1 2 2V5Z"/>`
};
const NOMBRE_VISTA = { misiones: "Misiones", logros: "Logros", perfil: "Perfil", manual: "Manual" };

function pintarNav() {
  const activa = vista === "dia" ? "misiones" : vista;
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
function estadoDia(n) {
  const hechosSemana = new Set(filas.filter(f => f.semana === E.semana).map(f => f.dia));
  const d = dia(n);
  const total = d.ejercicios.reduce((a, e) => a + e.series, 0);
  const marcadas = d.ejercicios.reduce(
    (a, e) => a + (E.sesion[e.sesionId]?.hechas.filter(Boolean).length || 0), 0);
  return {
    dia: d, total, marcadas,
    hecha: hechosSemana.has(n),
    enCurso: marcadas > 0
  };
}

function pintarMisiones() {
  stopAnim();
  const estados = RUTINA.dias.map(d => estadoDia(d.n));
  const pendiente = estados.find(e => !e.hecha) || estados[0];
  const restantes = estados.filter(e => e.dia.n !== pendiente.dia.n);
  const hechas = estados.filter(e => e.hecha).length;

  const tarjeta = (e, destacada) => {
    const clases = ["tarjeta"];
    if (destacada) clases.push("tarjeta--destacada");
    if (e.hecha) clases.push("tarjeta--hecha");
    else if (e.enCurso) clases.push("tarjeta--curso");
    /* En las pequeñas cabe una línea justa: solo las series. */
    const pie = e.hecha ? "Completada"
              : e.enCurso ? `En curso · ${e.marcadas}/${e.total}`
              : destacada ? `${e.dia.ejercicios.length} ejercicios · ${e.total} series`
              : `${e.total} series`;
    return `<button class="${clases.join(" ")}" data-mision="${e.dia.n}">
        <span class="tarjeta__n">${e.dia.n}</span>
        ${destacada ? `<span class="tarjeta__eti">Siguiente misión</span>` : ""}
        <h3 class="tarjeta__nom">${esc(e.dia.nombre)}</h3>
        <span class="tarjeta__lema">${esc(e.dia.lema)}</span>
        <span class="tarjeta__pie">${pie}</span>
        ${e.enCurso && !e.hecha ? `<span class="tarjeta__via"><i style="width:${(e.marcadas / e.total * 100).toFixed(0)}%"></i></span>` : ""}
      </button>`;
  };

  const r = P.racha(filas);
  const st = P.estadisticas(filas);

  $("app").innerHTML = `
    ${penalizacionHTML(r)}
    <div class="portada">
      <div class="portada__cab">Semana ${E.semana}</div>
      <h2 class="portada__tit">${hechas === RUTINA.dias.length ? "Semana completada" : "Misiones diarias"}</h2>
      <div class="portada__prog">
        <span class="portada__puntos">${RUTINA.dias.map((d, i) =>
          `<i class="${estados[i].hecha ? "on" : ""}"></i>`).join("")}</span>
        <span class="portada__txt">${hechas} de ${RUTINA.dias.length}</span>
        ${r.actual ? `<span class="racha ${r.enRiesgo ? "racha--riesgo" : ""}">Racha ${r.actual}</span>` : ""}
      </div>
      ${r.enRiesgo ? `<div class="portada__riesgo">
        ${r.margen === 0 ? "Hoy es el último día para mantener la racha"
                         : `Queda ${r.margen} día para mantener la racha`}</div>` : ""}
    </div>
    ${copiaHTML(st)}
    <div class="tablero">
      ${tarjeta(pendiente, true)}
      ${restantes.map(e => tarjeta(e, false)).join("")}
    </div>
    ${hechas === RUTINA.dias.length ? `<div class="acciones">
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
    .map(([k, e]) => ({ clave: k, ...e }));
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
  return `<div class="disco" style="background:${p.fondo};color:${p.texto};height:${p.alto}px;width:${p.ancho}px">${kg}</div>`;
}
function barraHTML(total) {
  const c = equipo.repartoDe(total);
  if (!c) return "";
  if (!c.izq.length && !c.der.length) return `<div class="barra"><span class="barra__sola">Barra sola · ${equipo.BARRA.kg} kg</span></div>`;
  const izq = [...c.izq].sort((a, b) => a - b).map(discoHTML).join("");
  const der = [...c.der].sort((a, b) => b - a).map(discoHTML).join("");
  return `<div class="barra">
      <div class="barra__lado barra__lado--i">${izq}</div>
      <div class="barra__eje"></div>
      <div class="barra__lado barra__lado--d">${der}</div>
    </div>
    <div class="barra__pies"><span>Izquierda ${c.izq.join(" + ") || "—"}</span><span>Derecha ${c.der.join(" + ") || "—"}</span></div>`;
}

function pintarDia() {
  const d = dia(diaActivo);
  const total = d.ejercicios.reduce((a, e) => a + e.series, 0);
  const hechas = d.ejercicios.reduce((a, e) => a + serie(e).hechas.filter(Boolean).length, 0);

  const semana = new Set(filas.filter(f => f.semana === E.semana).map(f => f.dia));

  let html = `<div class="saltos">
      ${RUTINA.dias.map(x => `<button class="salto ${semana.has(x.n) ? "hecha" : ""}"
        data-dia="${x.n}" aria-current="${x.n === diaActivo}" aria-label="Día ${x.n}">${x.n}</button>`).join("")}
    </div>
    <div class="mision">
      <div class="mision__cab">Misión diaria</div>
      <h2 class="mision__tit">${esc(d.nombre)}</h2>
      <div class="mision__lema">${esc(d.lema)}</div>
      <div class="mision__meta">${d.ejercicios.length} ejercicios · ${hechas}/${total} series</div>
      <div class="medidor">${d.ejercicios.map(e => `<i class="${serie(e).hechas.filter(Boolean).length === e.series ? "on" : ""}"></i>`).join("")}</div>
    </div>`;

  d.ejercicios.forEach(ej => {
    const kg = pesoDe(ej), st = serie(ej), pasos = escalon(ej);
    const i = pasos.indexOf(kg);
    const unidad = ej.implemento === "mancuerna" ? "kg ×2" : "kg";
    const abierta = tecnicaAbierta === ej.sesionId;
    const enSeg = ej.unidad === "segundos";

    html += `<section class="ej">
      <div class="ej__cab">
        <div class="ej__txt">
          <h3 class="ej__nom"><button class="ej__link" data-ficha="${ej.clave}">${esc(ej.nombre)}</button></h3>
          <div class="ej__meta">${ej.series} × ${ej.min}–${ej.max}${enSeg ? " s" : " reps"} · RIR 2–3${ej.nota ? ` · <em>${esc(ej.nota)}</em>` : ""}</div>
          <div class="ej__musc">${ej.musculos.map(m => `<span>${esc(m)}</span>`).join("")}</div>
          ${E.listos[ej.clave] ? `<span class="marca">Sube el peso</span>` : ""}
        </div>
        <div class="ej__btns">
          <button class="ojo" data-tecnica="${ej.sesionId}" aria-expanded="${abierta}" aria-label="Ver técnica">${OJO}</button>
          <button class="ojo" data-cambiar="${ej.sesionId}" aria-expanded="${cambioAbierto === ej.sesionId}"
                  aria-label="Cambiar ejercicio">${CAMBIO}</button>
        </div>
      </div>
      ${ej.original ? `<div class="sustituido">En vez de ${esc(ej.original)}${ej.temporal ? " · solo hoy" : ""}</div>` : ""}`;

    if (cambioAbierto === ej.sesionId) html += cambioHTML(ej);

    if (abierta) {
      html += `<div class="tecnica"><div id="lienzo"></div><ul class="claves">${
        ej.claves.map(c => {
          const riesgo = c.startsWith("!");
          return `<li class="${riesgo ? "riesgo" : ""}">${esc(riesgo ? c.slice(1) : c)}</li>`;
        }).join("")}</ul></div>`;
    }

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
         Los escalones salen de los discos que tienes, no de porcentajes. */
      if (ej.implemento === "barra" && kg > equipo.BARRA.kg + 10) {
        html += `<div class="calienta">
            <span class="calienta__et">Aproximación</span>
            ${equipo.aproximacion(kg).map(s =>
              `<span class="calienta__s">${s.kg}<i>×${s.reps}</i></span>`).join("")}
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
      <div class="series">${st.hechas.map((v, k) =>
        `<button class="serie ${v ? "ok" : ""}" data-serie="${ej.sesionId}" data-k="${k}" data-descanso="${ej.descanso}">${v ? "✓" : k + 1}</button>`).join("")}</div>
    </section>`;
  });

  html += `<div class="nota">
      <label class="nota__et" for="notaSesion">Notas de la sesión</label>
      <textarea id="notaSesion" class="nota__txt" rows="2" maxlength="280"
        placeholder="El hombro tocado, dormí cinco horas, la barra se me fue...">${esc(E.nota || "")}</textarea>
    </div>
    <div class="acciones">
      <button class="btn btn--arise" id="terminar">Arise · terminar sesión</button>
      <button class="btn btn--fantasma" id="vaciar">Vaciar día</button>
    </div>`;

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
function pintarEjercicio() {
  stopAnim();
  const clave = ejercicioActivo;
  const ej = EJERCICIOS[clave];
  if (!ej) { vista = "perfil"; pintarPerfil(); return; }

  const mias = historialDe(clave);
  const kgActual = E.pesos[clave] ?? ej.kgInicial ?? 0;
  const mejor = mias.reduce((a, f) => Math.max(a, f.kg || 0), 0);
  const volumen = mias.reduce((a, f) => a + (f.volumen || 0), 0);
  const corporal = ej.implemento === "corporal";
  const marca = P.mejorMarca(filas, clave);
  const ultimaVez = mias.length
    ? Math.round((new Date(hoy()) - new Date(mias[mias.length - 1].f)) / 86400000)
    : "—";

  const puntosPeso = mias.map(f => ({ f: f.f, v: f.kg }));
  const puntosVol = mias.map(f => ({ f: f.f, v: Math.round(f.volumen) }));

  const hayGraficas = mias.length >= 2;

  $("app").innerHTML = `
    <div class="mision">
      <div class="mision__cab">${esc(ej.grupo)} · ${esc(ej.patron)}</div>
      <h2 class="mision__tit">${esc(ej.nombre)}</h2>
      <div class="ej__musc" style="margin-top:9px">${ej.musculos.map(m => `<span>${esc(m)}</span>`).join("")}</div>
    </div>

    <div class="atributos">
      <div class="atr"><span class="atr__cl">AHORA</span><span class="atr__val">${kgActual}${ej.implemento === "corporal" ? "" : " kg"}</span><span class="atr__nom">Carga actual</span></div>
      <div class="atr"><span class="atr__cl">${corporal ? "REPS" : "1RM"}</span>
        <span class="atr__val">${marca || "—"}${marca && !corporal ? " kg" : ""}</span>
        <span class="atr__nom">${corporal ? "Mejor serie" : "Máximo estimado"}</span></div>
      <div class="atr"><span class="atr__cl">TOPE</span>
        <span class="atr__val">${corporal ? equipo.cargaReal(ej, 0, pesoActual()) + " kg" : (mejor ? mejor + " kg" : "—")}</span>
        <span class="atr__nom">${corporal ? "Carga efectiva" : "Más peso movido"}</span></div>
      <div class="atr"><span class="atr__cl">VECES</span><span class="atr__val">${mias.length}</span><span class="atr__nom">Sesiones</span></div>
      <div class="atr"><span class="atr__cl">VOL</span><span class="atr__val">${(volumen / 1000).toFixed(1)} t</span><span class="atr__nom">Acumulado</span></div>
      <div class="atr"><span class="atr__cl">ÚLTIMA</span><span class="atr__val">${ultimaVez}</span><span class="atr__nom">Días desde</span></div>
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
      <div class="vt__cab">Técnica</div>
      <div id="lienzo" class="lienzo"></div>
      <ul class="claves">${ej.claves.map(c => {
        const riesgo = c.startsWith("!");
        return `<li class="${riesgo ? "riesgo" : ""}">${esc(riesgo ? c.slice(1) : c)}</li>`;
      }).join("")}</ul>
    </div>

    ${mias.length ? `<div class="vt">
      <div class="vt__cab">Registro</div>
      <table class="tabla">
        <tr><th>Fecha</th><th>Carga</th><th>Series</th><th>${corporal ? "Reps" : "1RM"}</th></tr>
        ${[...mias].reverse().map(f => {
          const m = P.marcaDe(f);
          return `<tr><td>${diaMes(f.f)}</td><td>${f.kg} kg</td>
            <td>${f.series}×${f.reps}</td>
            <td>${m ? `${m}${corporal ? "" : " kg"}${m === marca ? " ★" : ""}` : "—"}</td></tr>
            ${f.nota ? `<tr class="fila-nota"><td colspan="4">“${esc(f.nota)}”</td></tr>` : ""}`;
        }).join("")}
      </table>
    </div>` : ""}`;

  if (ej.figura) {
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

  /* Ejercicios ya registrados primero: son los que se vienen a mirar. */
  const entrenados = new Set(filas.map(f => f.ej).filter(Boolean));
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

    ${r.mejor ? `<div class="vt">
      <div class="vt__cab">Racha</div>
      <p class="vt__txt">${r.rota
        ? `Sin entrenar desde hace <b>${r.diasDesde} días</b>. La racha está a cero.`
        : `<b>${r.actual} sesiones</b> seguidas sin dejar pasar más de ${P.DIAS_GRACIA} días.`}
        Tu mejor marca son <b>${r.mejor}</b>.</p>
      <p class="vt__pie">Cuentan los días entre sesiones, no los días seguidos:
      descansar forma parte del plan, desaparecer no.</p>
    </div>` : ""}

    ${mapaHTML()}
    ${corporalHTML()}

    <div class="vt">
      <div class="vt__cab">Arsenal</div>
      <div class="arsenal">${arsenal.map(e => `
        <button class="arma ${entrenados.has(e.clave) ? "" : "arma--nueva"}" data-ficha="${e.clave}">
          <span class="arma__nom">${esc(e.nombre)}</span>
          <span class="arma__meta">${esc(e.grupo)}${e.veces ? ` · ${e.veces} ses.` : " · sin estrenar"}</span>
        </button>`).join("")}</div>
    </div>

    <div class="vt">
      <div class="vt__cab">Inventario</div>
      <p class="vt__txt">${equipo.BARRA.nombre} de ${equipo.BARRA.kg} kg y discos de ${equipo.DISCOS.join(", ")} kg.
      Salen <b>${equipo.CARGAS_BARRA.length} cargas</b> distintas, de ${equipo.CARGAS_BARRA[0].total} a ${equipo.TOPE_BARRA} kg.</p>
      <table class="tabla">
        <tr><th>Total</th><th>Izquierda</th><th>Derecha</th></tr>
        ${equipo.CARGAS_BARRA.map(c => `<tr><td>${c.total} kg</td><td>${c.izq.join(" + ") || "—"}</td><td>${c.der.join(" + ") || "—"}</td></tr>`).join("")}
      </table>
      <p class="vt__pie">Para cambiar el material, edita <code>datos/equipo.js</code>: todo se recalcula solo.</p>
    </div>

    ${ultimas.length ? `<div class="vt">
      <div class="vt__cab">Últimas series</div>
      <p class="vt__pie" style="margin:0 0 8px">Toca una línea para corregirla o borrarla.</p>
      <table class="tabla tabla--editable">
        <tr><th>Fecha</th><th>Ejercicio</th><th>Carga</th><th>Series</th><th></th></tr>
        ${ultimas.map(f => `
          <tr class="${editando === f.id ? "fila--abierta" : ""}" data-fila="${f.id}">
            <td>${diaMes(f.f)}</td><td>${esc(f.nombre)}</td><td>${f.kg} kg</td>
            <td>${f.series}×${f.reps}</td><td class="tabla__ir">${editando === f.id ? "×" : "✎"}</td>
          </tr>
          ${editando === f.id ? editor(f) : ""}`).join("")}
      </table>
    </div>` : ""}

    <div class="vt">
      <div class="vt__cab">Aspecto</div>
      <p class="vt__txt">En automático sigue lo que tenga puesto el móvil.
      La cabecera y el menú se quedan oscuros siempre: encima va la hora
      y la batería del iPhone, en blanco.</p>
      <div class="tema">
        ${[["auto", "Automático"], ["oscuro", "Oscuro"], ["claro", "Claro"]].map(([v, n]) =>
          `<button class="tema__b" data-tema="${v}" aria-pressed="${temaGuardado() === v}">${n}</button>`).join("")}
      </div>
    </div>

    <div class="vt">
      <div class="vt__cab">Datos</div>
      <p class="vt__txt">Motor: <code>${motor}</code> · <b>${filas.length}</b> series guardadas en este móvil.</p>
      <p class="vt__txt">${E.copia
        ? `Última copia: <b>${E.copia.fecha}</b>, con ${E.copia.sesiones} sesiones.`
        : "Todavía no has guardado ninguna copia."}
        Si borras el icono de la pantalla de inicio o limpias Safari, se va todo.</p>
      <div class="acciones">
        <button class="btn" id="expJson">Descargar copia de seguridad</button>
        <button class="btn" id="impJson">Restaurar copia</button>
        <button class="btn" id="expCsv">Exportar historial (CSV)</button>
        <button class="btn" id="semana">Empezar semana ${E.semana + 1}</button>
        <button class="btn btn--fantasma" id="cambiarFicha">Cambiar de cazador</button>
      </div>
      <input type="file" id="ficheroCopia" accept="application/json,.json" hidden>
    </div>`;
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

    <h2>Cómo elegir el peso</h2>
    <p>Cada serie termina con <strong>2–3 reps en recámara</strong>. Si acabas y podrías hacer cinco más, es calentamiento. Si fallas antes de llegar al rango, has puesto demasiado. Ajusta el mismo día, no la semana siguiente.</p>

    <h2>Doble progresión</h2>
    <p>Tus discos solo permiten saltos de 10 kg, y eso es brutal en press militar (30→40 es un +33%). Por eso no se sube peso hasta agotar las reps:</p>
    <ul>
      <li>Empiezas abajo del rango — por ejemplo <code>4×8</code>.</li>
      <li>Sumas reps cada semana con el mismo peso hasta el techo — <code>4×12</code>.</li>
      <li>Cuando completas todas las series arriba del rango, el Sistema marca <em>Sube el peso</em>.</li>
      <li>Subes 10 kg y vuelves abajo del rango. Otra vez a escalar.</li>
    </ul>
    <p>Si el salto de 10 te tumba, haz un microciclo: dos series con el peso nuevo y dos con el viejo hasta que aguantes las cuatro.</p>

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
  else if (vista === "perfil") pintarPerfil();
  else if (vista === "manual") pintarManual();
  else if (vista === "ejercicio") pintarEjercicio();
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
async function revisarLogros(ultima = null) {
  const ctx = P.contexto({ estado: E, filas, ultima });
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

async function cerrarSesion() {
  const d = dia(diaActivo);
  const nuevas = [], records = [];
  let subidas = 0, volumen = 0, xp = 0, completa = true;
  /* Se lee del campo, no del estado: pulsar Arise sin salir del texto
     dispara el guardado justo después de este momento. */
  const nota = ($("notaSesion")?.value ?? E.nota ?? "").trim().slice(0, 280);
  const fecha = hoy(), ahora = new Date();
  const antes = P.estadisticas(filas);

  /* Duración real, si se marcó alguna serie. Más de cinco horas es que
     la app se quedó abierta toda la tarde: mejor no guardar nada que
     guardar una mentira. */
  const brutos = E.iniciada ? Math.round((ahora - new Date(E.iniciada)) / 60000) : null;
  const minutos = brutos != null && brutos > 0 && brutos <= 300 ? brutos : null;

  for (const ej of d.ejercicios) {
    const st = serie(ej);
    const hechas = st.hechas.filter(Boolean).length;
    if (hechas < ej.series) completa = false;
    if (!hechas) { delete E.sesion[ej.sesionId]; continue; }

    const kg = pesoDe(ej);
    const carga = equipo.cargaReal(ej, kg, pesoActual());
    const vol = carga * hechas * st.reps;
    const xpEj = P.xpDeSerie(carga, st.reps) * hechas;

    /* Rango de reps agotado con todas las series: toca subir peso. */
    if (hechas === ej.series && st.reps >= ej.max && ej.implemento !== "mancuerna" && ej.implemento !== "corporal") {
      if (!E.listos[ej.clave]) subidas++;
      E.listos[ej.clave] = true;
    }

    /* Récord contra la mejor marca anterior de ese ejercicio. La primera
       vez no cuenta: cualquier número sería un récord y no significa nada. */
    const marcaPrevia = P.mejorMarca(filas, ej.clave);
    const fila = { implemento: ej.implemento, carga, reps: st.reps };
    const marca = P.marcaDe(fila);
    if (marcaPrevia > 0 && marca > marcaPrevia) {
      records.push({ nombre: ej.nombre, marca, unidad: P.unidadMarca(fila) });
    }

    nuevas.push({
      cazador: cazador.id, f: fecha, ts: ahora.toISOString(),
      semana: E.semana, dia: d.n, ej: ej.clave, nombre: ej.nombre,
      implemento: ej.implemento, kg, carga, minutos, nota,
      series: hechas, reps: st.reps, volumen: vol, xp: xpEj
    });
    volumen += vol; xp += xpEj;
    delete E.sesion[ej.sesionId];
  }

  if (!nuevas.length) { aviso("No has marcado ninguna serie"); return; }

  const anteriores = filas.map(f => f.f).sort();
  const ultimaFecha = anteriores[anteriores.length - 1];
  const diasParado = ultimaFecha
    ? Math.round((new Date(fecha) - new Date(ultimaFecha)) / 86400000) : 0;

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

  const nuevos = await revisarLogros({
    dia: d.n, volumen, series: nuevas.length, subidas, completa,
    hora: ahora.getHours(), diasParado, minutos, records: records.length
  });

  /* De vuelta al tablero: se ve la misión marcada y qué queda de semana. */
  vista = "misiones";
  pintar(); arriba();
  if (!nuevos.length && !records.length && despues.nivel === antes.nivel) {
    const tiempo = minutos ? ` · ${minutos} min` : "";
    aviso(`<b>Misión completada</b><span>+${miles(xp + P.XP_MISION)} XP · ${miles(volumen)} kg${tiempo}</span>`, "exito");
  }
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
    vista = "dia"; tecnicaAbierta = null;
    pintar(); arriba();
    return;
  }
  if (b.dataset.vista) { vista = b.dataset.vista; tecnicaAbierta = null; editando = null; pintar(); arriba(); return; }
  if (b.dataset.ficha) {
    ejercicioActivo = b.dataset.ficha;
    puntoSel = { tipo: null, i: null };
    vista = "ejercicio"; pintar(); arriba();
    return;
  }
  if (b.id === "irACopia") { vista = "perfil"; pintar(); arriba(); return; }

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

  /* --- marcar serie --- */
  if (b.dataset.serie) {
    const ej = dia(diaActivo).ejercicios.find(x => x.sesionId === b.dataset.serie);
    const st = serie(ej), k = +b.dataset.k;
    st.hechas[k] = !st.hechas[k];
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
      const pasos = ej ? equipo.escalonDe(ej.implemento) : [];
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
    f.volumen = f.carga * f.series * f.reps;
    f.xp = P.xpDeSerie(f.carga, f.reps) * f.series;
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
  if (b.id === "semana") { E.semana++; await guardar(); await revisarLogros(); pintar(); aviso("Semana " + E.semana); return; }
  if (b.id === "cambiarFicha") { abrirSelector(); return; }

  if (b.id === "expCsv") {
    if (!filas.length) { aviso("Todavía no hay sesiones guardadas"); return; }
    const csv = "fecha,semana,dia,ejercicio,kg,carga_real,series,reps,volumen,xp\n" +
      filas.map(f => [f.f, f.semana, f.dia, `"${f.nombre}"`, f.kg, f.carga, f.series, f.reps, f.volumen, f.xp].join(",")).join("\n");
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
  }
});

document.addEventListener("change", async e => {
  if (e.target.id === "notaSesion") { E.nota = e.target.value.trim(); await guardar(); return; }
  if (e.target.id !== "ficheroCopia") return;
  const file = e.target.files[0]; e.target.value = "";
  if (!file) return;
  if (!confirm(`Esto reemplaza los datos de ${cazador.nombre} en este móvil. ¿Seguimos?`)) return;
  try {
    const n = await DB.copia.importar(cazador.id, JSON.parse(await file.text()));
    E = await DB.estado.cargar(cazador.id);
    filas = await DB.historial.lista(cazador.id);
    desbloqueados = (await DB.logros.lista(cazador.id)).map(l => l.logro);
    pintar();
    aviso(`Restaurado · ${n} series`);
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

/* Service worker: que la app abra sin cobertura. */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").then(reg => {
      reg.addEventListener("updatefound", () => {
        const nuevo = reg.installing;
        nuevo?.addEventListener("statechange", () => {
          if (nuevo.state === "installed" && navigator.serviceWorker.controller) {
            aviso("Hay una versión nueva · ciérrala y ábrela para actualizar");
          }
        });
      });
    }).catch(err => console.warn("Service worker no registrado:", err));
  });
}
