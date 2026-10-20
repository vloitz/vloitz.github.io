importScripts('/aegis-sw-adapter.js');
const CACHE_NAME = 'vloitz-app-v73.3';
const PRELOAD_CACHE_NAME = 'vloitz-tracklist-cache-v2'; // Bóveda de 2s para Latencia Cero

// === CACHES DEL HERO VIDEO ===
// Separados de CACHE_NAME para que sobrevivan a las actualizaciones.
//
// AL REEMPLAZAR LA PORTADA (regenerar en GifPort + copiar a Sync/hero/):
//   · CACHE_NAME          → v60.8 → v60.9   (obligatorio siempre)
//   · HERO_CACHE_NAME     → v1 → v2         (si cambió el poster)
//   · HERO_RUNTIME_CACHE  → v1 → v2         (si cambió el video)
// Si no bumpeás, los usuarios con SW viejo siguen viendo la portada vieja.
const HERO_CACHE_NAME = 'vloitz-hero-v7'; // Precaché del poster
const HERO_RUNTIME_CACHE = 'vloitz-hero-runtime-v7'; // Runtime del video
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/style.css',
    '/fonts.css',
    '/hero.js',
    '/app.js',
    '/calibradores.js',
    '/portada_visual.js',
    '/body-particles.js',
    '/sets.json',
    '/perfil/perfil.webp',
    // '/perfil/banner.webp' — NO se precachea: no se usa en ningún
    //                        dispositivo (hero video en desktop,
    //                        canvas WebGL en móvil). El archivo sigue
    //                        en el repo por si se necesita fallback.
    '/perfil/logo_og.webp',
    '/hero/hero-poster.webp',
    '/favicon/favicon.ico',
    '/manifest.json',
    'https://unpkg.com/wavesurfer.js@7.7.5/dist/wavesurfer.min.js',
    'https://unpkg.com/wavesurfer.js@7.7.5/dist/plugins/regions.min.js',
    'https://cdn.jsdelivr.net/npm/hls.js@latest'
];

// --- INICIO: MOTOR DE BASE DE DATOS (VLOITZ VAULT DB) ---
const DB_NAME = 'vloitz_vault_db';
const STORE_NAME = 'audio_fragments_v2';
const DB_VERSION = 3;

// --- VLOITZ CRYPTO ENGINE (Caja Negra JS) ---
const SECRET_KEY = "vloitz_key_2026";
const KEY_BUFFER = new TextEncoder().encode(SECRET_KEY);

// Función Helper: Desencriptar ArrayBuffer con XOR
function decryptBuffer(buffer) {
    const data = new Uint8Array(buffer);
    const limit = Math.min(100, data.length);
    for (let i = 0; i < limit; i++) {
        data[i] ^= KEY_BUFFER[i % KEY_BUFFER.length];
    }
    return data.buffer;
}

// ⏱️ Helper Senior: Generador de Estampilla de Tiempo Absoluto (HH:MM:SS.mmm)
function getWallClockTime() {
    const d = new Date();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    const ms = String(d.getMilliseconds()).padStart(3, '0');
    return `${hours}:${minutes}:${seconds}.${ms}`;
}

// --------------------------------------------

let performanceTier = 'ALTA/PC';
let isIOSDevice = false; // <--- AÑADIDO
let cacheLimit = 200; // Límite de fragmentos (Default Alta)

// Tabla de límites adaptativos (Evita llenar la memoria del fan)
const TIER_LIMITS = {
    'BAJA': 20, // ~20 minutos (Móviles antiguos)
    'MEDIA': 60, // ~1 hora (Gama media)
    'ALTA/PC': 300 // ~5 horas o set completo (PC / Gama Alta)
};


// Promesa envolvente para manejar IndexedDB dentro del Service Worker
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        // 🛡️ ESCUDO 1: Si la base de datos está bloqueada por una pestaña abierta
        request.onblocked = (event) => {
            console.warn('[Vloitz DB] ⚠️ Actualización bloqueada: Pestañas antiguas siguen usando la BD.');
        };

        // Se ejecuta si es la primera vez o si cambiamos la versión
        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // 🧹 LÓGICA SENIOR (A Prueba de Fallos): Asesino de zombis envuelto en try/catch
            if (db.objectStoreNames.contains('audio_fragments')) {
                try {
                    db.deleteObjectStore('audio_fragments');
                    console.log('[Vloitz DB] 💥 Tabla antigua destruida. Gigabytes liberados.');
                } catch (e) {
                    console.warn('[Vloitz DB] ⚠️ No se pudo eliminar la tabla antigua (posible bloqueo):', e);
                }
            }

            let store;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                store = db.createObjectStore(STORE_NAME, {
                    keyPath: 'url'
                });
                console.log('[Vloitz DB] 🏗️ Almacén de fragmentos v2 creado.');
            } else {
                store = event.target.transaction.objectStore(STORE_NAME);
            }

            // Creamos el índice para poder borrar por el más antiguo (LRU)
            if (!store.indexNames.contains('by_timestamp')) {
                store.createIndex('by_timestamp', 'timestamp');
                console.log('[Vloitz DB] 🕒 Índice de tiempo (LRU) activado.');
            }
        };

        request.onsuccess = (event) => {
            const db = event.target.result;

            // 🛡️ ESCUDO 2: Válvula de escape. Si en el futuro instalas un nuevo SW,
            // este SW actual soltará la base de datos inmediatamente para no causar un bucle.
            db.onversionchange = () => {
                db.close();
                console.log('[Vloitz DB] 🔄 Conexión cerrada pacíficamente para permitir actualización.');
            };

            resolve(db);
        };

        request.onerror = (event) => {
            console.error('[Vloitz DB] ❌ Error al abrir IndexedDB:', event.target.error);
            reject(event.target.error);
        };
    });
}
// --- FIN: MOTOR DE BASE DE DATOS ---

// --- INICIO: FUNCIONES DE LECTURA Y ESCRITURA (VLOITZ CACHE) ---

// Función para guardar un fragmento nuevo en el disco del usuario
async function saveFragmentToDB(url, blob) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);

            // Guardamos el archivo y la hora exacta en la que se guardó
            const record = {
                url: url,
                blob: blob,
                timestamp: Date.now() // Fundamental para el futuro camión de la basura
            };


            const request = store.put(record);

            request.onsuccess = () => {
                console.log(
                    `%c[Vloitz Cache] 💾 Fragmento guardado en Disco: ${url.split('/').pop()}`,
                    "background: #121212; color: #39FF14; font-weight: bold; padding: 2px 4px; border: 1px solid #39FF14; border-radius: 3px;"
                );
                resolve();
            };

            request.onerror = (e) => {
                console.error('[Vloitz Cache] ❌ Error al guardar fragmento:', e);
                reject(e);
            };
        });
    } catch (error) {
        console.error('[Vloitz Cache] Error de conexión DB al guardar:', error);
    }
}

// Función para buscar un fragmento en el disco antes de usar internet
async function getFragmentFromDB(url) {
    try {
        const db = await openDB();
        // Antes de guardar, verificamos si el disco está lleno según el Tier de hardware
        await enforceCacheLimit();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(url);

            request.onsuccess = (event) => {
                const record = event.target.result;
                if (record) {
                    console.log(`[Vloitz Cache] ⚡ Hit de caché local: ${url.split('/').pop()}`);
                    // Reconstruimos el archivo como si viniera de internet
                    const response = new Response(record.blob, {
                        status: 200,
                        statusText: 'OK',
                        headers: {
                            'Content-Type': 'video/iso.segment'
                        }
                    });
                    resolve(response);
                } else {
                    resolve(null); // No está en el disco, hay que descargarlo
                }
            };

            request.onerror = (e) => {
                console.error('[Vloitz Cache] ❌ Error al leer fragmento:', e);
                resolve(null); // Si falla la lectura, devolvemos null para que use internet por seguridad
            };
        });
    } catch (error) {
        console.error('[Vloitz Cache] Error de conexión DB al leer:', error);
        return null; // Fallback a internet
    }
}

// El Camión de la Basura: Borra el fragmento más antiguo si superamos el límite
async function enforceCacheLimit() {
    try {
        const db = await openDB();
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const countRequest = store.count();

        countRequest.onsuccess = async () => {
            if (countRequest.result > cacheLimit) {
                // Si hay demasiados, abrimos un cursor para buscar el más viejo (timestamp menor)
                // IndexedDB no ordena por defecto por timestamp, así que buscamos el primero
                const index = store.index('by_timestamp');
                const cursorRequest = index.openCursor(); // Ordena de menor a mayor tiempo
                cursorRequest.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        const urlToDelete = cursor.value.url;
                        store.delete(urlToDelete);
                        console.log(
                            `%c[Vloitz Cache] 🗑️ Purga Automática: Límite excedido. Borrado: ${urlToDelete.split('/').pop()}`,
                            "background: #121212; color: #FF3131; font-weight: bold; padding: 2px 4px; border: 1px solid #FF3131; border-radius: 3px;"
                        );
                    }
                };
            }
        };
    } catch (error) {
        console.error('[Vloitz Cache] Error en la purga:', error);
    }
}

// --- FIN: FUNCIONES DE LECTURA Y ESCRITURA ---

// --- INICIO: RECEPTOR DE CONFIGURACIÓN Y MENSAJES (OÍDO DEL ESCUDO) ---
self.addEventListener('message', (event) => {
    if (!event.data) return;

    // 1. Receptor de Hardware (Ya existente)
    if (event.data.type === 'CONFIG_HARDWARE') {
        performanceTier = event.data.tier;
        cacheLimit = TIER_LIMITS[performanceTier] || 200;
        isIOSDevice = event.data.isIOS || false;

        console.log(
            `%c[Vloitz Cache] 🧠 Escudo Adaptativo: Nivel ${performanceTier} detectado. Límite de seguridad: ${cacheLimit} fragmentos. (iOS: ${isIOSDevice})`,
            "background: #121212; color: #FF00FF; font-weight: bold; padding: 2px 4px; border: 1px solid #FF00FF; border-radius: 3px;"
        );
    }

    // 2. Receptor de Actualización Forzada (Nuevo - Conectado al botón del Toast)
    if (event.data.type === 'SKIP_WAITING') {
        console.log('[Service Worker] ⚡ Orden de salto de espera recibida por el usuario.');
        self.skipWaiting();
    }
});
// --- FIN: RECEPTOR DE CONFIGURACIÓN Y MENSAJES ---

// 1. INSTALACIÓN: Guardamos la interfaz en el caché (Esperando decisión del usuario)
self.addEventListener('install', (e) => {
    console.log('[Service Worker] Nueva versión instalada. Esperando la orden del usuario para activarse...');
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.all(ASSETS_TO_CACHE.map(a => cache.add(a).catch(function(err) { console.warn('[AegisWasm] Activo omitido del precache (404, no critico):', a); })));
        })
    );
});

// 2. ACTIVACIÓN: Limpiamos versiones viejas si actualizas la web
self.addEventListener('activate', (e) => {
    e.waitUntil(
        Promise.all([
            clients.claim(), // ⚡ Toma el mando de la página actual de inmediato
            caches.keys().then((keyList) => {
                return Promise.all(keyList.map((key) => {
                    // ⚠️ FIX CRÍTICO: No borrar la bóveda fantasma ni los caches del hero.
                    // Los caches del hero se preservan entre versiones porque el video
                    // no cambia a menos que regeneres el collage en GifPort.
                    if (key !== CACHE_NAME && key !== PRELOAD_CACHE_NAME &&
                        key !== HERO_CACHE_NAME && key !== HERO_RUNTIME_CACHE) {
                        console.log(`[Service Worker] 🧹 Limpiando caché obsoleta: ${key}`);
                        return caches.delete(key);
                    }
                }));
            })
        ])
    );
});

// 3. INTERCEPTACIÓN: Si piden algo, miramos el caché primero
self.addEventListener('fetch', (e) => {
    if (self.AegisAdapter && self.AegisAdapter.handle(e)) return;


    // 🛡️ INMUNIDAD ABSOLUTA CONTRA EXTENSIONES Y PARÁSITOS
    // Si la petición no es protocolo web estándar (ej. chrome-extension:// o moz-extension://),
    // la abortamos instantáneamente para no asfixiar el hilo del Service Worker.
    if (!e.request.url.startsWith('http')) {
        return;
    }

    // ============================================================
    // 🎬 HERO VIDEO · Handler 206 (Range Requests)
    // ============================================================
    // Sirve /hero/hero.av1.mp4 y /hero/hero.h264.mp4 desde caché.
    // CRÍTICO para Safari: sin el 206 correcto, el video no arranca.
    // En Chrome/Firefox: la 2da visita sirve el video desde caché local.
    if (e.request.url.includes('/hero/') && /\.(mp4|webm)$/i.test(e.request.url)) {
        e.respondWith(handleHeroVideo(e.request));
        return;
    }

    // 🛰️ ESTRATEGIA VLOITZ ULTRA-FRESH: Carga 0ms + Verificación Real Forzada
    if (e.request.url.includes('sets.json')) {
        e.respondWith(
            caches.match(e.request).then((cachedResponse) => {
                const safeCachedResponse = cachedResponse ? cachedResponse.clone() : null; // Clon seguro antes de consumirse
                // Bypass de Caché: Creamos una URL única para obligar a GitHub a darnos la verdad
                const freshUrl = e.request.url + '?t=' + Date.now();

                // Usamos 'no-store' para que el navegador NO guarde esta petición en su disco interno
                const fetchPromise = fetch(freshUrl, {
                    cache: 'no-store'
                }).then(async (networkResponse) => {
                    if (networkResponse.ok) {
                        const copy = networkResponse.clone();
                        const newText = await networkResponse.clone().text();

                        if (safeCachedResponse) {
                            const oldText = await safeCachedResponse.text();

                            // Si el contenido real cambió, disparamos la actualización
                            if (oldText.trim() !== newText.trim()) {
                                const cache = await caches.open(CACHE_NAME);
                                // Guardamos la versión nueva (con la URL limpia) para la próxima vez
                                await cache.put(e.request, copy);

                                // Avisamos a app.js para recargar la página automáticamente
                                const clientsList = await self.clients.matchAll();
                                clientsList.forEach(client => client.postMessage({
                                    type: 'NUEVO_SET_DETECTADO'
                                }));
                            }
                        } else {
                            // Si es la primera vez que entra, guardamos el JSON
                            const cache = await caches.open(CACHE_NAME);
                            await cache.put(e.request, copy);
                        }
                    }
                    return networkResponse;
                }).catch((err) => {
                    console.error('[SW] Error crítico cargando sets.json:', err);
                    return new Response('{"error": "Network failed"}', {
                        status: 503,
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                });

                return cachedResponse || fetchPromise;
            })
        );
        return;
    }


    // --- INICIO: NETWORK-FIRST PARA NAVEGACIÓN (HTML Y CONFIG INLINE) ---
    // 🛡️ ESTRATEGIA SENIOR: Pedimos el HTML a la red PRIMERO.
    // Esto evita que el CONFIG inline (TEMPLATES, FAVORITOS) se quede atrapado en la caché vieja.
    // Si no hay red, caemos en la caché (offline mode).
    const isShareRoute = e.request.url.includes('/share/');

    if (!isShareRoute && (e.request.mode === 'navigate' || e.request.url.includes('index.html') || e.request.url === self.registration.scope)) {
        e.respondWith(
            fetch('/index.html', {
                cache: 'no-store'
            }).then(async (networkResponse) => {
                if (networkResponse.ok) {
                    // Guardamos la versión fresca en caché para futuras visitas offline
                    const cache = await caches.open(CACHE_NAME);
                    cache.put('/index.html', networkResponse.clone());
                    return networkResponse;
                }
                // Si la red falla (ej. 404), caemos en la caché
                return caches.match('/index.html');
            }).catch(async () => {
                // Modo Offline: Servimos el último HTML guardado
                const cachedResponse = await caches.match('/index.html');
                if (cachedResponse) return cachedResponse;
                // Si no hay caché (primera visita sin internet), devolvemos un error básico
                return new Response('Offline y sin caché', {
                    status: 503
                });
            })
        );
        return;
    }
    // --- FIN: NETWORK-FIRST PARA NAVEGACIÓN ---

    // ============================================================
    // 🎬 HERO VIDEO · Handler 206
    // ============================================================
    // Sirve el video del hero desde HERO_RUNTIME_CACHE.
    // Soporta Range Requests (necesario para que el navegador
    // pueda hacer seek y reproducción progresiva).
    async function handleHeroVideo(request) {
        const cache = await caches.open(HERO_RUNTIME_CACHE);
        const cached = await cache.match(request.url);

        // ⚡ FIX CRÍTICO: Si NO está en cache → NO interceptar.
        // Dejamos que el navegador hable directo con el servidor (GitHub Pages maneja Range nativamente).
        // El SW queda LIBRE para atender otras peticiones (CSS, JS, HLS, etc.).
        // En paralelo, cacheamos el video completo en background para la próxima visita.
        if (!cached) {
            console.log('[SW Hero] ⬇ Primera visita. Passthrough directo + cache en background:', request.url.split('/').pop());
            // Fire-and-forget: no bloquea
            cacheHeroVideoInBackground(request.url);
            // Devolvemos la respuesta de red directa al navegador (sin buffear)
            return fetch(request);
        }

        console.log('[SW Hero] ✓ HIT cache:', request.url.split('/').pop());

        // 2) Si no hay Range header → devolver completo desde cache
        const range = request.headers.get('range');
        if (!range) return cached;

        // 3) Parsear Range y devolver 206 desde cache
        const buffer = await cached.arrayBuffer();
        const m = /bytes=(\d+)-(\d+)?/.exec(range);
        if (!m) return cached;

        const start = parseInt(m[1], 10);
        const end = m[2] ? parseInt(m[2], 10) : buffer.byteLength - 1;
        const chunk = buffer.slice(start, end + 1);

        return new Response(chunk, {
            status: 206,
            statusText: 'Partial Content',
            headers: {
                'Content-Type': 'video/mp4',
                'Content-Range': `bytes ${start}-${end}/${buffer.byteLength}`,
                'Content-Length': chunk.byteLength.toString(),
                'Accept-Ranges': 'bytes'
            }
        });
    }

    // 🎬 Descarga el video completo en background y lo guarda en cache.
    // NO bloquea al SW. Se ignora cualquier error silenciosamente.
    async function cacheHeroVideoInBackground(url) {
        try {
            const res = await fetch(url, {
                cache: 'force-cache'
            });
            if (res.ok) {
                const cache = await caches.open(HERO_RUNTIME_CACHE);
                await cache.put(url, res);
                console.log('[SW Hero] 💾 Video cacheado en background:', url.split('/').pop());
            }
        } catch (e) {
            console.warn('[SW Hero] Cache background falló (no crítico):', e.message);
        }
    }


    // --- INICIO: INTERCEPTOR DE BÓVEDA TÁCTICA (Caja Negra Vloitz) ---
    if (e.request.url.includes('.m4s') && e.request.url.includes('pub-1bd5ca00f737488cae44be74016d8499.r2.dev')) {
        e.respondWith(
            async function() {
                try {
                    // 1. Buscamos en caché primero (Pre-carga Phantom)
                    const cache = await caches.open(PRELOAD_CACHE_NAME);
                    const cachedResponse = await cache.match(e.request);

                    // REGLA DE ORO: Si está en caché, ya está limpio y listo. Se entrega INTACTO.
                    if (cachedResponse && cachedResponse.ok) {
                        const blob = await cachedResponse.clone().blob();
                        if (blob.size > 500) {
                            console.log(`%c[${getWallClockTime()}] [Service Worker] 🧲 Hit Caché Limpio (0ms): ${e.request.url.split('/').pop()}`, "color: #39FF14; font-weight: bold;");
                            return cachedResponse;
                        }
                        cache.delete(e.request); // Limpiar basura técnica
                    }

                    // 2. Si no está en caché, construimos la ruta blindada (.enc)
                    const fileName = e.request.url.split('/').pop();
                    const encUrl = e.request.url.replace(/\/([^\/]+\.m4s)$/, '/v-enc/$1.enc');

                    // Intentamos obtener el archivo encriptado
                    const encResponse = await fetch(encUrl);

                    if (encResponse.ok) {
                        // 3. Éxito: Desencriptamos el buffer al vuelo
                        const buffer = await encResponse.clone().arrayBuffer();
                        const decryptedBuffer = decryptBuffer(buffer);

                        // ⏱️ Extracción milimétrica del índice y conversión a [MM:SS] (Bloques HLS de 2s)
                        const match = fileName.match(/seg-(\d+)\.m4s/);
                        const segIndex = match ? parseInt(match[1], 10) : 0;
                        const totalSecs = segIndex * 2;
                        const mins = Math.floor(totalSecs / 60);
                        const secs = totalSecs % 60;
                        const timeFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

                        console.log(`%c[${getWallClockTime()}] [Vloitz Crypto] 🔓 Desencriptado [Audio: ${timeFormatted}] (${fileName})`, "color: #03dac6; font-size: 10px; font-weight: bold;");

                        const finalResponse = new Response(decryptedBuffer, {
                            status: 200,
                            headers: {
                                'Content-Type': 'video/iso.segment'
                            }
                        });

                        // 💡 FIX SENIOR: Guardar automáticamente en la Bóveda Táctica (PRELOAD_CACHE_NAME)
                        // Forzando el método GET para evitar errores con peticiones HEAD o personalizadas.
                        try {
                            const cacheToSave = await caches.open(PRELOAD_CACHE_NAME);
                            const cleanGetRequest = new Request(e.request.url, {
                                method: 'GET'
                            });
                            await cacheToSave.put(cleanGetRequest, finalResponse.clone());
                        } catch (cacheErr) {
                            console.warn("[Vloitz Cache] No se pudo auto-guardar el fragmento R2 al vuelo:", cacheErr);
                        }

                        return finalResponse;
                    } else {
                        // 4. Fallback de Seguridad: Si da 404 el .enc, pedimos el original y lo devolvemos INTACTO
                        console.warn(`%c[Vloitz Crypto] ⚠️ Archivo blindado no encontrado. Usando original: ${fileName}`, "color: #ffb703; font-weight: bold;");
                        return fetch(e.request);
                    }
                } catch (err) {
                    console.error("[Vloitz Crypto] Fallo crítico de red. Activando puente de emergencia al original.", err);
                    return fetch(e.request);
                }
            }()
        );
        return;
    }
    // --- FIN: INTERCEPTOR DE BÓVEDA TÁCTICA ---

    // --- INICIO: INTERCEPTOR DE BÓVEDA HF (Fragmentos .m4s) ---
    // Solo interceptamos si es un pedacito de audio y viene de nuestros Workers (Túneles HF)
    if (e.request.url.includes('workers.dev') && e.request.url.includes('.m4s')) {
        e.respondWith(
            async function() {
                try {
                    // EVOLUCIÓN iOS: Si es iPhone, NO leemos el disco para evitar asfixia en 2do plano
                    if (!isIOSDevice) {
                        const cachedResponse = await getFragmentFromDB(e.request.url);
                        if (cachedResponse) {
                            return cachedResponse; // ¡Hit instantáneo! Ahorro de red al 100%
                        }
                    }

                    // 2. Construir la ruta hacia la bóveda encriptada
                    // De: .../JRG004/seg-1.m4s  ->  A: .../JRG004/v-enc/seg-1.m4s.enc
                    const originalUrl = new URL(e.request.url);
                    const pathParts = originalUrl.pathname.split('/');
                    const fileName = pathParts.pop(); // ej. "seg-1.m4s"
                    const setId = pathParts.pop(); // ej. "JRG004"

                    const encUrl = `${originalUrl.origin}/${setId}/v-enc/${fileName}.enc`;

                    // 3. Descargar el fragmento blindado a través del Proxy
                    const encResponse = await fetch(encUrl);

                    // Salvavidas: Si el .enc no existe (migración incompleta), usamos el original
                    if (!encResponse.ok) {
                        console.warn(`[HF Blindaje] ⚠️ Archivo blindado no encontrado, usando original: ${fileName}`);
                        const fallbackResponse = await fetch(e.request.url);
                        if (fallbackResponse.ok && !isIOSDevice) {
                            const fallbackBlob = await fallbackResponse.clone().blob();
                            saveFragmentToDB(e.request.url, fallbackBlob); // Guardamos en DB
                        }
                        return fallbackResponse;
                    }

                    // 4. Desencriptar al vuelo en la memoria del dispositivo (La Caja Negra)
                    const encryptedBuffer = await encResponse.arrayBuffer();
                    const decryptedBuffer = decryptBuffer(encryptedBuffer);
                    const rawBlob = new Blob([decryptedBuffer], {
                        type: 'video/iso.segment'
                    });

                    // 5. Guardar el archivo LIMPIO en IndexedDB para futuras reproducciones (Excepto en iOS)
                    if (!isIOSDevice) {
                        saveFragmentToDB(e.request.url, rawBlob);
                    }

                    // 6. Inyectar el audio puro al reproductor HLS
                    return new Response(rawBlob, {
                        headers: {
                            'Content-Type': 'video/iso.segment'
                        }
                    });

                } catch (error) {
                    console.error('[HF Vault] ❌ Error crítico de red o desencriptación:', error);
                    // Último recurso: intentar el original si todo falla
                    return fetch(e.request);
                }
            }()
        );
        return;
    }
    // --- FIN: INTERCEPTOR DE BÓVEDA HF ---

    // --- INICIO: INTERCEPTOR DE PICOS (LCP 0ms Fix) ---
    // Intercepta los archivos .json de la forma de onda para servirlos desde la RAM en visitas futuras.
    if (e.request.url.includes('/peaks/') && e.request.url.includes('.json')) {
        e.respondWith(
            caches.match(e.request).then((cachedResponse) => {
                if (cachedResponse) {
                    // Hit: Entregamos el archivo en milisegundos desde el disco/RAM
                    console.log(`%c[Service Worker] ⚡ Hit Caché de Picos (LCP 0ms): ${e.request.url.split('/').pop()}`, "color: #00FF00; font-size: 10px;");
                    return cachedResponse;
                }

                // Miss: Lo descargamos de la red y lo clonamos en la caché para la próxima vez
                return fetch(e.request).then(async (networkResponse) => {
                    if (networkResponse.ok) {
                        const cache = await caches.open(CACHE_NAME);
                        cache.put(e.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch((err) => {
                    console.warn('[Service Worker] ⚠️ Fallo al cargar picos de red:', err);
                    throw err;
                });
            })
        );
        return; // Interrupción temprana para no pasar a las reglas de abajo
    }
    // --- FIN: INTERCEPTOR DE PICOS ---

    // EXCEPCIÓN: No cachear los archivos de audio gigantes (FLAC) automáticamente
    // Dejamos que el navegador maneje el streaming para no llenar la memoria del usuario
    if (e.request.url.includes('.flac') || e.request.url.includes('media.githubusercontent.com')) {
        return;
    }

    // EXCEPCIÓN: Ignorar peticiones a Google Apps Script para evitar falsos "Miss Caché" y bloqueos
    if (e.request.url.includes('script.google.com')) {
        return;
    }

    // 🛡️ FIX DE ACTUALIZACIÓN: No ignorar el query param en HTML y JS.
    // Esto permite que el ?updated= y el ?v=39.x fuercen la descarga de la versión nueva.
    const isCriticalAsset = e.request.url.includes('.html') ||
        e.request.url.includes('/share/') ||
        e.request.url.includes('.js') ||
        e.request.url.includes('.css') ||
        e.request.mode === 'navigate';

    e.respondWith(
        caches.match(e.request, {
            ignoreSearch: !isCriticalAsset // Solo ignora el search en imágenes, fuentes, etc.
        }).then((response) => {
            if (!response) {
                console.warn(`[Service Worker] ⚠️ Miss Caché (undefined) en recarga: ${e.request.url}`);
            }
            // Si está en caché, lo devolvemos. Si no, intentamos la red con un escudo catch defensivo.
            return response || fetch(e.request).catch(async (err) => {
                console.warn(`[Service Worker] 🛡️ Fallo de red recuperado silenciosamente para: ${e.request.url}`);

                // Si es una petición de navegación (ej. recargar una ruta /share/),
                // devolvemos el index.html principal para mantener viva la SPA sin romper la consola.
                if (e.request.mode === 'navigate') {
                    const cachedFallback = await caches.match('/index.html');
                    if (cachedFallback) return cachedFallback;
                }

                // Respuesta de emergencia neutral para recursos secundarios fallidos por red
                return new Response('Network fallback error', {
                    status: 408,
                    headers: {
                        'Content-Type': 'text/plain'
                    }
                });
            });
        })
    );
});