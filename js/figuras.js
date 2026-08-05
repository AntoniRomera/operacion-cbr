/* ============================================================
   MOTOR DE FIGURAS SVG
   Dibuja el muñeco de un ejercicio y lo anima entre sus dos
   posiciones. No sabe nada de la app: le pasas una clave de
   figura y devuelve un <svg> con su función de actualización.
   ============================================================ */

import { FIG } from "../datos/figuras.js";

const NS = "http://www.w3.org/2000/svg";
const el = (tag, attrs) => { const e = document.createElementNS(NS, tag); for(const k in attrs) e.setAttribute(k, attrs[k]); return e; };
const lerp = (a,b,t) => [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t];
const pts = arr => arr.map(p => p[0].toFixed(1)+","+p[1].toFixed(1)).join(" ");
const toeOf = (p,k) => p[k] || [p[k==="toe"?"ft":"ft2"][0]+11, p[k==="toe"?"ft":"ft2"][1]];

export function buildFigure(figKey){
  const f = FIG[figKey];
  const svg = el("svg", { viewBox:"0 0 200 145", class:"tech__stage", "aria-hidden":"true" });

  const gStatic = el("g", {}), gImp = el("g", {}), gBody = el("g", {});
  svg.append(gStatic, gImp, gBody);

  /* --- material estático --- */
  f.gear.forEach(g => {
    const [kind, args] = g.split(":");
    const n = (args||"").split(",").map(Number);
    if(kind === "floor"){
      gStatic.append(el("line", { class:"fig-suelo", x1:0, y1:134.5, x2:200, y2:134.5, "stroke-width":1.5 }));
    }
    if(kind === "bench"){
      gStatic.append(el("rect", { class:"fig-hierro-f", x:n[0], y:n[2], width:n[1]-n[0], height:7, rx:2 }));
      gStatic.append(el("line", { class:"fig-hierro", x1:n[0]+6, y1:n[2]+7, x2:n[0]+6, y2:134, "stroke-width":4 }));
      gStatic.append(el("line", { class:"fig-hierro", x1:n[1]-6, y1:n[2]+7, x2:n[1]-6, y2:134, "stroke-width":4 }));
    }
    if(kind === "rack"){
      [26,150].forEach(x => gStatic.append(el("line", { class:"fig-hierro", x1:x, y1:32, x2:x, y2:134, "stroke-width":5 })));
      /* pines de seguridad, en rojo: es la parte que salva la vida */
      gStatic.append(el("line", { class:"fig-riesgo", x1:26, y1:70, x2:44, y2:70, "stroke-width":3 }));
      gStatic.append(el("line", { class:"fig-riesgo", x1:132, y1:70, x2:150, y2:70, "stroke-width":3 }));
    }
    if(kind === "pullbar"){
      [44,156].forEach(x => gStatic.append(el("line", { class:"fig-hierro", x1:x, y1:18, x2:x, y2:134, "stroke-width":5 })));
      gStatic.append(el("line", { class:"fig-hierro2", x1:44, y1:20, x2:156, y2:20, "stroke-width":4, "stroke-linecap":"round" }));
    }
    if(kind === "fixbar"){
      [40,160].forEach(x => gStatic.append(el("line", { class:"fig-hierro", x1:x, y1:40, x2:x, y2:134, "stroke-width":5 })));
      gStatic.append(el("line", { class:"fig-hierro2", x1:40, y1:n[1], x2:160, y2:n[1], "stroke-width":4, "stroke-linecap":"round" }));
    }
    if(kind === "incline"){
      gStatic.append(el("line", { class:"fig-hierro", x1:100, y1:132, x2:100, y2:96, "stroke-width":5 }));
      gStatic.append(el("ellipse", { class:"fig-hierro-f", cx:100, cy:92, rx:20, ry:7 }));
    }
  });

  /* --- implemento dinámico --- */
  let imp = null;
  const kind = (f.imp||"").split(":")[0];
  const anch = (f.imp||"").split(":")[1];
  if(kind === "barSide"){
    imp = el("circle", { r:7, fill:"none", stroke:"var(--p20)", "stroke-width":4 });
    gImp.append(imp);
  } else if(kind === "barBig"){
    imp = el("circle", { r:13, fill:"none", stroke:"var(--p25)", "stroke-width":5 });
    gImp.append(imp);
  } else if(kind === "discSide"){
    imp = el("circle", { r:8, fill:"none", stroke:"var(--p15)", "stroke-width":4 });
    gImp.append(imp);
  } else if(kind === "landmine"){
    const a = anch.split(",").map(Number);
    imp = el("line", { class:"fig-acero", x1:a[0], y1:a[1], "stroke-width":3, "stroke-linecap":"round" });
    gImp.append(el("circle", { class:"fig-acero-f", cx:a[0], cy:a[1], r:4 }), imp);
  } else if(kind === "barFront"){
    imp = el("g", {});
    const shaft = el("line", { class:"fig-acero", "stroke-width":3.5, "stroke-linecap":"round" });
    const pl = el("line", { stroke:"var(--p20)", "stroke-width":10, "stroke-linecap":"round" });
    const pr = el("line", { stroke:"var(--p20)", "stroke-width":10, "stroke-linecap":"round" });
    imp.append(shaft, pl, pr); imp._parts = { shaft, pl, pr }; gImp.append(imp);
  } else if(kind === "dumbbells"){
    imp = el("g", {});
    const a = el("line", { stroke:"var(--p10)", "stroke-width":8, "stroke-linecap":"round" });
    const b = el("line", { stroke:"var(--p10)", "stroke-width":8, "stroke-linecap":"round" });
    imp.append(a,b); imp._parts = { a, b }; gImp.append(imp);
  }

  /* --- cuerpo --- */
  const mk = w => el("polyline", { class:"fig-cerca", fill:"none", "stroke-width":w,
                                   "stroke-linecap":"round", "stroke-linejoin":"round" });
  const far = w => el("polyline", { class:"fig-lejos", fill:"none", "stroke-width":w,
                                    "stroke-linecap":"round", "stroke-linejoin":"round" });
  const torso = mk(5), legA = mk(4.5), armA = mk(4);
  const legB = far(4.5), armB = far(4);
  const head = el("circle", { class:"fig-cerca", r:8, fill:"none", "stroke-width":4 });
  const neck = mk(3.5);
  const shbar = mk(4.5);
  gBody.append(legB, armB, torso, shbar, legA, armA, neck, head);

  const hasL2 = !!f.a.kn2, hasA2 = !!f.a.el2;
  if(!hasL2) legB.style.display = "none";
  if(!hasA2) armB.style.display = "none";
  if(f.view !== "front") shbar.style.display = "none";

  function update(t){
    const A = f.a, Z = f.z, P = {};
    for(const k in A) P[k] = lerp(A[k], Z[k], t);

    const swx = f.view === "front" ? 14 : 0;
    const shR = [P.sh[0]+swx, P.sh[1]], shL = [P.sh[0]-swx, P.sh[1]];

    torso.setAttribute("points", pts([P.sh, P.hip]));
    if(f.view === "front") shbar.setAttribute("points", pts([shL, shR]));
    neck.setAttribute("points", pts([P.sh, P.h]));
    head.setAttribute("cx", P.h[0]); head.setAttribute("cy", P.h[1]);

    legA.setAttribute("points", pts([P.hip, P.kn, P.ft, toeOf(P,"toe")]));
    if(hasL2) legB.setAttribute("points", pts([P.hip, P.kn2, P.ft2, toeOf(P,"toe2")]));

    armA.setAttribute("points", pts([shR, P.el, P.hd]));
    if(hasA2) armB.setAttribute("points", pts([shL, P.el2, P.hd2]));

    if(imp && P.b){
      if(kind === "barSide" || kind === "barBig" || kind === "discSide"){
        imp.setAttribute("cx", P.b[0]); imp.setAttribute("cy", P.b[1]);
      } else if(kind === "landmine"){
        imp.setAttribute("x2", P.b[0]); imp.setAttribute("y2", P.b[1]);
      } else if(kind === "barFront"){
        const y = P.b[1], p = imp._parts;
        p.shaft.setAttribute("x1", 58); p.shaft.setAttribute("x2", 142);
        p.shaft.setAttribute("y1", y); p.shaft.setAttribute("y2", y);
        p.pl.setAttribute("x1", 58); p.pl.setAttribute("x2", 66);
        p.pl.setAttribute("y1", y); p.pl.setAttribute("y2", y);
        p.pr.setAttribute("x1", 134); p.pr.setAttribute("x2", 142);
        p.pr.setAttribute("y1", y); p.pr.setAttribute("y2", y);
      }
    }
    if(kind === "dumbbells"){
      const p = imp._parts;
      p.a.setAttribute("x1", P.hd[0]-4); p.a.setAttribute("x2", P.hd[0]+4);
      p.a.setAttribute("y1", P.hd[1]);   p.a.setAttribute("y2", P.hd[1]);
      p.b.setAttribute("x1", P.hd2[0]-4);p.b.setAttribute("x2", P.hd2[0]+4);
      p.b.setAttribute("y1", P.hd2[1]);  p.b.setAttribute("y2", P.hd2[1]);
    }
  }
  return { svg, update };
}

/* animación: ida y vuelta con pausa en los extremos */
let animId = null;
export function animate(fig){
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(reduce){ fig.update(1); return; }
  const T0 = performance.now(), PERIOD = 3400, HOLD = .18;
  function frame(now){
    let u = ((now - T0) % PERIOD) / PERIOD;      // 0..1
    let s = u < .5 ? u*2 : (1-u)*2;              // triángulo
    s = Math.min(1, Math.max(0, (s - HOLD) / (1 - 2*HOLD)));
    fig.update(0.5 - Math.cos(s*Math.PI)/2);     // suavizado
    animId = requestAnimationFrame(frame);
  }
  animId = requestAnimationFrame(frame);
}
export function stopAnim(){ if(animId) cancelAnimationFrame(animId); animId = null; }
