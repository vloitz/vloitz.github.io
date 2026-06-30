/**
 * VLOITZ PORTADA VISUAL ENGINE (V5.0 - WebGL PURE DEEP TECH EDITION)
 * Arquitectura escalable basada en Arrays de Visuales.
 * Renderizado por GPU para máximo rendimiento en móviles de gama baja.
 */

const PortadaVisualEngine = (() => {
    let canvas = null;
    let gl = null;
    let animationId = null;
    let isRunning = false;
    let isVisible = false;
    let width = 0,
        height = 0;

    let currentConfig = null;
    let particles = [];
    let particleData = null; // Buffer de datos para WebGL

    // Programas de WebGL
    let bgProgram, particleProgram;
    let bgUniforms = {},
        particleUniforms = {};
    let particleBuffer;

    // 🔗 CABLES LISTOS PARA TU AUDIO
    const AudioState = {
        bass: 0,
        overall: 0
    };
    let isMusicPlaying = false;

    function simulateAudio() {
        if (!isMusicPlaying) {
            AudioState.bass *= 0.95; // Caída suave en pausa
            return;
        }
        // Simulador de Sub-Bajo: Oscilación densa y pesada (Sin picos estroboscópicos)
        const time = Date.now() * 0.0015;
        const groove = (Math.sin(time) + Math.sin(time * 0.8)) / 2;
        AudioState.bass = (groove + 1) / 2 * 0.35;
    }

    // ========================================================================
    // 🗄️ REGISTRO DE VISUALES (ARRAY ESCALABLE PARA FUTURA EXTRACCIÓN)
    // ========================================================================
    const VISUALS_REGISTRY = [{
        id: 'deep_tech_minimal',
        name: 'Pure Deep Tech Minimal (WebGL)',
        config: {
            particles_count: 800, // WebGL maneja 800+ partículas sin inmutarse
            particles_base_size: 2.0, // Puntos minúsculos y finos (polvo estelar)
            speed_multiplier: 0.015, // Movimiento casi estático (flotación)
            reactivity: {
                bass_particle_glow: 0.2 // Destello finísimo
            },
            physics: {
                gravity_center: {
                    x: 0.5,
                    y: 0.45
                }, // Atracción a tu foto
                gravity_pull: 0.5, // Atracción suave
                smoke_friction: 0.965 // Fricción ALTA: fluido espeso y denso
            },
            colors: [
                [255, 255, 255], // Blanco
                [180, 210, 255], // Celeste frío
                [140, 100, 220] // Violeta oscuro
            ]
        },
        shaders: {
            // Shader para el fondo (Nebulosas oscuras generadas matemáticamente en GPU)
            background: {
                vertex: `
                        attribute vec2 position;
                        void main() { gl_Position = vec4(position, 0.0, 1.0); }
                    `,
                fragment: `
                        precision mediump float;
                        uniform vec2 u_resolution;
                        uniform float u_time;
                        uniform float u_bass;

                        void main() {
                            vec2 uv = gl_FragCoord.xy / u_resolution;

                            // Abismo profundo (Sobrio y minimalista)
                            vec3 color = vec3(0.015, 0.012, 0.031);

                            // Respiración orgánica lentísima
                            float breath = sin(u_time * 0.2) * 0.5 + 0.5;

                            // Nebulosa 1 (Violeta muy oscuro)
                            float d1 = length(uv - vec2(0.25, 0.35));
                            float neb1 = smoothstep(0.6, 0.0, d1) * (0.15 + breath * 0.05);
                            color = mix(color, vec3(0.17, 0.1, 0.31), neb1 * (1.0 + u_bass * 0.4));

                            // Nebulosa 2 (Azul acero muy atenuado)
                            float d2 = length(uv - vec2(0.75, 0.65));
                            float neb2 = smoothstep(0.7, 0.0, d2) * (0.12 + (1.0 - breath) * 0.05);
                            color = mix(color, vec3(0.06, 0.12, 0.23), neb2 * (1.0 + u_bass * 0.4));

                            gl_FragColor = vec4(color, 1.0);
                        }
                    `
            },
            // Shader para las partículas
            particles: {
                vertex: `
                        attribute vec2 a_position;
                        attribute vec4 a_color;
                        attribute float a_size;

                        uniform vec2 u_resolution;
                        varying vec4 v_color;

                        void main() {
                            // Convertir coordenadas de píxeles a espacio de clip de WebGL (-1 a +1)
                            vec2 clipSpace = (a_position / u_resolution) * 2.0 - 1.0;
                            gl_Position = vec4(clipSpace * vec2(1, -1), 0.0, 1.0);
                            gl_PointSize = a_size;
                            v_color = a_color;
                        }
                    `,
                fragment: `
                        precision mediump float;
                        varying vec4 v_color;

                        void main() {
                            // Forma circular suave para el polvo estelar
                            float dist = length(gl_PointCoord - vec2(0.5));
                            if (dist > 0.5) discard;

                            float alpha = smoothstep(0.5, 0.2, dist);
                            gl_FragColor = vec4(v_color.rgb, v_color.a * alpha);
                        }
                    `
            }
        }
    }];

    let activeVisual = VISUALS_REGISTRY[0]; // Por ahora seleccionamos el primero por defecto

    // ========================================================================
    // 🧠 LÓGICA DE FÍSICA EN CPU (Mantiene el control exacto de Vloitz)
    // ========================================================================
    class ParticleCore {
        constructor() {
            this.reset(true);
        }

        reset(isInit = false) {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.z = Math.random() * 4 + 1.5;

            this.baseSize = (Math.random() * activeVisual.config.particles_base_size + 0.5) / this.z;

            const colorSet = activeVisual.config.colors[Math.floor(Math.random() * activeVisual.config.colors.length)];
            this.r = colorSet[0] / 255;
            this.g = colorSet[1] / 255;
            this.b = colorSet[2] / 255;

            this.baseAlpha = Math.random() * 0.4 + 0.1;
            this.alpha = this.baseAlpha;
            this.twinkleSpeed = Math.random() * 0.003 + 0.001;

            this.speedX = -(activeVisual.config.speed_multiplier / this.z);
            this.vx = this.speedX;
            this.vy = 0;
        }

        update() {
            if (isMusicPlaying) {
                const targetX = width * activeVisual.config.physics.gravity_center.x;
                const targetY = height * activeVisual.config.physics.gravity_center.y;

                const dx = targetX - this.x;
                const dy = targetY - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Horizonte de Sucesos: Desvanecimiento orgánico
                let eventHorizonAlpha = 1;
                if (dist < 150) {
                    eventHorizonAlpha = Math.max(0, dist - 40) / 110;
                }

                // Renacimiento al llegar al agujero negro
                if (dist < 40) {
                    this.reset(true);
                    return;
                }

                // Atracción matemática densa (Gravedad)
                const reactivePull = activeVisual.config.physics.gravity_pull * (0.3 + (AudioState.bass * 0.7));
                const pull = reactivePull / this.z;

                this.vx += (dx / dist) * pull;
                this.vy += (dy / dist) * pull;

                // Fricción altísima para simular humo de rave
                this.vx *= activeVisual.config.physics.smoke_friction;
                this.vy *= activeVisual.config.physics.smoke_friction;

                this.x += this.vx;
                this.y += this.vy;

                this.alpha = (this.baseAlpha + Math.sin(Date.now() * this.twinkleSpeed) * 0.15) * eventHorizonAlpha;
            } else {
                this.vx = this.speedX;
                this.vy = 0;
                this.x += this.speedX;
                this.alpha = this.baseAlpha + Math.sin(Date.now() * this.twinkleSpeed) * 0.15;
            }

            if (this.x < -10) {
                this.x = width + 10;
                this.y = Math.random() * height;
            }
        }
    }

    // ========================================================================
    // ⚙️ COMPILADOR Y GESTOR WEBGL
    // ========================================================================
    const createShader = (type, source) => {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Error compilando shader:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    };

    const createProgram = (vertexSrc, fragmentSrc) => {
        const vs = createShader(gl.VERTEX_SHADER, vertexSrc);
        const fs = createShader(gl.FRAGMENT_SHADER, fragmentSrc);
        const prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        return prog;
    };

    const initWebGL = () => {
        // Compilar programa de fondo (Nebulosa generada por GPU)
        bgProgram = createProgram(activeVisual.shaders.background.vertex, activeVisual.shaders.background.fragment);
        bgUniforms = {
            resolution: gl.getUniformLocation(bgProgram, "u_resolution"),
            time: gl.getUniformLocation(bgProgram, "u_time"),
            bass: gl.getUniformLocation(bgProgram, "u_bass")
        };

        // Compilar programa de partículas
        particleProgram = createProgram(activeVisual.shaders.particles.vertex, activeVisual.shaders.particles.fragment);
        particleUniforms = {
            resolution: gl.getUniformLocation(particleProgram, "u_resolution")
        };

        // Inicializar datos lógicos
        particles = [];
        const count = activeVisual.config.particles_count;
        for (let i = 0; i < count; i++) {
            particles.push(new ParticleCore());
        }

        // Cada partícula usa 7 valores (x, y, r, g, b, a, size)
        particleData = new Float32Array(count * 7);
        particleBuffer = gl.createBuffer();

        // Habilitar mezcla aditiva (Screen mode equivalente en WebGL)
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // Screen / Additive blend
    };

    // ========================================================================
    // 🔄 BUCLE PRINCIPAL DE RENDERIZADO
    // ========================================================================
    const loop = () => {
        if (!isRunning || !isVisible) {
            animationId = null;
            return;
        }

        simulateAudio();

        // 1. DIBUJAR FONDO (Quad a pantalla completa)
        gl.useProgram(bgProgram);
        gl.uniform2f(bgUniforms.resolution, width, height);
        gl.uniform1f(bgUniforms.time, Date.now() * 0.001);
        gl.uniform1f(bgUniforms.bass, AudioState.bass);

        // Geometría rápida para llenar la pantalla
        const quadBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
        const posLoc = gl.getAttribLocation(bgProgram, "position");
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        // 2. ACTUALIZAR Y DIBUJAR PARTÍCULAS
        let offset = 0;
        const count = particles.length;
        for (let i = 0; i < count; i++) {
            const p = particles[i];
            p.update();

            // Empaquetar datos para la GPU
            particleData[offset++] = p.x;
            particleData[offset++] = p.y;
            particleData[offset++] = p.r;
            particleData[offset++] = p.g;
            particleData[offset++] = p.b;

            // Reacción sutil de opacidad al bajo
            const finalAlpha = Math.max(0, Math.min(1, p.alpha + (AudioState.bass * activeVisual.config.reactivity.bass_particle_glow)));
            particleData[offset++] = finalAlpha;
            particleData[offset++] = p.baseSize;
        }

        gl.useProgram(particleProgram);
        gl.uniform2f(particleUniforms.resolution, width, height);

        gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, particleData, gl.DYNAMIC_DRAW);

        const stride = 7 * 4; // 7 floats * 4 bytes
        const pPosLoc = gl.getAttribLocation(particleProgram, "a_position");
        const pColLoc = gl.getAttribLocation(particleProgram, "a_color");
        const pSizeLoc = gl.getAttribLocation(particleProgram, "a_size");

        gl.enableVertexAttribArray(pPosLoc);
        gl.vertexAttribPointer(pPosLoc, 2, gl.FLOAT, false, stride, 0);

        gl.enableVertexAttribArray(pColLoc);
        gl.vertexAttribPointer(pColLoc, 4, gl.FLOAT, false, stride, 2 * 4);

        gl.enableVertexAttribArray(pSizeLoc);
        gl.vertexAttribPointer(pSizeLoc, 1, gl.FLOAT, false, stride, 6 * 4);

        gl.drawArrays(gl.POINTS, 0, count);

        animationId = requestAnimationFrame(loop);
    };

    const handleResize = () => {
        if (!canvas) return;
        const rect = canvas.parentElement.getBoundingClientRect();
        width = rect.width;
        height = rect.height;

        // Optimización WebGL: Ajuste al DevicePixelRatio para mayor nitidez
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const start = () => {
        if (isRunning) return;
        const banner = document.querySelector('.profile-banner');
        if (!banner) return;

        isRunning = true;

        // Encontrar el visual correcto del Array
        const themeId = (currentConfig && currentConfig.mobile_theme) ? currentConfig.mobile_theme : 'deep_tech_minimal';
        activeVisual = VISUALS_REGISTRY.find(v => v.id === themeId) || VISUALS_REGISTRY[0];

        banner.dataset.originalBg = banner.style.backgroundImage;
        banner.style.backgroundImage = 'none';
        banner.style.position = 'relative';

        // Inyección del Canvas WebGL
        canvas = document.createElement('canvas');
        canvas.id = 'v-cosmic-canvas-webgl';
        Object.assign(canvas.style, {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 0
        });

        banner.insertBefore(canvas, banner.firstChild);

        // Inyección del degradado inferior (Protegido y desacoplado del canvas)
        const gradientOverlay = document.createElement('div');
        gradientOverlay.id = 'v-cosmic-gradient';
        Object.assign(gradientOverlay.style, {
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            height: '95px',
            background: 'linear-gradient(to bottom, rgba(18,18,18,0) 0%, #121212 100%)',
            pointerEvents: 'none',
            zIndex: 1
        });
        banner.appendChild(gradientOverlay);

        gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) {
            console.error("WebGL no soportado.");
            return;
        }

        initWebGL();
        handleResize();
        window.addEventListener('resize', handleResize);

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                isVisible = entry.isIntersecting;
                if (isVisible && isRunning) {
                    if (!animationId) loop();
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
        if (canvas && canvas.parentElement) canvas.parentElement.removeChild(canvas);
        const grad = document.getElementById('v-cosmic-gradient');
        if (grad && grad.parentElement) grad.parentElement.removeChild(grad);

        canvas = null;
        gl = null;

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