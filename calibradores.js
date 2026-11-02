// ==========================================================================
// 🛠️ VLOITZ DEV TOOLS & UI CALIBRATORS (STANDALONE)
// Archivo dormido. No afecta el CSS ni el DOM hasta que se llame en consola.
// ==========================================================================
// USO : Abres la consola (F12) y escribes: CalibrarEscudos()
console.log("%c[Vloitz DevTools] Herramientas listas. Comandos: CalibrarEscudos() | CalibrarBotones()", "color: #00F3FF; font-family: monospace; font-size: 12px;");

// --- 1. COMANDO PARA CALIBRAR ESCUDOS DE SCROLL ---
window.CalibrarEscudos = function() {
    console.log("[Calibrador] Iniciando UI de zonas de scroll desde cero...");

    // 1. Limpiamos cualquier calibrador que haya quedado abierto
    document.querySelectorAll('.v-shield-left, .v-shield-right, #v-calibrator, #v-override-css').forEach(e => e.remove());

    // 2. APAGAMOS EL CSS ACTUAL: Inyectamos un estilo para ocultar tus escudos ::before y ::after temporalmente
    const overrideStyle = document.createElement('style');
    overrideStyle.id = 'v-override-css';
    overrideStyle.innerHTML = `
        .current-tracklist-container::before, .current-tracklist-container::after,
        .tracklist-container::before, .tracklist-container::after {
            display: none !important;
            content: none !important;
        }
    `;
    document.head.appendChild(overrideStyle);

    // 3. CREAMOS LOS ESCUDOS ROJOS VISUALES
    const lists = document.querySelectorAll('.current-tracklist, .tracklist');
    lists.forEach(list => {
        const parent = list.parentElement;
        parent.style.position = 'relative';

        const sLeft = document.createElement('div');
        sLeft.className = 'v-shield-left';
        sLeft.style.cssText = 'position:absolute; top:40px; left:0; height:calc(100% - 40px); width:60px; background:rgba(255,0,0,0.4); z-index:9999; touch-action:pan-y; border-right: 2px dashed red; pointer-events:none;';
        parent.appendChild(sLeft);

        const sRight = document.createElement('div');
        sRight.className = 'v-shield-right';
        sRight.style.cssText = 'position:absolute; top:40px; right:0; height:calc(100% - 40px); width:15px; background:rgba(255,0,0,0.4); z-index:9999; touch-action:pan-y; border-left: 2px dashed red; pointer-events:none;';
        parent.appendChild(sRight);
    });

    // 4. CREAMOS EL PANEL DE CONTROL
    const panel = document.createElement('div');
    panel.id = 'v-calibrator';
    panel.style.cssText = 'position:fixed;bottom:10px;left:50%;transform:translateX(-50%);background:#121212;border:2px solid #1DB954;padding:15px;z-index:999999;color:#fff;border-radius:10px;width:90%;max-width:400px;text-align:center;font-family:monospace; box-sizing:border-box; box-shadow: 0 10px 30px rgba(0,0,0,0.9);';
    panel.innerHTML = `
      <b style="color:#1DB954">CALIBRADOR DE ESCUDOS (PX)</b><br><br>
      Izquierda: <span id="val-l">60</span>px<br>
      <input type="range" id="rng-l" min="0" max="150" value="60" style="width:100%;margin-bottom:10px;"><br>
      Derecha: <span id="val-r">15</span>px<br>
      <input type="range" id="rng-r" min="0" max="80" value="15" style="width:100%;">
      <br><button id="btn-cerrar-escudos" style="margin-top:15px; padding:6px 15px; background:#333; color:#fff; border:1px solid #555; border-radius:5px; cursor:pointer;">Cerrar y Restaurar CSS</button>
    `;
    document.body.appendChild(panel);

    // 5. LÓGICA DE DESLIZADORES
    document.getElementById('rng-l').oninput = e => {
        document.getElementById('val-l').innerText = e.target.value;
        document.querySelectorAll('.v-shield-left').forEach(s => s.style.width = e.target.value + 'px');
    };
    document.getElementById('rng-r').oninput = e => {
        document.getElementById('val-r').innerText = e.target.value;
        document.querySelectorAll('.v-shield-right').forEach(s => s.style.width = e.target.value + 'px');
    };

    // 6. CERRAR Y RESTAURAR
    document.getElementById('btn-cerrar-escudos').onclick = () => {
        // Al cerrar, eliminamos el panel, los escudos rojos y el estilo que bloqueaba tu CSS original.
        document.querySelectorAll('.v-shield-left, .v-shield-right, #v-calibrator, #v-override-css').forEach(e => e.remove());
        console.log("[Calibrador] Cerrado. CSS original restaurado.");
    };
};

// --- 2. COMANDO PARA CALIBRAR BOTONES SVG ---
window.CalibrarBotones = function() {
    console.log("[Calibrador] Iniciando UI de ajuste SVG...");
    const existing = document.getElementById('v-btn-calibrator');
    if (existing) existing.remove();

    const panel = document.createElement('div');
    panel.id = 'v-btn-calibrator';
    panel.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);background:#121212;border:2px solid #1DB954;padding:15px;z-index:999999;color:#fff;border-radius:10px;width:90%;max-width:400px;text-align:center;font-family:monospace; box-shadow: 0 10px 30px rgba(0,0,0,0.9);';
    panel.innerHTML = `
      <b style="color:#1DB954">CALIBRADOR SVG VLOITZ</b><br><br>
      Prev (-5s): <span id="v-prev">0</span>px<br>
      <input type="range" id="r-prev" min="-5" max="5" step="0.5" value="0" style="width:100%; margin-bottom:15px;"><br>
      Next (+5s): <span id="v-next">0</span>px<br>
      <input type="range" id="r-next" min="-5" max="5" step="0.5" value="0" style="width:100%;">
      <br><button id="btn-cerrar-botones" style="margin-top:15px; padding:6px 15px; background:#333; color:#fff; border:1px solid #555; border-radius:5px; cursor:pointer;">Cerrar Calibrador</button>
    `;
    document.body.appendChild(panel);

    const prevSvg = document.getElementById('seekBackBtn')?.querySelector('svg');
    const nextSvg = document.getElementById('seekFwdBtn')?.querySelector('svg');

    document.getElementById('r-prev').oninput = (e) => {
        const val = e.target.value;
        document.getElementById('v-prev').innerText = val;
        if (prevSvg) prevSvg.style.transform = `translateX(${val}px)`;
    };
    document.getElementById('r-next').oninput = (e) => {
        const val = e.target.value;
        document.getElementById('v-next').innerText = val;
        if (nextSvg) nextSvg.style.transform = `translateX(${val}px)`;
    };

    document.getElementById('btn-cerrar-botones').onclick = () => {
        document.getElementById('v-btn-calibrator').remove();
        console.log("[Calibrador] Cerrado.");
    };
};