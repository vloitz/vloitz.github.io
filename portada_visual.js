/**
 * VLOITZ PORTADA VISUAL ENGINE (V4.1 - Pure Deep Tech Minimal)
 * Arquitectura modular agnóstica basada en presets.
 * Estética: Polvo estelar nítido, atmósfera densa y succión fluida (Humo pesado).
 */

const PortadaVisualEngine = (() => {
    let canvas = null;
    let ctx = null;
    let animationId = null;
    let isRunning = false;
    let isVisible = false;
    let width = 0,
        height = 0;

    let stars = [];
    let nebulas = [];
    let currentConfig = null;

    // 🔗 CABLES LISTOS PARA TU AUDIO EN EL FUTURO (0.0 a 1.0)
    const AudioState = {
        bass: 0,
        overall: 0
    };
    let isMusicPlaying = false; // <-- El interruptor real del reproductor

    function simulateAudio() {
        if (!isMusicPlaying) {
            AudioState.bass *= 0.95; // Caída hiper-suave y cinemática en reposo
            return;
        }
        // Simulador de Sub-Bajo: Oscilación densa, viscosa y pesada (Sin picos estroboscópicos)
        const time = Date.now() * 0.0015;
        // Doble onda desfasada para un groove orgánico, simulando un bajo envolvente
        const groove = (Math.sin(time) + Math.sin(time * 0.8)) / 2;
        AudioState.bass = (groove + 1) / 2 * 0.35;
    }

    // ========================================================================
    // 🎛️ PRESET MATEMÁTICO ÚNICO
    // ========================================================================
    const VISUAL_PRESETS = {
        'deep_tech_minimal': {
            bg_color: '#040308', // Abismo aún más oscuro y sobrio
            gas_enabled: true,
            gas_colors: [
                ['rgba(45, 25, 80, 0.20)', 'rgba(10, 5, 20, 0.02)'], // Violeta oscuro y profundo
                ['rgba(15, 30, 60, 0.15)', 'rgba(5, 10, 15, 0.02)'] // Celeste frío muy atenuado
            ],
            particles_count: 220, // Densidad alta de polvo estelar
            particles_base_size: 1.8, // Calibrado exacto: Nítido pero visible en pantallas móviles
            particles_colors: ['rgba(255,255,255,', 'rgba(180,210,255,', 'rgba(140,100,220,'], // Celestes fríos, violetas oscuros
            speed_multiplier: 0.015, // Movimiento casi estático, flotación pura
            reactivity: {
                bass_gas_opacity: 0.15, // Latido atmosférico sutil
                bass_particle_glow: 0.2 // Destello finísimo
            },
            physics: {
                gravity_center: {
                    x: 0.5,
                    y: 0.45
                }, // Centro de gravedad (tu foto)
                gravity_pull: 0.5, // Atracción suave y elegante
                smoke_friction: 0.965, // Fricción ALTA: fluido espeso y denso
                gas_breathing_speed: 0.00015 // Respiración orgánica lentísima
            }
        }
    };

    let activePreset = VISUAL_PRESETS['deep_tech_minimal'];

    // --- CACHÉ DE TEXTURAS ---
    function createNebulaTexture(colorCenter, colorEdge, radius) {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = radius * 2;
        offCanvas.height = radius * 2;
        const offCtx = offCanvas.getContext('2d');
        const gradient = offCtx.createRadialGradient(radius, radius, 0, radius, radius, radius);
        gradient.addColorStop(0, colorCenter);
        gradient.addColorStop(0.5, colorEdge);
        gradient.addColorStop(1, 'transparent');
        offCtx.fillStyle = gradient;
        offCtx.fillRect(0, 0, radius * 2, radius * 2);
        return offCanvas;
    }

    // --- ENTIDADES CÓSMICAS ---
    class Particle {
        constructor() {
            this.reset(true);
        }
        reset(isInit = false) {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.z = Math.random() * 4 + 1;

            // Capa Fondo: Polvo estelar nítido y fino
            this.size = (Math.random() * activePreset.particles_base_size + 0.5) / this.z;

            this.color = activePreset.particles_colors[Math.floor(Math.random() * activePreset.particles_colors.length)];

            this.baseAlpha = Math.random() * 0.4 + 0.1;
            this.alpha = this.baseAlpha;
            this.twinkleSpeed = Math.random() * 0.003 + 0.001;
            this.speedX = -(activePreset.speed_multiplier / this.z);

            // Vectores 2D inyectados para el modo gravedad/humo
            this.vx = this.speedX;
            this.vy = 0;
        }
        update() {
            // Si el REPRODUCTOR está en PLAY, activamos el Agujero Negro
            if (isMusicPlaying && activePreset.physics) {
                const targetX = width * activePreset.physics.gravity_center.x;
                const targetY = height * activePreset.physics.gravity_center.y;

                const dx = targetX - this.x;
                const dy = targetY - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Horizonte de Sucesos: Desvanecimiento orgánico al acercarse al centro (Adiós "popeo" arcade)
                let eventHorizonAlpha = 1;
                if (dist < 150) {
                    eventHorizonAlpha = Math.max(0, dist - 40) / 110;
                }

                // Si la partícula llega a la foto (Agujero negro), desaparece y nace de la nada
                if (dist < 40) {
                    this.reset(true); // Renace silenciosamente en el espacio exterior
                    return;
                }

                // Atracción reactiva y viscosa vinculada al Sub-Bass
                const reactivePull = activePreset.physics.gravity_pull * (0.4 + (AudioState.bass * 0.6));
                const pull = reactivePull / this.z;

                this.vx += (dx / dist) * pull;
                this.vy += (dy / dist) * pull;

                // Fricción de humo denso (suaviza la velocidad fuertemente)
                this.vx *= activePreset.physics.smoke_friction;
                this.vy *= activePreset.physics.smoke_friction;

                this.x += this.vx;
                this.y += this.vy;

                // Aplicamos el desvanecimiento del Horizonte de Sucesos al cálculo final
                this.alpha = (this.baseAlpha + Math.sin(Date.now() * this.twinkleSpeed) * 0.15) * eventHorizonAlpha;

            } else {
                // Modo reposo: Movimiento cinemático normal estático
                this.vx = this.speedX;
                this.vy = 0;
                this.x += this.speedX;
                this.alpha = this.baseAlpha + Math.sin(Date.now() * this.twinkleSpeed) * 0.15;
            }

            // Reaparición si sale de la pantalla (modo normal)
            if (this.x < -10) {
                this.x = width + 10;
                this.y = Math.random() * height;
            }
        }
        draw() {
            const reactiveAlpha = Math.max(0, Math.min(1, this.alpha + (AudioState.bass * activePreset.reactivity.bass_particle_glow)));
            ctx.globalAlpha = reactiveAlpha;
            ctx.fillStyle = this.color + reactiveAlpha + ')';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    class GasCloud {
        constructor(x, y, radius, colorC, colorE) {
            this.x = x;
            this.y = y;
            this.baseRadius = radius;
            this.texture = createNebulaTexture(colorC, colorE, radius);
            this.angle = Math.random() * Math.PI * 2;
            this.rotSpeed = (Math.random() - 0.5) * 0.0002;
        }
        update() {
            this.angle += this.rotSpeed;
        }
        draw() {
            // Respiración orgánica temporal (Pulso de nebulosa)
            const breathing = activePreset.physics ? Math.sin(Date.now() * activePreset.physics.gas_breathing_speed) : 0;
            const organicAlpha = 0.35 + (breathing * 0.1); // Opacidad reducida para no robar protagonismo a la foto

            // Destello controlado y elegante vinculado al Sub-Bass
            const reactiveAlpha = Math.max(0, Math.min(1, organicAlpha + (AudioState.bass * activePreset.reactivity.bass_gas_opacity)));

            // Impacto físico: El humo se expande muy suavemente con el Sub-Bass
            const scalePulse = activePreset.physics ? 1 + (breathing * 0.03) + (AudioState.bass * 0.03) : 1;

            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = reactiveAlpha;
            ctx.scale(scalePulse, 0.55 * scalePulse);
            ctx.drawImage(this.texture, -this.baseRadius, -this.baseRadius, this.baseRadius * 2, this.baseRadius * 2);
            ctx.restore();
        }
    }

    // --- CONSTRUCTOR DE ESCENAS ---
    const buildScene = () => {
        stars = [];
        nebulas = [];

        const themeName = (currentConfig && currentConfig.mobile_theme) ? currentConfig.mobile_theme : 'deep_tech_minimal';
        activePreset = VISUAL_PRESETS[themeName] || VISUAL_PRESETS['deep_tech_minimal'];

        for (let i = 0; i < activePreset.particles_count; i++) stars.push(new Particle());

        if (activePreset.gas_enabled) {
            const gC = activePreset.gas_colors;
            nebulas = [
                new GasCloud(width * 0.25, height * 0.35, 280, gC[0][0], gC[0][1]),
                new GasCloud(width * 0.75, height * 0.65, 380, gC[1][0], gC[1][1]),
                new GasCloud(width * 0.50, height * 0.50, 320, gC[0][0], gC[0][1])
            ];
        }
    };

    // --- BUCLE DE RENDERIZADO PRINCIPAL ---
    const loop = () => {
        if (!isRunning || !isVisible) {
            animationId = null; // Blindaje anti-fugas de memoria
            return;
        }

        simulateAudio();

        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.fillStyle = activePreset.bg_color;
        ctx.fillRect(0, 0, width, height);

        nebulas.forEach(n => {
            n.update();
            n.draw();
        });
        ctx.globalCompositeOperation = 'screen';
        stars.forEach(s => {
            s.update();
            s.draw();
        });

        const grad = ctx.createLinearGradient(0, height - 95, 0, height);
        grad.addColorStop(0, 'rgba(18, 18, 18, 0)');
        grad.addColorStop(1, '#121212');
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.fillStyle = grad;
        ctx.fillRect(0, height - 95, width, 97);

        animationId = requestAnimationFrame(loop);
    };

    const handleResize = () => {
        if (!canvas) return;
        const rect = canvas.parentElement.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
        canvas.width = width;
        canvas.height = height;
        if (isRunning) buildScene();
    };

    const start = () => {
        if (isRunning) return;
        const banner = document.querySelector('.profile-banner');
        if (!banner) return;

        // 1. ACTIVAR FLAG PRIMERO (El fix crucial)
        isRunning = true;

        banner.dataset.originalBg = banner.style.backgroundImage;
        banner.style.backgroundImage = 'none';

        canvas = document.createElement('canvas');
        canvas.id = 'v-cosmic-canvas';
        Object.assign(canvas.style, {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 0,
            backgroundColor: activePreset.bg_color,
            filter: 'contrast(1.1) brightness(0.95)'
        });

        banner.insertBefore(canvas, banner.firstChild);
        ctx = canvas.getContext('2d');

        // 2. AHORA SÍ CONSTRUIMOS (width y height se llenarán y buildScene se ejecutará)
        handleResize();
        window.addEventListener('resize', handleResize);

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                isVisible = entry.isIntersecting;
                if (isVisible && isRunning) {
                    if (!animationId) loop(); // Solo inicia si no hay otro loop corriendo
                } else {
                    if (animationId) {
                        cancelAnimationFrame(animationId);
                        animationId = null;
                    }
                }
            });
        });
        observer.observe(banner);
    };

    const stopAndDestroy = () => {
        isRunning = false;
        isVisible = false;
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        window.removeEventListener('resize', handleResize);

        const banner = document.querySelector('.profile-banner');
        if (canvas && canvas.parentElement) {
            canvas.parentElement.removeChild(canvas);
        }
        canvas = null;

        if (banner && banner.dataset.originalBg) {
            banner.style.backgroundImage = banner.dataset.originalBg;
        }
    };

    const evaluateEnvironment = () => {
        if (!currentConfig || !currentConfig.master_switch) {
            stopAndDestroy();
            return;
        }
        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        if (isMobile && currentConfig.enable_mobile) start();
        else if (!isMobile && currentConfig.enable_desktop) start();
        else stopAndDestroy();
    };

    return {
        init: (configObj) => {
            currentConfig = configObj;
            evaluateEnvironment();
            window.matchMedia('(max-width: 768px)').addEventListener('change', evaluateEnvironment);
        },
        // EL ENCHUFE PARA TU app.js
        setPlayState: (isPlaying) => {
            isMusicPlaying = isPlaying;
        }
    };
})();