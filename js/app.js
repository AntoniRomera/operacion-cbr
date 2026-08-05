/* ============================================================
   SISTEMA · interfaz
   Cuatro pantallas: la puerta (elegir o crear cazador), la misión
   del día, los logros y el perfil. Todo se pinta con plantillas de
   texto y un único manejador de clics delegado en el documento.
   ============================================================ */

import { RUTINA, dia as diaDe } from "../datos/rutina.js";
import { EJERCICIOS } from "../datos/ejercicios.js";
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
let motor = "";

const CLAVE_SESION = "sistema:cazador";

/* ---------- utilidades ---------- */
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const mmss = s => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
const miles = n => n.toLocaleString("es-ES");
const hoy = () => new Date().toISOString().slice(0, 10);

const pesoDe = ej => E.pesos[ej.clave] ?? ej.kgInicial ?? 0;
const escalon = ej => equipo.escalonDe(ej.implemento);
const serie = ej => {
  if (!E.sesion[ej.sesionId]) E.sesion[ej.sesionId] = { hechas: Array(ej.series).fill(false), reps: ej.min };
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
  const d = diaDe(n);
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

  $("app").innerHTML = `
    <div class="portada">
      <div class="portada__cab">Semana ${E.semana}</div>
      <h2 class="portada__tit">${hechas === RUTINA.dias.length ? "Semana completada" : "Misiones diarias"}</h2>
      <div class="portada__prog">
        <span class="portada__puntos">${RUTINA.dias.map((d, i) =>
          `<i class="${estados[i].hecha ? "on" : ""}"></i>`).join("")}</span>
        <span class="portada__txt">${hechas} de ${RUTINA.dias.length}</span>
      </div>
    </div>
    <div class="tablero">
      ${tarjeta(pendiente, true)}
      ${restantes.map(e => tarjeta(e, false)).join("")}
    </div>
    ${hechas === RUTINA.dias.length ? `<div class="acciones">
      <button class="btn btn--go" id="semana">Empezar semana ${E.semana + 1}</button>
    </div>` : ""}`;
}

/* ============================================================
   MISIÓN DEL DÍA
   ============================================================ */
const OJO = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="6" r="2.4"/><path d="M12 8.5v5"/><path d="M7 10.5l5 1 5-1"/><path d="M9.5 21l2.5-7.5 2.5 7.5"/></svg>`;

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
  const d = diaDe(diaActivo);
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
          <h3 class="ej__nom">${esc(ej.nombre)}</h3>
          <div class="ej__meta">${ej.series} × ${ej.min}–${ej.max}${enSeg ? " s" : " reps"} · RIR 2–3${ej.nota ? ` · <em>${esc(ej.nota)}</em>` : ""}</div>
          <div class="ej__musc">${ej.musculos.map(m => `<span>${esc(m)}</span>`).join("")}</div>
          ${E.listos[ej.clave] ? `<span class="marca">Sube el peso</span>` : ""}
        </div>
        <button class="ojo" data-tecnica="${ej.sesionId}" aria-expanded="${abierta}" aria-label="Ver técnica">${OJO}</button>
      </div>`;

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
      html += `</div>`;
    } else {
      html += `<div class="carga carga--corporal">Peso corporal · ~${equipo.cargaReal(ej, 0, cazador.pesoCorporal)} kg efectivos</div>`;
    }

    html += `<div class="reps">
        <span class="reps__et">${enSeg ? "Segundos" : "Reps"} logradas</span>
        <div class="reps__caja">
          <button class="mini" data-reps="${ej.sesionId}" data-dir="-1" aria-label="Menos">−</button>
          <span class="reps__val">${st.reps}</span>
          <button class="mini" data-reps="${ej.sesionId}" data-dir="1" aria-label="Más">+</button>
        </div>
      </div>
      <div class="series">${st.hechas.map((v, k) =>
        `<button class="serie ${v ? "ok" : ""}" data-serie="${ej.sesionId}" data-k="${k}" data-descanso="${ej.descanso}">${v ? "✓" : k + 1}</button>`).join("")}</div>
    </section>`;
  });

  html += `<div class="acciones">
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
   PERFIL
   ============================================================ */
function pintarPerfil() {
  stopAnim();
  const st = P.estadisticas(filas);
  const ultimas = [...filas].slice(-8).reverse();

  $("app").innerHTML = `
    <div class="mision">
      <div class="mision__cab">Ficha de cazador</div>
      <h2 class="mision__tit">${esc(cazador.nombre)}</h2>
      <div class="mision__lema">Rango ${st.rango} · nivel ${st.nivel} · ${miles(st.xp)} XP</div>
    </div>

    <div class="atributos">
      ${P.atributos(st).map(a => `
        <div class="atr">
          <span class="atr__cl">${a.clave}</span>
          <span class="atr__val">${a.valor}${a.sufijo}</span>
          <span class="atr__nom">${a.nombre}</span>
        </div>`).join("")}
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
      <table class="tabla">
        <tr><th>Fecha</th><th>Ejercicio</th><th>Carga</th><th>Series</th></tr>
        ${ultimas.map(f => `<tr><td>${f.f.slice(5)}</td><td>${esc(f.nombre)}</td><td>${f.kg} kg</td><td>${f.series}×${f.reps}</td></tr>`).join("")}
      </table>
    </div>` : ""}

    <div class="vt">
      <div class="vt__cab">Datos</div>
      <p class="vt__txt">Motor: <code>${motor}</code> · <b>${filas.length}</b> series guardadas en este móvil.</p>
      <p class="vt__txt">Si borras el icono de la pantalla de inicio o limpias Safari, se va todo. La copia es un archivo: guárdalo donde quieras.</p>
      <div class="acciones">
        <button class="btn" id="expCsv">Exportar historial (CSV)</button>
        <button class="btn" id="expJson">Descargar copia de seguridad</button>
        <button class="btn" id="impJson">Restaurar copia</button>
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
  else if (vista === "dia") pintarDia();
  else pintarMisiones();
}

/* ---------- descanso ---------- */
let idDescanso = null, quedan = 0, totalDescanso = 0;
function empezarDescanso(seg) {
  clearInterval(idDescanso);
  quedan = totalDescanso = seg;
  $("descanso").classList.add("on");
  ticDescanso();
  idDescanso = setInterval(() => { quedan--; ticDescanso(); if (quedan <= 0) acabarDescanso(true); }, 1000);
}
function ticDescanso() {
  $("descansoT").textContent = mmss(Math.max(quedan, 0));
  $("descansoF").style.width = (Math.max(quedan, 0) / totalDescanso * 100) + "%";
}
function acabarDescanso(completo) {
  clearInterval(idDescanso); idDescanso = null;
  $("descanso").classList.remove("on");
  if (completo) { try { navigator.vibrate?.([120, 60, 120]); } catch (e) {} }
}

/* ---------- guardar ---------- */
const guardar = () => DB.estado.guardar(E);
function repintarQuieto() {
  const y = window.scrollY;
  pintar();
  window.scrollTo(0, y);
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
async function terminarSesion() {
  const d = diaDe(diaActivo);
  const nuevas = [];
  let subidas = 0, volumen = 0, xp = 0, completa = true;
  const fecha = hoy(), ahora = new Date();

  for (const ej of d.ejercicios) {
    const st = serie(ej);
    const hechas = st.hechas.filter(Boolean).length;
    if (hechas < ej.series) completa = false;
    if (!hechas) { delete E.sesion[ej.sesionId]; continue; }

    const kg = pesoDe(ej);
    const carga = equipo.cargaReal(ej, kg, cazador.pesoCorporal);
    const vol = carga * hechas * st.reps;
    const xpEj = P.xpDeSerie(carga, st.reps) * hechas;

    /* Rango de reps agotado con todas las series: toca subir peso. */
    if (hechas === ej.series && st.reps >= ej.max && ej.implemento !== "mancuerna" && ej.implemento !== "corporal") {
      if (!E.listos[ej.clave]) subidas++;
      E.listos[ej.clave] = true;
    }

    nuevas.push({
      cazador: cazador.id, f: fecha, ts: ahora.toISOString(),
      semana: E.semana, dia: d.n, ej: ej.clave, nombre: ej.nombre,
      implemento: ej.implemento, kg, carga,
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
  await guardar();

  const nuevos = await revisarLogros({
    dia: d.n, volumen, series: nuevas.length, subidas, completa,
    hora: ahora.getHours(), diasParado
  });

  /* De vuelta al tablero: se ve la misión marcada y qué queda de semana. */
  vista = "misiones";
  pintar(); window.scrollTo(0, 0);
  if (!nuevos.length) {
    aviso(`<b>Misión completada</b><span>+${miles(xp + P.XP_MISION)} XP · ${miles(volumen)} kg movidos</span>`, "exito");
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
document.addEventListener("click", async e => {
  const b = e.target.closest("button");
  if (!b) return;

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
    pintar(); window.scrollTo(0, 0);
    return;
  }
  if (b.dataset.vista) { vista = b.dataset.vista; tecnicaAbierta = null; pintar(); window.scrollTo(0, 0); return; }

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
    const ej = diaDe(diaActivo).ejercicios.find(x => x.sesionId === b.dataset.peso);
    const pasos = escalon(ej), i = pasos.indexOf(pesoDe(ej)) + (+b.dataset.dir);
    if (i >= 0 && i < pasos.length) {
      E.pesos[ej.clave] = pasos[i];
      E.listos[ej.clave] = false;
      await guardar();
      repintarQuieto();
    }
    return;
  }

  /* --- reps --- */
  if (b.dataset.reps) {
    const ej = diaDe(diaActivo).ejercicios.find(x => x.sesionId === b.dataset.reps);
    const st = serie(ej);
    st.reps = Math.max(0, st.reps + (+b.dataset.dir) * (ej.unidad === "segundos" ? 5 : 1));
    await guardar();
    repintarQuieto();
    return;
  }

  /* --- marcar serie --- */
  if (b.dataset.serie) {
    const ej = diaDe(diaActivo).ejercicios.find(x => x.sesionId === b.dataset.serie);
    const st = serie(ej), k = +b.dataset.k;
    st.hechas[k] = !st.hechas[k];
    await guardar();
    repintarQuieto();
    if (st.hechas[k]) empezarDescanso(+b.dataset.descanso);
    return;
  }

  /* --- acciones --- */
  if (b.id === "terminar") { await terminarSesion(); return; }
  if (b.id === "vaciar") {
    diaDe(diaActivo).ejercicios.forEach(ej => delete E.sesion[ej.sesionId]);
    await guardar(); pintar(); aviso("Día vaciado");
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
    aviso("Copia descargada");
    return;
  }
  if (b.id === "impJson") { $("ficheroCopia").click(); return; }
});

document.addEventListener("change", async e => {
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
