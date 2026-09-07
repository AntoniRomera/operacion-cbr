# 001 — De un día 4 suelto a programas PPL configurables

**Estado:** implementada
**Fecha:** 2026-09-07     **Autor:** Toni + Claude

## Problema

El día 4 ("Remate") es un día suelto que hay que trocear en tres bloques de
doce minutos para caber en la semana: en la práctica es fricción, no
material. Además la rutina es un único programa fijo en `datos/rutina.js`
— no hay forma de subir a más frecuencia semanal cuando hay tiempo o
material de sobra (elásticos, discos y mancuernas que se comprarán "a
futuro y en épocas"), ni de calentar de forma genérica antes de la primera
serie, ni de marcar las series de aproximación de barra sin que cuenten
como series de trabajo.

## Para quién

El propio Toni, que es su entrenador y su cliente a la vez y sigue esta
rutina 3-6 veces por semana según la época.

## Criterios de aceptación

- [x] No existe ningún día `suelto: true` en ningún programa: los ejercicios
      de hombro pequeño, brazo y cadera del antiguo día 4 quedan repartidos
      dentro de empuje/tirón/pierna según patrón de movimiento.
- [x] `datos/rutina.js` expone `PROGRAMAS` con al menos `ppl3` (3 días,
      frecuencia 1) y `ppl6` (6 días, frecuencia 2, mismos tres patrones
      repetidos), seleccionables desde un desplegable en la ficha de
      cazador (`data-programa`), persistido en `E.programa`.
- [x] Cambiar de programa no rompe el historial ni los pesos guardados
      (siguen indexados por clave de ejercicio, no por programa).
- [x] Cada día expone un bloque `calentamiento` (texto, no marcable)
      visible antes del primer ejercicio.
- [x] Las series de la rampa de aproximación de barra son marcables
      (botón con estado), pero no suman a `hechas/total` de la cabecera
      del día ni disparan "Sube el peso": viven en `E.sesion[...].aprox`,
      separado de `hechas`.
- [x] `equipo.escalonDe("banda")` no lanza error (hueco preparado para
      cuando haya elásticos; sin ejercicios reales todavía).
- [x] Los logros que contaban días de la semana (`tressemana`,
      `semanaperfecta`) escalan con el núcleo del programa activo
      (`diasNucleo`) en vez de un número fijo — con 3 días de núcleo no
      quedan logros inalcanzables.
- [x] El manual (`pintarManual`) ya no describe el día 4/suelto: explica
      cómo cambiar de programa y cómo funcionan calentamiento/aproximación.
- [x] Probado a mano en el navegador (servidor estático local): las 3
      sesiones de `ppl3` y las 6 de `ppl6` se recorren, se marcan series y
      aproximación, y se cambia de programa sin errores en consola.

## Fuera de alcance

- Ejercicios reales con banda elástica: llegan con su propia spec cuando
  se compre el material.
- Un tercer programa (Upper/Lower u otra frecuencia): añadir uno nuevo es
  construir su calendario con `semana()` sobre los mismos tres patrones,
  pero no se construye ninguno más ahora.
- Editor de rutina en la propia app (crear/editar ejercicios o días desde
  la interfaz): la configurabilidad pedida es "elegir entre programas
  ya definidos en código", no un constructor visual.
- Rediseño visual del calentamiento o de la ficha de cazador más allá de
  reutilizar los componentes (`.vt`, `.arma`, `.claves`) que ya existían.

## Restricciones

- Sesiones más largas: al meter los ejercicios del antiguo día 4 dentro de
  3 días en vez de 4, cada sesión de `ppl3` sube de ~20 a ~26-31 series.
  Es una decisión consciente aceptada por el usuario.
- `ppl6` casi duplica el volumen semanal (patrón x2): es el programa para
  "épocas con tiempo", no el que sigue por defecto (`ppl3`).
- El `sesionId` pasa a llevar el id de programa delante
  (`programa:día:ejercicio`); el progreso de una sesión a medias no
  sobrevive a un cambio de programa a mitad de semana (se pierde el
  in-progress, no el historial ya guardado).

## Decisiones tomadas (quedaron abiertas al empezar, ya cerradas)

- Reparto del día 4: presslm/skull/fondos → Empuje; menton/pajaro/curlinv/
  remoinv → Tirón; hip → Piernas (por patrón de movimiento, ver
  `datos/rutina.js`).
- Selector de programa en la app (no solo preparado en código).
- Dos programas ya reales: PPL 3 días y PPL x2 6 días — no Upper/Lower.
- Añadido después, a petición directa: un accesorio unilateral de glúteo
  (`puente1`, Puente de glúteo a una pierna) en el día de piernas, porque
  el hip thrust solo (3 series) se quedaba corto de volumen directo de
  glúteo.

## Cómo se despliega y cómo se deshace

Commit directo a `main` (repo personal, sin CI, PWA estática servida desde
GitHub Pages). Probado antes con un `python3 -m http.server` local. Vuelta
atrás: `git revert` del commit; el estado guardado en IndexedDB de cada
móvil no se toca por un revert de código, así que un cazador que ya cambió
a `ppl6` se queda con `E.programa: "ppl6"` hasta que entre en la ficha y
vuelva a `ppl3` a mano.
