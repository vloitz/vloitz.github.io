

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

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
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

    /**
     * @typedef {Object} CleanParticle
     * @property {number} x
     * @property {number} y
     * @property {number} angle
     * @property {number} radius
     * @property {number} speed
     * @property {number} size
     */

    const particleCount = 130;
    /** @type {CleanParticle[]} */
    const particles = Array.from({ length: particleCount }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        angle: Math.random() * Math.PI * 2,
        radius: Math.random() * Math.max(width, height) * 0.45,
        speed: Math.random() * 0.4 + 0.1,
        size: Math.random() * 0.6 + 0.2
    }));

    function animate() {
        ctx.fillStyle = 'rgba(13, 19, 26, 0.4)';
        ctx.fillRect(0, 0, width, height);

        scrollVelocity += (targetVelocity - scrollVelocity) * 0.12;
        targetVelocity *= 0.85;
        scrollVelocity *= 0.88;

        const centerX = width / 2;
        const centerY = height / 2;

        particles.forEach(p => {
            p.angle += 0.002;

            // Dirección invertida: en lugar de restar, sumamos para empujar en sentido contrario al scroll
            const upwardPull = scrollVelocity * 0.35;
            p.y += (upwardPull - p.speed);

            const targetX = centerX + Math.cos(p.angle) * p.radius;
            const targetY = centerY + Math.sin(p.angle) * (p.radius * 0.45) + (p.y % height);

            const distFromCenter = Math.hypot(targetX - centerX, targetY - centerY);
            const alpha = Math.max(0.1, (1 - distFromCenter / (width * 0.7)) * 0.7);

            ctx.beginPath();
            ctx.arc(targetX, targetY, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.fill();

            if (p.y > height) p.y = 0;
            if (p.y < 0) p.y = height;
        });

        requestAnimationFrame(animate);
    }

    animate();
})();