/* ============================================================
   SPIDEY TRACKER — ui/app.js
   Bootstrap, hash router, global event wiring, live paint loop
   ============================================================ */
(function (S) {
  'use strict';

  var app = S.app = S.app || {};

  var ROUTES = {
    home: 'home',
    log: 'log',
    stats: 'stats',
    history: 'history',
    settings: 'settings'
  };

  var current = 'home';
  var booted = false;

  /* ----------------------------------------------------------
     routing
     ---------------------------------------------------------- */
  function routeFromHash() {
    var h = (location.hash || '').replace(/^#\/?/, '').split('?')[0];
    return ROUTES[h] ? h : 'home';
  }

  app.go = function (name) {
    location.hash = '#/' + (ROUTES[name] ? name : 'home');
  };

  /* ----------------------------------------------------------
     render
     ---------------------------------------------------------- */
  app.render = function () {
    var viewEl = document.getElementById('view');
    if (!viewEl) return;
    current = routeFromHash();

    var view = S.views[current] || S.views.home;
    try {
      view.render(viewEl);
    } catch (e) {
      console.error('[spidey] render failed', current, e);
      viewEl.innerHTML = S.ui.emptyState({
        cls: 'err-state',
        mood: 'sad',
        title: 'SYSTEM ERROR',
        text: 'This screen failed to load. Your data is safe — try again or head home.'
      });
    }

    /* nav highlight */
    var navNodes = document.querySelectorAll('[data-nav]');
    for (var i = 0; i < navNodes.length; i++) {
      var isActive = navNodes[i].getAttribute('data-nav') === current;
      navNodes[i].classList.toggle('is-active', isActive);
      if (isActive) navNodes[i].setAttribute('aria-current', 'page');
      else navNodes[i].removeAttribute('aria-current');
    }

    updateHeader();
  };

  /* ----------------------------------------------------------
     header
     ---------------------------------------------------------- */
  function updateHeader() {
    var dow = document.getElementById('topbar-dow');
    var date = document.getElementById('topbar-date');
    if (dow) dow.textContent = S.formatDow(S.todayKey());
    if (date) date.textContent = S.formatLong(S.todayKey());

    var mascotHost = document.getElementById('topbar-mascot');
    if (mascotHost && S.store.getSettings().display.mascot) {
      var day = S.store.getDay(S.todayKey()) || S.missions.blankDay(S.todayKey());
      var c = S.missions.completion(day, S.store.getSettings(), S.timers.liveSeconds());
      var mood = S.mascot.moodFor(c, !!S.timers.active());
      if (mascotHost.getAttribute('data-mood') !== mood) {
        mascotHost.innerHTML = S.mascot.svg(mood, 36);
        mascotHost.setAttribute('data-mood', mood);
      }
    } else if (mascotHost) {
      mascotHost.innerHTML = '';
      mascotHost.setAttribute('data-mood', 'off');
    }

    var soundBtn = document.getElementById('quick-sound');
    if (soundBtn) {
      var uiOn = S.store.getSettings().sound.ui;
      soundBtn.textContent = uiOn ? '♪' : '✕';
      soundBtn.classList.toggle('is-off', !uiOn);
      soundBtn.setAttribute('aria-label', uiOn ? 'Mute UI sounds' : 'Enable UI sounds');
      soundBtn.setAttribute('title', uiOn ? 'Mute UI sounds' : 'Enable UI sounds');
    }
  }
  app.updateHeader = updateHeader;

  /* ----------------------------------------------------------
     display prefs -> body classes
     ---------------------------------------------------------- */
  app.applyDisplay = function () {
    var d = S.store.getSettings().display;
    document.body.classList.toggle('no-anim', !d.animations);
    document.body.classList.toggle('no-crt', !d.crt);
    document.body.classList.toggle('no-scanlines', !d.scanlines);
    updateHeader();
  };

  /* ----------------------------------------------------------
     live paint loop (timers)
     ---------------------------------------------------------- */
  function paintLive() {
    if (!booted) return;
    if (current === 'home' && S.views.home.paintLive) S.views.home.paintLive();
    if (S.modal.isOpen()) S.modal.paintLive();
  }

  /* ----------------------------------------------------------
     global events
     ---------------------------------------------------------- */
  var renderQueued = false;
  function queueRender() {
    if (!booted || renderQueued) return;
    renderQueued = true;
    setTimeout(function () {
      renderQueued = false;
      app.render();
    }, 60);
  }

  function wire() {
    /* nav sounds */
    window.addEventListener('hashchange', function () {
      S.sound.play('nav');
      app.render();
      var viewEl = document.getElementById('view');
      if (viewEl) viewEl.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: S.reducedMotion() ? 'auto' : 'smooth' });
    });

    /* header sound toggle */
    var quick = document.getElementById('quick-sound');
    if (quick) {
      quick.addEventListener('click', function () {
        S.sound.unlock();
        var cur = S.store.getSettings().sound.ui;
        S.store.updateSettings('sound', { ui: !cur });
        if (!cur) { S.sound.syncFromSettings(); S.sound.play('toggle'); }
        updateHeader();
        S.ui.toast({
          title: cur ? 'UI SOUND OFF' : 'UI SOUND ON',
          text: cur ? 'SILENT MODE' : 'BEEPS ENABLED',
          life: 1600
        });
      });
    }

    /* data events */
    S.on('data:change', queueRender);
    S.on('activity:change', function () { if (current === 'log') queueRender(); else updateHeader(); });
    S.on('settings:change', function () { app.applyDisplay(); S.sound.syncFromSettings(); });
    S.on('timer:tick', paintLive);
    S.on('timer:change', function () { queueRender(); paintLive(); });

    S.on('mission:complete', function (payload) {
      var def = payload && S.missions.get(payload.id);
      var name = def ? def.name : 'MISSION';
      S.ui.screenGlitch();
      S.ui.toast({
        kind: 'ok',
        icon: '★',
        title: 'MISSION COMPLETE!',
        text: name + ' — ' + (payload && payload.label ? payload.label : 'DONE')
      });
      var day = S.store.getDay(S.todayKey());
      if (day) {
        var c = S.missions.completion(day, S.store.getSettings(), null);
        if (c.allDone) {
          setTimeout(function () {
            S.sound.play('fanfare');
            S.ui.toast({ kind: 'ok', icon: '♛', title: 'TODAY COMPLETE!', text: 'ALL 10 MISSIONS CLEARED', life: 5200 });
          }, 700);
        }
      }
      if (S.modal.isOpen()) S.modal.replayCelebration();
      queueRender();
    });

    /* day rollover safety: re-render when the calendar date flips */
    var lastDay = S.todayKey();
    setInterval(function () {
      var now = S.todayKey();
      if (now !== lastDay) {
        lastDay = now;
        S.timers.flush();
        app.render();
        S.ui.toast({ title: 'NEW DAY', text: 'FRESH MISSION BOARD', life: 3000 });
      } else {
        updateHeader();
      }
    }, 30000);

    /* close modal on resize to desktop? (kept open — sheet works everywhere) */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && S.modal.isOpen()) S.modal.close();
    });
  }

  /* ----------------------------------------------------------
     boot
     ---------------------------------------------------------- */
  app.init = function () {
    S.store.load();
    S.timers.load();
    app.applyDisplay();
    S.sound.syncFromSettings();
    wire();

    if (!location.hash) location.hash = '#/home';

    var startApp = function () {
      booted = true;
      var appEl = document.getElementById('app');
      if (appEl) appEl.hidden = false;
      app.render();

      /* first visit welcome */
      if (S.store.isFresh()) {
        S.store.log({ cat: 'SYSTEM', title: 'SYSTEM', text: 'ONLINE — WELCOME, AGENT' });
        setTimeout(function () {
          S.ui.toast({ icon: '🕷', title: 'WELCOME!', text: 'TAP A MISSION TO START TRACKING', life: 4200 });
        }, 400);
      } else {
        var day = S.store.getDay(S.todayKey());
        if (!day) {
          setTimeout(function () {
            S.ui.toast({ icon: '★', title: 'READY FOR TODAY?', text: 'YOUR MISSION BOARD IS FRESH', life: 3600 });
          }, 400);
        }
      }

      /* restore a running timer after reload */
      var act = S.timers.active();
      if (act) {
        setTimeout(function () {
          S.ui.toast({
            icon: '▶', title: 'TIMER RESTORED',
            text: act.key.toUpperCase() + ' TIMER IS STILL RUNNING', life: 3600
          });
        }, 900);
      }
    };

    S.boot.run(startApp);
  };

  /* DOM ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', app.init);
  } else {
    app.init();
  }

})(window.S);
