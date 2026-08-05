/* ============================================================
   CATÁLOGO DE EJERCICIOS
   Cada ejercicio se define una sola vez aquí y las rutinas lo
   llaman por su clave. Añadir uno nuevo es añadir una entrada:
   si le pones una figura que exista en datos/figuras.js, sale
   dibujado; si no, se queda solo con las claves de técnica.

   implemento: barra · disco · landmine · mancuerna · corporal
   factorPeso: solo en los corporales, qué parte de tu peso mueves
               de verdad (para contar volumen y XP con cabeza)
   claves:     un "!" delante marca la que evita una lesión
   unidad:     "reps" salvo los isométricos, que van en segundos
   ============================================================ */

export const EJERCICIOS = {

  /* ---------- empuje horizontal ---------- */
  banca: {
    nombre: "Press banca", grupo: "Pecho", patron: "Empuje horizontal",
    implemento: "barra", figura: "banca", kgInicial: 40,
    musculos: ["Pectoral mayor", "Tríceps", "Deltoides anterior"],
    claves: [
      "Escápulas retraídas y clavadas al banco, arco lumbar natural.",
      "La barra baja a la parte baja del pecho, no al cuello.",
      "Codos a unos 45º del torso, no abiertos en cruz.",
      "!Pins a la altura del pecho y sin collarines. Siempre."
    ]
  },
  bancap: {
    nombre: "Banca con pausa 2s", grupo: "Pecho", patron: "Empuje horizontal",
    implemento: "barra", figura: "banca", kgInicial: 30,
    musculos: ["Pectoral mayor", "Tríceps"],
    claves: [
      "Dos segundos de barra muerta sobre el pecho, sin hundirla.",
      "Mantén la tensión: no relajes escápulas en la pausa.",
      "Explota desde parado, sin rebote.",
      "Baja un 15% el peso respecto a la banca normal."
    ]
  },
  cerrado: {
    nombre: "Press cerrado", grupo: "Pecho", patron: "Empuje horizontal",
    implemento: "barra", figura: "banca", kgInicial: 30,
    musculos: ["Tríceps", "Pectoral interno"],
    claves: [
      "Manos a la anchura de los hombros, no más juntas.",
      "Codos pegados al cuerpo durante toda la bajada.",
      "La barra baja al esternón bajo.",
      "Si te duelen las muñecas, abre un par de dedos."
    ]
  },
  pullover: {
    nombre: "Pullover con disco", grupo: "Pecho", patron: "Empuje horizontal",
    implemento: "disco", figura: "pullover", kgInicial: 15,
    musculos: ["Dorsal ancho", "Pectoral", "Serrato"],
    claves: [
      "Túmbate a lo largo del banco, no cruzado.",
      "Codos ligeramente flexionados y fijos todo el recorrido.",
      "Baja hasta notar estiramiento en dorsal, sin forzar hombro.",
      "!Costillas abajo: no arquees la lumbar al bajar el disco."
    ]
  },
  flexban: {
    nombre: "Flexiones, pies en banco", grupo: "Pecho", patron: "Empuje horizontal",
    implemento: "corporal", factorPeso: 0.75, figura: "flexban",
    musculos: ["Pectoral superior", "Tríceps", "Core"],
    claves: [
      "Cuerpo en línea recta de talón a cabeza.",
      "Glúteo apretado para que no caiga la cadera.",
      "Codos a 45º, pecho al suelo.",
      "Cuanto más altos los pies, más carga sobre el hombro."
    ]
  },

  /* ---------- bisagra y tirón ---------- */
  muerto: {
    nombre: "Peso muerto", grupo: "Espalda", patron: "Bisagra de cadera",
    implemento: "barra", figura: "muerto", kgInicial: 60,
    musculos: ["Isquiotibiales", "Glúteo", "Espalda baja", "Trapecio"],
    claves: [
      "Barra pegada a la espinilla desde el primer centímetro.",
      "Aprieta las axilas: dorsal activo, barra que no se aleja.",
      "Empuja el suelo con los pies, no tires con la espalda.",
      "!Si la lumbar se redondea, la serie ha terminado."
    ]
  },
  pendlay: {
    nombre: "Remo Pendlay", grupo: "Espalda", patron: "Tirón horizontal",
    implemento: "barra", figura: "pendlay", kgInicial: 40,
    musculos: ["Dorsal ancho", "Romboides", "Trapecio medio"],
    claves: [
      "Torso paralelo al suelo y quieto toda la serie.",
      "Tira hacia el ombligo, codos hacia atrás.",
      "Cada rep arranca desde el suelo, parada completa.",
      "Sin balanceo de cadera: si necesitas impulso, sobra peso."
    ]
  },
  negdom: {
    nombre: "Negativas de dominada", grupo: "Espalda", patron: "Tirón vertical",
    implemento: "corporal", factorPeso: 1, figura: "negdom",
    musculos: ["Dorsal ancho", "Bíceps", "Romboides"],
    claves: [
      "Súbete con salto desde el banco hasta barbilla sobre la barra.",
      "Baja en cinco segundos contados, sin soltarte de golpe.",
      "Hombros lejos de las orejas al empezar a bajar.",
      "Cinco series de tres. La calidad importa más que el número."
    ]
  },
  remolm: {
    nombre: "Remo landmine 1 mano", grupo: "Espalda", patron: "Tirón horizontal",
    implemento: "landmine", figura: "remolm", kgInicial: 20,
    musculos: ["Dorsal ancho", "Romboides", "Bíceps"],
    claves: [
      "Cadera atrás, torso hinchado hacia delante, pecho firme.",
      "Mano libre apoyada en la rodilla o el banco.",
      "Tira con el codo pegado al costado.",
      "Cadera cuadrada: no rotes el torso para llegar más arriba."
    ]
  },
  remoinv: {
    nombre: "Remo invertido", grupo: "Espalda", patron: "Tirón horizontal",
    implemento: "corporal", factorPeso: 0.55, figura: "remoinv",
    musculos: ["Dorsal ancho", "Trapecio medio", "Bíceps"],
    claves: [
      "Barra del rack a la altura de la cadera, cuerpo en tabla.",
      "Pies en el banco para hacerlo más duro.",
      "Pecho a la barra, escápulas juntas arriba.",
      "Cuanto más horizontal el cuerpo, más difícil."
    ]
  },

  /* ---------- pierna ---------- */
  senta: {
    nombre: "Sentadilla trasera", grupo: "Piernas", patron: "Rodilla dominante",
    implemento: "barra", figura: "senta", kgInicial: 40,
    musculos: ["Cuádriceps", "Glúteo", "Aductores"],
    claves: [
      "Barra sobre el trapecio, no sobre las cervicales.",
      "Rompe con cadera y rodilla a la vez, rodillas hacia fuera.",
      "Baja hasta donde la lumbar aguante neutra.",
      "!Pins a la altura del punto más bajo, sin excepción."
    ]
  },
  rdl: {
    nombre: "Peso muerto rumano", grupo: "Piernas", patron: "Bisagra de cadera",
    implemento: "barra", figura: "rdl", kgInicial: 40,
    musculos: ["Isquiotibiales", "Glúteo"],
    claves: [
      "Rodilla casi fija: es bisagra de cadera, no sentadilla.",
      "Cadera muy atrás, barra rozando el muslo.",
      "Para cuando notes el isquio al límite, no busques el suelo.",
      "!Lumbar neutra todo el recorrido."
    ]
  },
  bulgara: {
    nombre: "Búlgara con disco", grupo: "Piernas", patron: "Unilateral",
    implemento: "disco", figura: "bulgara", kgInicial: 15,
    musculos: ["Cuádriceps", "Glúteo", "Estabilizadores"],
    claves: [
      "Empeine del pie trasero sobre el banco, no la puntera.",
      "Pie delantero lo bastante adelante para que la rodilla no se pase.",
      "Baja vertical, el peso en el talón delantero.",
      "Disco abrazado al pecho o mancuernas a los lados."
    ]
  },
  hip: {
    nombre: "Hip thrust", grupo: "Piernas", patron: "Extensión de cadera",
    implemento: "barra", figura: "hip", kgInicial: 50,
    musculos: ["Glúteo mayor", "Isquiotibiales"],
    claves: [
      "Borde del banco justo bajo las escápulas.",
      "Almohadilla o toalla gruesa bajo la barra en la cadera.",
      "Arriba: glúteo apretado y costillas abajo, sin arquear lumbar.",
      "Barbilla al pecho durante todo el movimiento."
    ]
  },
  gemelo: {
    nombre: "Gemelo de pie con barra", grupo: "Piernas", patron: "Aislamiento",
    implemento: "barra", figura: "gemelo", kgInicial: 60,
    musculos: ["Gemelo", "Sóleo"],
    claves: [
      "Sube lo máximo posible y aguanta un segundo arriba.",
      "Baja lento hasta estirar del todo el talón.",
      "Sin rebote: el gemelo responde al recorrido completo.",
      "Mejor con las punteras sobre un disco para más rango."
    ]
  },

  /* ---------- hombro ---------- */
  militar: {
    nombre: "Press militar de pie", grupo: "Hombros", patron: "Empuje vertical",
    implemento: "barra", figura: "militar", kgInicial: 30,
    musculos: ["Deltoides anterior", "Tríceps", "Core"],
    claves: [
      "Glúteo y abdomen apretados: el cuerpo es la base.",
      "Barra parte del pecho alto, no de la barbilla.",
      "Aparta la cara y pasa la barra pegada, no en arco.",
      "Arriba, cabeza cruzando entre los brazos."
    ]
  },
  presslm: {
    nombre: "Press landmine unilateral", grupo: "Hombros", patron: "Empuje vertical",
    implemento: "landmine", figura: "presslm", kgInicial: 15,
    musculos: ["Deltoides anterior", "Serrato", "Core"],
    claves: [
      "De pie o de rodillas, mirando al ancla de la barra.",
      "Empuja arriba y hacia delante, siguiendo el arco natural.",
      "Mano libre al costado, sin ayudar con la cadera.",
      "Muy amable con el hombro: úsalo si la militar te molesta."
    ]
  },
  lateral: {
    nombre: "Elevaciones laterales", grupo: "Hombros", patron: "Aislamiento",
    implemento: "mancuerna", figura: "lateral", kgInicial: 5,
    musculos: ["Deltoides medio"],
    claves: [
      "Sube hasta la altura del hombro, no más.",
      "Codo ligeramente flexionado y fijo.",
      "Dos segundos de bajada. Es el 80% del ejercicio.",
      "Sin balanceo. Con 5 kg no hay excusa."
    ]
  },
  menton: {
    nombre: "Remo al mentón", grupo: "Hombros", patron: "Tirón vertical",
    implemento: "barra", figura: "menton", kgInicial: 30,
    musculos: ["Deltoides medio", "Trapecio"],
    claves: [
      "Agarre a la anchura de los hombros o algo más ancho.",
      "Sube por el codo, no por la mano.",
      "Para a la altura del pecho alto, no del mentón.",
      "!Si notas pinzamiento en el hombro, cambia por elevaciones."
    ]
  },
  pajaro: {
    nombre: "Pájaros en banco inclinado", grupo: "Hombros", patron: "Aislamiento",
    implemento: "mancuerna", figura: "pajaro", kgInicial: 5,
    musculos: ["Deltoides posterior", "Romboides"],
    claves: [
      "Pecho apoyado en el banco inclinado, sin arquear.",
      "Brazos abren en cruz, codos casi rectos.",
      "Aprieta escápulas arriba un segundo.",
      "Peso ridículo y muchas reps. Aquí no se compite."
    ]
  },

  /* ---------- brazo y core ---------- */
  curl: {
    nombre: "Curl con barra", grupo: "Brazos", patron: "Aislamiento",
    implemento: "barra", figura: "curl", kgInicial: 30,
    musculos: ["Bíceps braquial"],
    claves: [
      "Codos pegados al costado, no se van hacia delante.",
      "Sin balanceo de cadera ni de espalda.",
      "Baja controlado hasta estirar del todo.",
      "Muñeca neutra, ni doblada hacia atrás."
    ]
  },
  curlinv: {
    nombre: "Curl invertido (prono)", grupo: "Brazos", patron: "Aislamiento",
    implemento: "barra", figura: "curl", kgInicial: 20,
    musculos: ["Braquial", "Antebrazo"],
    claves: [
      "Agarre prono, palmas hacia abajo.",
      "Trabajas antebrazo y braquial: pesa mucho menos, es normal.",
      "Codos quietos, muñecas firmes.",
      "Sin balanceo."
    ]
  },
  skull: {
    nombre: "Skull crusher", grupo: "Brazos", patron: "Aislamiento",
    implemento: "barra", figura: "skull", kgInicial: 20,
    musculos: ["Tríceps"],
    claves: [
      "Codos apuntando al techo y quietos.",
      "Baja a la frente o algo por detrás de la cabeza.",
      "Recorrido corto y controlado, sin acelerar al final.",
      "!Si molesta el codo, baja peso o pasa a extensión con disco."
    ]
  },
  fondos: {
    nombre: "Fondos entre banco y suelo", grupo: "Brazos", patron: "Empuje vertical",
    implemento: "corporal", factorPeso: 0.45, figura: "fondos",
    musculos: ["Tríceps", "Deltoides anterior"],
    claves: [
      "Manos en el borde del banco, dedos hacia fuera.",
      "Baja hasta 90º de codo, ni más.",
      "Cadera pegada al banco, no te alejes.",
      "!Si el hombro protesta, acerca los pies y reduce recorrido."
    ]
  },
  rodillas: {
    nombre: "Rodillas al pecho colgado", grupo: "Core", patron: "Flexión de tronco",
    implemento: "corporal", factorPeso: 0.35, figura: "rodillas",
    musculos: ["Recto abdominal", "Flexores de cadera", "Antebrazo"],
    claves: [
      "Colgado, hombros activos, sin balancearte.",
      "Sube las rodillas metiendo la pelvis, no solo la cadera.",
      "Baja controlado, sin dejarte caer.",
      "Si te balanceas, para y reinicia."
    ]
  },
  plancha: {
    nombre: "Plancha con disco", grupo: "Core", patron: "Antiextensión",
    implemento: "disco", figura: "plancha", kgInicial: 10, unidad: "segundos",
    musculos: ["Core completo", "Transverso"],
    claves: [
      "Codos bajo los hombros, antebrazos paralelos.",
      "Glúteo y abdomen apretados, cadera ni alta ni hundida.",
      "Disco en la zona lumbar alta, colocado por alguien o con cuidado.",
      "Si la cadera cae, la serie ha acabado. Cuenta lo que aguantes bien."
    ]
  }
};

/** Lee un ejercicio por clave, avisando fuerte si la rutina apunta a nada. */
export function ejercicio(clave) {
  const e = EJERCICIOS[clave];
  if (!e) throw new Error(`Ejercicio desconocido en la rutina: "${clave}"`);
  return { clave, unidad: "reps", ...e };
}

export const CLAVES = Object.keys(EJERCICIOS);
