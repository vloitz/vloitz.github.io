/**
 * VLOITZ PORTADA VISUAL ENGINE (V3.1 - Pure Deep Tech Edition - PATCHED)
 * Arquitectura modular agnóstica basada en presets.
 * FIX: Ciclo de vida de inicialización corregido y Observer blindado.
 */

const PortadaVisualEngine = (() => {
    let canvas = null;
    let ctx = null;
    let animationId = null;
    let isRunning = false;
    let isVisible = false;
    let width = 0, height = 0;

    let stars = [];
    let nebulas = [];
    let currentConfig = null;

   // 🔗 CABLES LISTOS PARA TU AUDIO EN EL FUTURO (0.0 a 1.0)
    const AudioState = { bass: 0, overall: 0 };
    let isMusicPlaying = false; // <-- El interruptor real del reproductor

    function simulateAudio() {
        const time = Date.now() * 0.001;
        AudioState.bass = (Math.sin(time) + 1) / 2 * 0.08;
    }

    // ========================================================================
    // 🎛️ PRESET MATEMÁTICO ÚNICO
    // ========================================================================
   const VISUAL_PRESETS = {
        'deep_tech_minimal': {
            bg_color: '#06050a',             // Abismo muy sutil, no negro puro
            gas_enabled: true,
            gas_colors: [
                ['rgba(70, 40, 120, 0.35)', 'rgba(15, 5, 25, 0.05)'], // Púrpura oscuro, pero VISIBLE
                ['rgba(30, 60, 100, 0.25)', 'rgba(5, 10, 20, 0.05)']  // Azul acero profundo
            ],
            particles_count: 150,            // Densidad elegante
            particles_base_size: 2.5,        // FIX CRÍTICO: 2.5px permite que el canvas las dibuje nítidas
            particles_colors: ['rgba(255,255,255,', 'rgba(170,200,255,'],
            speed_multiplier: 0.05,          // Movimiento cinemático pero perceptible a la vista
            reactivity: {
                bass_gas_opacity: 0.4,       // Latido más notable
                bass_particle_glow: 0.6      // Destello más notable
            },
            physics: {
                gravity_center: { x: 0.5, y: 0.45 }, // Un poco más arriba, justo donde está tu cara
                gravity_pull: 2.5,                   // FUERZA MULTIPLICADA X30 (Succión real)
                smoke_friction: 0.88,                // Fricción ajustada para que aceleren rápido y se frenen de golpe
                gas_breathing_speed: 0.0005
            }
        }
    };

    let activePreset = VISUAL_PRESETS['deep_tech_minimal'];

    // --- CACHÉ DE TEXTURAS ---
    function createNebulaTexture(colorCenter, colorEdge, radius) {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = radius * 2; offCanvas.height = radius * 2;
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
        constructor() { this.reset(true); }
        reset(isInit = false) {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.z = Math.random() * 4 + 1;

            this.size = (Math.random() * activePreset.particles_base_size + 0.1) / this.z;
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

                // ¡TU PROPUESTA!: Si la partícula llega a la foto (Agujero negro), desaparece y nace de la nada
                if (dist < 40) {
                    this.reset(true); // Renace aleatoriamente en el espacio
                    return;
                }

                // Atracción innegable
                const pull = (activePreset.physics.gravity_pull) / this.z;
                this.vx += (dx / dist) * pull;
                this.vy += (dy / dist) * pull;

                // Fricción de humo denso
                this.vx *= activePreset.physics.smoke_friction;
                this.vy *= activePreset.physics.smoke_friction;

                this.x += this.vx;
                this.y += this.vy;
            } else {
                // Modo reposo: Movimiento cinemático normal estático
                this.vx = this.speedX;
                this.vy = 0;
                this.x += this.speedX;
            }

            this.alpha = this.baseAlpha + Math.sin(Date.now() * this.twinkleSpeed) * 0.15;

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
            this.x = x; this.y = y; this.baseRadius = radius;
            this.texture = createNebulaTexture(colorC, colorE, radius);
            this.angle = Math.random() * Math.PI * 2;
            this.rotSpeed = (Math.random() - 0.5) * 0.0002;
        }
        update() { this.angle += this.rotSpeed; }
        draw() {
            // Respiración orgánica temporal (Pulso de nebulosa)
            const breathing = activePreset.physics ? Math.sin(Date.now() * activePreset.physics.gas_breathing_speed) : 0;
            const organicAlpha = 0.5 + (breathing * 0.15); // Cambio sutil de opacidad

            const reactiveAlpha = Math.max(0, Math.min(1, organicAlpha + (AudioState.bass * activePreset.reactivity.bass_gas_opacity)));
            const scalePulse = activePreset.physics ? 1 + (breathing * 0.05) : 1; // Expansión física lenta del humo

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
        stars = []; nebulas = [];

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

        nebulas.forEach(n => { n.update(); n.draw(); });
        ctx.globalCompositeOperation = 'screen';
        stars.forEach(s => { s.update(); s.draw(); });

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
            top: 0, left: 0,
            width: '100%', height: '100%',
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