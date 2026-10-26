import loadAegisEngine from './bin/aegis_engine.js';

class AegisShield {
    constructor() {
        this.engine = null;
        // 🚀 AUTO-PRELOAD UNIVERSAL: Inyecta el preload en el <head> si no existe
        if (!document.querySelector('link[href*="aegis_engine.wasm"]')) {
            const preloadWasm = document.createElement('link');
            preloadWasm.rel = 'preload';
            preloadWasm.href = '/bin/aegis_engine.wasm?v=808531';
            preloadWasm.as = 'fetch';
            preloadWasm.type = 'application/wasm';
            preloadWasm.crossOrigin = 'anonymous';
            document.head.appendChild(preloadWasm);
        }
        this.ready = this.init();
    }

    async init() {
        console.log("[🛡️ AegisWasm] Inicializando bóveda asíncrona...");
        // 🚀 MAGIA UNIVERSAL DEFINITIVA: Ruta absoluta a la carpeta /bin/
        this.engine = await loadAegisEngine({
            locateFile: (path) => {
                if (path.includes('.wasm')) {
                    return '/bin/' + path + '?v=808531';
                }
                return path;
            }
        });
        this._manifestCache = null;
        this._installWorkerInterceptor();
        console.log("[🛡️ AegisWasm] Motor en línea. Listo para servir activos.");
    }

    async _loadManifest() {
        if (this._manifestCache) return this._manifestCache;
        try {
            const res = await fetch('/aegis.manifest.json', { cache: 'no-store' });
            this._manifestCache = await res.json();
        } catch (e) {
            console.warn('[🛡️ AegisWasm] No se pudo cargar el manifest:', e);
            this._manifestCache = { local_workers: [] };
        }
        return this._manifestCache;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Fase 3.2: Interceptor de window.Worker.
    // Cuando el código de usuario crea un Worker apuntando a un archivo
    // protegido (ej. story-worker.js), devolvemos un Proxy que:
    //   1. Evalúa si el archivo está en manifest.local_workers.
    //   2. Si sí: descifra desde la bóveda y crea un Blob Worker transparente.
    //   3. Si no: delega al Worker original sin tocar nada.
    // Encapsula los mensajes y listeners hasta que el Worker real está listo.
    // ═══════════════════════════════════════════════════════════════════════
    _installWorkerInterceptor() {
        const self_ = this;
        const OriginalWorker = window.Worker;
        if (!OriginalWorker || OriginalWorker.__aegisWrapped) return;

        function AegisWorker(url, options) {
            if (typeof url !== 'string') return new OriginalWorker(url, options);

            const basename = url.split('/').pop().split('?')[0].split('#')[0];

            const state = {
                realWorker: null,
                pendingMessages: [],
                listeners: [],
                onmessage: null,
                onerror: null,
                onmessageerror: null
            };

            self_._loadManifest().then(manifest => {
                const isProtected = manifest.local_workers &&
                    manifest.local_workers.some(w => w.filename === basename);

                const finalize = (real) => {
                    state.realWorker = real;
                    state.listeners.forEach(([t, f, o]) => real.addEventListener(t, f, o));
                    if (state.onmessage) real.onmessage = state.onmessage;
                    if (state.onerror) real.onerror = state.onerror;
                    if (state.onmessageerror) real.onmessageerror = state.onmessageerror;
                    state.pendingMessages.forEach(([m, tr]) => real.postMessage(m, tr));
                    state.pendingMessages.length = 0;
                };

                if (!isProtected) {
                    finalize(new OriginalWorker(url, options));
                    return;
                }

                self_._getRawAsset(basename).then(code => {
                    if (!code) {
                        console.error('[🛡️ AegisWasm] Worker no encontrado en bóveda:', basename);
                        return;
                    }
                    const blob = new Blob([code], { type: 'application/javascript' });
                    const blobUrl = URL.createObjectURL(blob);
                    const realOpts = options || { type: 'module' };
                    finalize(new OriginalWorker(blobUrl, realOpts));
                    console.log('[🛡️ AegisWasm] Worker protegido instanciado desde bóveda: ' + basename);
                });
            });

            return new Proxy({}, {
                get(_, prop) {
                    if (prop === 'postMessage') {
                        return (msg, tr) => {
                            if (state.realWorker) return state.realWorker.postMessage(msg, tr);
                            state.pendingMessages.push([msg, tr]);
                        };
                    }
                    if (prop === 'terminate') {
                        return () => state.realWorker && state.realWorker.terminate();
                    }
                    if (prop === 'addEventListener') {
                        return (t, f, o) => {
                            state.listeners.push([t, f, o]);
                            if (state.realWorker) state.realWorker.addEventListener(t, f, o);
                        };
                    }
                    if (prop === 'removeEventListener') {
                        return (t, f, o) => {
                            state.listeners = state.listeners.filter(
                                ([tt, ff, oo]) => tt !== t || ff !== f || oo !== o
                            );
                            if (state.realWorker) state.realWorker.removeEventListener(t, f, o);
                        };
                    }
                    if (prop === 'onmessage') return state.onmessage;
                    if (prop === 'onerror') return state.onerror;
                    if (prop === 'onmessageerror') return state.onmessageerror;
                    if (state.realWorker) return state.realWorker[prop];
                    return undefined;
                },
                set(_, prop, value) {
                    if (prop === 'onmessage') { state.onmessage = value; if (state.realWorker) state.realWorker.onmessage = value; return true; }
                    if (prop === 'onerror') { state.onerror = value; if (state.realWorker) state.realWorker.onerror = value; return true; }
                    if (prop === 'onmessageerror') { state.onmessageerror = value; if (state.realWorker) state.realWorker.onmessageerror = value; return true; }
                    if (state.realWorker) state.realWorker[prop] = value;
                    return true;
                }
            });
        }

        AegisWorker.prototype = OriginalWorker.prototype;
        AegisWorker.__aegisWrapped = true;
        window.Worker = AegisWorker;
        console.log('[🛡️ AegisWasm] Interceptor de Worker instalado.');
    }

    async _getRawAsset(filename) {
        await this.ready;
        const scriptPtr = this.engine.ccall('get_secure_asset', 'number', ['string'], [filename]);
        if (!scriptPtr) {
            console.error('[🛡️ AegisWasm] Asset no encontrado en bóveda: ' + filename);
            return null;
        }
        const rawCode = this.engine.UTF8ToString(scriptPtr);
        this.engine.ccall('free_secure_asset', null, ['number'], [scriptPtr]);
        return rawCode;
    }

    async injectScript(filename, isModule = false) {
        const code = await this._getRawAsset(filename);
        if (!code) return;

        const script = document.createElement('script');

        // 🚀 SMART MODULE DETECTION: Si el código tiene imports o exports, forzamos type="module"
        const isESModule = isModule || /(^|\n)\s*(import|export)\s/.test(code);
        if (isESModule) {
            script.type = 'module';
        }

        // 🔑 FIX UNIVERSAL: Forzar orden de ejecución (equivalente a defer nativo)
        script.async = false;

        // 🚀 SOLUCIÓN DEFINITIVA: Esperar a que la página esté 100% cargada.
        // window.load se dispara después de que TODOS los CDNs y scripts defer hayan terminado.
        if (document.readyState !== 'complete') {
            await new Promise(resolve => {
                window.addEventListener('load', resolve, { once: true });
            });
        }

        let wrappedCode = code;

        // 🚀 SHIM RESTAURADO: Si la página ya cargó, forzamos el evento DOMContentLoaded
        // para que el listener de app.js se ejecute (ya que el evento nativo ya pasó).
        if (document.readyState !== 'loading') {
            wrappedCode = '(function(){' +
                'var _origAdd = document.addEventListener;' +
                'document.addEventListener = function(type, listener, opts){' +
                    'if (type === "DOMContentLoaded") {' +
                        'setTimeout(function() {' +
                            'try { listener.call(document, new Event("DOMContentLoaded")); } catch(e) { console.error(e); }' +
                        '}, 10);' +
                    '} else {' +
                        'return _origAdd.call(document, type, listener, opts);' +
                    '}' +
                '};' +
                'setTimeout(function(){ document.addEventListener = _origAdd; }, 0);' +
            '})();' + '\n' + code;
        }

        script.textContent = wrappedCode;
        document.head.appendChild(script);
        console.log('[🛡️ AegisWasm] Inyección fantasma completada: ' + filename);
    }

    async createSecureWorker(filename) {
        const code = await this._getRawAsset(filename);
        if (!code) return null;
        const blob = new Blob([code], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        console.log('[🛡️ AegisWasm] Hilo Worker seguro creado: ' + filename);
        return new Worker(workerUrl, { type: 'module' });
    }
}

export const Aegis = new AegisShield();
window.Aegis = Aegis;