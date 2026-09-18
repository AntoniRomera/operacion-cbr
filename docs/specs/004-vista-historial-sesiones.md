# 004 — Vista de historial de sesiones

**Estado:** acordada
**Fecha:** 2026-09-18     **Autor:** Toni + Claude

## Problema

Hoy no hay forma de repasar una sesión pasada. Lo único que existe es:
- El mini-historial de un ejercicio suelto, dentro de la ficha de ese
  ejercicio mientras se entrena (`historialDe` en `pintarEjercicio`).
- La tarjeta de resumen (`resultadoSesion`), que solo existe en memoria
  justo al cerrar una sesión y desaparece al navegar a otra vista.
- El CSV de exportación en Perfil, que no es una vista, es un fichero.

No hay ninguna pantalla que liste "qué entrené, y qué hice en cada sesión".

## Para quién

Toni, único usuario. Quiere poder repasar qué hizo un día concreto (qué
ejercicios, series, kg) sin tener que mirar el CSV a mano ni recordarlo.

## Criterios de aceptación

- [ ] Hay una pestaña nueva en el nav ("Historial", quinto icono junto a
  Misiones/Logros/Perfil/Manual) que lleva a esta vista.
- [ ] La vista lista las sesiones agrupadas por semana (`E.semana`, la
  misma semana que usa el resto de la app), semana más reciente primero.
- [ ] Cada grupo de semana se puede plegar/desplegar; al entrar, la semana
  actual empieza desplegada y las anteriores plegadas.
- [ ] Dentro de una semana, cada sesión sale una vez por combinación
  `(fecha, día)` — una tarjeta con: nombre del día, fecha, duración,
  volumen total, rango y si hubo algún fallo.
- [ ] Al tocar una sesión se despliega el detalle: cada ejercicio con
  kg, series y reps (agrupando por peso si el mismo ejercicio se hizo a
  pesos distintos, igual que ya se ve en la tarjeta de cierre), sin
  generar ninguna imagen/canvas — es texto y HTML, como el resto de la
  app.
- [ ] Una semana sin ninguna sesión registrada no sale como grupo vacío
  con una tarjeta rara: o no aparece, o aparece con un texto claro de
  "sin sesiones esta semana" — decisión de implementación, pero nunca
  una tarjeta que parezca una sesión real.
- [ ] Funciona igual con historial importado desde CSV (Perfil → añadir
  desde fichero): esas filas no tienen nada especial que las distinga,
  así que deben listarse exactamente igual que las nativas.
- [ ] Con historial vacío (cazador nuevo), la vista no rompe: muestra un
  mensaje de "todavía no hay sesiones", no una lista vacía muda ni un
  error en consola.

## Fuera de alcance

- No se regenera ni se descarga la imagen PNG de sesiones pasadas. Eso
  solo existe justo al cerrar sesión (`resultadoSesion` + "Descargar
  tarjeta"); esta vista es texto, no canvas.
- No se edita el historial desde aquí. Editar/borrar una fila sigue
  siendo cosa de Perfil (`editando`), tal cual está hoy.
- No se toca cómo se calcula `bloque`/nombre de día para filas antiguas:
  se muestran resueltas contra el **programa activo actual**, igual que
  ya hace `volumenesDeBloque`. Si el programa cambió entre medias, una
  fila vieja puede mostrar el nombre de día del programa de hoy, no el
  de cuando se entrenó. Es una limitación ya existente en el resto de la
  app, no algo que introduzca esta vista.
- No se pagina ni se recorta el historial largo en esta primera versión
  (todas las semanas, todas las sesiones). Si con meses de datos se nota
  lento o interminable, se corta a un rango (p. ej. últimas N semanas)
  en una vuelta posterior.

## Decisiones tomadas sin preguntar (trainer's call)

- La XP mostrada por sesión es la suma de `xp` de sus filas, no el
  número exacto que se vio al cerrar esa sesión (ese incluía a veces un
  bonus de "día completo" que no se guarda por fila). Se etiqueta como
  aproximada si hace falta, en vez de perseguir un número que ya no está.
- Una "sesión" se agrupa igual que ya agrupa el resto del código
  (`sesionesTrasLa`): mismo `f` (fecha) + mismo `dia` (número). Dos ratos
  distintos del mismo día de repesca en la misma fecha cuentan como una
  sola sesión en esta vista, igual que en el resto de la app.

## Cómo se despliega y cómo se deshace

Cambio de código directo en el repo del propio usuario (PWA local, sin
servidor). Toca `js/app.js` (nueva vista + entrada de nav) y sube
`VERSION` en `sw.js`. Se prueba a mano en el navegador con datos reales
antes de cerrar. Para deshacer, revertir el commit.

## Verificación

(Se completa al implementar y probar contra estos criterios, uno a uno,
en el navegador — no basta con que compile.)
