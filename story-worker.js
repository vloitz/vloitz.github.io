import {
    Output,
    Mp4OutputFormat,
    BufferTarget,
    EncodedVideoPacketSource,
    EncodedAudioPacketSource,
    EncodedPacket
} from 'https://esm.sh/mediabunny';

let workerState = {
    coverBitmap: null,
    audioData: new Array(20).fill(5),
    cacheTotalFrames: 30 // ← fijamos 30 frames (1 segundo a 30fps) para limitar memoria
};

// ==========================================================================
// 📥 ESCUCHA DE MENSAJES DESDE EL HILO PRINCIPAL
// ==========================================================================
self.onmessage = async (e) => {
    const {
        type,
        payload
    } = e.data;

    if (type === 'START_EXPORT') {
        try {
            if (payload.coverBitmap) {
                workerState.coverBitmap = payload.coverBitmap;
            }
            await executeExportPipeline(payload);
            self.postMessage({
                type: 'EXPORT_SUCCESS'
            });
        } catch (err) {
            console.error("[Vloitz Worker] ❌ Error crítico en exportación:", err);
            self.postMessage({
                type: 'EXPORT_ERROR',
                error: err.message
            });
        }
    }
};

// ==========================================================================
// ⚙️ PIPELINE DE EXPORTACIÓN (MEDIABUNNY + BUFFER RAM + AUDIO CORREGIDO)
// ==========================================================================
async function executeExportPipeline(config) {
    const startTime = performance.now(); // ⏱️ Inicio del cronómetro quirúrgico
    const canvas = new OffscreenCanvas(config.width || 360, config.height || 640);
    const ctx = canvas.getContext('2d', {
        alpha: false,
        desynchronized: true
    });

    ctx.imageSmoothingEnabled = false;

    // 🧠 CÁLCULO DE ARQUITECTURA: Tamaño Dinámico de la Caché (máximo 30 frames)
    const currentVinylSpeed = config.vinylSpeed !== undefined ? config.vinylSpeed : 1.0;
    if (config.vinylMode === 2 && currentVinylSpeed > 0) {
        workerState.cacheTotalFrames = Math.ceil(config.fps * (1 / (0.08 * currentVinylSpeed)));
    } else {
        workerState.cacheTotalFrames = config.fps;
    }
    // ✅ FORZAMOS LÍMITE MÁXIMO DE 30 FRAMES PARA EVITAR SATURACIÓN DE VRAM
    workerState.cacheTotalFrames = Math.min(workerState.cacheTotalFrames, 30);

    // Límite de seguridad de RAM: Si el ciclo completo es mayor que la duración del video, cacheamos solo el total del video
    const totalVideoFrames = config.durationSeconds * config.fps;
    if (workerState.cacheTotalFrames > totalVideoFrames) {
        workerState.cacheTotalFrames = totalVideoFrames;
    }

    // ⚡ PRE-CACHÉ 1: Fondo inmersivo con blur UNA SOLA VEZ
    let preRenderedBgBitmap = null;
    if (config.immersiveBg && workerState.coverBitmap) {
        const bgCanvas = new OffscreenCanvas(config.width, config.height);
        const bgCtx = bgCanvas.getContext('2d');
        bgCtx.filter = `blur(${config.blurValue || 40}px) brightness(0.3)`;
        bgCtx.drawImage(workerState.coverBitmap, -50, -50, config.width + 100, config.height + 100);
        preRenderedBgBitmap = bgCanvas.transferToImageBitmap();
    }

    // ⚡ PRE-CACHÉ 2: Vinilo y surcos UNA SOLA VEZ
    let preRenderedVinylBitmap = null;
    if (config.vinylMode > 0) {
        const cardW = config.width * 0.90;
        const imgSize = cardW * 0.85;
        const vCanvas = new OffscreenCanvas(imgSize, imgSize);
        const vCtx = vCanvas.getContext('2d');
        const centerX = imgSize / 2;
        const centerY = imgSize / 2;

        vCtx.beginPath();
        vCtx.arc(centerX, centerY, imgSize / 2, 0, Math.PI * 2);
        vCtx.fillStyle = '#000000';
        vCtx.fill();

        vCtx.lineWidth = 1;
        const labelRadius = imgSize * 0.32;
        const outerRadius = imgSize / 2 - 4;
        for (let r = labelRadius + 12; r < outerRadius; r += 6) {
            vCtx.beginPath();
            vCtx.arc(centerX, centerY, r, 0, Math.PI * 2);
            vCtx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
            vCtx.stroke();
        }
        preRenderedVinylBitmap = vCanvas.transferToImageBitmap();
    }

    // 🚀 FASE DE WARM-UP: Pre-renderizado del Bucle Matemático Perfecto a RAM
    self.postMessage({
        type: 'EXPORT_PROGRESS',
        progress: 0,
        text: `🔥 Generando Caché Temporal (${workerState.cacheTotalFrames} frames)...`
    });

    workerState.cachedFrames = [];
    const warmUpCanvas = new OffscreenCanvas(config.width || 360, config.height || 640);
    const warmUpCtx = warmUpCanvas.getContext('2d', {
        alpha: false,
        desynchronized: true
    });

    warmUpCtx.imageSmoothingEnabled = false;

    // 🧠 CACHÉ CIRCULAR OPTIMIZADA: Limitamos el Warm-up máximo a 60 frames (1 segundo) para blindar la VRAM del móvil
    const maxCacheLimit = Math.min(workerState.cacheTotalFrames, config.fps);
    workerState.cacheTotalFrames = maxCacheLimit; // Forzamos el ciclo al segundo exacto

    for (let i = 0; i < maxCacheLimit; i++) {
        const simSeconds = i / config.fps;
        updateAudioSimulation(i, config.fps);
        renderFrameOptimized(warmUpCanvas, warmUpCtx, i, simSeconds, config, preRenderedBgBitmap, preRenderedVinylBitmap, true);
        workerState.cachedFrames.push(warmUpCanvas.transferToImageBitmap());
    }
    // Reiniciamos el simulador para evitar desincronización de ondas en el render final
    workerState.audioData.fill(5);

    // 1. Configuración de Mediabunny con BufferTarget en RAM (Velocidad extrema)
    const output = new Output({
        format: new Mp4OutputFormat({
            fastStart: 'in-memory'
        }),
        target: new BufferTarget()
    });

    // 2. Configuración de Pistas
    const audioSource = new EncodedAudioPacketSource('aac');
    output.addAudioTrack(audioSource);

    const videoSource = new EncodedVideoPacketSource('avc');
    output.addVideoTrack(videoSource);

    // 🚀 Arrancar Mediabunny
    await output.start();

    // 🧠 MOTOR NATIVO V8: Aceleración por hardware asíncrona pura
    let videoEncoder = new VideoEncoder({
        output: (chunk, meta) => {
            const packet = EncodedPacket.fromEncodedChunk(chunk);
            videoSource.add(packet, meta); // Inyección en O(1), sin 'await' bloqueante
        },
        error: e => console.error("[Vloitz Worker] ❌ Video Error:", e)
    });

    videoEncoder.configure({
        codec: 'avc1.42001E',
        width: config.width || 360,
        height: config.height || 640,
        bitrate: 800_000,
        framerate: config.fps,
        hardwareAcceleration: 'prefer-hardware'
    });

    // 3. Inyección robusta de paquetes de audio serializados
    if (config.audioPackets && config.audioPackets.length > 0) {
        for (const item of config.audioPackets) {
            try {
                // Reconstruir el buffer y el paquete de forma segura tras el postMessage
                let rawData = item.packet.data;
                if (!(rawData instanceof Uint8Array)) {
                    rawData = new Uint8Array(rawData);
                }

                const packet = new EncodedPacket(
                    rawData,
                    item.packet.type || 'key',
                    item.packet.timestamp,
                    item.packet.duration
                );

                await audioSource.add(packet, item.meta);
            } catch (err) {
                console.warn("[Vloitz Worker] ⚠️ Error al reinyectar paquete de audio:", err);
            }
        }
    }

    // 4. Bucle Asíncrono con Control de Cola (Motor V8)
    const fps = config.fps;
    const totalFrames = config.durationSeconds * fps;
    const frameDurationMs = 1000 / fps;
    let frameIndex = 0;

    while (frameIndex <= totalFrames) {
        // 🚦 CORTAFUEGOS TÉRMICO: Si el chip está saturado, pausamos el bucle milisegundos
        if (videoEncoder.encodeQueueSize >= 30) {
            await new Promise(r => setTimeout(r, 10));
            continue;
        }

        const currentTimestamp = frameIndex * (1 / fps);
        const isKeyFrame = (frameIndex % (fps * 5) === 0);
        let elapsedMs = frameIndex * frameDurationMs;

        if (frameIndex % 10 === 0) {
            const elapsed = (performance.now() - startTime) / 1000;
            const currentSpeed = elapsed > 0 ? (frameIndex / elapsed).toFixed(0) : 0;
            const percent = Math.round((frameIndex / totalFrames) * 100);
            self.postMessage({
                type: 'EXPORT_PROGRESS',
                progress: percent,
                text: `⚡ Motor Asíncrono a ${currentSpeed} fps (${percent}%)`
            });
        }

        // 🚀 BITBLT OVERDRIVE: Caché O(1)
        const cachedIndex = frameIndex % workerState.cacheTotalFrames;
        ctx.drawImage(workerState.cachedFrames[cachedIndex], 0, 0);

        // ⏱️ CARGA DINÁMICA AISLADA
        renderDynamicOverlay(ctx, currentTimestamp, config);

        // 🚀 BYPASS DE READBACK SENIOR: Extraemos por transferencia directa sin clonar el contexto entero
        const vFrame = new VideoFrame(canvas, {
            timestamp: Math.round(elapsedMs * 1000),
            duration: Math.round(frameDurationMs * 1000)
        });

        videoEncoder.encode(vFrame, {
            keyFrame: isKeyFrame
        });
        vFrame.close();
        frameIndex++;

    }

    // 5. Flush y Finalización
    await videoEncoder.flush();
    videoEncoder.close();
    await output.finalize();
    const finalBuffer = output.target.buffer;

    // 6. Volcado atómico final al OPFS
    const opfsRoot = await navigator.storage.getDirectory();
    const fileHandle = await opfsRoot.getFileHandle('vloitz_export.mp4', {
        create: true
    });
    const writableStream = await fileHandle.createWritable();
    await writableStream.write(finalBuffer);
    await writableStream.close();

    const elapsedSecs = ((performance.now() - startTime) / 1000).toFixed(1);
    console.log(`[Vloitz Worker] ⚡ Renderizado completado en ${elapsedSecs}s`);

    // 📊 Enviar métrica de tiempo al hilo principal
    self.postMessage({
        type: 'EXPORT_METRICS',
        text: `⚡ ¡Render relámpago en ${elapsedSecs}s!`
    });
}

// ==========================================================================
// 🎨 MOTOR GRÁFICO OPTIMIZADO (CON PRE-CACHÉ)
// ==========================================================================
function roundRect(ctx, x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function drawFitText(ctx, text, x, y, maxWidth, initialSize) {
    let size = initialSize;
    let minSize = 14;
    ctx.font = "900 " + size + "px Inter, sans-serif";

    while (ctx.measureText(text).width > maxWidth && size > minSize) {
        size--;
        ctx.font = "900 " + size + "px Inter, sans-serif";
    }

    let finalText = text;
    if (ctx.measureText(finalText).width > maxWidth) {
        while (ctx.measureText(finalText + "...").width > maxWidth && finalText.length > 0) {
            finalText = finalText.slice(0, -1);
        }
        finalText = finalText.trim() + "...";
    }
    ctx.fillText(finalText, x, y);
}

function updateAudioSimulation(frame, fps) {
    const cacheFrames = workerState.cacheTotalFrames;
    // Theta garantiza un ciclo matemático cerrado de 0 a 2*PI (360 grados) ajustado al límite de la caché
    const theta = ((frame % cacheFrames) / cacheFrames) * Math.PI * 2;

    // K simula la velocidad original (~0.2 radianes por frame) pero de forma predecible
    const K = Math.max(1, Math.round(cacheFrames / 30));

    // Kicks matemáticamente sincronizados al bucle en lugar de usar un módulo fijo
    const kickPulse = Math.pow(Math.sin(theta * (K * 2)), 8);

    for (let i = 0; i < 20; i++) {
        // Reemplazamos Math.random() por un pseudo-random trigonométrico para garantizar el bucle perfecto sin saltos
        const pseudoRandom = Math.abs(Math.sin(theta * (K * 1.5) + (i * 2))) * 10;
        let targetHeight = 5 + Math.abs(Math.sin((theta * K) + i) * 15) + pseudoRandom;

        if (kickPulse > 0.8 && i > 13) targetHeight += 30 * kickPulse;
        if (i > 4 && i < 12) targetHeight += pseudoRandom * 1.5;

        if (targetHeight > workerState.audioData[i]) {
            workerState.audioData[i] = targetHeight;
        } else {
            workerState.audioData[i] *= 0.85;
        }
    }
}

function renderFrameOptimized(canvas, ctx, frameIndex, secondsElapsed, config, preRenderedBg, preRenderedVinyl, isWarmup = false) {
    const w = config.width;
    const h = config.height;
    const coverImg = workerState.coverBitmap;

    if (preRenderedBg) {
        ctx.drawImage(preRenderedBg, 0, 0, w, h);
    } else {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, w, h);
    }

    const cardW = w * 0.90;
    const cardH = h * 0.75;
    const cardX = (w - cardW) / 2;
    const cardY = (h - cardH) / 2;

    ctx.save();
    if (!config.auraEnabled) {
        ctx.shadowBlur = 0;
    } else {
        ctx.shadowColor = `rgba(${config.brandColorRgb || '29, 185, 84'}, 0.5)`;
        ctx.shadowBlur = 90;
    }
    ctx.fillStyle = '#121212';
    roundRect(ctx, cardX, cardY, cardW, cardH, 20);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();

    const imgSize = cardW * 0.85;
    const imgX = (w - imgSize) / 2;
    const imgY = cardY + 25;
    const centerX = imgX + imgSize / 2;
    const centerY = imgY + imgSize / 2;

    ctx.save();
    if (config.vinylMode > 0 && preRenderedVinyl) {
        ctx.drawImage(preRenderedVinyl, imgX, imgY);

        const labelRadius = imgSize * 0.32;
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, labelRadius, 0, Math.PI * 2);
        ctx.clip();

        ctx.fillStyle = '#000000';
        ctx.fillRect(imgX, imgY, imgSize, imgSize);

        if (config.vinylMode === 2) {
            const rotation = secondsElapsed * (0.08 * (config.vinylSpeed || 1.0)) * Math.PI * 2;
            ctx.translate(centerX, centerY);
            ctx.rotate(rotation);
            ctx.translate(-centerX, -centerY);
        }

        if (coverImg) {
            const labelSize = labelRadius * 2;
            const zoom = config.vinylZoom || 1.0;
            const drawW = labelSize * zoom;
            const drawH = labelSize * zoom;
            const drawX = centerX - (drawW / 2);
            const drawY = centerY - (drawH / 2);
            ctx.drawImage(coverImg, drawX, drawY, drawW, drawH);
        } else {
            ctx.fillStyle = '#333';
            ctx.fillRect(imgX, imgY, imgSize, imgSize);
        }
        ctx.restore();

        ctx.beginPath();
        ctx.arc(centerX, centerY, labelRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(centerX, centerY, imgSize * 0.035, 0, Math.PI * 2);
        ctx.fillStyle = '#000000';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();

    } else {
        ctx.beginPath();
        roundRect(ctx, imgX, imgY, imgSize, imgSize, 8);
        ctx.clip();

        if (coverImg) {
            ctx.drawImage(coverImg, imgX, imgY, imgSize, imgSize);
        } else {
            ctx.fillStyle = '#333';
            ctx.fillRect(imgX, imgY, imgSize, imgSize);
        }
        ctx.restore();
    }

    const textX = imgX;
    let cursorY = imgY + imgSize + 25;
    const neonColor = config.brandColorHex || '#1DB954';

    ctx.textAlign = "left";
    ctx.fillStyle = neonColor;
    ctx.font = "700 10px Inter, sans-serif";
    ctx.fillText("NOW PLAYING 🎵", textX, cursorY);

    cursorY += 20;
    ctx.fillStyle = "#FFFFFF";
    drawFitText(ctx, config.title || "Track Desconocido", textX, cursorY, imgSize, 20);

    cursorY += 18;
    ctx.fillStyle = "#B3B3B3";
    ctx.font = "500 12px Inter, sans-serif";
    ctx.fillText(config.artist || "Vloitz Set", textX, cursorY);

    const cardBottom = cardY + cardH;
    ctx.textAlign = "center";
    ctx.fillStyle = "#333";
    ctx.font = "400 9px Inter, sans-serif";
    ctx.fillText("Escúchalo en vloitz.github.io", w / 2, cardBottom - 15);

    const startBarX = (w - (w * 0.90 * 0.85)) / 2;
    const barsBaseY = cursorY + 40;
    const gap = 3;
    const barWidth = (imgSize - (19 * gap)) / 20;

    for (let i = 0; i < 20; i++) {
        let height = Math.max(4, workerState.audioData[i]);
        ctx.fillStyle = (i === 13) ? neonColor : "#3E3E3E";
        ctx.fillRect(startBarX + (i * (barWidth + gap)), barsBaseY - height, barWidth, height);
    }

    if (isWarmup) return; // 🧠 CORTAFUEGOS SENIOR: En fase de pre-caché, no dibujamos ni procesamos el progreso lineal ni el cronómetro variable.

    const progY = barsBaseY + 10;
    ctx.fillStyle = "#333";
    ctx.fillRect(startBarX, progY, imgSize, 3);
    const progress = Math.min(1, secondsElapsed / config.durationSeconds);

    if (neonColor !== 'transparent') {
        ctx.fillStyle = neonColor;
        ctx.fillRect(startBarX, progY, imgSize * progress, 3);
        ctx.beginPath();
        ctx.arc(startBarX + (imgSize * progress), progY + 1.5, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    const timeY = barsBaseY + 10 + 15;
    ctx.fillStyle = "#666";
    ctx.font = "400 9px Inter, sans-serif";
    ctx.textAlign = "left";

    const m = Math.floor(secondsElapsed / 60);
    const s = Math.floor(secondsElapsed % 60);
    ctx.fillText(`${m}:${s.toString().padStart(2, '0')}`, startBarX, timeY);

    ctx.textAlign = "right";
    ctx.fillText("HIFI", startBarX + imgSize, timeY);

    const badgeY = timeY + 5;
    ctx.textAlign = "center";
    ctx.strokeStyle = neonColor;
    ctx.lineWidth = 1;
    ctx.strokeRect((w - 60) / 2, badgeY, 60, 16);
    ctx.fillStyle = neonColor;
    ctx.font = "700 9px Inter, sans-serif";
    ctx.fillText("FLAC • HIFI", w / 2, badgeY + 11);
}

// ==========================================================================
// ⚡ MÓDULO DE CARGA DINÁMICA AISLADA (Tiempo Real Ultraligero)
// ==========================================================================
function renderDynamicOverlay(ctx, secondsElapsed, config) {
    const w = config.width;
    const h = config.height;
    const cardW = w * 0.90;
    const cardH = h * 0.75;
    const cardY = (h - cardH) / 2;
    const imgSize = cardW * 0.85;

    // Recalcular posiciones estáticas base
    const imgY = cardY + 25;
    let cursorY = imgY + imgSize + 25;
    cursorY += 20; // NOW PLAYING
    cursorY += 18; // TITLE

    const startBarX = (w - (w * 0.90 * 0.85)) / 2;
    const barsBaseY = cursorY + 40;
    const neonColor = config.brandColorHex || '#1DB954';

    // 1. Barra de progreso base
    const progY = barsBaseY + 10;
    ctx.fillStyle = "#333";
    ctx.fillRect(startBarX, progY, imgSize, 3);
    const progress = Math.min(1, secondsElapsed / config.durationSeconds);

    // 2. Progreso iluminado (Neón)
    if (neonColor !== 'transparent') {
        ctx.fillStyle = neonColor;
        ctx.fillRect(startBarX, progY, imgSize * progress, 3);
        ctx.beginPath();
        ctx.arc(startBarX + (imgSize * progress), progY + 1.5, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    // 3. Textos de Tiempo y Tags (Única capa de texto real-time)
    const timeY = barsBaseY + 10 + 15;
    ctx.fillStyle = "#666";
    ctx.font = "400 9px Inter, sans-serif";
    ctx.textAlign = "left";

    const m = Math.floor(secondsElapsed / 60);
    const s = Math.floor(secondsElapsed % 60);
    ctx.fillText(`${m}:${s.toString().padStart(2, '0')}`, startBarX, timeY);

    ctx.textAlign = "right";
    ctx.fillText("HIFI", startBarX + imgSize, timeY);

    const badgeY = timeY + 5;
    ctx.textAlign = "center";
    ctx.strokeStyle = neonColor;
    ctx.lineWidth = 1;
    ctx.strokeRect((w - 60) / 2, badgeY, 60, 16);
    ctx.fillStyle = neonColor;
    ctx.font = "700 9px Inter, sans-serif";
    ctx.fillText("FLAC • HIFI", w / 2, badgeY + 11);
}