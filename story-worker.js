import {
    Output,
    Mp4OutputFormat,
    BufferTarget,
    EncodedVideoPacketSource,
    EncodedAudioPacketSource,
    EncodedPacket
} from 'https://esm.sh/mediabunny';

// ==========================================================================
// 📥 ESCUCHA DE MENSAJES DESDE EL HILO PRINCIPAL
// ==========================================================================
let config = null;
let output = null;
let videoSource = null;
let audioSource = null;
let videoEncoder = null;
let totalFrames = 0;
let frameIndex = 0;
let startTime = 0;

self.onmessage = async (e) => {
    const {
        type,
        payload
    } = e.data;

    if (type === 'START_EXPORT') {
        try {
            config = payload;
            await initPipeline(config);
            self.postMessage({
                type: 'ENCODER_READY'
            });
        } catch (err) {
            console.error("[Vloitz Worker] ❌ Error en init:", err);
            self.postMessage({
                type: 'EXPORT_ERROR',
                error: err.message
            });
        }
    } else if (type === 'FRAME') {
        await encodeFrame(e.data);
    } else if (type === 'FLUSH') {
        await finishEncoding();
    } else if (type === 'ABORT') {
        cleanup();
    }
};

// ==========================================================================
// ⚙️ INICIALIZACIÓN DEL PIPELINE
// ==========================================================================
async function initPipeline(cfg) {
    // 1. Mediabunny
    output = new Output({
        format: new Mp4OutputFormat({
            fastStart: 'in-memory'
        }),
        target: new BufferTarget()
    });

    audioSource = new EncodedAudioPacketSource('aac');
    output.addAudioTrack(audioSource);

    videoSource = new EncodedVideoPacketSource('avc');
    output.addVideoTrack(videoSource);

    await output.start();

    // 2. Inyectar audio (si viene en el config)
    if (cfg.audioPackets && cfg.audioPackets.length > 0) {
        for (const item of cfg.audioPackets) {
            try {
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
                console.warn("[Vloitz Worker] ⚠️ Error al reinyectar audio:", err);
            }
        }
    }

    // 3. VideoEncoder
    videoEncoder = new VideoEncoder({
        output: (chunk, meta) => {
            const packet = EncodedPacket.fromEncodedChunk(chunk);
            videoSource.add(packet, meta);
        },
        error: e => console.error("[Vloitz Worker] ❌ Video Error:", e)
    });

    videoEncoder.configure({
        codec: 'avc1.4D401E', // Main Profile (soporte CABAC, mejor calidad a bajo bitrate)
        width: cfg.width || 360,
        height: cfg.height || 640,
        bitrate: 3_000_000, // 3 mbps para máxima calidad en líneas finas
        framerate: cfg.fps,
        hardwareAcceleration: 'prefer-software'
    });

    totalFrames = cfg.durationSeconds * cfg.fps;
    frameIndex = 0;
    startTime = performance.now();
}

// ==========================================================================
// 🎬 CODIFICAR UN FRAME (recibido como ImageBitmap)
// ==========================================================================
async function encodeFrame(data) {
    const {
        frame,
        keyFrame
    } = data;

    // Backpressure inteligente
    while (videoEncoder.encodeQueueSize >= 25) {
        await new Promise(r => setTimeout(r, 5));
    }

    videoEncoder.encode(frame, {
        keyFrame
    });
    frame.close(); // solo cerramos el frame recibido

    frameIndex++;

    // Reporte de progreso cada 10 frames
    if (frameIndex % 10 === 0) {
        const elapsed = (performance.now() - startTime) / 1000;
        const currentSpeed = elapsed > 0 ? (frameIndex / elapsed).toFixed(0) : 0;
        const percent = Math.round((frameIndex / totalFrames) * 100);
        self.postMessage({
            type: 'EXPORT_PROGRESS',
            progress: percent,
            text: `⚡ Codificando a ${currentSpeed} fps (${percent}%)`
        });
    }

    if (frameIndex >= totalFrames) {
        self.postMessage({
            type: 'ALL_FRAMES_SENT'
        });
    } else {
        self.postMessage({
            type: 'NEXT_FRAME'
        });
    }
}

// ==========================================================================
// 🏁 FINALIZAR Y OBTENER EL BUFFER
// ==========================================================================
async function finishEncoding() {
    await videoEncoder.flush();
    videoEncoder.close();
    await output.finalize();
    const finalBuffer = output.target.buffer;

    // Guardar en OPFS (opcional, pero útil)
    try {
        const opfsRoot = await navigator.storage.getDirectory();
        const fileHandle = await opfsRoot.getFileHandle('vloitz_export.mp4', {
            create: true
        });
        const writableStream = await fileHandle.createWritable();
        await writableStream.write(finalBuffer);
        await writableStream.close();
        console.log("[Vloitz Worker] 📁 Archivo guardado en OPFS");
    } catch (e) {
        console.warn("[Vloitz Worker] No se pudo guardar en OPFS:", e);
    }

    // Enviar buffer al hilo principal
    self.postMessage({
        type: 'EXPORT_COMPLETE',
        buffer: finalBuffer
    });

    cleanup();
}

function cleanup() {
    if (videoEncoder) {
        try {
            videoEncoder.close();
        } catch (e) {}
        videoEncoder = null;
    }
    if (output) {
        try {
            output.finalize();
        } catch (e) {}
        output = null;
    }
}