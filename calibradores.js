// ==========================================================================
// 🛠️ VLOITZ DEV TOOLS & UI CALIBRATORS
// Archivo fantasma: Solo accesible vía Consola (F12)
// ==========================================================================

if (window.VLOITZ_DEV_MODE) {
    // --- Menú Secreto en la Consola ---
    console.groupCollapsed("%c🛠️ VLOITZ DEVTOOLS ACTIVADO (Solo Kevin)", "color: #00F3FF; font-weight: bold; background: #121212; padding: 4px 8px; border-radius: 4px;");
    console.log("Para usar las herramientas, copia, pega en esta consola y presiona Enter:");
    console.log("%c> Calibrador.escudos()", "color: #1DB954; font-family: monospace; font-size: 14px; font-weight: bold;");
    console.log("  Ajusta las zonas rojas de scroll para móviles.");
    console.log("%c> Calibrador.botones()", "color: #1DB954; font-family: monospace; font-size: 14px; font-weight: bold;");
    console.log("  Ajusta la precisión de los íconos Prev/Next (+/- 5s).");
    console.groupEnd();

    // --- El Motor de Calibración ---
    window.Calibrador = {

        // --- 1. Calibrador de Zonas de Scroll (Escudos) ---
        escudos: function() {
            console.log("[Calibrador] Iniciando UI de zonas de scroll...");
            document.querySelectorAll('.v-shield-left, .v-shield-right, #v-calibrator').forEach(e => e.remove());

            const lists = document.querySelectorAll('.current-tracklist, .tracklist');
            lists.forEach(list => {
                const parent = list.parentElement;
                parent.style.position = 'relative';

                const sLeft = document.createElement('div');
                sLeft.className = 'v-shield-left';
                sLeft.style.cssText = 'position:absolute; top:40px; left:0; height:calc(100% - 40px); width:60px; background:rgba(255,0,0,0.3); z-index:50; touch-action:pan-y; border-right: 2px dashed red;';
                parent.appendChild(sLeft);

                const sRight = document.createElement('div');
                sRight.className = 'v-shield-right';
                sRight.style.cssText = 'position:absolute; top:40px; right:0; height:calc(100% - 40px); width:15px; background:rgba(255,0,0,0.3); z-index:50; touch-action:pan-y; border-left: 2px dashed red;';
                parent.appendChild(sRight);
            });

            // El panel aparece SOLAMENTE cuando ejecutas el comando
            const panel = document.createElement('div');
            panel.id = 'v-calibrator';
            panel.style.cssText = 'position:fixed;bottom:10px;left:50%;transform:translateX(-50%);background:#121212;border:2px solid #1DB954;padding:15px;z-index:999999;color:#fff;border-radius:10px;width:90%;max-width:400px;text-align:center;font-family:monospace; box-sizing:border-box; box-shadow: 0 10px 30px rgba(0,0,0,0.9);';
            panel.innerHTML = `
              <b style="color:#1DB954">CALIBRADOR DE COLUMNAS (PX)</b><br><br>
              Izquierda (Tiempo/Foto): <span id="val-l">60</span>px<br>
              <input type="range" id="rng-l" min="20" max="150" value="60" style="width:100%;margin-bottom:10px;"><br>
              Derecha (Borde): <span id="val-r">15</span>px<br>
              <input type="range" id="rng-r" min="0" max="80" value="15" style="width:100%;">
              <br><button onclick="document.querySelectorAll('.v-shield-left, .v-shield-right, #v-calibrator').forEach(e=>e.remove())" style="margin-top:15px; padding:6px 15px; background:#333; color:#fff; border:1px solid #555; border-radius:5px; cursor:pointer;">Cerrar Calibrador</button>
            `;
            document.body.appendChild(panel);

            document.getElementById('rng-l').oninput = e => {
                document.getElementById('val-l').innerText = e.target.value;
                document.querySelectorAll('.v-shield-left').forEach(s => s.style.width = e.target.value + 'px');
            };
            document.getElementById('rng-r').oninput = e => {
                document.getElementById('val-r').innerText = e.target.value;
                document.querySelectorAll('.v-shield-right').forEach(s => s.style.width = e.target.value + 'px');
            };
        },

        // --- 2. Calibrador Micrométrico de Botones (SVG) ---
        botones: function() {
            console.log("[Calibrador] Iniciando UI de ajuste SVG...");
            const existing = document.getElementById('v-btn-calibrator');
            if (existing) existing.remove();

            const panel = document.createElement('div');
            panel.id = 'v-btn-calibrator';
            panel.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);background:#121212;border:2px solid #1DB954;padding:15px;z-index:999999;color:#fff;border-radius:10px;width:90%;max-width:400px;text-align:center;font-family:monospace; box-shadow: 0 10px 30px rgba(0,0,0,0.9);';
            panel.innerHTML = `
              <b style="color:#1DB954">CALIBRADOR SVG VLOITZ</b><br><br>
              Prev (-5s) (Izq/Der): <span id="v-prev">0</span>px<br>
              <input type="range" id="r-prev" min="-5" max="5" step="0.5" value="0" style="width:100%; margin-bottom:15px;"><br>
              Next (+5s) (Izq/Der): <span id="v-next">0</span>px<br>
              <input type="range" id="r-next" min="-5" max="5" step="0.5" value="0" style="width:100%;">
              <br><button onclick="document.getElementById('v-btn-calibrator').remove()" style="margin-top:15px; padding:6px 15px; background:#333; color:#fff; border:1px solid #555; border-radius:5px; cursor:pointer;">Cerrar Calibrador</button>
            `;
            document.body.appendChild(panel);

            const prevSvg = document.getElementById('seekBackBtn')?.querySelector('svg');
            const nextSvg = document.getElementById('seekFwdBtn')?.querySelector('svg');

            document.getElementById('r-prev').oninput = (e) => {
                const val = e.target.value;
                document.getElementById('v-prev').innerText = val;
                if(prevSvg) prevSvg.style.transform = `translateX(${val}px)`;
            };
            document.getElementById('r-next').oninput = (e) => {
                const val = e.target.value;
                document.getElementById('v-next').innerText = val;
                if(nextSvg) nextSvg.style.transform = `translateX(${val}px)`;
            };
        }
    };
}