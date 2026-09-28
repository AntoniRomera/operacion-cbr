/* ============================================================
   AVATARES DE CAZADOR
   SVG abstracto determinista a partir del nombre — mismo nombre,
   mismo avatar siempre, sin imágenes ni petición de red. Esta PWA no
   tiene paso de build (nada de npm install), así que en vez de tirar
   de una librería (tipo boring-avatars) se reimplementa la idea en
   unas pocas líneas: hash del nombre -> semilla -> colores y formas.
   Paleta = los colores de rango que ya usa la app (`COLOR_RANGO` en
   datos/logros.js), para que el avatar encaje con el resto del
   "Sistema" en vez de traer una paleta genérica. Ver spec 012.
   ============================================================ */

const PALETA_AVATAR = ["#8496A6", "#2E8B57", "#2B5FA8", "#8B5CF6", "#D9A521", "#C8342E"];

const escapar = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/** Hash determinista de un string (djb2), siempre un entero ≥ 0. */
function hashNombre(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h;
}

/** Generador pseudoaleatorio determinista a partir de una semilla —
    mismo nombre, misma secuencia de números, siempre. */
function pseudoAleatorio(semilla) {
  let s = semilla || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * SVG del avatar de un nombre, como string listo para insertar en el
 * DOM. `tamano` en px (cuadrado). Sin nombre, cae en "?" — nunca se
 * deja sin avatar por un dato vacío.
 */
export function avatarSVG(nombre, tamano = 40) {
  const texto = (nombre || "?").trim() || "?";
  const rnd = pseudoAleatorio(hashNombre(texto));
  const color = () => PALETA_AVATAR[Math.floor(rnd() * PALETA_AVATAR.length)];
  const colores = [color(), color(), color()];
  const claveMascara = `av${hashNombre(texto)}`;

  const blob = color => {
    const cx = 8 + rnd() * 24, cy = 8 + rnd() * 24;
    const rx = 12 + rnd() * 11, ry = 12 + rnd() * 11;
    const rot = Math.floor(rnd() * 360);
    return `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}"
      transform="rotate(${rot} ${cx.toFixed(1)} ${cy.toFixed(1)})" fill="${color}" opacity=".85"/>`;
  };

  return `<svg width="${tamano}" height="${tamano}" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"
      role="img" aria-label="Avatar de ${escapar(texto)}">
      <defs><clipPath id="${claveMascara}"><circle cx="20" cy="20" r="20"/></clipPath></defs>
      <g clip-path="url(#${claveMascara})">
        <rect width="40" height="40" fill="${colores[0]}"/>
        ${blob(colores[1])}
        ${blob(colores[2])}
      </g>
    </svg>`;
}
