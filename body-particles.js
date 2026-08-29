// @ts-check
(function() {
    // Si la pantalla es mayor a 768px (escritorio), detiene la ejecución aquí mismo
    if (window.innerWidth > 768) {
        return;
    }

    const canvas = document.createElement('canvas');
    canvas.id = 'vloitz-clean-streak-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '0';
    canvas.style.background = '#0D131A';

    document.body.insertBefore(canvas, document.body.firstChild);

    // Contexto WebGL optimizado: sin alpha, sin antialias, sin depth y conservando el buffer
    // para replicar el efecto de desvanecimiento (trail/estela) del canvas 2D.
    const gl = canvas.getContext('webgl', {
        alpha: false,
        antialias: false,
        depth: false,
        preserveDrawingBuffer: true
    });

    if (!gl) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        gl.viewport(0, 0, width, height);
    });

    let lastScrollY = window.scrollY;
    let scrollVelocity = 0;
    let targetVelocity = 0;

    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;
        const deltaY = currentScrollY - lastScrollY;
        targetVelocity += Math.max(0, deltaY * 0.7);
        lastScrollY = currentScrollY;
    });

    // --- SETUP DE SHADERS Y WEBGL ---

    function createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        return shader;
    }

    function createProgram(gl, vsSource, fsSource) {
        const program = gl.createProgram();
        gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, vsSource));
        gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, fsSource));
        gl.linkProgram(program);
        return program;
    }

    // Shaders para el fondo difuminado (estela)
    const fadeVS = `
        attribute vec2 a_position;
        void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
    `;
    const fadeFS = `
        precision mediump float;
        void main() { gl_FragColor = vec4(13.0/255.0, 19.0/255.0, 26.0/255.0, 0.4); }
    `;
    const fadeProgram = createProgram(gl, fadeVS, fadeFS);
    const fadePosAttrib = gl.getAttribLocation(fadeProgram, 'a_position');

    // Shaders para las partículas circulares
    const particleVS = `
        attribute vec2 a_position;
        attribute float a_size;
        attribute float a_alpha;
        uniform vec2 u_resolution;
        varying float v_alpha;
        void main() {
            // Conversión de coordenadas de píxeles a Clip Space (-1 a 1)
            vec2 zeroToOne = a_position / u_resolution;
            vec2 zeroToTwo = zeroToOne * 2.0;
            vec2 clipSpace = zeroToTwo - 1.0;

            // Invertir Y (en WebGL Y crece hacia arriba, en Canvas2D hacia abajo)
            gl_Position = vec4(clipSpace * vec2(1.0, -1.0), 0.0, 1.0);

            // El tamaño se multiplica x2 porque en canvas 2D es un radio, aquí es diámetro
            gl_PointSize = max(a_size * 2.0, 1.0);
            v_alpha = a_alpha;
        }
    `;
    const particleFS = `
        precision mediump float;
        varying float v_alpha;
        void main() {
            // Dibuja un círculo perfecto descartando los píxeles fuera del radio
            vec2 ptCmp = gl_PointCoord - vec2(0.5);
            if(dot(ptCmp, ptCmp) > 0.25) discard;
            gl_FragColor = vec4(1.0, 1.0, 1.0, v_alpha);
        }
    `;
    const particleProgram = createProgram(gl, particleVS, particleFS);
    const partPosAttrib = gl.getAttribLocation(particleProgram, 'a_position');
    const partSizeAttrib = gl.getAttribLocation(particleProgram, 'a_size');
    const partAlphaAttrib = gl.getAttribLocation(particleProgram, 'a_alpha');
    const resolutionUniform = gl.getUniformLocation(particleProgram, 'u_resolution');

    // --- PREPARACIÓN DE BUFFERS ---

    // Buffer para el rectángulo a pantalla completa (Fondo de estela)
    const quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,
        1, -1,
        -1, 1,
        1, 1
    ]), gl.STATIC_DRAW);

    // Mismas constantes exactas del código original
    const particleCount = 130;
    const particles = Array.from({
        length: particleCount
    }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        angle: Math.random() * Math.PI * 2,
        radius: Math.random() * Math.max(width, height) * 0.45,
        speed: Math.random() * 0.4 + 0.1,
        size: Math.random() * 0.6 + 0.2
    }));

    // Buffer de datos que enviará información a la GPU (x, y, tamaño, opacidad)
    const particleData = new Float32Array(particleCount * 4);
    const particleBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, particleData.byteLength, gl.DYNAMIC_DRAW);

    // Configuración inicial del viewport y mezcla de canales
    gl.viewport(0, 0, width, height);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Primer llenado de fondo opaco para evitar artefactos
    gl.clearColor(13 / 255, 19 / 255, 26 / 255, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    function animate() {
        // --- 1. ACTUALIZAR FÍSICAS (IDÉNTICO AL ORIGINAL) ---
        scrollVelocity += (targetVelocity - scrollVelocity) * 0.12;
        targetVelocity *= 0.85;
        scrollVelocity *= 0.88;

        const centerX = width / 2;
        const centerY = height / 2;

        let idx = 0;
        for (let i = 0; i < particleCount; i++) {
            const p = particles[i];
            p.angle += 0.002;

            const upwardPull = scrollVelocity * 0.35;
            p.y += (upwardPull - p.speed);

            const targetX = centerX + Math.cos(p.angle) * p.radius;
            const targetY = centerY + Math.sin(p.angle) * (p.radius * 0.45) + (p.y % height);

            const distFromCenter = Math.hypot(targetX - centerX, targetY - centerY);
            const alpha = Math.max(0.1, (1 - distFromCenter / (width * 0.7)) * 0.7);

            if (p.y > height) p.y = 0;
            if (p.y < 0) p.y = height;

            // Almacenar en el array plano para WebGL
            particleData[idx++] = targetX;
            particleData[idx++] = targetY;
            particleData[idx++] = p.size;
            particleData[idx++] = alpha;
        }

        // --- 2. RENDER DEL EFECTO DE ESTELA (REEMPLAZA fillRect) ---
        gl.useProgram(fadeProgram);
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        gl.enableVertexAttribArray(fadePosAttrib);
        gl.vertexAttribPointer(fadePosAttrib, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.disableVertexAttribArray(fadePosAttrib);

        // --- 3. RENDER DE LAS PARTÍCULAS POR GPU ---
        gl.useProgram(particleProgram);
        gl.uniform2f(resolutionUniform, width, height);

        // Cargar los 130 datos calculados directo a la VRAM
        gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, particleData);

        gl.enableVertexAttribArray(partPosAttrib);
        gl.enableVertexAttribArray(partSizeAttrib);
        gl.enableVertexAttribArray(partAlphaAttrib);

        // Definir la estructura del Float32Array (16 bytes en total por partícula)
        gl.vertexAttribPointer(partPosAttrib, 2, gl.FLOAT, false, 16, 0); // x, y (offset 0)
        gl.vertexAttribPointer(partSizeAttrib, 1, gl.FLOAT, false, 16, 8); // tamaño (offset 8)
        gl.vertexAttribPointer(partAlphaAttrib, 1, gl.FLOAT, false, 16, 12); // opacidad (offset 12)

        // Dibuja los 130 puntos de una vez utilizando el hardware gráfico
        gl.drawArrays(gl.POINTS, 0, particleCount);

        gl.disableVertexAttribArray(partPosAttrib);
        gl.disableVertexAttribArray(partSizeAttrib);
        gl.disableVertexAttribArray(partAlphaAttrib);

        requestAnimationFrame(animate);
    }

    animate();
})();