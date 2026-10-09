/* ============================================================
   SPIDEY TRACKER — core/util.js
   Namespace + generic helpers (dates, formatting, misc)
   ============================================================ */
window.S = window.S || {};

(function (S) {
  'use strict';

  /* ---------------- namespace roots ---------------- */
  S.missions = S.missions || {};
  S.store = S.store || {};
  S.timers = S.timers || {};
  S.sound = S.sound || {};
  S.stats = S.stats || {};
  S.ui = S.ui || {};
  S.views = S.views || {};

  /* ---------------- misc ---------------- */
  S.clamp = function (n, min, max) { return Math.min(max, Math.max(min, n)); };

  S.round = function (n, places) {
    var p = Math.pow(10, places || 0);
    return Math.round(n * p) / p;
  };

  S.pad2 = function (n) { return (n < 10 ? '0' : '') + n; };

  S.uid = function () {
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  };

  S.esc = function (str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  S.debounce = function (fn, ms) {
    var t = null;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, ms || 120);
    };
  };

  S.reducedMotion = function () {
    var pref = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var forced = S.store.getSettings ? !S.store.getSettings().display.animations : false;
    return !!pref || forced;
  };

  /* ---------------- dates (local time, YYYY-MM-DD) ---------------- */
  S.dateKey = function (d) {
    var date = d instanceof Date ? d : new Date();
    return date.getFullYear() + '-' + S.pad2(date.getMonth() + 1) + '-' + S.pad2(date.getDate());
  };

  S.todayKey = function () { return S.dateKey(new Date()); };

  S.keyToDate = function (key) {
    var parts = String(key).split('-');
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  };

  S.DOW = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  S.DOW_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  S.MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

  S.formatDow = function (key) { return S.DOW[S.keyToDate(key).getDay()]; };

  S.formatLong = function (key) {
    var d = S.keyToDate(key);
    return S.pad2(d.getDate()) + ' ' + S.MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  };

  S.formatShort = function (key) {
    var d = S.keyToDate(key);
    return S.pad2(d.getDate()) + ' ' + S.MONTHS[d.getMonth()].slice(0, 3);
  };

  S.timeLabel = function (ts) {
    var d = new Date(ts);
    return S.pad2(d.getHours()) + ':' + S.pad2(d.getMinutes());
  };

  /* ---------------- formatting ---------------- */
  /* seconds -> MM:SS or HH:MM:SS */
  S.fmtClock = function (totalSec) {
    var sec = Math.max(0, Math.floor(totalSec));
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    var s = sec % 60;
    if (h > 0) return h + ':' + S.pad2(m) + ':' + S.pad2(s);
    return S.pad2(m) + ':' + S.pad2(s);
  };

  /* minutes -> compact label */
  S.fmtMinutes = function (min) {
    var m = Math.max(0, Math.round(min));
    if (m < 60) return m + ' MIN';
    var h = Math.floor(m / 60);
    var r = m % 60;
    return r ? h + 'H ' + r + 'M' : h + 'H';
  };

  S.fmtKm = function (km) { return S.round(Math.max(0, km), 1).toFixed(1); };

  S.plural = function (n, word) { return n + ' ' + word + (n === 1 ? '' : 'S'); };

  /* ---------------- file helpers ---------------- */
  S.downloadJSON = function (obj, filename) {
    var text = JSON.stringify(obj, null, 2);
    var blob = new Blob([text], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename || 'spidey-tracker-data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  };

  S.readJSONFile = function (file, cb) {
    var reader = new FileReader();
    reader.onload = function () {
      var parsed = null, err = null;
      try {
        parsed = JSON.parse(String(reader.result));
      } catch (e) {
        err = 'INVALID JSON';
      }
      cb(err, parsed);
    };
    reader.onerror = function () { cb('COULD NOT READ FILE', null); };
    reader.readAsText(file);
  };

  /* ---------------- tiny event bus ---------------- */
  var listeners = {};
  S.on = function (evt, fn) {
    (listeners[evt] = listeners[evt] || []).push(fn);
    return function () { S.off(evt, fn); };
  };
  S.off = function (evt, fn) {
    if (!listeners[evt]) return;
    listeners[evt] = listeners[evt].filter(function (f) { return f !== fn; });
  };
  S.emit = function (evt, payload) {
    (listeners[evt] || []).slice().forEach(function (fn) {
      try { fn(payload); } catch (e) { console.error('[spidey] listener error', evt, e); }
    });
  };

})(window.S);
