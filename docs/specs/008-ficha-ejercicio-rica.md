# 008 — Ficha de ejercicio rica y glosario de músculos (PWA)

**Estado:** implementada
**Fecha:** 2026-09-21     **Autor:** Toni + Claude
**Parte de:** [[006-plan-nuevas-funcionalidades]] — bloque A, segundo corte

## Problema

La ficha de un ejercicio (`pintarEjercicio`) ya enseña estadísticas,
gráficas, el muñeco animado y las claves de técnica — pero todo en un
solo bloque, sin distinguir "cómo se hace" de "dónde se nota", "qué
hago mal" o "qué hago si me duele la rodilla". Y los nombres de músculo
(`ej.musculos`) son términos técnicos sueltos ("Deltoides medio") sin
explicar qué es ni dónde está, para alguien que no lo sepa de memoria.

## Para quién

Toni, entrenando solo, sin nadie al lado que le corrija la forma.

## Qué ya existe y NO se rehace

- **La técnica en pasos** ya está: `ej.claves` (3-4 frases por
  ejercicio, con "!" para la que evita lesión). Se reutiliza tal cual
  como el contenido de la pestaña "Cómo hacerlo" — no se reescribe.
- **El diagrama de movimiento** ya existe: el muñeco animado de
  `datos/figuras.js` + `js/figuras.js`, dibujado en `#lienzo`. Es más
  completo que "2-3 posiciones con flechas" (anima el recorrido entero),
  así que cubre ese punto del prompt original. Si al usarlo se ve corto,
  se revisa aparte — no es parte de esta spec.
- **La progresión de peso** ya existe: `pesoDe`, `repsSugeridas`,
  `dosFallosSeguidos` en `js/app.js`, con el aviso de "listo para subir
  peso" al cerrar sesión. Esta spec solo añade el **RIR recomendado**
  como dato de la ficha — no toca ese motor.

## Criterios de aceptación

**Glosario de músculos**
- [ ] Cada nombre técnico que ya aparece en `musculos` de algún
  ejercicio tiene una entrada en un glosario: nombre común + ubicación
  en una frase corta ("Deltoides medio: el lateral del hombro").
- [ ] Desde la ficha de cualquier ejercicio se puede abrir el glosario
  y ver la explicación de cada uno de sus músculos, sin salir de la
  ficha.

**Pestañas de la ficha**
- [ ] La ficha gana secciones: Cómo hacerlo (ya existente, `claves`),
  Dónde notarlo, Errores comunes, Variantes — cada una visible solo si
  ese ejercicio tiene contenido para ella. Un ejercicio sin "errores"
  todavía no muestra una pestaña vacía ni rompe nada.
- [ ] Aviso fijo, visible en toda ficha: "Si sientes dolor punzante en
  las articulaciones, para el ejercicio." — no depende de que el
  ejercicio tenga contenido propio.

**Modo entreno**
- [ ] Durante una sesión (al marcar series desde el día, no desde la
  ficha completa) se ve una versión reducida: nombre, músculo
  principal, hasta 3 puntos clave y el marcador de series — sin
  gráficas, sin historial completo, sin las cuatro pestañas.

**Variantes y RIR**
- [ ] Los ejercicios de piernas con impacto en rodilla (sentadilla,
  búlgara...) tienen, cuando exista, una alternativa de bajo impacto
  sugerida explícitamente.
- [ ] La ficha muestra el RIR recomendado junto a series/reps/descanso,
  cuando el ejercicio lo tiene definido.

**Silueta con músculo resaltado**
- [ ] Botón "Ver músculos" en la ficha alterna entre el muñeco animado
  (ya existente) y una silueta del cuerpo (frontal o trasera, la que
  toque) con el músculo principal resaltado en un color y los
  secundarios en otro más apagado.

## Fuera de alcance

- Rellenar el contenido nuevo (dónde notarlo, errores, variantes, RIR)
  para los 32 ejercicios de golpe. Se hace incremental: primero los más
  usados de cada patrón (empuje, tirón, pierna), el resto según haga
  falta. Un ejercicio sin ese contenido sigue funcionando con lo que ya
  tenía (claves + muñeco), no se queda roto ni a medias.
- Rehacer el diagrama de movimiento — el muñeco animado ya cubre esa
  función (ver arriba).
- Tocar el motor de progresión (`pesoDe`/`repsSugeridas`) — solo se
  expone el RIR recomendado como dato nuevo.
- Revisión de la semana de movilidad — sigue aparte, pendiente de que
  Toni aclare qué hay que mirar.
- Puerto a la app nativa Swift — cuando esto esté refinado en la PWA.

## Decisiones tomadas sin preguntar (trainer/dev's call)

- El glosario se construye a partir de los nombres técnicos que YA
  existen en `musculos` en el catálogo — no se inventa una taxonomía
  nueva de músculos antes de tener contenido real que la use.
- La silueta con músculo resaltado es una única silueta genérica (no
  hace falta dibujar 32 siluetas distintas): se resalta la región del
  músculo principal/secundario sobre la misma base, con las regiones
  agrupadas por lo que ya define el glosario.
- El "modo entreno" reutiliza la ficha existente `pintarDia`/serie, no
  es una pantalla nueva desde cero — es la vista que ya se usa al
  entrenar, a la que esta spec no le añade las cuatro pestañas nuevas.

## Cómo se despliega y cómo se deshace

Cambio de código directo en el repo. Se prueba a mano en el navegador.
Para deshacer, revertir el commit. El contenido (Fase 2) se puede
completar en varios commits pequeños sin esperar a tenerlo todo.

## Verificación

**Fase 1 (infra) implementada.** Nuevo `datos/musculos.js`: glosario de
los 35 nombres técnicos que ya usaba el catálogo, cada uno con nombre
común, ubicación y `cara` (frontal/trasera — importa para pierna:
cuádriceps se nota delante, isquios/glúteo detrás). `pintarEjercicio`
gana: chips de músculo que al tocarlos explican el músculo en línea,
aviso fijo de dolor, pestañas (Cómo hacerlo/Dónde notarlo/Errores/
Variantes, solo las que tienen contenido), y un botón "Ver músculos"
que alterna el muñeco animado (ya existente) por una silueta genérica
con el músculo principal y los secundarios resaltados.

- **Bug real atrapado antes de enviarlo**: la primera versión de
  `siluetaHTML` construía el SVG con `.replace("<", ...)`, que borraba
  el `<` de la propia forma en vez de envolverla — markup roto. Se
  cambió a construir el `<g>` por concatenación directa. Detectado
  comprobando que el XML generado parsea de verdad (`NSXMLDocument`),
  no solo mirando el código.
- **Caso real verificado**: peso muerto (isquios/glúteo, cara trasera)
  sale con la vista de espaldas y la zona de pierna+glúteo resaltada;
  sentadilla (cuádriceps, cara frontal) sale de frente con la pierna
  resaltada y SIN la zona de glúteo — si las dos hubieran salido
  iguales habría sido tan engañoso como no tener silueta. Probado con
  `datos/musculos.js` + `datos/ejercicios.js` reales vía `osascript`,
  no con datos de mentira.
- **Contenido nuevo (Fase 2) para 6 ejercicios**, uno de cada patrón
  como pedía el prompt original: press banca, press militar (empuje);
  peso muerto, remo Pendlay (tirón); sentadilla trasera, búlgara
  (piernas) — con dónde notarlo, señales de que se hace mal, 3 errores
  comunes cada uno, variantes (sentadilla y búlgara con alternativa de
  rodilla: hip thrust o belt squat), y RIR recomendado. El resto del
  catálogo (26 ejercicios) sigue funcionando con lo que ya tenía —
  claves + muñeco — sin pestañas vacías ni nada roto.
- **Glosario completo**: comprobado por script que los 35 nombres de
  músculo que aparecen en `musculos` de algún ejercicio están todos en
  `GLOSARIO_MUSCULOS` — cero huecos.
- **Sintaxis de `js/app.js` completa**: válida.
- **Sin probar en el navegador todavía** — pendiente de que Toni lo
  abra y toque los chips de músculo, las pestañas y el botón "Ver
  músculos" de verdad.

`sw.js` subido a `sistema-v33`.

**Corrección — el "modo entreno" no existía de verdad:** Toni tocó el
ojo 👁 durante una misión (`tarjetaEjercicio` en `pintarDia`) esperando
ver el contenido nuevo, y no estaba — esa vista siempre fue un sitio
distinto de la ficha completa (`pintarEjercicio`), y solo se había
actualizado la segunda. Se cerró el hueco: la vista de "Ver técnica" de
en medio de una serie ahora sí lleva muñeco + claves + dónde notarlo +
aviso fijo + enlace a la ficha completa — exactamente el criterio
"modo entreno" de esta spec, que se había dejado sin marcar.

**Corrección — popup en vez de desplegar en línea:** pedido aparte, el
mismo "Ver técnica" desplegaba el contenido empujando el resto de
ejercicios de la misión hacia abajo. Ahora abre en un popup (`.modal`)
que no mueve nada del fondo — se cierra tocando la ✕, tocando fuera de
la caja, o volviendo a tocar el ojo.

- **Bug real atrapado al revisar, antes de probarlo**: al quitar un
  atributo que ya no hacía falta (`data-parar-cierre`) se dejó la
  etiqueta `<div class="modal__caja"` sin cerrar (faltaba el `>`) —
  habría roto todo el HTML de después. Se vio releyendo el propio
  cambio, no en el navegador.
- El cierre al tocar fuera se hizo sin añadir un handler de botón
  nuevo: se reutilizó el listener de clics que ya existía para "toques
  que no son botones" (puntos de gráfica, filas de tabla), comprobando
  `e.target` sea el propio fondo y no algo de dentro de la caja —
  si no, cualquier toque dentro habría cerrado el popup por el burbujeo
  del evento.
- Sintaxis completa de `js/app.js` y balance de llaves de
  `css/sistema.css` verificados otra vez después de estos dos cambios.
- Sin probar en el navegador: ábrelo y toca el ojo 👁 durante una
  misión para ver el popup de verdad.

`sw.js` subido a `sistema-v34`.
