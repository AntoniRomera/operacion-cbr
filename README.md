# Operación CBR

App de entreno en casa con barra olímpica de 20 kg y discos de 5, 5, 10, 15, 20 y 25.
Cinco días, cargas calculadas disco a disco, figuras de técnica, temporizador de descanso
e historial de series.

Es una PWA: se instala en el iPhone desde Safari y funciona sin conexión.

## Instalar en el iPhone

1. Abre la web en **Safari** (en Chrome no aparece la opción).
2. Botón **Compartir** → **Añadir a pantalla de inicio**.
3. Se abre a pantalla completa, con su icono, y ya no necesita cobertura.

No hace falta App Store, ni cuenta de desarrollador, ni firmar nada.

## Dónde van los datos

En el propio teléfono, en una base de datos del navegador (**IndexedDB**), con dos almacenes:

| Almacén     | Contenido                                            |
|-------------|------------------------------------------------------|
| `estado`    | Semana, peso de cada ejercicio, sesión a medias       |
| `historial` | Una fila por serie hecha, con índices por fecha y ejercicio |

Si IndexedDB no está disponible (Safari en navegación privada), cae solo a `localStorage`.

No hay servidor ni cuenta: nadie más ve esto. La contrapartida es que si borras el icono
de la pantalla de inicio o limpias los datos de Safari, el historial se va con ellos —
en la pestaña **Info** tienes *Descargar copia de seguridad* y *Restaurar copia*.

## Archivos

```
index.html            la app entera: datos, lógica y estilos
sw.js                 service worker (caché offline)
manifest.webmanifest  nombre, iconos y modo pantalla completa
icons/                iconos generados por tools-mkicons.py
tools-mkicons.py      regenera los PNG sin dependencias
```

Al tocar `index.html`, sube `VERSION` en `sw.js` para que se limpie la caché vieja.

## Probarlo en local

```sh
python3 -m http.server 8000
```

Y abre `http://localhost:8000`. El service worker necesita HTTPS o localhost: con
`file://` no se registra.
