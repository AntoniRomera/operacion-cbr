# 002 — Migración v:3: inventario real, progresión, movilidad y tarjeta

**Estado:** borrador
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

- [ ] Tras cada commit, importar una copia `v:2` real (exportada hoy antes
      de tocar nada) sigue funcionando sin error y sin perder series.
- [ ] `equipo.escalonDe("mancuerna")` nunca aparece en la propuesta de
      subida de peso del motor de progresión (solo reps).
- [ ] Un ejercicio con 0 reps registradas queda con `fallado:true` y suma
      20 XP, visible en el historial.
- [ ] La semana de movilidad aparece en el calendario desde que se genera
      el ciclo, no se decide en tiempo de ejecución, y fallar 2+ sesiones
      de una semana de carga no la adelanta.
- [ ] La tarjeta PNG se genera y descarga (o comparte) tras cerrar sesión,
      con insignia, aro de rango, logo, volumen, minutos, series, XP y
      ejercicios fallados en rojo.
- [ ] Ningún ejercicio nuevo (búlgara, suitcase, yoke, dead hang) ofrece
      kettlebell o mancuerna cargable como implemento.

## Fuera de alcance

- Multiusuario / sincronización remota (sigue siendo un solo cazador local).
- Rediseño visual fuera de lo pedido en insignias/logo/tarjeta.
- Programas más allá de PPL3/PPL6 (variante Upper/Lower, etc.).

## Decisiones abiertas (asumo y sigo; corrígeme si no)

- [ ] Grosor de fraccional: asumo 8 mm/disco (no viene dado); con manguito
      útil de 410 mm y bumpers de 30 mm, el aviso de "no cabe" se calcula
      con esos dos grosores.
- [ ] Los bumpers ya no tienen `alto`/`ancho` distintos por peso (todos
      450 mm de diámetro): el dibujo de la barra cambia de escala visual.
- [ ] "3 semanas" en el aviso de grupo atrasado = 3 semanas de calendario,
      no 3 sesiones.

## Cómo se despliega y cómo se deshace

Todo en `main`, sin rama (repo de un solo usuario, sin CI). Cada commit es
un punto autocontenido; si un punto rompe algo, `git revert` de ese commit
puntual sin tocar los siguientes. `js/db.js` mantiene lectura de `v:2` y
`operacion-cbr` indefinidamente: no hay "fecha de corte" para los datos.
