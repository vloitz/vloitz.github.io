/**
 * VLOITZ PORTADA VISUAL ENGINE (V5.1 - THE VORTEX & FRACTAL SMOKE EDITION)
 * Arquitectura escalable basada en Arrays de Visuales.
 * Renderizado por GPU para máximo rendimiento y matemáticas orgánicas reales.
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
            AudioState.bass *= 0.95; // Caída suave y cinemática en pausa
            return;
        }
        // Simulador de Sub-Bajo: Oscilación densa y viscosa
        const time = Date.now() * 0.0015;
        const groove = (Math.sin(time) + Math.sin(time * 0.8)) / 2;
        AudioState.bass = (groove + 1) / 2 * 0.35;
    }

    // ========================================================================
    // 🗄️ REGISTRO DE VISUALES (ARRAY ESCALABLE PARA FUTURA EXTRACCIÓN)
    // ========================================================================
    const VISUALS_REGISTRY = [{
        id: 'deep_tech_minimal',
        name: 'Pure Deep Tech Minimal (Fractal Vortex)',
        config: {
            particles_count: 500, // Menos es más: densidad justa y elegante
            particles_base_size: 2.5, // Puntos nítidos, calibrados para pantallas Retina
            speed_multiplier: 0.015, // Flotación lenta
            reactivity: {
                bass_particle_glow: 0.25 // Destello fino y elegante
            },
            physics: {
                gravity_center: {
                    x: 0.5,
                    y: 0.45
                },
                gravity_pull: 0.45, // Fuerza de atracción base
                vortex_strength: 1.1, // NUEVO: Intensidad del espiral (giro)
                smoke_friction: 0.94 // Fluido espeso, frena la velocidad
            },
            colors: [
                [255, 255, 255], // Blanco
                [180, 210, 255], // Celeste frío
                [140, 100, 220] // Violeta oscuro
            ]
        },
        shaders: {
            // FBM SMOKE SHADER: Genera nubes de gas orgánicas y matemáticas en la GPU (Cero CPU)
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

                        // Funciones matemáticas de ruido para simular humo orgánico
                        float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
                        float noise(vec2 p) {
                            vec2 i = floor(p); vec2 f = fract(p);
                            vec2 u = f*f*(3.0-2.0*f);
                            return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
                                       mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
                        }
                        // Fractal Brownian Motion
                        float fbm(vec2 p) {
                            float v = 0.0; float a = 0.5;
                            for (int i=0; i<4; i++) { v+=a*noise(p); p*=2.0; a*=0.5; }
                            return v;
                        }

                        void main() {
                            vec2 uv = gl_FragCoord.xy / u_resolution;

                            // Color base del Abismo
                            vec3 color = vec3(0.015, 0.012, 0.025);

                            // Cinemática del Humo (Se deforma y avanza lentamente)
                            vec2 pos = uv * 2.5 + vec2(u_time * 0.03, u_time * 0.02);
                            float smoke = fbm(pos + fbm(pos + u_time * 0.05));

                            // Centramos la acumulación de humo cerca de tu foto
                            float distCenter = length(uv - vec2(0.5, 0.45));
                            float mask = smoothstep(0.9, 0.0, distCenter);

                            // Color del gas reaccionando de forma viscosa al Sub-Bajo
                            vec3 nebulaColor = vec3(0.18, 0.10, 0.35); // Violeta denso
                            float smokeIntensity = smoke * mask * (0.2 + u_bass * 0.5);

                            color = mix(color, nebulaColor, smokeIntensity);

                            gl_FragColor = vec4(color, 1.0);
                        }
                    `
            },
            particles: {
                vertex: `
                        attribute vec2 a_position;
                        attribute vec4 a_color;
                        attribute float a_size;

                        uniform vec2 u_resolution;
                        varying vec4 v_color;

                        void main() {
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
                            float dist = length(gl_PointCoord - vec2(0.5));
                            if (dist > 0.5) discard;

                            float alpha = smoothstep(0.5, 0.2, dist);
                            gl_FragColor = vec4(v_color.rgb, v_color.a * alpha);
                        }
                    `
            }
        }
    }];

    let activeVisual = VISUALS_REGISTRY[0];

    // ========================================================================
    // 🧠 LÓGICA DE FÍSICA EN CPU: VÓRTICE ORBITAL
    // ========================================================================
    class ParticleCore {
        constructor() {
            this.reset(true);
        }

        reset(isInit = false) {
            // Renacen en los bordes para alimentar el vórtice
            if (!isInit) {
                if (Math.random() > 0.5) {
                    this.x = Math.random() > 0.5 ? -10 : width + 10;
                    this.y = Math.random() * height;
                } else {
                    this.x = Math.random() * width;
                    this.y = Math.random() > 0.5 ? -10 : height + 10;
                }
            } else {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
            }

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

                // Desvanecimiento orgánico antes de tocar el centro
                let eventHorizonAlpha = 1;
                if (dist < 150) {
                    eventHorizonAlpha = Math.max(0, dist - 40) / 110;
                }

                // Absorbidos por el agujero negro
                if (dist < 40) {
                    this.reset();
                    return;
                }

                // Matemáticas del VÓRTICE (Atracción Directa + Fuerza Tangencial/Giro)
                const reactivePull = activeVisual.config.physics.gravity_pull * (0.3 + (AudioState.bass * 0.7));
                const pull = reactivePull / this.z;

                const vStrength = activeVisual.config.physics.vortex_strength;
                const tx = -dy; // Vector perpendicular X
                const ty = dx; // Vector perpendicular Y

                // Inyectamos el movimiento de espiral
                this.vx += ((dx / dist) + (tx / dist) * vStrength) * pull;
                this.vy += ((dy / dist) + (ty / dist) * vStrength) * pull;

                // Fricción altísima para simular humo de rave espeso
                this.vx *= activeVisual.config.physics.smoke_friction;
                this.vy *= activeVisual.config.physics.smoke_friction;

                this.x += this.vx;
                this.y += this.vy;

                this.alpha = (this.baseAlpha + Math.sin(Date.now() * this.twinkleSpeed) * 0.15) * eventHorizonAlpha;
            } else {
                // Flotación inerte cuando no hay música
                this.vx = this.speedX;
                this.vy = 0;
                this.x += this.speedX;
                this.alpha = this.baseAlpha + Math.sin(Date.now() * this.twinkleSpeed) * 0.15;
            }

            // Si escapan del lienzo por culpa del giro o el viento
            if (this.x < -20 || this.x > width + 20 || this.y < -20 || this.y > height + 20) {
                this.reset();
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

            particleData[offset++] = p.x;
            particleData[offset++] = p.y;
            particleData[offset++] = p.r;
            particleData[offset++] = p.g;
            particleData[offset++] = p.b;

            const finalAlpha = Math.max(0, Math.min(1, p.alpha + (AudioState.bass * activeVisual.config.reactivity.bass_particle_glow)));
            particleData[offset++] = finalAlpha;
            particleData[offset++] = p.baseSize;
        }

        gl.useProgram(particleProgram);
        gl.uniform2f(particleUniforms.resolution, width, height);

        gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, particleData, gl.DYNAMIC_DRAW);

        const stride = 7 * 4;
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

        const themeId = (currentConfig && currentConfig.mobile_theme) ? currentConfig.mobile_theme : 'deep_tech_minimal';
        activeVisual = VISUALS_REGISTRY.find(v => v.id === themeId) || VISUALS_REGISTRY[0];

        banner.dataset.originalBg = banner.style.backgroundImage;
        banner.style.backgroundImage = 'none';
        banner.style.position = 'relative';

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
        setPlayState: (isPlaying) => {
            isMusicPlaying = isPlaying;
        }
    };
})();