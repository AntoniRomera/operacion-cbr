/* ============================================================
   CARDIO SUELTO
   Sombra de boxeo, juego de pies y comba: trabajo por tiempo y
   rondas, sin barra ni discos — no hay peso que registrar. Mismo
   patrón que datos/movilidad.js (bloques por tiempo, XP fijo al
   completar), pero disponible cualquier día, no solo cada 5ª semana:
   ver spec 009.

   Sin cronómetro de rondas dentro de la app todavía — la estructura
   (rondas/segundos) es información para guiarte, no una cuenta atrás.
   ============================================================ */

export const XP_CARDIO = 60;

export const CARDIO = [
  {
    clave: "sombra", nombre: "Sombra de boxeo", grupo: "Cardio",
    rondas: 5, segundosRonda: 120, segundosDescanso: 60,
    musculos: ["Sistema cardiovascular", "Hombro", "Core"],
    claves: [
      "Guardia arriba todo el asalto, barbilla metida.",
      "Combina golpes con desplazamiento — no le pegues al aire parado.",
      "Exhala en cada golpe, no aguantes el aire.",
      "Si la guardia se cae de cansancio, baja el ritmo, no la sueltes."
    ]
  },
  {
    clave: "juegopies", nombre: "Juego de pies", grupo: "Cardio",
    rondas: 4, segundosRonda: 90, segundosDescanso: 45,
    musculos: ["Gemelo", "Cuádriceps", "Sistema cardiovascular"],
    claves: [
      "Pasos cortos, nunca cruces los pies.",
      "Peso en la parte delantera del pie, talones casi sin tocar.",
      "Cambia de patrón (lateral, adelante-atrás, pivote) cada 20-30 s.",
      "Si empiezas a arrastrar los pies, el ritmo ha bajado demasiado."
    ]
  },
  {
    clave: "comba", nombre: "Comba", grupo: "Cardio",
    rondas: 6, segundosRonda: 60, segundosDescanso: 30,
    musculos: ["Gemelo", "Antebrazo", "Sistema cardiovascular"],
    claves: [
      "Salto pequeño, apenas despega el suelo.",
      "La muñeca gira la cuerda, no el brazo entero.",
      "Mirada al frente, no al suelo ni a los pies.",
      "Si fallas mucho, para y respira — mejor sumar rondas limpias que forzar una sucia."
    ]
  }
];
