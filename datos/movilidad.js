/* ============================================================
   SEMANA DE MOVILIDAD
   Cada 5ª semana (4 de carga + 1 de descarga) sustituye el programa
   entero por esto: sin barra, sin discos, tiempo bajo tensión en vez
   de repeticiones. Reutiliza el motor de figuras existente — cada
   postura es un "isométrico" más, con a=z (postura mantenida).

   Cuenta para la racha y para "semana cerrada" igual que una semana
   normal en cuanto se cierra la única sesión que tiene: no se decide
   en tiempo de ejecución, solo se lee el número de semana.
   ============================================================ */

export const esSemanaMovilidad = semana => semana % 5 === 0;

/* XP fijo por sesión completada — no depende de series, peso ni
   tiempo: la recompensa es hacerla, no cuánto. */
export const XP_MOVILIDAD = 60;

export const MOVILIDAD = [
  {
    clave: "cadera", nombre: "Cadera 90/90", figura: "cadera", segundos: 60,
    grupo: "Cadera", musculos: ["Rotadores de cadera", "Aductores"],
    claves: [
      "Las dos piernas dobladas a 90º, una delante y otra al lado.",
      "Pecho alto, inclina el torso hacia la pierna de delante.",
      "Cambia de lado a mitad del tiempo.",
      "Sin dolor agudo: hasta donde note tirar, no más."
    ]
  },
  {
    clave: "dorsal", nombre: "Colgado con estiramiento lateral", figura: "colgado", segundos: 45,
    grupo: "Dorsal", musculos: ["Dorsal ancho", "Hombro", "Antebrazo"],
    claves: [
      "Agarre a la anchura de hombros, cuerpo relajado y colgando.",
      "Deja caer el peso: no es una dominada, es un estiramiento.",
      "Se puede balancear muy suave de lado a lado.",
      "Suelta antes de que el agarre falle, no después."
    ]
  },
  {
    clave: "tobillo", nombre: "Rodilla a la pared", figura: "tobillo", segundos: 45,
    unilateral: "pierna",
    grupo: "Tobillo", musculos: ["Sóleo", "Tibial anterior"],
    claves: [
      "Punta del pie a un palmo de la pared, talón siempre en el suelo.",
      "Lleva la rodilla hacia la pared sin que el talón se levante.",
      "Mantén el máximo rango que aguantes sin despegar el talón.",
      "Cambia de pierna a mitad del tiempo."
    ]
  },
  {
    clave: "toracica", nombre: "Apertura torácica", figura: "toracica", segundos: 45,
    unilateral: "lado",
    grupo: "Columna torácica", musculos: ["Erectores", "Romboides", "Oblicuos"],
    claves: [
      "A cuatro patas, una mano tras la nuca.",
      "Gira el codo hacia el techo, mirada acompañando el giro.",
      "El movimiento sale de la columna, no del brazo.",
      "Cambia de lado a mitad del tiempo."
    ]
  },
  {
    clave: "hombro", nombre: "Deslizamiento de hombro en pared", figura: "hombro", segundos: 45,
    grupo: "Hombro", musculos: ["Serrato anterior", "Trapecio inferior", "Manguito rotador"],
    claves: [
      "Espalda, brazos y manos pegados a la pared todo el recorrido.",
      "Sube los brazos sin que la zona lumbar se despegue.",
      "Si la lumbar se despega, no subas más: ese es tu rango de hoy.",
      "Baja igual de lento que has subido."
    ]
  }
];
