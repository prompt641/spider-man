/* ============================================================
   SPIDEY TRACKER — ui/boot.js
   Retro system boot sequence -> smooth hand-off to the app
   ============================================================ */
(function (S) {
  'use strict';

  var boot = S.boot = S.boot || {};

  var STEPS = [
    { pct: 14, line: 'SYSTEM INITIALIZING...', log: '<i>CORE</i> kernel loaded' },
    { pct: 32, line: 'LOADING DAILY MISSIONS...', log: '<b>OK</b> 10 daily missions registered' },
    { pct: 52, line: 'LOADING TRACKING SYSTEM...', log: '<b>OK</b> local storage mounted' },
    { pct: 70, line: 'RESTORING TIMER STATE...', log: '<b>OK</b> timer engine online' },
    { pct: 86, line: 'AUDIO SYSTEM READY', log: '<i>AUDIO</i> synth channels armed' },
    { pct: 100, line: 'SYSTEM ONLINE', log: '<b>OK</b> welcome back, agent' }
  ];

  var finished = false;
  var timers = [];
  var keySkipHandler = null;

  function clearAll() {
    timers.forEach(clearTimeout);
    timers = [];
    if (keySkipHandler) {
      document.removeEventListener('keydown', keySkipHandler);
      keySkipHandler = null;
    }
  }

  function finish(onDone) {
    if (finished) return;
    finished = true;
    clearAll();
    var bootEl = document.getElementById('boot');
    var lineEl = document.getElementById('boot-line');
    var fillEl = document.getElementById('boot-bar-fill');
    if (lineEl) lineEl.textContent = 'SYSTEM ONLINE';
    if (fillEl) fillEl.style.width = '100%';
    document.body.classList.remove('is-booting');
    if (bootEl) bootEl.classList.add('is-done');
    if (onDone) onDone();
    setTimeout(function () {
      if (bootEl && bootEl.parentNode) bootEl.parentNode.removeChild(bootEl);
    }, 600);
  }

  boot.run = function (onDone) {
    var bootEl = document.getElementById('boot');
    var lineEl = document.getElementById('boot-line');
    var fillEl = document.getElementById('boot-bar-fill');
    var logEl = document.getElementById('boot-log');
    var skipEl = document.getElementById('boot-skip');
    var mascotEl = document.getElementById('boot-mascot');

    if (mascotEl) mascotEl.innerHTML = S.mascot.svg('idle', 96);

    if (!bootEl) { finish(onDone); return; }

    /* skip: click / key — always allowed */
    function skip(e) {
      if (e) e.preventDefault();
      S.sound.unlock();
      finish(onDone);
    }
    if (skipEl) skipEl.addEventListener('click', skip);
    keySkipHandler = skip;
    document.addEventListener('keydown', keySkipHandler);

    /* reduced motion -> near-instant boot */
    var reduced = S.reducedMotion();
    var stepMs = reduced ? 60 : 480;

    STEPS.forEach(function (step, i) {
      var id = setTimeout(function () {
        if (finished) return;
        if (lineEl) lineEl.textContent = step.line;
        if (fillEl) fillEl.style.width = step.pct + '%';
        if (logEl) {
          var row = document.createElement('div');
          row.innerHTML = step.log;
          logEl.appendChild(row);
          logEl.scrollTop = logEl.scrollHeight;
        }
        if (i === 0) S.sound.play('boot');
        else if (i === STEPS.length - 1) S.sound.play('nav');
        else S.sound.play('type');

        if (step.pct >= 100) {
          timers.push(setTimeout(function () { finish(onDone); }, reduced ? 40 : 420));
        }
      }, stepMs * (i + 1));
      timers.push(id);
    });

    /* hard safety net */
    timers.push(setTimeout(function () { finish(onDone); }, stepMs * STEPS.length + 1800));
  };

})(window.S);
