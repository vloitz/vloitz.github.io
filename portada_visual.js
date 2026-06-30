/**
 * VLOITZ PORTADA VISUAL ENGINE (V3 - Pure Deep Tech Edition)
 * Arquitectura modular agnóstica basada en presets matemáticos estricto-minimalistas.
 * Diseñado para no asfixiar el hilo principal, con hooks preparados para audio-reactividad.
 */

const PortadaVisualEngine = (() => {
    let canvas = null;
    let ctx = null;
    let animationId = null;
    let isRunning = false;
    let isVisible = false; // Control de ciclo de vida mediante IntersectionObserver
    let width, height;

    let stars = [];
    let nebulas = [];
    let currentConfig = null;

    // 🔗 CABLES LISTOS PARA TU AUDIO EN EL FUTURO (0.0 a 1.0)
    const AudioState = { bass: 0, overall: 0 };

    function simulateAudio() {
        const time = Date.now() * 0.001;
        // Pulso matemático ultra sutil de fondo (solo activo en testing interno)
        AudioState.bass = (Math.sin(time) + 1) / 2 * 0.08;
    }

    // ========================================================================
    // 🎛️ PRESET MATEMÁTICO ÚNICO (Modifica solo aquí en el futuro)
    // ========================================================================
    const VISUAL_PRESETS = {
        'deep_tech_minimal': {
            bg_color: '#030206',             // Vacío abisal de fondo
            gas_enabled: true,
            gas_colors: [
                ['rgba(12, 8, 20, 0.22)', 'rgba(3, 1, 6, 0.05)'], // Niebla violeta ultra-profunda y sobria
                ['rgba(8, 14, 25, 0.15)', 'rgba(2, 4, 8, 0.02)']   // Matiz azul frío casi imperceptible
            ],
            particles_count: 140,            // Densidad baja y fina (Elegancia minimalista)
            particles_base_size: 0.6,        // Tamaño milimétrico (Cero burbujas, solo polvo nítido)
            particles_colors: ['rgba(255,255,255,', 'rgba(195,215,245,'], // Blanco puro y celeste frío lavado
            speed_multiplier: 0.015,         // Paneo cinematográfico hiper-lento
            reactivity: {
                bass_gas_opacity: 0.12,      // Expansión sutil de gas con el bajo
                bass_particle_glow: 0.35     // Destello fino de estrellas con el bajo
            }
        }
    };

    let activePreset = VISUAL_PRESETS['deep_tech_minimal'];

    // --- CACHÉ DE TEXTURAS (Pre-rendering en memoria para 0% lag) ---
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

    // --- ENTIDADES CÓSMICAS (Controladas matemáticamente por el preset) ---
    class Particle {
        constructor() { this.reset(true); }
        reset(isInit = false) {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.z = Math.random() * 4 + 1; // Factor de profundidad real

            // Puntos finos y calculados
            this.size = (Math.random() * activePreset.particles_base_size + 0.1) / this.z;
            this.color = activePreset.particles_colors[Math.floor(Math.random() * activePreset.particles_colors.length)];

            this.baseAlpha = Math.random() * 0.4 + 0.1;
            this.alpha = this.baseAlpha;
            this.twinkleSpeed = Math.random() * 0.003 + 0.001;
            this.speedX = -(activePreset.speed_multiplier / this.z);
        }
        update() {
            this.x += this.speedX;
            this.alpha = this.baseAlpha + Math.sin(Date.now() * this.twinkleSpeed) * 0.15;
            if (this.x < -10) {
                this.x = width + 10;
                this.y = Math.random() * height;
            }
        }
        draw() {
            // Hook reactivo inyectado en el Alpha
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
            this.rotSpeed = (Math.random() - 0.5) * 0.0002; // Rotación casi imperceptible
        }
        update() { this.angle += this.rotSpeed; }
        draw() {
            const reactiveAlpha = 0.5 + (AudioState.bass * activePreset.reactivity.bass_gas_opacity);
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = reactiveAlpha;
            ctx.scale(1, 0.55); // Achatar nubes orgánicamente
            ctx.drawImage(this.texture, -this.baseRadius, -this.baseRadius, this.baseRadius * 2, this.baseRadius * 2);
            ctx.restore();
        }
    }

    // --- CONSTRUCTOR DE ESCENAS ---
    const buildScene = () => {
        stars = []; nebulas = [];

        // Lee dinámicamente tu variable de app.js (mobile_theme)
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

    // --- BUCLE DE RENDERIZADO PRINCIPAL (60 FPS NATIVOS DESDE GPU) ---
    const loop = () => {
        if (!isRunning || !isVisible) return;
        simulateAudio();

        // 1. Limpieza con el color sólido del preset (Blindaje anti-lente destructivo)
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.fillStyle = activePreset.bg_color;
        ctx.fillRect(0, 0, width, height);

        // 2. Pintado de capas
        nebulas.forEach(n => { n.update(); n.draw(); });
        ctx.globalCompositeOperation = 'screen';
        stars.forEach(s => { s.update(); s.draw(); });

        // 3. FUSIÓN ÓPTICA INVISIBLE (Mata el sangrado de la línea naranja de abajo)
        const grad = ctx.createLinearGradient(0, height - 95, 0, height);
        grad.addColorStop(0, 'rgba(18, 18, 18, 0)');
        grad.addColorStop(1, '#121212'); // Sincroniza exacto con el fondo de tu web
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

        // Ocultar fondo nativo para evitar solapamientos inútiles de CPU
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
            filter: 'contrast(1.1) brightness(0.95)' // Tratamiento clínico de la imagen
        });

        banner.insertBefore(canvas, banner.firstChild);
        ctx = canvas.getContext('2d');

        handleResize();
        window.addEventListener('resize', handleResize);

        isRunning = true;

        // Ahorro extremo de batería: Apaga los motores si el usuario navega el tracklist inferior
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                isVisible = entry.isIntersecting;
                if (isVisible && isRunning) loop();
                else cancelAnimationFrame(animationId);
            });
        });
        observer.observe(banner);
    };

    const stopAndDestroy = () => {
        isRunning = false;
        isVisible = false;
        cancelAnimationFrame(animationId);
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
        }
    };
})();