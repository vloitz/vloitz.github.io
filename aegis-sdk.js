import loadAegisEngine from './bin/aegis_engine.js';

// ============================================================
// 🛡️ AEGIS DEBUG MODE (Fase 0 — Diagnóstico de rendimiento)
// ============================================================
// Activo SOLO si ?aegis_debug=1 en URL o localStorage.aegis_debug === '1'.
// En producción normal: cero overhead, cero marcas ejecutadas, cero wrapping.
// Reporta en consola el desglose de tiempos de init() + Wasm APIs.
// ============================================================
const AEGIS_DEBUG = (() => {
    try {
        return new URLSearchParams(location.search).has('aegis_debug')
            || localStorage.getItem('aegis_debug') === '1';
    } catch (_) {
        return false;
    }
})();

function aegisDebugMark(name) {
    if (!AEGIS_DEBUG) return;
    try { performance.mark('aegis:' + name); } catch (_) {}
}

function aegisDebugMeasure(name, startMark, endMark) {
    if (!AEGIS_DEBUG) return null;
    try {
        performance.measure('aegis:' + name, 'aegis:' + startMark, 'aegis:' + endMark);
        const entries = performance.getEntriesByName('aegis:' + name, 'measure');
        return entries[entries.length - 1] ? entries[entries.length - 1].duration : null;
    } catch (_) {
        return null;
    }
}

const aegisDebugData = {
    fetch_wasm: null,
    instantiateStreaming: null,
    instantiate: null,
    compileStreaming: null,
    compile: null,
    apiCalled: []
};

function aegisDebugWrapWasmAPIs() {
    if (!AEGIS_DEBUG) return function noop() {};
    const originals = {
        fetch: window.fetch,
        instantiateStreaming: WebAssembly.instantiateStreaming,
        instantiate: WebAssembly.instantiate,
        compileStreaming: WebAssembly.compileStreaming,
        compile: WebAssembly.compile,
    };
    window.fetch = function() {
        const args = Array.prototype.slice.call(arguments);
        const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';
        if (url.indexOf('.wasm') === -1) return originals.fetch.apply(this, args);
        const t0 = performance.now();
        return originals.fetch.apply(this, args).then(function(res) {
            aegisDebugData.fetch_wasm = performance.now() - t0;
            return res;
        });
    };
    if (originals.instantiateStreaming) {
        WebAssembly.instantiateStreaming = function() {
            const args = Array.prototype.slice.call(arguments);
            const t0 = performance.now();
            aegisDebugData.apiCalled.push('instantiateStreaming');
            return originals.instantiateStreaming.apply(this, args).finally(function() {
                aegisDebugData.instantiateStreaming = performance.now() - t0;
            });
        };
    }
    if (originals.instantiate) {
        WebAssembly.instantiate = function() {
            const args = Array.prototype.slice.call(arguments);
            const t0 = performance.now();
            aegisDebugData.apiCalled.push('instantiate');
            return originals.instantiate.apply(this, args).finally(function() {
                aegisDebugData.instantiate = performance.now() - t0;
            });
        };
    }
    if (originals.compileStreaming) {
        WebAssembly.compileStreaming = function() {
            const args = Array.prototype.slice.call(arguments);
            const t0 = performance.now();
            aegisDebugData.apiCalled.push('compileStreaming');
            return originals.compileStreaming.apply(this, args).finally(function() {
                aegisDebugData.compileStreaming = performance.now() - t0;
            });
        };
    }
    if (originals.compile) {
        WebAssembly.compile = function() {
            const args = Array.prototype.slice.call(arguments);
            const t0 = performance.now();
            aegisDebugData.apiCalled.push('compile');
            return originals.compile.apply(this, args).finally(function() {
                aegisDebugData.compile = performance.now() - t0;
            });
        };
    }
    return function restore() {
        window.fetch = originals.fetch;
        WebAssembly.instantiateStreaming = originals.instantiateStreaming;
        WebAssembly.instantiate = originals.instantiate;
        WebAssembly.compileStreaming = originals.compileStreaming;
        WebAssembly.compile = originals.compile;
    };
}

function aegisDebugReport() {
    if (!AEGIS_DEBUG) return;
    const fmt = function(n) { return (n === null || n === undefined) ? '—' : n.toFixed(0) + ' ms'; };
    const total = aegisDebugMeasure('total', 'init:start', 'ready:resolved');
    const preload = aegisDebugMeasure('preload', 'init:start', 'engine:load:start');
    const engineLoad = aegisDebugMeasure('engine_load', 'engine:load:start', 'engine:load:end');
    const postEngine = aegisDebugMeasure('post_engine', 'engine:load:end', 'ready:resolved');
    const lines = [
        '╔══════════════════════════════════════════════════════╗',
        '║  🛡️ AEGIS DEBUG REPORT (Fase 0 — baseline)           ║',
        '╠══════════════════════════════════════════════════════╣',
        '║  Total (init → ready):   ' + fmt(total).padEnd(28) + '║',
        '║  ├─ Preload + setup:     ' + fmt(preload).padEnd(28) + '║',
        '║  ├─ Engine load (glue):  ' + fmt(engineLoad).padEnd(28) + '║',
        '║  │   ├─ fetch(wasm):     ' + fmt(aegisDebugData.fetch_wasm).padEnd(28) + '║',
        '║  │   ├─ instStreaming:   ' + fmt(aegisDebugData.instantiateStreaming).padEnd(28) + '║',
        '║  │   ├─ instantiate:     ' + fmt(aegisDebugData.instantiate).padEnd(28) + '║',
        '║  │   ├─ compileStream:   ' + fmt(aegisDebugData.compileStreaming).padEnd(28) + '║',
        '║  │   └─ compile:         ' + fmt(aegisDebugData.compile).padEnd(28) + '║',
        '║  └─ Post-engine (run):   ' + fmt(postEngine).padEnd(28) + '║',
        '╠══════════════════════════════════════════════════════╣',
        '║  APIs Wasm llamadas:     ' + (aegisDebugData.apiCalled.join(', ') || '—').slice(0,28).padEnd(28) + '║',
        '║  Modo:                   baseline v3.4.1              ║',
        '╚══════════════════════════════════════════════════════╝'
    ];
    console.log('
' + lines.join('
') + '
');
    if (total && total > 10000) {
        console.warn('[Aegis Debug] ⚠️ Total > 10s. El freeze es significativo. Revisar desglose.');
    }
    window.__aegisDebug = {
        total: total,
        preload: preload,
        engineLoad: engineLoad,
        postEngine: postEngine,
        fetch_wasm: aegisDebugData.fetch_wasm,
        instantiateStreaming: aegisDebugData.instantiateStreaming,
        instantiate: aegisDebugData.instantiate,
        compileStreaming: aegisDebugData.compileStreaming,
        compile: aegisDebugData.compile,
        apiCalled: aegisDebugData.apiCalled.slice(),
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
    };
}

class AegisShield {
    constructor() {
        this.engine = null;
        // 🚀 AUTO-PRELOAD UNIVERSAL: Inyecta el preload en el <head> si no existe
        if (!document.querySelector('link[href*="aegis_engine.wasm"]')) {
            const preloadWasm = document.createElement('link');
            preloadWasm.rel = 'preload';
            preloadWasm.href = '/bin/aegis_engine.wasm?v=742784';
            preloadWasm.as = 'fetch';
            preloadWasm.type = 'application/wasm';
            preloadWasm.crossOrigin = 'anonymous';
            document.head.appendChild(preloadWasm);
        }
        aegisDebugMark('init:start');
        this.ready = this.init();

        // 🚀 NOTIFICAR AL CENTINELA CUANDO EL MOTOR ESTÉ LISTO
        this.ready.then(() => {
            aegisDebugMark('ready:resolved');
            aegisDebugReport();
            window.dispatchEvent(new Event('aegis-ready'));
        });

    }

    async init() {
        console.log("[🛡️ AegisWasm] Inicializando bóveda asíncrona...");
        aegisDebugMark('engine:load:start');
        const _aegisDebugRestoreAPIs = aegisDebugWrapWasmAPIs();
        // 🚀 MAGIA UNIVERSAL DEFINITIVA: Ruta absoluta a la carpeta /bin/
        this.engine = await loadAegisEngine({
            locateFile: (path) => {
                if (path.includes('.wasm')) {
                    return '/bin/' + path + '?v=742784';
                }
                return path;
            }
        });
        aegisDebugMark('engine:load:end');
        _aegisDebugRestoreAPIs();
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

    // 🚀 PATRÓN CENTINELA: Inyección atómica desde el sentinel (defer nativo)
    async executeTargetPayload(filename) {
        const code = await this._getRawAsset(filename);
        if (!code) {
            console.error('[🛡️ AegisWasm] Payload no encontrado:', filename);
            return;
        }

        const script = document.createElement('script');

        const isESModule = /(^|\n)\s*(import|export)\s/.test(code);
        if (isESModule) {
            script.type = 'module';
        }

        let wrappedCode = code;

        // 🚀 SHIM DE SINCRONIZACIÓN: Como el Centinela es asíncrono (await Wasm),
        // es posible que el DOMContentLoaded ya se haya disparado.
        // Este shim garantiza que el código de inicialización se ejecute de todos modos.
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
        console.log('[🛡️ AegisWasm] Payload ejecutado desde Centinela: ' + filename);
    }

    // Método legacy para compatibilidad con micro-stubs
    async injectScript(filename, isModule = false) {
        return this.executeTargetPayload(filename);
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