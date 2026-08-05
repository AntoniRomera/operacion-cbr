# SISTEMA

Registro de entreno en casa con barra olímpica y discos, montado como si el
Sistema de *Solo Leveling* te asignara las misiones: cada día es una misión
diaria, las series dan XP, se sube de nivel y se desbloquean logros de rango
E a S.

Es una PWA: se instala en el iPhone desde Safari, funciona sin conexión y
guarda todo en el propio móvil.

**→ [antoniromera.github.io/operacion-cbr](https://antoniromera.github.io/operacion-cbr/)**

<img src="qr.png" width="200" alt="QR a la app">

## Instalar en el iPhone

1. Ábrela en **Safari** (en Chrome no aparece la opción).
2. Botón **Compartir** → **Añadir a pantalla de inicio**.
3. Se abre a pantalla completa, con su icono, y ya no necesita cobertura.

No hace falta App Store, ni cuenta de desarrollador, ni firmar nada.

## Cómo está montado

```
index.html              el armazón: cabecera, main y avisos
css/sistema.css         los estilos (ventanas del Sistema, brillos)

datos/equipo.js         barra y discos que tienes → cargas posibles
datos/ejercicios.js     catálogo: músculos, patrón, claves de técnica
datos/rutina.js         los cinco días, referenciando el catálogo
datos/figuras.js        geometría de los muñecos animados
datos/logros.js         catálogo de logros y sus condiciones

js/db.js                IndexedDB: cazadores, estado, historial, logros
js/progreso.js          XP, niveles, rangos, estadísticas, logros
js/figuras.js           motor SVG que dibuja y anima los muñecos
js/app.js               interfaz y eventos

sw.js                   caché offline · sube VERSION al tocar ficheros
tools-mkicons.py        genera los iconos (SDF, sin dependencias)
tools-qr.py             genera qr.png (QR escrito a mano)
```

### Ampliarlo

- **Otro ejercicio**: una entrada en `datos/ejercicios.js` y llamarlo desde
  `datos/rutina.js`. Si le pones una `figura` que exista, sale dibujado.
- **Más discos**: añádelos a `DISCOS` en `datos/equipo.js`. Las cargas
  montables, los saltos de peso y el dibujo de la barra se recalculan solos
  probando todos los repartos posibles entre los dos lados.
- **Otro logro**: una línea en `datos/logros.js` con su `cond(c)`. El contexto
  que recibe está documentado en `js/progreso.js`.

## Cazadores y datos

El "login" es local: creas una ficha con nombre, peso corporal y un PIN
opcional. Sirve para separar datos si compartís el móvil y para que la app
sepa a quién saludar — **no protege nada** frente a alguien con el teléfono
desbloqueado, porque los datos están en el navegador y se pueden mirar desde
las herramientas de desarrollo. Para eso haría falta un servidor de verdad.

Cada cazador tiene su estado, su historial y sus logros:

| Almacén     | Contenido                                                  |
|-------------|------------------------------------------------------------|
| `cazadores` | Fichas: nombre, resumen del PIN, peso corporal              |
| `estado`    | Semana, peso de cada ejercicio, sesión a medias             |
| `historial` | Una fila por serie, con índice por cazador                  |
| `logros`    | Qué ha desbloqueado cada uno y cuándo                       |

Si IndexedDB no está disponible (Safari en navegación privada), el mismo
interfaz funciona sobre `localStorage`.

Si borras el icono de la pantalla de inicio o limpias Safari, se va todo.
En **Perfil** tienes *Descargar copia de seguridad* y *Restaurar copia*.

## Probarlo en local

```sh
python3 -m http.server 8000
```

Y abre `http://localhost:8000`. Con `file://` no funciona: los módulos ES y el
service worker necesitan HTTPS o localhost.
