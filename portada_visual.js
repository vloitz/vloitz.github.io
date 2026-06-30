/**
 * VLOITZ PORTADA VISUAL ENGINE (V6.2 - THE ORGANIC VORTEX FIX)
 * Arquitectura WebGL pura.
 * FIX: Campos de repulsión orgánicos (adiós atascos en los bordes) y Humo Visible garantizado.
 */

const PortadaVisualEngine = (() => {
    // Referencias del sistema
    let canvas = null;
    let gl = null;
    let animationId = null;
    let resizeObserver = null;
    let isRunning = false;
    let width = 0,
        height = 0;
    let currentConfig = null;

    // Variables WebGL
    let bgProgram, particleProgram;
    let bgUniforms = {},
        particleUniforms = {};
    let quadBuffer, particleBuffer;
    let particles = [];
    let particleData = null;

    // 🔗 Estado del Audio (Enchufe para app.js)
    const AudioState = {
        bass: 0
    };
    let isMusicPlaying = false;

    function simulateAudio() {
        if (!isMusicPlaying) {
            AudioState.bass *= 0.90; // Caída suave
            return;
        }
        // Bombeo a ~122 BPM
        const time = Date.now() * 0.0015;
        const groove = (Math.sin(time) + Math.sin(time * 0.8)) / 2;
        AudioState.bass = (groove + 1) / 2 * 0.4; // Pico de 0.4
    }

    // ========================================================================
    // 🎛️ CONFIGURACIÓN MAESTRA
    // ========================================================================
    const CONFIG = {
        particles_count: 350, // Densidad elegante
        particle_size: 3.5, // Tamaño nítido y visible
        speed: 0.02, // Velocidad base
        gravity_pull: 18.0, // Succión poderosa hacia el centro
        friction: 0.93, // Fricción alta = inercia de humo fluido
        colors: [
            [255, 255, 255], // Blanco puro
            [100, 200, 255], // Celeste hielo
            [180, 100, 255] // Violeta oscuro
        ]
    };

    // ========================================================================
    // 🧠 FÍSICA DE PARTÍCULAS ORGÁNICA
    // ========================================================================
    class Particle {
        constructor() {
            this.reset(true);
        }

        reset(isInit = false) {
            // Si nacen durante la música, aparecen en los bordes para ser succionadas
            // Si nacen en pausa, aparecen en cualquier lugar de la pantalla
            if (!isInit && isMusicPlaying) {
                if (Math.random() > 0.5) {
                    this.x = Math.random() > 0.5 ? -10 : width + 10;
                    this.y = Math.random() * height;
                } else {
                    this.x = Math.random() * width;
                    this.y = -10;
                }
            } else {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
            }

            this.z = Math.random() * 3 + 1; // Profundidad 3D
            this.size = (Math.random() * CONFIG.particle_size + 1.0) / this.z;

            const color = CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)];
            this.r = color[0] / 255;
            this.g = color[1] / 255;
            this.b = color[2] / 255;

            this.alpha = Math.random() * 0.5 + 0.2;
            this.twinkle = Math.random() * 0.005;

            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = (Math.random() - 0.5) * 0.5;
        }

        update() {
            if (isMusicPlaying) {
                // MODO PLAY: El Agujero Negro en tu foto de perfil
                const targetX = width * 0.5;
                const targetY = height * 1.0;

                const dx = targetX - this.x;
                const dy = targetY - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Si son absorbidas, renacen en los bordes
                if (dist < 40) {
                    this.reset();
                    return;
                }

                // Fuerza de gravedad inversa a la distancia (Aceleran al acercarse)
                const pull = (CONFIG.gravity_pull * (1.0 + AudioState.bass * 2.5)) / Math.max(dist, 10.0);

                // Turbulencia caótica (Giran y tiemblan mientras son succionadas)
                const turbX = Math.sin(this.y * 0.02 + Date.now() * 0.002) * 0.6;
                const turbY = Math.cos(this.x * 0.02 + Date.now() * 0.002) * 0.2;

                this.vx += (dx * pull) + turbX;
                this.vy += (dy * pull) + turbY;

            } else {
                // MODO PAUSA: Suspensión Cinemática
                const timeStr = Date.now() * 0.0005;

                // Movimiento Browniano (Derivan como polvo suspendido en el aire)
                this.vx += Math.sin(this.y * 0.01 + timeStr) * 0.05;
                this.vy += Math.cos(this.x * 0.01 + timeStr) * 0.05;

                // CAMPOS DE REPULSIÓN SUAVES: Evita que se peguen a los bordes como imanes
                const margin = 40; // Distancia desde el borde donde empieza la repulsión
                if (this.x < margin) this.vx += 0.015;
                if (this.x > width - margin) this.vx -= 0.015;
                if (this.y < margin) this.vy += 0.015;
                if (this.y > height - margin) this.vy -= 0.015;
            }

            // Fricción constante para que el frenado al pausar sea orgánico
            this.vx *= CONFIG.friction;
            this.vy *= CONFIG.friction;

            this.x += this.vx;
            this.y += this.vy;

            // SISTEMA DE RECICLAJE INFINITO
            if (!isMusicPlaying) {
                // Efecto "Pac-Man" en pausa: Si a pesar de la repulsión logran salir, entran por el lado opuesto.
                if (this.x < -20) this.x = width + 20;
                else if (this.x > width + 20) this.x = -20;

                if (this.y < -20) this.y = height + 20;
                else if (this.y > height + 20) this.y = -20;
            } else {
                // En modo Play, si salen volando muy lejos, se reciclan para ser succionadas de nuevo
                if (this.x < -50 || this.x > width + 50 || this.y < -50 || this.y > height + 50) {
                    this.reset();
                }
            }
        }
    }

    // ========================================================================
    // ⚙️ SHADERS WEBGL (El Motor Gráfico Real)
    // ========================================================================
    const SHADERS = {
        bgVertex: `attribute vec2 position; void main() { gl_Position = vec4(position, 0.0, 1.0); }`,
        bgFragment: `
            precision mediump float;
            uniform vec2 u_resolution;
            uniform float u_time;
            uniform float u_bass;

            float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
            float noise(vec2 p) {
                vec2 i = floor(p); vec2 f = fract(p);
                vec2 u = f*f*(3.0-2.0*f);
                return mix(mix(hash(i), hash(i + vec2(1.0,0.0)), u.x),
                           mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
            }
            // Generador de Nubes Fractales (4 Capas de detalle)
            float fbm(vec2 p) {
                float v = 0.0; float a = 0.5;
                for (int i=0; i<4; i++) { v+=a*noise(p); p*=2.0; a*=0.5; }
                return v;
            }

            void main() {
                vec2 uv = gl_FragCoord.xy / u_resolution;

                // Humo denso moviéndose hacia arriba
                vec2 pos = uv * 2.5 + vec2(u_time * 0.02, u_time * 0.06);
                float smoke = fbm(pos);

                // Color base (Abismo espacial, ligeramente iluminado para no ser negro puro)
                vec3 color = vec3(0.04, 0.02, 0.08);

                // Color de la nebulosa (Violeta eléctrico y brillante)
                vec3 nebula = vec3(0.50, 0.10, 0.80);

                // Gradiente vertical: Más brillo abajo (cerca de la foto)
                float gradient = 1.0 - uv.y;

                // Intensidad calculada: Base + Gradiente + Latido del Bajo
                float intensity = smoke * (0.3 + gradient * 0.6 + u_bass * 1.5);

                color = mix(color, nebula, intensity);
                gl_FragColor = vec4(color, 1.0);
            }
        `,
        partVertex: `
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
        partFragment: `
            precision mediump float;
            varying vec4 v_color;
            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                // Suavizado perfecto para bordes redondos de las estrellas
                float alpha = smoothstep(0.5, 0.2, dist);
                gl_FragColor = vec4(v_color.rgb, v_color.a * alpha);
            }
        `
    };

    const compileShader = (type, source) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, source);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
        return s;
    };

    const buildProgram = (vsSrc, fsSrc) => {
        const p = gl.createProgram();
        gl.attachShader(p, compileShader(gl.VERTEX_SHADER, vsSrc));
        gl.attachShader(p, compileShader(gl.FRAGMENT_SHADER, fsSrc));
        gl.linkProgram(p);
        return p;
    };

    // ========================================================================
    // 🛠️ INICIALIZACIÓN DEL MOTOR
    // ========================================================================
    const initEngine = () => {
        bgProgram = buildProgram(SHADERS.bgVertex, SHADERS.bgFragment);
        particleProgram = buildProgram(SHADERS.partVertex, SHADERS.partFragment);

        bgUniforms = {
            res: gl.getUniformLocation(bgProgram, "u_resolution"),
            time: gl.getUniformLocation(bgProgram, "u_time"),
            bass: gl.getUniformLocation(bgProgram, "u_bass")
        };
        particleUniforms = {
            res: gl.getUniformLocation(particleProgram, "u_resolution")
        };

        quadBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

        particles = [];
        for (let i = 0; i < CONFIG.particles_count; i++) particles.push(new Particle());

        particleData = new Float32Array(CONFIG.particles_count * 7);
        particleBuffer = gl.createBuffer();
    };

    const renderLoop = () => {
        if (!isRunning) return;

        simulateAudio();

        // 1. FONDO FRACTAL (Humo)
        gl.disable(gl.BLEND);
        gl.useProgram(bgProgram);
        gl.uniform2f(bgUniforms.res, canvas.width, canvas.height);
        gl.uniform1f(bgUniforms.time, Date.now() * 0.001);
        gl.uniform1f(bgUniforms.bass, AudioState.bass);

        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        const posLoc = gl.getAttribLocation(bgProgram, "position");
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        // 2. PARTÍCULAS
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

        let offset = 0;
        const dpr = window.devicePixelRatio || 1;

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.update();

            particleData[offset++] = p.x;
            particleData[offset++] = p.y;
            particleData[offset++] = p.r;
            particleData[offset++] = p.g;
            particleData[offset++] = p.b;

            const activeAlpha = Math.min(1.0, p.alpha + (AudioState.bass * 0.5));
            particleData[offset++] = activeAlpha;
            particleData[offset++] = p.size * dpr;
        }

        gl.useProgram(particleProgram);
        gl.uniform2f(particleUniforms.res, width, height);

        gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, particleData, gl.DYNAMIC_DRAW);

        const stride = 7 * 4;
        const aPos = gl.getAttribLocation(particleProgram, "a_position");
        const aCol = gl.getAttribLocation(particleProgram, "a_color");
        const aSize = gl.getAttribLocation(particleProgram, "a_size");

        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, stride, 0);
        gl.enableVertexAttribArray(aCol);
        gl.vertexAttribPointer(aCol, 4, gl.FLOAT, false, stride, 2 * 4);
        gl.enableVertexAttribArray(aSize);
        gl.vertexAttribPointer(aSize, 1, gl.FLOAT, false, stride, 6 * 4);

        gl.drawArrays(gl.POINTS, 0, particles.length);

        animationId = requestAnimationFrame(renderLoop);
    };

    const updateDimensions = () => {
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
        banner.style.position = 'relative';

        canvas = document.createElement('canvas');
        canvas.id = 'vloitz-webgl-canvas';
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

        const gradient = document.createElement('div');
        gradient.id = 'vloitz-webgl-gradient';
        Object.assign(gradient.style, {
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            height: '95px',
            background: 'linear-gradient(to bottom, rgba(18,18,18,0) 0%, #121212 100%)',
            pointerEvents: 'none',
            zIndex: 1
        });
        banner.appendChild(gradient);

        gl = canvas.getContext('webgl', {
            alpha: false
        });

        initEngine();
        updateDimensions();

        resizeObserver = new ResizeObserver(() => updateDimensions());
        resizeObserver.observe(banner);

        renderLoop();
    };

    const stop = () => {
        isRunning = false;
        if (animationId) cancelAnimationFrame(animationId);
        if (resizeObserver) resizeObserver.disconnect();

        const banner = document.querySelector('.profile-banner');
        if (canvas) canvas.remove();
        const grad = document.getElementById('vloitz-webgl-gradient');
        if (grad) grad.remove();
        canvas = null;
        gl = null;
    };

    const evaluate = () => {
        if (!currentConfig || !currentConfig.master_switch) return stop();

        const isMobile = window.innerWidth <= 768;
        if (isMobile && currentConfig.enable_mobile) start();
        else if (!isMobile && currentConfig.enable_desktop) start();
        else stop();
    };

    return {
        init: (config) => {
            currentConfig = config;
            evaluate();
            window.addEventListener('resize', evaluate);
        },
        setPlayState: (isPlaying) => {
            isMusicPlaying = isPlaying;
        }
    };
})();