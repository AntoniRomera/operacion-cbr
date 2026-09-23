# 011 — Gráficas de composición corporal y su cruce con la constancia

**Estado:** implementada — puntos 1 y 2; el punto 3 (cruce con
constancia) se deja tal como estaba en Perfil, ver Verificación
**Fecha:** 2026-09-21     **Autor:** Toni + Claude
**Parte de:** [[010-nutricion]] (el % de grasa ya es un campo del perfil desde esa spec)

## Problema

Hoy solo hay una gráfica de peso corporal (`E.corporal`, en Perfil).
El % de grasa se pidió como dato opcional del perfil en la spec 010,
pero es un valor suelto que se sobrescribe cada vez — no queda
historial ni gráfica, así que no se puede ver su evolución ni
cruzarla con nada.

## Para quién

Toni, para ver si el peso que sube o baja es sobre todo grasa o sobre
todo músculo, y si eso tiene algo que ver con lo constante que ha sido
entrenando esas semanas — no solo mirar dos números sueltos por
separado.

## Qué se pide

Tres piezas, de menos a más trabajo:

1. **Gráfica de % de grasa corporal**, igual que la de peso hoy: un
   historial propio (`E.grasaCorporal`, array de `{f, pct}`, mismo
   patrón que `E.corporal`), su propio editor (anotar hoy) y su propia
   línea en un `grafica({tipo:"linea"...})`.
2. **Gráfica interpolada peso + % de grasa** → masa grasa y masa
   magra estimadas en el tiempo. Peso y % de grasa casi nunca se
   anotan el mismo día exacto — hay que interpolar el valor que falte
   (el más cercano en el tiempo, o una interpolación lineal entre los
   dos puntos que rodean la fecha) para poder calcular, en cada fecha
   con al menos un dato nuevo, `masaGrasaKg = peso × pct/100` y
   `masaMagraKg = peso − masaGrasaKg`.
3. **Cruce con la constancia**: mostrar la composición corporal junto
   al mapa de constancia ya existente (`mapaHTML()`, el de semanas ×
   volumen). Cómo se representan juntas dos series de naturaleza tan
   distinta (una línea continua, un mapa de calor semanal) es una
   decisión de diseño visual que se toma al escribir esta spec del
   todo, no ahora — la más sencilla y menos arriesgada es poner una
   debajo de la otra sobre el mismo eje de tiempo, no fusionarlas en
   un único gráfico.

## Fuera de alcance (de momento)

- Cualquier cálculo médico o de composición corporal más preciso que
  peso × % de grasa (DEXA, pliegues, bioimpedancia) — se toma el % que
  Toni anote, venga de donde venga, sin más.
- Tocar el cálculo de TMB/objetivo de la spec 010 — esto es solo
  visualización de una serie histórica, el perfil sigue usando el
  último valor anotado, como ya hace.

## Decisiones abiertas para cuando le toque el turno

- [ ] ¿El editor de % de grasa vive junto al de peso corporal (mismo
  bloque, dos gráficas) o aparte, dentro de la sección "Nutrición" de
  Perfil junto al resto de parámetros configurables (como ya se
  decidió mover el peso, en la corrección de rumbo de la spec 010)?
- [ ] Interpolación exacta: ¿valor más cercano en el tiempo, o
  interpolación lineal entre los dos puntos que rodean la fecha?
  Afecta a cuánto "se inventa" el dato en huecos largos (p. ej., un
  mes sin anotar % de grasa).
- [ ] Formato final del cruce con constancia (punto 3): una decisión
  de diseño, se resuelve al escribir la spec completa de este punto.

## Cómo se despliega y cómo se deshace

Cambio de código directo, sin migración de esquema más allá de un
array nuevo (`E.grasaCorporal`) dentro del estado ya existente —
mismo patrón que `E.corporal`, no hace falta tocar `db.js`. Para
deshacer, revertir el commit.

## Verificación

**Implementado 2026-09-23**, tras mockups aprobados (artifact
`4xnTYmGgz6gif7GQDXKYd4`):

- **Decisiones abiertas resueltas**: el editor de % de grasa vive
  junto al de Perfil → Nutrición (`grasaCorporalHTML()`, justo debajo
  de `corporalHTML()`) — la primera pregunta. Interpolación: **valor
  más cercano en el tiempo** (`N.composicionCorporal()`), no lineal —
  más simple y más honesto que fabricar un punto intermedio
  calculado. Cruce con constancia: **no se ha movido nada** — el mapa
  de constancia se queda donde estaba en Perfil, sin fusionar con
  esta gráfica; era la parte más arriesgada de la spec y no hacía
  falta para lo que Toni pidió en los mockups.
- **`E.grasaCorporal`** (array `{f, pct}`, mismo patrón que
  `E.corporal`) con su propio editor (`data-grasa`/`anotarGrasa`,
  mismo patrón que peso). El campo suelto `nutri.perfil.grasaPct` que
  existía desde la spec 010 se elimina — ahora se deriva en vivo de
  `grasaActual()` (último apunte del historial), sin dos fuentes de
  verdad que sincronizar a mano.
- **`N.composicionCorporal(historialPeso, historialGrasa)`**: cruza
  ambos historiales por fecha más cercana, calcula masa grasa/magra
  estimada. Verificado con `osascript` con datos plausibles (peso
  122→116 kg, grasa 24→20,5% en fechas sueltas): cada fecha de peso
  coge el % de grasa real más próximo, sin inventar ninguno.
- **`graficaComposicionHTML()`**: SVG propio de dos líneas (no la
  `grafica()` interactiva existente, pensada para una sola serie) —
  usa `colorDe()` para los hex reales de `--sis`/`--sis2`, no
  `var(--x)` dentro de atributos SVG (ya documentado en el propio
  código que eso no se resuelve ahí).

Sintaxis de `js/app.js` y `datos/nutricion.js` verificada completa;
CSS balanceado (471/471). **Sin probar en el navegador** — el
recálculo del objetivo al anotar grasa, la gráfica combinada con
datos reales, nada de esto se ha visto en pantalla todavía. `sw.js`
subido a `sistema-v51`.

## Corrección — la gráfica de peso no aparecía con un solo apunte real

Toni: "tenía un peso de 120 al principio y ahora anoté 117 y no me
salió el gráfico". Causa: `cazador.pesoCorporal` (lo que se mete al
dar de alta la ficha) nunca se guardaba como historial — solo servía
de valor de partida para mostrar (`pesoActual()` caía en él si
`E.corporal` estaba vacío, pero nunca lo escribía ahí). Efecto: el
primer "Anotar hoy" de cualquier cazador deja un único punto en
`E.corporal`, y la gráfica (que pide `h.length >= 2`) no aparece hasta
el segundo día — aunque sí hubiera un peso de referencia real, el de
alta.

Arreglo: `asegurarPesoDeAlta()` (nueva, llamada al pintar
`corporalHTML()`) rellena una vez el punto que falta — la fecha de
alta del cazador con su `pesoCorporal` — si `E.corporal` no tiene ya
algo en esa fecha o antes, y si la ficha no se creó hoy mismo (no hay
"antes" que añadir en ese caso). Verificado con `osascript`: con el
caso real de Toni (alta con 120 kg, hoy 117 kg) rellena
`[{alta, 120}, {hoy, 117}]` y guarda una vez; en un segundo pintado no
duplica ni vuelve a guardar; con una ficha creada hoy mismo no hace
nada. De paso, también arregla el "Desde el primer apunte: X kg" que
usa el mismo `h[0]`.

`sw.js` subido a `sistema-v52`.

## Añadido — registro editable de peso y % de grasa

Toni pidió ver el registro de pesos por fecha, por si hay que
corregir alguno — útil además para comprobar a ojo que el respaldo
del peso de alta (arreglo de arriba) se guardó bien.

`historialCorporalHTML(historial, campo, sufijo, tipo)` (nueva, mismo
patrón que "Últimas series" de Perfil): tabla con fecha + valor, más
reciente primero; tocar una fila abre un editor con +/- (mismos
límites que el stepper de turno: 30-250 kg, 3-60%) y "Borrar este
apunte". Se llama una vez desde `corporalHTML()` y otra desde
`grasaCorporalHTML()`, sin duplicar código entre peso y grasa — la
clave de cada fila es `"peso:AAAA-MM-DD"` / `"grasa:AAAA-MM-DD"`
porque los apuntes no tienen id propio, solo fecha. Editar o borrar un
apunte de grasa fuerza el recálculo del objetivo (puede cambiar qué
fórmula toca usar).

Verificado con `osascript` contra el caso real (alta 120 kg, hoy
117 kg): las dos filas aparecen, la más reciente primero, y la fila en
edición muestra los controles correctos. Sin usar clases CSS nuevas
— reutiliza `.tabla`, `.tabla--editable`, `.edit`, `.fila--abierta` ya
existentes. `sw.js` subido a `sistema-v53`.

**Sigo sin poder abrir el navegador desde aquí** (la extensión de
Chrome se mantuvo desconectada en los intentos de hoy) — no he podido
"abrirlo en local" de verdad como pediste, solo verificar la lógica
por separado. Necesito que lo confirmes tú en tu móvil.
