# 013 — Pestaña de Nutrición en el Historial

**Estado:** implementada
**Fecha:** 2026-09-30     **Autor:** Toni + Claude
**Parte de:** ninguna spec anterior — extensión del Historial (spec 004) con lo que ya
calcula la Nutrición (spec 010)

## Problema

El Historial solo enseña sesiones de entreno. Todo lo comido/suplementado ya
se calcula y guarda (`filasNutricion`, `N.totalesDia`, `N.diaCumplido`,
`N.rachaNutricion`), pero no hay ningún sitio para verlo hacia atrás — solo
"hoy".

## Para quién

Toni, al revisar cómo le fue una semana concreta o si de verdad tomó los
suplementos esos días.

## Decisiones

- **Mockup aprobado**: dos variantes (`fila compacta` vs. `fila expandible
  con anillo + barras`) en
  https://claude.ai/artifact/EHqGGoMBYMwwq4ixd2vt7t — Toni eligió la
  expandible ("la de la derecha, la que tiene el gráfico").
- **Pestañas, no una vista nueva**: "Entreno" / "Nutrición" dentro del propio
  Historial (`.pestanas`/`.pestana`, mismo patrón `aria-current="true"` que ya
  usa `.nav__b`), no una entrada nueva en la navegación inferior.
- **Semana natural (ISO), no semana de programa**: el Historial de entreno
  agrupa por `s.filas[0].semana`, un contador del programa (día 1 de push,
  día 2 de pull...), que no significa nada para comer. La pestaña de
  Nutrición agrupa por semana ISO-8601 real (lunes-domingo) — los números de
  "Semana N" de una pestaña y otra **no tienen por qué coincidir**, y es
  intencional.
- **Reutilizar el dibujo de "hoy", no duplicarlo**: el detalle de cada día
  (anillo de kcal + barras de macros) es exactamente `anilloKcalHTML()` +
  `macroMiniHTML()`, las mismas funciones que ya pinta `pintarNutricion()` —
  cero SVG ni CSS nuevos para eso.
- **Un único día abierto a la vez** (`diaNutriAbierto`), mismo patrón que
  `sesionAbierta` en el Historial de entreno.
- **El objetivo de "ahora"**, no uno guardado por día — mismo criterio que ya
  usa `porDiaNutricionCumplido()` (comentario en el código: "no se guarda un
  objetivo distinto por día pasado, se compara con el de ahora mismo").

## Criterios de aceptación

- [x] Dado que hay días de nutrición registrados, al entrar en Historial →
      pestaña Nutrición, aparecen agrupados por semana natural, semana más
      reciente abierta por defecto.
- [x] Dado un día con objetivo calculado, su fila muestra ✓/✗ según
      `N.diaCumplido`, y al tocarla se despliega el anillo de kcal + barras
      de proteína/grasa/carbos con los mismos componentes que "hoy".
- [x] Dado un día con suplementos tomados, se listan como chips; sin
      suplementos, "Sin suplementos".
- [x] Dado que no hay ningún objetivo calculado todavía, el día se puede
      abrir igualmente (sin ✓/✗ ni anillo, solo las kcal totales).
- [x] Arriba de las semanas, la racha nutricional actual/mejor
      (`N.rachaNutricion`), antes calculada pero nunca mostrada en el
      Historial.
- [x] Cambiar de pestaña y volver conserva qué semana/día estaban abiertos
      mientras dure la sesión de la app (mismo criterio que ya vale para
      Entreno: se resetea al cambiar de cazador).

## Fuera de alcance

- Si no hay **ninguna sesión de entreno**, el Historial entero sigue
  mostrando la pantalla vacía de siempre y no llega a pintar las pestañas —
  comportamiento previo, sin tocar; no se ha pedido cambiarlo.
- Filtrar/exportar el historial de nutrición, o cruzarlo con el de entreno
  (qué comiste los días que entrenaste vs. los que no).

## Verificación

Sintaxis completa verificada (`js/app.js`) y CSS balanceado (499/499
llaves). La lógica de agrupación por semana ISO, el cálculo de cumplido por
día y `nombreDiaSemana()` se probaron con `osascript` contra datos de
ejemplo (dos semanas, un día dentro de objetivo y otro fuera): semanas en
orden descendente, cumplido `true`/`false` correctos, racha calculada bien.

**Sin probar en el navegador ni en el móvil real** — ninguna captura de
pantalla, ningún tap real sobre el anillo o las pestañas. `sw.js` subido a
`sistema-v57`.
