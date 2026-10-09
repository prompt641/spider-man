/* ============================================================
   SPIDEY TRACKER — core/store.js
   Local-first persistence (localStorage), settings, activity log
   ============================================================ */
(function (S) {
  'use strict';

  var store = S.store;
  var KEY = 'spidey_tracker_v1';
  var MAX_ACTIVITY = 800;

  store.KEY = KEY;

  /* ----------------------------------------------------------
     DEFAULT STATE
     ---------------------------------------------------------- */
  function defaultSettings() {
    return {
      sound: {
        master: 70,
        ui: true,
        uiVolume: 70,
        ambient: false,
        ambientVolume: 30
      },
      display: {
        animations: true,
        crt: true,
        scanlines: true,
        mascot: true
      },
      goals: {
        korean: 1,
        singingMin: 60,
        dancingMin: 60,
        study: 1,
        runningKm: 1,
        fitnessMin: 60,
        water: 3
      },
      ui: {
        statsTab: 'week',
        logFilter: 'ALL'
      }
    };
  }

  function defaultState() {
    return {
      version: 1,
      createdAt: Date.now(),
      settings: defaultSettings(),
      days: {},
      activity: []
    };
  }

  var state = defaultState();
  store.state = state;

  /* ----------------------------------------------------------
     SANITISERS
     ---------------------------------------------------------- */
  function sanitizeSettings(raw) {
    var def = defaultSettings();
    if (!raw || typeof raw !== 'object') return def;
    ['sound', 'display', 'goals', 'ui'].forEach(function (group) {
      if (raw[group] && typeof raw[group] === 'object') {
        Object.keys(def[group]).forEach(function (k) {
          var v = raw[group][k];
          if (typeof def[group][k] === 'boolean') def[group][k] = !!v;
          else if (typeof def[group][k] === 'number') def[group][k] = (typeof v === 'number' && isFinite(v)) ? v : def[group][k];
          else if (typeof def[group][k] === 'string') def[group][k] = (typeof v === 'string') ? v : def[group][k];
        });
      }
    });
    /* clamp ranges */
    def.sound.master = S.clamp(def.sound.master, 0, 100);
    def.sound.uiVolume = S.clamp(def.sound.uiVolume, 0, 100);
    def.sound.ambientVolume = S.clamp(def.sound.ambientVolume, 0, 100);
    def.goals.korean = Math.max(1, Math.round(def.goals.korean));
    def.goals.study = Math.max(1, Math.round(def.goals.study));
    def.goals.singingMin = Math.max(5, Math.round(def.goals.singingMin));
    def.goals.dancingMin = Math.max(5, Math.round(def.goals.dancingMin));
    def.goals.fitnessMin = Math.max(5, Math.round(def.goals.fitnessMin));
    def.goals.runningKm = S.clamp(S.round(def.goals.runningKm, 1), 0.1, 100);
    def.goals.water = Math.max(1, Math.round(def.goals.water));
    return def;
  }

  function sanitizeActivity(list) {
    if (!Array.isArray(list)) return [];
    return list.filter(function (a) {
      return a && typeof a === 'object' && typeof a.ts === 'number' && typeof a.text === 'string';
    }).slice(0, MAX_ACTIVITY).map(function (a) {
      return {
        id: a.id || S.uid(),
        ts: a.ts,
        date: typeof a.date === 'string' ? a.date : S.dateKey(new Date(a.ts)),
        cat: typeof a.cat === 'string' ? a.cat : 'SYSTEM',
        title: typeof a.title === 'string' ? a.title : 'SYSTEM',
        text: a.text
      };
    });
  }

  function hydrate(raw) {
    var next = defaultState();
    if (!raw || typeof raw !== 'object') return next;
    next.version = 1;
    next.createdAt = typeof raw.createdAt === 'number' ? raw.createdAt : Date.now();
    next.settings = sanitizeSettings(raw.settings);
    next.activity = sanitizeActivity(raw.activity);
    if (raw.days && typeof raw.days === 'object') {
      Object.keys(raw.days).forEach(function (k) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(k)) {
          next.days[k] = S.missions.normalizeDay(raw.days[k], k);
        }
      });
    }
    return next;
  }

  /* ----------------------------------------------------------
     LOAD / SAVE
     ---------------------------------------------------------- */
  var storageOk = true;

  store.load = function () {
    var raw = null;
    try {
      var txt = window.localStorage.getItem(KEY);
      if (txt) raw = JSON.parse(txt);
    } catch (e) {
      console.warn('[spidey] storage read failed', e);
      storageOk = false;
    }
    state = hydrate(raw);
    store.state = state;
    return state;
  };

  store.save = function () {
    try {
      window.localStorage.setItem(KEY, JSON.stringify({
        version: 1,
        createdAt: state.createdAt,
        settings: state.settings,
        days: state.days,
        activity: state.activity
      }));
      storageOk = true;
    } catch (e) {
      storageOk = false;
      console.warn('[spidey] storage write failed', e);
    }
    return storageOk;
  };

  store.storageOk = function () { return storageOk; };

  /* ----------------------------------------------------------
     SETTINGS
     ---------------------------------------------------------- */
  store.getSettings = function () { return state.settings; };

  store.updateSettings = function (group, patch) {
    if (!state.settings[group]) return;
    Object.keys(patch).forEach(function (k) {
      state.settings[group][k] = patch[k];
    });
    state.settings = sanitizeSettings(state.settings);
    store.save();
    S.emit('settings:change', { group: group, patch: patch });
  };

  store.resetSettings = function () {
    state.settings = defaultSettings();
    store.save();
    S.emit('settings:change', { group: 'all' });
  };

  /* ----------------------------------------------------------
     DAYS
     ---------------------------------------------------------- */
  /* read-only lookup: never creates a record */
  store.getDay = function (key) {
    var d = state.days[key];
    return d ? S.missions.normalizeDay(d, key) : null;
  };

  /* read-write lookup: creates + persists on demand */
  store.ensureDay = function (key) {
    key = key || S.todayKey();
    if (!state.days[key]) {
      state.days[key] = S.missions.blankDay(key);
      store.save();
    }
    return state.days[key];
  };

  store.today = function () { return store.ensureDay(S.todayKey()); };

  store.mutateDay = function (key, fn) {
    var day = store.ensureDay(key);
    var result = fn(day);
    store.save();
    S.emit('data:change', { date: key });
    return result;
  };

  store.dayKeys = function () {
    return Object.keys(state.days).sort();
  };

  /* ----------------------------------------------------------
     ACTIVITY LOG
     ---------------------------------------------------------- */
  store.log = function (entry) {
    var ts = entry.ts || Date.now();
    var item = {
      id: S.uid(),
      ts: ts,
      date: entry.date || S.dateKey(new Date(ts)),
      cat: entry.cat || 'SYSTEM',
      title: entry.title || 'SYSTEM',
      text: entry.text || ''
    };
    state.activity.unshift(item);
    if (state.activity.length > MAX_ACTIVITY) state.activity.length = MAX_ACTIVITY;
    store.save();
    S.emit('activity:change', item);
    return item;
  };

  store.activity = function (filter) {
    var list = state.activity;
    if (filter && filter !== 'ALL') {
      list = list.filter(function (a) { return a.cat === filter; });
    }
    return list;
  };

  store.activityForDate = function (dateKey) {
    return state.activity.filter(function (a) { return a.date === dateKey; });
  };

  store.clearActivity = function () {
    state.activity = [];
    store.save();
    S.emit('activity:change', null);
  };

  /* ----------------------------------------------------------
     EXPORT / IMPORT / RESET
     ---------------------------------------------------------- */
  store.exportData = function () {
    return {
      app: 'spidey-tracker',
      version: 1,
      exportedAt: new Date().toISOString(),
      createdAt: state.createdAt,
      settings: state.settings,
      days: state.days,
      activity: state.activity
    };
  };

  /* structural validation — returns {ok, error, data} */
  store.validateImport = function (raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return { ok: false, error: 'NOT A SPIDEY TRACKER FILE' };
    }
    if (raw.app && raw.app !== 'spidey-tracker') {
      return { ok: false, error: 'WRONG APP PAYLOAD' };
    }
    if (!raw.days && !raw.activity && !raw.settings) {
      return { ok: false, error: 'NO DATA FOUND IN FILE' };
    }
    if (raw.days !== undefined && (typeof raw.days !== 'object' || Array.isArray(raw.days))) {
      return { ok: false, error: '"days" MUST BE AN OBJECT' };
    }
    if (raw.activity !== undefined && !Array.isArray(raw.activity)) {
      return { ok: false, error: '"activity" MUST BE AN ARRAY' };
    }
    var data = hydrate(raw);
    var dayCount = Object.keys(data.days).length;
    if (!dayCount && !data.activity.length) {
      return { ok: false, error: 'FILE CONTAINS NO USABLE RECORDS' };
    }
    return { ok: true, data: data, summary: { days: dayCount, activity: data.activity.length } };
  };

  store.applyImport = function (data, mode) {
    if (mode === 'merge') {
      Object.keys(data.days).forEach(function (k) {
        if (!state.days[k]) state.days[k] = data.days[k];
      });
      var have = {};
      state.activity.forEach(function (a) { have[a.id] = true; });
      data.activity.forEach(function (a) { if (!have[a.id]) state.activity.push(a); });
      state.activity.sort(function (a, b) { return b.ts - a.ts; });
      if (state.activity.length > MAX_ACTIVITY) state.activity.length = MAX_ACTIVITY;
      /* settings only fill missing keys */
      state.settings = sanitizeSettings(Object.assign({}, data.settings, state.settings));
    } else {
      state.days = data.days;
      state.activity = data.activity;
      state.settings = sanitizeSettings(data.settings || state.settings);
      state.createdAt = data.createdAt || state.createdAt;
    }
    store.save();
    S.emit('data:change', { date: S.todayKey() });
    S.emit('settings:change', { group: 'all' });
    S.emit('activity:change', null);
  };

  store.resetAll = function () {
    state = defaultState();
    store.state = state;
    store.save();
    S.emit('data:change', { date: S.todayKey() });
    S.emit('settings:change', { group: 'all' });
    S.emit('activity:change', null);
  };

  /* fresh-install flag (drives first-run boot copy) */
  store.isFresh = function () {
    return Object.keys(state.days).length === 0 && state.activity.length === 0;
  };

})(window.S);
