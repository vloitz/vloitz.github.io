import {
    Output,
    Mp4OutputFormat,
    StreamTarget,
    CanvasSource,
    EncodedAudioPacketSource,
    EncodedPacket,
    Quality
} from 'https://esm.sh/mediabunny';

let workerState = {
    coverBitmap: null,
    audioData: new Array(20).fill(5)
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
// 🌡️ FASE 4: PATRULLAJE TÉRMICO Y DEGRADACIÓN GRÁCIL (EMA con Warmup)
// ==========================================================================
class ThermalThrottlingPatrol {
    constructor() {
        this.currentTargetFps = 60;
        this.criticalFrameTimeMs = 28.0;
        this.emaRenderTimeMs = 16.6;
        this.alpha = 0.15;
        this.frameCount = 0;
    }

    observeFrameProcessingTime(durationMs) {
        this.frameCount++;
        if (this.frameCount < 10) return; // Warmup inicial

        this.emaRenderTimeMs = (this.alpha * durationMs) + ((1 - this.alpha) * this.emaRenderTimeMs);
        if (this.currentTargetFps === 60 && this.emaRenderTimeMs > this.criticalFrameTimeMs) {
            console.warn("[Vloitz Thermal] ⚠️ Throttling real detectado. Degradando a 30 FPS en caliente.");
            this.currentTargetFps = 30;
            self.postMessage({
                type: 'PERFORMANCE_DEGRADED_WARNING'
            });
        }
    }

    getCurrentTargetFps() {
        return this.currentTargetFps;
    }
}

// ==========================================================================
// ⚙️ PIPELINE DE EXPORTACIÓN (OPFS + PRE-CACHÉ GRÁFICA + MEDIABUNNY)
// ==========================================================================
async function executeExportPipeline(config) {
    const canvas = new OffscreenCanvas(config.width || 360, config.height || 640);
    const ctx = canvas.getContext('2d', {
        alpha: false,
        desynchronized: true
    });

    // ⚡ PRE-CACHÉ 1: Renderizar el fondo inmersivo con blur UNA SOLA VEZ al inicio
    let preRenderedBgBitmap = null;
    if (config.immersiveBg && workerState.coverBitmap) {
        const bgCanvas = new OffscreenCanvas(config.width, config.height);
        const bgCtx = bgCanvas.getContext('2d');
        bgCtx.filter = `blur(${config.blurValue || 40}px) brightness(0.3)`;
        bgCtx.drawImage(workerState.coverBitmap, -50, -50, config.width + 100, config.height + 100);
        preRenderedBgBitmap = bgCanvas.transferToImageBitmap();
    }

    // ⚡ PRE-CACHÉ 2: Renderizar la base estática del vinilo y sus surcos UNA SOLA VEZ al inicio
    let preRenderedVinylBitmap = null;
    if (config.vinylMode > 0) {
        const cardW = config.width * 0.90;
        const imgSize = cardW * 0.85;
        const vCanvas = new OffscreenCanvas(imgSize, imgSize);
        const vCtx = vCanvas.getContext('2d');
        const centerX = imgSize / 2;
        const centerY = imgSize / 2;

        // Cuerpo exterior negro del vinilo
        vCtx.beginPath();
        vCtx.arc(centerX, centerY, imgSize / 2, 0, Math.PI * 2);
        vCtx.fillStyle = '#000000';
        vCtx.fill();

        // Surcos concéntricos estáticos
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

    // 1. Inicialización de OPFS
    const opfsRoot = await navigator.storage.getDirectory();
    const fileHandle = await opfsRoot.getFileHandle('vloitz_export.mp4', {
        create: true
    });
    const writableStream = await fileHandle.createWritable();

    // 2. Configuración de Mediabunny con StreamTarget
    const output = new Output({
        format: new Mp4OutputFormat(),
        target: new StreamTarget(writableStream, {
            chunked: true,
            chunkSize: 1024 * 1024
        })
    });

    // 3. Configuración de Pistas (Audio y Video)
    const audioSource = new EncodedAudioPacketSource('aac');
    output.addAudioTrack(audioSource);

    const videoSource = new CanvasSource(canvas, {
        codec: 'avc',
        latencyMode: 'realtime',
        hardwareAcceleration: 'prefer-hardware',
        quality: new Quality({
            bitrate: 10_000_000
        })
    });
    output.addVideoTrack(videoSource, {
        frameRate: config.fps
    });

    // 🚀 Arrancar el Output de Mediabunny
    await output.start();

    // 4. Inyección de paquetes de audio AAC procesados en RAM
    if (config.audioPackets && config.audioPackets.length > 0) {
        for (const item of config.audioPackets) {
            const packet = item.packet instanceof EncodedPacket ? item.packet : new EncodedPacket(item.packet.data, item.packet.type, item.packet.timestamp, item.packet.duration);
            await audioSource.add(packet, item.meta);
        }
    }

    // 5. Bucle de renderizado ultrarrápido con assets pre-cacheados
    const thermalPatrol = new ThermalThrottlingPatrol();
    let currentFps = config.fps;
    let currentTimestamp = 0;
    let frameIndex = 0;
    const targetDuration = config.durationSeconds;

    while (currentTimestamp < targetDuration) {
        while (workerState.isContextLost) {
            await new Promise(r => setTimeout(r, 100));
        }

        const frameStartTime = performance.now();

        const targetFpsNow = thermalPatrol.getCurrentTargetFps();
        if (currentFps === 60 && targetFpsNow === 30) {
            currentFps = 30;
        }

        const frameDuration = 1 / currentFps;
        const isKeyFrame = (Math.round(currentTimestamp * currentFps) % currentFps === 0);

        const progress = (currentTimestamp / targetDuration) * 100;
        self.postMessage({
            type: 'EXPORT_PROGRESS',
            progress: Math.min(100, progress)
        });

        updateAudioSimulation(frameIndex, currentFps);

        // Renderizado ultra optimizado consumiendo la pre-caché
        renderFrameOptimized(canvas, ctx, frameIndex, currentTimestamp, config, preRenderedBgBitmap, preRenderedVinylBitmap);

        await videoSource.add(currentTimestamp, frameDuration, {
            keyFrame: isKeyFrame
        });

        const frameEndTime = performance.now();
        const frameElapsedMs = frameEndTime - frameStartTime;
        thermalPatrol.observeFrameProcessingTime(frameElapsedMs);

        // 📊 HUD En Vivo: Enviar métricas al hilo principal cada 5 frames para verlas en el celular
        if (frameIndex % 5 === 0) {
            self.postMessage({
                type: 'EXPORT_METRICS',
                text: `⏱️ ${currentTimestamp.toFixed(1)}s / ${targetDuration}s | ⚡ ${frameElapsedMs.toFixed(0)}ms/frame | 🎬 ${currentFps}FPS`
            });
        }

        currentTimestamp += frameDuration;
        frameIndex++;
    }

    await output.finalize();
    console.log("[Vloitz Worker] 🎉 Pipeline ultrarrápido finalizado y empaquetado en OPFS.");
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
    const isKick = frame % (fps === 15 ? 12 : 24) === 0;
    for (let i = 0; i < 20; i++) {
        let targetHeight = 5 + Math.abs(Math.sin(frame * 0.2 + i) * 15) + Math.random() * 10;
        if (isKick && i > 13) targetHeight += 30;
        if (i > 4 && i < 12) targetHeight += Math.random() * 15;

        if (targetHeight > workerState.audioData[i]) {
            workerState.audioData[i] = targetHeight;
        } else {
            workerState.audioData[i] *= 0.85;
        }
    }
}

function renderFrameOptimized(canvas, ctx, frameIndex, secondsElapsed, config, preRenderedBg, preRenderedVinyl) {
    const w = config.width;
    const h = config.height;
    const coverImg = workerState.coverBitmap;

    // 1. Fondo (Usa el Bitmap pre-renderizado al instante, cero filtros en bucle)
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

    // 2. Tarjeta / Chasis con Aura Neón Opcional
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

    // 3. Renderizado de Portada o Vinilo (Usa la pre-caché gráfica)
    ctx.save();
    if (config.vinylMode > 0 && preRenderedVinyl) {
        // Estampamos la textura del vinilo pre-renderizada en milisegundos
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

        // Anillo divisor y agujero central
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
        // Modo Cuadrado Clásico
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

    // 4. Textos (Título y Artista)
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

    // 5. Barras del Visualizador de Audio
    const startBarX = (w - (w * 0.90 * 0.85)) / 2;
    const barsBaseY = cursorY + 40;
    const gap = 3;
    const barWidth = (imgSize - (19 * gap)) / 20;

    for (let i = 0; i < 20; i++) {
        let height = Math.max(4, workerState.audioData[i]);
        ctx.fillStyle = (i === 13) ? neonColor : "#3E3E3E";
        ctx.fillRect(startBarX + (i * (barWidth + gap)), barsBaseY - height, barWidth, height);
    }

    // 6. Barra de Progreso y Tiempos
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