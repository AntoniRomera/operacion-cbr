# 010 — Nutrición (bloque B)

**Estado:** acordada
**Fecha:** 2026-09-21     **Autor:** Toni + Claude
**Parte de:** [[006-plan-nuevas-funcionalidades]] — bloque B, el último del plan

## Problema

Toni entrena con la app pero lleva la comida a ojo o en la cabeza: sin
macros, sin objetivo calórico calculado, sin sitio donde apuntar
suplementos ni comidas rápidas. El plan 006 ya fijó que esto entra
integrado en el mismo Sistema, no como una app aparte.

## Para quién

Toni, cazador único de la app, que quiere calcular su objetivo
calórico real, registrar comida (escaneada o a mano), tener menús y
batch cooking listos, y anotar suplementos — todo sin perder ni un
dato de lo que ya lleva registrado en entreno.

## Decisiones ya tomadas (por Toni, no se repreguntan)

- **Una sola spec para las cuatro capas** (captura, cálculo, contenido,
  suplementos) — se implementan por partes después, pero se piensan
  juntas ahora.
- **Racha de nutrición aparte**: un contador propio, visible junto al
  de entreno en el Perfil, que no se mezcla en el mismo XP/rango de
  cazador.
- **El objetivo calórico se recalcula solo con el peso**: no hay que
  volver a tocar ningún formulario cada vez — si el peso registrado
  cambia ±3 kg respecto al último cálculo, se recalcula.
- Todo esto **sin perder compatibilidad con la instancia real de Toni**
  — su historial, estado y logros actuales siguen funcionando igual.

## Modelo de datos (propuesta, se ajusta en la implementación)

- **`E.nutricion`** dentro del estado por cazador (mismo sitio que ya
  vive `E.equipo`): `{ perfil: {edad, alturaCm, sexo, actividad,
  objetivoPct}, objetivo: {kcal, proteina, grasa, carbo}, pesoCalculo }`.
  `pesoCalculo` es el peso con el que se calculó `objetivo` la última
  vez — dispara el recálculo cuando el peso actual se aleja ±3 kg.
- **Almacén `alimentos`** (nuevo en `db.js`): catálogo local de
  comida, escaneada o manual — `id` (código de barras si lo tiene, si
  no un id local), `nombre`, `marca`, `kcal100`, `proteina100`,
  `grasa100`, `carbo100`, `fuente` (`"off"` | `"manual"`).
- **Almacén `nutricion`** (nuevo en `db.js`): una fila por comida o
  toma de suplemento registrada, mismo patrón que `historial` —
  `cazador`, `f` (fecha), `tipo` (`"comida"` | `"suplemento"`),
  `alimentoId` o `nombre`, `gramos`, `kcal`, `proteina`, `grasa`,
  `carbo`, `ts`. Ninguno de los dos almacenes toca `historial`,
  `estado`, `cazadores` ni `logros` — solo se añaden al `ESQUEMA`
  existente, con la versión de IndexedDB subida.

## Criterios de aceptación

**Captura (escáner + Open Food Facts)**
- [ ] Dado un código EAN-13/EAN-8 escaneado con la cámara, cuando el
  producto existe en Open Food Facts, entonces se guarda en
  `alimentos` con nombre/marca/macros por 100 g y queda disponible
  para registrar sin volver a escanear.
- [ ] Dado un código ya escaneado antes, cuando se vuelve a escanear,
  entonces se usa la copia en `alimentos` sin repetir la petición.
- [ ] Dado un producto con algún macro sin dato en Open Food Facts,
  entonces ese campo queda vacío y editable a mano — nunca se inventa
  un número.
- [ ] Dado un alimento sin código (pollo, fruta, verdura...), se puede
  buscar en una tabla propia y añadirlo a una comida igual que uno
  escaneado.
- [ ] Se respeta el tope de 100 peticiones/min a Open Food Facts, con
  User-Agent propio, y la atribución ODbL aparece en Ajustes/Acerca de.

**Cálculo (TMB, mantenimiento, macros)**
- [ ] Dado el perfil (edad, altura, sexo, actividad) y el peso
  corporal más reciente, se calcula TMB por Mifflin-St Jeor,
  mantenimiento (TMB × factor de actividad) y objetivo diario de
  kcal/macros según el % de déficit/superávit del perfil.
- [ ] Dado que el peso corporal registrado se aleja ±3 kg del peso
  usado en el último cálculo, el objetivo se recalcula solo.
- [ ] Con los datos del ejemplo de 120 kg del prompt original, el
  motor da TMB/mantenimiento/macros del mismo orden (±5%) — caso de
  prueba del motor, no funcionalidad nueva.

**Contenido (menús, batch cooking, comidas rápidas)**
- [ ] Hay al menos un menú semanal y una guía de batch cooking del
  domingo con reparto nevera/congelador, ambos editables.
- [ ] Las ensaladas/bowls rápidos llevan etiquetas (sin cocinar / 5
  min / aguanta en tupper / alta proteína) y aparecen como alternativa
  a cualquier comida del menú.
- [ ] El botón "cambiar comida" solo propone alternativas dentro de un
  ±15% de kcal y macros parecidos, nunca cualquier cosa del catálogo.
- [ ] Las listas de la compra muestran precio con aviso de que es
  estimado, no un dato garantizado.

**Suplementos**
- [ ] Se puede llevar una lista de suplementos propios (creatina,
  beta-alanina, omega-3...) y marcar cada uno como tomado hoy — mismo
  patrón de bloques marcables que cardio/movilidad.
- [ ] El registro de suplementos no entra en el cálculo de kcal/macros
  del día — es solo un registro de toma, no comida.

**Racha de nutrición**
- [ ] Un día cuenta como "nutrición cumplida" cuando lo registrado cae
  dentro de ±10% del objetivo de kcal y ≥90% del objetivo de proteína
  ese día; se guarda una racha propia, visible en el Perfil junto a la
  de entreno, sin sumarse a su XP ni a su rango.
- [ ] La racha de nutrición usa el mismo margen de gracia que la de
  entreno (4 días sin romperse) — mismo criterio, por consistencia.

**Compatibilidad**
- [ ] Tras la migración de esquema de `db.js` (almacenes nuevos), la
  instancia real de Toni sigue abriendo igual: su historial, estado y
  logros actuales no cambian de forma ni pierden datos.

## Fuera de alcance

- Rango con letras (S/A/B/C/D) para nutrición — en esta primera
  versión es solo una racha (número de días), sin rango.
- Sincronización con básculas conectadas o HealthKit — es cosa de la
  app nativa Swift, cuando le toque el puerto.
- Reconocimiento de comida por foto — solo código de barras + tabla
  manual.
- Scraping de recetas de terceros — descartado ya en el plan 006, no
  se retoma sin que Toni lo pida de nuevo.
- Puerto a Swift — se prueba primero en la PWA, como los otros bloques.

## Restricciones

- Ningún dato de `historial`, `estado`, `cazadores` ni `logros` se
  toca ni se transforma en la migración — solo se añaden almacenes.
- Sin API key para Open Food Facts; uso anónimo respetando su límite.
- Nada de macros inventados: si Open Food Facts no trae un dato, se
  deja vacío y editable, nunca se rellena con un valor supuesto.

## Decisiones tomadas sin preguntar (trainer/dev's call)

- **Macros objetivo**: proteína 2 g/kg de peso corporal, grasa 25% de
  las kcal objetivo, el resto en carbohidratos. Son valores de partida
  razonables para entreno de fuerza con déficit/mantenimiento — si en
  la práctica no encajan, se ajustan desde el propio perfil, sin tocar
  código.
- **Umbral de "día cumplido"**: ±10% kcal y ≥90% proteína. Si resulta
  demasiado estricto o demasiado laxo usándolo de verdad, se ajusta.
- **Dos almacenes nuevos** (`alimentos`, `nutricion`) en vez de meter
  todo en `historial` — el historial de entreno es de series/ejercicio,
  mezclar comida ahí habría forzado campos que no pintan nada en una
  fila de banca press.

## Cómo se despliega y cómo se deshace

Cambio de código directo + migración de esquema en IndexedDB (nueva
versión de `db.js`, almacenes nuevos, ninguno existente se toca). Se
prueba a mano en el navegador **con la instancia real de Toni** antes
de dar la migración por buena — es la única forma de confirmar que no
se pierde nada. Para deshacer: revertir el commit; los almacenes
nuevos quedan vacíos y no afectan a los existentes si se revierte
antes de usarlos de verdad.

## Decisión añadida a mitad de implementación

Toni pidió que edad, altura y % de grasa fueran opcionales. Encaja con
lo que ya decía el plan 006 ("Mifflin-St Jeor, o Katch-McArdle si hay
% de grasa") y no se había recogido bien en los criterios de arriba:

- Con `% de grasa` relleno, el motor usa **Katch-McArdle** (370 +
  21,6 × masa magra) y **no hace falta ni edad ni altura**.
- Sin él, hacen falta las dos para **Mifflin-St Jeor**, como estaba.
- Sexo y peso (el que ya registra la app) siempre hacen falta — son la
  base de las dos fórmulas.

## Verificación — primera porción implementada

**Hecho y verificado con `osascript` contra datos reales** (motor de
cálculo puro, sin DOM):
- `datos/nutricion.js`: TMB Mifflin-St Jeor y Katch-McArdle (con y sin
  % de grasa, mismo cazador, dan TMB distinto como toca), mantenimiento
  por actividad, objetivo con déficit/superávit, macros (proteína
  2 g/kg, grasa 25%, resto carbo). Ejemplo de 120 kg: TMB 2155 ·
  mantenimiento 3340 · objetivo -15% → 2839 kcal — orden de magnitud
  correcto para alguien de ese peso.
- `datosSuficientes()`: con % de grasa no exige edad/altura; sin él,
  sí. Sin peso ni sexo, siempre insuficiente.
- `totalesDia()`, `diaCumplido()` (±10% kcal, ≥90% proteína) y
  `rachaNutricion()` (mismo margen de gracia de 4 días que la racha de
  entreno): probados con casos sintéticos, resultado esperado en todos.
- `js/progreso.js`, `js/db.js` y `js/app.js` completos: sintaxis
  válida con `new Function()` tras todos los cambios.
- Migración de esquema en `js/db.js` (VERSION 1→2, almacenes
  `alimentos` y `nutricion` nuevos): revisada a mano línea a línea
  contra el patrón ya probado de `historial`/`logros` — mismo bucle de
  `onupgradeneeded` que salta los almacenes que ya existen, así que no
  toca nada de lo que Toni ya tiene. **No se ha podido ejercitar de
  verdad**: el motor IndexedDB no corre en `osascript`, y el motor de
  `localStorage` tampoco se pudo probar aquí porque sus promesas no
  llegan a resolverse dentro del sandbox de JavaScriptCore que usa
  `osascript -l JavaScript` (until se agotó esperando 5 s sin que
  ninguna promesa asentara) — límite del entorno de verificación, no
  del código. Hace falta probarlo en el navegador de verdad, con la
  instancia real de Toni, antes de dar la migración por buena.
- **Sin probar en el navegador**: la extensión de Chrome estaba
  desconectada durante toda esta implementación (mismo problema de
  siempre esta sesión). Nada de la interfaz (formulario de perfil,
  tarjeta del tablero, vista de Nutrición, altas de comida/suplemento)
  se ha visto ni pulsado todavía.

**Implementado en esta porción:**
- Perfil biométrico en Ficha de cazador (sexo, actividad, objetivo,
  edad/altura/% grasa opcionales), con objetivo diario recalculado
  solo cuando hace falta y mostrado ahí mismo.
- Tarjeta "Nutrición" en el tablero de Misiones (mismo patrón que
  Cardio), con el kcal de hoy frente al objetivo.
- Vista de Nutrición: totales del día vs. objetivo, alta manual de
  comida (nombre + gramos + macros por 100 g, escalado automático),
  listado y borrado de lo registrado hoy.
- Suplementos: lista propia por cazador (nada precargado — Toni añade
  los que toma de verdad), marcar/desmarcar tomado hoy, quitar de la
  lista.
- Racha de nutrición independiente, visible en Ficha de cazador junto
  a la racha de entreno, sin sumarse a su XP.

**Todavía no implementado (fuera de esta porción, no de la spec):**
- Captura: escáner de código de barras y consulta a Open Food Facts —
  el alta de comida es manual, no busca ni reutiliza `alimentos`
  todavía (ese almacén existe en el esquema pero no lo usa ninguna
  pantalla aún).
- Contenido: menús semanales, batch cooking, ensaladas/bowls rápidos,
  listas de la compra, botón "cambiar comida".
- La copia de seguridad (`DB.copia.exportar/importar`) no incluye
  todavía `alimentos` ni `nutricion` — un backup/restore de hoy se
  deja esos datos fuera. Pendiente antes de dar el bloque por cerrado.

`sw.js` subido a `sistema-v39` (además de las dos correcciones
anteriores, `datos/cardio.js` y `datos/musculos.js` — que llevaban
desde sus specs sin entrar en la lista de precache del `sw.js` — y
`datos/nutricion.js` entran ahora en el precache).

## Corrección — TypeError "DB.nutricion.lista undefined" al abrir

Toni lo probó y la app se quedaba en blanco con ese error. Dos cosas
salieron a la vez:

1. **Bug de verdad, pero no el causante**: `js/db.js` tenía dos bytes
   nulos colados donde debería haber un espacio (`.join(" ")`, en
   `claveDe`/`igual` del motor de `localStorage`, usados para la clave
   compuesta de `logros`). No rompe la sintaxis (un byte nulo es
   válido dentro de un string), pero corrompe ese separador en el
   motor de respaldo. Ya estaba ahí antes de esta sesión — se detectó
   porque `rg`/`grep` marcaban el fichero como binario sin `-a`.
   Arreglado a nivel de bytes; `js/db.js` vuelve a ser texto UTF-8
   normal.
2. **La causa real**: `DB.nutricion` sí existe en el fichero servido
   (confirmado byte a byte contra el que sirve `python3 -m
   http.server`) — el navegador de Toni tenía cacheado un `js/db.js`
   **de antes de esta sesión**, de un service worker viejo, y la app
   se abrió sin pasar por una recarga que forzara la actualización.
   Es caché atascada, no un fallo del código nuevo.

`sw.js` subido a `sistema-v40`. Pendiente que Toni fuerce una
recarga completa (cerrar todas las pestañas de la PWA y volver a
abrirla, o vaciar caché y recargar) para que el service worker nuevo
tome el control y sirva `js/db.js` al día.

## Ampliación — peso, platos de batch cooking y suplementos sugeridos

Toni, tras probarlo: "junta el peso" (peso corporal y nutrición
separados en pantallas distintas), y sobre todo — si no sabe los
macros de algo cocinado en casa no puede anotarlo, pero si ya se hace
la parte de batch cooking, esos macros ya se conocen una vez y no hay
que volver a escribirlos cada vez. Añadido también: tener en cuenta el
precio aproximado que alguien quiere gastarse. Y en suplementos, que
la lista no empiece en blanco — que haya algo ya puesto para solo
darle a "+".

- **Peso corporal embebido**: `corporalHTML()` (el mismo widget de
  Perfil, con su gráfica) se pinta también arriba de la vista de
  Nutrición — un solo sitio para ver y anotar el peso mientras miras
  el objetivo que depende de él. No se ha quitado de Perfil: vive en
  los dos sitios, es el mismo componente.
- **Platos (batch cooking)**: `E.nutricion.platos` — cada plato se
  define una vez (nombre, kcal/proteína/grasa/carbo **por ración**, y
  un precio por ración opcional y estimado) y luego se registra con
  un botón "+1 ración", sin volver a teclear nada. Es justo el caso
  que describía Toni: la comida suelta (con macros por 100 g) sigue
  para lo que no viene de un plato guardado, pero el batch cooking
  tiene su propio camino, más rápido y con la mecánica que ya usan
  el equipo y los suplementos (guardar una vez, tocar para reusar).
  El gasto estimado del día se suma solo si algo lleva precio.
- **Suplementos sugeridos**: `N.SUPLEMENTOS_SUGERIDOS` (creatina,
  beta-alanina, omega-3, magnesio, ashwagandha, vitamina D,
  multivitamínico) ya estaba en `datos/nutricion.js` desde el primer
  pase pero no se usaba en ninguna pantalla — fallo mío, no se acabó
  de conectar. Ahora aparecen como chips con un "+" para los que
  todavía no están en tu lista; el campo de texto libre se queda para
  lo que no esté en la lista sugerida. Sigue sin haber nada
  precargado como "tomado" — eso lo decides tú tocando cada uno.

Verificado con `osascript` el flujo completo de un plato: 2 raciones
de un plato de 550 kcal / 1,8 € registradas el mismo día dan 1100 kcal
totales y 3,6 € de gasto estimado — cálculo correcto. El resto
(embebido del peso, chips de sugeridos, guardar/borrar plato) es
interfaz sin probar todavía en el navegador. `sw.js` subido a
`sistema-v41`.

## Corrección de rumbo — dónde vive cada cosa (pendiente de implementar)

Toni, tras ver cómo quedó montado: tres correcciones de sitio, no de
cálculo. Quedan **decididas pero sin implementar** — se hace mañana.

1. **El peso no va en la vista diaria de Nutrición.** Quitar
   `corporalHTML()` de `pintarNutricion()` (se metió ahí en la
   ampliación anterior, y no es donde toca). Va en **Perfil**, junto
   al resto de parámetros configurables de nutrición (sexo, actividad,
   objetivo, edad/altura/% grasa) — un único sitio de configuración,
   no repartido entre pantallas. Sigue siendo el mismo componente
   (`corporalHTML()`), solo cambia dónde se pinta.

2. **Los "platos" no son algo diario — es planificación semanal.**
   El batch cooking se hace 1 o 2 veces por semana, no cada día: la
   parte de **crear/editar un plato** (nombre, macros y precio por
   ración) no debe mezclarse con la vista diaria de Nutrición. Lo que
   sí sigue siendo diario es **registrar que te has comido una ración
   de un plato ya guardado** — eso se queda accesible desde el flujo
   de cada día (el botón "+1 ración"), solo se mueve el formulario de
   "guardar plato nuevo" a su propio sitio.

3. **Nueva pestaña de navegación: "Menús".** La gestión de platos de
   batch cooking (crear, editar precio/macros, guardarlos) vive en su
   propia vista, con su propio icono en la barra inferior — no dentro
   de Nutrición ni de Perfil. Esto además es, de hecho, la pieza de
   "contenido" (menús) del plan original del bloque B — converge con
   lo que ya estaba en `006-plan-nuevas-funcionalidades.md` como
   pendiente, en vez de ser algo aparte.

   **Ojo al implementarlo**: la barra inferior ya tuvo un bug esta
   misma sesión (dos filas, se comía la primera pestaña) al pasar de
   4 a 5 columnas fijas en el CSS. Pasar de 5 a 6 ítems (`ICONOS`,
   `NOMBRE_VISTA`, `.nav{grid-template-columns}`) hay que probarlo de
   verdad en una pantalla estrecha antes de darlo por bueno — no
   repetir el mismo fallo con un ítem más.

## Pendiente para mañana

- [ ] Mover `corporalHTML()` de la vista de Nutrición a la sección
  "Nutrición" de Perfil (punto 1 de arriba).
- [ ] Separar la gestión de platos (crear/editar/guardar) de la vista
  diaria de Nutrición — se queda solo el registro de "+1 ración" de
  platos ya existentes (punto 2).
- [ ] Nueva vista + pestaña de nav "Menús" para gestionar los platos
  de batch cooking (punto 3), con cuidado especial en el CSS de
  `.nav` a 6 columnas (verificar en pantalla estrecha).
- [ ] Tercer camino de registro: "comida sin macros" (texto libre tipo
  "Comida en bar"), excluida de `totalesDia()`/`diaCumplido()` — ver
  corrección de rumbo más abajo.
- [ ] Seguir con lo que ya estaba pendiente de antes: captura
  (escáner + Open Food Facts, con su catálogo `alimentos`), el resto
  de contenido del bloque B que no sea "Menús" (listas de la compra,
  alternativas por macros parecidos), y que la copia de seguridad
  incluya `alimentos`/`nutricion`.
- [ ] Probar todo lo de hoy en el navegador de verdad con la instancia
  real de Toni — no se ha verificado nada de la interfaz todavía
  (Chrome se mantuvo desconectado durante toda la sesión).

## Corrección de rumbo — "comida suelta" sin macros conocidos

Toni: el registro de comida suelta (macros por 100 g) da por hecho que
siempre se conocen los macros. La realidad es que muchas veces no —
comer en un bar, en casa de alguien — y ahí no hay que inventar ni
forzar un número, hace falta poder anotar solo **qué/dónde**, sin
macros ("Comida en bar", "Comida en casa de Raimundo"...).

Es un tercer camino, no un reemplazo de los otros dos (plato guardado
· comida suelta con macros conocidos):

- **Registrar comida sin macros**: solo un campo de texto libre +
  guardar. Se guarda como fila de `nutricion` con `tipo: "comida"`,
  `nombre`, y un flag `sinMacros: true` — sin `kcal`/`proteina`/
  `grasa`/`carbo` (ni siquiera a 0, que sería mentir que fue una
  comida de cero calorías).
- **No entra en los totales del día**: `totalesDia()` y por tanto
  `diaCumplido()`/la racha tienen que excluir las filas `sinMacros`,
  igual que ya excluyen los suplementos — si no, "comí en un bar" se
  contaría como 0 kcal y falsearía si el día se dio por cumplido.
- **Sí aparece en la lista de "Comidas de hoy"**, pero marcada como
  "sin macros" en vez de mostrar "0 kcal" — para que quede constancia
  de que comiste algo ahí, sin mentir sobre cuánto.

Añadido a la lista de pendientes para mañana (junto con mover el peso,
separar los platos en "Menús" y el resto).

## Implementado 2026-09-22 — Menús, comida libre, peso movido

Todo lo pendiente de la corrección de rumbo de ayer:

- **Peso movido**: `corporalHTML()` ya no está en la vista diaria de
  Nutrición — vive en Perfil, justo antes del bloque "Nutrición"
  (mismo componente, un solo sitio de configuración).
- **Nueva pestaña "Menús"** en la barra inferior (6ª, icono de lista).
  `.nav` pasa de `repeat(5,1fr)` a `repeat(6,1fr)`.
- **Gestión de platos movida a Menús**: crear/editar/borrar un plato
  ya no está en la vista diaria — la vista diaria solo tiene "Otro
  plato guardado" (+1 ración de algo ya existente, sin formulario).
- **Planificación semanal** (`E.nutricion.menuSemanal`, objeto
  `{dia: {comida: claveDePlato}}`, días lunes-domingo, comidas
  desayuno/comida/cena/snack): en Menús se asigna un plato a cada
  celda día×comida; en Nutrición, la sección "Hoy" lee el día de la
  semana real (`N.diaSemanaDe(hoy())`) y muestra qué toca, con un
  botón que marca/desmarca "comido" (escribe o borra la fila del
  historial de nutrición con un campo `slot` para poder encontrarla).
- **Comida libre**: campo de texto + guardar, fila con `sinMacros:
  true`, sin nombre feo tipo "cheat meal" — solo "qué/dónde". Excluida
  de `totalesDia()`/`diaCumplido()` (verificado con `osascript`: una
  fila `sinMacros` no suma nada a los totales del día).
- **Un par de platos propuestos** (`N.PLATOS_SUGERIDOS`, basados en
  los prompts de menú de antes: "Pollo con arroz y verduras" — batch
  cooking clásico — y "Bowl de atún con garbanzos" — sin cocinar, 5
  min, alta proteína, aguanta en tupper), con precio estimado. Se
  ofrecen como sugerencia con un "+" en Menús, igual que los
  suplementos sugeridos — nunca se añaden solos a la lista de Toni.

Verificado con `osascript`: `diaSemanaDe` contra fechas conocidas
(2026-09-21 → lunes, 2026-09-22 → martes, 2026-09-27 → domingo,
2026-09-28 → lunes) y que una fila `sinMacros` no cuenta en
`totalesDia`. Sintaxis completa de `js/app.js` válida tras todos los
cambios.

**Sin probar en el navegador todavía** — ni la pestaña nueva, ni el
selector de plato por celda, ni el toggle de "hoy toca". Riesgo
concreto a vigilar: 6 columnas en `.nav` en pantalla estrecha (ver la
nota de ayer sobre el bug de la barra de dos filas).

`sw.js` subido a `sistema-v42`.

## Implementado 2026-09-22 (2) — backup incluye nutrición y alimentos

`DB.copia.exportar`/`importar` (`js/db.js`) ya llevan `alimentos`
(catálogo compartido, se sube por `id` sin duplicar) y `nutricion`
(filas del cazador, con el mismo criterio de "casi idéntica" que ya
usaba el historial: mismo día, tipo y nombre, mismas kcal, a menos de
15 min — `esDuplicadoNutricion`). Versión del formato de copia subida
de `v:3` a `v:4` (solo informativo, el importador no la usa para
decidir nada, igual que antes). Mensaje de "añadido/duplicados" en
`js/app.js` actualizado de "series" a "filas" porque ahora puede venir
de entreno o de nutrición.

**Sin verificar de extremo a extremo**: la lógica calca el patrón ya
probado de `esDuplicado`/historial, pero el flujo async de `db.js`
no se puede ejercitar en este entorno (`osascript`) — mismo límite
que ya se documentó el 2026-09-21 al intentar probar la migración de
esquema. Probar de verdad: exportar una copia, reimportarla sobre el
mismo cazador, y comprobar que ni el historial ni la nutrición se
duplican.

## Decisión pendiente — platos planos vs. platos con ingredientes

Toni, al ver que se monta el escáner: un plato hoy es un total plano
(kcal/macros que se escriben a mano al guardarlo), no una composición
de ingredientes — el escáner alimenta el catálogo `alimentos`
(ingredientes por 100 g) y el registro de comida suelta del día, pero
**no** los platos.

Para que un plato calculara sus macros solo, sumando ingredientes
escaneados con sus gramos, habría que cambiar `plato` de
`{kcal, proteina, grasa, carbo}` a `{ingredientes: [{alimentoId,
gramos}]}` con el total computado — un cambio de modelo real (afecta
al formulario de "guardar plato", a `pintarMenus()`, y a cómo se
registra "+1 ración"), no un añadido pequeño encima de lo que ya hay.

**No se aborda ahora** — el escáner se construye igual (sirve por su
cuenta para comida suelta y para ir llenando el catálogo de
ingredientes, que es la base que haría falta de todas formas si se
decide este cambio más adelante). Queda como decisión abierta para
cuando le toque el turno a "contenido" de verdad.

## Implementado 2026-09-22 (4) — captura, platos por ingrediente, guía de batch

Toni corrigió la decisión de arriba en caliente: los platos no debían
quedar como "decisión pendiente" — si se monta el escáner, tiene que
alimentar ingredientes de verdad, no un total suelto. Se hizo entero,
no solo la captura:

- **`js/openfoodfacts.js`** (nuevo): `buscarProducto(codigo)` consulta
  `GET .../api/v2/product/{codigo}.json` sin API key, valida EAN-8/13,
  lleva la cuenta de peticiones en memoria (tope 100/min). Los campos
  que Open Food Facts no traiga quedan `undefined`, nunca a 0.
  **Limitación real, no un descuido**: un navegador no deja fijar el
  header `User-Agent` desde `fetch()` (cabecera prohibida por el
  estándar) — la recomendación de OFF de mandar uno propio no se
  puede cumplir desde una PWA cliente. Queda documentado en el propio
  fichero en vez de fingir que se manda.
- **`alimentos` pasa a tener un catálogo base** (`ALIMENTOS_BASE` en
  `datos/nutricion.js`, 13 ingredientes crudos con macros por 100 g de
  tablas estándar) que se combina con los propios de Toni
  (`catalogoAlimentos()` en `app.js`) — así los platos se pueden
  componer sin tener que escanear cada ingrediente primero.
- **Los platos ahora son ingredientes + gramos**, no un total escrito
  a mano: `plato.ingredientes = [{alimentoId, gramos}]`,
  `N.macrosDePlato(ingredientes, catalogo)` calcula el total en vivo.
  Se ha reescrito `PLATOS_SUGERIDOS` (los 6 del plan de ayer) en este
  formato — verificado con `osascript` que da los mismos totales que
  ayer (±1 kcal de redondeo). Todos los sitios que leían `plato.kcal`
  directamente (Nutrición: "Hoy toca", "Otro plato guardado",
  registrar ración; Menús: listado y sugeridos) pasan ahora por
  `macrosDePlato`.
- **Buscador de alimentos compartido** (`buscadorAlimentoHTML()`):
  buscar por nombre en el catálogo, código de barras a mano, o
  escanear con la cámara si el navegador soporta `BarcodeDetector`
  (Chrome/Android; sin ese soporte, el botón de cámara ni aparece —
  queda el código a mano como alternativa siempre disponible). Un
  mismo componente sirve para dos sitios, según `buscadorDestino`:
  en Nutrición rellena el formulario de comida suelta; en Menús añade
  el resultado como ingrediente al plato en construcción.
- **Guía de batch cooking del domingo**: Toni preguntó si se habían
  cogido los pasos de preparación y el reparto nevera/congelador del
  prompt — no se habían cogido, añadidos ahora como sección plegable
  en Menús, texto de referencia tal cual del plan, sin cálculo
  ninguno encima.
- **Atribución ODbL** de Open Food Facts añadida en Perfil → Datos.

**Sin probar en el navegador — ninguna parte**: ni la cámara (no hay
forma de simular un `getUserMedia` real ni una detección de código de
barras desde este entorno), ni una consulta real a Open Food Facts,
ni el formulario de ingredientes, ni el buscador. Es la pieza con más
superficie sin verificar de toda la spec — probarla de verdad, con un
producto real escaneado y el permiso de cámara concedido, es el primer
paso antes de dar esto por bueno.

`sw.js` subido a `sistema-v46` (añadido `js/openfoodfacts.js` al
precache).

## Implementado 2026-09-22 (5) — rediseño de Perfil, Nutrición y Menús

Toni: la UI le sigue pareciendo "dura y tosca" en todo lo que no es
entreno/repesca/cardio/historial/logros — ni el aspecto (parecía un
formulario de ajustes, no "el Sistema") ni el flujo (demasiado scroll
para algo simple). Pidió rehacer Perfil + Nutrición + Menús juntas, no
una por una.

Dato nuevo que cambia algo del escáner de ayer: Toni está en
**iPhone/Safari** — `BarcodeDetector` no existe en WebKit, así que el
botón "Escanear con cámara" no le va a aparecer nunca (el código ya
cae solo al código de barras a mano cuando falta el soporte, no rompe
nada, pero de facto el escaneo por cámara es inutilizable en su
móvil real). Anotado aquí para no dar por sentado que se puede probar.

**Patrón nuevo: `panel(id, titulo, subtitulo, contenido)`** — sección
plegable, cerrada por defecto, reutilizando el mismo estilo visual que
ya usan las sesiones del Historial (`.sesion`/`.sesion--abierta`), no
uno inventado. El subtítulo muestra lo justo para saber si hace falta
entrar sin abrir nada (p. ej. "3 cargas de barra", "1080 kcal
objetivo", "sin configurar").

- **Perfil**: se queda siempre visible la cabecera (rango/nivel/XP),
  los atributos y el mapa de constancia — el resto (Racha, Nutrición
  —peso + perfil biométrico juntos, tal como se pidió—, Equipo,
  Arsenal, Programa, Últimas series, Aspecto, Datos) pasa a paneles
  plegados. De 9 bloques siempre visibles a 3.
- **Nutrición**: se queda siempre visible el resumen de macros, "Hoy
  toca" (lo planificado) y Suplementos — las tres acciones de cada
  día. "Otro plato guardado", "Comida libre" y "Añadir comida suelta"
  (las tres menos frecuentes) se agrupan en un único panel "Registrar
  algo más".
- **Menús**: "Nuevo plato" (1-2 veces/semana) pasa a panel, con el
  número de ingredientes ya metidos en el subtítulo. "Tus platos" y
  "Semana" se quedan como estaban (ya eran plegables por día).

Sintaxis de `js/app.js` verificada completa tras cada cambio.
**Sin probar en el navegador** — ni un solo panel se ha abierto de
verdad todavía. `sw.js` subido a `sistema-v47`.

## Implementado 2026-09-22 (6) — rediseño de verdad, al código

Toni vio los tres mockups (artifact publicado, ver conversación) y
aprobó los tres: Nutrición con anillo de kcal + tarjetas de comida,
Menús y Perfil llevados al mismo lenguaje. Se implementó todo:

- **`js/app.js` → `anilloKcalHTML()`/`macroMiniHTML()`** (nuevas,
  sustituyen `macroLinea()` que se borra por no quedar ningún uso):
  anillo SVG con `stroke-dasharray`/`stroke-dashoffset` calculado
  sobre el kcal real del día, más 3 barras finas de macros al lado.
- **`pintarNutricion()`**: "Hoy toca" pasa de botones `.serie` en fila
  a `.tablero-comida` de `.tarjeta-comida` (2 columnas) — comida
  planificada y hecha en verde, planificada y pendiente en cian, sin
  planificar en gris punteado con un toque directo a Menús
  (`data-vista="menus"`) en vez de solo decirlo.
- **`pintarMenus()`**: "Tus platos" pasa a la misma `.tarjeta-comida`
  (con un botón × propio para quitar, ya que la tarjeta entera no
  puede ser a la vez botón de borrar); el hueco final es una tarjeta
  "＋ Nuevo plato" que abre el panel de creación — se quita el acceso
  duplicado que había antes (una fila de panel además de la tarjeta).
  "Semana" pasa de fila de texto a `.dia-fila`: 4 puntos (uno por
  comida) antes de abrir el día, con el día de hoy resaltado en
  violeta.
- **`pintarPerfil()`**: los 8 paneles pasan de `panel()` (fila de
  lista) a `tarjetaPanel()` (rejilla 2×2 con icono). El contenido de
  cada uno — incluida `corporalHTML()`, que trae la gráfica de
  evolución del peso — no cambia nada, solo cómo se pintan la tarjeta
  cerrada y de dónde cuelga el contenido abierto (`secciones` reúne
  icono/título/subtítulo/contenido de cada bloque antes de pintar,
  para poder generar la rejilla y el contenido abierto por separado
  a partir de la misma lista). Verificado a mano que `corporalHTML()`
  sigue llamándose exactamente una vez, dentro de la tarjeta
  "Nutrición" — no se ha perdido en el refactor.
- **CSS nuevo** (`css/sistema.css`): `.tablero-panel`/`.tarjeta-panel`,
  `.anillo-wrap`/`.anillo`/`.macros-mini`/`.macro-mini`,
  `.tablero-comida`/`.tarjeta-comida` (+ variantes `--hecha`/`--vacia`
  y el botón `__borrar`), `.dias`/`.dia-fila`. Balance de llaves
  comprobado (448/448).

Sintaxis completa de `js/app.js` verificada en cada paso. **Sin
probar en el navegador** — es la implementación real de un rediseño
grande, con más superficie sin verificar que cualquier otra spec de
esta sesión. `sw.js` subido a `sistema-v48`.

## Implementado 2026-09-22 (7) — Perfil: una tarjeta a la vez, con Atrás

Toni: la rejilla de Perfil debía abrir solo una tarjeta cada vez, a
pantalla (sustituyendo la rejilla, no apilando debajo) con un botón
"← Atrás" para volver. Cambiado:

- Nuevo estado `perfilAbierto` (un id o `null`, no un Set) — separado
  de `panelesAbiertos`, que sigue siendo multi-abierto para Nutrición
  y Menús (ahí no se pidió cambiar nada, "por el resto ya podríamos
  desplegar").
- `tarjetaPanel()` ya no depende de `panelesAbiertos` — siempre pinta
  la tarjeta cerrada; qué tarjeta está abierta lo decide
  `pintarPerfil()` al elegir entre pintar la rejilla o el contenido de
  `secciones.find(s => s.id === perfilAbierto)`.
- Nuevos manejadores `data-perfilpanel` (abre) y `data-perfil-atras`
  (cierra). Cambiar de vista (`data-vista`) también resetea
  `perfilAbierto` a `null`, para no volver a Perfil y encontrarte
  dentro de una tarjeta sin haberlo pedido.
- CSS `.tarjeta-panel--abierta` borrado por no quedar ningún uso.

**Sobre no perder nada de la instancia real**: repasado explícitamente
todo lo que toca datos persistentes esta sesión —
- Migración de `db.js` (v1→v2, `alimentos`/`nutricion` nuevos): solo
  añade almacenes, el bucle de `onupgradeneeded` salta los que ya
  existen. `historial`, `estado`, `cazadores`, `logros` no se tocan.
- `copia.exportar`/`importar`: campos nuevos con `|| []`, compatible
  en los dos sentidos (una copia vieja sin esos campos importa igual).
- El único cambio de bajo nivel de la sesión es el de los bytes NUL en
  `motorLS` (clave compuesta de `logros`) — **solo afecta al motor de
  respaldo de `localStorage`**, no a IndexedDB. Si el móvil real usa
  IndexedDB (lo normal en un PWA instalado), no afecta en nada. Si por
  lo que sea usa el motor de `localStorage`, los logros ya
  desbloqueados con la clave vieja (separador NUL) no harían match con
  la nueva (espacio) — se verían como no desbloqueados, aunque el
  historial de series en sí no se toca ni se pierde. Comprobar qué
  motor usa el móvil real (Perfil → Datos lo enseña) es lo único que
  yo no puedo verificar desde aquí.

`sw.js` subido a `sistema-v49`. Sintaxis y balance de CSS verificados.
**Sin probar en el navegador.** Nada de esta sesión está commiteado
ni desplegado todavía — a la espera de que lo pidas explícitamente.

## Pendiente — no tocado, a propósito

- **Resto de "contenido"** del plan original (listas de la compra con
  precio agregado por semana, alternativas por macros parecidos,
  botón "cambiar comida" con esa lógica): no se ha tocado — Menús +
  la guía de batch cubren buena parte, se revisa el resto cuando toque.

## Corrección de rumbo — UI/UX de Nutrición y Perfil

Toni, tras usarlo ya funcionando: el registro diario de comida y la
Ficha de cazador (Perfil) le resultan poco útiles de usar — "mucho
slide" (demasiado scroll, muchas secciones apiladas). **Explícitamente
NO incluye** las pantallas de entreno (día push/pull/legs, repesca,
cardio) ni el Historial — esas las da por buenas tal cual están.

Queda anotado como mejora pendiente, **sin implementar todavía** — se
aborda junto con más platos de menú cuando Toni pase el prompt que
tiene pendiente de compartir. No hay todavía un diseño concreto de
"cómo debería verse" — eso se decide al empezar esa spec, no ahora.

## Implementado 2026-09-22 (3) — plan de batch cooking real + UI de Menús

Toni pasó un plan de batch cooking semanal completo (Alcampo, PPL +
cardio suave, sin proteína en polvo, ~190€/mes). Del bloque de
DATOS/CÁLCULOS no se coge nada — esos números viven en el perfil de
Nutrición ya construido (edad/altura/%grasa/objetivo), no se duplican
como contenido estático. Del resto:

- **6 platos reales** en `PLATOS_SUGERIDOS` (`datos/nutricion.js`),
  reemplazando los 2 genéricos de ayer: desayuno (oats+skyr+plátano+
  huevo), comida (pollo+arroz+verdura) y tres cenas rotando (tortilla
  de atún, pavo, merluza), cada uno con patata+verdura+AOVE.
- **Macros calculadas** desde tablas de composición estándar por
  ingrediente en crudo × cantidad — no las que traía el prompt (que
  daba un objetivo de día completo, no por plato). Verificado con
  `osascript`: un día completo con estos platos da 2143-2343 kcal /
  160-177 g proteína según la cena, y 6,3-6,9 €/día → **~46 €/semana**
  con el reparto de cenas del plan (lun/mié tortilla, mar/jue/sáb
  pavo, vie/dom merluza) — cerca de los ~44 €/semana que decía el
  prompt. La cifra de kcal sale un 5-15% por encima del objetivo de
  ≈2050-2100 kcal del prompt — diferencia esperable entre un objetivo
  redondeado y raciones reales pesadas ingrediente a ingrediente,
  nunca forzada para que cuadre. Se ajustan gramos o números en cuanto
  Toni los mida de verdad — todo sigue editable desde Menús.
- **`tipoComida`** nuevo en cada plato (desayuno/comida/cena/snack) —
  filtra qué platos se ofrecen al planificar cada franja del día, para
  no poder colgar sin querer la cena en el desayuno.
- **UI de Menús mejorada**: la semana ya no lista los 7 días con sus 4
  franjas siempre desplegadas — cada día es una fila colapsada (mismo
  patrón que las sesiones de Historial) con el resumen de lo
  planificado, y se expande solo el que se está editando. El
  formulario de "guardar plato" incluye el selector de tipo de comida.

Sintaxis de `js/app.js` y `datos/nutricion.js` verificada completa.
**Sin probar en el navegador** — ni la nueva vista, ni el colapsado
por día, ni el filtro por tipo de comida. `sw.js` subido a
`sistema-v45`.
