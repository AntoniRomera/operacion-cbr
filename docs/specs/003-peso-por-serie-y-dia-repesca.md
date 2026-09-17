# 003 — Peso por serie y día de repesca

**Estado:** implementada
**Fecha:** 2026-09-17     **Autor:** Toni + Claude

## Problema

1. Al marcar una serie se guarda qué contaba el contador de reps en ese
   momento (`repsSerie`), pero no qué peso tenía puesto la barra. Si cambias
   el peso a media sesión (subes o bajas de escalón), las series ya marcadas
   antes del cambio muestran el peso nuevo en el botón, no el que de verdad
   movieron.
2. `ppl3` y `ppl6` no tienen forma de recuperar lo que se quedó sin hacer en
   la semana. El manual dice explícitamente que no hace falta un cuarto día
   y que no se debe meter una sesión perdida en el descanso — pero eso
   asumía "meter una sesión entera", no una selección acotada de lo que
   falta.

## Para quién

Toni, único usuario. Pasa cada semana que entrena en varios ratos y cambia
peso sobre la marcha; y cada pocas semanas se le queda un día del split sin
hacer.

## Criterios de aceptación

**Peso por serie**
- [ ] Dado un ejercicio con peso 60 kg, al marcar la serie 1 y luego subir a
  70 kg antes de marcar la serie 2, el botón de la serie 1 sigue mostrando
  60×reps, no 70×reps.
- [ ] El botón de una serie marcada muestra `peso×reps` (p. ej. `60×8`) en
  vez de solo las reps, salvo en ejercicios de peso corporal, que siguen
  mostrando solo reps.
- [ ] Una sesión a medias guardada antes de este cambio (sin `pesoSerie`)
  no rompe: las series ya marcadas siguen marcadas, mostrando el peso
  actual como respaldo.
- [ ] Si un ejercicio se hace a dos pesos distintos en la misma sesión
  (p. ej. 2 series a 40 kg y 2 a 41 kg), al cerrar sesión el volumen y la
  XP se calculan con el peso real de cada tanda, no con el peso final
  aplicado a todas.
- [ ] Esa misma sesión guarda dos filas en el historial para ese
  ejercicio, una por cada peso usado, cada una con su propio kg, series
  y reps — no una fila mezclada.
- [ ] La tarjeta de fin de entreno (y la imagen que se descarga) lista el
  ejercicio dos veces, una por cada peso, en vez de un único renglón con
  el peso final.
- [ ] El récord del ejercicio y el aviso de "sube el peso" se evalúan
  contra el peso real de cada tanda: "sube el peso" solo se dispara si
  *todas* las series marcadas se hicieron al peso actual y agotaron el
  rango arriba — una serie hecha a otro peso no cuenta para esto.

**Día de repesca**
- [ ] Si en `ppl3` te faltan 2 de los 3 días núcleo esta semana, el día 4
  (nuevo, tipo "suelto") se rellena con ejercicios de esos días que
  faltan, sin superar 7 ejercicios en total.
- [ ] Si te faltan más de 7 ejercicios entre los días pendientes, se
  reparten por turnos entre los días que faltan (primero el primer
  ejercicio de cada uno, luego el segundo...) hasta llegar a 7.
- [ ] Si no falta ningún día núcleo esta semana, el día de repesca aparece
  vacío y ya "completado" — no bloquea ni pide nada.
- [ ] Completar ejercicios en el día de repesca no cuenta como núcleo: no
  suma a "X de 3 (o 6) días" de la semana ni hace falta para pasar de
  semana. Sí suma a volumen, XP y estadísticas, igual que cualquier serie.
- [ ] `ppl6` tiene el mismo mecanismo en el día 7, mirando los 6 días
  núcleo.
- [ ] El manual (pantalla "Cómo funciona") deja de decir que no hace falta
  un cuarto día, y explica brevemente qué es la repesca y su tope de 7.

## Fuera de alcance

- No se reordena el historial ni se fusionan filas de sesiones distintas:
  el troceo por peso es solo dentro de la misma sesión/cierre.
- El día de repesca no repite un ejercicio que ya salió por otro día
  núcleo repetido (caso `ppl6` con el mismo patrón fallado dos veces): se
  deduplica por ejercicio.
- No se toca `bloqueAtrasado` (el aviso de "grupo atrasado" en portada):
  sigue siendo un aviso informativo aparte, no se sincroniza con lo que se
  haga en repesca.

## Decisión tomada sin preguntar (trainer's call)

El manual actual avisa contra meter una sesión perdida en el descanso
porque acumular sesiones seguidas tira las reps a las tres semanas. La
repesca no es eso: es un tope duro de 7 ejercicios repartidos entre lo que
falta, pensado como parche puntual, no como una cuarta sesión completa. Se
mantiene el descanso intacto — la repesca es "cuando puedas", no un día de
calendario fijo. Si en la práctica se nota sobrecarga, se ajusta el tope
hacia abajo.

## Cómo se despliega y cómo se deshace

Cambio de código directo en el repo del propio usuario (PWA local, sin
servidor). Se prueba a mano en el navegador antes de dar por cerrado. Para
deshacer, revertir el commit.

## Verificación

Probado en Chrome contra un servidor local (`python3 -m http.server`), con
un cazador nuevo en `ppl3`:
- Botón peso×reps y persistencia por serie al cambiar peso a medio
  ejercicio: **probado**, funciona.
- Repesca con las 3 misiones núcleo sin hacer → día 4 se rellena con 7
  ejercicios repartidos por turnos (banca, muerto, senta, militar,
  negdom, rdl, flexban = 26 series): **probado**, funciona.
- "0 de 3" y racha no cuentan la repesca como núcleo: **probado**.
- Cierre de sesión en repesca guarda fila con `dia: 4`: **probado**.
- Deduplicado por ejercicio cuando el mismo patrón falta dos veces en
  `ppl6`, y repesca vacía cuando no falta nada: **no probado en el
  navegador**, verificado solo leyendo el código (`vistos` por clave;
  bucle no entra si `faltan` está vacío).
- Volumen/XP por peso real y filas separadas por peso: **probado**.
  Sentadilla trasera a 40 kg×8 y 41 kg×8 en la misma sesión guardó dos
  filas (`40 kg × 1 × 8` y `41 kg × 1 × 8`) y la tarjeta de fin de
  entreno las listó por separado. "Sube el peso" con series a peso
  mixto: verificado solo leyendo el código, no forzado en el navegador.

**Aviso para quien retome esto:** la primera vuelta de esta prueba dio un
falso negativo — el service worker (`sw.js`) sirve la app en caché y no
se actualiza solo con recargar, solo cerrando y reabriendo con la
`VERSION` subida. Se subió a `sistema-v26` al tocar `js/app.js` y
`datos/rutina.js`. Si algo no se refleja al probar, lo primero es
desregistrar el service worker y limpiar cachés
(`navigator.serviceWorker.getRegistrations()` + `caches.keys()`), no
asumir que el código está mal.
