/**
 * VLOITZ PORTADA VISUAL ENGINE (V2 - Neon Depth Edition)
 * Integración óptica con fotografía de perfil, efecto Bokeh y parche de sangrado.
 */

const PortadaVisualEngine = (() => {
    let canvas = null;
    let ctx = null;
    let animationId = null;
    let isRunning = false;
    let isVisible = false;
    let width, height;

    let stars = [];
    let nebulas = [];
    let currentConfig = null;

    const AudioState = { bass: 0, overall: 0 };

    function simulateAudio() {
        const time = Date.now() * 0.001;
        AudioState.bass = (Math.sin(time) + 1) / 2 * 0.15;
    }

    // --- GENERADOR DE TEXTURAS BOKEH (Cero lag en móviles) ---
    function createBokehTexture(color, size, blur) {
        const off = document.createElement('canvas');
        const totalSize = size + blur * 4;
        off.width = totalSize;
        off.height = totalSize;
        const oCtx = off.getContext('2d');

        oCtx.shadowColor = color;
        oCtx.shadowBlur = blur;
        oCtx.fillStyle = color;
        oCtx.beginPath();
        oCtx.arc(totalSize/2, totalSize/2, size/2, 0, Math.PI * 2);
        oCtx.fill();
        return off;
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

    // --- CLASES DEL TEMA ---
    class Star {
        constructor() { this.reset(true); }
        reset(isInit = false) {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.z = Math.random() * 4 + 0.2; // Profundidad de campo

            // Decisión de Óptica (Nítida o Bokeh desenfocado)
            this.isBokeh = Math.random() > 0.85;

            if (this.isBokeh) {
                this.size = (Math.random() * 4 + 2) / this.z;
                const colors = ['#00F3FF', '#FF007F', '#8C00DC']; // Cyan, Magenta, Violeta
                this.color = colors[Math.floor(Math.random() * colors.length)];
                this.texture = createBokehTexture(this.color, this.size, this.size * 2);
            } else {
                this.size = (Math.random() * 1.2 + 0.2) / this.z;
                this.color = Math.random() > 0.5 ? 'rgba(0, 243, 255, ' : 'rgba(255, 255, 255, '; // Puntos Cyan o Blancos
            }

            this.baseAlpha = Math.random() * 0.7 + 0.1;
            this.alpha = this.baseAlpha;
            this.twinkleSpeed = Math.random() * 0.005 + 0.001;
            this.speedX = -(0.08 / this.z); // Paneo
        }
        update() {
            this.x += this.speedX;
            this.alpha = this.baseAlpha + Math.sin(Date.now() * this.twinkleSpeed) * 0.3;
            if (this.x < -20) {
                this.x = width + 20;
                this.y = Math.random() * height;
            }
        }
        draw() {
            const currentAlpha = Math.max(0, Math.min(1, this.alpha));
            if (this.isBokeh) {
                ctx.globalAlpha = currentAlpha * 0.6;
                ctx.drawImage(this.texture, this.x - this.texture.width/2, this.y - this.texture.height/2);
            } else {
                ctx.globalAlpha = 1;
                ctx.fillStyle = this.color + currentAlpha + ')';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
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
            const currentRadius = this.baseRadius + (AudioState.bass * 60);
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.6 + (AudioState.bass * 0.3);
            ctx.scale(1, 0.7);
            ctx.drawImage(this.texture, -currentRadius, -currentRadius, currentRadius * 2, currentRadius * 2);
            ctx.restore();
        }
    }

    const buildThemeDeepTech = () => {
        stars = []; nebulas = [];
        for (let i = 0; i < 180; i++) stars.push(new Star());

        // Paleta extraída de las gafas y casaca de tu foto de perfil
        nebulas = [
            new Nebula(width * 0.2, height * 0.3, 300, 'rgba(0, 243, 255, 0.12)', 'rgba(0, 100, 200, 0.03)'),   // Cyan Eléctrico
            new Nebula(width * 0.8, height * 0.6, 350, 'rgba(255, 0, 127, 0.10)', 'rgba(120, 0, 80, 0.03)'),    // Magenta Neón
            new Nebula(width * 0.5, height * 0.8, 400, 'rgba(140, 0, 220, 0.12)', 'rgba(40, 0, 80, 0.04)'),     // Violeta Profundo
            new Nebula(width * 0.9, height * 0.2, 200, 'rgba(0, 200, 255, 0.08)', 'rgba(0, 50, 100, 0.02)')     // Acento Cyan secundario
        ];
    };

    const loop = () => {
        if (!isRunning || !isVisible) return;
        simulateAudio();

        // 1. Fondo base (Oscuro y sólido para anular el Lens)
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#05040a'; // Tono ultra oscuro que resalta el neón
        ctx.fillRect(0, 0, width, height);

        // 2. Gas y Estrellas
        nebulas.forEach(n => { n.update(); n.draw(); });
        ctx.globalCompositeOperation = 'screen';
        stars.forEach(s => { s.update(); s.draw(); });

        // 3. LA FUSIÓN (El parche para la línea naranja)
        // Dibuja un gradiente exacto al color del fondo de tu web en la base del canvas
        const grad = ctx.createLinearGradient(0, height - 90, 0, height);
        grad.addColorStop(0, 'rgba(18, 18, 18, 0)');
        grad.addColorStop(1, '#121212'); // El --dark-bg de tu CSS

        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.fillStyle = grad;
        // Dibujamos un poco más abajo (+2px) para matar cualquier línea de subpíxel
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
        if (isRunning) buildThemeDeepTech();
    };

    const start = () => {
        if (isRunning) return;
        const banner = document.querySelector('.profile-banner');
        if (!banner) return;

        // TÁCTICA ANTI-SANGRADO: Ocultamos temporalmente la imagen de las palmeras
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
            backgroundColor: '#05040a', // Muro sólido impenetrable
            // Aumentamos contraste para que tu filtro soft-light no mate los colores
            filter: 'contrast(1.3) brightness(1.1) saturate(1.2)'
        });

        banner.insertBefore(canvas, banner.firstChild);
        ctx = canvas.getContext('2d');

        handleResize();
        window.addEventListener('resize', handleResize);

        isRunning = true;

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

        // Restauramos tu imagen de atardecer original si volvemos a PC
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