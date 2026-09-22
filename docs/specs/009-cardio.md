# 009 — Cardio suelto (sombra de boxeo, juego de pies, comba)

**Estado:** acordada
**Fecha:** 2026-09-21     **Autor:** Toni + Claude
**Parte de:** [[006-plan-nuevas-funcionalidades]] — bloque C

## Problema

Sombra de boxeo, juego de pies y comba no encajan como "ejercicio con
series y reps" del catálogo de fuerza — son trabajo por tiempo y
rondas, sin peso que registrar, y hoy no tienen ningún sitio en la app.

## Para quién

Toni, cuando quiere meter cardio sin que cuente como (ni sustituya) la
misión de fuerza del día.

## Qué patrón se reutiliza

Exactamente el mismo que ya existe para la semana de movilidad —
catálogo de bloques por tiempo, sin barra ni discos, con su propia fila
de historial y XP fijo al completarlo. La diferencia real: movilidad
sustituye la semana entera cada 5ª semana; cardio es una tarjeta más en
el tablero de Misiones, disponible cualquier día, sin pisar la misión
de fuerza.

## Criterios de aceptación

- [ ] Nuevo catálogo `datos/cardio.js`: sombra de boxeo, juego de pies
  y comba, cada uno con su estructura (rondas × segundos de trabajo,
  segundos de descanso) y sus claves de técnica.
- [ ] Tarjeta "Cardio" en el tablero de Misiones, visible siempre (no
  solo en semana de movilidad), que no cuenta como misión núcleo ni
  hace falta para pasar de semana — igual que la repesca hoy.
- [ ] Dentro, se puede marcar cada bloque como hecho y cerrar la
  sesión: se guarda una fila de historial (día sentinela, no un número
  de programa de verdad) y XP fijo solo si se completan los tres
  bloques.
- [ ] La tarjeta se marca "hecha" el mismo día que se cierra; al día
  siguiente vuelve a estar disponible — no es semanal como movilidad.
- [ ] Cuenta para la racha y las estadísticas generales igual que
  cualquier sesión cerrada (mismo camino de `P.estadisticas`/`P.racha`,
  sin lógica nueva).

## Fuera de alcance

- Cronómetro de rondas en vivo (cuenta atrás con avisos de cambio de
  ronda/descanso) — se anota la estructura (rondas/tiempos) como
  información, no se cronometra dentro de la app. Si hace falta más
  adelante, es una spec aparte.
- Muñeco animado para estos bloques — no hay figuras de boxeo/comba en
  `datos/figuras.js`; se queda solo con las claves de técnica, igual
  que cualquier ejercicio sin `figura` en el catálogo normal.
- Tocar la estructura PPL + repesca — Toni confirmó que el 4º día
  (repesca) ya funciona bien tal cual; cardio no lo sustituye ni se
  mezcla con él.
- Puerto a la app nativa Swift — cuando esté refinado en la PWA.

## Decisiones tomadas sin preguntar (trainer/dev's call)

- Disponible una vez al día (se marca "hecha" solo hasta medianoche),
  no una vez por semana como movilidad — es cardio suelto, tiene
  sentido poder repetirlo días distintos.
- `dia: -1` como sentinela en el historial (movilidad ya usa `dia: 0`;
  necesitaba uno distinto que no choque con ningún día real de
  programa, que siempre son ≥ 1).
- XP fijo (mismo valor que movilidad, 60) solo al completar los tres
  bloques — parcial no puntúa, igual que movilidad. Si en la práctica
  se prueba y se quiere puntuar parcial, se ajusta luego.

## Cómo se despliega y cómo se deshace

Cambio de código directo en el repo. Se prueba a mano en el navegador.
Para deshacer, revertir el commit.

## Verificación

**Implementado.** `datos/cardio.js` (sombra de boxeo, juego de pies,
comba) siguiendo al pie de la letra el patrón ya probado de
`datos/movilidad.js` — mismo esqueleto de bloques marcables, cierre de
sesión, XP fijo, fila de historial. Diferencias reales frente a
movilidad, tal como confirmó Toni ("es transversal durante la semana,
no como movilidad que sale cada 4 semanas"): tarjeta siempre visible en
el tablero (no solo en semana de descarga), se marca "hecho" por día
(`cardioHechaHoy`), no por semana, y no sustituye ni cuenta como día
núcleo.

- Además, de paso: cuenta atrás de "movilidad en N semanas" en la
  portada normal — Toni preguntó "no sé si me toca la que viene" y
  hasta ahora no había ninguna pista hasta estar ya dentro de la
  semana. Verificado con `osascript` contra 11 semanas seguidas (1 a
  11): la cuenta y el número de la próxima semana de movilidad salen
  bien en todos los casos, incluido el límite justo antes y justo
  después de una semana de movilidad.
- `dia: -1` confirmado que no choca con `dia: 0` (movilidad) ni con
  ningún día real de programa (siempre ≥ 1).
- Sintaxis completa de `js/app.js` válida; `datos/cardio.js` cargado
  y comprobado de verdad con `osascript` (3 bloques, claves correctas,
  XP 60); CSS sin tocar, balance de llaves intacto (403/403) — se
  reutilizan clases ya existentes (`.ej`, `.tecnica`, `.serie`,
  `.suelta`), sin CSS nuevo.
- **Sin probar en el navegador**: falta ver la tarjeta de Cardio en el
  tablero, marcar un bloque, cerrar la sesión y comprobar que aparece
  en el historial con `dia: -1` sin romper nada de las vistas que
  agrupan por día.

`sw.js` subido a `sistema-v36`.

## Corrección — cardio inflaba los logros de "días de la semana"

Toni probó a hacer cardio varias veces la semana y preguntó si faltaba
algo. Revisando el criterio "cuenta igual que cualquier sesión
cerrada" contra `js/progreso.js`, `racha()`/`estadisticas()` estaban
bien (no miran `dia`), pero `contexto()` calculaba `diasEstaSemana`
como el número de `dia` distintos de la semana **sin excluir el
cardio**. Como `cerrarCardio()` sí guarda `semana: E.semana`, cada
cardio sumaba un "día" más a ese conteo.

Confirmado con `osascript` contra `datos/logros.js`: 3 días núcleo +
1 cardio en la misma semana (con `diasNucleo=4`, repesca sin hacer)
disparaba igualmente el logro **"Semana perfecta"**
(`diasEstaSemana:4 >= diasNucleo:4`) — justo lo contrario de lo que
dice el propio código de `cerrarCardio()` ("no cuenta como día
núcleo"). El aviso de "grupo atrasado" y el avance real de semana no
se veían afectados (ya filtran por `nucleoActivo.includes(f.dia)`);
solo los logros usaban el conteo sin filtrar.

Arreglo en `js/progreso.js` → `contexto()`: excluir `dia === -1` del
cálculo de `diasSemana`. Movilidad (`dia: 0`) se deja tal cual —
cuenta a propósito como "1 día = la semana entera", ya que su cierre
pasa `diasNucleo=1` cuando está completa.

Verificado con `osascript` con tres casos: 3 núcleo + cardio (ya no
completa semana), 4 núcleo reales (sigue completando), movilidad
completa (sigue contando como semana). Los tres dan el resultado
esperado. `sw.js` subido a `sistema-v37`.

## Corrección — el historial mostraba carga y series en sesiones sueltas

Toni: "en el historial pone carga y series cuando realmente el cardio
no funciona así, y la movilidad tampoco". Cierto: `pintarHistorial()`
usaba siempre la misma tabla (Ejercicio · Carga · Series×reps) pensada
para días de fuerza. Con `f.kg` y `f.carga` a 0 en cardio/movilidad, y
`f.series` guardando "bloques/posturas hechas" en vez de series de
verdad, salía basura tipo "0 kg · 3×0". Además el título de la sesión
salía como "Día -1" o "Día 0" porque `dia(n)` no reconoce esos
sentinelas.

Arreglo en `js/app.js` → `filaSesion()`: para `s.dia === -1` (cardio)
o `s.dia === 0` (movilidad) — variable `suelta` — se quita la columna
Carga, la columna Series pasa a "Hecho" con texto
"N bloques"/"N posturas" en vez de "N×reps", el resumen superior
omite el "0 kg", y el título cae a `s.filas[0].nombre` (ya guarda
"Cardio suelto"/"Semana de movilidad") en vez de "Día N" cuando
`dia()` no reconoce el número.

Verificado con `osascript` simulando el render para un día normal, uno
de cardio y uno de movilidad: el normal sigue igual (kg + series×reps),
cardio sale "Cardio suelto · 3 bloques" sin kg, movilidad "Semana de
movilidad · 5 posturas" sin kg. Sintaxis de `js/app.js` comprobada
entera con `new Function()`. **Sin probar en el navegador todavía.**
`sw.js` subido a `sistema-v38`.
