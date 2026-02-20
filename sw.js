const CACHE_NAME = 'vloitz-app-v6';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './sets.json',
  './favicon/favicon.ico',
  'https://unpkg.com/wavesurfer.js@7.7.5/dist/wavesurfer.min.js',
  'https://unpkg.com/wavesurfer.js@7.7.5/dist/plugins/regions.min.js'
];

// --- INICIO: MOTOR DE BASE DE DATOS (VLOITZ VAULT DB) ---
const DB_NAME = 'vloitz_vault_db';
const STORE_NAME = 'audio_fragments';
const DB_VERSION = 1;

let performanceTier = 'ALTA/PC';
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

    // Se ejecuta si es la primera vez o si cambiamos la versión
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      // Creamos el "almacén" si no existe.
      // Usamos 'url' como llave única para cada fragmento de audio.
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: 'url'
        });
        console.log('[Vloitz DB] 🏗️ Almacén de fragmentos creado exitosamente.');
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
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
                const cursorRequest = store.openCursor();
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

// --- INICIO: RECEPTOR DE CONFIGURACIÓN (OÍDO DEL ESCUDO) ---
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CONFIG_HARDWARE') {
    performanceTier = event.data.tier;
    cacheLimit = TIER_LIMITS[performanceTier] || 200;

    console.log(
      `%c[Vloitz Cache] 🧠 Escudo Adaptativo: Nivel ${performanceTier} detectado. Límite de seguridad: ${cacheLimit} fragmentos.`,
      "background: #121212; color: #FF00FF; font-weight: bold; padding: 2px 4px; border: 1px solid #FF00FF; border-radius: 3px;"
    );
  }
});
// --- FIN: RECEPTOR DE CONFIGURACIÓN ---

// 1. INSTALACIÓN: Guardamos la interfaz en el caché
self.addEventListener('install', (e) => {
  console.log('[Service Worker] Instalando caché de interfaz...');
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. ACTIVACIÓN: Limpiamos versiones viejas si actualizas la web
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }));
    })
  );
});

// 3. INTERCEPTACIÓN: Si piden algo, miramos el caché primero
self.addEventListener('fetch', (e) => {

  // --- INICIO: INTERCEPTOR DE BÓVEDA HF (Fragmentos .m4s) ---
  // Solo interceptamos si es un pedacito de audio y viene de nuestros Workers (Túneles HF)
  if (e.request.url.includes('.m4s') && e.request.url.includes('workers.dev')) {
    e.respondWith(
      async function () {
        // 1. Buscamos en el disco duro del teléfono (IndexedDB)
        const cachedResponse = await getFragmentFromDB(e.request.url);
        if (cachedResponse) {
          return cachedResponse; // ¡Hit instantáneo! Ahorro de red al 100%
        }

        // 2. Si no está en el disco, lo descargamos de internet (Túnel Worker)
        try {
          const networkResponse = await fetch(e.request);

          // Solo guardamos si la descarga fue exitosa (Estado 200)
          if (networkResponse.ok) {
            // Clonamos la respuesta porque el archivo binario solo se puede leer una vez
            const responseClone = networkResponse.clone();
            const blob = await responseClone.blob();

            // Guardamos en segundo plano (no detiene la música)
            saveFragmentToDB(e.request.url, blob);
          }

          return networkResponse; // Entregamos la música al reproductor
        } catch (error) {
          console.error('[Vloitz Cache] ❌ Error de red al buscar fragmento:', error);
          throw error;
        }
      }()
    );
    return; // Salimos aquí para que no se ejecute tu caché de interfaz (código de abajo)
  }
  // --- FIN: INTERCEPTOR DE BÓVEDA HF ---


  // EXCEPCIÓN: No cachear los archivos de audio gigantes (FLAC) automáticamente
  // Dejamos que el navegador maneje el streaming para no llenar la memoria del usuario
  if (e.request.url.includes('.flac') || e.request.url.includes('media.githubusercontent.com')) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((response) => {
      // Si está en caché, lo devolvemos (Carga Instantánea)
      // Si no, lo pedimos a internet
      return response || fetch(e.request);
    })
  );
});