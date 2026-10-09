/* ============================================================
   SPIDEY TRACKER — core/timers.js
   Timestamp-based timer engine (survives reload + navigation)
   ============================================================ */
(function (S) {
  'use strict';

  var T = S.timers;
  var ACTIVE_KEY = 'spidey_tracker_timer_v1';

  var active = null;          /* { key, startTs, committed } — at most one running */
  var lastSave = 0;
  var ticker = null;
  var TIDE_MS = 250;

  /* ----------------------------------------------------------
     persistence
     ---------------------------------------------------------- */
  function persist(force) {
    var now = Date.now();
    if (!force && now - lastSave < 1800) return;
    lastSave = now;
    try {
      if (active) window.localStorage.setItem(ACTIVE_KEY, JSON.stringify(active));
      else window.localStorage.removeItem(ACTIVE_KEY);
    } catch (e) { /* ignore */ }
  }

  T.load = function () {
    try {
      var raw = window.localStorage.getItem(ACTIVE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed.key === 'string' && typeof parsed.startTs === 'number') {
          active = { key: parsed.key, startTs: parsed.startTs, committed: Number(parsed.committed) || 0 };
        }
      }
    } catch (e) { active = null; }
    if (active) T.commitDelta(true); /* catch up after reload / closed tab */
    T.startTicker();
    return active;
  };

  /* ----------------------------------------------------------
     helpers
     ---------------------------------------------------------- */
  function goalSeconds(key) {
    var g = S.store.getSettings().goals;
    if (key === 'singing') return g.singingMin * 60;
    if (key === 'fitness') return g.fitnessMin * 60;
    if (key === 'dancing') return g.dancingMin * 60;
    return 0;
  }
  T.goalSeconds = goalSeconds;

  function sessionSeconds() {
    if (!active) return 0;
    return Math.max(0, (Date.now() - active.startTs) / 1000);
  }

  T.active = function () { return active; };

  T.isRunning = function (key) { return !!(active && active.key === key); };

  /* total seconds accrued today for a timer mission */
  T.elapsedSec = function (key) {
    var day = S.store.getDay(S.todayKey()) || S.missions.blankDay(S.todayKey());
    var base = day.seconds[key] || 0;
    if (active && active.key === key) base += Math.max(0, sessionSeconds() - active.committed);
    return base;
  };

  T.liveSeconds = function () {
    var out = {};
    ['singing', 'dancing', 'fitness'].forEach(function (k) { out[k] = 0; });
    if (active) out[active.key] = Math.max(0, sessionSeconds() - active.committed);
    return out;
  };

  /* ----------------------------------------------------------
     commit session time into today's record
     ---------------------------------------------------------- */
  T.commitDelta = function (silent) {
    if (!active) return;
    var total = sessionSeconds();
    var delta = total - active.committed;
    if (delta <= 0) return;
    var today = S.todayKey();
    var day = S.store.ensureDay(today);
    day.seconds[active.key] = (day.seconds[active.key] || 0) + delta;
    active.committed = total;
    S.store.save();
    persist(true);
    if (!silent) S.emit('timer:commit', { key: active.key });
  };

  /* ----------------------------------------------------------
     controls
     ---------------------------------------------------------- */
  T.start = function (key) {
    if (active && active.key === key) return false;
    if (active) T.pause(true);          /* only one live timer at a time */
    active = { key: key, startTs: Date.now(), committed: 0 };
    persist(true);
    S.sound.play('timer-start');
    S.store.log({ cat: def(key).category, title: def(key).name, text: 'TIMER STARTED' });
    S.emit('timer:change', { key: key, state: 'start' });
    return true;
  };

  T.pause = function (quiet) {
    if (!active) return null;
    var key = active.key;
    T.commitDelta(true);
    var secs = active.committed;
    active = null;
    persist(true);
    if (!quiet) {
      S.sound.play('click');
      if (secs >= 5) {
        S.store.log({
          cat: def(key).category, title: def(key).name,
          text: 'PAUSED — ' + S.fmtMinutes(Math.floor(secs / 60))
        });
      }
    }
    S.emit('timer:change', { key: key, state: 'pause' });
    return secs;
  };

  T.toggle = function (key) {
    if (T.isRunning(key)) T.pause();
    else T.start(key);
  };

  /* hard reset: wipes today's accumulated time for this timer */
  T.reset = function (key) {
    var wasRunning = T.isRunning(key);
    if (wasRunning) { active = null; persist(true); }
    S.store.mutateDay(S.todayKey(), function (day) {
      day.seconds[key] = 0;
      if (key === 'dancing') day.dancing.song = false;
    });
    S.sound.play('reset');
    S.store.log({ cat: def(key).category, title: def(key).name, text: 'TIMER RESET — 0 MINUTES' });
    S.emit('timer:change', { key: key, state: 'reset' });
  };

  function def(id) { return S.missions.get(id) || { name: id, category: 'SYSTEM' }; }

  /* ----------------------------------------------------------
     completion detection
     ---------------------------------------------------------- */
  function checkCompletion() {
    if (!active) return;
    var key = active.key;
    var secs = T.elapsedSec(key);
    if (secs < goalSeconds(key)) return;

    T.commitDelta(true);
    active = null;
    persist(true);

    var d = def(key);
    var minutes = Math.floor(goalSeconds(key) / 60);
    S.store.log({
      cat: d.category, title: d.name,
      text: minutes + ' MINUTES COMPLETE'
    });
    S.sound.play('complete');
    S.emit('mission:complete', { id: key, label: minutes + ' MINUTES' });
    S.emit('timer:change', { key: key, state: 'complete' });
  }

  /* ----------------------------------------------------------
     ticker
     ---------------------------------------------------------- */
  function tick() {
    if (!active) return;
    T.commitDelta();          /* throttled save */
    checkCompletion();
    S.emit('timer:tick', { key: active && active.key });
  }

  T.startTicker = function () {
    if (ticker) return;
    ticker = window.setInterval(tick, TIDE_MS);
  };

  T.stopTicker = function () {
    if (ticker) { window.clearInterval(ticker); ticker = null; }
  };

  /* commit everything when the tab goes away */
  T.flush = function () {
    T.commitDelta(true);
    persist(true);
  };

  window.addEventListener('beforeunload', T.flush);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') T.flush();
    else if (active) { /* resume cleanly */ }
  });

})(window.S);
