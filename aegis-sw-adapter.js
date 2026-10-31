// ============================================================================
// 🛡️ AegisWasm - Adapter Pattern (Auto-Generado por el Compilador)
// ============================================================================
self.AegisAdapter = (function() {
    let manifest = null;
    const AEGIS_VAULT = 'aegis-engine-vault';
    const wasmVersionUrl = '/bin/aegis_engine.wasm?v=130671';

    // 🚀 FIX v3.2: cacheWasm() ELIMINADO.
    // Motivo: cacheWasm() ejecuta un fetch + put en background que compite
    // con el cache.match() del SDK en el Cache API, causando que el hit
    // se bloquee hasta 13+ segundos cuando el .wasm ya estaba en caché.
    // El cacheo ahora se hace en el handler de .wasm (store-on-miss, ver abajo).

    // ⏳ Promesa única de carga
    const manifestReady = fetch('/aegis.manifest.json', { cache: 'no-store' })
        .then(res => res.json())
        .then(data => { manifest = data; return data; })
        .catch(err => { console.error('[🛡️ Aegis] Error cargando manifiesto:', err); return null; });

    // 🚀 FIX UNIVERSAL v3.3: Caché en RAM (Bypassea el bloqueo del Cache API)
    // Si el proyecto anfitrión (ej. Vloitz) satura el Cache API, Aegis no sufrirá.
    let aegisWasmMemoryBuffer = null;

    // ═══════════════════════════════════════════════════════════════════════
    // REGISTRO DE ALGORITMOS DE DESCIFRADO
    // ═══════════════════════════════════════════════════════════════════════
    const CRYPTO_ENGINES = {
        'xor-multibyte': function(data, cfg) {
            const keyBytes = new TextEncoder().encode(cfg.key_utf8);
            const limit = Math.min(cfg.bytes_to_decrypt || data.length, data.length);
            for (let i = 0; i < limit; i++) {
                data[i] ^= keyBytes[i % keyBytes.length];
            }
            return data;
        },
        'xor-single': function(data, cfg) {
            const limit = Math.min(cfg.bytes_to_decrypt || data.length, data.length);
            const k = cfg.key_byte;
            for (let i = 0; i < limit; i++) data[i] ^= k;
            return data;
        },
        'identity': function(data) {
            return data;
        }
    };

    return {
        handle: function(event) {
            const url = new URL(event.request.url);
            if (event.request.method !== 'GET' || !url.protocol.startsWith('http')) {
                return false;
            }

            // 🚀 AUTO-SERVICIO DESDE LA BÓVEDA PARA EL WASM (Evita el parpadeo de las palmeras)
            if (url.pathname.includes('aegis_engine.wasm')) {
                event.respondWith((async () => {
                    // 1. ⚡ RAM HIT (Inmune al bloqueo del Cache API)
                    // Si otro script de la web está saturando el disco, nosotros respondemos desde RAM.
                    if (aegisWasmMemoryBuffer) {
                        return new Response(aegisWasmMemoryBuffer, {
                            headers: { 'Content-Type': 'application/wasm' }
                        });
                    }

                    // 2. CACHE API HIT (Fallback si la RAM está vacía, ej. tras reiniciar el SW)
                    const cache = await caches.open(AEGIS_VAULT);
                    const cached = await cache.match(event.request);
                    if (cached) {
                        // Poblamos la RAM para la próxima petición
                        aegisWasmMemoryBuffer = await cached.clone().arrayBuffer();
                        return cached;
                    }

                    // 3. NETWORK MISS (Se descarga y se guarda en RAM + Cache API)
                    const response = await fetch(event.request);
                    if (response.ok) {
                        const clone = response.clone();
                        const buffer = await clone.arrayBuffer();
                        aegisWasmMemoryBuffer = buffer; // Guardar en RAM
                        try {
                            await cache.put(event.request, new Response(buffer, {
                                headers: { 'Content-Type': 'application/wasm' }
                            })); // Guardar en Disco
                        } catch (cacheErr) {
                            console.warn('[Aegis Adapter] cache.put falló (no crítico):', cacheErr);
                        }
                    }
                    return response;
                })());
                return true;
            }

            // 🛑 FIX MAESTRO: Si el usuario borró el routing, Aegis NO debe interceptar .m4s
            // Esto permite que el VloitzNetworkCore (o el sw.js nativo) maneje el audio.
            const hasRouting = false;
            if (!hasRouting) {
                return false; // Ignoramos el audio. Vloitz toma el control total.
            }

            // El adapter solo maneja segmentos de audio remotos.
            if (!url.pathname.endsWith('.m4s')) {
                return false;
            }

            event.respondWith((async () => {
                await manifestReady;

                // ── Segmento de audio remoto → Descifrado al vuelo ──
                if (manifest && manifest.routing) {
                    const rule = manifest.routing.find(r =>
                        url.hostname.includes(r.match_hostname) && new RegExp(r.match_path).test(url.pathname)
                    );
                    if (!rule) return fetch(event.request);
                    const pathParts = url.pathname.split('/');
                    const fileName = pathParts.pop();
                    const newPath = pathParts.join('/') + rule.transform + fileName + '.enc';
                    const encUrl = url.origin + newPath;
                    try {
                        const encResponse = await fetch(encUrl);
                        if (!encResponse.ok) return fetch(event.request);
                        const buffer = await encResponse.arrayBuffer();
                        const cryptoCfg = rule.crypto || { algorithm: 'identity' };
                        const engine = CRYPTO_ENGINES[cryptoCfg.algorithm];
                        if (!engine) {
                            console.warn('[🛡️ Aegis] Algoritmo no registrado:', cryptoCfg.algorithm, '- passthrough forzado.');
                            return fetch(event.request);
                        }
                        const decryptedData = engine(new Uint8Array(buffer), cryptoCfg);
                        return new Response(decryptedData.buffer, {
                            status: 200,
                            headers: { 'Content-Type': 'video/iso.segment' }
                        });
                    } catch (err) { return fetch(event.request); }
                }

                // Fallback neutro
                return fetch(event.request);
            })());

            return true;
        }
    };
})();