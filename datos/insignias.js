/* ============================================================
   LOGO E INSIGNIAS DE BLOQUE
   Un único vocabulario de trazos, monocromo, pensado para pintarse
   con currentColor tanto en HTML (inline SVG) como en un <canvas>
   (vía Path2D, mismos números). Nada de relieve ni degradado: son
   trazos, no ilustraciones.

   El logo reutiliza el motivo que ya usan los paneles de la app —
   cuatro esquinas de corchete — con un rombo partido al centro.
   ============================================================ */

/** Logo: viewBox 0 0 100 100, pensado para tamaños de 16 a 512px. */
export const LOGO = {
  viewBox: "0 0 100 100",
  trazo: 5,
  rutas: [
    "M18 30 V18 H30",
    "M82 30 V18 H70",
    "M18 70 V82 H30",
    "M82 70 V82 H70",
    "M50 28 L68 50 L50 72 L32 50 Z"
  ]
};

/**
 * Insignias de bloque: viewBox 0 0 200 200, solo trazo, sin relleno
 * ni texto. El aro de rango se pinta aparte (ver COLOR_RANGO en
 * datos/logros.js), estas rutas son solo el glifo interior.
 */
export const INSIGNIAS = {
  empuje: {
    nombre: "Empuje",
    trazo: 7,
    rutas: ["M60 100 H120", "M96 76 L120 100 L96 124", "M60 70 V130", "M140 70 V130"]
  },
  tiron: {
    nombre: "Tirón",
    trazo: 7,
    rutas: ["M140 100 H80", "M104 76 L80 100 L104 124", "M60 70 V130", "M140 70 V130"]
  },
  pierna: {
    nombre: "Pierna",
    trazo: 7,
    rutas: ["M76 60 L76 96 L100 112 L100 140", "M124 60 L124 96 L100 112"]
  },
  movilidad: {
    nombre: "Movilidad",
    trazo: 7,
    rutas: ["M100 55 A45 45 0 1 1 55 100", "M55 100 L55 78", "M55 100 L77 100"]
  }
};

/** A qué insignia corresponde el nombre de un día del programa. */
export function bloqueDe(nombre) {
  const n = (nombre || "").toLowerCase();
  if (n.startsWith("empuje")) return "empuje";
  if (n.startsWith("tirón") || n.startsWith("tiron")) return "tiron";
  if (n.startsWith("pierna")) return "pierna";
  if (n.startsWith("movilidad")) return "movilidad";
  return null;
}

/** Construye el <path> interior de un SVG a partir de las rutas. */
export function rutasSVG(rutas, trazo, color = "currentColor") {
  return rutas.map(d =>
    `<path d="${d}" fill="none" stroke="${color}" stroke-width="${trazo}" stroke-linecap="square" stroke-linejoin="miter"/>`
  ).join("");
}
