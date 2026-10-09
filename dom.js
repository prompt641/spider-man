/* ============================================================
   SPIDEY TRACKER — ui/dom.js
   DOM helpers: delegated actions, toasts (comic bubbles),
   confirm dialog, confetti, live-paint registry
   ============================================================ */
(function (S) {
  'use strict';

  var ui = S.ui;

  ui.qs = function (sel, root) { return (root || document).querySelector(sel); };
  ui.qsa = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ----------------------------------------------------------
     delegated click handlers:  <button data-act="name">

     Handlers are stored on the root element and replaced on each
     render; the listener itself is installed exactly once. This way
     every view (home, log, stats, settings…) can rebind safely.
     ---------------------------------------------------------- */
  ui.bind = function (root, handlers) {
    if (!root) return;
    root.__spideyHandlers = handlers || {};
    if (root.__spideyBound) return;
    root.__spideyBound = true;
    root.addEventListener('click', function (e) {
      var el = e.target && e.target.closest ? e.target.closest('[data-act]') : null;
      if (!el || !root.contains(el)) return;
      var act = el.getAttribute('data-act');
      if (!act) return;
      var handler = root.__spideyHandlers[act];
      if (typeof handler !== 'function') return;
      e.preventDefault();
      handler(el, e);
    });
  };

  /* keydown helper: Enter/Space on non-button roles */
  ui.bindKeys = function (root, handlers) {
    root.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var el = e.target.closest ? e.target.closest('[data-act-key]') : null;
      if (!el) return;
      var act = el.getAttribute('data-act-key');
      if (handlers[act]) { e.preventDefault(); handlers[act](el, e); }
    });
  };

  /* ----------------------------------------------------------
     TOASTS — comic bubbles
     ---------------------------------------------------------- */
  ui.toast = function (opts) {
    var root = document.getElementById('toast-root');
    if (!root) return;
    var o = typeof opts === 'string' ? { title: opts } : (opts || {});
    var kind = o.kind || 'info';
    var icon = o.icon || (kind === 'ok' ? '✔' : kind === 'err' ? '✖' : '!');

    while (root.children.length >= 3) root.removeChild(root.firstChild);

    var el = document.createElement('div');
    el.className = 'toast ' + (kind === 'ok' ? 'ok' : kind === 'err' ? 'err' : '');
    el.setAttribute('role', 'status');
    el.innerHTML =
      '<span class="t-ico" aria-hidden="true">' + icon + '</span>' +
      '<span class="t-txt"><b>' + S.esc(o.title || 'NOTICE') + '</b>' +
      (o.text ? '<span>' + S.esc(o.text) + '</span>' : '') + '</span>';
    root.appendChild(el);

    var life = o.life || (kind === 'err' ? 4200 : 3000);
    setTimeout(function () {
      el.classList.add('leaving');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 220);
    }, life);
    return el;
  };

  /* ----------------------------------------------------------
     CONFIRM DIALOG
     ---------------------------------------------------------- */
  ui.confirm = function (opts) {
    var o = opts || {};
    return new Promise(function (resolve) {
      var root = document.getElementById('modal-root');
      var prev = document.activeElement;

      var wrap = document.createElement('div');
      wrap.className = 'overlay';
      wrap.innerHTML =
        '<div class="sheet" role="alertdialog" aria-modal="true" aria-label="' + S.esc(o.title || 'Confirm') + '">' +
          '<div class="sheet-head">' +
            '<div class="sheet-title">' + S.esc(o.title || 'CONFIRM') +
              '<small>' + S.esc(o.subtitle || 'THIS ACTION NEEDS CONFIRMATION') + '</small>' +
            '</div>' +
            '<button type="button" class="sheet-close" data-act="cancel" aria-label="Close">X</button>' +
          '</div>' +
          '<div class="sheet-body">' +
            '<p class="data-note">' + (o.body || '') + '</p>' +
            (o.list ? '<div class="confirm-list">' + o.list + '</div>' : '') +
          '</div>' +
          '<div class="sheet-foot">' +
            '<button type="button" class="btn ghost" data-act="cancel">CANCEL</button>' +
            '<button type="button" class="btn ' + (o.danger ? 'primary' : 'blue') + '" data-act="ok">' +
              S.esc(o.confirmLabel || 'CONFIRM') +
            '</button>' +
          '</div>' +
        '</div>';

      root.appendChild(wrap);
      S.sound.play('open');

      function done(val) {
        document.removeEventListener('keydown', onKey, true);
        if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
        if (prev && prev.focus) prev.focus();
        S.sound.play(val ? 'click' : 'close');
        resolve(val);
      }
      function onKey(e) {
        if (e.key === 'Escape') { e.stopPropagation(); done(false); }
      }
      ui.bind(wrap, {
        cancel: function () { done(false); },
        ok: function () { done(true); }
      });
      wrap.addEventListener('click', function (e) { if (e.target === wrap) done(false); });
      document.addEventListener('keydown', onKey, true);

      var okBtn = wrap.querySelector('[data-act="ok"]');
      if (okBtn) okBtn.focus();
    });
  };

  /* prompt dialog with a single text/number field */
  ui.promptNumber = function (opts) {
    var o = opts || {};
    return new Promise(function (resolve) {
      var root = document.getElementById('modal-root');
      var prev = document.activeElement;
      var wrap = document.createElement('div');
      wrap.className = 'overlay';
      wrap.innerHTML =
        '<div class="sheet" role="dialog" aria-modal="true" aria-label="' + S.esc(o.title || 'Input') + '">' +
          '<div class="sheet-head">' +
            '<div class="sheet-title">' + S.esc(o.title || 'INPUT') + '<small>' + S.esc(o.hint || '') + '</small></div>' +
            '<button type="button" class="sheet-close" data-act="cancel" aria-label="Close">X</button>' +
          '</div>' +
          '<div class="sheet-body">' +
            '<div class="field"><label for="prompt-input">' + S.esc(o.label || 'VALUE') + '</label>' +
            '<input class="input num" id="prompt-input" type="number" inputmode="decimal" min="0" step="' +
              (o.step || 0.1) + '" value="' + (o.value != null ? o.value : 0) + '" /></div>' +
          '</div>' +
          '<div class="sheet-foot">' +
            '<button type="button" class="btn ghost" data-act="cancel">CANCEL</button>' +
            '<button type="button" class="btn blue" data-act="ok">SAVE</button>' +
          '</div>' +
        '</div>';
      root.appendChild(wrap);
      S.sound.play('open');
      var input = wrap.querySelector('#prompt-input');

      function done(val) {
        document.removeEventListener('keydown', onKey, true);
        if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
        if (prev && prev.focus) prev.focus();
        resolve(val);
      }
      function onKey(e) {
        if (e.key === 'Escape') { e.stopPropagation(); done(null); }
        if (e.key === 'Enter' && document.activeElement === input) { e.preventDefault(); submit(); }
      }
      function submit() {
        var v = parseFloat(input.value);
        done(isFinite(v) ? v : null);
      }
      ui.bind(wrap, { cancel: function () { done(null); }, ok: submit });
      document.addEventListener('keydown', onKey, true);
      setTimeout(function () { input.focus(); input.select(); }, 40);
    });
  };

  /* ----------------------------------------------------------
     CONFETTI — pixel burst for mission completion
     ---------------------------------------------------------- */
  ui.confetti = function (host, count) {
    if (!host || S.reducedMotion()) return;
    var colors = ['#e5352b', '#2f6bf0', '#37d67a', '#ffb02e', '#ffffff'];
    for (var i = 0; i < (count || 14); i++) {
      (function (i) {
        var span = document.createElement('span');
        span.className = 'confetti';
        span.style.left = (10 + Math.random() * 80) + '%';
        span.style.background = colors[i % colors.length];
        span.style.animationDelay = (Math.random() * 0.35) + 's';
        span.style.animationDuration = (0.8 + Math.random() * 0.7) + 's';
        host.appendChild(span);
        setTimeout(function () { if (span.parentNode) span.parentNode.removeChild(span); }, 1900);
      })(i);
    }
  };

  /* small screen glitch on big events */
  ui.screenGlitch = function () {
    if (S.reducedMotion()) return;
    var app = document.getElementById('app');
    if (!app) return;
    app.classList.remove('screen-glitch');
    void app.offsetWidth;
    app.classList.add('screen-glitch');
    setTimeout(function () { app.classList.remove('screen-glitch'); }, 260);
  };

  /* ----------------------------------------------------------
     shared render helpers
     ---------------------------------------------------------- */
  ui.pctBar = function (pct, cls) {
    var blocks = 10;
    var on = Math.round(pct * blocks);
    var html = '<div class="blockbar ' + (cls || '') + '" role="progressbar" aria-valuenow="' +
      Math.round(pct * 100) + '" aria-valuemin="0" aria-valuemax="100">';
    for (var i = 0; i < blocks; i++) html += '<i class="' + (i < on ? 'on' : '') + '"></i>';
    return html + '</div>';
  };

  ui.meterPct = function (pct) { return Math.round(S.clamp(pct, 0, 1) * 100); };

  /* standard empty state */
  ui.emptyState = function (opts) {
    var o = opts || {};
    return '' +
      '<div class="empty ' + (o.cls || '') + '">' +
        '<div class="e-mascot">' + S.mascot.svg(o.mood || 'idle', 96) + '</div>' +
        '<h3>' + S.esc(o.title || 'NOTHING HERE YET') + '</h3>' +
        '<p>' + S.esc(o.text || '') + '</p>' +
        (o.action ? '<button type="button" class="btn blue" data-act="' + o.action.act + '">' +
          S.esc(o.action.label) + '</button>' : '') +
      '</div>';
  };

})(window.S);
