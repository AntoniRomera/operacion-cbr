/* ============================================================
   GLOSARIO DE MÚSCULOS
   Los mismos nombres técnicos que ya usa `musculos` en cada
   ejercicio de datos/ejercicios.js — esto no inventa una taxonomía
   nueva, solo explica en una frase qué es y dónde está cada uno que
   ya aparece en el catálogo. Si se añade un ejercicio con un músculo
   nuevo, hay que darlo de alta aquí también.

   `cara` (frontal/trasera) es la que decide qué vista de la silueta
   se dibuja — importa sobre todo en pierna: cuádriceps (delante) e
   isquios/glúteo (detrás) se notan en sitios opuestos de la misma
   pierna, así que sentadilla y peso muerto tienen que salir con
   siluetas distintas aunque las dos sean "Piernas".
   ============================================================ */

export const GRUPOS_MUSCULO = {
  push: "Empuje",
  pull: "Tirón",
  legs: "Piernas",
  tronco: "Tronco"
};

export const GLOSARIO_MUSCULOS = {
  // ---------- empuje ----------
  "Pectoral mayor":   { comun: "El pecho", ubicacion: "delante del torso, de la clavícula a las costillas", grupo: "push", cara: "frontal" },
  "Pectoral":          { comun: "El pecho", ubicacion: "delante del torso", grupo: "push", cara: "frontal" },
  "Pectoral superior": { comun: "Pecho alto", ubicacion: "la parte de arriba del pecho, cerca de la clavícula", grupo: "push", cara: "frontal" },
  "Pectoral interno":  { comun: "Pecho interno", ubicacion: "la parte del pecho más cerca del centro", grupo: "push", cara: "frontal" },
  "Deltoides anterior": { comun: "Hombro delantero", ubicacion: "la parte delantera del hombro", grupo: "push", cara: "frontal" },
  "Deltoides medio":   { comun: "Hombro lateral", ubicacion: "el lateral del hombro, lo que le da anchura", grupo: "push", cara: "frontal" },
  "Deltoides posterior": { comun: "Hombro trasero", ubicacion: "la parte trasera del hombro", grupo: "pull", cara: "trasera" },
  "Hombro":            { comun: "El hombro", ubicacion: "toda la articulación del hombro", grupo: "push", cara: "frontal" },
  "Tríceps":           { comun: "Tríceps", ubicacion: "detrás del brazo — el que endereza el codo", grupo: "push", cara: "frontal" },
  "Serrato":           { comun: "Serrato", ubicacion: "el costado de las costillas, bajo la axila", grupo: "push", cara: "frontal" },

  // ---------- tirón ----------
  "Dorsal ancho":      { comun: "Dorsal", ubicacion: "la espalda ancha, a los lados del torso", grupo: "pull", cara: "trasera" },
  "Trapecio":          { comun: "Trapecio", ubicacion: "entre el cuello y los hombros", grupo: "pull", cara: "trasera" },
  "Trapecio medio":    { comun: "Trapecio medio", ubicacion: "la parte del trapecio entre los omóplatos", grupo: "pull", cara: "trasera" },
  "Romboides":         { comun: "Romboides", ubicacion: "entre los omóplatos, bajo el trapecio", grupo: "pull", cara: "trasera" },
  "Bíceps":            { comun: "Bíceps", ubicacion: "delante del brazo — el que dobla el codo", grupo: "pull", cara: "frontal" },
  "Bíceps braquial":   { comun: "Bíceps", ubicacion: "delante del brazo — el que dobla el codo", grupo: "pull", cara: "frontal" },
  "Braquial":          { comun: "Braquial", ubicacion: "bajo el bíceps, ayuda a doblar el codo", grupo: "pull", cara: "frontal" },
  "Antebrazo":         { comun: "Antebrazo", ubicacion: "del codo a la muñeca — el agarre", grupo: "pull", cara: "frontal" },

  // ---------- piernas ----------
  "Cuádriceps":        { comun: "Cuádriceps", ubicacion: "delante del muslo", grupo: "legs", cara: "frontal" },
  "Isquiotibiales":    { comun: "Isquios", ubicacion: "detrás del muslo", grupo: "legs", cara: "trasera" },
  "Glúteo":            { comun: "Glúteo", ubicacion: "el culo", grupo: "legs", cara: "trasera" },
  "Glúteo mayor":      { comun: "Glúteo", ubicacion: "la parte grande del culo", grupo: "legs", cara: "trasera" },
  "Glúteo medio":      { comun: "Glúteo lateral", ubicacion: "el lateral del culo, a la altura de la cadera", grupo: "legs", cara: "trasera" },
  "Aductores":         { comun: "Aductores", ubicacion: "el interior del muslo", grupo: "legs", cara: "frontal" },
  "Abductores":        { comun: "Abductores", ubicacion: "el lateral de la cadera — aleja la pierna del cuerpo", grupo: "legs", cara: "trasera" },
  "Gemelo":            { comun: "Gemelo", ubicacion: "la pantorrilla", grupo: "legs", cara: "trasera" },
  "Sóleo":             { comun: "Sóleo", ubicacion: "debajo del gemelo, también en la pantorrilla", grupo: "legs", cara: "trasera" },
  "Estabilizadores":   { comun: "Estabilizadores", ubicacion: "los músculos pequeños que sostienen el equilibrio del movimiento", grupo: "legs", cara: "frontal" },
  "Flexores de cadera": { comun: "Flexores de cadera", ubicacion: "delante de la cadera — lo que sube la rodilla", grupo: "legs", cara: "frontal" },

  // ---------- tronco ----------
  "Core":              { comun: "Core", ubicacion: "el abdomen y los laterales del tronco", grupo: "tronco", cara: "frontal" },
  "Core completo":     { comun: "Core", ubicacion: "el abdomen y los laterales del tronco", grupo: "tronco", cara: "frontal" },
  "Recto abdominal":   { comun: "Abdominales", ubicacion: "la \"tableta\", delante del abdomen", grupo: "tronco", cara: "frontal" },
  "Oblicuos":          { comun: "Oblicuos", ubicacion: "los laterales del abdomen", grupo: "tronco", cara: "frontal" },
  "Transverso":        { comun: "Transverso", ubicacion: "la capa más profunda del abdomen, como un cinturón natural", grupo: "tronco", cara: "frontal" },
  "Espalda baja":      { comun: "Lumbar", ubicacion: "la zona baja de la espalda", grupo: "tronco", cara: "trasera" }
};

/** Explicación de un músculo, con un respaldo si todavía no está en el
 * glosario — para que un ejercicio nuevo no rompa la ficha mientras se
 * da de alta su músculo. */
export function explicacionDe(nombreTecnico) {
  return GLOSARIO_MUSCULOS[nombreTecnico] || { comun: nombreTecnico, ubicacion: "", grupo: "tronco", cara: "frontal" };
}
