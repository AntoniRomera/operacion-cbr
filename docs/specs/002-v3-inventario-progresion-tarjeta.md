# 002 — Migración v:3: inventario real, progresión, movilidad y tarjeta

**Estado:** implementada
**Fecha:** 2026-09-08     **Autor:** Toni + Claude

## Problema

El inventario de discos en `datos/equipo.js` no es el material real de casa
(faltan bumpers de 450 mm y fraccionales de acero, sobra la idea de discos
calibrados de distinto diámetro). El motor de progresión (`E.listos`) sube
siempre el mismo salto fijo, no distingue mancuernas de peso fijo, y no
avisa si un ejercicio lleva tiempo sin tocarse. No existe semana de
movilidad, ni tarjeta de resumen descargable, ni rango de sesión (S-E). El
esquema de export está en `v:2`; hace falta `v:3` sin romper la lectura de
copias antiguas.

## Para quién

Toni, único usuario, entrenador y cliente. Usa la app 3-6 veces por semana.

## Alcance y orden (un punto = un commit, verificando import v:2 tras cada uno)

0. **Inventario real** — `datos/equipo.js`: bumpers 450 mm (5,5,10,15,20,25),
   fraccionales por pares (0,5/1/1,5/2), mancuernas fijas [5] (el par de 8
   se compra más adelante: no se ofrece todavía), incremento mínimo 1 kg,
   aviso de manguito lleno en el visualizador.
1. **Series de aproximación** — cambiar la rampa actual (45/65/85 %) por
   vacía×8 / 50 %×5 / 75 %×3, formato `{kg,reps,hecha}` marcable, cuenta
   tiempo pero no volumen/XP, se conserva si se abandona la sesión.
2. **Higiene de datos** — 0 reps ⇒ `fallado:true` + 20 XP; detección de
   duplicados al importar (mismo f+ej+kg+series+reps, ts <15 min).
3. **Motor de progresión** — incrementos configurables por ejercicio,
   propuesta de último peso tras 3 sesiones ausente, bajada de escalón tras
   2 fallos seguidos, aviso de grupo atrasado en portada.
4. **Semanas de movilidad** — ciclo 4+1 marcado desde el alta, bloque sin
   carga en segundos, XP fijo, cuenta para racha, no se adelanta por fallos.
5. **Ejercicios nuevos** — búlgara con barra (sustituye a disco), suitcase
   carry, yoke walk, variantes isométricas (segundos, volumen kg×s/10),
   dead hang en segundos.
6. **Insignias, logo y tarjeta** — logo SVG monocromo + iconos PWA, 4
   insignias de bloque, rango de sesión determinista S-E, tarjeta PNG
   1080×1350 descargable con `navigator.share` + fallback iOS.

Export sube a `v:3` en el punto 0 (añade campos nuevos); `copia.importar`
sigue leyendo `v:2` (y el rescate `operacion-cbr` antiguo) sin cambios.

## Criterios de aceptación

- [x] Tras cada commit, importar una copia `v:2` real (exportada hoy antes
      de tocar nada) sigue funcionando sin error y sin perder series.
- [x] `equipo.escalonDe("mancuerna")` nunca aparece en la propuesta de
      subida de peso del motor de progresión (solo reps).
- [x] Un ejercicio con 0 reps registradas queda con `fallado:true` y suma
      0 XP siempre, sin excepción, visible en el historial.
- [x] La semana de movilidad aparece en el calendario desde que se genera
      el ciclo (semana % 5 === 0, fijo), no se decide en tiempo de
      ejecución, y fallar 2+ sesiones de una semana de carga no la adelanta.
- [x] La tarjeta PNG se genera y descarga (o comparte) tras cerrar sesión,
      con insignia, aro de rango, logo, volumen, minutos, series, XP y
      ejercicios fallados en rojo.
- [x] Ningún ejercicio nuevo (búlgara, suitcase, yoke, dead hang) ofrece
      kettlebell o mancuerna cargable como implemento.

## Fuera de alcance

- Multiusuario / sincronización remota (sigue siendo un solo cazador local).
- Rediseño visual fuera de lo pedido en insignias/logo/tarjeta.
- Programas más allá de PPL3/PPL6 (variante Upper/Lower, etc.).

## Decisiones cerradas durante la implementación

- Fraccionales: no son de acero, son bumpers FitnessTech de 50 mm de
  diámetro exterior, con el código de color de su bumper equivalente en
  peso (blanco 0,5 / verde 1 / amarillo 1,5 / azul 2 kg). Grosor asumido
  8 mm/disco (no hay dato de fábrica) para el aviso de manguito lleno.
- Mancuernas: solo el par de 5 kg. El de 8 kg se compra más adelante y no
  se ofrece hasta que exista en `datos/equipo.js`.
- "3 semanas" en el aviso de grupo atrasado = 3 semanas de calendario
  (`E.semana`), no 3 sesiones.
- Rango de sesión: reutiliza `COLOR_RANGO`/`ORDEN_RANGO` de
  `datos/logros.js` (mismo lenguaje de color que el rango de nivel del
  cazador), aunque es un cálculo distinto y por sesión, no acumulado.
- Insignias y logo: aprobados primero como boceto en un Artifact
  (lenguaje de corchetes de esquina + rombo, ya usado en los paneles de
  la app) antes de tocar código — ver conversación del 2026-09-08.

## Cómo se despliega y cómo se deshace

Todo en `main`, sin rama (repo de un solo usuario, sin CI). Cada commit es
un punto autocontenido; si un punto rompe algo, `git revert` de ese commit
puntual sin tocar los siguientes. `js/db.js` mantiene lectura de `v:2` y
`operacion-cbr` indefinidamente: no hay "fecha de corte" para los datos.
