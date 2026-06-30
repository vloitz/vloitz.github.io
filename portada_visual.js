/**
 * VLOITZ PORTADA VISUAL ENGINE
 * Módulo independiente para renderizado WebGL/Canvas en el header.
 * Diseñado para no asfixiar el hilo principal ni drenar batería.
 */

const PortadaVisualEngine = (() => {
    let canvas = null;
    let ctx = null;
    let animationId = null;
    let isRunning = false;
    let isVisible = false; // Controlado por el Observer de Scroll
    let width, height;

    let stars = [];
    let nebulas = [];
    let currentConfig = null;

    // Conexión futura para tu audio
    const AudioState = { bass: 0, overall: 0 };

    // Simulación temporal de audio (puedes borrar la llamada luego)
    function simulateAudio() {
        const time = Date.now() * 0.001;
        AudioState.bass = (Math.sin(time) + 1) / 2 * 0.15;
    }

    // --- CLASES DEL TEMA 'deep_tech' ---
    class Star {
        constructor() { this.reset(true); }
        reset(isInit = false) {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.z = Math.random() * 3 + 0.5;
            this.size = (Math.random() * 1.0 + 0.2);
            const isBlue = Math.random() > 0.8;
            this.color = isBlue ? 'rgba(180, 210, 255, ' : 'rgba(255, 255, 255, ';
            this.baseAlpha = Math.random() * 0.8 + 0.2;
            this.alpha = this.baseAlpha;
            this.twinkleSpeed = Math.random() * 0.005 + 0.001;
            this.speedX = -(0.05 / this.z); // Paneo lento
        }
        update() {
            this.x += this.speedX;
            this.alpha = this.baseAlpha + Math.sin(Date.now() * this.twinkleSpeed) * 0.2;
            if (this.x < -10) {
                this.x = width + 10;
                this.y = Math.random() * height;
            }
        }
        draw() {
            ctx.fillStyle = this.color + Math.max(0, Math.min(1, this.alpha)) + ')';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function createNebulaTexture(colorCenter, colorEdge, radius) {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = radius * 2;
        offCanvas.height = radius * 2;
        const offCtx = offCanvas.getContext('2d');
        const gradient = offCtx.createRadialGradient(radius, radius, 0, radius, radius, radius);
        gradient.addColorStop(0, colorCenter);
        gradient.addColorStop(0.4, colorEdge);
        gradient.addColorStop(1, 'transparent');
        offCtx.fillStyle = gradient;
        offCtx.fillRect(0, 0, radius * 2, radius * 2);
        return offCanvas;
    }

    class Nebula {
        constructor(x, y, radius, colorC, colorE) {
            this.x = x; this.y = y; this.baseRadius = radius;
            this.texture = createNebulaTexture(colorC, colorE, radius);
            this.angle = Math.random() * Math.PI * 2;
            this.rotSpeed = (Math.random() - 0.5) * 0.0005;
        }
        update() { this.angle += this.rotSpeed; }
        draw() {
            const currentRadius = this.baseRadius + (AudioState.bass * 50);
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.5 + (AudioState.bass * 0.2);
            ctx.scale(1, 0.7);
            ctx.drawImage(this.texture, -currentRadius, -currentRadius, currentRadius * 2, currentRadius * 2);
            ctx.restore();
        }
    }

    // --- CORE DEL MOTOR ---
    const buildThemeDeepTech = () => {
        stars = []; nebulas = [];
        for (let i = 0; i < 200; i++) stars.push(new Star());
        nebulas = [
            new Nebula(width * 0.3, height * 0.4, 250, 'rgba(180, 20, 100, 0.15)', 'rgba(80, 10, 120, 0.05)'),
            new Nebula(width * 0.7, height * 0.7, 300, 'rgba(90, 15, 200, 0.15)', 'rgba(20, 5, 50, 0.05)'),
            new Nebula(width * 0.8, height * 0.2, 200, 'rgba(200, 80, 20, 0.08)', 'rgba(50, 10, 20, 0.02)'),
            new Nebula(width * 0.1, height * 0.8, 350, 'rgba(30, 10, 80, 0.12)', 'rgba(5, 2, 20, 0.03)')
        ];
    };

    const loop = () => {
        if (!isRunning || !isVisible) return;

        simulateAudio(); // Simulación reactiva

        // Borrar frame anterior (Fondo ultra oscuro)
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#030105';
        ctx.fillRect(0, 0, width, height);

        nebulas.forEach(n => { n.update(); n.draw(); });
        ctx.globalCompositeOperation = 'screen';
        stars.forEach(s => { s.update(); s.draw(); });

        animationId = requestAnimationFrame(loop);
    };

    const handleResize = () => {
        if (!canvas) return;
        // Obtenemos las medidas del contenedor padre (.profile-banner)
        const rect = canvas.parentElement.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
        canvas.width = width;
        canvas.height = height;

        // Reconstruimos solo si cambiaron drásticamente las medidas
        if (isRunning) buildThemeDeepTech();
    };

    const start = () => {
        if (isRunning) return;
        const banner = document.querySelector('.profile-banner');
        if (!banner) return;

        // INYECCIÓN QUIRÚRGICA: z-index 0 para quedar DEBAJO del AtmosphereController
        canvas = document.createElement('canvas');
        canvas.id = 'v-cosmic-canvas';
        Object.assign(canvas.style, {
            position: 'absolute',
            top: 0, left: 0,
            width: '100%', height: '100%',
            pointerEvents: 'none',
            zIndex: 0,
            filter: 'contrast(1.2) brightness(0.9)'
        });

        // Lo insertamos como primer hijo del banner
        banner.insertBefore(canvas, banner.firstChild);
        ctx = canvas.getContext('2d');

        handleResize();
        window.addEventListener('resize', handleResize);

        isRunning = true;

        // Observer para pausar la animación cuando no se vea el banner (Batería 0%)
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                isVisible = entry.isIntersecting;
                if (isVisible && isRunning) {
                    console.log('%c[Visual Engine] Reanudando animación (Visible)', 'color:#00F3FF; font-size:10px;');
                    loop();
                } else {
                    console.log('%c[Visual Engine] Pausando animación (Oculto)', 'color:#FF5555; font-size:10px;');
                    cancelAnimationFrame(animationId);
                }
            });
        });
        observer.observe(banner);
    };

    const stopAndDestroy = () => {
        isRunning = false;
        isVisible = false;
        cancelAnimationFrame(animationId);
        window.removeEventListener('resize', handleResize);
        if (canvas && canvas.parentElement) {
            canvas.parentElement.removeChild(canvas);
        }
        canvas = null;
        console.log('%c[Visual Engine] Destruido/Apagado', 'color:#FF5555; font-weight:bold;');
    };

    // EL CEREBRO DEL "SWITCH" (Reacciona en vivo)
    const evaluateEnvironment = () => {
        if (!currentConfig || !currentConfig.master_switch) {
            stopAndDestroy();
            return;
        }

        const isMobile = window.matchMedia('(max-width: 768px)').matches;

        if (isMobile && currentConfig.enable_mobile) {
            console.log('%c[Visual Engine] Entorno Móvil detectado -> START', 'color:#1DB954; font-weight:bold;');
            start();
        } else if (!isMobile && currentConfig.enable_desktop) {
            console.log('%c[Visual Engine] Entorno PC detectado -> START', 'color:#1DB954; font-weight:bold;');
            start();
        } else {
            // Si el usuario rota la tablet y pasa a "PC", se destruye en vivo
            stopAndDestroy();
        }
    };

    return {
        init: (configObj) => {
            currentConfig = configObj;
            console.log('%c[Visual Engine] Inicializando Panel Maestro...', 'color:#1DB954;');

            // Evaluar al inicio
            evaluateEnvironment();

            // Escuchar cambios de resolución (Paso de Móvil a PC en vivo)
            window.matchMedia('(max-width: 768px)').addEventListener('change', evaluateEnvironment);
        }
    };
})();