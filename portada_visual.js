/**
 * VLOITZ PORTADA VISUAL ENGINE (V5.4 - THE TRUE VORTEX MASTER)
 * Arquitectura escalable basada en Arrays de Visuales.
 * FIX: Coordenadas de la foto corregidas (y: 1.05), Humo Retina Fix y Turbulencia real.
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
    let particleData = null;

    let bgProgram, particleProgram;
    let bgUniforms = {},
        particleUniforms = {};
    let quadBuffer, particleBuffer;
    let posLoc, pPosLoc, pColLoc, pSizeLoc;

    // 🔗 CABLES LISTOS PARA TU AUDIO
    const AudioState = {
        bass: 0,
        overall: 0
    };
    let isMusicPlaying = false;

    function simulateAudio() {
        if (!isMusicPlaying) {
            AudioState.bass *= 0.95;
            return;
        }
        // Simulador de Sub-Bajo: Oscilación densa y viscosa
        const time = Date.now() * 0.0015;
        const groove = (Math.sin(time) + Math.sin(time * 0.8)) / 2;
        AudioState.bass = (groove + 1) / 2 * 0.35;
    }

    // ========================================================================
    // 🗄️ REGISTRO DE VISUALES
    // ========================================================================
    const VISUALS_REGISTRY = [{
        id: 'deep_tech_minimal',
        name: 'Pure Deep Tech Minimal (Fractal Vortex)',
        config: {
            particles_count: 550, // Densidad elegante
            particles_base_size: 1.6, // Puntos finos pero claramente visibles
            speed_multiplier: 0.015,
            reactivity: {
                bass_particle_glow: 0.3
            },
            physics: {
                gravity_center: {
                    x: 0.5,
                    y: 1.05
                }, // FIX: El centro EXACTO de tu foto (Borde inferior)
                gravity_pull: 1.2, // Fuerte atracción al centro
                vortex_strength: 0.6, // Giro perfecto para formar espiral
                smoke_friction: 0.92 // Fricción viscosa de humo
            },
            colors: [
                [255, 255, 255], // Blanco estelar
                [160, 200, 255], // Celeste frío
                [140, 100, 255] // Violeta oscuro
            ]
        },
        shaders: {
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

                        float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
                        float noise(vec2 p) {
                            vec2 i = floor(p); vec2 f = fract(p);
                            vec2 u = f*f*(3.0-2.0*f);
                            return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
                                       mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
                        }
                        float fbm(vec2 p) {
                            float v = 0.0; float a = 0.5;
                            for (int i=0; i<4; i++) { v+=a*noise(p); p*=2.0; a*=0.5; }
                            return v;
                        }

                        void main() {
                            vec2 uv = gl_FragCoord.xy / u_resolution;

                            // Abismo profundo base
                            vec3 color = vec3(0.02, 0.015, 0.04);

                            vec2 pos = uv * 2.5 + vec2(u_time * 0.03, u_time * 0.02);
                            float smoke = fbm(pos + fbm(pos + u_time * 0.05));

                            // FIX: Centro del humo en tu avatar (En WebGL 'y' está invertido: y = -0.05)
                            float distCenter = length(uv - vec2(0.5, -0.05));
                            float mask = smoothstep(1.2, 0.0, distCenter);

                            vec3 nebulaColor = vec3(0.35, 0.15, 0.65);
                            float smokeIntensity = smoke * mask * (0.5 + u_bass * 1.5);

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
                            gl_Position = vec4(clipSpace * vec2(1.0, -1.0), 0.0, 1.0);
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

                            float alpha = 1.0 - smoothstep(0.1, 0.5, dist);
                            gl_FragColor = vec4(v_color.rgb * alpha, v_color.a * alpha);
                        }
                    `
            }
        }
    }];

    let activeVisual = VISUALS_REGISTRY[0];

    // ========================================================================
    // 🧠 LÓGICA DE FÍSICA EN CPU: VÓRTICE ORGÁNICO
    // ========================================================================
    class ParticleCore {
        constructor() {
            this.reset(true);
        }

        reset(isInit = false) {
            if (!isInit) {
                // Renacen lejos de la foto (en la mitad superior o lados)
                if (Math.random() > 0.5) {
                    this.x = Math.random() > 0.5 ? -20 : width + 20;
                    this.y = Math.random() * height;
                } else {
                    this.x = Math.random() * width;
                    this.y = Math.random() * (height * 0.4) - 20;
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

                // FIX: Horizonte de Sucesos ajustado al radio real de tu foto (75px)
                let eventHorizonAlpha = 1;
                if (dist < 100) {
                    eventHorizonAlpha = Math.max(0, dist - 50) / 50;
                }

                if (dist < 50) {
                    this.reset();
                    return;
                }

                // Matemáticas del VÓRTICE (Gravedad > Giro)
                const reactivePull = activeVisual.config.physics.gravity_pull * (0.4 + (AudioState.bass * 0.6));
                const pull = reactivePull / this.z;

                const vStrength = activeVisual.config.physics.vortex_strength;
                const tx = -dy;
                const ty = dx;

                // 💨 Turbulencia Orgánica Sutil (Rompe la rigidez)
                const timeStr = Date.now() * 0.0003;
                const turbX = Math.sin(this.y * 0.01 + timeStr) * 0.1;
                const turbY = Math.cos(this.x * 0.01 + timeStr) * 0.1;

                this.vx += ((dx / dist) + (tx / dist) * vStrength) * pull + turbX;
                this.vy += ((dy / dist) + (ty / dist) * vStrength) * pull + turbY;

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

            if (this.x < -30 || this.x > width + 30 || this.y < -30 || this.y > height + 30) {
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
        bgProgram = createProgram(activeVisual.shaders.background.vertex, activeVisual.shaders.background.fragment);
        particleProgram = createProgram(activeVisual.shaders.particles.vertex, activeVisual.shaders.particles.fragment);

        bgUniforms = {
            resolution: gl.getUniformLocation(bgProgram, "u_resolution"),
            time: gl.getUniformLocation(bgProgram, "u_time"),
            bass: gl.getUniformLocation(bgProgram, "u_bass")
        };
        particleUniforms = {
            resolution: gl.getUniformLocation(particleProgram, "u_resolution")
        };

        posLoc = gl.getAttribLocation(bgProgram, "position");
        pPosLoc = gl.getAttribLocation(particleProgram, "a_position");
        pColLoc = gl.getAttribLocation(particleProgram, "a_color");
        pSizeLoc = gl.getAttribLocation(particleProgram, "a_size");

        quadBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

        particles = [];
        const count = activeVisual.config.particles_count;
        for (let i = 0; i < count; i++) {
            particles.push(new ParticleCore());
        }

        particleData = new Float32Array(count * 7);
        particleBuffer = gl.createBuffer();
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

        gl.clearColor(0.02, 0.015, 0.04, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // 1. DIBUJAR FONDO (Humo Fractal)
        gl.disable(gl.BLEND);
        gl.useProgram(bgProgram);
        gl.uniform2f(bgUniforms.resolution, canvas.width, canvas.height); // FIX: Físico (Retina)
        gl.uniform1f(bgUniforms.time, Date.now() * 0.001);
        gl.uniform1f(bgUniforms.bass, AudioState.bass);

        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        // 2. ACTUALIZAR Y DIBUJAR PARTÍCULAS
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

        let offset = 0;
        const count = particles.length;
        const dpr = window.devicePixelRatio || 1;

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
            particleData[offset++] = p.baseSize * dpr;
        }

        gl.useProgram(particleProgram);
        gl.uniform2f(particleUniforms.resolution, width, height); // FIX: Lógico para JS

        gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, particleData, gl.DYNAMIC_DRAW);

        const stride = 7 * 4;
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

        gl = canvas.getContext('webgl', {
            alpha: false
        }) || canvas.getContext('experimental-webgl', {
            alpha: false
        });
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