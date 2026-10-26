// AegisWasm Sentinel v3.1 - Patrón Universal
(function() {
    'use strict';
    var target = document.currentScript.getAttribute('data-target');
    if (!target) return;

    function execute() {
        if (window.Aegis && window.Aegis.ready) {
            window.Aegis.ready.then(function() {
                window.Aegis.executeTargetPayload(target);
            });
        } else {
            window.addEventListener('aegis-ready', function() {
                window.Aegis.executeTargetPayload(target);
            }, { once: true });
        }
    }
    execute();
})();