# 006 — Plan de funcionalidades nuevas

**Estado:** plan — no es una spec. Cada bloque se convierte en su propia spec
numerada (con criterios de aceptación de verdad) cuando le toque, siguiendo
`/especificacion`. Este documento es el "antes de hacer nada, dame un plan"
que pidió Toni.
**Fecha:** 2026-09-21     **Autor:** Toni + Claude

## De dónde sale esto

Toni pegó siete prompts sueltos, pensados para pegarlos en un LLM externo
(dietista, profesor de scraping...), y pidió analizarlos juntos y sacar un
plan homogéneo antes de tocar código. Al juntarlos, no son siete peticiones
independientes — son tres bloques, más dos piezas que no son peticiones
nuevas de verdad:

- El prompt de "Actúa como dietista..." y el que sigue (el plan con "120 kg")
  son el **mismo ask contado dos veces**: uno es la plantilla, el otro es un
  ejemplo de la salida que debería dar esa plantilla. El segundo no pide
  nada nuevo — sirve para comprobar que el motor de cálculo (cuando exista)
  da números parecidos a esos.
- El scraping de recetas de terceros queda **descartado explícitamente**:
  Toni pidió quitarlo del análisis. No se implementa.

Con eso, quedan tres bloques:

| Bloque | Qué es | Tamaño |
|---|---|---|
| **A — Ficha de ejercicio + equipo** | Catálogo de ejercicios más rico (músculos, técnica, variantes), glosario de músculos, diagramas de movimiento, y equipo configurable (barra opcional, belt squat, activar/desactivar) | Mediano — encaja en dominio ya existente |
| **C — Cardio** | Sombra de boxeo, juego de pies, comba: misiones por tiempo/rondas, no por peso y reps | Pequeño |
| **B — Nutrición** | Escáner de código de barras + Open Food Facts, calculadora de dietista (TMB/macros/batch cooking), menús con ensaladas rápidas | Grande — dominio nuevo, no existe nada montado |

## Decisiones ya tomadas (por Toni, no se repreguntan)

- **Plataforma:** PWA primero. Se porta a la app nativa Swift después,
  igual que ya se hizo con el historial y la repesca — primero se prueba y
  se usa de verdad en la PWA, luego se traduce.
- **Orden de bloques:** A → C → B. La ficha de ejercicio y el equipo
  configurable son lo más maduro (hasta traen estructura de datos
  propuesta) y encajan en lo que ya existe; nutrición es lo más grande y
  lo que más spec necesita, así que va al final.
- **Nutrición se integra de verdad con el motor de XP/rango del entreno**,
  no es una sección aparte con su propio sistema. Cómo se combinan
  exactamente (¿XP por cumplir macros? ¿un rango de "constancia
  nutricional" separado que se mezcla con el de entreno?) es una decisión
  de la spec del bloque B, no de este plan.

## Bloque A — Ficha de ejercicio + catálogo + equipo configurable

**De dónde sale:** prompt "Mejoras app" (abductores, generalizar grupos
musculares, confirma que PPL + repesca es buen 4º día — sin cambios ahí),
el prompt grande de la ficha de ejercicio, y la parte de equipo del último
mensaje ("poder añadir pesos, barra olímpica o no, más mancuernas, belt
squat, activar/desactivar equipamiento").

Piezas, tal como las trajo el prompt original:
- Catálogo: añadir abductores y revisar el resto de grupos musculares para
  generalizar (no hueco por hueco, una revisión completa).
- Ficha por ejercicio: músculo principal y secundarios, cada uno con
  nombre técnico + nombre común + ubicación en una frase; "dónde
  notarlo"; señales de que se hace mal; técnica en 4-5 pasos con ritmo y
  respiración; 3 errores comunes; variantes (más fácil, más difícil, y
  para pierna una alternativa sin impacto en rodilla); series/reps/RIR;
  aviso fijo de dolor articular.
- Glosario de músculos aparte, con silueta corporal frontal/trasera
  resaltando el músculo, accesible desde cualquier ficha.
- Diagrama de movimiento por ejercicio: 2-3 posiciones clave con flechas
  de dirección, en SVG, coherente con el tema claro/oscuro ya existente.
- Pestañas por ficha ("Cómo hacerlo" / "Dónde notarlo" / "Errores" /
  "Variantes"), y un "modo entreno" minimalista (nombre, músculo, 3 puntos
  clave, registro de series) para cuando ya estás entrenando y no quieres
  leer.
- Progresión: sugerir subir peso al llegar al tope de reps con RIR bajo
  (esto se apoya en el motor de `progreso.js`, que ya existe).
- Estructura de datos propuesta en el prompt original (un objeto por
  ejercicio con músculos como objetos enlazados al glosario) — buen punto
  de partida para la spec, no un diseño cerrado todavía.
- Equipo: hoy `datos/equipo.js` asume que siempre hay una barra olímpica.
  Hay que poder decir "no tengo barra", añadir tipos de equipo nuevos
  (belt squat) y más de una mancuerna variable, y activar/desactivar cada
  pieza sin borrarla del inventario (por si la recuperas más adelante).
- **El equipo y el catálogo tienen que hablarse.** Precisión que añadió
  Toni: cada ejercicio necesita declarar qué material usa (no solo la
  categoría gruesa que ya existe — `implemento: barra/disco/landmine/...`
  — sino, si hace falta, la pieza concreta, para distinguir "necesita
  landmine" de "necesita belt squat" aunque las dos sean cosas que no son
  una barra normal). Al desactivar una pieza de equipo, los ejercicios
  que dependen de ella dejan de contar como disponibles — no aparecen
  como sugerencia en el catálogo ni se ofrecen para un día nuevo — sin
  necesidad de borrar el ejercicio del catálogo ni tocar la rutina a
  mano. Al reactivarla, vuelven a estarlo. Esto afecta directamente al
  diseño de datos: `Ejercicio` necesita una referencia clara a qué pieza
  de equipo requiere (o ninguna, si es corporal), no solo una categoría.
- **Por defecto, activo = lo que Toni tiene de verdad**; el resto del
  catálogo de equipo (tipos que existen como posibilidad pero no están en
  casa) empieza desactivado. Cada cazador puede añadir equipo propio,
  local, más allá del catálogo por defecto — el ejemplo que puso Toni: si
  alguien tiene más mancuernas de las que ya vienen de serie, las añade
  como una fila extra en su propia base de datos, sin tocar el catálogo
  general ni afectar a otros cazadores.

**Decisiones abiertas para cuando se escriba la spec de este bloque:**
- [ ] "Revisar la semana de movilidad" (prompt 2) es, tal cual, demasiado
  vago para convertirlo en criterios — ¿qué hay que revisar exactamente?
  ¿la selección de posturas, la frecuencia de cada 4+1, el contenido de
  cada postura? Toni lo aclara al empezar la spec de este bloque.
- [ ] Nivel de fidelidad de los SVG de movimiento: ¿se hacen los 32 de
  golpe, o se prueban 3-4 primero (como propone el prompt original, "los
  6 más usados de cada patrón") antes de generalizar?

## Bloque C — Cardio suelto (sombra de boxeo, juego de pies, comba)

**De dónde sale:** última línea del último mensaje de Toni.

No encajan como "ejercicio con series y reps" — son actividades por
tiempo o por rondas. Necesitan un tipo de misión nuevo (o una variante del
que ya existe) que registre minutos/rondas en vez de peso×series×reps, y
que aun así sume a XP y volumen de alguna forma coherente con el resto.
Al ser pequeño, es buen candidato para ir justo después del bloque A,
reutilizando lo que se decida ahí sobre "tipos de misión".

## Bloque B — Nutrición

**De dónde sale:** escáner de código de barras (prompt aparte), la
plantilla de dietista + su ejemplo de salida, y las ensaladas rápidas.

Tres capas, todas del mismo dominio:
1. **Captura**: escanear EAN-13/EAN-8 con la cámara → Open Food Facts
   (`GET .../api/v2/product/{codigo}.json`, sin API key) → nombre, marca,
   macros por 100 g. Reglas ya venían bien pensadas en el prompt original:
   sin inventar datos que falten (dejarlos editables a mano), caché local
   de cada producto consultado, User-Agent propio, tope de 100
   peticiones/min, atribución ODbL visible en Ajustes/Acerca de, y una
   tabla propia para alimentos sin código (pollo, fruta, verdura).
2. **Cálculo**: TMB (Mifflin-St Jeor, o Katch-McArdle si hay % de grasa),
   mantenimiento, objetivo con déficit, macros — las fórmulas ya vienen
   detalladas en el prompt de dietista. Recalcular si el peso cambia
   ±3 kg. El "ejemplo con 120 kg" es el caso de prueba para verificar que
   el motor da esos números, no una funcionalidad en sí.
3. **Contenido**: menús, listas de la compra (con precios, aunque sea
   estimados y avisando de que lo son), guía de batch cooking del
   domingo con reparto nevera/congelador, más las ensaladas/bowls rápidos
   como alternativa intercambiable con etiquetas ("sin cocinar", "5 min",
   "aguanta en tupper", "alta proteína") y un botón "cambiar comida" que
   proponga alternativas parecidas en kcal/macros.

Añadido por Toni al cerrar este plan: **suplementos** (creatina,
beta-alanina, omega-3, magnesio, ashwagandha... los que se tomen de
verdad) como parte de este bloque — un registro de qué se toma, no un
cálculo nutricional en sí, pero vive aquí, no en el entreno.

Es el bloque más grande del paquete — con diferencia — y el que menos
tiene ya decidido (dónde vive el "objetivo" del cazador, cómo se relaciona
con `RegistroCorporal` que ya existe en la app nativa, si la báscula del
hito de Salud alimenta esto). Necesita su propia ronda de preguntas al
llegar su turno.

## Fuera de alcance de todo este plan

- Scraping de recetas de terceros (`ostarecipes.com` u otras) — descartado
  explícitamente por Toni, no se retoma sin que lo pida de nuevo.
- Publicar o vender cualquier dato de Open Food Facts más allá del uso
  personal dentro de la app — la atribución ODbL es obligatoria, no
  opcional.

## Siguiente paso

Cuando Toni diga que sigamos, se escribe la spec 007 para el Bloque A
(ficha de ejercicio + equipo configurable) en la PWA, con criterios de
aceptación de verdad — empezando por aclarar el punto abierto de la
semana de movilidad.
