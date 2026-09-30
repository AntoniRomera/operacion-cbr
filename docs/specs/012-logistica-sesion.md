# 012 — Avatares, tiempo de sesión, descanso y material

**Estado:** borrador — prompts para especificar más adelante, nada implementado
**Fecha:** 2026-09-28     **Autor:** Toni + Claude
**Parte de:** ninguna spec anterior — bloque nuevo, mezcla de perfil y entreno

## De dónde sale esto

Toni pidió, literalmente: "prepara los prompts para estas
funcionalidades, fixes para el PWA" — sin implementar nada todavía.
Este documento recoge cada pieza como un prompt suelto, para
convertirlo en spec de verdad (`/especificacion`) cuando le toque el
turno.

## Prompt 0 — Avatares de cazador a partir del nombre

Toni pidió añadir "blobattar" — aclarado: se refiere a un generador de
avatares tipo **boring-avatars** (github.com/boringdesigners/boring-avatars)
u otro parecido — SVG abstracto, determinista, generado a partir de un
string (el nombre del cazador) como semilla, sin ninguna imagen ni
petición de red.

**Por qué encaja aquí**: hoy la Puerta y la Ficha de cazador solo
muestran el nombre en texto — con varios cazadores en el mismo móvil
(la app ya soporta varios), un avatar ayuda a distinguirlos de un
vistazo.

**Consideración técnica para cuando se especifique**: esta PWA no
tiene paso de build ni `npm install` — todo es JS de módulos servido
tal cual (`<script type="module">`). No se puede instalar la
librería de npm directamente. Dos caminos:
- Reimplementar el algoritmo (son unas pocas líneas: hash del string,
  esa semilla decide colores y formas) como función propia en
  `datos/` o `js/`, sin dependencia externa — encaja con "que la app
  en JS funcione" que Toni ya pidió para otras piezas.
- Cargar una build UMD desde un CDN, si existe una que no necesite
  bundler — a comprobar si existe antes de descartar esta vía.

**Preguntas para cuando se especifique**:
- ¿Dónde se ve el avatar — Puerta (selector de cazador), cabecera de
  Ficha, las dos?
- ¿Tamaño único o varios (chico en Puerta, grande en Ficha)?

## Prompt 1 — Reloj de sesión en vivo (hora de inicio + tiempo total)

**Lo que ya existe**: `E.iniciada` guarda el instante en que empieza
la sesión (primera serie marcada), y se usa para calcular `minutos`
**al cerrar** la sesión (tarjeta de resultado). No hay ningún reloj
visible **mientras** entrenas.

**Lo que se pide**: durante la sesión (vista "día"), mostrar la hora
de inicio y/o un contador de tiempo transcurrido, en vivo — para
saber cuánto llevas sin tener que esperar al resultado final.

**Preguntas para cuando se especifique**:
- ¿Hora de inicio fija ("Empezada a las 18:42") o cronómetro corriendo
  ("42:15 y subiendo")? ¿Los dos?
- ¿Dónde se ve — cabecera de la vista "día", o solo en el resumen al
  cerrar?

## Prompt 2 — Desglose de tiempo al cerrar la sesión

Corregido tras aclaración de Toni: no es un botón de "más descanso" —
es un **desglose del tiempo total** en la tarjeta de resultado, al
cerrar la sesión: **tiempo total = descansos + descanso extra +
efectivo**.

- **Efectivo**: tiempo realmente currando (entre que marcas que
  empiezas una serie y la marcas hecha).
- **Descansos**: tiempo de descanso programado que sí se respetó
  (el temporizador que ya existe, `empezarDescanso`).
- **Descanso extra**: tiempo de más que se tomó por encima del
  descanso programado — la diferencia entre "cuándo tocaba la
  siguiente serie" y "cuándo se marcó de verdad".

**Lo que hace falta que no existe hoy**: el código actual no guarda
marcas de tiempo por serie, solo `E.iniciada` (inicio de sesión) y la
hora de cierre — no hay datos para reconstruir el desglose de una
sesión ya cerrada, solo de las que se instrumenten desde ahora.

## Prompt 3 — Preparar material antes de empezar

**Lo que ya existe**: `datos/equipo.js` sabe qué material hace falta
por ejercicio (`implemento`) y las cargas de barra reales
(`equipo.cargasBarra()`), ya usado en Perfil → Equipo. No hay ninguna
pantalla que junte "esto es lo que te hace falta montar hoy" antes de
empezar la sesión.

**Lo que se pide**: un paso, antes de la sesión (o una tarjeta al
principio de la vista "día"), con el material a preparar para los
ejercicios de hoy — qué barra, qué discos, qué mancuernas, qué
bandas — usando lo que ya calcula `equipo.js`, no un cálculo nuevo.

**Preguntas para cuando se especifique**:
- ¿Se puede saltar sin más (por si ya lo tienes montado de la sesión
  anterior), o hace falta marcarlo como "hecho"?
- ¿Cuenta para algo (XP, racha) o es solo informativo?

## Bug — los suplementos no se desmarcan (nutrición diaria)

Toni: "en nutrición diaria los suplementos nunca se desmarcan".

**Lo que hace el código hoy** (revisado, no tocado): el botón
"tomado hoy" busca una fila de hoy en `nutricion` para ese suplemento
y la borra si existe, o la crea si no — en teoría sí se puede
desmarcar tocando otra vez. **No se ha reproducido el fallo** (no hay
navegador disponible en esta sesión para probarlo en vivo), así que
esto se queda como bug abierto con dos sospechas para cuando se mire
de verdad, no como diagnóstico cerrado:

- Posible desajuste de fecha (`hoy()` vs. la fecha guardada en la fila
  — huso horario, medianoche, etc.) que hace que la fila de "hoy" no
  se encuentre nunca al buscar, así que el botón cree siempre que hay
  que *crear* una nueva en vez de borrar la existente.
- Posible desincronización entre `filasNutricion` (en memoria) y lo
  que hay realmente en `IndexedDB`, si algo deja el array en memoria
  desactualizado tras recargar.

**Antes de arreglarlo**: reproducirlo de verdad (marcar, recargar,
desmarcar) y mirar qué fila queda en `nutricion` — sin eso, cualquier
arreglo sería a ciegas.

**Causa real encontrada y arreglada** (Toni pidió "luego aplica los
5", así que esto pasó de prompt a implementación en la misma sesión):
`motor.anadirVarios()` en `js/db.js` (los dos motores, IndexedDB y
`localStorage`) nunca devolvía el id que se le asigna a cada fila
nueva — la promesa se resolvía a `undefined`. Cualquier fila creada
y luego borrada **en la misma sesión, sin recargar** (marcar un
suplemento y desmarcarlo) intentaba `DB.nutricion.borrar(undefined)`,
que falla contra IndexedDB sin avisar — la promesa se rechaza, el
`await` no sigue, y `repintarQuieto()` nunca se llega a ejecutar: la
pantalla se queda tal cual, como si no hubiera pasado nada. Arreglado
para que `anadirVarios` devuelva los ids reales en los dos motores.
Afectaba a cualquier alta+borrado en la misma sesión de `nutricion`
(suplementos, comidas sueltas recién añadidas), no solo a
suplementos — mismo arreglo, un solo sitio.

## Implementado 2026-09-28 — los 5 prompts, ya en código

- **Avatares** (`datos/avatares.js`, `avatarSVG(nombre, tamano)`):
  reimplementación propia (sin librería, esta PWA no tiene build) —
  hash del nombre, generador pseudoaleatorio determinista, paleta
  = `COLOR_RANGO` (los colores de rango que ya usa la app). En la
  Puerta (lista de fichas) y en la cabecera de Perfil. Verificado con
  `osascript`: mismo nombre da siempre el mismo SVG, nombres
  distintos dan avatares distintos, y el XML generado es válido
  (`NSXMLDocument`).
- **Reloj de sesión en vivo**: `iniciarRelojSesion()`/`ticRelojSesion()`,
  un `setInterval` que actualiza un `<span>` en la cabecera de la
  vista "día" mientras `E.iniciada` esté puesto — se para solo al
  repintar cualquier otra vista. Se calcula desde `Date.now() -
  E.iniciada` en cada tic, así que no le afecta que la pestaña haya
  estado en segundo plano (sin la deriva que sí tiene el descanso).
- **Desglose de tiempo al cerrar sesión** (`P.desgloseTiempo()` en
  `js/progreso.js`): cada serie marcada guarda una marca
  `{ts, descansoSeg}` en `E.marcasTiempo`; al cerrar, el hueco hasta
  la siguiente marca (o hasta el cierre, en la última) se reparte
  entre descanso respetado (hasta lo programado) y descanso extra (lo
  que pasa de ahí) — un hueco sin descanso programado detrás cuenta
  entero como efectivo. Verificado con `osascript` un escenario de 3
  series con huecos reales (20 s, 70 s, 140 s) contra 90 s programados
  cada vez: da efectivo 20 s, descansos 250 s, extra 50 s — cuadra a
  mano. Simplificación asumida a propósito: desmarcar una serie no
  quita su marca (es una corrección puntual, no vale la pena
  perseguirla). Se muestra en la tarjeta de resultado, junto a
  volumen/duración/series/XP.
- **Preparar material** (`materialHoyHTML()`): aviso antes de la
  primera serie marcada (desaparece en cuanto arranca la sesión) con
  qué material hace falta hoy — reutiliza `equipoActivo()` y los
  `implemento` del catálogo, ningún cálculo de carga nuevo.
- **Bug de suplementos**: arreglado en `js/db.js`, ver más arriba.

Sintaxis completa verificada (`js/app.js`, `js/db.js`,
`js/progreso.js`, `datos/avatares.js`) y CSS balanceado (477/477).
**Sin probar en el navegador** — ninguna de las cinco piezas se ha
visto en pantalla todavía; el desglose de tiempo en particular
depende de cómo de fiel sea el modelo a una sesión real, que solo se
confirma entrenando con esto puesto. `sw.js` subido a `sistema-v54`.

## Fuera de alcance de este documento

Nada de "contenido" nuevo más allá de lo descrito arriba — sin
tocar movilidad/cardio en el desglose de tiempo (solo el día de
fuerza normal), sin avatar en la Puerta al dar de alta un cazador
nuevo (solo en la lista, una vez creado).

## Corrección — `hoy()` usaba UTC, no la hora local (2026-09-30)

Toni: "el registro de suplementos se sigue sin reiniciar", tras el
arreglo del `anadirVarios` de la ronda anterior. Encontrado un segundo
fallo, independiente de aquel: `hoy()` usaba
`new Date().toISOString().slice(0,10)` — **UTC, no la hora local**.
En España (UTC+2 en septiembre) eso significa que durante las
primeras ~2 horas después de medianoche local, `hoy()` seguía
devolviendo la fecha de **ayer**. Cualquier cosa marcada en esa
ventana (un suplemento, una comida, un peso) se guardaba con la fecha
del día anterior — y al día siguiente de verdad, esa marca ya no
"contaba" para lo que ese día debía enseñar sin marcar. Verificado con
`osascript`: 30 de septiembre a las 00:30 hora local daba "2026-09-29"
con el código viejo, "2026-09-30" con el arreglo.

Cambiado a construir la fecha con `getFullYear()`/`getMonth()`/
`getDate()` (hora local), mismo formato `AAAA-MM-DD` de siempre — no
hace falta tocar ninguno de los 21 sitios que llaman a `hoy()`, todos
siguen recibiendo el mismo tipo de valor.

**No tengo certeza de que esto sea la causa completa** de lo que Toni
ve — no he podido reproducir el síntoma exacto en directo. Dado el
patrón repetido de esta sesión (arreglos correctos enmascarados por el
service worker viejo), lo primero a comprobar antes de asumir que
sigue roto es que el móvil real esté ya en `sistema-v55` — no solo en
la `v54` de la corrección anterior.

`sw.js` subido a `sistema-v55`.

## Corrección — pantalla congelada de un día para otro (2026-09-30)

Toni, con el dato exacto que faltaba: "lo puse a las 20 y hoy a las 10
aun salian" — marcado ayer a las 20:00, seguía marcado hoy a las
10:00. Eso descarta el bug de `hoy()`/UTC de más arriba (ninguna de
las dos horas cae cerca de medianoche), así que no era la causa real.

**Causa encontrada**: `nutricionHoy()` sí filtra bien por fecha — el
problema no son los datos, es que **nadie vuelve a pintar**. La PWA en
iOS, al pasar a segundo plano, normalmente no mata el proceso: lo deja
congelado tal cual. Si Toni dejó la app abierta en "nutrición diaria"
anoche y esta mañana simplemente la retomó (sin navegar a otra vista
y volver, que es lo único que hoy dispara un `pintar()` nuevo), la
pantalla seguía mostrando el HTML de anoche — suplemento marcado —
aunque por debajo `nutricionHoy()` ya no lo contara para hoy. No es un
bug de datos: es que el cambio de día nunca provoca un repintado.

**Arreglo**: nueva variable `fechaPintada` (qué día era `hoy()` la
última vez que se pintó, actualizada al principio de cada `pintar()`)
y un listener de `visibilitychange` que, al recuperar el foco, repinta
entero si `hoy()` ya no coincide con `fechaPintada`. Afecta a
cualquier vista con datos "de hoy" (nutrición diaria es la que se
reportó, pero el mismo repintado beneficia a cualquier otra pantalla
con ese patrón). Verificado: sintaxis de `js/app.js` OK
(`osascript`/`new Function`). **Sin probar en el navegador ni en el
móvil real** — no hay forma de simular "app en segundo plano toda la
noche" desde aquí; esto se confirma solo dejando la app abierta y
comprobando mañana, o con Toni probándolo él mismo.

`sw.js` subido a `sistema-v56`.
