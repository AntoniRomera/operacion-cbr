# 011 — Gráficas de composición corporal y su cruce con la constancia

**Estado:** acordada — sin implementar, para cuando le toque el turno
**Fecha:** 2026-09-21     **Autor:** Toni + Claude
**Parte de:** [[010-nutricion]] (el % de grasa ya es un campo del perfil desde esa spec)

## Problema

Hoy solo hay una gráfica de peso corporal (`E.corporal`, en Perfil).
El % de grasa se pidió como dato opcional del perfil en la spec 010,
pero es un valor suelto que se sobrescribe cada vez — no queda
historial ni gráfica, así que no se puede ver su evolución ni
cruzarla con nada.

## Para quién

Toni, para ver si el peso que sube o baja es sobre todo grasa o sobre
todo músculo, y si eso tiene algo que ver con lo constante que ha sido
entrenando esas semanas — no solo mirar dos números sueltos por
separado.

## Qué se pide

Tres piezas, de menos a más trabajo:

1. **Gráfica de % de grasa corporal**, igual que la de peso hoy: un
   historial propio (`E.grasaCorporal`, array de `{f, pct}`, mismo
   patrón que `E.corporal`), su propio editor (anotar hoy) y su propia
   línea en un `grafica({tipo:"linea"...})`.
2. **Gráfica interpolada peso + % de grasa** → masa grasa y masa
   magra estimadas en el tiempo. Peso y % de grasa casi nunca se
   anotan el mismo día exacto — hay que interpolar el valor que falte
   (el más cercano en el tiempo, o una interpolación lineal entre los
   dos puntos que rodean la fecha) para poder calcular, en cada fecha
   con al menos un dato nuevo, `masaGrasaKg = peso × pct/100` y
   `masaMagraKg = peso − masaGrasaKg`.
3. **Cruce con la constancia**: mostrar la composición corporal junto
   al mapa de constancia ya existente (`mapaHTML()`, el de semanas ×
   volumen). Cómo se representan juntas dos series de naturaleza tan
   distinta (una línea continua, un mapa de calor semanal) es una
   decisión de diseño visual que se toma al escribir esta spec del
   todo, no ahora — la más sencilla y menos arriesgada es poner una
   debajo de la otra sobre el mismo eje de tiempo, no fusionarlas en
   un único gráfico.

## Fuera de alcance (de momento)

- Cualquier cálculo médico o de composición corporal más preciso que
  peso × % de grasa (DEXA, pliegues, bioimpedancia) — se toma el % que
  Toni anote, venga de donde venga, sin más.
- Tocar el cálculo de TMB/objetivo de la spec 010 — esto es solo
  visualización de una serie histórica, el perfil sigue usando el
  último valor anotado, como ya hace.

## Decisiones abiertas para cuando le toque el turno

- [ ] ¿El editor de % de grasa vive junto al de peso corporal (mismo
  bloque, dos gráficas) o aparte, dentro de la sección "Nutrición" de
  Perfil junto al resto de parámetros configurables (como ya se
  decidió mover el peso, en la corrección de rumbo de la spec 010)?
- [ ] Interpolación exacta: ¿valor más cercano en el tiempo, o
  interpolación lineal entre los dos puntos que rodean la fecha?
  Afecta a cuánto "se inventa" el dato en huecos largos (p. ej., un
  mes sin anotar % de grasa).
- [ ] Formato final del cruce con constancia (punto 3): una decisión
  de diseño, se resuelve al escribir la spec completa de este punto.

## Cómo se despliega y cómo se deshace

Cambio de código directo, sin migración de esquema más allá de un
array nuevo (`E.grasaCorporal`) dentro del estado ya existente —
mismo patrón que `E.corporal`, no hace falta tocar `db.js`. Para
deshacer, revertir el commit.

## Verificación

(Pendiente — esta spec se deja acordada pero sin implementar, per
instrucción explícita de Toni de dejarla en specs para más adelante.)
