const AudioState = { bass: 0, overall: 0 };

    function simulateAudio() {
        const time = Date.now() * 0.001;
        // Latido súper sutil, listo para cuando conectemos los cables reales
        AudioState.bass = (Math.sin(time) + 1) / 2 * 0.1;
    }

    // ========================================================================
    // 🎛️ SISTEMA DE PRESETS (Arquitectura Modular Visual)
    // ========================================================================
    const VISUAL_PRESETS = {
        'deep_tech_minimal': {
            bg_color: '#030305', // Fondo abisal
            gas_enabled: true,
            gas_colors: [
                ['rgba(15, 20, 35, 0.15)', 'rgba(5, 8, 15, 0.05)'], // Niebla fría, oscura y elegante
                ['rgba(10, 15, 25, 0.10)', 'rgba(2, 4, 8, 0.02)']
            ],
            particles_count: 250,
            particles_base_size: 0.7, // Puntos milimétricos, cero burbujas
            particles_colors: ['rgba(255,255,255,', 'rgba(180,200,230,'], // Blanco puro y cian muy lavado
            speed_multiplier: 0.02,   // Paneo hiper-lento (cinemático)
            reactivity: {
                bass_gas_opacity: 0.15, // Cuánto palpita el gas con el bajo
                bass_particle_glow: 0.4 // Cuánto brillan los puntos con el bajo
            }
        }
    };

    let activePreset = VISUAL_PRESETS['deep_tech_minimal'];

    // --- GENERADOR DE TEXTURAS (Caché en memoria) ---
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

    // --- ENTIDADES GENÉRICAS (Controladas estrictamente por el Preset) ---
    class Particle {
        constructor() { this.reset(true); }
        reset(isInit = false) {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.z = Math.random() * 4 + 1;

            // Tamaño exacto dictado por el preset
            this.size = (Math.random() * activePreset.particles_base_size + 0.2) / this.z;
            this.color = activePreset.particles_colors[Math.floor(Math.random() * activePreset.particles_colors.length)];

            this.baseAlpha = Math.random() * 0.5 + 0.1;
            this.alpha = this.baseAlpha;
            this.twinkleSpeed = Math.random() * 0.003 + 0.001;
            this.speedX = -(activePreset.speed_multiplier / this.z);
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
            // Lógica reactiva matemática aislada
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
            this.rotSpeed = (Math.random() - 0.5) * 0.0003;
        }
        update() { this.angle += this.rotSpeed; }
        draw() {
            const reactiveAlpha = 0.4 + (AudioState.bass * activePreset.reactivity.bass_gas_opacity);
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = reactiveAlpha;
            ctx.scale(1, 0.6);
            ctx.drawImage(this.texture, -this.baseRadius, -this.baseRadius, this.baseRadius * 2, this.baseRadius * 2);
            ctx.restore();
        }
    }

    // --- CORE DEL MOTOR ---
    const buildScene = () => {
        stars = []; nebulas = [];

        // El motor lee la variable maestra que definimos en app.js
        const themeName = (currentConfig && currentConfig.mobile_theme) ? currentConfig.mobile_theme : 'deep_tech_minimal';
        activePreset = VISUAL_PRESETS[themeName] || VISUAL_PRESETS['deep_tech_minimal'];

        for (let i = 0; i < activePreset.particles_count; i++) stars.push(new Particle());

        if (activePreset.gas_enabled) {
            const gC = activePreset.gas_colors;
            nebulas = [
                new GasCloud(width * 0.3, height * 0.4, 300, gC[0][0], gC[0][1]),
                new GasCloud(width * 0.7, height * 0.7, 400, gC[1][0], gC[1][1]),
                new GasCloud(width * 0.8, height * 0.2, 250, gC[0][0], gC[0][1])
            ];
        }
    };

    const loop = () => {
        if (!isRunning || !isVisible) return;
        simulateAudio();

        // 1. Fondo base (Dictado por el preset)
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.fillStyle = activePreset.bg_color;
        ctx.fillRect(0, 0, width, height);

        // 2. Render de Entidades
        nebulas.forEach(n => { n.update(); n.draw(); });
        ctx.globalCompositeOperation = 'screen';
        stars.forEach(s => { s.update(); s.draw(); });

        // 3. LA FUSIÓN INVISIBLE (Parche Anti-Sangrado Naranja)
        const grad = ctx.createLinearGradient(0, height - 90, 0, height);
        grad.addColorStop(0, 'rgba(18, 18, 18, 0)');
        grad.addColorStop(1, '#121212');
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.fillStyle = grad;
        ctx.fillRect(0, height - 90, width, 92);

        animationId = requestAnimationFrame(loop);
    };

    const handleResize = () => {
        if (!canvas) return;
        const rect = canvas.parentElement.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
        canvas.width = width;
        canvas.height = height;
        if (isRunning) buildScene(); // Llama a la nueva función agnóstica
    };