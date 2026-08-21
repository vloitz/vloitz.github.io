// -------------------------------------------------------------------------
// VLOITZ PANEL MAESTRO VISUAL (FEATURE FLAGS)
// -------------------------------------------------------------------------
const PORTADA_VISUAL_BETA = {
    master_switch: true, // Apaga TODO con un solo clic si es false
    enable_mobile: true, // Activo para móviles (<= 768px)
    enable_desktop: false, // Apagado para PC por ahora
    mobile_theme: 'deep_tech', // Tema visual para móvil
    desktop_theme: 'nebula' // Tema visual para PC (Futuro)
};

const VLOITZ_UI_FLAGS = {
    showFavoritesMarker: true, // <-- MÓDULO BETA: Master Switch
    neonColoredMarkers: true // <-- TRUE = Neón Dinámico | FALSE = Línea Negra Clásica
};

// -------------------------------------------------------------------------
// VLOITZ HYBRID AUDIO ENGINE v1.0
// -------------------------------------------------------------------------
// © 2025 Kevin Italo Cajaleon Zuta (Vloitz). Todos los derechos reservados.
//
// Arquitectura propietaria de renderizado híbrido (Client-Server) para
// generar video MP4/AAC nativo en dispositivos Android de gama baja.
// -------------------------------------------------------------------------

console.log("2026-02-20_091741");
console.log(
    "%c VLOITZ ENGINE %c v1.0 (Stable) \n%c by Kevin Italo Cajaleon Zuta ",
    "background: #1DB954; color: #000; font-weight: bold; padding: 4px; border-radius: 3px;",
    "color: #1DB954; font-weight: bold;",
    "color: #b3b3b3; font-size: 11px;"
);
console.log("%c 🚀 Arquitectura: WebM Nativo + Sync-Lock + Cloud Transcoding", "color: #888; font-style: italic;");
console.log("%c 🔒 Tecnología desarrollada en Lima, Perú. Ingeniería inversa prohibida.", "color: #ff5555; font-size: 10px;");


document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM listo. Iniciando aplicación..."); // LOG INICIAL

    // =================================================================
    // 🌐 MOTOR BILINGÜE GLOBAL (VLOITZ ENGINE)
    // =================================================================
    const userLangGlobal = navigator.language || navigator.userLanguage;
    window.isSpanishGlobal = userLangGlobal.toLowerCase().includes('es');

    // DICCIONARIO INGLÉS (Manteniendo etiquetas HTML clave como <b> y <span>)
    const globalDictEN = {
        bioRole: "Developer & Music Curator",
        bioText: "Isolate the essential. Explore the authentic. <span class='flac-text'>FLAC</span> audio, immersive rhythms, and mixes that pull you out of the present. Nothing here is casual.",
        bioCta: "Dive into the journey.",
        bioExtended: "<br><br>My work isn't just about playing music; it's <b>sonic architecture</b>. Each set starts long before the mix. Behind it are hours of exploration, discarding, and selecting until only the tracks that truly deserve to be part of the journey remain. I don't mix songs; I build experiences where every transition has a purpose.<br><br>The <b>FLAC (High Fidelity)</b> standard is non-negotiable in my workflow. It's not a technical label, but the guarantee that every detail reaches your ears intact. Deep bass, defined transients, and a fidelity that respects the original intention of each production, because quality is also part of the experience.<br><br>I don't look for followers; I look for people who value criteria over quantity. If you share this way of discovering music and appreciate a selection curated down to the last detail, you are in the right place. <b>Welcome to the process.</b>",
        latestSet: "LATEST SET"
    };

    // Traductor Automático Flash (Ejecución Inmediata)
    if (!window.isSpanishGlobal) {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (globalDictEN[key]) {
                el.innerHTML = globalDictEN[key]; // Cambia el texto al vuelo
            }
        });
    }
    // =================================================================

    // --- TEST FASE 2 ---
    // Esto debería leer 'null' ahora, o valores si cambias la URL manualmente
    setTimeout(() => {
        if (typeof URLController !== 'undefined') {
            URLController.getParams();
        }
    }, 1000);
    // -------------------

    // --- Referencias ---
    const waveformContainer = document.getElementById('waveform');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const playIcon = document.getElementById('playIcon'); // <-- NUEVO
    const pauseIcon = document.getElementById('pauseIcon'); // <-- NUEVO
    const currentTimeEl = document.getElementById('currentTime');
    const totalDurationEl = document.getElementById('totalDuration');
    const currentCoverArt = document.getElementById('current-cover-art');
    const currentTrackTitle = document.getElementById('current-track-title');
    const tracklistElement = document.getElementById('tracklist');
    const profilePicImg = document.getElementById('profile-pic-img');
    const profileBanner = document.querySelector('.profile-banner');
    const currentTracklistElement = document.getElementById('current-tracklist'); // Referencia al nuevo <ul>

    // Referencias para el "Latest Set" (prototipo v4)
    const latestSetTitle = document.getElementById('latest-set-title');
    const latestSetDate = document.getElementById('latest-set-date');
    // Referencia para el filtro de favoritos (prototipo v4)
    const favToggleCheckbox = document.getElementById('fav-toggle');

    // Referencias para la biografía (prototipo v5)
    const profileBioContainer = document.getElementById('profile-bio-container');
    const bioExtended = document.getElementById('bio-extended');
    const bioToggle = document.getElementById('bio-toggle');
    const autoLoopBtn = document.getElementById('autoLoopBtn');

    const spectrumBtn = document.getElementById('spectrumBtn');

    const prevBtn = document.getElementById('prevBtn'); // <-- AÑADE ESTA LÍNEA
    const nextBtn = document.getElementById('nextBtn'); // <-- AÑADE ESTA LÍNEA

    // --- Referencias para Seek Buttons ---
    const seekBackBtn = document.getElementById('seekBackBtn');
    const seekFwdBtn = document.getElementById('seekFwdBtn');


    let currentTrackNameForNotification = null;


    let allSets = [];
    let currentSetIndex = 0;
    let isAutoLoopActive = false;

    // Configuración Espectro (Fase 8)
    // Por defecto TRUE, a menos que el usuario lo haya desactivado antes
    let isSpectrumActive = localStorage.getItem('vloitz_spectrum') !== 'false';

    let isSeekingViaAutoLoop = false;
    let previousTimeForAutoLoop = -1; // <-- AÑADIR: Guarda el tiempo anterior

    // Cargar un OBJETO de favoritos (v2)
    let allFavorites = JSON.parse(localStorage.getItem('vloitz_favorites') || '{}'); // Reusamos la clave original
    let currentSetFavorites = new Set(); // Este 'Set' guardará los favoritos SÓLO del set actual
    console.log("[Fav PorSet] Datos maestros de favoritos cargados:", allFavorites); // LOG

    let currentLoadedSet = null; // Para saber qué set está cargado

    let globalPerformanceTier = 'ALTA/PC'; // Valor por defecto para el Preloader

    let wavesurfer = null; // Declarar wavesurfer aquí

    let wsRegions = null; // Referencia al plugin de regiones

    // --- NUBE (URL Oficial de Cloudflare R2) ---
    const CLOUDFLARE_R2_URL = 'https://pub-1bd5ca00f737488cae44be74016d8499.r2.dev';


    // --- INICIO: Módulo URLController (Fase 2 - Deep Linking) ---
    const URLController = (() => {
        // Función privada para leer parámetros
        const getParams = () => {
            const params = new URLSearchParams(window.location.search);
            let setId = params.get('set'); // captura ?set=...
            const timestamp = params.get('t'); // captura &t=...

            // NUEVO: Extraer ID de la ruta absoluta (ej. /share/GDL011/track-name/)
            const pathParts = window.location.pathname.split('/').filter(Boolean);
            if (pathParts[0] === 'share' && pathParts[1]) {
                setId = pathParts[1];
            }

            // Log de diagnóstico (Regla 5)
            console.log(`[URLController] Params detectados -> ID: ${setId}, Time: ${timestamp}`);

            return {
                setId: setId ? setId : null, // <--- CORREGIDO: Respeta mayúsculas/minúsculas exactas
                timestamp: timestamp ? parseInt(timestamp, 10) : null
            };
        };

        return {
            getParams: getParams
        };

    })();
    // --- FIN: Módulo URLController ---


    // --- INICIO: Módulo ShareController (Fase 5 - Bilingüe Senior) ---
    const ShareController = (() => {
        const modalOverlay = document.getElementById('share-modal-overlay');
        const closeBtn = document.getElementById('closeShareBtn');
        const urlInput = document.getElementById('shareUrlInput');
        const copyBtn = document.getElementById('copyShareUrlBtn');
        const timeCheckbox = document.getElementById('shareTimeCheckbox');
        const timeLabel = document.getElementById('shareTimeLabel');
        const shareBtn = document.getElementById('shareBtn');

        const intentRadios = document.querySelectorAll('input[name="shareIntent"]');
        const timeRow = document.getElementById('shareTimeRow');

        const waBtn = document.getElementById('shareWaBtn');
        const fbBtn = document.getElementById('shareFbBtn');
        const xBtn = document.getElementById('shareXBtn');

        // 🌐 MOTOR DE IDIOMAS (Diccionario)
        const userLang = navigator.language || navigator.userLanguage;
        const isSpanish = userLang.toLowerCase().includes('es');

        const dictEN = {
            shareTitle: "Share",
            currentTrack: "Current Track",
            fullSet: "Full Set",
            copyBtn: "Copy"
        };

        // 🧊 NUEVO: Variable para congelar la intención del usuario
        let frozenShareTime = 0;

        const init = () => {
            if (!shareBtn || !modalOverlay) return;

            // 1. Traducción Automática al vuelo (Solo si no es español)
            if (!isSpanish) {
                document.querySelectorAll('[data-i18n]').forEach(el => {
                    const key = el.getAttribute('data-i18n');
                    if (dictEN[key]) el.textContent = dictEN[key];
                });
            }

            shareBtn.addEventListener('click', openModal);
            closeBtn.addEventListener('click', closeModal);
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) closeModal();
            });
            timeCheckbox.addEventListener('change', updateUrl);
            intentRadios.forEach(radio => radio.addEventListener('change', updateUrl));
            copyBtn.addEventListener('click', copyToClipboard);
        };

        const openModal = () => {
            if (!currentLoadedSet || !wavesurfer) return;

            // 🧊 Congelamos el tiempo en el milisegundo exacto que se abre el modal
            frozenShareTime = wavesurfer.getCurrentTime();

            // Traducción del texto dinámico de tiempo
            const timePrefix = isSpanish ? "Iniciar en " : "Start at ";
            timeLabel.textContent = `${timePrefix}${formatTime(frozenShareTime)}`;

            timeCheckbox.checked = false;
            const trackRadio = document.getElementById('share-intent-track');
            if (trackRadio) trackRadio.checked = true;

            updateUrl();
            modalOverlay.style.display = 'flex';
        };

        const closeModal = () => {
            modalOverlay.style.display = 'none';
        };

        const updateUrl = () => {
            if (!currentLoadedSet || !wavesurfer) return;

            const slugify = (text) => text.toString().toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^\w\-]+/g, '')
                .replace(/\-\-+/g, '-')
                .replace(/^-+/, '').replace(/-+$/, '');

            const rootUrl = window.location.origin + '/';
            const cleanRoot = rootUrl.endsWith('/') ? rootUrl : rootUrl + '/';

            // 🧊 Usamos el tiempo congelado en lugar del tiempo en vivo del reproductor
            const currentTime = frozenShareTime;

            const selectedIntentElement = document.querySelector('input[name="shareIntent"]:checked');
            const selectedIntent = selectedIntentElement ? selectedIntentElement.value : 'track';

            let finalUrl = "";
            let currentTrackTitle = currentLoadedSet.title;

            if (selectedIntent === 'set') {
                if (timeRow) timeRow.style.display = 'none';
                finalUrl = `${cleanRoot}share/${currentLoadedSet.id}/`;
            } else {
                if (timeRow) timeRow.style.display = 'flex';
                let trackSlug = "";

                if (currentLoadedSet.tracklist) {
                    for (let i = currentLoadedSet.tracklist.length - 1; i >= 0; i--) {
                        const track = currentLoadedSet.tracklist[i];
                        const timeParts = track.time.split(':');
                        let trackSecs = 0;
                        if (timeParts.length === 2) {
                            trackSecs = parseInt(timeParts[0], 10) * 60 + parseInt(timeParts[1], 10);
                        }
                        if (currentTime >= trackSecs) {
                            trackSlug = slugify(track.title);
                            currentTrackTitle = track.title;
                            break;
                        }
                    }
                }

                finalUrl = `${cleanRoot}share/${currentLoadedSet.id}/${trackSlug ? trackSlug + '/' : ''}`;

                if (timeCheckbox.checked) {
                    finalUrl += `?t=${Math.floor(currentTime)}`;
                }
            }

            // Traducción del texto que viaja a WhatsApp/X
            const encodedUrl = encodeURIComponent(finalUrl);
            const titleText = encodeURIComponent(
                selectedIntent === 'set' ?
                (isSpanish ? `Escucha el set "${currentLoadedSet.title}"` : `Listen to the set "${currentLoadedSet.title}"`) :
                (isSpanish ? `Escucha "${currentTrackTitle}" en el set ${currentLoadedSet.title}` : `Listen to "${currentTrackTitle}" from ${currentLoadedSet.title}`)
            );

            if (waBtn) waBtn.href = `https://wa.me/?text=${titleText}%20${encodedUrl}`;
            if (fbBtn) fbBtn.href = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
            if (xBtn) xBtn.href = `https://twitter.com/intent/tweet?text=${titleText}&url=${encodedUrl}`;

            urlInput.value = finalUrl;
        };

        const copyToClipboard = () => {
            urlInput.select();
            urlInput.setSelectionRange(0, 99999);

            navigator.clipboard.writeText(urlInput.value).then(() => {
                const originalText = copyBtn.textContent;
                // Traducción del feedback visual
                copyBtn.textContent = isSpanish ? "¡Copiado!" : "Copied!";
                copyBtn.style.backgroundColor = "#1DB954";

                setTimeout(() => {
                    copyBtn.textContent = originalText;
                    copyBtn.style.backgroundColor = "";
                }, 2000);
            }).catch(err => {
                console.error("[ShareController] Error al copiar: ", err);
            });
        };

        return {
            init
        };
    })();
    // --- FIN: Módulo ShareController ---

    // --- INICIO: Módulo SEOController (Fase 3 - JSON-LD Dinámico) ---
    const SEOController = (() => {
        const timeToSeconds = (timeStr) => {
            if (!timeStr) return 0;
            const parts = timeStr.split(':');
            return parts.length === 2 ? parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10) : 0;
        };

        const injectStructuredData = (set) => {
            if (!set) return;

            console.log(`%c[SEO Engine] 🕸️ Tejiendo JSON-LD (Rich Snippets) para: ${set.title}`, "color: #ff00ff; font-weight: bold;");

            // Buscar si el script ya existe; si no, crearlo en el <head>
            let scriptEle = document.getElementById('vloitz-json-ld');
            if (!scriptEle) {
                scriptEle = document.createElement('script');
                scriptEle.type = 'application/ld+json';
                scriptEle.id = 'vloitz-json-ld';
                document.head.appendChild(scriptEle);
            }

            // Obtener la URL base limpia
            const rootUrl = window.location.origin + window.location.pathname.replace('index.html', '');
            const cleanRoot = rootUrl.endsWith('/') ? rootUrl : rootUrl + '/';

            // Mapear el tracklist al estándar MusicRecording de Google
            const tracksSchema = (set.tracklist || []).map((track, index) => {
                return {
                    "@type": "MusicRecording",
                    "position": index + 1,
                    "name": track.title,
                    // Armamos la URL profunda conectando con tu Fase 2 de Deep Linking
                    "url": `${cleanRoot}?set=${set.id}&t=${timeToSeconds(track.time)}`
                };
            });

            // Ensamblar el esquema principal
            const schema = {
                "@context": "https://schema.org",
                "@type": "MusicPlaylist",
                "name": set.title,
                "description": `Escucha el set ${set.title} en formato de alta calidad en Vloitz.`,
                "image": set.cover_art_url || `${cleanRoot}Artwork/${set.id}.webp`,
                "numTracks": tracksSchema.length,
                "track": tracksSchema
            };

            // Inyectar la metadata invisible
            scriptEle.textContent = JSON.stringify(schema, null, 2);
        };

        return {
            injectStructuredData
        };
    })();
    // --- FIN: Módulo SEOController ---

    // --- INICIO: Módulo TrackActionsController (Fase Beatport) ---
    const TrackActionsController = (() => {
        const copyTrack = (trackName, buttonElement) => {
            if (!trackName) return;
            navigator.clipboard.writeText(trackName).then(() => {
                const svg = buttonElement.querySelector('svg');
                if (svg) {
                    const originalStroke = svg.style.stroke;
                    svg.style.stroke = '#1DB954';
                    setTimeout(() => {
                        svg.style.stroke = originalStroke;
                    }, 1500);
                }
                console.log(`[TrackActions] ID copiado: ${trackName}`);
            }).catch(err => {
                console.error("[TrackActions] Error al copiar ID: ", err);
            });
        };

        const searchTrack = (trackFullName) => {
            if (!trackFullName) return;
            const query = encodeURIComponent(trackFullName);
            const beatportUrl = `https://www.beatport.com/search?q=${query}`;
            window.open(beatportUrl, '_blank');
            console.log(`[TrackActions] Buscando en Beatport: ${trackFullName}`);
        };

        return {
            copyTrack,
            searchTrack
        };
    })();
    // --- FIN: Módulo TrackActionsController ---

    // =================================================================
    // --- INICIO: Módulo WelcomeController (Fase 1 - Auto Scroll Instantáneo) ---
    // =================================================================
    const WelcomeController = (() => {
        // ⚙️ CONFIGURACIÓN GLOBAL
        const CONFIG = {
            debug: false, // true = Panel de calibración activo | false = Producción invisible
            factor: 0.55, // Corte exacto del cuello/casaca
            fallbackY: 200, // Respaldo de seguridad
            storageKey: 'vloitz_intro_seen'
        };

        // 🎯 MOTOR DE SCROLL INSTANTÁNEO
        const doScroll = () => {
            const el = document.getElementById('profile-pic-img');
            const targetY = el ? (el.getBoundingClientRect().top + window.scrollY + el.offsetHeight * CONFIG.factor) : CONFIG.fallbackY;

            // "instant" hace que el navegador mueva la vista antes de dibujar el primer frame
            window.scrollTo({
                top: targetY,
                behavior: 'instant'
            });
        };

        // 🛠️ PANEL DE CALIBRACIÓN (Solo inyectado si debug = true)
        const buildUI = () => {
            if (!CONFIG.debug || document.getElementById('v-debug')) return;

            const p = document.createElement('div');
            p.id = 'v-debug';
            p.style.cssText = 'position:fixed;bottom:15px;right:15px;z-index:9999;background:#111;color:#fff;border:1px solid #1DB954;padding:10px;border-radius:8px;font-family:monospace;text-align:center;font-size:12px;box-shadow:0 4px 15px rgba(0,0,0,0.8);';
            p.innerHTML = `
                <div style="color:#1DB954;margin-bottom:6px">⚙️ CALIB: <span id="v-fac" style="color:#0ff">${CONFIG.factor}</span></div>
                <div style="display:flex;gap:5px;margin-bottom:5px">
                    <button id="v-dec" style="flex:1;padding:4px;background:#222;color:#fff;border:1px solid #444;cursor:pointer">-0.05</button>
                    <button id="v-inc" style="flex:1;padding:4px;background:#222;color:#fff;border:1px solid #444;cursor:pointer">+0.05</button>
                </div>
                <button id="v-res" style="width:100%;padding:4px;background:#1DB954;color:#000;border:none;cursor:pointer;font-weight:bold">🔄 Reset</button>
            `;
            document.body.appendChild(p);

            p.addEventListener('click', (e) => {
                if (e.target.id === 'v-dec') CONFIG.factor = Math.max(0, +(CONFIG.factor - 0.05).toFixed(2));
                if (e.target.id === 'v-inc') CONFIG.factor = Math.min(1, +(CONFIG.factor + 0.05).toFixed(2));

                if (e.target.id === 'v-dec' || e.target.id === 'v-inc') {
                    document.getElementById('v-fac').textContent = CONFIG.factor;
                    doScroll();
                }

                if (e.target.id === 'v-res') {
                    localStorage.removeItem(CONFIG.storageKey);
                    window.scrollTo({
                        top: 0,
                        behavior: 'instant'
                    });
                    // Retraso de 50ms solo para el botón reset de pruebas, para notar el salto
                    setTimeout(doScroll, 50);
                }
            });
        };

        // 🚀 INICIALIZACIÓN ULTRARRÁPIDA (Ya manejada en el HTML)
        const init = () => {
            buildUI(); // Solo inyecta los botones si CONFIG.debug es true
        };

    })();

    // --- FIN: Módulo WelcomeController ---

    // =================================================================
    // --- INICIO: Módulo BlacklistController (Fase 2 - Opt-Out Engine) ---
    // =================================================================
    const BlacklistController = (() => {
        let blacklistData = null;

        const init = async () => {
            try {
                const response = await fetch(`/blacklisted.json?t=${Date.now()}`);
                if (response.ok) {
                    blacklistData = await response.json();
                    console.log("%c[Blacklist Engine] 🛡️ Reglas de exclusión cargadas.", "color: #ff3131; font-weight: bold;");
                    applyVisualBlacklist(); // Escaneo visual por si la lista cargó antes que el JSON
                }
            } catch (error) {
                console.warn("[Blacklist Engine] No se encontró blacklisted.json.", error);
            }
        };

        // Utilidad para saber si un track específico está baneado
        const isTrackBlacklisted = (setId, fullTrackName) => {
            if (!blacklistData || !blacklistData.blacklisted_tracks || !blacklistData.blacklisted_tracks[setId]) return false;
            return blacklistData.blacklisted_tracks[setId][fullTrackName] !== undefined;
        };

        // Escáner DOM: Busca en el HTML y "apaga" las pistas vetadas
        const applyVisualBlacklist = () => {
            if (!currentLoadedSet) return;
            const listItems = document.querySelectorAll('.current-tracklist-item');

            listItems.forEach(li => {
                const index = parseInt(li.dataset.index, 10);
                if (currentLoadedSet.tracklist[index]) {
                    const trackFullTitle = currentLoadedSet.tracklist[index].title;
                    if (isTrackBlacklisted(currentLoadedSet.id, trackFullTitle)) {
                        li.classList.add('track-blacklisted');
                        li.title = "Pista no disponible (Opt-Out Legal)";
                    }
                }
            });
        };

        const checkAndSkip = (currentTime, duration, wavesurferInstance) => {
            if (!blacklistData || !blacklistData.blacklisted_tracks || !currentLoadedSet || !wavesurferInstance) return;

            const currentSetId = currentLoadedSet.id;
            const tracksToSkip = blacklistData.blacklisted_tracks[currentSetId];

            if (!tracksToSkip) return;

            for (const trackName in tracksToSkip) {
                const data = tracksToSkip[trackName];
                const startSkip = data.skip[0];
                const endSkip = data.skip[1];
                const offset = data.tolerance_offset_sec || 15;

                if (currentTime >= startSkip && currentTime < endSkip) {
                    const jumpTargetSeconds = endSkip + offset;
                    const progress = jumpTargetSeconds / duration;

                    console.log(`%c[Blacklist Engine] 🚫 Track excluido: ${trackName}. Saltando de ${formatTime(currentTime)} a ${formatTime(jumpTargetSeconds)}...`, "background: #ff0000; color: #fff; font-weight: bold; padding: 2px 4px; border-radius:3px;");

                    wavesurferInstance.seekTo(progress);
                    break;
                }
            }
        };

        return {
            init,
            checkAndSkip,
            isTrackBlacklisted,
            applyVisualBlacklist
        };
    })();
    // --- FIN: Módulo BlacklistController ---

    // =================================================================
    // --- INICIO: Módulo OptOutController (Fase 4 - UI/UX Engine) ---
    // =================================================================
    const OptOutController = (() => {
        const genericDomains = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com', 'icloud.com', 'protonmail.com', 'live.com'];

        // Variable para almacenar la imagen en memoria lista para enviarse
        let currentProofBase64 = null;

        const updateTrackSelectionUI = (currentTimeSec, tracklist) => {
            const prevEl = document.getElementById('optTrackPrev');
            const currEl = document.getElementById('optTrackCurrent');
            const nextEl = document.getElementById('optTrackNext');

            let currentIndex = 0;
            for (let i = 0; i < tracklist.length; i++) {
                const timeParts = tracklist[i].time.split(':');
                const trackSecs = (parseInt(timeParts[0], 10) * 60) + parseInt(timeParts[1], 10);
                if (currentTimeSec >= trackSecs) currentIndex = i;
                else break;
            }

            const prevTrack = tracklist[currentIndex - 1];
            const currTrack = tracklist[currentIndex];
            const nextTrack = tracklist[currentIndex + 1];

            if (prevEl) {
                prevEl.textContent = prevTrack ? `[Anterior] ${prevTrack.title}` : "[Inicio del Set]";
                prevEl.dataset.trackName = prevTrack ? prevTrack.title : "";
            }
            if (currEl) {
                currEl.textContent = currTrack ? `[Actual] ${currTrack.title}` : "[Pista Desconocida]";
                currEl.dataset.trackName = currTrack ? currTrack.title : "";
            }
            if (nextEl) {
                nextEl.textContent = nextTrack ? `[Siguiente] ${nextTrack.title}` : "[Fin del Set]";
                nextEl.dataset.trackName = nextTrack ? nextTrack.title : "";
            }

            const radioPrev = document.querySelector('input[name="optTrack"][value="prev"]');
            const radioNext = document.querySelector('input[name="optTrack"][value="next"]');
            const radioCurr = document.querySelector('input[name="optTrack"][value="current"]');

            if (radioPrev) radioPrev.disabled = !prevTrack;
            if (radioNext) radioNext.disabled = !nextTrack;
            if (radioCurr) radioCurr.checked = true;

            updateEntityInputFromSelectedTrack();
        };

        const extractArtistFromTitle = (fullTitle) => {
            if (!fullTitle) return "";
            const parts = fullTitle.split(' - ');
            return parts.length > 1 ? parts[0].trim() : fullTitle.trim();
        };

        const updateEntityInputFromSelectedTrack = () => {
            const entityNameInput = document.getElementById('optEntityName');
            const selectedRadio = document.querySelector('input[name="optTrack"]:checked');
            if (!entityNameInput || !selectedRadio) return;

            let targetTrackName = "";
            const labelId = selectedRadio.value === 'prev' ? 'optTrackPrev' : (selectedRadio.value === 'next' ? 'optTrackNext' : 'optTrackCurrent');
            const labelSpan = document.getElementById(labelId);

            if (labelSpan && labelSpan.dataset.trackName) {
                targetTrackName = labelSpan.dataset.trackName;
                entityNameInput.value = extractArtistFromTitle(targetTrackName);
            }
        };

        const init = () => {
            const emailInput = document.getElementById('optEmail');
            const catalogRadio = document.getElementById('optScopeCatalog');
            const catalogLabel = document.getElementById('catalogLabelContainer');
            const proofContainer = document.getElementById('proofContainer');
            const closeBtn = document.getElementById('closeOptOutBtn');
            const overlay = document.getElementById('optout-modal-overlay');
            const footerTrigger = document.getElementById('footer-optout-trigger');
            const navBtn = document.getElementById('navOptOutBtn');
            const minuteInput = document.getElementById('optMinute');
            const trackLabelText = document.getElementById('optScopeTrackText');

            // Elementos para el envío
            const submitBtn = document.querySelector('.optout-submit-btn');
            const entityNameInput = document.getElementById('optEntityName');
            const confirmCheckbox = document.getElementById('optConfirm'); // Asumiendo que el checkbox tiene ID "optConfirm"

            const handleOpen = (e) => {
                e.preventDefault();
                const currentTime = (typeof wavesurfer !== 'undefined' && wavesurfer) ? wavesurfer.getCurrentTime() : 0;
                const activeSet = (typeof currentLoadedSet !== 'undefined') ? currentLoadedSet : null;
                openModal(currentTime, activeSet);
            };

            if (footerTrigger) footerTrigger.addEventListener('click', handleOpen);
            if (navBtn) navBtn.addEventListener('click', handleOpen);

            document.querySelectorAll('input[name="optTrack"]').forEach(radio => {
                radio.addEventListener('change', updateEntityInputFromSelectedTrack);
            });

            if (minuteInput) {
                minuteInput.addEventListener('input', (e) => {
                    const activeSet = (typeof currentLoadedSet !== 'undefined') ? currentLoadedSet : null;
                    if (!activeSet || !activeSet.tracklist) return;

                    const val = e.target.value.trim();
                    const timeMatch = val.match(/^(\d+):(\d{1,2})$/);

                    if (timeMatch) {
                        const mins = parseInt(timeMatch[1], 10);
                        const secs = parseInt(timeMatch[2], 10);
                        const totalSeconds = (mins * 60) + secs;
                        updateTrackSelectionUI(totalSeconds, activeSet.tracklist);
                    }
                });
            }

            if (emailInput) {
                emailInput.addEventListener('input', (e) => {
                    const email = e.target.value.toLowerCase().trim();

                    if (!email.includes('@')) {
                        lockCatalog(catalogRadio, catalogLabel, proofContainer, trackLabelText);
                        return;
                    }

                    const domain = email.split('@')[1];
                    const isGeneric = genericDomains.includes(domain);

                    if (isGeneric) {
                        lockCatalog(catalogRadio, catalogLabel, proofContainer, trackLabelText);
                        proofContainer.style.display = 'block';
                    } else if (domain.includes('.')) {
                        catalogRadio.disabled = false;
                        catalogLabel.style.opacity = '1';
                        proofContainer.style.display = 'none';
                        if (trackLabelText) trackLabelText.textContent = "Retirar únicamente esta pista y restringir futuros usos de este artista bajo nuestro sello";
                        currentProofBase64 = null; // Limpiar evidencia si cambia a corporativo
                    }
                });
            }

            if (closeBtn) closeBtn.addEventListener('click', () => overlay.style.display = 'none');

            // --- Procesamiento y Previsualización de la Imagen ---
            const dropzone = document.getElementById('proofDropzone');
            document.addEventListener('paste', (e) => {
                if (overlay && overlay.style.display !== 'none' && proofContainer.style.display === 'block') {
                    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
                    for (let index in items) {
                        const item = items[index];
                        if (item.kind === 'file') {
                            const blob = item.getAsFile();
                            const reader = new FileReader();

                            reader.onload = (event) => {
                                currentProofBase64 = event.target.result; // Guardamos en memoria

                                if (dropzone) {
                                    // Inyectamos la imagen renderizada dentro del dropzone
                                    dropzone.innerHTML = `
                                        <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
                                            <span style="color:#1DB954; font-weight: bold;">✔️ Evidencia cargada correctamente</span>
                                            <img src="${currentProofBase64}" style="max-height: 120px; max-width: 100%; border-radius: 4px; border: 1px solid rgba(29, 185, 84, 0.4); object-fit: contain;" alt="Evidencia DMCA">
                                            <span style="font-size: 10px; color: #888;">(Pega otra imagen si deseas reemplazarla)</span>
                                        </div>
                                    `;
                                    dropzone.style.borderColor = '#1DB954';
                                    dropzone.style.background = 'rgba(29, 185, 84, 0.02)';
                                }
                            };
                            reader.readAsDataURL(blob); // Convierte el archivo a Base64
                        }
                    }
                }
            });

            // --- Lógica de Envío del Formulario (El Payload Senior) ---
            if (submitBtn) {
                submitBtn.addEventListener('click', (e) => {
                    e.preventDefault();

                    // Validación básica
                    if (!emailInput.value.includes('@')) return alert('Por favor, ingresa un correo válido.');
                    if (proofContainer.style.display === 'block' && !currentProofBase64) return alert('Debes pegar (Ctrl+V) una imagen de evidencia para correos personales.');
                    if (confirmCheckbox && !confirmCheckbox.checked) return alert('Debes confirmar que la información es bajo pena de perjurio.');

                    // Identificar qué pista seleccionó el usuario
                    const selectedRadio = document.querySelector('input[name="optTrack"]:checked');
                    let targetTrackName = "";
                    if (selectedRadio) {
                        const labelId = selectedRadio.value === 'prev' ? 'optTrackPrev' : (selectedRadio.value === 'next' ? 'optTrackNext' : 'optTrackCurrent');
                        const labelSpan = document.getElementById(labelId);
                        targetTrackName = labelSpan ? labelSpan.dataset.trackName : "Pista Desconocida";
                    }

                    // Determinar alcance
                    const scopeRadio = document.querySelector('input[name="optScope"]:checked');
                    const scopeValue = scopeRadio ? scopeRadio.value : 'track';

                    // Construcción del Payload JSON
                    const payload = {
                        timestamp: new Date().toISOString(),
                        setId: document.getElementById('optSetId').textContent,
                        reportedMinute: minuteInput.value,
                        targetTrack: targetTrackName,
                        reporterEmail: emailInput.value.trim(),
                        reporterEntity: entityNameInput ? entityNameInput.value.trim() : "No especificado",
                        scope: scopeValue,
                        evidenceBase64: currentProofBase64 // Aquí viaja la imagen en texto
                    };

                    console.log("🚀 Payload listo para enviar al Webhook:", payload);

                    // Cambiar el botón visualmente a estado de carga
                    const originalText = submitBtn.textContent;
                    submitBtn.textContent = 'PROCESANDO SOLICITUD...';
                    submitBtn.style.opacity = '0.6';
                    submitBtn.disabled = true;

                    // --- NUEVA PETICIÓN DIRECTA A GOOGLE APPS SCRIPT ---

                    // Adaptamos tu payload al formato que espera tu servidor de Google
                    const googlePayload = {
                        artist: payload.reporterEntity,
                        reporterEmail: payload.reporterEmail,
                        trackName: `[Set: ${payload.setId} / Min: ${payload.reportedMinute}] ${payload.targetTrack}`,
                        evidenceBase64: payload.evidenceBase64
                    };

                    const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz0fwBtsOi9CQq3Lb2iHGQDaB7dhzMvIqvdJjqqf2PcCR2fsR5DuY1wYdFKk-6R5eX-5g/exec";

                    fetch(GOOGLE_SCRIPT_URL, {
                            method: 'POST',
                            body: JSON.stringify(googlePayload)
                        })
                        .then(response => response.json())
                        .then(data => {
                            if (data.status === "success") {
                                alert('✅ Solicitud enviada directamente. Revisa tu bandeja de Gmail.');

                                // --- CONFIRMACIÓN LIMPIA SIN MOSTRAR TU NÚMERO ---
                                if (data.whatsappDebug && data.whatsappDebug.includes("queued")) {
                                    console.log("✅ Alerta de WhatsApp: El mensaje se encoló y se envió correctamente a tu celular.");
                                } else {
                                    console.log("⚠️ WhatsApp procesado, pero revisa la respuesta del servidor.");
                                }
                                // ------------------------------------------------

                                overlay.style.display = 'none'; // Cerramos el modal
                            } else {
                                console.error("Error en Google Server:", data.message);
                                alert('❌ Hubo un error en el servidor: ' + data.message);
                            }
                        })
                        .catch(error => {
                            console.error('Error de red:', error);
                            alert('❌ Error de conexión al enviar el formulario. Verifica tu red.');
                        })
                        .finally(() => {
                            // Restauramos el botón visualmente
                            submitBtn.textContent = originalText;
                            submitBtn.style.opacity = '1';
                            submitBtn.disabled = false;
                        });
                });
            }
        };

        const lockCatalog = (radioBtn, labelContainer, proofCont, trackTextEl) => {
            radioBtn.disabled = true;
            labelContainer.style.opacity = '0.6';
            if (trackTextEl) trackTextEl.textContent = "Retirar únicamente esta pista (Productor / Artista independiente)";
            if (radioBtn.checked) {
                const trackRadio = document.querySelector('input[name="optScope"][value="track"]');
                if (trackRadio) trackRadio.checked = true;
            }
        };

        const openModal = (currentTimeSec, currentSet) => {
            const overlay = document.getElementById('optout-modal-overlay');
            const setIdEl = document.getElementById('optSetId');
            const minuteEl = document.getElementById('optMinute');

            if (!currentSet || !currentSet.tracklist) return;

            setIdEl.textContent = currentSet.id;

            const mins = Math.floor(currentTimeSec / 60);
            const secs = Math.floor(currentTimeSec % 60).toString().padStart(2, '0');
            if (minuteEl) minuteEl.value = `${mins}:${secs}`;

            updateTrackSelectionUI(currentTimeSec, currentSet.tracklist);

            // Reseteo total de los campos y variables
            const emailField = document.getElementById('optEmail');
            const entityField = document.getElementById('optEntityName');
            const proofCont = document.getElementById('proofContainer');
            const dropzone = document.getElementById('proofDropzone');
            const catalogRadio = document.getElementById('optScopeCatalog');
            const catalogLabel = document.getElementById('catalogLabelContainer');
            const trackTextEl = document.getElementById('optScopeTrackText');
            const confirmCheckbox = document.getElementById('optConfirm');

            if (emailField) emailField.value = '';
            // ❌ ELIMINADO: if (entityField) entityField.value = ''; (Para no borrar el artista)
            if (confirmCheckbox) confirmCheckbox.checked = false;
            if (proofCont) proofCont.style.display = 'none';
            if (catalogRadio) catalogRadio.disabled = true;
            if (catalogLabel) catalogLabel.style.opacity = '0.6';
            if (trackTextEl) trackTextEl.textContent = "Retirar únicamente esta pista (Productor / Artista independiente)";

            // ✅ EJECUTAMOS EL AUTOCOMPLETADO DESPUÉS DE LIMPIAR TODO LO DEMÁS
            updateEntityInputFromSelectedTrack();

            // Limpiar la imagen en memoria y visualmente
            currentProofBase64 = null;
            if (dropzone) {
                dropzone.innerHTML = `🔒 Verificación de Propiedad: Pega (Ctrl+V) una captura de pantalla de tu panel de gestión (ej. Beatport Hype, DistroKid, Spotify for Artists) que demuestre tu control administrativo sobre esta obra.`;
                dropzone.style.borderColor = '#555';
                dropzone.style.background = 'rgba(255, 255, 255, 0.02)';
            }

            if (overlay) overlay.style.display = 'flex';
        };

        return {
            init,
            openModal
        };
    })();
    // --- FIN: Módulo OptOutController ---

    // --- INICIO: Módulo ColorController (Fase 7 - Paleta Dinámica) ---
    const ColorController = (() => {
        let palette = [];

        const generatePalette = () => {
            // Tu Paleta "Contraste Técnico"
            const baseTones = [
                [29, 185, 84], // 1. Verde Vloitz (Marca - Inicio)
                [140, 0, 220], // 2. Morado Profundo
                [255, 100, 0], // 3. Naranja Ámbar
                [0, 120, 255], // 4. Azul Eléctrico
                [230, 0, 0], // 5. Rojo Intenso
                [0, 190, 200], // 6. Cyan/Turquesa
                [255, 190, 0], // 7. Amarillo Oro
                [80, 80, 80], // 8. Gris Acero
                [255, 50, 100], // 9. Salmón Neón
                [120, 220, 0] // 10. Lima Ácido
            ];

            // Variaciones sutiles para no aburrir, pero respetando el tono base
            const variations = ['Normal', 'Profundo'];

            baseTones.forEach(([r, g, b]) => {
                variations.forEach(variant => {
                    let finalR = r,
                        finalG = g,
                        finalB = b;

                    if (variant === 'Profundo') {
                        // Oscurecemos un poco (30%) para dar variedad sin cambiar el color base
                        finalR = Math.round(r * 0.7);
                        finalG = Math.round(g * 0.7);
                        finalB = Math.round(b * 0.7);
                    }

                    // AQUI ESTÁ LA CLAVE:
                    // waveColor: Tiene opacidad (0.2) para que se vea la onda detrás.
                    // textColor: Es el MISMO color RGB, pero con opacidad 1.0 (Sólido).
                    palette.push({
                        waveColor: `rgba(${finalR}, ${finalG}, ${finalB}, 0.2)`,
                        textColor: `rgb(${finalR}, ${finalG}, ${finalB})`
                    });
                });
            });
            console.log(`[ColorController] Paleta sincronizada generada.`);
        };

        const getColor = (index) => {
            if (palette.length === 0) generatePalette();
            return palette[index % palette.length];
        };

        return {
            getColor
        };
    })();


    // =================================================================
    // 🌐 VLOITZ NETWORK CORE (Núcleo Global de Red Compartida V3)
    // =================================================================
    const VloitzNetworkCore = (() => {
        const PRECACHE_SAVE_DB = true;
        const DEBUG_MODE = true;

        let preloadedSegments = new Set();
        let confirmedSegments = new Set();
        let activeFetches = new Set(); // 🔒 NUEVO: El Mutex Lock para evitar colisiones de red
        let activeAbortControllers = new Map(); // 🎯 DISPATCHER: Registro de controladores de aborto para peticiones secundarias

        const AreaofEffect = true;
        const FuzzyHoming = true; // Mantendremos la variable para usos futuros, pero ya no moverá el puntero.

        const fetchSegmentData = (segmentIndex, isSecondary = false, isEmergency = false, isSniperRequest = false) => {
            if (confirmedSegments.has(segmentIndex) || segmentIndex < 0) return;
            if (preloadedSegments.has(segmentIndex) && !isEmergency) return;

            // 🔒 MUTEX LOCK ACTIVO: Si el segmento ya está en vuelo, bloqueamos cualquier petición paralela.
            if (activeFetches.has(segmentIndex)) {
                if (DEBUG_MODE) console.log(`%c[Network Core] 🔒 Mutex Lock: Fragmento ${segmentIndex} bloqueado. Ya estaba en vuelo.`, "color: #bb86fc; font-size: 9px;");
                return;
            }

            // 🎯 PRIORITY DISPATCHER: Si es un Sniper Request (Móvil), abortamos las descargas pasivas (low priority) para limpiar el módem
            if (isSniperRequest && activeAbortControllers.size > 0) {
                if (DEBUG_MODE) console.log(`%c[Dispatcher] 🛑 Sniper (Caso 2) detectado. Abortando ${activeAbortControllers.size} peticiones pasivas...`, "color: #ff3131; font-size: 10px; font-weight: bold;");
                for (let [idx, controller] of activeAbortControllers.entries()) {
                    controller.abort();
                    activeAbortControllers.delete(idx);
                    activeFetches.delete(idx);
                    preloadedSegments.delete(idx);
                    if (DEBUG_MODE) console.log(`%c[Dispatcher] 💥 Abortado fragmento pasivo ${idx} para priorizar red.`, "color: #ffaa00; font-size: 9px;");
                }
            }

            let segmentUrl = "";
            if (currentLoadedSet.server === "HF") {
                const tunnel = typeof VLOITZ_CLUSTER !== 'undefined' ? VLOITZ_CLUSTER[Math.floor(Math.random() * VLOITZ_CLUSTER.length)] : '';
                segmentUrl = PRECACHE_SAVE_DB ? `${tunnel}/${currentLoadedSet.id}/seg-${segmentIndex}.m4s` : `https://huggingface.co/datasets/italocajaleon/audio-core-dataset/resolve/main/${currentLoadedSet.id}/seg-${segmentIndex}.m4s`;
            } else {
                segmentUrl = `${CLOUDFLARE_R2_URL}/${currentLoadedSet.id}/seg-${segmentIndex}.m4s`;
            }

            // Registramos la promesa en vuelo independientemente de si es emergencia o no.
            preloadedSegments.add(segmentIndex);
            activeFetches.add(segmentIndex);

            // ⚠️ FIX CACHÉ: Eliminamos 'cache: reload'. El navegador heredará la descarga silenciosa del Phantom Motor.
            let fetchOptions = {};
            if (isEmergency) {
                fetchOptions.priority = 'high';
            } else if (isSecondary) {
                fetchOptions.priority = 'low';
                // Asignamos el AbortController solo a las peticiones secundarias (Motor Fantasma y Escudos)
                const controller = new AbortController();
                activeAbortControllers.set(segmentIndex, controller);
                fetchOptions.signal = controller.signal;
            }

            const fetchStartTime = performance.now(); // ⏱️ Iniciamos cronómetro de red

            fetch(segmentUrl, fetchOptions).then(res => {
                if (res.ok) {
                    // Alimentamos al velocímetro silenciosamente
                    const latencyMs = performance.now() - fetchStartTime;
                    if (typeof NetworkSense !== 'undefined' && NetworkSense.updateLatency) {
                        NetworkSense.updateLatency(latencyMs);
                    }

                    confirmedSegments.add(segmentIndex);
                    const logPrefix = isEmergency ? "⚡ PULSO:" : (isSecondary ? "🛡️ Escudo:" : "🎯 Impacto:");
                    if (DEBUG_MODE) console.log(`%c[Network Core] ${logPrefix} Fragmento ${segmentIndex} (${latencyMs.toFixed(0)}ms)`, isEmergency ? "color: #ff3131; font-weight: bold;" : "color: #ffaa00; font-size: 10px;");
                }
            }).catch((err) => {
                // 🛡️ Ignorar silenciosamente si fue un aborto intencional del Dispatcher
                if (err.name !== 'AbortError') {
                    preloadedSegments.delete(segmentIndex);
                    confirmedSegments.delete(segmentIndex);
                }
            }).finally(() => {
                // 🔓 Liberamos el Mutex Lock y el Controller
                activeFetches.delete(segmentIndex);
                if (isSecondary) {
                    activeAbortControllers.delete(segmentIndex);
                }
            });
        };

        const preloadSegment = (time, isSniperRequest = false) => {
            if (!currentLoadedSet || !currentLoadedSet.id) return;
            const actualHlsTime = (currentLoadedSet.server === "HF") ? 60 : 2;
            const targetSegment = Math.floor(time / actualHlsTime);

            // 📐 MATEMÁTICA DEL ABISMO (Danger Zone Assessment)
            const residuo = time % actualHlsTime;
            const tiempoRestante = actualHlsTime - residuo;

            const currentLatencySecs = (typeof NetworkSense !== 'undefined') ? (NetworkSense.getLatency() / 1000) : 0.15;
            let safeMargin = currentLatencySecs * 3.5;
            safeMargin = Math.min(safeMargin, actualHlsTime * 0.75);

            if (tiempoRestante <= safeMargin) {
                if (DEBUG_MODE) console.log(`%c[Network Core] ⚠️ Borde Crítico Detectado (Restante: ${tiempoRestante.toFixed(2)}s | Margen Red: ${safeMargin.toFixed(2)}s). ¡Lanzando Dual-Pulse!`, "background: #FF0000; color: #FFF; font-weight: bold; padding: 2px 4px; border-radius:3px;");
                fetchSegmentData(targetSegment, false, true, isSniperRequest);
                fetchSegmentData(targetSegment + 1, false, true, isSniperRequest);
            } else {
                fetchSegmentData(targetSegment, false, false, isSniperRequest);
            }

            // 🛑 FIX MÓVIL: Escudos Perimetrales Clásicos (PC)
            // Si la orden viene del Trackpad Móvil (isSniperRequest = true), NO lanzamos los 4 escudos ciegos.
            // Le otorgamos el 100% del ancho de banda TCP al fragmento principal y delegamos la predicción al Hesitation Burst.
            if (AreaofEffect && currentLoadedSet.server === "CF" && !isSniperRequest) {
                fetchSegmentData(targetSegment - 1, true, false, false);
                fetchSegmentData(targetSegment - 2, true, false, false);
                fetchSegmentData(targetSegment + 1, true, false, false);
                fetchSegmentData(targetSegment + 2, true, false, false);
            }
        };

        const getFuzzyTime = (clickedTime) => {
            if (!FuzzyHoming || !currentLoadedSet || currentLoadedSet.server !== "CF") return clickedTime;
            const actualHlsTime = 2;
            const targetSegment = Math.floor(clickedTime / actualHlsTime);

            if (preloadedSegments.has(targetSegment)) return clickedTime;

            if (preloadedSegments.has(targetSegment - 1)) {
                if (DEBUG_MODE) console.log(`%c[Network Core] 🧲 Snap Magnético: Ajustando al fragmento ${targetSegment - 1}`, "color: #ff00ff; font-weight: bold; font-size: 10px;");
                return (targetSegment - 1) * actualHlsTime;
            }
            if (preloadedSegments.has(targetSegment + 1)) {
                if (DEBUG_MODE) console.log(`%c[Network Core] 🧲 Snap Magnético: Ajustando al fragmento ${targetSegment + 1}`, "color: #ff00ff; font-weight: bold; font-size: 10px;");
                return (targetSegment + 1) * actualHlsTime;
            }
            if (preloadedSegments.has(targetSegment - 2)) return (targetSegment - 2) * actualHlsTime;
            if (preloadedSegments.has(targetSegment + 2)) return (targetSegment + 2) * actualHlsTime;

            return clickedTime;
        };

        // 🛑 NUEVO: Botón de pánico público para erradicar TCP Starvation
        const abortPassiveRequests = () => {
            if (activeAbortControllers.size > 0) {
                if (DEBUG_MODE) console.log(`%c[Dispatcher] 🛑 Botón de Pánico activado. Abortando ${activeAbortControllers.size} peticiones pasivas...`, "color: #ff3131; font-size: 10px; font-weight: bold;");
                for (let [idx, controller] of activeAbortControllers.entries()) {
                    controller.abort();
                    activeAbortControllers.delete(idx);
                    activeFetches.delete(idx);
                    preloadedSegments.delete(idx);
                }
            }
        };

        return {
            fetchSegmentData,
            preloadSegment,
            getFuzzyTime,
            abortPassiveRequests, // <-- EXPORTAMOS EL BOTÓN DE PÁNICO
            confirmedSegments,
            DEBUG_MODE
        };
    })();

    // --- V5.5 INICIO: Módulo PrecacheController (Watchdog Override & Dual-Tap) ---
    // --- V5.6 INICIO: Módulo PrecacheController (Latencia Cero Absoluta / Tight-Cluster) ---
    const PrecacheController = (() => {
        let lastX = 0;
        let lastTime = 0;
        let emaVelocity = 0;
        let lastVelocity = 0;
        let dirX = 0;
        let motionBuffer = []; // ⚡ Regresa la Integral de Energía

        const EMA_ALPHA = 0.35;
        const BUFFER_LIMIT = 8;
        let hasFired = false;
        let lastRestingX = 0;
        let lastFireTime = 0;

        let watchdogTimer = null; // 🐕 El centinela del reposo absoluto

        // Función interna unificada (Principio DRY)
        const firePreload = (clientX, rect, type, emaV, energy, stoppingDist = 0) => {
            const targetsToFire = new Set();
            const duration = wavesurfer ? wavesurfer.getDuration() : 0;
            if (duration <= 0) return;

            // 1. Siempre aseguramos la posición física actual (Presente absoluto)
            const clampedPhysicalX = Math.max(rect.left, Math.min(rect.right, clientX));
            targetsToFire.add(clampedPhysicalX);

            // 2. Fuego de Cobertura Tight-Cluster: Reducido a 5px máximos de inercia
            if (type === "🎯 MACRO SNIPER" && emaV > 0.1) {
                const unitX = dirX / (Math.abs(dirX) || 1);
                const safeDistance = Math.min(stoppingDist, 5); // ⬅️ AJUSTE QUIRÚRGICO: De 10 a 5
                const clampedProjectedX = Math.max(rect.left, Math.min(rect.right, clientX + (unitX * safeDistance)));
                targetsToFire.add(clampedProjectedX);
                lastRestingX = clampedProjectedX;
            } else {
                lastRestingX = clampedPhysicalX;
            }

            hasFired = true;
            lastFireTime = performance.now();

            // Despachamos todas las coordenadas calculadas
            targetsToFire.forEach(targetX => {
                const progress = Math.max(0, Math.min(1, (targetX - rect.left) / rect.width));
                const predictedTime = progress * duration;

                if (VloitzNetworkCore.DEBUG_MODE) {
                    let logDetails = `T: ${predictedTime.toFixed(2)}s`;
                    if (emaV !== undefined) logDetails += ` | Vel: ${emaV.toFixed(3)}`;
                    if (energy !== undefined) logDetails += ` | Energía: ${energy.toFixed(3)}`;

                    const color = type.includes('WATCHDOG') ? '#FF8C00' : '#FF00FF';
                    console.log(`%c[Precache V5.6] ${type} (${logDetails})`, `background: ${color}; color: #000; font-weight: bold; padding: 2px 4px; border-radius: 3px;`);
                }

                // Computadora nunca envía isSniperRequest=true
                VloitzNetworkCore.preloadSegment(predictedTime, false);

                const networkLatency = (typeof NetworkSense !== 'undefined') ? NetworkSense.getLatency() : 80;
                const adaptiveDelay = (globalPerformanceTier === 'ALTA/PC') ? 80 : Math.max(30, networkLatency * 0.5);

                setTimeout(() => {
                    const actualHlsTime = (currentLoadedSet && currentLoadedSet.server === "HF") ? 60 : 2;
                    const currentTarget = Math.floor(predictedTime / actualHlsTime);
                    if (!VloitzNetworkCore.confirmedSegments.has(currentTarget)) {
                        VloitzNetworkCore.fetchSegmentData(currentTarget, false, true, false);
                    }
                }, adaptiveDelay);
            });
        };

        const handleInteraction = (clientX, rect) => {
            const now = performance.now();

            if (watchdogTimer) clearTimeout(watchdogTimer);

            if (lastTime === 0) {
                lastTime = now;
                lastX = clientX;
                return;
            }

            const dt = now - lastTime;
            if (dt === 0) return;

            const rawDx = clientX - lastX;
            const instantV = Math.abs(rawDx) / dt;

            // Filtro EMA
            dirX = (EMA_ALPHA * rawDx) + ((1 - EMA_ALPHA) * dirX);
            emaVelocity = (EMA_ALPHA * instantV) + ((1 - EMA_ALPHA) * emaVelocity);
            const decelSlope = (emaVelocity - lastVelocity) / dt;
            const stoppingDistance = (emaVelocity * emaVelocity) / (2 * Math.abs(decelSlope || 0.0001));

            // Acumulador de Energía Cinética
            motionBuffer.push(emaVelocity);
            if (motionBuffer.length > BUFFER_LIMIT) motionBuffer.shift();
            const energyIntegral = motionBuffer.reduce((a, b) => a + b, 0);

            // 🛡️ REARMADO ADAPTATIVO
            if (hasFired && Math.abs(clientX - lastRestingX) > 10 && (now - lastFireTime) > 300) {
                hasFired = false;
                if (VloitzNetworkCore.DEBUG_MODE) console.log("%c[Precache V5.6] ⚡ Radar rearmado (Micro/Macro).", "color: #00FF00; font-size: 8px;");
            }

            // 🎯 CEREBRO DUAL: GATILLOS INTELIGENTES
            const isMacroSniper = (emaVelocity < 0.40 && decelSlope < -0.01 && stoppingDistance < 15);
            const isMicroAdjust = (energyIntegral < 0.06 && emaVelocity < 0.015 && motionBuffer.length === BUFFER_LIMIT);

            if (!hasFired && (isMacroSniper || isMicroAdjust)) {
                const type = isMacroSniper ? "🎯 MACRO SNIPER" : "🔬 MICRO ADJUST";
                firePreload(clientX, rect, type, emaVelocity, energyIntegral, stoppingDistance);
            }

            lastX = clientX;
            lastTime = now;
            lastVelocity = emaVelocity;

            // 🐕 PERRO GUARDIÁN (V5.6: Acelerado a 45ms)
            watchdogTimer = setTimeout(() => {
                if (!hasFired || Math.abs(clientX - lastRestingX) > 10) {
                    firePreload(clientX, rect, hasFired ? "🐕 WATCHDOG OVERRIDE" : "🐕 WATCHDOG DEAD-STOP");
                }
            }, 45); // ⬅️ AJUSTE QUIRÚRGICO: De 80ms a 45ms para ganar ventaja de red
        };

        return {
            handleInteraction,
            getFuzzyTime: VloitzNetworkCore.getFuzzyTime,
            cancel: () => {
                hasFired = false;
                lastTime = 0;
                emaVelocity = 0;
                dirX = 0;
                motionBuffer = [];
                if (watchdogTimer) clearTimeout(watchdogTimer);
            }
        };
    })();
    // --- FIN: Módulo PrecacheController V5.3 ---

    // =================================================================
    // 🚀 MÓDULO NUEVO: KineticTrackpadPrecache (Laser Trackpad Móvil) version refinada FINAL
    // =================================================================
    const KineticTrackpadPrecache = (() => {
        let samples = [];
        const SAMPLE_LIMIT = 3;
        let hasFired = false;
        let lastRestingX = 0;
        let hesitationTimers = []; // 🚀 NUEVO: Array para rastrear y asesinar timers especulativos

        const handleLaserMove = (currentX, laserState) => {
            // 1. CEREBRO DUAL: Bypass Magnético (Imán detectado = Precarga absoluta)
            if (laserState.magnetDoor !== null) {
                if (!hasFired) {
                    hasFired = true;
                    if (VloitzNetworkCore.DEBUG_MODE) {
                        console.log(`%c[Kinetic Trackpad] 🧲 Imán enganchado. Disparando bala balística a Puerta: ${formatTime(laserState.magnetDoor)}`, "background: #1DB954; color: #000; font-weight: bold; padding: 2px; border-radius: 2px;");
                    }
                    // 🎯 FASE 2: isSniperRequest = true. Si el Phantom Motor aún no baja esta puerta, lo abortamos y le damos prioridad máxima a la puerta.
                    VloitzNetworkCore.preloadSegment(laserState.magnetDoor, true);
                }
                return; // Cortamos cálculo, el imán domina.
            }

            // 2. CEREBRO DUAL: Física Inercial de Pasillo (El usuario desliza libremente)
            const now = performance.now();
            samples.push({
                x: currentX,
                t: now
            });
            if (samples.length > SAMPLE_LIMIT) samples.shift();
            if (samples.length < 2) return;

            const first = samples[0];
            const last = samples[samples.length - 1];
            const dt = last.t - first.t;
            const dx = last.x - first.x;
            const v = Math.abs(dx) / dt;

            const v_prev = samples.length > 2 ? Math.abs(samples[samples.length - 1].x - samples[samples.length - 2].x) / (samples[samples.length - 1].t - samples[samples.length - 2].t) : v;
            const a = (v - v_prev) / (last.t - samples[samples.length - 2].t);
            const stoppingDistance = (v * v) / (2 * Math.abs(a || 0.0001));

            // Rearmado más estricto para pulgar (2px) por el micro-temblor de la pantalla
            if (Math.abs(last.x - lastRestingX) > 2) {
                if (hasFired) {
                    hasFired = false;
                    if (VloitzNetworkCore.DEBUG_MODE) console.log("%c[Kinetic Trackpad] ⚡ Rearmado táctil espacial.", "color: #1DB954; font-size: 8px;");
                }
            }

            const isAbsoluteRest = (v < 0.015); // Ligeramente más holgado que el mouse
            if (!hasFired && (isAbsoluteRest || (v < 0.40 && a < -0.00005 && stoppingDistance < 30))) {
                hasFired = true;
                lastRestingX = last.x;

                if (laserState.targetTime >= 0) {
                    if (VloitzNetworkCore.DEBUG_MODE) console.log(`%c[Kinetic Trackpad] 🧠 INERCIA DETECTADA (Tiempo: ${laserState.targetTime.toFixed(2)}s)`, "background: #00F3FF; color: #000; font-weight: bold; padding: 2px; border-radius: 2px;");

                    // 🎯 FASE 1: FUEGO INMEDIATO (T=0)
                    // Dispara síncronamente el Sniper. El núcleo aborta todo y le da 100% de la red al objetivo.
                    VloitzNetworkCore.preloadSegment(laserState.targetTime, true);

                    // 🚀 FASE 2: HESITATION BURST V3.0 (Especulación Recursiva Condicionada)
                    if (isAbsoluteRest && currentLoadedSet) {
                        const isHF = currentLoadedSet.server === "HF";
                        const burstLimit = isHF ? 1 : 3; // ⚖️ Asimetría HF vs CF
                        let burstIndex = 1;
                        const actualHlsTime = isHF ? 60 : 2;
                        const currentTarget = Math.floor(laserState.targetTime / actualHlsTime);

                        // Patrón Recursivo Secuencial Estricto (Sin chocar con NADIE)
                        const checkAndFetchSecondary = () => {
                            // 1. Validar que la intención y la sesión siguen vivas
                            if (!hasFired || !laserState || !laserState.sessionActive) return;

                            // 2. 🛡️ Guardia Dinámica Adaptativa (Reemplaza el 600ms estático)
                            // Toleramos más latencia en HF porque los bloques son pesados, CF es estricto.
                            const currentNetLatency = (typeof NetworkSense !== 'undefined') ? NetworkSense.getLatency() : 150;
                            const dynamicPanicThreshold = isHF ? 800 : 400;

                            if (currentNetLatency > dynamicPanicThreshold) {
                                if (VloitzNetworkCore.DEBUG_MODE) console.log(`%c[Hesitation Burst] 🛑 Red degradada (${currentNetLatency.toFixed(0)}ms). Ráfaga abortada.`, "color: #ff3131; font-size: 9px;");
                                return; // Cortamos la cadena de raíz para salvar los sockets
                            }

                            // 3. 🎯 Respeto al Monopolio Estricto (True Sequential)
                            // Solo pedimos el siguiente fragmento si el ANTERIOR EXACTO ya está confirmado en caché.
                            const segmentToWaitFor = currentTarget + burstIndex - 1;

                            if (VloitzNetworkCore.confirmedSegments.has(segmentToWaitFor)) {
                                // El fragmento anterior ya bajó por completo. Vía libre total.
                                VloitzNetworkCore.fetchSegmentData(currentTarget + burstIndex, true, false, false);
                                burstIndex++;
                            } else {
                                if (VloitzNetworkCore.DEBUG_MODE) {
                                    console.log(`%c[Hesitation Burst] ⏳ Esperando confirmación del fragmento ${segmentToWaitFor}...`, "color: #ffaa00; font-size: 9px;");
                                }
                            }

                            // 4. Continuar recursión si no hemos llegado al límite del Burst
                            if (burstIndex <= burstLimit) {
                                const timerId = setTimeout(checkAndFetchSecondary, 350);
                                hesitationTimers.push(timerId);
                            }
                        };

                        // Arrancamos el ciclo de revisión
                        const initialTimerId = setTimeout(checkAndFetchSecondary, 350);
                        hesitationTimers.push(initialTimerId);
                    }
                }
            }
        };

        return {
            handleLaserMove,
            reset: () => {
                samples = [];
                hasFired = false;
                lastRestingX = 0;

                // 1. Limpieza de memoria (Timers especulativos huérfanos)
                if (typeof hesitationTimers !== 'undefined' && hesitationTimers.length > 0) {
                    hesitationTimers.forEach(clearTimeout);
                    hesitationTimers = [];
                }

                // 2. 🛑 EL BOTÓN DE PÁNICO: Asesinato de peticiones pasivas en vuelo
                if (typeof VloitzNetworkCore !== 'undefined' && VloitzNetworkCore.abortPassiveRequests) {
                    VloitzNetworkCore.abortPassiveRequests();
                }
            }
        };
    })();

    // --- FASE 1 INICIO: Módulo TracklistPreloader (Phantom Motor) ---

    // --- V6.0 INICIO: Módulo NetworkSense (Telemetría Continua Híbrida) ---
    const NetworkSense = (() => {
        let currentLatency = (globalPerformanceTier === 'ALTA/PC') ? 50 : 150;
        const EMA_ALPHA = 0.3; // Constante de suavizado de red

        // Actualizamos la latencia silenciosamente con cada fragmento real que baja
        const updateLatency = (fetchTimeMs) => {
            currentLatency = (EMA_ALPHA * fetchTimeMs) + ((1 - EMA_ALPHA) * currentLatency);
        };

        const getConcurrency = () => {
            if (globalPerformanceTier === 'ALTA/PC') return 4;
            if (currentLatency < 200) return 3;
            if (currentLatency < 600) return 2;
            return 1;
        };

        return {
            updateLatency, // Expuesto para que el NetworkCore lo alimente
            getLatency: () => currentLatency,
            getConcurrency,
            measureNetwork: async () => {} // Dummy fallback para no romper código antiguo
        };
    })();
    // --- FIN: Módulo NetworkSense V6.0 ---

    const TracklistPreloader = (() => {

        // --- NUEVO: Módulo NetworkSense (Velocímetro Vloitz v5.0) ---
        const NetworkSense = (() => {
            let isMeasured = false;
            let currentLatency = 0;
            let optimalConcurrency = (globalPerformanceTier === 'ALTA/PC') ? 4 : 1; // Default
            const isMobile = globalPerformanceTier !== 'ALTA/PC';

            const measureNetwork = async (testUrl) => {
                if (isMeasured) return;
                try {
                    const startTime = performance.now();
                    const response = await fetch(testUrl, {
                        method: 'HEAD',
                        cache: 'no-cache'
                    });
                    if (response.ok) {
                        currentLatency = performance.now() - startTime;

                        // --- LÓGICA DE VELOCÍMETRO PARA MÓVILES ---
                        if (isMobile) {
                            if (currentLatency < 200) {
                                optimalConcurrency = 3; // Red excelente (WiFi)
                                console.log(`%c[NetworkSense] 📡 Latencia: ${currentLatency.toFixed(0)}ms -> Red Ultra-Rápida (3 Carriles)`, "color: #00FF00; font-weight: bold;");
                            } else if (currentLatency < 600) {
                                optimalConcurrency = 2; // Red buena (4G)
                                console.log(`%c[NetworkSense] 📡 Latencia: ${currentLatency.toFixed(0)}ms -> Red Estable (2 Carriles)`, "color: #ffaa00;");
                            } else {
                                optimalConcurrency = 1; // Red inestable (Hora Pico/3G)
                                console.log(`%c[NetworkSense] 📡 Latencia: ${currentLatency.toFixed(0)}ms -> Red Inestable (Modo Seguro: 1 Carril)`, "color: #ff5555;");
                            }
                        } else {
                            // En PC mantenemos 4 carriles por su capacidad de hardware
                            console.log(`%c[NetworkSense] 🖥️ PC Detectada. Manteniendo 4 carriles. (Latencia: ${currentLatency.toFixed(0)}ms)`, "color: #00F3FF;");
                        }
                        isMeasured = true;
                    }
                } catch (e) {
                    console.warn("[NetworkSense] Fallo al medir red. Usando default (1 carril).", e);
                }
            };

            return {
                measureNetwork,
                getConcurrency: () => optimalConcurrency
            };
        })();
        // --- FIN MÓDULO NetworkSense ---

        let abortController = null;
        const PRELOAD_CACHE_NAME = 'vloitz-tracklist-cache';

        // Mapeo de Concurrencia Senior: Conectado a NetworkSense
        const getConcurrencyLimit = () => NetworkSense.getConcurrency();

        // TRADUCTOR TÁCTICO: Convierte "04:30" -> { index: 135, remainder: 0 }
        const timeToSegmentIndex = (timeStr) => {
            const parts = timeStr.split(':');
            if (parts.length !== 2) return null;
            const totalSeconds = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
            const duration = (currentLoadedSet?.server === "HF") ? 60 : 2;
            return {
                index: Math.floor(totalSeconds / duration),
                remainder: totalSeconds % duration
            };
        };

        const start = (set) => {
            // Regla de Oro: Solo en Cloudflare
            if (!set || set.server !== "CF") return;

            console.log(`%c[Phantom Preloader] 👻 Modo Fantasma activado. Tier: ${globalPerformanceTier} (Límite: ${getConcurrencyLimit()})`, "color: #bb86fc; font-weight: bold;");

            // Cancelar cualquier descarga previa si el usuario cambió de set
            if (abortController) {
                abortController.abort();
                console.log("%c[Phantom Preloader] 🛑 Descargas anteriores canceladas.", "color: #ff5555; font-size: 9px;");
            }
            abortController = new AbortController();

            // Realizamos la prueba de velocidad con el primer segmento antes de arrancar
            const testSegment = `${CLOUDFLARE_R2_URL}/${set.id}/seg-0.m4s`;
            NetworkSense.measureNetwork(testSegment).then(() => {
                // Aquí se ejecutará la lógica de la Fase 3 (Traductor y Descarga)
                processQueue(set.tracklist);
            });

        };

        // --- EL MOTOR FANTASMA FINAL (Paralelismo Controlado) ---
        const processQueue = async (tracklist) => {
            if (!tracklist || !currentLoadedSet) return;

            console.log(`%c[Phantom Preloader] 🚀 Iniciando traducción de ${tracklist.length} tracks en bloques.`, "color: #bb86fc; font-size: 10px;");

            // En PC será 4, en móvil será 1.
            const limit = getConcurrencyLimit();

            // Bucle que avanza en bloques (ej: de 4 en 4)
            for (let i = 0; i < tracklist.length; i += limit) {
                if (abortController.signal.aborted) break;

                // Tomamos el bloque actual (ej: tracks del 0 al 3)
                const chunk = tracklist.slice(i, i + limit);

                // Preparamos las promesas de descarga para este bloque
                const downloadPromises = chunk.map(track => {
                    const segData = timeToSegmentIndex(track.time);
                    if (!segData) return Promise.resolve();

                    const baseUrl = (currentLoadedSet?.server === "HF") ? VLOITZ_CLUSTER[0] : CLOUDFLARE_R2_URL;
                    const segmentUrl = `${baseUrl}/${currentLoadedSet.id}/seg-${segData.index}.m4s`;
                    const p1 = downloadToCache(segmentUrl); // Descarga del ladrillo principal

                    // --- INICIO: GATILLO INTELIGENTE (Contextual Dual-Segment) ---
                    // Si el track empieza en la segunda mitad del ladrillo (residuo >= 1s o 30s),
                    // el riesgo de corte es alto. Forzamos la descarga del siguiente ladrillo.
                    const riskThreshold = (currentLoadedSet?.server === "HF") ? 30 : 1;
                    if (segData.remainder >= riskThreshold) {
                        console.log(`%c[Phantom Preloader] 🎯 Gatillo Inteligente: Track en ${track.time} requiere 2 ladrillos (seg-${segData.index} y seg-${segData.index + 1})`, "color: #ffaa00; font-size: 9px;");
                        const nextSegmentUrl = `${baseUrl}/${currentLoadedSet.id}/seg-${segData.index + 1}.m4s`;
                        const p2 = downloadToCache(nextSegmentUrl);
                        return Promise.all([p1, p2]); // El motor espera a que AMBOS ladrillos bajen
                    }
                    // --- FIN: GATILLO INTELIGENTE ---

                    return p1; // Si no hay riesgo, solo gasta datos en 1 ladrillo
                });

                // AWAIT MAESTRO: Esperamos a que terminen estos 4 antes de lanzar los siguientes 4
                await Promise.all(downloadPromises);
            }

            console.log("%c[Phantom Preloader] ✅ Traducción de TODA la cola completada.", "color: #00FF00; font-weight: bold;");
        };

        // INYECTOR TÁCTICO: Descarga el fragmento de 2s y lo guarda en la Cache API
        const downloadToCache = async (url) => {
            try {
                const cache = await caches.open(PRELOAD_CACHE_NAME);
                const cachedResponse = await cache.match(url);
                if (cachedResponse) return;

                const response = await fetch(url, {
                    signal: abortController.signal,
                    // ELIMINADO: mode: 'no-cors' (Para que el audio no sea opaco)
                    priority: 'low'
                });

                if (response.ok) {
                    await cache.put(url, response);
                    console.log(`%c[Phantom Preloader] 📦 Inyección exitosa: ${url.split('/').pop()}`, "color: #39FF14; font-size: 9px; opacity: 0.8;");
                }
            } catch (e) {
                if (e.name !== 'AbortError') console.warn("[Phantom Preloader] Error en inyección:", e);
            }
        };

        return {
            start
        };
    })();
    // --- FIN: Módulo TracklistPreloader ---

    // --- FUNCIÓN DE PINTADO (Fase 7) ---
    function paintWaveformRegions() {
        if (!wsRegions || !currentLoadedSet || !currentLoadedSet.tracklist) return;

        console.log("[Regions] Iniciando pintado de espectro...");
        wsRegions.clearRegions(); // Limpiar anteriores

        const tracks = currentLoadedSet.tracklist;
        const totalDuration = wavesurfer.getDuration();

        tracks.forEach((track, index) => {
            const regionTimeParts = track.time.split(':');
            const startTime = parseInt(regionTimeParts[0], 10) * 60 + parseInt(regionTimeParts[1], 10);

            let endTime = totalDuration;
            if (index < tracks.length - 1) {
                const nextParts = tracks[index + 1].time.split(':');
                endTime = parseInt(nextParts[0], 10) * 60 + parseInt(nextParts[1], 10);
            }

            const colors = ColorController.getColor(index);

            // 1. Capturamos la instancia de la región al crearla
            const region = wsRegions.addRegion({
                start: startTime,
                end: endTime,
                color: colors.waveColor,
                drag: false,
                resize: false
            });

            // 2. MÓDULO BETA: Inyección Quirúrgica Dinámica (Vloitz Markers)
            if (VLOITZ_UI_FLAGS.showFavoritesMarker && currentSetFavorites.has(startTime)) {
                if (region.element) {

                    let neonGlowColor = colors.textColor;

                    // FIX ÓPTICO: El "Gris Acero" oscuro no brilla en fondos negros.
                    // Lo interceptamos y lo convertimos en un Plata Brillante solo para el Neón.
                    if (neonGlowColor === 'rgb(80, 80, 80)' || neonGlowColor === 'rgb(56, 56, 56)') {
                        neonGlowColor = 'rgb(220, 220, 220)'; // Plata brillante
                    }

                    // Inyectamos el color corregido como variable CSS
                    region.element.style.setProperty('--v-neon-color', neonGlowColor);

                    const currentPart = region.element.getAttribute('part') || 'region';
                    const markerType = VLOITZ_UI_FLAGS.neonColoredMarkers ? 'favorite-marker-neon' : 'favorite-marker';

                    region.element.setAttribute('part', `${currentPart} ${markerType}`);
                }
            }
        });
        console.log(`[Regions] ${tracks.length} regiones dibujadas.`);
    }

    // --- FIN: Módulo ColorController ---

    // =================================================================
    // 🌉 YTSYNCBRIDGE (Integración Híbrida Adaptativa FLAC-YouTube)
    // =================================================================
    const YTSyncBridge = (() => {
        let player = null;
        let isApiReady = false;
        let currentSyncConfig = null;
        let isCatchingUp = false;
        let apiInjectionStarted = false;
        let scrollDebounce;
        let widgetKilled = false; // Flag para el Kill Switch (Anti-Anuncios)

        const injectYouTubeAPI = () => {
            if (apiInjectionStarted || window.YT) return;
            apiInjectionStarted = true;
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            if (firstScriptTag && firstScriptTag.parentNode) {
                firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
            } else {
                document.head.appendChild(tag);
            }
        };

        window.onYouTubeIframeAPIReady = () => {
            isApiReady = true;
            console.log("%c[YTSyncBridge] 📺 API de YouTube Lista.", "color: #ff0000; font-weight: bold;");
            if (currentSyncConfig && currentSyncConfig.enabled && currentSyncConfig.video_id) {
                initPlayer(currentSyncConfig.video_id);
            }
        };

        const initPlayer = (videoId) => {
            console.log(`%c[YTSyncBridge Audit] initPlayer ejecutado. ID: ${videoId}`, "background: #000; color: #fff;");
            // 🛡️ REGLA: Desktop-First estricto
            if (globalPerformanceTier !== 'ALTA/PC') {
                console.log("[YTSyncBridge] 🛑 Abortado: Modo móvil detectado. Solo Desktop.");
                return;
            }
            if (widgetKilled) return;

            const container = document.getElementById('yt-sync-widget');
            if (container) {
                container.style.display = 'block';

                // Inyectamos el "Kill Switch" dinámicamente si no existe
                if (!document.getElementById('yt-kill-switch')) {
                    const killBtn = document.createElement('button');
                    killBtn.id = 'yt-kill-switch';
                    killBtn.innerHTML = '&times;';
                    Object.assign(killBtn.style, {
                        position: 'absolute',
                        top: '0',
                        right: '0',
                        background: 'rgba(0,0,0,0.8)',
                        color: 'white',
                        border: 'none',
                        width: '24px',
                        height: '24px',
                        cursor: 'pointer',
                        zIndex: '2',
                        fontSize: '18px',
                        lineHeight: '24px',
                        padding: '0',
                        pointerEvents: 'auto'
                    });
                    killBtn.title = "Cerrar Widget";
                    killBtn.onclick = () => {
                        widgetKilled = true;
                        if (player && typeof player.destroy === 'function') player.destroy();
                        container.remove();
                        console.log("%c[YTSyncBridge] 🛑 Widget destruido por el usuario (Kill Switch).", "color: #ff3131;");
                    };
                    container.appendChild(killBtn);
                }
            }

            // Reciclaje de memoria si el player ya existe
            if (player && typeof player.loadVideoById === 'function') {
                player.loadVideoById(videoId);
                return;
            }

            player = new YT.Player('yt-player-container', {
                height: '150',
                width: '200',
                videoId: videoId,
                playerVars: {
                    'playsinline': 1,
                    'controls': 0,
                    'disablekb': 1,
                    'rel': 0,
                    'modestbranding': 1
                },
                events: {
                    'onReady': onPlayerReady,
                    'onStateChange': onPlayerStateChange
                }
            });
        };

        const onPlayerReady = (event) => {
            player.setPlaybackQuality('small');
            player.setVolume(1); // Enmascaramiento Acústico Absoluto
            console.log("[YTSyncBridge] 🎵 Esclavo inicializado: 144p, Volumen 1%.");

            if (wavesurfer && wavesurfer.isPlaying()) {
                player.playVideo();
            }
        };

        const onPlayerStateChange = (event) => {
            // Desenmascaramiento del Caso B (Catch-Up Silencioso Terminado)
            if (isCatchingUp && event.data === YT.PlayerState.PLAYING) {
                player.unMute();
                player.setVolume(1);
                isCatchingUp = false;
                console.log("%c[YTSyncBridge] ⚡ Catch-Up Completado. Audio esclavo restaurado al 1%.", "color: #00FF00; font-size: 10px;");
            }
        };

        const checkAndSync = (masterTime) => {
            if (!player || !isApiReady || !currentSyncConfig || !currentSyncConfig.enabled || isCatchingUp || widgetKilled) return;
            if (typeof player.getCurrentTime !== 'function') return;

            // 🕒 Generador de Sello de Hora Real (HH:MM:SS.mmm)
            const now = new Date();
            const wallClock = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');

            const slaveTime = player.getCurrentTime();
            const offset = (currentSyncConfig.offset_ms || 0) / 1000;
            const targetTime = masterTime + offset;
            const diff = Math.abs(targetTime - slaveTime);

            // 🕵️‍♂️ MONITOR DE TIEMPO REAL CON HORA DE SISTEMA
            console.log(
                `%c[${wallClock}] [YTSyncBridge Monitor] ⏱️ Master: [ ${formatTime(masterTime)} ] | 📺 Slave: [ ${formatTime(slaveTime)} ] | 📐 Desfase: ${diff.toFixed(2)}s`,
                "background: #111; color: #00ff00; font-family: monospace; font-size: 11px; padding: 3px; border-radius: 3px;"
            );
            const offset = (currentSyncConfig.offset_ms || 0) / 1000;
            const targetTime = masterTime + offset;
            const diff = Math.abs(targetTime - slaveTime);

            // 🕵️‍♂️ MONITOR DE TIEMPO REAL: Comparamos Master vs Slave en formato humano y bruto
            console.log(
                `%c[YTSyncBridge Monitor] ⏱️ Master (FLAC): [ ${formatTime(masterTime)} ] | 📺 Slave (YouTube): [ ${formatTime(slaveTime)} ] | 📐 Desfase: ${diff.toFixed(2)}s`,
                "background: #111; color: #00ff00; font-family: monospace; font-size: 11px; padding: 3px; border-radius: 3px;"
            );

            // Tolerancia de 6 segundos para ignorar micro-desfases
            if (diff <= 6) {
                return;
            }

            const loadedFraction = player.getVideoLoadedFraction() || 0;
            const duration = player.getDuration() || 0;
            const loadedSeconds = loadedFraction * duration;

            if (targetTime <= loadedSeconds || diff < 15) {
                // CASO A: Salto en Zona Segura o Desfase Leve
                console.log(`%c[YTSyncBridge] 🎯 Caso A: Sync instantáneo a ${formatTime(targetTime)} (${targetTime.toFixed(1)}s)`, "color: #00d2ff; font-weight: bold;");
                player.seekTo(targetTime, true);
            } else {
                // CASO B: Salto Monumental (El Perrito Esperando en Silencio)
                console.log(`%c[YTSyncBridge] 🚀 Caso B: Salto monumental a ${formatTime(targetTime)} (${targetTime.toFixed(1)}s) (Mute + Seek)`, "color: #ffaa00; font-weight: bold;");
                isCatchingUp = true;
                player.mute();
                player.seekTo(targetTime, true);
            }
        };

        return {
            initTriggers: () => {
                // Disparador Orgánico Estricto (Scroll)
                window.addEventListener('scroll', () => {
                    clearTimeout(scrollDebounce);
                    scrollDebounce = setTimeout(() => {
                        if (wavesurfer && wavesurfer.isPlaying()) {
                            checkAndSync(wavesurfer.getCurrentTime());
                        }
                    }, 800);
                }, {
                    passive: true
                });

                // 👁️ NUEVO: Auditor del Caso D (Retorno de pestaña oculta)
                document.addEventListener('visibilitychange', () => {
                    if (!document.hidden && wavesurfer && wavesurfer.isPlaying()) {
                        console.log(
                            "%c[YTSyncBridge Audit] 👁️ CASO D DETECTADO: Usuario regresó a la pestaña. Forzando re-evaluación...",
                            "background: #00bcd4; color: #000; font-weight: bold; padding: 2px 4px; border-radius: 3px;"
                        );
                        checkAndSync(wavesurfer.getCurrentTime());
                    }
                });
            },
            // 🌉 DISPARADOR DE AUDITORÍA: Verificamos qué llega y qué decide
            sync: (masterTime) => {
                console.log(`%c[YTSyncBridge Audit] Recibida orden de sincronizar. Tiempo: ${masterTime.toFixed(2)}s`, "background: #fff; color: #000; font-weight: bold;");
                checkAndSync(masterTime);
            },
            loadVideoConfig: (syncConfig) => {
                // LÓGICA SENIOR: Si hay un video_id con texto, forzamos enabled = true.
                currentSyncConfig = syncConfig || {
                    video_id: ""
                };
                const isSystemEnabled = currentSyncConfig.video_id && currentSyncConfig.video_id.trim() !== "";
                currentSyncConfig.enabled = isSystemEnabled;

                const container = document.getElementById('yt-sync-widget');

                if (!currentSyncConfig.enabled || widgetKilled) {
                    if (player && typeof player.pauseVideo === 'function') {
                        player.pauseVideo();
                    }
                    if (container) container.style.display = 'none';
                    return;
                }

                if (!isApiReady) {
                    injectYouTubeAPI();
                } else {
                    initPlayer(currentSyncConfig.video_id);
                }
            },
            play: () => {
                if (player && isApiReady && currentSyncConfig && currentSyncConfig.enabled && !isCatchingUp && !widgetKilled) {
                    if (typeof player.playVideo === 'function') player.playVideo();
                }
            },
            pause: () => {
                if (player && isApiReady && currentSyncConfig && currentSyncConfig.enabled && !widgetKilled) {
                    if (typeof player.pauseVideo === 'function') player.pauseVideo();
                }
            }
        };
    })();
    YTSyncBridge.initTriggers();

    // --- INICIO FASE 0: Aislamiento de Variables Táctiles (Limpieza Fase 4) ---
    // Variables Legacy (Solo para uso en PC/Desktop)
    let isDraggingWaveformTouch = false;
    let isHoveringWaveform = false;
    let longTouchTimer = null;
    const LONG_TOUCH_THRESHOLD = 200;
    let wasPlayingBeforeDrag = false;
    // --- FIN FASE 0 ---

    // --- Inicializar WaveSurfer ---
    try {
        console.log("Inicializando WaveSurfer..."); // LOG
        wavesurfer = WaveSurfer.create({
            container: '#waveform',
            // --- Matching Prototype Visuals ---
            waveColor: 'rgba(255, 255, 255, 0.20)', // Match prototype
            progressColor: 'rgba(255, 255, 255, 0.90)', // Match prototype
            height: 128, // Match prototype
            barWidth: 3, // Match prototype
            barGap: 1, // Match prototype
            // barRadius: 0, // Default in prototype, can omit or set explicitly
            // normalize: false, // Default in prototype, ensure it's not true
            // --- End Matching ---

            plugins: [WaveSurfer.Regions.create()], // Activar plugin

            cursorColor: "#ffffff", // Keep your preferred cursor color
            cursorWidth: 1, // Keep your preferred cursor width
            responsive: true,
            backend: 'MediaElement',
            media: document.getElementById('audio-player')
        });
        console.log("WaveSurfer inicializado correctamente."); // LOG
        // 🔒 VLOITZ DEV MODE: Bóveda de Seguridad
        const VLOITZ_DEV_MODE = false; // Cambiar a true SOLO cuando necesites depurar

        if (VLOITZ_DEV_MODE) {
            window.wavesurfer = wavesurfer;
            console.log("⚠️ [DEV MODE] Instancia de WaveSurfer expuesta globalmente.");
        }

        wsRegions = wavesurfer.plugins[0]; // Guardar referencia para usarla luego
    } catch (error) {
        console.error("Error CRÍTICO al inicializar WaveSurfer:", error); // LOG ERROR
        currentTrackTitle.textContent = "Error al iniciar reproductor";
        playPauseBtn.textContent = '❌';
        return; // Detener si WaveSurfer no se puede crear
    }

    // --- Cargar sets.json ---
    console.log("Cargando sets.json..."); // LOG
    fetch('/sets.json')
        .then(response => {
            if (!response.ok) { // LOG ERROR RED
                throw new Error(`Error HTTP! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("sets.json cargado:", data); // LOG ÉXITO

            // --- VERIFICACIÓN FASE 1 ---
            if (data.sets && data.sets.length > 0) {
                console.log("[Fase 1 Check] ID del primer set:", data.sets[0].id);
            }
            // ---------------------------

            // Cargar perfil
            if (data.profile) {
                profilePicImg.src = data.profile.profile_pic_url;
                profileBanner.style.backgroundImage = `url('${data.profile.banner_url}')`;
                console.log("Perfil cargado."); // LOG
            }
            // Cargar sets
            allSets = data.sets;
            allSets.sort((a, b) => new Date(b.date) - new Date(a.date)); // Ordenar
            populateTracklist(allSets);
            if (allSets.length > 0) {

                // --- INICIO: Lógica Deep Linking (Fase 3.1) ---
                const params = URLController.getParams();
                let targetIndex = 0; // Por defecto: el último set (índice 0)

                if (params.setId) {
                    // Buscar índice del set que coincida con el ID
                    const foundIndex = allSets.findIndex(set => set.id === params.setId);
                    if (foundIndex !== -1) {
                        targetIndex = foundIndex;
                        console.log(`[DeepLink] ✅ Set encontrado por ID: "${params.setId}" (Index: ${targetIndex})`);
                    } else {
                        console.warn(`[DeepLink] ⚠️ ID "${params.setId}" no encontrado. Cargando set más reciente.`);
                    }
                }

                // Cargar el set decidido (Por URL o por defecto)
                loadTrack(allSets[targetIndex], targetIndex);

                // --- NUEVO: FASE 1, 3 y 4 - Experiencia de Deep Linking ---
                if (params.setId || params.timestamp !== null) {

                    // FASE 1: Desplazamiento Cinemático Inmediato
                    setTimeout(() => {
                        if (typeof focusPlayerCard === 'function') {
                            focusPlayerCard();
                        }
                    }, 50);

                    wavesurfer.once('ready', () => {

                        // FASE 3: Salto al tiempo exacto (Seek)
                        if (params.timestamp !== null) {
                            const duration = wavesurfer.getDuration();
                            if (duration > 0) {
                                const targetRatio = params.timestamp / duration;
                                wavesurfer.seekTo(targetRatio);
                                console.log(`[DeepLink] ⏱️ Salto automático a los ${params.timestamp}s`);
                            }
                        }

                        // FASE 4: Global Kinetic Bypass (Phantom Scroll)
                        // Teoría aplicada: Cegar al Compositor nativo para que el WebView considere el drag como un toque limpio.

                        const phantomShield = document.createElement('div');
                        phantomShield.style.position = 'fixed';
                        phantomShield.style.top = '0';
                        phantomShield.style.left = '0';
                        phantomShield.style.width = '100vw';
                        phantomShield.style.height = '100vh';
                        phantomShield.style.zIndex = '999999';

                        // MAGIA: Matamos el scroll nativo.
                        phantomShield.style.touchAction = 'none';
                        document.body.appendChild(phantomShield);

                        let startY = 0;
                        let bypassActive = true;

                        const breakPhantomShield = () => {
                            if (!bypassActive) return;

                            if (!wavesurfer.isPlaying()) {
                                const playPromise = wavesurfer.play();
                                if (playPromise !== undefined) {
                                    playPromise.then(() => {
                                        console.log('[DeepLink] 🔓 Audio liberado por el Motor Kinetic Global!');
                                        bypassActive = false;
                                        phantomShield.remove(); // Restauramos el scroll nativo
                                    }).catch(err => {
                                        // Fallo silencioso, seguimos esperando el siguiente frame de movimiento
                                    });
                                }
                            } else {
                                bypassActive = false;
                                phantomShield.remove();
                            }
                        };

                        // 1. Anclaje Inicial
                        phantomShield.addEventListener('touchstart', (e) => {
                            startY = e.touches[0].clientY;
                            breakPhantomShield();
                        }, {
                            passive: false
                        });

                        // 2. Puenteo Físico (Scroll JS) + Ataque de Audio
                        phantomShield.addEventListener('touchmove', (e) => {
                            e.preventDefault(); // Bloqueo estricto del navegador

                            const currentY = e.touches[0].clientY;
                            const deltaY = startY - currentY;

                            window.scrollBy(0, deltaY); // Scroll manual de la página

                            startY = currentY; // Reset del ancla
                            breakPhantomShield(); // Intentamos arrancar
                        }, {
                            passive: false
                        });

                        phantomShield.addEventListener('touchend', breakPhantomShield);
                        phantomShield.addEventListener('click', breakPhantomShield);
                        phantomShield.addEventListener('mousedown', breakPhantomShield); // Para pruebas en PC
                    });
                }
                // --- FIN: Lógica Deep Linking ---


                // --- Poblar "Latest Set" (prototipo v4) ---
                if (latestSetTitle && latestSetDate) {
                    console.log("Poblando 'Latest Set' box..."); // LOG
                    latestSetTitle.textContent = allSets[0].title;
                    latestSetDate.textContent = allSets[0].date.split(' ')[0];
                }

            } else {
                currentTrackTitle.textContent = "No hay sets para mostrar.";
                console.warn("No se encontraron sets en sets.json"); // LOG ADVERTENCIA
            }
        })
        .catch(error => {
            console.error('Error FATAL al cargar o parsear sets.json:', error); // LOG ERROR
            currentTrackTitle.textContent = "Error al cargar datos de sets.";
        });

    // --- Poblar la lista ---
    function populateTracklist(sets) {
        console.log("Poblando tracklist..."); // LOG
        tracklistElement.innerHTML = '';
        sets.forEach((set, index) => {
            const li = document.createElement('li');
            li.className = 'track-item';
            li.dataset.index = index;
            li.innerHTML = `
                <img src="${set.cover_art_url || `/Artwork/${set.id}.webp`}" alt="${set.title} cover" class="track-item-cover">
                <div class="track-item-title-container">
                    <span class="track-item-title">${set.title}</span>
                </div>
                <span class="track-item-date">${set.date.split(' ')[0]}</span>
            `;
            tracklistElement.appendChild(li);
        });
        console.log(`Tracklist poblado con ${sets.length} items.`); // LOG
    }

    // LISTA MAESTRA DE TÚNELES (Añade aquí tus nuevas cuentas de Cloudflare en el futuro)
    const VLOITZ_CLUSTER = [
        "https://cdn-assets-storage-001.keitcazu2000.workers.dev",
        "https://cdn-assets-storage-002.lexprecreative.workers.dev",
        "https://cdn-assets-storage-003.keitcazu08.workers.dev"
    ];

    // --- Cargar un set ---
    function loadTrack(set, index) {

        // 🧹 CAMBIO DE CONTEXTO (Caso B): Si se carga un nuevo set, limpiar estado visual heredado
        if (typeof vloitzLaserCleanup === 'function') vloitzLaserCleanup();

        // --- AGREGA ESTO AQUÍ (INICIO) ---
        const audioEl = document.getElementById('audio-player');
        audioEl.crossOrigin = "anonymous";
        // --- FIN DEL AGREGADO ---

        console.log(`Cargando track ${index}: ${set.title}`); // LOG

        // --- INICIO: CERO CONFIGURACIÓN (Actualización HLS Nivel Dios) ---
        // Ahora buscamos el index.m3u8 primero. Si no existe, WaveSurfer fallará, lo cual es esperado si el set no está en HLS aún.


        // --- INICIO DE CONSTRUCTOR DE RUTAS HÍBRIDO (VLOITZ CLUSTER ENGINE) ---
        let hlsManifestUrl = "";

        if (set.server === "HF") {
            // Balanceador de Carga: Elegimos un túnel al azar del clúster
            const selectedTunnel = VLOITZ_CLUSTER[Math.floor(Math.random() * VLOITZ_CLUSTER.length)];
            hlsManifestUrl = `${selectedTunnel}/${set.id}/index.m3u8`;

            console.log(`%c[Cluster Manager] 🛰️ Túnel activo: ${selectedTunnel}`, "color: #94d2bd; font-size: 10px; font-style: italic;");
            console.log(`%c[Vloitz Engine] 🧊 CONECTANDO A BÓVEDA ETERNA (HF CLUSTER): ${set.id}`, "background: #005f73; color: #94d2bd; font-weight: bold; padding: 4px; border-radius: 3px;");
        } else {
            hlsManifestUrl = `${CLOUDFLARE_R2_URL}/${set.id}/index.m3u8`;
            console.log(`%c[Vloitz Engine] ⚡ CONECTANDO A ZONA RÁPIDA (R2): ${set.id}`, "background: #ee9b00; color: #001219; font-weight: bold; padding: 4px; border-radius: 3px;");
        }

        // --- MICRO-FIX: DETECTOR DE ESTADO DE RED (DIAGNÓSTICO CONTINUO) ---
        fetch(hlsManifestUrl, {
            method: 'HEAD'
        }).then(res => {
            console.log(`%c[Network Check] Recurso: ${set.id} | Estado: ${res.status} (${res.statusText})`, res.ok ? "color: #00ff00" : "color: #ff0000");
            if (!res.ok) console.warn(`⚠️ ALERTA: El recurso devolvió error ${res.status}. Verifica el Worker o CORS.`);
        }).catch(err => console.error("[Network Check] Error de conexión crítico:", err));
        // --- FIN DE CONSTRUCTOR DE RUTAS ---


        // Mantenemos el fallback por si en el futuro decides volver a usar archivos únicos
        const magicAudioUrl = set.audio_url || hlsManifestUrl;
        const magicPeaksUrl = set.peaks_url || `/peaks/${set.id}.json`;
        const magicCoverUrl = set.cover_art_url || `/Artwork/${set.id}.webp`;
        console.log(`[Cero Config HLS] Intentando cargar Manifest: ${magicAudioUrl}`);
        console.log(`[Cero Config] Picos: ${magicPeaksUrl}`);
        console.log(`[Cero Config] Portada: ${magicCoverUrl}`);
        // --- FIN: CERO CONFIGURACIÓN ---

        currentCoverArt.src = magicCoverUrl;

        // [VLOITZ FIX] Rescatar el botón de compartir antes de destruir el contenido
        const shareBtnSafe = document.getElementById('shareBtn');
        if (shareBtnSafe && shareBtnSafe.parentNode === currentTrackTitle) {
            document.querySelector('.player-details').appendChild(shareBtnSafe); // Lo ponemos a salvo
        }

        // =========================================================
        // 1. LÓGICA DE TÍTULO DUAL-SPAN (Arquitectura Responsive)
        // =========================================================
        const titleContainer = document.getElementById('current-track-title');

        if (titleContainer && set.title) {
            const fullTitle = set.title;
            // Regex blindado: Detecta guion normal (-), medio (–) o largo (—)
            const shortTitle = fullTitle.split(/\s*(?:—|-|–)\s*/)[0].trim();

            // INYECTAMOS COMO HTML (VITAL: Asegúrate de que ninguna otra línea sobreescriba esto)
            titleContainer.innerHTML = `
            <span class="title-desktop">${fullTitle}</span>
            <span class="title-mobile">${shortTitle}</span>
        `;
        }

        // =========================================================
        // 2. MOTOR DE TIEMPO RELATIVO
        // =========================================================
        const timestampEl = document.getElementById('current-track-timestamp');

        if (timestampEl && set.date) {
            const safeDate = new Date(set.date.replace(/-/g, '/'));
            const diffInSeconds = Math.round((safeDate - new Date()) / 1000);

            const rtf = new Intl.RelativeTimeFormat('es', {
                numeric: 'auto'
            });
            let timeText = "";
            const absDiff = Math.abs(diffInSeconds);

            if (absDiff < 60) {
                timeText = "hace unos segundos";
            } else if (absDiff < 3600) {
                timeText = rtf.format(Math.round(diffInSeconds / 60), 'minute');
            } else if (absDiff < 86400) {
                timeText = rtf.format(Math.round(diffInSeconds / 3600), 'hour');
            } else if (absDiff < 2592000) {
                timeText = rtf.format(Math.round(diffInSeconds / 86400), 'day');
            } else if (absDiff < 31536000) {
                timeText = rtf.format(Math.round(diffInSeconds / 2592000), 'month');
            } else {
                timeText = rtf.format(Math.round(diffInSeconds / 31536000), 'year');
            }

            timestampEl.textContent = timeText;
            timestampEl.setAttribute('data-date', set.date);
        } else if (timestampEl) {
            timestampEl.textContent = "";
        }


        currentSetIndex = index;

        // --- INICIO: SEO DINÁMICO INTELIGENTE ---
        // Verificamos si estamos en la URL raíz o en un enlace profundo
        const currentPath = window.location.pathname;
        const isHomepage = (currentPath === '/' || currentPath === '/index.html');
        // Asumiendo que usas URLSearchParams o tu URLController para obtener el ID de la URL
        const isDeepLink = window.location.search.includes('set=') || window.location.pathname.includes('/GDL');

        // SOLO inyectamos el SEO del set si el bot/usuario entró por una URL específica
        if (!isHomepage || isDeepLink) {
            // Cambia el título de la pestaña del navegador:
            document.title = `${set.title} | Vloitz`;

            // Cambia la descripción meta para los bots:
            let metaDescription = document.querySelector('meta[name="description"]');
            if (!metaDescription) {
                metaDescription = document.createElement('meta');
                metaDescription.name = "description";
                document.head.appendChild(metaDescription);
            }
            metaDescription.content = `Escucha el set completo de ${set.title} en formato de alta calidad sin interrupciones.`;
        }
        // --- FIN: SEO DINÁMICO INTELIGENTE ---

        // Resetear UI del reproductor
        totalDurationEl.textContent = '0:00';
        currentTimeEl.textContent = '0:00';
        playPauseBtn.disabled = true;

        // --- INICIO: CÓDIGO FALTANTE (Establecer icono inicial) ---
        if (playIcon) playIcon.style.display = 'block'; // Asegura que se muestre el icono de Play al cargar
        if (pauseIcon) pauseIcon.style.display = 'none'; // Asegura que Pause esté oculto
        // --- FIN: CÓDIGO FALTANTE ---

        console.log(`WaveSurfer intentará cargar: ${magicAudioUrl}`); // LOG

        // --- INICIO: MOTOR HLS Y PICOS UNIFICADO (Corrección de Flujo) ---
        // Esta sub-función asegura que el motor correcto se inicie después de intentar cargar los picos
        const initWaveSurfer = (peaks) => {
            if (magicAudioUrl.endsWith('.m3u8')) {
                console.log("[Motor HLS] Detectado formato segmentado. Iniciando hls.js...");
                const audioEl = document.getElementById('audio-player');

                // FIX VISUAL: Si hay picos, los inyectamos directamente en WaveSurfer sin pasarle la URL
                // Esto permite que dibuje la onda inmediatamente
                if (peaks) {
                    wavesurfer.load(null, peaks);
                }

                if (Hls.isSupported()) {
                    // 🛑 CIRUGÍA: Destruir el motor HLS viejo antes de crear uno nuevo (Aislado)
                    if (wavesurfer && wavesurfer.activeHlsInstance) {
                        wavesurfer.activeHlsInstance.destroy();
                        console.log("[Motor HLS] 🧹 Motor anterior destruido limpiamente de la memoria.");
                    }

                    const hls = new Hls({
                        debug: false,
                        enableWorker: true,
                        lowLatencyMode: false,
                        // 🛡️ Tolerancia extendida (20s) para sobrevivir a la saturación del Preloader Fantasma
                        fragLoadingTimeOut: 20000,
                        manifestLoadingTimeOut: 20000,
                        xhrSetup: function(xhr, url) {
                            xhr.withCredentials = false;
                        }
                    });

                    // Guardamos la instancia dentro de wavesurfer (ahora aislado), no en window
                    wavesurfer.activeHlsInstance = hls;

                    hls.loadSource(magicAudioUrl);
                    hls.attachMedia(audioEl);
                    hls.on(Hls.Events.MANIFEST_PARSED, function() {
                        console.log("[Motor HLS] Manifiesto atado a WaveSurfer correctamente.");
                        // Forzar el evento ready si no se cargaron picos pre-calculados
                        if (!peaks) wavesurfer.emit('ready');
                    });

                    // 🚑 MATRIZ DE REANIMACIÓN (RCP) PARA ERRORES FATALES
                    hls.on(Hls.Events.ERROR, function(event, data) {
                        if (data.fatal) {
                            console.error("[Motor HLS] Error fatal detectado:", data);
                            switch (data.type) {
                                case Hls.ErrorTypes.NETWORK_ERROR:
                                    // Micro-corte o inanición de red: Forzamos la reconexión al instante
                                    console.warn("%c[Motor HLS] 🚑 RCP Activado: Saturación de red. Forzando reconexión...", "color: #ffaa00; font-weight: bold;");
                                    hls.startLoad();
                                    break;
                                case Hls.ErrorTypes.MEDIA_ERROR:
                                    // Fragmento corrupto: Pedimos a HLS que purgue el buffer y lo intente de nuevo
                                    console.warn("%c[Motor HLS] 🚑 RCP Activado: Error de buffer. Intentando reparar audio...", "color: #ffaa00; font-weight: bold;");
                                    hls.recoverMediaError();
                                    break;
                                default:
                                    // Falla catastrófica del navegador
                                    console.error("%c[Motor HLS] 💀 Falla irrecuperable. El motor ha colapsado.", "color: #ff0000; font-weight: bold;");
                                    hls.destroy();
                                    break;
                            }
                        }
                    });
                } else if (audioEl.canPlayType('application/vnd.apple.mpegurl')) {
                    console.log("[Motor HLS] Usando soporte nativo (Safari/iOS)...");
                    audioEl.src = magicAudioUrl;
                    audioEl.addEventListener('loadedmetadata', () => {
                        if (!peaks) wavesurfer.emit('ready');
                    }, {
                        once: true
                    });
                } else {
                    console.error("[Motor HLS] Navegador no soporta HLS.");
                }
            } else {
                // Comportamiento original para archivos .flac sueltos
                if (peaks) wavesurfer.load(magicAudioUrl, peaks);
                else wavesurfer.load(magicAudioUrl);
            }
        };

        // Lógica de carga: Primero buscamos picos, luego iniciamos el motor
        if (magicPeaksUrl) {
            console.log(`[Cero Config] Buscando picos en: ${magicPeaksUrl}`);
            fetch(magicPeaksUrl)
                .then(response => {
                    if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
                    return response.json();
                })
                .then(peaksData => {
                    console.log("[Cero Config] Picos cargados correctamente.");
                    initWaveSurfer(peaksData.data);
                })
                .catch(error => {
                    console.warn("[Cero Config] Sin picos previos o error de carga. Fallback activado:", error.message);
                    initWaveSurfer(null);
                });
        } else {
            initWaveSurfer(null);
        }
        // --- FIN: MOTOR HLS Y PICOS UNIFICADO ---

        currentLoadedSet = set;
        if (typeof VLOITZ_DEV_MODE !== 'undefined' && VLOITZ_DEV_MODE) {
            window.currentLoadedSet = set;
        }
        updateMediaSessionMetadata(set);
        currentTrackNameForNotification = null;

        // 🌉 Inyección YTSyncBridge: Configuración al Vuelo
        const syncConfig = set.youtube_sync || {
            enabled: false
        };
        if (typeof YTSyncBridge !== 'undefined') YTSyncBridge.loadVideoConfig(syncConfig);

        // --- Cargar favoritos para ESTE set (v2) ---
        const setKey = currentLoadedSet.title; // Usar el título del set como clave
        if (!allFavorites[setKey]) {
            allFavorites[setKey] = []; // Inicializar si no existe
            console.log(`[Fav v2] Creando nueva entrada de favoritos para: ${setKey}`); // LOG
        }
        // Cargar los favoritos de este set en el 'Set' de memoria actual
        currentSetFavorites = new Set(allFavorites[setKey]);
        console.log(`[Fav v2] Favoritos cargados para "${setKey}":`, currentSetFavorites); // LOG
        // --- Fin carga favoritos v2 ---

        displayTracklist(set.tracklist || []);
        TrackNavigator.prepareTimestamps(set.tracklist || [], currentSetFavorites); // <-- AÑADIR ESTA LÍNEA
        updatePlayingHighlight();

        // --- GATILLO FASE 3 (SEO JSON-LD) ---
        SEOController.injectStructuredData(set);
    }


    // --- INICIO: Media Session API (Fase 3 - Modificada para Track Actual) ---
    function updateMediaSessionMetadata(set, currentTrackName = null) {
        if ('mediaSession' in navigator && set) {
            const trackTitle = currentTrackName || set.title;
            console.log(`[MediaSession] Actualizando metadatos. Set: "${set.title}", Track: "${trackTitle}"`);

            navigator.mediaSession.metadata = new MediaMetadata({
                title: trackTitle, // 🎵 La música actual toma el título principal para que Android la muestre en grande
                artist: set.title, // 🎧 El nombre del DJ Set pasa a ser el artista/subtítulo
                album: "Vloitz High Quality Set",
                artwork: [{
                    src: `${window.location.origin}/Artwork/${set.id}.webp`, // 🖼️ Ruta absoluta para que Android cargue la carátula sin fallos
                    sizes: '500x500',
                    type: 'image/webp'
                }, ]
            });
            console.log("[MediaSession] Metadatos aplicados.");
        } else {
            console.log("[MediaSession] API no soportada o 'set' no válido.");
        }
    }
    // --- FIN: Media Session API (Fase 3) ---

    // --- Resaltar activo ---
    function updatePlayingHighlight() {
        tracklistElement.querySelectorAll('.track-item').forEach(item => {
            item.classList.remove('playing');
        });
        const activeItem = tracklistElement.querySelector(`.track-item[data-index="${currentSetIndex}"]`);
        if (activeItem && wavesurfer && wavesurfer.isPlaying()) {
            activeItem.classList.add('playing');
            console.log(`Resaltando track ${currentSetIndex} como activo.`); // LOG
        }
    }

    // Formatear tiempo inteligente (Soporte para +1 Hora)
    function formatTime(seconds) {
        seconds = Number(seconds);
        if (isNaN(seconds) || seconds < 0) seconds = 0;

        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);

        const mDisplay = m < 10 ? (h > 0 ? '0' + m : m) : m; // Si hay hora, poner 0 al minuto (1:05:00)
        const sDisplay = s < 10 ? '0' + s : s;

        if (h > 0) {
            return `${h}:${mDisplay}:${sDisplay}`; // Formato H:MM:SS
        } else {
            return `${mDisplay}:${sDisplay}`; // Formato MM:SS
        }
    }

    // --- FUNCIÓN AUTO-FOCUS PLAYER (UX MEJORA) ---
    function focusPlayerCard() {
        // [CONFIGURACIÓN] Ajusta este valor a tu gusto.
        // + valor: El reproductor baja más.
        // - valor: El reproductor sube más (se pega al tope).
        const SCROLL_OFFSET_PX = 20; // <--- MODIFICA ESTO A GUSTO (80px suele dejar espacio para el header)

        const playerCard = document.querySelector('.player-card');
        if (!playerCard) return;

        // Cálculo matemático para posición absoluta suave
        const elementPosition = playerCard.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.scrollY - SCROLL_OFFSET_PX;

        window.scrollTo({
            top: offsetPosition,
            behavior: "smooth"
        });
        console.log("[UX] Enfocando reproductor automáticamente.");
    }

    // --- FUNCIÓN MAESTRA: AUTO-SCROLL TRACKLIST (DRY Refactor) ---
    function scrollTracklistToActive() {
        try {
            const container = currentTracklistElement;
            const activeTitle = container.querySelector('.track-title-playing');
            if (!activeTitle) return;
            const activeItem = activeTitle.closest('.current-tracklist-item');
            if (!activeItem) return;

            // Verificación de Viewport
            const rect = container.getBoundingClientRect();
            const isContainerPartiallyVisible = rect.top < (window.innerHeight || document.documentElement.clientHeight) && rect.bottom > 0;

            if (!isContainerPartiallyVisible) return;

            // Cálculo de Alineación Central
            const itemTopRel = activeItem.offsetTop - container.offsetTop;
            const scrollToTop = itemTopRel - (container.clientHeight / 2) + (activeItem.clientHeight / 2);

            // Bypass Inteligente: Respeta el bloqueo del Laser Engine si está activo
            if (container._originalScrollTo) {
                container._originalScrollTo.call(container, {
                    top: scrollToTop,
                    behavior: 'smooth'
                });
            } else {
                container.scrollTo({
                    top: scrollToTop,
                    behavior: 'smooth'
                });
            }
        } catch (error) {
            console.error("[AutoScroll v5] Error:", error);
        }
    }

    // --- Mostrar el tracklist del set actual ---
    function displayTracklist(tracklistData) {
        console.log("Mostrando tracklist para el set actual..."); // LOG
        currentTracklistElement.innerHTML = ''; // Limpiar lista anterior

        if (!tracklistData || tracklistData.length === 0) {
            currentTracklistElement.innerHTML = '<li>No hay tracklist disponible para este set.</li>';
            console.warn("No se encontró tracklist en los datos del set."); // LOG ADVERTENCIA
            return;
        }

        tracklistData.forEach((track, index) => {

            // Obtener el color asignado a este track (Texto Sólido)
            const trackColors = ColorController.getColor(index);

            const li = document.createElement('li');

            // Guardamos el color en el elemento para usarlo luego
            li.dataset.activeColor = trackColors.textColor;

            li.className = 'current-tracklist-item';
            li.dataset.time = track.time;
            li.dataset.index = index;

            // --- INYECCIÓN BLACKLIST (Fase 2 Visual) ---
            if (typeof BlacklistController !== 'undefined' && BlacklistController.isTrackBlacklisted(currentLoadedSet.id, track.title)) {
                li.classList.add('track-blacklisted');
                li.title = "Pista no disponible (Opt-Out Legal)";
            }
            // -------------------------------------------

            const displayTimeParts = track.time.split(':');
            let totalSeconds = 0;
            if (displayTimeParts.length === 2 && !isNaN(parseInt(displayTimeParts[0], 10)) && !isNaN(parseInt(displayTimeParts[1], 10))) {
                totalSeconds = parseInt(displayTimeParts[0], 10) * 60 + parseInt(displayTimeParts[1], 10);
            } else {
                console.warn(`Timestamp inválido en tracklist: ${track.time}`); // LOG ADVERTENCIA
            }

            const isFavorited = currentSetFavorites.has(totalSeconds); // v2: Comprobar contra el Set del set actual

            const displayTime = formatTime(totalSeconds);

            // NATIVA: Extracción Quirúrgica Avanzada v2 (Múltiples Artistas y Labels)
            let trackNameDisplay = track.title;
            let artistDisplay = "";

            if (track.title.includes(' - ')) {
                const partes = track.title.split(' - ');
                // Lógica Senior: Si hay más de 2 partes (Ej: Sello - Artistas, Con, Comas - Track)
                // detectamos si la segunda parte tiene comas (la lista de artistas).
                if (partes.length > 2 && partes[1].includes(',')) {
                    artistDisplay = partes.slice(0, 2).join(' - ').trim();
                    trackNameDisplay = partes.slice(2).join(' - ').trim();
                } else {
                    // Formato estándar: "Artista - Track" o "Artista - Track - Mix"
                    artistDisplay = partes[0].trim();
                    trackNameDisplay = partes.slice(1).join(' - ').trim();
                }
            } else if (track.title.includes('-')) {
                // Fallback de seguridad por si escribieron el guion sin espacios
                const partes = track.title.split('-');
                artistDisplay = partes[0].trim();
                trackNameDisplay = partes.slice(1).join('-').trim();
            }

            // HTML PLANO: Secuencia lógica estricta (Tiempo -> Emoji -> Título -> Artista -> Botones -> Estrella)
            li.innerHTML = `
                <span class="track-time">${displayTime}</span>
                <div class="track-info-wrapper">
                    <div class="track-title-row">
                        <span class="track-emoji">${track.emoji || ''}</span>
                        <span class="track-title">${trackNameDisplay}</span>
                    </div>
                    <span class="track-artist">${artistDisplay}</span>
                </div>
                <div class="action-group">
                    <button class="track-action-btn btn-copy" title="Copiar ID del track">
                        <svg viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M9.5 11v6"></path><path d="M12.5 11v6h1.5a3 3 0 0 0 0-6h-1.5z"></path></svg>
                    </button>
                    <button class="track-action-btn btn-search" title="Buscar ID en Beatport">
                        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><path d="M9.5 9v4"></path><path d="M12.5 9v4h1a2 2 0 0 0 0-4h-1z"></path></svg>
                    </button>
                </div>
                <button class="favorite-btn ${isFavorited ? 'favorited' : ''}" data-seconds="${totalSeconds}" title="Añadir/Quitar Favorito">
                    ${isFavorited ? '★' : '☆'}
                </button>
            `;
            currentTracklistElement.appendChild(li);

        });
        console.log(`Tracklist mostrado con ${tracklistData.length} items.`); // LOG

        filterFavoritesDisplay(); // Aplicar filtro al mostrar el tracklist

    }


    // =================================================================
    // 🛡️ SMART SNAP V11 DEFINITIVA: PLAN B + EL CONTRAGOLPE
    // =================================================================

    // 🧪 CONTROL DE VERSIÓN (Sin bloqueos)
    //alert("Vloitz 42.0 - PLAN B (Contragolpe Suave) Cargado");

    let recentSnapMemory = [];
    let recentRawClicks = []; // 🎯 PLAN B: Vector de huellas del francotirador
    let lastLandingTime = 0;

    // --- Función SeekWaveform (Requerida por Drag Logic) ---
    const seekWaveform = (clientX, rect, eventType) => {
        if (!wavesurfer) return false;

        const MOBILE_SMART_SNAP = true;
        const isMobile = globalPerformanceTier !== 'ALTA/PC';
        const now = performance.now();

        // Función auxiliar: El Contragolpe (Ancla el reproductor a su posición actual)
        const forceStay = () => {
            const currentProgress = wavesurfer.getCurrentTime() / wavesurfer.getDuration();
            wavesurfer.seekTo(currentProgress);
        };

        // -----------------------------------------------------------------
        // 🥋 1. FILTRADO SUAVE (Sin matar el navegador)
        // -----------------------------------------------------------------
        if (MOBILE_SMART_SNAP && isMobile) {
            if (eventType !== 'touchstart') {
                // Si es un despegue (touchend) muy rápido, lanzamos el ancla para que el nativo no nos reinicie
                if (now - lastLandingTime < 350) forceStay();
                return false;
            }
            if (now - lastLandingTime < 350) {
                // Spam de ametralladora detectado. Lanzamos el ancla.
                forceStay();
                return false;
            }
        }

        // -----------------------------------------------------------------
        // 📐 2. CÁLCULO DE LA BALDOSA FÍSICA Y VECTOR DE FRANCOTIRADOR
        // -----------------------------------------------------------------
        const wsWrapper = wavesurfer.getWrapper();
        const wsRect = wsWrapper.getBoundingClientRect();
        const x = Math.max(0, clientX - wsRect.left);
        let progress = Math.max(0, Math.min(1, x / wsRect.width));
        let rawTime = progress * wavesurfer.getDuration();

        let didSmartSnap = false;

        if (MOBILE_SMART_SNAP && isMobile && typeof TrackNavigator !== 'undefined' && TrackNavigator.isReady()) {

            const currentTime = wavesurfer.getCurrentTime();
            const isRapidSequence = (now - lastLandingTime < 2500);

            let clickedHouse = TrackNavigator.getCurrentTrackStartTime(rawTime, false);

            // Sincronización de Realidad vs Memoria
            let trueCurrentHouse = TrackNavigator.getCurrentTrackStartTime(currentTime, false);
            if (isRapidSequence && recentSnapMemory.length > 0) {
                trueCurrentHouse = recentSnapMemory[recentSnapMemory.length - 1];
            }

            const isSameHouse = (t1, t2) => Math.abs(t1 - t2) < 1.0;

            // 🎯 PLAN B (LA DEFENSA ABSOLUTA DE HUELLAS):
            const isHardwareSpam = isRapidSequence && recentRawClicks.some(pastClick => Math.abs(pastClick - rawTime) < 4.0);

            if (isHardwareSpam) {
                // 🥋 CONTRAGOLPE: Es spam en la misma huella. Lo anclamos.
                console.log("%c[Smart Snap] 🛑 Spam del Plan B. Lanzando Ancla.", "color: #FFA500; font-size: 10px; font-weight: bold;");
                lastLandingTime = now;
                forceStay();
                return false;
            }

            // A. Gravedad de la Baldosa
            const nextHouseFromClick = TrackNavigator.findNextTimestamp(rawTime, false);
            if (clickedHouse !== null && nextHouseFromClick !== null) {
                if (Math.abs(rawTime - nextHouseFromClick) < Math.abs(rawTime - clickedHouse)) {
                    clickedHouse = nextHouseFromClick;
                }
            }

            // -----------------------------------------------------------------
            // 🦶 3. REGLAS DIOS DE DIRECCIÓN (CERO REINICIOS)
            // -----------------------------------------------------------------
            if (isSameHouse(clickedHouse, trueCurrentHouse)) {
                // Si toca la misma casa, lo empujamos a la siguiente.
                const forceNext = TrackNavigator.findNextTimestamp(trueCurrentHouse, false);
                if (forceNext !== null) {
                    clickedHouse = forceNext;
                    console.log(`%c[Smart Snap] 🚀 Pie Gordo -> Avance estricto a: ${formatTime(clickedHouse)}`, "background: #FF4B2B; color: #fff; font-weight: bold; padding: 2px;");
                } else {
                    // 🥋 CONTRAGOLPE: Última baldosa. Lo anclamos.
                    lastLandingTime = now;
                    console.log("%c[Smart Snap] 🛑 Última baldosa. Lanzando Ancla.", "color: #FFA500; font-size: 10px;");
                    forceStay();
                    return false;
                }
            }

            const isHistorial = recentSnapMemory.some(t => isSameHouse(t, clickedHouse));
            if (isHistorial && isRapidSequence) {
                // 🥋 CONTRAGOLPE: Resbalón al pasado. Lo anclamos.
                lastLandingTime = now;
                console.log(`%c[Smart Snap] 🛡️ Resbalón al historial. Lanzando Ancla.`, "color: #FFA500; font-weight: bold; font-size: 10px;");
                forceStay();
                return false;
            }

            // -----------------------------------------------------------------
            // 💾 4. ACTUALIZAR VECTORES Y EJECUTAR
            // -----------------------------------------------------------------
            if (clickedHouse !== null) {
                if (recentSnapMemory.length === 0 && trueCurrentHouse !== null) {
                    recentSnapMemory.push(trueCurrentHouse);
                }
                if (recentSnapMemory.length === 0 || !isSameHouse(recentSnapMemory[recentSnapMemory.length - 1], clickedHouse)) {
                    recentSnapMemory.push(clickedHouse);
                }
                while (recentSnapMemory.length > 4) recentSnapMemory.shift();

                // 🎯 Actualizamos Vector del Plan B (Huellas)
                recentRawClicks.push(rawTime);
                while (recentRawClicks.length > 5) recentRawClicks.shift();

                lastLandingTime = now;
                rawTime = clickedHouse;
                progress = rawTime / wavesurfer.getDuration();
                didSmartSnap = true;
                console.log(`%c[Smart Snap] 🎯 Aterrizaje Confirmado: ${formatTime(rawTime)}`, "background: #1DB954; color: #000; font-weight: bold; padding: 2px;");
            }
        }

        // --- INYECCIÓN SNAP MAGNÉTICO ---
        if (!didSmartSnap && wavesurfer.getDuration() > 0 && typeof PrecacheController !== 'undefined' && PrecacheController.getFuzzyTime) {
            const correctedTime = PrecacheController.getFuzzyTime(rawTime);
            progress = Math.max(0, Math.min(1, correctedTime / wavesurfer.getDuration()));
        }

        try {
            wavesurfer.seekTo(progress);
            const duration = wavesurfer.getDuration();
            if (duration > 0 && currentTimeEl) {
                currentTimeEl.textContent = formatTime(progress * duration);
            }
            return true;
        } catch (error) {
            console.error(`[Drag v11] Error en seekTo:`, error);
            return false;
        }
    };

    // --- FASE 0: Handlers Globales extraídos y aislados localmente ---

    // --- INICIO: Configuración de Acciones Media Session (Repurposed Seek) ---
    if ('mediaSession' in navigator) {
        // LOG MODIFICADO para reflejar los nuevos handlers
        console.log("[MediaSession] Configurando manejadores de acciones (play/pause y seek como skip).");
        try {
            navigator.mediaSession.setActionHandler('play', () => {
                console.log("[MediaSession] Acción 'play' recibida."); // LOG
                if (wavesurfer) wavesurfer.play();
            });
            navigator.mediaSession.setActionHandler('pause', () => {
                console.log("[MediaSession] Acción 'pause' recibida."); // LOG
                if (wavesurfer) wavesurfer.pause();
            });

            // --- INICIO: REEMPLAZO - Usar Seek para Saltar Pista ---
            // ELIMINAMOS setActionHandler('nexttrack', ...)
            // ELIMINAMOS setActionHandler('previoustrack', ...)

            // AÑADIMOS seekforward para llamar a goToNext
            navigator.mediaSession.setActionHandler('seekforward', () => {
                console.log("[MediaSession] Acción 'seekforward' (usada como next) recibida."); // LOG MODIFICADO
                TrackNavigator.goToNext();
            });
            // AÑADIMOS seekbackward para llamar a goToPrevious
            navigator.mediaSession.setActionHandler('seekbackward', () => {
                console.log("[MediaSession] Acción 'seekbackward' (usada como previous) recibida."); // LOG MODIFICADO
                TrackNavigator.goToPrevious();
            });

            // AÑADIMOS nexttrack y previoustrack para compatibilidad Android/MagicOS
            navigator.mediaSession.setActionHandler('nexttrack', () => {
                TrackNavigator.goToNext();
            });
            navigator.mediaSession.setActionHandler('previoustrack', () => {
                TrackNavigator.goToPrevious();
            });
            // --- FIN: REEMPLAZO ---

        } catch (error) {
            console.error("[MediaSession] Error al configurar manejadores:", error); //LOG ERROR
        }
    }
    // --- FIN: Configuración de Acciones Media Session ---

    // --- Eventos de WaveSurfer ---

    wavesurfer.on('ready', () => {

        const duration = wavesurfer.getDuration();
        totalDurationEl.textContent = formatTime(duration);
        currentTimeEl.textContent = formatTime(0);
        playPauseBtn.disabled = false;
        if (playIcon) playIcon.style.display = 'block';
        if (pauseIcon) pauseIcon.style.display = 'none';

        // [VLOITZ FIX] Rescatar el botón nuevamente antes de poner el título final
        const shareBtnSafe2 = document.getElementById('shareBtn');
        if (shareBtnSafe2 && shareBtnSafe2.parentNode === currentTrackTitle) {
            document.querySelector('.player-details').appendChild(shareBtnSafe2);
        }

        // --- VLOITZ DUAL-SPAN FIX (Evento Ready Blindado) ---
        const readyTitle = allSets[currentSetIndex]?.title || "Set Listo";
        const titleContainerReady = document.getElementById('current-track-title');

        if (titleContainerReady) {
            const shortReadyTitle = readyTitle.split(/\s*(?:—|-|–)\s*/)[0].trim();
            titleContainerReady.innerHTML = `
                <span class="title-desktop">${readyTitle}</span>
                <span class="title-mobile">${shortReadyTitle}</span>
            `;
        }
        console.log("WaveSurfer listo para track:", readyTitle); // LOG ÉXITO

        // ==========================================================================
        // [MODULE START] VLOITZ UI: Reposicionamiento Dinámico Botón Compartir (PC)
        // Ajuste v4: Final Precision Fix (+1px Gap en CSS)
        // ==========================================================================
        const shareBtn = document.querySelector('.share-btn-floating');
        const titleContainer = document.getElementById('current-track-title');

        if (window.innerWidth > 768 && shareBtn && titleContainer) {

            Object.assign(titleContainer.style, {
                display: 'flex',
                alignItems: 'center',
                overflow: 'visible'
            });

            Object.assign(shareBtn.style, {
                position: 'static',
                marginLeft: '0', // <--- El gap del CSS ahora hace el trabajo
                flexShrink: '0',
                transform: 'scale(1.15)',
                opacity: '1'
            });

            titleContainer.appendChild(shareBtn);

            console.log("%c[Vloitz UI] 🎯 Perfección alcanzada: 7px gap aplicado.", "color: #1DB954; font-weight: bold;");
        }
        // ==========================================================================
        // [MODULE END] VLOITZ UI

        // --- FASE 8: Inicializar Espectro según preferencia ---
        toggleSpectrumState(); // Esto llamará a paintWaveformRegions si es true

        // --- DISPARADOR PHANTOM PRELOADER ---
        // Esperamos 3 segundos de reposo tras el 'ready' para no saturar el inicio
        setTimeout(() => {
            if (typeof TracklistPreloader !== 'undefined' && currentLoadedSet) {
                TracklistPreloader.start(currentLoadedSet);
            }
        }, 3000);

        // --- INICIO: Lógica Deep Linking Time Seek (Fase 3.2) ---
        // Verificamos si hay un tiempo pendiente en la URL Y si es la primera carga (para no saltar en loops)
        const params = URLController.getParams();

        // Solo saltamos si el tiempo NO es nulo, es >= 0, y el ID coincide
        if (params.timestamp !== null && params.timestamp >= 0 && params.setId === currentLoadedSet.id) {

            // Hack de seguridad: Verificamos si ya "saltamos" para no hacerlo infinitamente si el usuario da play/pause
            if (!window.hasDeepLinkSeeked) {
                const duration = wavesurfer.getDuration();
                if (duration > 0) {
                    const progress = params.timestamp / duration;
                    console.log(`[DeepLink] 🚀 Saltando al segundo ${params.timestamp} (Progreso: ${progress.toFixed(4)})`);
                    wavesurfer.seekTo(progress);

                    // Intento de Auto-Play (puede ser bloqueado por el navegador)
                    wavesurfer.play().catch(e => console.warn("[DeepLink] Auto-Play bloqueado por navegador:", e));

                    window.hasDeepLinkSeeked = true; // Marcar como "saltado" para esta sesión
                }
            }
        }
        // --- FIN: Lógica Deep Linking Time Seek ---

        // ========================================================
        // 🛡️ ESCUDO DE INICIO Y REESCRITOR DE URL (DEEP LINKING)
        // ========================================================
        const path = window.location.pathname;
        const urlParams = new URLSearchParams(window.location.search);
        const setIdParams = urlParams.get('set');
        const slug = urlParams.get('slug');
        const exactTime = urlParams.get('t');

        if (setIdParams && !path.includes('/share/')) {
            let cleanSeoUrl = slug ? `/share/${setIdParams}/${slug}/` : `/share/${setIdParams}/`;
            if (exactTime) cleanSeoUrl += `?t=${exactTime}`;
            window.history.replaceState({}, document.title, cleanSeoUrl);
            console.log(`[UX/SEO] 🧹 URL transformada a SEO respetando timestamp: ${cleanSeoUrl}`);
        } else if (path.includes('/share/')) {
            // 🛡️ ESCUDO INTELIGENTE: Eliminamos el ?t= de la barra, pero CONSERVAMOS el slug del track
            const pathParts = path.split('/').filter(Boolean);
            if (pathParts[0] === 'share' && pathParts.length >= 2) {
                const currentSetId = pathParts[1];
                const currentSlug = pathParts[2]; // Puede existir o no

                if (currentSlug && exactTime) {
                    const cleanTrackUrl = `/share/${currentSetId}/${currentSlug}/`;
                    window.history.replaceState({}, document.title, cleanTrackUrl);
                    console.log(`[UX/SEO] 🛡️ Timestamp oculto. Slug conservado: ${cleanTrackUrl}`);
                }
            }
        }

        // 🛑 NUEVO: Damos 1 segundo de inmunidad para que el salto de Deep Link se complete
        setTimeout(() => {
            window.vloitzStartupShield = false;
        }, 1000);

    }); // <-- Aquí termina tu wavesurfer.on('ready', ...)

    wavesurfer.on('loading', (percent) => {
        console.log(`WaveSurfer cargando: ${percent}%`); // LOG PROGRESO
        currentTrackTitle.textContent = `Cargando: ${allSets[currentSetIndex]?.title || 'Set'} (${percent}%)`;
    });

    wavesurfer.on('error', (err) => {
        // FIX CRÍTICO: WaveSurfer emite 'undefined' cuando HLS toma el control del audio.
        if (!err) {
            console.warn("[Motor HLS] Ignorando evento de red nativo (HLS.js tiene el control).");
            return;
        }
        console.error('Error de WaveSurfer al cargar audio:', err); // LOG ERROR
        currentTrackTitle.textContent = `Error: ${err.message || err}`;
        playPauseBtn.textContent = '❌';
        playPauseBtn.disabled = true;
    });

    wavesurfer.on('timeupdate', (currentTime) => {
        // 🛡️ [HACK] Escudo Anti-Thrashing: Si el Laser Trackpad V8 está en uso, abortamos
        if (window.isLaserActive) return;

        // Solo actualiza el tiempo real si no estamos haciendo preview con el mouse
        if (!isHoveringWaveform) {
            currentTimeEl.textContent = formatTime(currentTime);
        }

        // 🧠 LEY DE ORO 3 & CUENTA REGRESIVA VIVA DEL DELTA (Fase Final Absoluta)
        if (typeof VloitzLaserEngine !== 'undefined') {
            const laser = VloitzLaserEngine.getState();
            if (laser && laser.sessionActive) {

                // 🛡️ Blindaje de Arrastre: Ignoramos auto-limpieza mientras el dedo esté activo
                if (!laser.active) {

                    // 1. CONDICIÓN DE AUTO-LIMPIEZA (Solo aplica para viajes al FUTURO)
                    // Si el marcador está en el pasado, la canción se aleja, por lo que NO chocarán.
                    if (laser.targetTime > laser.baseTime && currentTime >= laser.targetTime) {
                        console.log("%c[Laser Engine] ⏱️ El tiempo alcanzó el marcador futuro. Intención caducada.", "color: #ffaa00;");
                        window.vloitzLaserCleanup(true);
                    }

                    // 2. CUENTA REGRESIVA DINÁMICA DEL DELTA (Modo Espera / Contemplación)
                    else if (window.vloitzHud && window.vloitzHud.style.display !== 'none') {
                        // Restamos el tiempo actual de reproducción al destino fijo para obtener el delta real decreciente
                        const dynamicDeltaSecs = laser.targetTime - currentTime;

                        if (Math.abs(dynamicDeltaSecs) < 0.5) {
                            window.vloitzLaserCleanup(true); // Si lo dejas casi pegado al reproductor, se limpia
                        } else {
                            const sign = dynamicDeltaSecs >= 0 ? '+' : '-';
                            const absSecs = Math.abs(dynamicDeltaSecs);
                            const m = Math.floor(absSecs / 60);
                            const s = Math.floor(absSecs % 60);
                            const deltaStr = `${sign}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

                            // El destino (ej. 25:25) se mantiene estático, solo se actualiza el delta en vivo
                            const targetStr = formatTime(laser.targetTime);

                            window.vloitzHud.innerHTML = `<span style="color:#1DB954;">${deltaStr}</span> &nbsp;|&nbsp; <span style="color:#b3b3b3;">${targetStr}</span>`;
                        }
                    }
                }
            }
        }

        // --- GATILLO BLACKLIST (Fase 2) ---
        if (typeof BlacklistController !== 'undefined' && wavesurfer.getDuration() > 0) {
            BlacklistController.checkAndSkip(currentTime, wavesurfer.getDuration(), wavesurfer);
        }
        // ----------------------------------

        // --- INICIO: Lógica para actualizar track en Media Session ---
        if (currentLoadedSet && currentLoadedSet.tracklist && currentLoadedSet.tracklist.length > 0) {
            let foundTrackName = null;
            let foundTrackIndex = null;
            // Iterar tracklist para encontrar el track actual
            // Importante: Asumimos que tracklist está ordenado por tiempo
            for (let i = currentLoadedSet.tracklist.length - 1; i >= 0; i--) {
                const track = currentLoadedSet.tracklist[i];
                const updateTimeParts = track.time.split(':');
                let trackStartTimeSeconds = 0;
                if (updateTimeParts.length === 2) {
                    trackStartTimeSeconds = parseInt(updateTimeParts[0], 10) * 60 + parseInt(updateTimeParts[1], 10);
                }

                if (currentTime >= trackStartTimeSeconds) {
                    foundTrackName = track.title;
                    foundTrackIndex = i;
                    break; // Salir del bucle una vez encontrado
                }
            }
            // Si encontramos un track y es diferente al último mostrado, actualizamos
            if (foundTrackName && foundTrackName !== currentTrackNameForNotification) {

                // 🛡️ ESCUDO DE INICIO: Si es la primera vez que detectamos el track al cargar la página (Deep Link),
                // solo lo guardamos y NO reseteamos la URL para conservar la ruta con la que llegó el usuario.
                if (currentTrackNameForNotification === null) {
                    console.log(`[MediaSession TimeUpdate] Track inicial detectado (Deep Link): "${foundTrackName}"`);
                    currentTrackNameForNotification = foundTrackName;
                    updateMediaSessionMetadata(currentLoadedSet, currentTrackNameForNotification);

                    // Aun siendo la primera vez, necesitamos aplicar el resaltado visual y el auto-scroll inicial
                    // 1. Limpiar todos los resaltados anteriores (Clase y Color)
                    currentTracklistElement.querySelectorAll('.track-title.track-title-playing').forEach(el => {
                        el.classList.remove('track-title-playing');
                        el.style.color = '';
                    });

                    // 2. Aplicar el resaltado inicial
                    const initialActiveItem = currentTracklistElement.querySelector(`.current-tracklist-item[data-index="${foundTrackIndex}"]`);
                    if (initialActiveItem) {
                        const titleElement = initialActiveItem.querySelector('.track-title');
                        if (titleElement) {
                            titleElement.classList.add('track-title-playing');
                            if (isSpectrumActive && initialActiveItem.dataset.activeColor) {
                                titleElement.style.color = initialActiveItem.dataset.activeColor;
                            }
                        }
                    }
                    return; // <--- Cortamos aquí para que la URL profunda del usuario quede intacta al entrar
                }

                console.log(`[MediaSession TimeUpdate] Cambio de track detectado: "${foundTrackName}"`); // LOG
                currentTrackNameForNotification = foundTrackName; // Guardar el nuevo nombre
                updateMediaSessionMetadata(currentLoadedSet, currentTrackNameForNotification); // Actualizar notificación

                // 🧠 LIMPIEZA DINÁMICA ESTRICTA: Cambio de Pista Genuino (Slug Matching)
                if (currentLoadedSet && window.vloitzStartupShield === false) {
                    const cleanSetUrl = `/share/${currentLoadedSet.id}/`;
                    const pathParts = window.location.pathname.split('/').filter(Boolean);
                    const currentUrlSlug = pathParts[2]; // Ej: 'franco-schmidt-tornasolado'

                    if (currentUrlSlug) {
                        // Generar el slug de la pista actual que está sonando para comparar
                        const currentTrackSlug = foundTrackName.toString().toLowerCase()
                            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                            .replace(/[^a-z0-9]+/g, "-")
                            .replace(/^-+|-+$/g, "");

                        // Si el slug de la URL NO coincide con la pista que está sonando, limpiamos a la raíz
                        if (currentUrlSlug !== currentTrackSlug) {
                            window.history.replaceState({}, document.title, cleanSetUrl);
                            console.log(`[UX Avanzado] 🧹 Avance natural detectado. URL limpiada a la raíz: ${cleanSetUrl}`);
                        }
                    } else if (window.location.search !== '') {
                        // Limpiar variables residuales si estamos en la raíz
                        window.history.replaceState({}, document.title, cleanSetUrl);
                    }
                }

                // --- INICIO: NUEVO CÓDIGO DE RESALTADO ---

                // 1. Limpiar todos los resaltados anteriores (Clase y Color)
                currentTracklistElement.querySelectorAll('.track-title.track-title-playing').forEach(el => {
                    el.classList.remove('track-title-playing');
                    el.style.color = ''; // Quitar color forzado
                });

                // 2. Aplicar el nuevo resaltado usando el índice que guardamos
                const newActiveItem = currentTracklistElement.querySelector(`.current-tracklist-item[data-index="${foundTrackIndex}"]`);
                if (newActiveItem) {

                    const titleElement = newActiveItem.querySelector('.track-title');
                    if (titleElement) {
                        titleElement.classList.add('track-title-playing');
                        // Aplicar el color específico del track
                        // Solo aplicar color si el modo Espectro está activo
                        if (isSpectrumActive && newActiveItem.dataset.activeColor) {
                            titleElement.style.color = newActiveItem.dataset.activeColor;
                        }
                        console.log(`[Highlight] Resaltando track: ${foundTrackName}`);
                    }

                    // --- INICIO: Auto-Scroll al track activo (v5: Center Align) ---
                    scrollTracklistToActive();
                    // --- FIN: Auto-Scroll ---

                }
                // --- FIN: NUEVO CÓDIGO DE RESALTADO ---

            } else if (!foundTrackName && currentTrackNameForNotification !== null) {
                // Caso borde: Si el tiempo es menor al primer track (ej: intro), reseteamos
                console.log("[MediaSession TimeUpdate] Reseteando nombre de track (intro?)"); // LOG
                currentTrackNameForNotification = null;
                updateMediaSessionMetadata(currentLoadedSet, null); // Actualizar notificación

                // --- AÑADE ESTO PARA LIMPIAR EL RESALTADO ---
                currentTracklistElement.querySelectorAll('.track-title.track-title-playing').forEach(el => {
                    el.classList.remove('track-title-playing');
                });

            }
        }
        // --- FIN: Lógica Media Session ---

        // --- INICIO: Nueva Función Auto-Loop (Refactorización v6) ---
        function handleAutoLoopJump(currentTime) {
            const isFavoritesModeActive = favToggleCheckbox && favToggleCheckbox.checked;

            // Solo actuar si AMBOS botones están activos, Nav está listo Y no estamos ya saltando
            if (isAutoLoopActive && isFavoritesModeActive && TrackNavigator.isReady() && !isSeekingViaAutoLoop) {

                const currentFavStartTime = TrackNavigator.getCurrentTrackStartTime(currentTime, true);

                if (currentFavStartTime !== null) {
                    const trackEndTime = TrackNavigator.getTrackEndTime(currentFavStartTime, wavesurfer.getDuration());

                    if (trackEndTime !== null) {
                        const calculatedJumpTime = trackEndTime - TrackNavigator.AUTOLOOP_JUMP_SECONDS_BEFORE_END;

                        // CONDICIÓN: Verificar si estamos DENTRO de la ventana de salto
                        if (currentTime >= calculatedJumpTime) {
                            console.log(`%c[AutoLoop Trigger v6] Condición Cumplida! Time:${currentTime.toFixed(4)} >= JumpAt:${calculatedJumpTime.toFixed(4)}`, "color: lightgreen; font-weight: bold;"); // Log Mantenido

                            const nextFavTimestamp = TrackNavigator.findNextTimestamp(currentFavStartTime, true);
                            console.log(`[AL FoundNext] NextFav: ${nextFavTimestamp !== null ? nextFavTimestamp.toFixed(2)+'s' : 'null'}`); // Log Mantenido

                            if (nextFavTimestamp !== null && nextFavTimestamp !== currentFavStartTime) {
                                console.log(`[AL Set Seeking TRUE] Antes de llamar a seekToTimestamp.`); // Log Mantenido
                                isSeekingViaAutoLoop = true;
                                console.log(`[AL ---> Saltando a ${nextFavTimestamp.toFixed(2)}s <---]`); // Log Mantenido
                                TrackNavigator.seekToTimestamp(nextFavTimestamp);
                            } else {
                                console.warn(`[AL No Jump] nextFav es null o igual a currentFav.`); // Log Mantenido
                            }
                        } // Fin if currentTime >= calculatedJumpTime
                    } // Fin if trackEndTime
                } // Fin if currentFavStartTime
            } // Fin if AutoLoop Activo
        }
        // --- FIN: Nueva Función Auto-Loop ---

        // --- INICIO: Llamada a Lógica Auto-Bucle (Refactorización v6) ---
        handleAutoLoopJump(currentTime);
        // --- FIN: Llamada a Lógica Auto-Bucle ---

        // Actualizar el tiempo anterior SIEMPRE al final del bloque timeupdate
        previousTimeForAutoLoop = currentTime;



    }); // Fin de timeupdate

    wavesurfer.on('seeking', (currentTime) => {
        currentTimeEl.textContent = formatTime(currentTime);
        console.log(`Seeking a: ${formatTime(currentTime)}`); // LOG

        // 🧹 CAMBIO DE CONTEXTO (Casos C y D): Limpiar si el usuario salta por otro medio
        if (typeof vloitzLaserCleanup === 'function') vloitzLaserCleanup();
    });

    // 🌉 NUEVO: Disparador instantáneo de YTSyncBridge ante cualquier salto del usuario
    wavesurfer.on('seek', () => {
        if (wavesurfer && wavesurfer.isPlaying()) {
            const currentMasterTime = wavesurfer.getCurrentTime();
            if (typeof YTSyncBridge !== 'undefined') {
                YTSyncBridge.sync(currentMasterTime);
            }
        }
    });

    // --- INICIO: Resetear Bandera de AutoLoop (Fase 4 Corrección) ---
    wavesurfer.on('seek', () => {
        // Log SIEMPRE que ocurra un seek
        const timeAfterSeek = wavesurfer.getCurrentTime();
        console.log(`[Event SEEK] Seek completado. Tiempo actual AHORA: ${timeAfterSeek.toFixed(4)}s. Bandera Seeking ERA: ${isSeekingViaAutoLoop}`);

        if (isSeekingViaAutoLoop) {
            console.log("[Event SEEK - AutoLoop] Era un salto automático. Reseteando bandera isSeekingViaAutoLoop a FALSE.");
            isSeekingViaAutoLoop = false; // <-- Resetear bandera DESPUÉS del salto
            // Verificamos el tiempo otra vez por si acaso cambió mínimamente
            const timeAfterReset = wavesurfer.getCurrentTime();
            console.log(`[Event SEEK - AutoLoop] Bandera reseteada. Tiempo actual DESPUÉS del reseteo: ${timeAfterReset.toFixed(4)}s`);
        }
    });
    // --- FIN: Resetear Bandera ---

    wavesurfer.on('play', () => {
        if (playIcon) playIcon.style.display = 'none'; // Oculta Play
        if (pauseIcon) pauseIcon.style.display = 'block'; // Muestra Pause
        updatePlayingHighlight();
        console.log("Evento: Play"); // LOG
        if (typeof YTSyncBridge !== 'undefined') YTSyncBridge.play(); // 🌉 YTSyncBridge

        // --- UX TÍTULO: Mostrar track solo cuando hay interacción real ---
        if (currentLoadedSet) {
            document.title = `▶ ${currentLoadedSet.title} | Vloitz`;
        }

        // VLOITZ ENGINE: Encender Agujero Negro (Succión)
        if (typeof PortadaVisualEngine !== 'undefined' && PortadaVisualEngine.setPlayState) {
            PortadaVisualEngine.setPlayState(true);
        }

        // --- 🧠 NUEVO: GATILLO INTELIGENTE PWA ---
        if (!pwaPromptTriggered) {
            pwaPromptTriggered = true; // Aseguramos que el cronómetro solo inicie una vez
            console.log(`[UX] Usuario enganchado (Play). Iniciando cuenta regresiva silenciosa de ${PWA_CONFIG.INITIAL_DELAY / 1000}s para ofrecer la App...`);

            // Mantenemos tu delay original intacto
            setTimeout(async () => {

                // 1. El Radar evalúa si ya la tiene instalada
                const isReminderShown = await checkAndShowReminder();

                // 2. Si NO se mostró el recordatorio, disparamos la invitación de instalación
                if (!isReminderShown) {
                    if (deferredPrompt || (isIos && !isInStandaloneMode)) {
                        showStickyPrompt();
                        console.log("[UX] Mostrando invitación de App tras interacción.");
                    }
                }

            }, PWA_CONFIG.INITIAL_DELAY); // Usa el tiempo que definas en PWA_CONFIG
        }
        // -----------------------------------------
    });
    wavesurfer.on('pause', () => {
        if (playIcon) playIcon.style.display = 'block'; // Muestra Play
        if (pauseIcon) pauseIcon.style.display = 'none'; // Oculta Pause
        updatePlayingHighlight(); // Quitar resaltado
        console.log("Evento: Pause"); // LOG
        if (typeof YTSyncBridge !== 'undefined') YTSyncBridge.pause(); // 🌉 YTSyncBridge

        // --- UX TÍTULO: Restaurar marca corporativa ---
        document.title = "Vloitz - High Quality Sets";

        // VLOITZ ENGINE: Apagar Agujero Negro (Modo Reposo)
        if (typeof PortadaVisualEngine !== 'undefined' && PortadaVisualEngine.setPlayState) {
            PortadaVisualEngine.setPlayState(false);
        }
    });

    wavesurfer.on('finish', () => {
        window.vloitzLaserCleanup(true); // 🛡️ MATRIZ COLAPSO: Limpieza por avance de set
        console.log("Evento: Finish (track terminado)"); // LOG
        if (playIcon) playIcon.style.display = 'block';
        if (pauseIcon) pauseIcon.style.display = 'none';

        // VLOITZ ENGINE: Apagar Agujero Negro (Modo Reposo)
        if (typeof PortadaVisualEngine !== 'undefined' && PortadaVisualEngine.setPlayState) {
            PortadaVisualEngine.setPlayState(false);
        }
        const nextIndex = (currentSetIndex + 1) % allSets.length;
        console.log(`Cargando siguiente track: ${nextIndex}`); // LOG
        if (allSets.length > 0) {

            // 🔄 NUEVO: Actualizar la URL al avanzar automáticamente al siguiente Set
            const nextSetId = allSets[nextIndex].id;
            window.history.replaceState({}, document.title, `/share/${nextSetId}/`);
            console.log(`[UX Avanzado] Avance automático de Set. URL actualizada a: /share/${nextSetId}/`);

            loadTrack(allSets[nextIndex], nextIndex);
            wavesurfer.once('ready', () => {
                console.log("Siguiente track listo, reproduciendo..."); // LOG
                wavesurfer.play();
            });
        }
    });

    // --- NUEVO v6 Stable Final (Merged): Lógica Drag-to-Seek ---
    const waveformInteractionElement = document.getElementById('waveform');

    if (waveformInteractionElement && wavesurfer) {
        console.log("[Drag v6 Final Merged] Añadiendo listeners TÁCTILES v6."); // LOG

        // --- INICIO FASE 1: Inyección del HUD y Puntero Fantasma ---
        if (!window.vloitzHud) {
            const hud = document.createElement('div');
            hud.id = 'vloitz-hud';
            const titleEl = document.getElementById('current-track-title');

            if (titleEl && titleEl.parentElement) {
                titleEl.parentElement.style.position = 'relative'; // Escudo para posición absoluta
                titleEl.parentElement.appendChild(hud);
            } else {
                document.body.appendChild(hud);
            }
            window.vloitzHud = hud;
        }
        if (!window.vloitzGhostPointer && waveformInteractionElement.parentElement) {
            const pointer = document.createElement('div');
            pointer.id = 'vloitz-ghost-pointer';
            waveformInteractionElement.parentElement.appendChild(pointer);
            window.vloitzGhostPointer = pointer;
        }
        // --- FIN FASE 1 ---

        // --- INICIO FASE 0: Handlers Legacy Encapsulados Localmente ---
        const handleWaveformTouchMove = (moveEvent) => {
            console.log("[Drag v7 Refactored] handleWaveformTouchMove INICIO."); // LOG
            if (!isDraggingWaveformTouch) {
                console.log("[Drag v7 Refactored] Move ignorado: isDragging false.");
                return;
            }
            moveEvent.preventDefault(); // Prevenir scroll
            if (moveEvent.touches && moveEvent.touches.length > 0) {
                const wavesurferElement = wavesurfer.getWrapper();
                const rect = wavesurferElement.getBoundingClientRect();
                seekWaveform(moveEvent.touches[0].clientX, rect, "touchmove"); // Llamar a seekWaveform
            } else {
                console.warn("[Drag v7 Refactored] Touch Move: No 'touches'.");
            }
            console.log("[Drag v7 Refactored] handleWaveformTouchMove FIN."); // LOG
        };

        const handleWaveformTouchEnd = (endEvent) => {
            console.log(`[Drag v7 Refactored] handleWaveformTouchEnd (Global) INICIO. isDragging: ${isDraggingWaveformTouch}. Tipo: ${endEvent.type}`); // LOG
            if (!isDraggingWaveformTouch) {
                console.log("[Drag v7 Refactored] End (Global) ignorado: isDragging false.");
                return;
            }
            isDraggingWaveformTouch = false; // Resetear bandera

            if (wasPlayingBeforeDrag) {
                wavesurfer.play();
                console.log("[Drag v7 Pause] Audio reanudado al finalizar arrastre."); // LOG
            }
            wasPlayingBeforeDrag = false;

            console.log("[Drag v7 Refactored] Removiendo listeners GLOBALES..."); // LOG
            window.removeEventListener('touchmove', handleWaveformTouchMove);
            window.removeEventListener('touchend', handleWaveformTouchEnd);
            window.removeEventListener('touchcancel', handleWaveformTouchEnd);
            console.log("[Drag v7 Refactored] handleWaveformTouchEnd (Global) FIN."); // LOG
        };
        // --- FIN FASE 0 ---

        // =================================================================
        // 🛡️ ESCUDO NATIVO MÓVIL (v5.6)
        // Bloqueamos el motor nativo de WaveSurfer para evitar el "duelo" de clics
        // =================================================================
        if (globalPerformanceTier !== 'ALTA/PC') {
            const stopNative = (e) => e.stopPropagation();
            waveformInteractionElement.addEventListener('touchstart', stopNative, true);
            waveformInteractionElement.addEventListener('click', stopNative, true);
        }

        // Variables ya definidas arriba

        // 1. PC: Pre-carga al mover el mouse y Preview de Tiempo
        waveformInteractionElement.addEventListener('mousemove', (e) => {
            const rect = waveformInteractionElement.getBoundingClientRect();
            PrecacheController.handleInteraction(e.clientX, rect);

            // Lógica de Preview estilo SoundCloud (Solo PC)
            if (globalPerformanceTier === 'ALTA/PC' && wavesurfer && wavesurfer.getDuration() > 0) {
                isHoveringWaveform = true;
                const progress = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                const hoverTime = progress * wavesurfer.getDuration();
                if (currentTimeEl) currentTimeEl.textContent = formatTime(hoverTime);
            }
        });

        // --- INICIO FASE 2 y 3: Precarga Cuántica (Limpio Fase 4) ---
        waveformInteractionElement.addEventListener('touchmove', (e) => {
            if (!e.touches || e.touches.length === 0) return;

            // Respetamos la precarga clásica por movimiento sin interferir con el láser
            if (!isDraggingWaveformTouch) {
                const rect = waveformInteractionElement.getBoundingClientRect();
                if (typeof PrecacheController !== 'undefined' && PrecacheController.handleInteraction) {
                    PrecacheController.handleInteraction(e.touches[0].clientX, rect);
                }
            }
        });
        // --- FIN FASE 2 y 3 ---

        // 3. Cancelar pre-carga si el usuario sale de la onda y restaurar reloj
        waveformInteractionElement.addEventListener('mouseleave', () => {
            PrecacheController.cancel();
            isHoveringWaveform = false; // Apagamos el modo preview

            // Restauramos el reloj al tiempo actual de la canción
            if (globalPerformanceTier === 'ALTA/PC' && wavesurfer && currentTimeEl) {
                currentTimeEl.textContent = formatTime(wavesurfer.getCurrentTime());
            }
        });

        // Listener para INICIO TÁCTIL
        waveformInteractionElement.addEventListener('touchstart', (event) => {
            if (!event.isTrusted) {
                console.warn("[Seguridad] Táctil bloqueado: Bot simulando dedo.");
                return;
            }
            console.log("[Drag v6 Final Merged] Evento: touchstart INICIO.");
            if (event.target.closest('button')) {
                console.warn("[Drag v6 Final Merged] Touch Start ignorado: botón.");
                return;
            }
            console.log("[Drag v6 Final Merged] Touch Start ACEPTADO.");

            clearTimeout(longTouchTimer);

            let touchStartTime = 0;
            if (wavesurfer && typeof wavesurfer.getCurrentTime === 'function') {
                try {
                    touchStartTime = wavesurfer.getCurrentTime();
                } catch (e) {}
            }
            if (touchStartTime === 0 && wavesurfer && wavesurfer.getMediaElement()) {
                touchStartTime = wavesurfer.getMediaElement().currentTime || 0;
            }
            const formattedTouchStartTime = formatTime(touchStartTime);
            console.log(`[Drag v6 Final Merged] Tiempo inicio toque: ${formattedTouchStartTime}`);

            // --- Llamar a seekWaveform en touchstart ---
            console.log("[Drag v6 Final Merged] Intentando seek inicial en touchstart...");
            if (event.touches && event.touches.length > 0) {
                const wavesurferElement = wavesurfer.getWrapper();
                const rect = wavesurferElement.getBoundingClientRect();
                seekWaveform(event.touches[0].clientX, rect, "touchstart-initial");
            } else {
                console.warn("[Drag v6 Final Merged] Touch Start: No 'touches' para seek inicial.");
            }
            // --- FIN Llamar a seekWaveform ---

            // La Ruta Legacy PC (longTouchTimer) fue erradicada para garantizar fricción cero.

            console.log(`[Drag v6 Final Merged] touchstart FIN (Timer iniciado).`);
        });

        // Listener para CLIC SIMPLE de RATÓN (PC)
        waveformInteractionElement.addEventListener('click', (event) => {
            if (!event.isTrusted) {
                console.warn("[Seguridad] Clic en onda bloqueado: Bot.");
                return;
            }
            // Mantenemos el check isReady aquí para el clic simple
            if (!isDraggingWaveformTouch && wavesurfer && !event.target.closest('button')) {
                console.log("[Drag v6 Final Merged] Clic simple (Mouse) detectado.");
                const wavesurferElement = wavesurfer.getWrapper();
                const rect = wavesurferElement.getBoundingClientRect();
                seekWaveform(event.clientX, rect, "click"); // Llamada a seek
            } else {
                console.log(`[Drag v6 Final Merged] Clic ignorado. isDragging: ${isDraggingWaveformTouch}, WS ready: ${wavesurfer ? wavesurfer.isReady : 'N/A'}`);
            }
        });


    } else {
        console.error("[Drag v6 Final Merged] No se pudo añadir lógica de interacción."); // LOG ERROR
    }
    // --- FIN NUEVO BLOQUE v6 Stable Final ---

    // --- Manejar clics en el tracklist actual ---
    currentTracklistElement.addEventListener('click', (e) => {
        if (!e.isTrusted) {
            console.warn("[Seguridad] Clic interno bloqueado: Bot.");
            return;
        }
        const target = e.target;

        // Caso 1: Clic en el botón de favorito
        if (target.classList.contains('favorite-btn')) {
            const seconds = parseInt(target.dataset.seconds, 10);
            if (isNaN(seconds)) return;
            toggleFavorite(seconds, target);
            console.log(`Clic en botón favorito para t=${seconds}s.`); // LOG
        } else if (target.closest('.btn-copy')) {
            const listItem = target.closest('.current-tracklist-item');
            const index = listItem ? parseInt(listItem.dataset.index, 10) : -1;
            const fullTitle = (currentLoadedSet && index !== -1 && currentLoadedSet.tracklist[index]) ? currentLoadedSet.tracklist[index].title : '';
            TrackActionsController.copyTrack(fullTitle, target.closest('.btn-copy'));
        } else if (target.closest('.btn-search')) {
            const listItem = target.closest('.current-tracklist-item');
            const index = listItem ? parseInt(listItem.dataset.index, 10) : -1;
            const fullTitle = (currentLoadedSet && index !== -1 && currentLoadedSet.tracklist[index]) ? currentLoadedSet.tracklist[index].title : '';
            TrackActionsController.searchTrack(fullTitle);
        }
        // Caso 2: Clic en cualquier otra parte del item (para saltar)
        else {
            window.vloitzLaserCleanup(true); // 🛡️ MATRIZ COLAPSO: Interrupción externa
            focusPlayerCard();

            const listItem = target.closest('.current-tracklist-item');
            if (!listItem || !listItem.dataset.time) return;

            const timeString = listItem.dataset.time;
            const clickTimeParts = timeString.split(':');
            let timeInSeconds = 0;
            if (clickTimeParts.length === 2 && !isNaN(parseInt(clickTimeParts[0], 10)) && !isNaN(parseInt(clickTimeParts[1], 10))) {
                timeInSeconds = parseInt(clickTimeParts[0], 10) * 60 + parseInt(clickTimeParts[1], 10);
            } else {
                console.warn(`Timestamp inválido al hacer clic: ${timeString}`);
                return;
            }

            console.log(`Clic en tracklist item: ${timeString} (${timeInSeconds}s). Intentando buscar...`); // LOG
            console.log("Objeto wavesurfer DENTRO del listener:", wavesurfer); // Log de depuración

            try {
                if (wavesurfer && typeof wavesurfer.getDuration === 'function' && typeof wavesurfer.seekTo === 'function') {
                    const duration = wavesurfer.getDuration();
                    if (duration > 0) {
                        const progress = timeInSeconds / duration;
                        const clampedProgress = Math.max(0, Math.min(1, progress));
                        console.log(`Calculando progreso: ${timeInSeconds}s / ${duration.toFixed(2)}s = ${clampedProgress.toFixed(4)}`); // LOG
                        wavesurfer.seekTo(clampedProgress);
                        console.log(`Ejecutado wavesurfer.seekTo(${clampedProgress.toFixed(4)})`); // LOG
                    } else {
                        console.warn("La duración es 0, no se puede calcular el progreso para seekTo."); // LOG ADVERTENCIA
                    }

                    if (typeof wavesurfer.isPlaying === 'function' && !wavesurfer.isPlaying()) {
                        if (typeof wavesurfer.play === 'function') {
                            wavesurfer.play();
                        } else {
                            console.warn("wavesurfer.play no es una función");
                        }
                    }
                } else {
                    console.error("El objeto wavesurfer no está correctamente inicializado o le faltan métodos en este punto."); // LOG ERROR
                }
            } catch (error) {
                console.error("Error al intentar buscar (seekTo) o reproducir:", error); // LOG ERROR
            }
        }
    });

    // --- INICIO: MOTOR UNIFICADO (Laser Trackpad Beta V7 - Fase 3: Animaciones & UX) ---
    const VloitzLaserEngine = (() => {
        const CONFIG = {
            allowBackwardSeeking: true,
            tracksForward: 3,
            tracksBackward: 2,
            viewOffsetRatio: 0.40,
            hapticTickSeconds: 1,
            hapticIntensity: 35,
            minSafePhysicalSpace: 60
        };

        const state = {
            evaluating: false,
            active: false,
            startX: 0,
            startY: 0,
            lastX: 0,
            accumulatedTime: 0,
            initialAccumulated: 0,
            lastAccumulatedForHaptics: 0,
            hapticBank: 0,
            bypassStartY: 0,
            bypassIsDragging: false,
            sessionActive: false,
            baseTime: 0,
            duration: 0,
            targetTime: 0,
            pxPerSec: 0,
            spaceRight: 0,
            spaceLeft: 0,
            maxForwardSecs: 180,
            maxBackwardSecs: 90,
            rAF_pending: false,
            virtualScrollLeft: 0,
            // --- INICIO V8: Variables Mind-Reading (Puertas Magnéticas) ---
            doors: [], // Mapa de inicios de pistas (en segundos)
            magnetDoor: null, // Puerta que está atrayendo actualmente al láser
            ignoredDoors: [] // Puertas rotas por el usuario (Velocidad de escape)
            // --- FIN V8 ---
        };

        const getActiveScrollContainer = (wsInstance) => {
            const root = document.getElementById('waveform');
            if (!root) return document.body;
            const firstChild = root.firstElementChild;
            if (firstChild && firstChild.shadowRoot) {
                const scrollVault = firstChild.shadowRoot.querySelector('[part="scroll"]') || firstChild.shadowRoot.querySelector('div');
                if (scrollVault) return scrollVault;
            }
            return firstChild || root;
        };

        const formatDelta = (seconds) => {
            const sign = seconds >= 0 ? '+' : '-';
            const absSecs = Math.abs(seconds);
            const m = Math.floor(absSecs / 60);
            const s = Math.floor(absSecs % 60);
            return `${sign}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        };

        const calculateExactLimits = (currentTime) => {
            if (!currentLoadedSet || !currentLoadedSet.tracklist || currentLoadedSet.tracklist.length === 0) {
                state.maxForwardSecs = 180;
                state.maxBackwardSecs = 90;
                return;
            }
            const tracks = currentLoadedSet.tracklist;
            let currentIndex = 0;
            const getSecs = (timeStr) => {
                const p = timeStr.split(':');
                return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
            };
            for (let i = tracks.length - 1; i >= 0; i--) {
                if (currentTime >= getSecs(tracks[i].time)) {
                    currentIndex = i;
                    break;
                }
            }
            const forwardIndex = Math.min(currentIndex + CONFIG.tracksForward, tracks.length - 1);
            const forwardTime = forwardIndex < tracks.length - 1 ? getSecs(tracks[forwardIndex + 1].time) : state.duration;
            const backwardIndex = Math.max(currentIndex - CONFIG.tracksBackward, 0);
            const backwardTime = getSecs(tracks[backwardIndex].time);

            state.maxForwardSecs = Math.max(10, forwardTime - currentTime);
            state.maxBackwardSecs = Math.max(10, currentTime - backwardTime);
        };

        const executeLaserSync = () => {
            if (!state.sessionActive) return;
            const scrollEl = getActiveScrollContainer(wavesurfer);
            const theoreticalScrollWidth = state.duration * state.pxPerSec;

            if (scrollEl.scrollWidth >= theoreticalScrollWidth * 0.8) {
                scrollEl.scrollLeft = state.virtualScrollLeft;
                if (window.vloitzGhostPointer) {
                    const realScreenX = (state.baseTime * state.pxPerSec) - state.virtualScrollLeft;
                    window.vloitzGhostPointer.style.display = 'block';
                    void window.vloitzGhostPointer.offsetWidth; // FASE 3: Reflow para animar
                    window.vloitzGhostPointer.classList.add('v-visible');
                    window.vloitzGhostPointer.style.left = `${realScreenX}px`;
                    window.vloitzGhostPointer.style.transform = 'translateX(-50%)';
                }
            } else {
                requestAnimationFrame(executeLaserSync);
            }
        };

        const updateVisuals = () => {
            if (window.vloitzGhostPointer && wavesurfer) {
                const targetPixel = state.targetTime * state.pxPerSec;
                const realScreenX = targetPixel - state.virtualScrollLeft;
                window.vloitzGhostPointer.style.left = `${realScreenX}px`;

                // --- INICIO V8: Estética del Puntero Magnético ---
                if (state.magnetDoor !== null) {
                    window.vloitzGhostPointer.style.background = 'linear-gradient(to bottom, rgba(29, 185, 84, 0) 0%, rgba(29, 185, 84, 1) 50%, rgba(29, 185, 84, 0) 100%)';
                    window.vloitzGhostPointer.style.boxShadow = '0 0 10px rgba(29, 185, 84, 0.8)';
                    window.vloitzGhostPointer.style.width = '3px';
                } else {
                    window.vloitzGhostPointer.style.background = 'linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.9) 50%, rgba(255, 255, 255, 0) 100%)';
                    window.vloitzGhostPointer.style.boxShadow = '0 0 8px rgba(255, 255, 255, 0.4)';
                    window.vloitzGhostPointer.style.width = '2px';
                }
                // --- FIN V8 ---
            }
            if (window.vloitzHud) {
                // --- INICIO V8: Mensajes del HUD con Intenciones ---
                if (state.magnetDoor !== null) {
                    let msg = "Iniciar Pista";
                    if (state.magnetDoor === 0 && state.baseTime > 5) {
                        msg = "⏮ Reiniciar Set";
                    } else if (state.magnetDoor > state.baseTime) {
                        msg = "⏭ Siguiente Pista";
                    } else {
                        // Es hacia atrás. ¿Estamos tocando la puerta de la música actual o la anterior?
                        const currentHouse = (typeof TrackNavigator !== 'undefined') ? TrackNavigator.getCurrentTrackStartTime(state.baseTime, false) : null;
                        if (state.magnetDoor === currentHouse) {
                            msg = "⏮ Reiniciar Pista";
                        } else {
                            msg = "⏮ Pista Anterior";
                        }
                    }
                    window.vloitzHud.innerHTML = `<span style="color:#1DB954;">${msg}</span>`;
                } else {
                    // Flujo Normal (El Pasillo)
                    const deltaStr = formatDelta(state.accumulatedTime);
                    const targetStr = formatTime(state.targetTime);
                    window.vloitzHud.innerHTML = `<span style="color:#1DB954;">${deltaStr}</span> &nbsp;|&nbsp; <span style="color:#b3b3b3;">${targetStr}</span>`;
                }
                // --- FIN V8 ---
            }
            state.rAF_pending = false;
        };

        const handleTouchStart = (e) => {
            if (e.touches.length > 1) return;
            window.isLaserActive = true; // 🛡️ Encender escudo contra timeupdate
            state.startX = e.touches[0].clientX;
            state.startY = e.touches[0].clientY;
            state.lastX = state.startX;
            state.evaluating = true;
            state.active = false;
            state.bypassIsDragging = false;

            // --- INICIO V8: Reseteo del Imán en cada nuevo toque ---
            state.magnetDoor = null;
            state.ignoredDoors = [];

            // 🔌 Conexión KineticTrackpadPrecache (Borramos memoria inercial anterior)
            if (typeof KineticTrackpadPrecache !== 'undefined') {
                KineticTrackpadPrecache.reset();
            }
            // --- FIN V8 ---

            if (e.target.closest('.action-group')) {
                state.bypassStartY = state.startY;
                state.bypassIsDragging = true;
            }

            if (state.sessionActive) {
                state.initialAccumulated = state.accumulatedTime;
            } else {
                state.accumulatedTime = 0;
                state.initialAccumulated = 0;
                state.baseTime = wavesurfer ? wavesurfer.getCurrentTime() : 0;
                state.duration = wavesurfer ? wavesurfer.getDuration() : 0;

                // --- INICIO V8: El Cartógrafo (Mapeo de Puertas 1 sola vez) ---
                state.doors = [];
                if (currentLoadedSet && currentLoadedSet.tracklist) {
                    const getSecs = (timeStr) => {
                        const p = timeStr.split(':');
                        return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
                    };
                    state.doors = currentLoadedSet.tracklist.map(t => getSecs(t.time));
                    // Añadimos el inicio absoluto por si quiere reiniciar el set (Puerta Cero)
                    if (!state.doors.includes(0)) state.doors.unshift(0);
                }
                // --- FIN V8 ---
            }

            calculateExactLimits(state.baseTime + state.accumulatedTime);
            state.lastAccumulatedForHaptics = state.accumulatedTime;
        };

        const handleTouchMove = (e) => {
            if (!state.evaluating && !state.active && !state.bypassIsDragging) return;
            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;

            if (state.evaluating) {
                const deltaX = Math.abs(currentX - state.startX);
                const deltaY = Math.abs(currentY - state.startY);
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

                if (distance >= 15) {
                    state.evaluating = false;
                    if (deltaX > deltaY * 1.5) {
                        state.active = true;
                        state.bypassIsDragging = false;

                        // 🧹 SOLUCIÓN CASO 1: Al confirmar un nuevo arrastre, ocultamos la pastilla anterior inmediatamente.
                        // Como desaparece visualmente, el dedo queda libre para seguir deslizando.
                        const oldPill = document.getElementById('vloitz-laser-actions');
                        if (oldPill) oldPill.classList.remove('v-active');

                        if (!state.sessionActive) {
                            state.sessionActive = true;
                            const totalVisibleSeconds = 300;
                            state.pxPerSec = window.innerWidth / totalVisibleSeconds;

                            if (wavesurfer) {
                                wavesurfer.setOptions({
                                    autoScroll: false
                                });
                                wavesurfer.zoom(state.pxPerSec);

                                const theoreticalScrollWidth = state.duration * state.pxPerSec;
                                const maxScroll = Math.max(0, theoreticalScrollWidth - window.innerWidth);
                                const idealScroll = (state.baseTime * state.pxPerSec) - (window.innerWidth * CONFIG.viewOffsetRatio);
                                state.virtualScrollLeft = Math.max(0, Math.min(maxScroll, idealScroll));

                                requestAnimationFrame(executeLaserSync);
                            }

                            // 🎯 UX SENIOR: Auto-centrar el tracklist llamando a la función maestra
                            if (typeof scrollTracklistToActive === 'function') {
                                scrollTracklistToActive();
                            }

                            if (window.vloitzHud) {
                                window.vloitzHud.style.display = 'flex';
                                void window.vloitzHud.offsetWidth; // FASE 3: Reflow
                                window.vloitzHud.classList.add('v-visible');
                                const titleEl = document.getElementById('current-track-title');
                                if (titleEl) {
                                    window.vloitzHud.style.top = (titleEl.offsetTop - 2) + 'px';
                                    titleEl.style.transition = 'opacity 0.2s';
                                    titleEl.style.opacity = '0';
                                }
                            }
                        }
                    } else {
                        state.active = false;
                    }
                } else return;
            }

            if (state.active) {
                if (e.cancelable) e.preventDefault();
                const moveX = currentX - state.startX;
                let addedTime = moveX / state.pxPerSec;

                if (addedTime > state.maxForwardSecs) addedTime = state.maxForwardSecs;
                if (addedTime < -state.maxBackwardSecs) addedTime = -state.maxBackwardSecs;

                const proposedTarget = state.baseTime + state.initialAccumulated + addedTime;
                const rawTargetTime = Math.max(0, Math.min(state.duration, proposedTarget));

                // Memoria física inmutable (Mantiene el 1:1 estricto con el dedo)
                state.accumulatedTime = rawTargetTime - state.baseTime;

                // --- INICIO V8: Radar de Puertas, Gravedad e Histéresis Elástica ---
                if (state.magnetDoor !== null) {
                    // ¿El dedo rompió la fuerza de escape? (±4 segundos de tolerancia)
                    if (Math.abs(rawTargetTime - state.magnetDoor) > 5) { //ant:4
                        if (!state.ignoredDoors.includes(state.magnetDoor)) {
                            state.ignoredDoors.push(state.magnetDoor); // Se marca como ignorada
                        }
                        state.magnetDoor = null; // Liberamos el imán
                    }
                } else {
                    // 🔄 Amnistía Elástica: Revisar puertas ignoradas.
                    // Si el usuario ya se alejó de una puerta ignorada por más de 5 segundos, la perdonamos y reactivamos.
                    state.ignoredDoors = state.ignoredDoors.filter(door => Math.abs(rawTargetTime - door) <= 5);

                    // Escanear si pasamos cerca de una puerta (Atrapar a ±2 segundos)
                    for (let i = 0; i < state.doors.length; i++) {
                        const door = state.doors[i];
                        if (!state.ignoredDoors.includes(door) && Math.abs(rawTargetTime - door) <= 3) { //ant:2
                            state.magnetDoor = door;
                            // Feedback háptico sutil y único al "chocar" contra la puerta
                            if (navigator.vibrate) navigator.vibrate(40);
                            break;
                        }
                    }
                }
                // --- FIN V8 ---

                // La pantalla (targetTime) obedece al imán si hay uno, sino obedece al dedo (rawTarget)
                state.targetTime = state.magnetDoor !== null ? state.magnetDoor : rawTargetTime;

                // 🔌 Conexión KineticTrackpadPrecache (Evaluación balística continua)
                if (typeof KineticTrackpadPrecache !== 'undefined') {
                    KineticTrackpadPrecache.handleLaserMove(currentX, state);
                }
                // --- FIN V8 ---

                const frameDelta = state.accumulatedTime - state.lastAccumulatedForHaptics;
                if (Math.abs(frameDelta) >= CONFIG.hapticTickSeconds) {
                    state.lastAccumulatedForHaptics = state.accumulatedTime;
                    // Solo vibra por desplazamiento normal de pasillo si NO estamos magnetizados
                    if (navigator.vibrate && state.magnetDoor === null) navigator.vibrate(CONFIG.hapticIntensity);
                }

                if (!state.rAF_pending) {
                    state.rAF_pending = true;
                    requestAnimationFrame(updateVisuals);
                }
            }

            if (state.bypassIsDragging && !state.active) {
                const moveY = state.bypassStartY - currentY;
                window.scrollBy(0, moveY);
                state.bypassStartY = currentY;
            }
        };

        const renderActionPill = (e) => {
            const actionPill = document.getElementById('vloitz-laser-actions');
            if (!actionPill) return;

            // Evitamos re-renderizar si ya está activa
            if (actionPill.classList.contains('v-active')) return;

            let touchX = window.innerWidth / 2;
            let touchY = window.innerHeight / 2;

            if (e && e.changedTouches && e.changedTouches.length > 0) {
                touchX = e.changedTouches[0].clientX;
                touchY = e.changedTouches[0].clientY;
            }

            // FASE 1 + 3: Posición Matemática Exacta (-25%) inyectada en la GPU
            // Utilizamos translate3d para garantizar latencia 0ms sin forzar Layout Thrashing
            actionPill.style.transform = `translate3d(${touchX}px, ${touchY}px, 0) translate(-50%, -25%)`;

            // Activación instantánea
            actionPill.classList.add('v-active');
        };

        const handleTouchEnd = (e) => {
            window.isLaserActive = false; // 🛡️ Apagar escudo, devolver control al DOM
            const wasActive = state.active; // 📸 Capturamos si el usuario estaba arrastrando
            state.evaluating = false;
            state.bypassIsDragging = false;

            if (state.active || state.sessionActive) {
                state.active = false;

                // --- INICIO V8: Mind-Reading (Salto Directo o Pastilla) ---
                if (state.magnetDoor !== null && wavesurfer) {
                    // 🚪 El usuario soltó el dedo dentro de una Puerta. ¡Teletransportación!
                    const jumpTime = state.magnetDoor;
                    window.vloitzLaserCleanup(true); // Limpia HUD, Zoom y estados

                    if (jumpTime >= 0) {
                        const progress = jumpTime / wavesurfer.getDuration();
                        wavesurfer.seekTo(progress);
                        if (!wavesurfer.isPlaying()) wavesurfer.play();
                    }
                } else {
                    // 🚶 Flujo Clásico: Soltó en el pasillo, dibujamos la pastilla.
                    renderActionPill(e);
                }
                // --- FIN V8 ---
            }

            // 🛡️ ESCUDO ANTI-CLICK FANTASMA
            // Si el usuario estaba deslizando el láser, bloqueamos el clic sintético del navegador
            // que se dispara al soltar el dedo. Así evitamos que la pastilla se auto-cierre.
            if (wasActive && e.cancelable) {
                e.preventDefault();
            }
        };

        return {
            init: () => {
                // 🚀 FASE 3: INYECCIÓN DE ESTILOS GLOBALES (UI y Animaciones)
                if (!document.getElementById('vloitz-capsule-styles')) {
                    const style = document.createElement('style');
                    style.id = 'vloitz-capsule-styles';
                    style.innerHTML = `
                        /* ⚡ ANIMACIÓN ELIMINADA PARA RESPUESTA INSTANTÁNEA AL SOLTAR EL DEDO */
                        #vloitz-hud, #vloitz-ghost-pointer {
                            opacity: 0;
                            transition: opacity 0.25s ease-out;
                        }
                        #vloitz-hud.v-visible, #vloitz-ghost-pointer.v-visible {
                            opacity: 1;
                        }
                        #vloitz-laser-actions {
                            position: fixed;
                            top: 0;
                            left: 0;
                            display: flex;
                            flex-direction: column;
                            width: 72px;
                            height: 160px;
                            background-color: #14161b;
                            border-radius: 36px;
                            border: 1px solid #242832;
                            box-shadow: 0 14px 28px rgba(0, 0, 0, 0.6), inset 0 1px 2px rgba(255, 255, 255, 0.05);
                            overflow: hidden;
                            z-index: 999999;
                            transform-origin: center bottom;

                            /* Estado inerte por defecto (Ghost Prefab) */
                            opacity: 0;
                            pointer-events: none;
                            visibility: hidden;
                            will-change: transform, opacity;
                        }
                        #vloitz-laser-actions.v-active {
                            opacity: 1;
                            pointer-events: auto;
                            visibility: visible;
                            /* Sin animación/transición: aparece rígido, instantáneo y listo para presionar al instante */
                        }
                        #vloitz-laser-actions::after {
                            content: ''; position: absolute; top: 50%; left: 12%; right: 12%; height: 2px;
                            background-color: rgba(255, 255, 255, 0.06); transform: translateY(-50%); border-radius: 2px; pointer-events: none;
                        }
                        .vloitz-btn {
                            flex: 1; display: flex; justify-content: center; align-items: center;
                            background: transparent; border: none; cursor: pointer; position: relative; padding: 0;
                        }
                        .vloitz-btn svg {
                            width: 26px; height: 26px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                            stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round;
                        }
                        .vloitz-btn.top-btn { color: rgba(74, 222, 128, 0.6); }
                        .vloitz-btn.top-btn:hover, .vloitz-btn.top-btn:active {
                            background-color: rgba(74, 222, 128, 0.12); color: #4ade80; box-shadow: inset 0 15px 25px -10px rgba(74, 222, 128, 0.2);
                        }
                        .vloitz-btn.top-btn:hover svg, .vloitz-btn.top-btn:active svg {
                            transform: translateY(-2px) scale(1.05); filter: drop-shadow(0 0 8px #4ade80);
                        }
                        .vloitz-btn.bottom-btn { color: rgba(248, 113, 113, 0.6); }
                        .vloitz-btn.bottom-btn:hover, .vloitz-btn.bottom-btn:active {
                            background-color: rgba(248, 113, 113, 0.12); color: #f87171; box-shadow: inset 0 -15px 25px -10px rgba(248, 113, 113, 0.2);
                        }
                        .vloitz-btn.bottom-btn:hover svg, .vloitz-btn.bottom-btn:active svg {
                            transform: translateY(2px) scale(1.05); filter: drop-shadow(0 0 8px #f87171);
                        }
                    `;
                    document.head.appendChild(style);
                }

                // 👻 INYECCIÓN DEL GHOST PREFAB (Pre-renderizado estático para latencia 0ms)
                if (!document.getElementById('vloitz-laser-actions')) {
                    const actionPill = document.createElement('div');
                    actionPill.id = 'vloitz-laser-actions';
                    actionPill.innerHTML = `
                        <button class="vloitz-btn top-btn" id="vloitz-btn-confirm" title="Saltar al punto">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <polygon points="6,5 15,12 6,19" fill="currentColor" stroke="none" />
                                <line x1="18" y1="8" x2="18" y2="16" />
                                <line x1="21" y1="5" x2="21" y2="19" />
                            </svg>
                        </button>
                        <button class="vloitz-btn bottom-btn" id="vloitz-btn-cancel" title="Cancelar">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M17 7L7 17" />
                                <path d="M7 7L17 17" />
                            </svg>
                        </button>
                    `;
                    document.body.appendChild(actionPill);

                    // 🔌 CABLEADO PERPETUO DE EVENTOS (Se atan 1 sola vez en la vida de la app)
                    const handleAction = (isConfirm) => (event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        const jumpTime = state.targetTime;
                        window.vloitzLaserCleanup(true);
                        if (isConfirm && wavesurfer && jumpTime >= 0) {
                            const progress = jumpTime / wavesurfer.getDuration();
                            wavesurfer.seekTo(progress);
                            if (!wavesurfer.isPlaying()) wavesurfer.play();
                        }
                    };

                    const confirmBtn = document.getElementById('vloitz-btn-confirm');
                    const cancelBtn = document.getElementById('vloitz-btn-cancel');

                    // 🛑 USAMOS CLICK NATIVO
                    confirmBtn.addEventListener('click', handleAction(true));
                    cancelBtn.addEventListener('click', handleAction(false));

                    // 🛡️ HERENCIA FÍSICA MAESTRA
                    actionPill.addEventListener('touchstart', handleTouchStart, {
                        passive: false
                    });
                    actionPill.addEventListener('touchmove', handleTouchMove, {
                        passive: false
                    });
                    actionPill.addEventListener('touchend', handleTouchEnd);
                    actionPill.addEventListener('touchcancel', handleTouchEnd);

                    actionPill.addEventListener('click', (event) => {
                        if (event.target === actionPill) {
                            event.preventDefault();
                            event.stopPropagation();
                            window.vloitzLaserCleanup(true);
                        }
                    });
                }

                if (!currentTracklistElement) return;

                if (!currentTracklistElement._originalScrollTo) {
                    currentTracklistElement._originalScrollTo = currentTracklistElement.scrollTo;
                    currentTracklistElement.scrollTo = function() {
                        if (state.active || state.evaluating || state.sessionActive) return;
                        currentTracklistElement._originalScrollTo.apply(this, arguments);
                    };
                }
                currentTracklistElement.addEventListener('contextmenu', (e) => e.preventDefault());

                currentTracklistElement.addEventListener('touchstart', handleTouchStart, {
                    passive: false
                });
                currentTracklistElement.addEventListener('touchmove', handleTouchMove, {
                    passive: false
                });
                currentTracklistElement.addEventListener('touchend', handleTouchEnd);
                currentTracklistElement.addEventListener('touchcancel', handleTouchEnd);
            },
            cleanup: (force = false) => {
                if (!force && (state.active || state.evaluating)) return;

                const actionPill = document.getElementById('vloitz-laser-actions');
                const isPillActive = actionPill && actionPill.classList.contains('v-active');

                if (!state.sessionActive && !state.active && !isPillActive) return;

                window.isLaserActive = false; // 🛡️ Seguro de vida Anti-Bloqueo
                state.sessionActive = false;
                state.active = false;
                state.accumulatedTime = 0;

                // 🔌 Limpiar física inercial móvil al colapsar el menú
                if (typeof KineticTrackpadPrecache !== 'undefined') {
                    KineticTrackpadPrecache.reset();
                }

                // FASE 3: Desactivación Instantánea del Prefab (Latencia 0ms, sin remover del DOM)
                if (isPillActive) {
                    actionPill.classList.remove('v-active');
                }

                if (window.vloitzGhostPointer) {
                    window.vloitzGhostPointer.classList.remove('v-visible');
                    setTimeout(() => window.vloitzGhostPointer.style.display = 'none', 250);
                }
                if (window.vloitzHud) {
                    window.vloitzHud.classList.remove('v-visible');
                    setTimeout(() => window.vloitzHud.style.display = 'none', 250);
                }

                if (wavesurfer) {
                    // FASE 3: Suavizado del contenedor de WaveSurfer al colapsar el Zoom
                    const wsWrapper = wavesurfer.getWrapper();
                    if (wsWrapper) wsWrapper.style.transition = 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)';

                    wavesurfer.zoom(0);
                    wavesurfer.setOptions({
                        autoScroll: true
                    });

                    setTimeout(() => {
                        if (wsWrapper) wsWrapper.style.transition = '';
                    }, 350);
                }
                const titleEl = document.getElementById('current-track-title');
                if (titleEl) {
                    titleEl.style.transition = 'opacity 0.3s ease';
                    titleEl.style.opacity = '1';
                }
            },
            getState: () => state
        };
    })();

    window.vloitzLaserCleanup = VloitzLaserEngine.cleanup;
    VloitzLaserEngine.init();
    // --- FIN: MOTOR UNIFICADO ---

    // --- Lógica Filtro Favoritos (prototipo v4) ---
    function filterFavoritesDisplay() {
        if (!favToggleCheckbox || !currentTracklistElement) return; // Salir si no existen

        const showOnlyFavorites = favToggleCheckbox.checked;
        console.log(`[Filter] Cambiando filtro. Mostrar solo favoritos: ${showOnlyFavorites}`); // LOG

        const items = currentTracklistElement.querySelectorAll('.current-tracklist-item');
        let visibleCount = 0;

        items.forEach(item => {
            const favButton = item.querySelector('.favorite-btn');
            const isFavorited = favButton && favButton.classList.contains('favorited');

            if (showOnlyFavorites) {
                if (isFavorited) {
                    item.style.display = ''; // FIX: Limpia el JS y deja que el CSS decida (Grid en móvil, Flex en PC)
                    visibleCount++;
                } else {
                    item.style.setProperty('display', 'none', 'important'); // FIX: Munición perforante, anula el !important del CSS
                }
            } else {
                item.style.display = ''; // FIX: Limpia el JS y deja que el CSS decida
                visibleCount++;
            }
        });
        console.log(`[Filter] Filtro aplicado. Items visibles: ${visibleCount} de ${items.length}`); // LOG
    }

    // Listener para el checkbox
    if (favToggleCheckbox) {
        favToggleCheckbox.addEventListener('change', filterFavoritesDisplay);
        console.log("Listener para el filtro de favoritos añadido."); // LOG
    }
    // --- Fin Lógica Filtro (prototipo v4) ---



    // --- Añadir/Quitar Favorito (v2: por set) ---
    function toggleFavorite(seconds, buttonElement) {
        if (!currentLoadedSet) {
            console.error("[Fav v2] Error: No hay 'currentLoadedSet' para guardar el favorito.");
            return;
        }

        const setKey = currentLoadedSet.title;
        console.log(`[Fav v2] Toggle favorito para set: "${setKey}", tiempo: ${seconds}s`); // LOG

        // 1. Actualizar el 'Set' en memoria (currentSetFavorites)
        if (currentSetFavorites.has(seconds)) {
            currentSetFavorites.delete(seconds);
            buttonElement.classList.remove('favorited');
            buttonElement.innerHTML = '☆';
            console.log(`[Fav v2] Favorito eliminado de la memoria.`); // LOG
        } else {
            currentSetFavorites.add(seconds);
            buttonElement.classList.add('favorited');
            buttonElement.innerHTML = '★';
            console.log(`[Fav v2] Favorito añadido a la memoria.`); // LOG
        }

        // 2. Actualizar el objeto 'allFavorites' con el array convertido del Set
        allFavorites[setKey] = Array.from(currentSetFavorites);

        // 3. Guardar el objeto 'allFavorites' completo en Local Storage
        try {
            console.log("[Fav PorSet] VERIFICANDO: Objeto a punto de guardar:", JSON.stringify(allFavorites));
            localStorage.setItem('vloitz_favorites', JSON.stringify(allFavorites));
            filterFavoritesDisplay(); // Re-aplicar filtro al cambiar un favorito
            console.log("[Fav PorSet] Base de datos de favoritos guardada en Local Storage:", allFavorites); // LOG

            // --- INICIO: Actualizar Navegador (Corrección Loop Favoritos) ---
            if (currentLoadedSet) {
                TrackNavigator.prepareTimestamps(currentLoadedSet.tracklist || [], currentSetFavorites);
                console.log("[Nav Sync] Timestamps del Navegador actualizados tras cambio de favorito.");

                // MÓDULO BETA: Repintado en vivo del espectro al marcar/desmarcar
                if (VLOITZ_UI_FLAGS.showFavoritesMarker && isSpectrumActive) {
                    paintWaveformRegions();
                }
            }
            // --- FIN: Actualizar Navegador ---

        } catch (error) {
            console.error("[Fav v2] Error al guardar favoritos en Local Storage:", error);
        }
    }

    // --- Clic en lista general de sets ---
    tracklistElement.addEventListener('click', e => {
        if (!e.isTrusted) {
            console.warn("[Seguridad] Interacción bloqueada: Bot.");
            return;
        }
        const clickedItem = e.target.closest('.track-item');
        if (!clickedItem) return;

        focusPlayerCard();

        const trackIndex = parseInt(clickedItem.dataset.index);
        console.log(`Clic en lista general de sets, item: ${trackIndex}`); // LOG
        if (trackIndex !== currentSetIndex && allSets[trackIndex]) {

            // 🔄 NUEVO: Actualizar la URL al cambiar de Set manualmente
            const newSetId = allSets[trackIndex].id;
            window.history.pushState({}, document.title, `/share/${newSetId}/`);
            console.log(`[UX Avanzado] Cambio de Set manual. URL actualizada a: /share/${newSetId}/`);

            loadTrack(allSets[trackIndex], trackIndex);
            wavesurfer.once('ready', () => {
                console.log("Track seleccionado de lista general listo, reproduciendo..."); // LOG
                wavesurfer.play();
            });
        } else if (trackIndex === currentSetIndex) {
            console.log("Clic en track actual de lista general, ejecutando playPause..."); // LOG
            wavesurfer.playPause();
        }
    });

    // --- Botón Play/Pause Principal ---
    playPauseBtn.addEventListener('click', (e) => {
        if (!e.isTrusted) {
            console.warn("[Seguridad] Play bloqueado: Clic de bot.");
            return;
        }
        console.log("Clic Play/Pause");
        focusPlayerCard();
        // SIN check isReady aquí (como en v6 estable)
        if (wavesurfer && typeof wavesurfer.playPause === 'function') {
            wavesurfer.playPause();
        } else {
            console.warn("[Play/Pause] Ignorado: WS no inicializado.");
        }
    });


    // --- Lógica de Biografía Expandible (prototipo v5) ---
    if (profileBioContainer && bioExtended && bioToggle) {
        console.log("Biografía expandible inicializada."); // LOG

        const collapseBio = () => {
            // Solo colapsar si está expandida
            if (bioExtended.style.display !== 'none') {
                console.log("[Bio] Colapsando biografía."); // LOG
                bioExtended.style.display = 'none';
                bioToggle.innerHTML = '<span class="txt-desktop">... Ver más</span><span class="svg-mobile" style="display: none;"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#1DB954" stroke-width="1.2" style="filter: drop-shadow(0 0 3px rgba(29, 185, 84, 0.3));"><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line><circle cx="12" cy="12" r="9" stroke-opacity="0.1"></circle></svg></span>';
            }
        };

        // Función para expandir la biografía
        const expandBio = () => {
            console.log("[Bio] Expandiendo biografía."); // LOG
            bioExtended.style.display = 'inline'; // 'inline' funciona bien con <span>
            bioToggle.innerHTML = '<span class="txt-desktop">Ver menos</span><span class="svg-mobile" style="display: none;"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#1DB954" stroke-width="1.2" style="filter: drop-shadow(0 0 3px rgba(29, 185, 84, 0.3));"><line x1="8" y1="12" x2="16" y2="12"></line><circle cx="12" cy="12" r="9" stroke-opacity="0.1"></circle></svg></span>';
        };

        // 1. Listener para el botón "Ver más / Ver menos"
        bioToggle.addEventListener('click', (e) => {
            e.stopPropagation(); // ¡Importante! Evita que el clic se propague al 'window'

            const isExpanded = bioExtended.style.display !== 'none';
            console.log(`[Bio] Clic en Toggle. ¿Estaba expandido? ${isExpanded}`); // LOG

            if (isExpanded) {
                collapseBio();
            } else {
                expandBio();
            }
        });

        // 2. Listener para cerrar al hacer clic "fuera"
        window.addEventListener('click', (e) => {
            // Comprobar si la bio está expandida Y si el clic NO fue dentro del contenedor
            if (bioExtended.style.display !== 'none' && !profileBioContainer.contains(e.target)) {
                console.log("[Bio] Clic detectado fuera del contenedor. Colapsando."); // LOG
                collapseBio();
            }
        });

    } else {
        console.warn("No se encontraron los elementos de la biografía expandible (prototipo v5)."); // LOG
    }
    // --- Fin Lógica Biografía ---

    // --- INICIO: Módulo de Navegación por Tracks (v1) ---
    const TrackNavigator = (() => {
        const RESTART_THRESHOLD = 3; // Segundos para decidir si reiniciar o ir al anterior
        const AUTOLOOP_JUMP_SECONDS_BEFORE_END = 5;
        let sortedTrackTimestamps = [];
        let sortedFavoriteTimestamps = [];

        // Verifica si los timestamps han sido preparados
        function isReady() {
            return sortedTrackTimestamps.length > 0;
        }

        // Prepara las listas de timestamps (en segundos) cuando se carga un set
        function prepareTimestamps(tracklistData, currentFavoritesSet) {
            console.log("[Nav] Preparando timestamps..."); // LOG
            sortedTrackTimestamps = tracklistData
                .map(track => {
                    const parts = track.time.split(':');
                    if (parts.length === 2) {
                        return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
                    }
                    return -1; // Marcar como inválido si el formato es incorrecto
                })
                .filter(seconds => seconds >= 0) // Filtrar inválidos
                .sort((a, b) => a - b);

            sortedFavoriteTimestamps = Array.from(currentFavoritesSet)
                .sort((a, b) => a - b);

            console.log("[Nav] Timestamps de tracks:", sortedTrackTimestamps); // LOG
            console.log("[Nav] Timestamps de favoritos:", sortedFavoriteTimestamps); // LOG
        }

        // Encuentra el timestamp de inicio del track (favorito o no) que contiene currentTime
        function getCurrentTrackStartTime(currentTime, useFavorites) {
            const timestamps = useFavorites ? sortedFavoriteTimestamps : sortedTrackTimestamps;
            if (!timestamps || timestamps.length === 0) return null;

            // --- INICIO: Log Interno ---
            console.log(`[Nav Internal] getCurrentTrackStartTime called. Time: ${currentTime.toFixed(4)}, UseFavs: ${useFavorites}`);
            // --- FIN: Log ---

            for (let i = timestamps.length - 1; i >= 0; i--) {
                if (timestamps[i] <= currentTime) {
                    return timestamps[i];
                }
            }
            return null; // Antes del primer track?
        }

        // Encuentra el siguiente timestamp válido
        function findNextTimestamp(currentTime, useFavorites) {
            const timestamps = useFavorites ? sortedFavoriteTimestamps : sortedTrackTimestamps;
            if (!timestamps || timestamps.length === 0) return null;

            for (let i = 0; i < timestamps.length; i++) {
                if (timestamps[i] > currentTime + 0.5) { // +0.5s para evitar saltos accidentales inmediatos
                    console.log(`[Nav] Siguiente timestamp encontrado (${useFavorites ? 'Fav' : 'All'}): ${timestamps[i]}s`); // LOG
                    return timestamps[i];
                }
            }

            // --- INICIO: Lógica de Loop para Favoritos ---
            if (useFavorites && timestamps.length > 0) {
                // Si estamos en modo favoritos y llegamos al final, volvemos al primero
                console.log("[Nav Debug] Fin de favoritos alcanzado, loopeando al primero."); // LOG (Ya estaba)
                // --- INICIO: LOGS ADICIONALES ---
                console.log(`[Nav Debug] Devolviendo primer favorito: ${timestamps[0]}`);
                // --- FIN: LOGS ADICIONALES ---
                return timestamps[0]; // Devuelve el primer favorito
            } else {
                // Si no estamos en modo favoritos, o no hay favoritos, no hay siguiente
                console.log(`[Nav Debug] No se encontró siguiente timestamp (${useFavorites ? 'Fav' : 'All'}).`); // LOG (Modificado)
                // --- INICIO: LOGS ADICIONALES ---
                console.log("[Nav Debug] Devolviendo null (sin loop o sin siguiente).");
                // --- FIN: LOGS ADICIONALES ---
                return null; // Comportamiento original: no hay siguiente
            }
            // --- FIN: Lógica de Loop ---

        }

        // Encuentra el timestamp de fin para un track que empieza en 'trackStartTime'
        // El fin es el inicio del SIGUIENTE track en la lista COMPLETA, o la duración total
        function getTrackEndTime(trackStartTime, totalDuration) {
            if (!sortedTrackTimestamps || sortedTrackTimestamps.length === 0 || trackStartTime === null) return null;

            const currentIndex = sortedTrackTimestamps.indexOf(trackStartTime);
            if (currentIndex === -1) return null; // No debería pasar si trackStartTime vino de getCurrentTrackStartTime

            if (currentIndex < sortedTrackTimestamps.length - 1) {
                // Si NO es el último track, el fin es el inicio del siguiente
                return sortedTrackTimestamps[currentIndex + 1];
            } else {
                // Si ES el último track, el fin es la duración total
                return totalDuration;
            }
        }

        // Encuentra el timestamp anterior válido (o reinicia el actual)
        function findPreviousTimestamp(currentTime, useFavorites) {
            const timestamps = useFavorites ? sortedFavoriteTimestamps : sortedTrackTimestamps;
            if (!timestamps || timestamps.length === 0) return null;

            let previousTimestamp = null;
            let currentTrackStartTimestamp = null;

            // Buscar el inicio del track actual y el inicio del anterior
            for (let i = timestamps.length - 1; i >= 0; i--) {
                if (timestamps[i] <= currentTime) {
                    currentTrackStartTimestamp = timestamps[i];
                    if (i > 0) {
                        previousTimestamp = timestamps[i - 1];
                    }
                    break;
                }
            }

            // Si estamos cerca del inicio (menos de RESTART_THRESHOLD segundos), vamos al anterior
            if (currentTrackStartTimestamp !== null && (currentTime - currentTrackStartTimestamp < RESTART_THRESHOLD)) {
                if (previousTimestamp !== null) {
                    console.log(`[Nav] Cerca del inicio, yendo al anterior (${useFavorites ? 'Fav' : 'All'}): ${previousTimestamp}s`); // LOG
                    return previousTimestamp;
                } else {
                    console.log(`[Nav] Cerca del inicio, pero es el primero. Reiniciando a 0s (${useFavorites ? 'Fav' : 'All'}).`); // LOG
                    return 0; // Si es el primer track, reinicia a 0
                }
            }
            // Si no, reiniciamos el track actual
            else if (currentTrackStartTimestamp !== null) {
                console.log(`[Nav] Reiniciando track actual (${useFavorites ? 'Fav' : 'All'}): ${currentTrackStartTimestamp}s`); // LOG
                return currentTrackStartTimestamp;
            }

            console.log(`[Nav] No se pudo determinar timestamp anterior/reinicio (${useFavorites ? 'Fav' : 'All'}). Volviendo a 0s.`); // LOG
            return 0; // Fallback: ir al inicio del audio
        }

        // Función principal para saltar (llamada desde fuera)
        function seekToTimestamp(targetSeconds) {
            if (wavesurfer && typeof wavesurfer.getDuration === 'function') {
                const duration = wavesurfer.getDuration();
                if (duration > 0 && targetSeconds !== null && targetSeconds <= duration) {
                    const progress = targetSeconds / duration;
                    console.log(`[Nav] Saltando a ${targetSeconds}s (Progreso: ${progress.toFixed(4)})`); // LOG
                    wavesurfer.seekTo(progress);

                    // --- INICIO: Resetear Bandera INMEDIATAMENTE ---
                    if (isSeekingViaAutoLoop) {
                        console.log(`[Nav seekToTimestamp] Reseteando isSeekingViaAutoLoop a FALSE inmediatamente después de llamar a seekTo.`);
                        isSeekingViaAutoLoop = false;
                    }
                    // --- FIN: Resetear Bandera ---

                    // Asegurarse de reproducir si estaba pausado por el salto
                    if (!wavesurfer.isPlaying()) {
                        wavesurfer.play();
                    }
                } else {
                    console.warn(`[Nav] No se pudo saltar. Duración: ${duration}, Target: ${targetSeconds}`); // LOG
                }
            }
        }

        // Función PÚBLICA para ir al siguiente
        function goToNext() {
            if (!wavesurfer) return;
            const currentTime = wavesurfer.getCurrentTime();
            const useFavorites = favToggleCheckbox && favToggleCheckbox.checked;
            console.log(`[Nav] goToNext llamado. Tiempo actual: ${currentTime.toFixed(2)}s, Usar Favoritos: ${useFavorites}`); // LOG
            const nextTimestamp = findNextTimestamp(currentTime, useFavorites);
            if (nextTimestamp !== null) {
                seekToTimestamp(nextTimestamp);
            }
        }

        // Función PÚBLICA para ir al anterior
        function goToPrevious() {
            if (!wavesurfer) return;
            const currentTime = wavesurfer.getCurrentTime();
            const useFavorites = favToggleCheckbox && favToggleCheckbox.checked;
            console.log(`[Nav] goToPrevious llamado. Tiempo actual: ${currentTime.toFixed(2)}s, Usar Favoritos: ${useFavorites}`); // LOG
            const previousTimestamp = findPreviousTimestamp(currentTime, useFavorites);
            if (previousTimestamp !== null) {
                seekToTimestamp(previousTimestamp);
            }
        }

        // Exponer la función para ser llamada desde fuera
        return {
            prepareTimestamps: prepareTimestamps,
            goToNext: goToNext,
            goToPrevious: goToPrevious,
            findNextTimestamp: findNextTimestamp,
            isReady: isReady, // <-- AÑADIR
            getCurrentTrackStartTime: getCurrentTrackStartTime, // <-- AÑADIR
            getTrackEndTime: getTrackEndTime, // <-- AÑADIR
            AUTOLOOP_JUMP_SECONDS_BEFORE_END: AUTOLOOP_JUMP_SECONDS_BEFORE_END, // <-- AÑADIR (Exponer umbral)
            seekToTimestamp: seekToTimestamp // <-- LÍNEA AÑADIDA
        };
    })();

    if (typeof VLOITZ_DEV_MODE !== 'undefined' && VLOITZ_DEV_MODE) {
        window.TrackNavigator = TrackNavigator;
    }
    // --- FIN: Módulo de Navegación ---

    // --- INICIO: Lógica Botón Auto-Bucle (Fase 2) ---
    if (autoLoopBtn) {
        autoLoopBtn.addEventListener('click', () => {
            isAutoLoopActive = !isAutoLoopActive; // Alternar estado
            autoLoopBtn.classList.toggle('active', isAutoLoopActive); // Alternar clase CSS
            console.log(`[AutoLoop] Modo Auto-Bucle ${isAutoLoopActive ? 'ACTIVADO' : 'DESACTIVADO'}.`); // LOG

            // Opcional: Podríamos guardar este estado en localStorage también si quisiéramos que se recuerde
            localStorage.setItem('vloitz_auto_loop', isAutoLoopActive);
            // Y cargarlo al inicio:
            isAutoLoopActive = localStorage.getItem('vloitz_auto_loop') === 'true';
            autoLoopBtn.classList.toggle('active', isAutoLoopActive);
        });

        // Cargar estado inicial (si decidimos guardarlo en localStorage)
        isAutoLoopActive = localStorage.getItem('vloitz_auto_loop') === 'true';
        autoLoopBtn.classList.toggle('active', isAutoLoopActive);

    } else {
        console.warn("[AutoLoop] Botón Auto-Bucle no encontrado."); // LOG
    }
    // --- FIN: Lógica Botón ---

    // --- LÓGICA MODO ESPECTRO (Fase 8 - Corregida) ---
    function toggleSpectrumState() {
        // 1. Actualizar UI del botón
        if (spectrumBtn) {
            spectrumBtn.classList.toggle('active', isSpectrumActive);
        }

        // 2. Gestionar la Onda y el Playlist
        if (isSpectrumActive) {
            // ACTIVAR: Pintar regiones
            paintWaveformRegions();

            // --- NUEVO: Restaurar color del texto ACTIVO inmediatamente ---
            const activeTitle = document.querySelector('.track-title.track-title-playing');
            if (activeTitle) {
                const activeItem = activeTitle.closest('.current-tracklist-item');
                if (activeItem && activeItem.dataset.activeColor) {
                    activeTitle.style.color = activeItem.dataset.activeColor;
                }
            }
            // -------------------------------------------------------------

            console.log("[Spectrum] Activado.");
        } else {
            // DESACTIVAR: Borrar regiones y limpiar colores de texto
            if (wsRegions) wsRegions.clearRegions();

            // Limpiar colores forzados en el playlist
            const allTracks = document.querySelectorAll('.current-tracklist-item .track-title');
            allTracks.forEach(el => el.style.color = '');

            console.log("[Spectrum] Desactivado.");
        }

        // 3. Guardar preferencia
        localStorage.setItem('vloitz_spectrum', isSpectrumActive);
    }

    // Listener del botón
    if (spectrumBtn) {
        spectrumBtn.addEventListener('click', () => {
            isSpectrumActive = !isSpectrumActive;
            toggleSpectrumState();
        });
        // Estado inicial visual del botón
        spectrumBtn.classList.toggle('active', isSpectrumActive);
    }

    // --- INICIO: Listeners para Skip Buttons ---
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            window.vloitzLaserCleanup(true); // 🛡️ MATRIZ COLAPSO
            console.log("Clic Previous");
            focusPlayerCard();
            TrackNavigator.goToPrevious();
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            window.vloitzLaserCleanup(true); // 🛡️ MATRIZ COLAPSO
            console.log("Clic Next");
            focusPlayerCard();
            TrackNavigator.goToNext();
        });
    }
    // --- FIN: Listeners para Skip Buttons ---

    // --- Listeners para Seek Buttons (+/- 5s) ---
    if (seekBackBtn) {
        seekBackBtn.addEventListener('click', () => {
            if (wavesurfer) {
                window.vloitzLaserCleanup(true); // 🛡️ MATRIZ COLAPSO
                wavesurfer.skip(-5);
                console.log("Seek -5s");
            }
        });
    }

    if (seekFwdBtn) {
        seekFwdBtn.addEventListener('click', () => {
            if (wavesurfer) {
                window.vloitzLaserCleanup(true); // 🛡️ MATRIZ COLAPSO
                wavesurfer.skip(5);
                console.log("Seek +5s");
            }
        });
    }

    // --- INICIO: Inicialización ShareController (Fase 5) ---
    if (typeof ShareController !== 'undefined') {
        ShareController.init();
    }
    // --- FIN: Inicialización ShareController ---

    // Inicializar Opt-Out Engine
    if (typeof BlacklistController !== 'undefined') {
        BlacklistController.init();
    }

    // --- INICIO: Inicialización OptOutController (Fase 4) ---
    if (typeof OptOutController !== 'undefined') {
        OptOutController.init();
    }
    // --- FIN: Inicialización OptOutController ---

    console.log("Aplicación inicializada y listeners configurados."); // LOG FINAL INIT

    // --- FASE 12/13: Estrategia PWA Universal (Android + iOS Fix) ---
    let deferredPrompt;
    let ghostTimer;
    const progressFill = document.getElementById('pwaProgressFill');

    // Detección de iOS (iPhone/iPad)
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    // 🛡️ ESCUDO UNIVERSAL: Detecta si estamos DENTRO de la Web App (iOS + Android + PC)
    const isInStandaloneMode = (window.matchMedia('(display-mode: standalone)').matches) || ('standalone' in window.navigator && window.navigator.standalone);

    const PWA_CONFIG = {
        INITIAL_DELAY: 20000, // <-- 60 segundos exactos después del primer Play
        GHOST_INTERVALS_MIN: [4, 9, 15, 25],
        GHOST_DURATION: 5000
    };

    // Variable para saber si ya iniciamos la cuenta regresiva
    let pwaPromptTriggered = false;

    // 1. Lógica para ANDROID (Captura silenciosa)
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        console.log("[PWA] Evento de instalación capturado silenciosamente.");
    });

    // 2. Lógica para iOS (Solo validamos que esté en iOS)
    if (isIos && !isInStandaloneMode) {
        console.log("[PWA] iOS detectado en navegador. Listo para ofrecer App.");
    }

    // Función 1: Aviso Fijo
    function showStickyPrompt() {
        const pwaToast = document.getElementById('vloitz-pwa-prompt'); // ID Actualizado
        if (!pwaToast) return;

        pwaToast.classList.add('show'); // Nueva forma de mostrar
        if (progressFill) {
            progressFill.style.transition = 'none';
            progressFill.style.width = '0%';
        }
        setupButtons(pwaToast, true);
    }

    // Función 2: Programar Fantasma
    function scheduleNextGhost() {
        const minutes = PWA_CONFIG.GHOST_INTERVALS_MIN[Math.floor(Math.random() * PWA_CONFIG.GHOST_INTERVALS_MIN.length)];
        const delayMs = minutes * 60 * 1000;
        console.log(`[PWA] Próximo fantasma en ${(delayMs/1000).toFixed(0)} segundos.`);

        if (ghostTimer) clearTimeout(ghostTimer);
        ghostTimer = setTimeout(() => {
            triggerGhost();
        }, delayMs);
    }

    // Función 3: El Fantasma
    function triggerGhost() {
        const pwaToast = document.getElementById('vloitz-pwa-prompt'); // ID Actualizado
        if (!pwaToast) return;

        if (progressFill) {
            progressFill.style.transition = 'none';
            progressFill.style.width = '100%';
        }

        pwaToast.classList.add('show'); // Nueva forma de mostrar
        setupButtons(pwaToast, false);

        setTimeout(() => {
            if (progressFill) {
                progressFill.style.transition = `width ${PWA_CONFIG.GHOST_DURATION}ms linear`;
                progressFill.style.width = '0%';
            }
        }, 50);

        setTimeout(() => {
            if (pwaToast.classList.contains('show')) {
                pwaToast.classList.remove('show');
                scheduleNextGhost();
            }
        }, PWA_CONFIG.GHOST_DURATION);
    }

    // Configuración de botones (ADAPTADA PARA EL NUEVO DISEÑO)
    function setupButtons(pwaToast, isStickyMode) {
        const installBtn = document.getElementById('pwaInstallBtn');
        const dismissBtn = document.getElementById('pwaDismissBtn');

        // Referencias al nuevo diseño
        const iosSteps = document.getElementById('ios-guide-steps');
        const descText = document.getElementById('toast-desc-text');

        if (isIos) {
            // MODO iOS: Expandimos la tarjeta ultra resumida
            iosSteps.style.display = 'block';
            descText.textContent = 'Instala la Web App Oficial para música sin cortes:';
            installBtn.textContent = 'Entendido';
        } else {
            // MODO ANDROID: Diseño limpio y confiable
            iosSteps.style.display = 'none';
            descText.textContent = 'Instala la Web App Oficial. Segura, ligera y con audio HIFI sin interrupciones.';
            installBtn.textContent = 'Instalar App';
        }

        // INSTALAR / ENTENDIDO
        installBtn.onclick = async () => {
            pwaToast.classList.remove('show'); // Ocultar con estilo

            if (isIos) {
                // Si es iOS, el botón solo sirve para cerrar (ya le dimos las instrucciones)
                if (isStickyMode) scheduleNextGhost();
            } else {
                // EN ANDROID: Instalación automática
                if (ghostTimer) clearTimeout(ghostTimer);
                if (deferredPrompt) {
                    deferredPrompt.prompt();
                    const {
                        outcome
                    } = await deferredPrompt.userChoice;
                    console.log(`[PWA] Decisión: ${outcome}`);
                    deferredPrompt = null;
                }
            }
        };

        // AHORA NO
        dismissBtn.onclick = () => {
            pwaToast.classList.remove('show'); // Ocultar con estilo
            scheduleNextGhost();
        };
    }

    // --- INICIO: RADAR VLOITZ (Recordatorio Híbrido) ---
    async function checkAndShowReminder() {
        if (isInStandaloneMode) return false; // El usuario ya está dentro de la app nativa

        // Verificar el escudo de silencio (48 horas = 172800000 ms)
        const silenceUntil = localStorage.getItem('vloitz_silence_reminder');
        if (silenceUntil && Date.now() < parseInt(silenceUntil)) return false;

        let isInstalled = false;

        // 1. Escáner API Nativa (Android/Chrome)
        if ('getInstalledRelatedApps' in navigator) {
            try {
                const relatedApps = await navigator.getInstalledRelatedApps();
                if (relatedApps.length > 0) isInstalled = true;
            } catch (e) {
                console.warn("[Radar Vloitz] API Nativa bloqueada o no soportada.");
            }
        }

        // 2. Escáner de Memoria Local (Fallback iOS/Safari)
        if (!isInstalled && localStorage.getItem('vloitz_pwa_installed') === 'true') {
            isInstalled = true;
        }

        // 3. Despliegue Táctico
        if (isInstalled) {
            showReminderToast();
            return true;
        }
        return false;
    }

    function showReminderToast() {
        const pwaToast = document.getElementById('vloitz-pwa-prompt');
        const iosSteps = document.getElementById('ios-guide-steps');
        const descText = document.getElementById('toast-desc-text');
        const installBtn = document.getElementById('pwaInstallBtn');
        const dismissBtn = document.getElementById('pwaDismissBtn');
        const titleText = document.getElementById('toast-title-text');

        if (!pwaToast) return;

        // UI Minimalista del Recordatorio
        iosSteps.style.display = 'none';
        titleText.textContent = 'Vloitz App Instalada';
        descText.textContent = 'Abre la app desde tu inicio para aislar el reproductor y escuchar a pantalla completa.';

        installBtn.style.display = 'none'; // Ocultamos el botón de instalar
        dismissBtn.textContent = 'Omitir'; // Acción directa de escape

        // Restaurar barra de progreso visual
        if (progressFill) {
            progressFill.style.transition = 'none';
            progressFill.style.width = '100%';
        }

        pwaToast.classList.add('show');

        // Ejecutar drenado de barra
        setTimeout(() => {
            if (progressFill) {
                progressFill.style.transition = `width ${PWA_CONFIG.GHOST_DURATION}ms linear`;
                progressFill.style.width = '0%';
            }
        }, 50);

        // Lógica de Silencio al Omitir
        dismissBtn.onclick = () => {
            pwaToast.classList.remove('show');
            localStorage.setItem('vloitz_silence_reminder', Date.now() + 172800000); // Bloqueado por 48h
        };

        // Auto-Destrucción si el usuario no toca nada
        setTimeout(() => {
            if (pwaToast.classList.contains('show')) {
                pwaToast.classList.remove('show');
            }
        }, PWA_CONFIG.GHOST_DURATION);
    }
    // --- FIN: RADAR VLOITZ ---

    window.addEventListener('appinstalled', () => {
        // --- INYECCIÓN: Memoria de Instalación ---
        localStorage.setItem('vloitz_pwa_installed', 'true');
        // -----------------------------------------

        const pwaToast = document.getElementById('vloitz-pwa-prompt'); // ID Actualizado
        if (pwaToast) pwaToast.classList.remove('show'); // Removemos la clase en lugar de cambiar el display
        if (ghostTimer) clearTimeout(ghostTimer);
    });

    // --- INICIO: REGISTRO PWA CON AUTOPSIA DE HARDWARE (MODO TORTUGA) ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js').then((registration) => {
                console.log('%c[PWA] Service Worker Registrado Correctamente', 'color: #39FF14; font-weight: bold;');

                // --- MOTOR ADAPTATIVO VLOITZ (3 NIVELES) ---
                const ram = navigator.deviceMemory || 4; // RAM en GB
                const cores = navigator.hardwareConcurrency || 2;
                const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

                // Determinamos el Tier (Nivel) de rendimiento
                let performanceTier = "ALTA/PC";
                if (ram < 4) performanceTier = "BAJA";
                else if (ram >= 4 && ram < 8) performanceTier = "MEDIA";
                globalPerformanceTier = performanceTier; // Sincronización para el Preloader
                console.log(`%c[Hardware] Perfil Detectado: ${performanceTier} | RAM: ${ram}GB | Cores: ${cores} | Tipo: ${isTouch ? 'Móvil/Tablet' : 'Desktop'}`, 'color: #00F3FF;');

                // Función única para enviar la configuración al SW
                const sendHardwareConfig = () => {
                    if (registration.active) {
                        registration.active.postMessage({
                            type: 'CONFIG_HARDWARE',
                            tier: performanceTier,
                            isLowEnd: ram < 4,
                            ram: ram,
                            device: isTouch ? 'mobile' : 'desktop',
                            isIOS: isIos // <--- AÑADIDO: Salvoconducto iOS
                        });
                        console.log('%c[PWA] Reporte de hardware enviado al Escudo de Datos.', 'color: #39FF14; font-size: 10px;');
                    }
                };

                // Sincronización: Si el SW ya está activo enviamos, si no, esperamos al cambio de estado
                if (registration.active) {
                    sendHardwareConfig();
                } else {
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        if (newWorker) {
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'activated') sendHardwareConfig();
                            });
                        }
                    });
                }
            }).catch((err) => {
                console.error('[PWA] Error crítico de registro:', err);
            });
        });
    }
    // --- FIN: REGISTRO PWA ---

    // --- INICIO: BUSCADOR DE SETS V-MATRIX ---
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const trackItems = tracklistElement.querySelectorAll('.track-item');
            let visibleCount = 0;

            trackItems.forEach(item => {
                const title = item.querySelector('.track-item-title').textContent.toLowerCase();
                const date = item.querySelector('.track-item-date').textContent.toLowerCase();

                // Lógica de filtrado: Busca coincidencias en Título o en Fecha
                if (title.includes(term) || date.includes(term)) {
                    item.style.display = 'flex'; // Mantener el flexbox que configuramos
                    visibleCount++;
                } else {
                    item.style.display = 'none'; // Ocultar instantáneamente
                }
            });

            console.log(`[Buscador Vloitz] Filtrando: "${term}" - Resultados activos: ${visibleCount}`);
        });
    }
    // --- FIN: BUSCADOR DE SETS V-MATRIX ---

    // --- INICIO: VLOITZ AUTO-RELOAD (Recarga Segura) ---
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', (event) => {

            if (event.data && event.data.type === 'ACTUALIZACION_CRITICA') {
                console.log('%c[Vloitz] 🚨 Código base actualizado (VLOITZ_DEV_MODE). Recarga OBLIGATORIA...', "background: #ff0000; color: #fff; font-weight: bold; padding: 2px;");
                window.location.reload();
                return; // Corta la ejecución aquí
            }

            if (event.data && event.data.type === 'NUEVO_SET_DETECTADO') {
                // Tu logica Maestra: Solo recargar si estamos en la raiz (Sin Autoplay)
                if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
                    console.log('%c[Vloitz] 🔥 Nuevo set detectado en segundo plano. Forzando recarga segura...', "color: #FFD700; font-weight: bold;");
                    window.location.reload();
                } else {
                    console.log('[Vloitz] Nuevo set detectado, pero se omitio la recarga para no interrumpir la musica.');
                }
            }
        });
    }
    // --- FIN: VLOITZ AUTO-RELOAD ---

    // ==========================================================================
    // [VLOITZ LIGHT-ENGINE v4.2] - Gestión Atmosférica Automática
    // ==========================================================================
    // Regla de Control: Activación global y visibilidad de UI
    const VLOITZ_ATMOSPHERE_ENABLED = true;
    const VLOITZ_ATMOSPHERE_UI = false; // FALSE: Automático (Público) | TRUE: Manual (Consola/Dev)

    const AtmosphereController = (() => {
        if (!VLOITZ_ATMOSPHERE_ENABLED) return;

        // Matriz de Opacidad Mínima: Elevamos el negro a Azul Abisal Premium
        const atmospheres = [{
                h: 0,
                dark: [8, 10, 18],
                light: [18, 20, 30],
                lens: [5, 10, 45],
                alpha: 0.25,
                sat: 0.6
            }, // Noche Abisal
            {
                h: 6,
                dark: [18, 10, 25],
                light: [28, 15, 35],
                lens: [80, 20, 100],
                alpha: 0.15,
                sat: 0.8
            }, // Alba
            {
                h: 10,
                dark: [12, 18, 25],
                light: [20, 28, 35],
                lens: [100, 160, 255],
                alpha: 0.12, // Reducimos la niebla azulada para mayor claridad
                sat: 0.85 // Subimos la saturación para recuperar la viveza de la foto
            }, // Mañana
            {
                h: 14,
                dark: [15, 22, 30],
                light: [25, 32, 40],
                lens: [180, 220, 255],
                alpha: 0.05, // Casi invisible en el pico de luz del día
                sat: 1.0 // Color 100% pleno al mediodía
            }, // Mediodía
            {
                h: 18,
                dark: [35, 10, 10],
                light: [45, 15, 18],
                lens: [255, 50, 20],
                alpha: 0.00,
                sat: 1.0
            }, // OCASO NATIVO (0% Opacidad)
            {
                h: 20,
                dark: [8, 12, 30],
                light: [18, 22, 40],
                lens: [10, 20, 100],
                alpha: 0.20,
                sat: 0.8
            }, // Hora Azul
            {
                h: 24,
                dark: [8, 10, 18],
                light: [18, 20, 30],
                lens: [5, 10, 45],
                alpha: 0.25,
                sat: 0.6
            }
        ];

        const root = document.documentElement;
        const banner = document.querySelector('.profile-banner');
        let lens = null;

        const init = () => {
            console.log("%c[Atmosphere] 🌌 Motor v4.2 Activo (Azul Abisal Premium)", "color: #1DB954; font-weight: bold;");

            if (banner) {
                // 1. Configuración de Banner (Limpieza de filtros estáticos)
                banner.style.position = 'relative';
                banner.style.overflow = 'hidden';
                banner.style.filter = 'none';

                // 2. Inyección del Lente Atmosférico (Única responsabilidad del JS aquí)
                lens = document.createElement('div');
                lens.id = 'v-pro-lens';
                Object.assign(lens.style, {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    transition: 'background-color 0.4s ease, opacity 0.4s ease',
                    zIndex: 1
                });
                banner.appendChild(lens);
            }

            if (VLOITZ_ATMOSPHERE_UI) {
                renderUI();
            } else {
                startAutomaticMode();
            }
        };

        const startAutomaticMode = () => {
            const autoUpdate = () => {
                const now = new Date();
                const decimalTime = now.getHours() + (now.getMinutes() / 60);
                update(decimalTime);
            };
            autoUpdate();
            setInterval(autoUpdate, 60000); // Sincronización cada minuto
        };

        const renderUI = () => {
            const oldUi = document.querySelector('[data-v-ui]');
            if (oldUi) oldUi.remove();
            const ui = document.createElement('div');
            ui.setAttribute('data-v-ui', '');
            ui.innerHTML = `
                <div style="position:fixed; bottom:25px; left:50%; transform:translateX(-50%); background:rgba(5,5,8,0.95); backdrop-filter:blur(30px); border:1px solid rgba(255,255,255,0.08); padding:16px 24px; border-radius:22px; z-index:999999; color:white; font-family:sans-serif; text-align:center; width: 85%; max-width: 310px; box-shadow: 0 15px 40px rgba(0,0,0,0.8);">
                    <div style="font-size:9px; font-weight:900; margin-bottom:8px; letter-spacing:4px; color:#1DB954; opacity:0.8;">VLOITZ LIGHT-ENGINE</div>
                    <div style="font-size:16px; font-weight:200; margin-bottom:12px;">HORA: <span id="v-time" style="font-weight:700; color:#fff;">12:00</span></div>
                    <input type="range" id="v-slider" min="0" max="24" step="0.1" value="18.0" style="width:100%; cursor:pointer; accent-color:#1DB954;">
                </div>
            `;
            document.body.appendChild(ui);

            const slider = document.getElementById('v-slider');
            const timeDisp = document.getElementById('v-time');

            slider.addEventListener('input', (e) => {
                const t = parseFloat(e.target.value);
                const h = Math.floor(t),
                    m = Math.floor((t - h) * 60);
                timeDisp.innerText = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
                update(t);
            });
            update(parseFloat(slider.value));
        };

        const update = (time) => {
            let s = atmospheres[0],
                e = atmospheres[atmospheres.length - 1];
            for (let i = 0; i < atmospheres.length - 1; i++) {
                if (time >= atmospheres[i].h && time <= atmospheres[i + 1].h) {
                    s = atmospheres[i];
                    e = atmospheres[i + 1];
                    break;
                }
            }
            const p = (time - s.h) / (e.h - s.h || 1);
            const ease = p * p * (3 - 2 * p);

            const lerp = (a, b, t) => Math.round(a + (b - a) * t);
            const lerpFloat = (a, b, t) => parseFloat(a + (b - a) * t).toFixed(3);

            const colors = {
                dark: `rgb(${lerp(s.dark[0], e.dark[0], ease)}, ${lerp(s.dark[1], e.dark[1], ease)}, ${lerp(s.dark[2], e.dark[2], ease)})`,
                light: `rgb(${lerp(s.light[0], e.light[0], ease)}, ${lerp(s.light[1], e.light[1], ease)}, ${lerp(s.light[2], e.light[2], ease)})`,
                lensRGB: `rgb(${lerp(s.lens[0], e.lens[0], ease)}, ${lerp(s.lens[1], e.lens[1], ease)}, ${lerp(s.lens[2], e.lens[2], ease)})`,
                alpha: lerpFloat(s.alpha, e.alpha, ease),
                sat: lerpFloat(s.sat, e.sat, ease)
            };

            // 🛑 LÓGICA VLOITZ: Detección del Canvas WebGL (Feature Flag)
            const isVisualizerActive = (typeof PORTADA_VISUAL_BETA !== 'undefined') &&
                PORTADA_VISUAL_BETA.master_switch &&
                PORTADA_VISUAL_BETA.enable_mobile &&
                window.innerWidth <= 768;

            if (isVisualizerActive) {
                // Motor activo en móvil: Eliminamos la inyección de color por JavaScript.
                // Al no declararlo, dejamos que el CSS nativo (negro por defecto) de tu proyecto respire.
                root.style.removeProperty('--dark-bg');
                root.style.removeProperty('--light-bg');
            } else {
                // Motor apagado o en PC: Comportamiento normal del lente horario
                root.style.setProperty('--dark-bg', colors.dark);
                root.style.setProperty('--light-bg', colors.light);
            }

            // La portada puede seguir recibiendo los filtros tranquilamente
            // porque el canvas WebGL está dibujado de forma absoluta por encima y la tapa.
            if (lens) {
                lens.style.backgroundColor = colors.lensRGB;
                lens.style.opacity = colors.alpha;
                lens.style.mixBlendMode = 'soft-light';
            }
            if (banner) banner.style.filter = `saturate(${colors.sat})`;
        };

        return {
            init
        };
    })();

    // Ejecución del módulo independiente
    if (AtmosphereController) AtmosphereController.init();

    // ==========================================================================
    // [MODULE] VLOITZ KEYBOARD ENGINE (Zero-Redundancy Shortcuts)
    // ==========================================================================
    const KeyboardController = (() => {
        const SKIP = {
            NORMAL: 15,
            MICRO: 5
        };

        const actions = {
            'Space': (e) => {
                e.preventDefault();
                wavesurfer.playPause();
            },
            'ArrowRight': (e) => {
                const amount = e.shiftKey ? SKIP.MICRO : SKIP.NORMAL;
                wavesurfer.skip(amount);
            },
            'ArrowLeft': (e) => {
                const amount = e.shiftKey ? -SKIP.MICRO : -SKIP.NORMAL;
                wavesurfer.skip(amount);
            }
        };

        const handleKeyPress = (e) => {
            if (!e.isTrusted) {
                console.warn("[Seguridad] Teclado bloqueado: Evento sintético.");
                return;
            }
            if (['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable) return;
            const executeAction = actions[e.code];
            if (executeAction) executeAction(e);
        };

        return {
            init: () => {
                document.addEventListener('keydown', handleKeyPress);
                console.log("%c[Vloitz Keyboard] 🎹 Motor de atajos cargado.", "color: #1DB954; font-weight: bold;");
            }
        };
    })();

    KeyboardController.init();
    // ==========================================================================

    // ==========================================================================
    // [ORQUESTADOR VISUAL] Integración con portada_visual.js
    // ==========================================================================
    if (typeof PortadaVisualEngine !== 'undefined') {
        PortadaVisualEngine.init(PORTADA_VISUAL_BETA);
    }

    // ==========================================================================
    // 🌉 FASE 2: VLOITZ SECURE BRIDGE (API AISLADA PARA MÓDULOS EXTERNOS)
    // ==========================================================================
    window.VloitzStoryBridge = {
        isReady: () => wavesurfer !== null,
        getCurrentTime: () => wavesurfer ? wavesurfer.getCurrentTime() : 0,
        getDuration: () => wavesurfer ? wavesurfer.getDuration() : 0,
        seekTo: (progress) => {
            if (wavesurfer) wavesurfer.seekTo(progress);
        },
        isPlaying: () => wavesurfer ? wavesurfer.isPlaying() : false,
        // La clave biométrica: Solo reproduce si recibe un evento confiable (clic físico)
        triggerPlay: (e) => {
            if (e && e.isTrusted && wavesurfer) {
                wavesurfer.play();
            } else {
                console.warn("[Secure Bridge] Play bloqueado: Evento automatizado o nulo.");
            }
        },
        getSetData: () => currentLoadedSet || null
    };

    // ==========================================================================
    // [MODULE] VLOITZ UPDATE CONTROLLER (PWA Update Toast & Force Refresh)
    // ==========================================================================
    const UpdateBannerController = (() => {
        let newWorker = null;
        let toastElement = null;

        const injectStyles = () => {
            if (document.getElementById('vloitz-update-styles')) return;
            const style = document.createElement('style');
            style.id = 'vloitz-update-styles';
            style.innerHTML = `.vloitz-update-toast{position:fixed;bottom:24px;right:24px;z-index:999999;background:rgba(20,22,27,0.95);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:16px 20px;box-shadow:0 10px 30px rgba(0,0,0,0.6);max-width:380px;width:calc(100% - 48px);box-sizing:border-box;transform:translateY(100px);opacity:0;visibility:hidden;transition:all 0.35s cubic-bezier(0.16,1,0.3,1);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}.vloitz-update-toast.show{transform:translateY(0);opacity:1;visibility:visible}.vloitz-update-content{display:flex;align-items:center;gap:14px}.vloitz-update-icon{background:rgba(29,185,84,0.12);color:#1DB954;width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}.vloitz-update-icon svg{width:20px;height:20px;animation:spin-slow 4s linear infinite}@keyframes spin-slow{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}.vloitz-update-text{flex-grow:1;display:flex;flex-direction:column;gap:2px}.vloitz-update-title{font-size:13px;font-weight:600;color:#fff;letter-spacing:0.2px}.vloitz-update-desc{font-size:11px;color:#9ca3af;line-height:1.3}.vloitz-update-actions{display:flex;gap:8px;margin-left:4px}.vloitz-btn{font-size:12px;font-weight:600;padding:8px 12px;border-radius:8px;cursor:pointer;border:none;transition:all 0.2s ease}.vloitz-btn-sec{background:transparent;color:#9ca3af}.vloitz-btn-sec:hover{color:#fff;background:rgba(255,255,255,0.05)}.vloitz-btn-pri{background:#1DB954;color:#000;box-shadow:0 2px 8px rgba(29,185,84,0.25)}.vloitz-btn-pri:hover{background:#1ed760;transform:translateY(-1px)}@media (max-width: 768px){.vloitz-update-toast{bottom:16px;right:16px;left:16px;width:auto}.vloitz-update-content{flex-direction:column;align-items:flex-start;gap:12px}.vloitz-update-actions{width:100%;justify-content:flex-end;margin-left:0}}`;
            document.head.appendChild(style);
        };

        const createToastDOM = () => {
            if (document.getElementById('vloitz-update-toast')) return;
            toastElement = document.createElement('div');
            toastElement.id = 'vloitz-update-toast';
            toastElement.className = 'vloitz-update-toast';
            toastElement.innerHTML = `
                <div class="vloitz-update-content">
                    <div class="vloitz-update-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.66-5.66"/>
                        </svg>
                    </div>
                    <div class="vloitz-update-text">
                        <span class="vloitz-update-title">Actualización lista</span>
                        <span class="vloitz-update-desc">Una nueva versión de Vloitz está disponible.</span>
                    </div>
                    <div class="vloitz-update-actions">
                        <button id="updateDismissBtn" class="vloitz-btn vloitz-btn-sec">Ahora no</button>
                        <button id="updateApplyBtn" class="vloitz-btn vloitz-btn-pri">Actualizar</button>
                    </div>
                </div>
            `;
            document.body.appendChild(toastElement);

            document.getElementById('updateDismissBtn').addEventListener('click', () => {
                toastElement.classList.remove('show');
            });

            document.getElementById('updateApplyBtn').addEventListener('click', (e) => {
                const btn = e.currentTarget;
                if (btn.dataset.updating === "true") return; // 🛑 Evita doble clic (Spam Anti-Ametralladora)

                btn.dataset.updating = "true";
                btn.textContent = "Actualizando...";
                btn.style.opacity = "0.7";
                btn.style.pointerEvents = "none";

                if (newWorker) {
                    newWorker.postMessage({
                        type: 'SKIP_WAITING'
                    });

                    // 🛡️ SALVAVIDAS (Watchdog de recarga): Si en 2 segundos el Service Worker
                    // no recarga automáticamente por el evento controllerchange, forzamos la recarga manual.
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);

                } else {
                    // Fallback de emergencia si el worker no está en memoria
                    window.location.reload();
                }
            });
        };

        const initListener = () => {
            if (!('serviceWorker' in navigator)) return;

            navigator.serviceWorker.ready.then(registration => {
                if (registration.waiting) {
                    newWorker = registration.waiting;
                    showToast();
                }

                registration.addEventListener('updatefound', () => {
                    const installingWorker = registration.installing;
                    if (installingWorker) {
                        installingWorker.addEventListener('statechange', () => {
                            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                newWorker = installingWorker;
                                showToast();
                            }
                        });
                    }
                });
            });

            let refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                // 🦊 FIX FIREFOX: Validamos una bandera global en sessionStorage para evitar bucles de recarga infinitos
                if (refreshing || sessionStorage.getItem('vloitz_reloading')) return;

                refreshing = true;
                sessionStorage.setItem('vloitz_reloading', 'true');

                window.location.reload();
            });
        };

        const showToast = () => {
            injectStyles();
            createToastDOM();
            if (toastElement) {
                setTimeout(() => toastElement.classList.add('show'), 500);
            }
        };

        return {
            init: () => {
                initListener();
            }
        };
    })();

    UpdateBannerController.init();
    // ==========================================================================


}); // Este cierra el DOMContentLoaded del inicio del archivo (Línea 27)