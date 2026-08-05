/* ============================================================
   Service worker del Sistema.
   El garaje no tiene por qué tener cobertura: la app entera se
   guarda en la primera visita y a partir de ahí abre igual en
   avión que con fibra.
   Sube VERSION al tocar cualquier fichero de la lista y se limpia
   la caché vieja al activarse.
   ============================================================ */
const VERSION = "sistema-v10";
const SHELL = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/sistema.css",
  "js/app.js",
  "js/db.js",
  "js/progreso.js",
  "js/figuras.js",
  "datos/equipo.js",
  "datos/ejercicios.js",
  "datos/rutina.js",
  "datos/figuras.js",
  "datos/logros.js",
  "icons/icon-192-v2.png",
  "icons/icon-512-v2.png",
  "icons/icon-maskable-512-v2.png",
  "icons/apple-touch-icon-v2.png",
  "icons/favicon-32-v2.png"
];

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    /* De uno en uno: si falla un icono suelto, no se cae la instalación entera. */
    await Promise.all(SHELL.map(u => c.add(u).catch(err => console.warn("sin cachear", u, err))));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if(req.method !== "GET") return;
  if(new URL(req.url).protocol.startsWith("chrome-extension")) return;

  /* Abrir la app: red primero para pillar cambios, caché si no hay red. */
  if(req.mode === "navigate"){
    e.respondWith((async () => {
      try{
        const res = await fetch(req);
        const c = await caches.open(VERSION);
        c.put("index.html", res.clone());
        return res;
      }catch(err){
        const c = await caches.open(VERSION);
        return await c.match("index.html") || await c.match("./") || Response.error();
      }
    })());
    return;
  }

  /* Todo lo demás (iconos, fuentes de Google): caché primero, rápido y offline. */
  e.respondWith((async () => {
    const hit = await caches.match(req);
    if(hit) return hit;
    try{
      const res = await fetch(req);
      if(res && (res.ok || res.type === "opaque")){
        const c = await caches.open(VERSION);
        c.put(req, res.clone());
      }
      return res;
    }catch(err){
      return Response.error();
    }
  })());
});
