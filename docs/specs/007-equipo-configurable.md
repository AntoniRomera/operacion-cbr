# 007 — Equipo configurable y vínculo equipo↔ejercicio (PWA)

**Estado:** implementada
**Fecha:** 2026-09-21     **Autor:** Toni + Claude
**Parte de:** [[006-plan-nuevas-funcionalidades]] — bloque A, primer corte

## Problema

`datos/equipo.js` es hoy una constante fija: asume que siempre hay barra
olímpica, un único inventario compartido por todo el catálogo, sin forma
de decir "esto no lo tengo" ni de que el catálogo lo sepa. Comprar un
belt squat o quedarte sin barra en un momento dado significa editar
código.

## Para quién

Toni, único usuario, cuando cambia dónde entrena o qué material tiene.

## Criterios de aceptación

- [ ] El inventario de equipo vive en la base de datos (vía `db.js`), no
  en `datos/equipo.js` como constante — cada pieza tiene `activo: bool`.
- [ ] Sembrado la primera vez: lo que Toni tiene de verdad hoy (barra
  20 kg, discos 25/20/15/10/5/5, fraccionales 0.5/1/1.5/2, mancuerna
  5 kg) sale **activo**; otros tipos ya conocidos por el catálogo (belt
  squat, mancuernas de otros pesos) existen pero **desactivados** — no
  hay que teclearlos desde cero para desactivarlos.
- [ ] Desde Perfil se puede activar/desactivar cada pieza, y añadir una
  pieza local nueva (p. ej. una mancuerna de 8 kg) sin pisar ni duplicar
  el catálogo por defecto.
- [ ] Cada ejercicio del catálogo declara qué equipo necesita — no solo
  la categoría `implemento` que ya existe, sino la pieza concreta cuando
  hace falta distinguir (landmine y belt squat son las dos "no son una
  barra normal", pero son piezas distintas).
- [ ] Un ejercicio cuyo equipo necesario está desactivado no se ofrece:
  ni en repesca, ni como sustitución al "cambiar ejercicio" de un día, y
  se marca visualmente como "sin material" en Perfil → Arsenal.
- [ ] Al reactivar esa pieza, el ejercicio vuelve a estar disponible sin
  tocar nada más — ni la rutina, ni el ejercicio, ni el historial.
- [ ] El catálogo incluye abductores (al menos un ejercicio nuevo) y una
  revisión de los grupos musculares existentes, generalizando los que
  tengan sentido — criterio cualitativo, se valida enseñando la lista
  final a Toni, no con una prueba automática.

## Fuera de alcance

- La ficha de ejercicio enriquecida (músculos técnico/común, "dónde
  notarlo", errores, variantes, RIR, glosario con silueta, diagramas SVG
  de movimiento, pestañas, modo entreno) — es la spec 008, aparte.
- La semana de movilidad — sigue pendiente de que Toni aclare qué hay
  que revisar exactamente; no se toca en esta spec.
- Bloques C (cardio) y B (nutrición, con suplementos) — van después, con
  sus propias specs.
- Puerto a la app nativa Swift — se hace cuando esto esté refinado y
  probado en la PWA, no antes.

## Decisiones tomadas sin preguntar (trainer/dev's call)

- El "equipo por defecto" sembrado es exactamente lo que ya hay en
  `datos/equipo.js` hoy, marcado activo. El resto de tipos que el
  catálogo ya sabe nombrar (belt squat, mancuernas de más pesos) se
  añaden como entradas inactivas del catálogo general, no como algo que
  Toni tenga que dar de alta él mismo la primera vez.
- La vinculación ejercicio↔equipo usa la clave de `implemento` que ya
  existe como base (barra/disco/landmine/mancuerna/banda/corporal), y
  solo se afina a nivel de "pieza concreta" donde de verdad hace falta —
  por ahora, belt squat como implemento nuevo propio, distinto de barra.
  No se modela cada disco o cada mancuerna como si fuera un "implemento"
  distinto: siguen siendo cantidades dentro de `barra`/`mancuerna`.
- El catálogo general de equipo (qué tipos EXISTEN, aunque no los tenga
  Toni) vive igual que el catálogo de ejercicios: como semilla, editable
  luego desde la app — no hace falta una spec aparte para esto, es el
  mismo patrón que ya se decidió para el equipo en la app nativa.

## Cómo se despliega y cómo se deshace

Cambio de código directo en el repo del propio usuario. Se prueba a mano
en el navegador antes de dar por cerrado. Para deshacer, revertir el
commit.

## Verificación

**Implementado.** `datos/equipo.js` pasó de constantes fijas a funciones
que reciben la configuración como parámetro (mismo patrón que ya se usó
en `SistemaCore`, el paquete Swift); `E.equipo` vive en el estado del
cazador, con `configDefecto()` como respaldo mientras no se haya tocado
nada. Nuevo panel "Equipo" en Perfil (activar/desactivar por categoría,
editar barra/discos/fraccionales/mancuernas/bandas). `alternativas()` y
`ejerciciosRepesca()` filtran por `disponible(ej)`; Arsenal marca "sin
material" en vez de ocultar. Catálogo: `abduccion` (corporal, siempre
disponible) y `beltsquat` (implemento nuevo, inactivo por defecto) —
Toni pidió que el belt squat esté pensado para glúteo (postura ancha),
no solo cuádriceps, y así quedó en las claves de técnica y el orden de
músculos.

- **Sintaxis de `js/app.js` completa**: válida (`osascript` + `new
  Function`, igual que en el fix de repesca de la spec 003).
- **`datos/equipo.js` contra los mismos valores reales de antes**: 91
  cargas de barra, tope 110 kg, primeras 10 cargas correlativas —
  ejecutado con `osascript -l JavaScript`, no supuesto. Además: barra o
  discos desactivados da escalones vacíos sin reventar; mancuerna
  respeta su lista; belt squat inactivo por defecto y, al activarlo,
  usa los discos sueltos.
- **El filtro de la repesca, con un caso real**: mancuerna desactivada
  → "Elevaciones laterales" y "Pájaros" (implemento mancuerna)
  desaparecen de la repesca sin tocar el resto; "Press banca" y demás
  siguen saliendo. Probado con `rutina.js` + `ejercicios.js` +
  `equipo.js` reales, no con una copia de los datos.
- **Sin probar todavía en el navegador**: la extensión de Chrome se
  desconectó tres veces seguidas en esta sesión — nada de esto se ha
  visto en pantalla ni tocado de verdad. Falta confirmar a mano: que el
  panel de Equipo en Perfil pinta bien, que los botones de
  activar/desactivar y añadir/quitar peso funcionan tocando la pantalla,
  y que un ejercicio "sin material" se ve marcado en el Arsenal.
- Nav (`.nav` a `repeat(5,1fr)`, bug reportado por Toni al empezar este
  bloque de trabajo): mismo caso, corregido pero sin ver en pantalla.

`sw.js` subido a `sistema-v30`.
