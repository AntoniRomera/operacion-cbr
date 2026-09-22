/* ============================================================
   OPEN FOOD FACTS
   Consulta de un producto por su código de barras (EAN-13/EAN-8),
   sin API key — ver spec 010, capa de captura.

   Límite de 100 peticiones/min (buena práctica del propio servicio):
   se lleva la cuenta aquí, en memoria.

   Nota honesta: un navegador NO deja fijar el header User-Agent desde
   `fetch()` — es una cabecera "forbidden" por el estándar (whatwg
   fetch spec), la pone el propio navegador y JS no puede tocarla. La
   recomendación de Open Food Facts de mandar un User-Agent propio no
   se puede cumplir desde una PWA cliente como esta; queda constancia
   aquí en vez de fingir que se manda uno.
   ============================================================ */

const BASE = "https://world.openfoodfacts.org/api/v2/product";
const LIMITE_MIN = 100;
const peticiones = [];

function dentroDelLimite() {
  const ahora = Date.now();
  while (peticiones.length && ahora - peticiones[0] > 60000) peticiones.shift();
  return peticiones.length < LIMITE_MIN;
}

/**
 * Busca un producto por código de barras. Devuelve `null` si Open
 * Food Facts no lo tiene (no es un error, es "no encontrado").
 * Lanza si el código no tiene forma de EAN o si se supera el límite
 * de peticiones. Los campos que Open Food Facts no traiga quedan
 * `undefined` — nunca se rellenan con un 0 que parecería un dato real.
 */
export async function buscarProducto(codigo) {
  if (!/^\d{8}$|^\d{13}$/.test(codigo)) throw new Error("Código no válido — tiene que ser EAN-8 o EAN-13");
  if (!dentroDelLimite()) throw new Error("Demasiadas consultas seguidas a Open Food Facts — espera un momento");
  peticiones.push(Date.now());

  let res;
  try {
    res = await fetch(`${BASE}/${codigo}.json?fields=product_name,brands,nutriments`);
  } catch (e) {
    throw new Error("Sin conexión con Open Food Facts ahora mismo");
  }
  if (!res.ok) throw new Error("Open Food Facts no responde ahora mismo");
  const datos = await res.json();
  if (datos.status !== 1 || !datos.product) return null;

  const n = datos.product.nutriments || {};
  return {
    id: codigo,
    nombre: datos.product.product_name || `Producto ${codigo}`,
    marca: datos.product.brands || "",
    kcal100: n["energy-kcal_100g"] ?? undefined,
    proteina100: n.proteins_100g ?? undefined,
    grasa100: n.fat_100g ?? undefined,
    carbo100: n.carbohydrates_100g ?? undefined,
    fuente: "off"
  };
}

export const ATRIBUCION_ODBL =
  "Datos de productos de Open Food Facts (openfoodfacts.org), bajo licencia Open Database License (ODbL).";
