/* ============================================================
   SPIDEY TRACKER — core/missions.js
   Mission definitions + pure completion logic (single source of truth)
   ============================================================ */
(function (S) {
  'use strict';

  var M = S.missions;

  /* ----------------------------------------------------------
     MISSION CATALOG
     kind: count | check | timer | distance | dancing | meals | water
     category: used by the activity-log filters
     ---------------------------------------------------------- */
  M.LIST = [
    {
      id: 'korean', name: 'KOREAN', icon: '한', category: 'LANGUAGE',
      kind: 'count', goalKey: 'korean', unit: 'CHAPTER',
      blurb: 'READ 1 CHAPTER A DAY', step: 1, max: 99
    },
    {
      id: 'singing', name: 'SINGING', icon: '♪', category: 'PERFORMANCE',
      kind: 'timer', goalKey: 'singingMin', unit: 'MINUTES',
      blurb: 'SING FOR 60 MINUTES'
    },
    {
      id: 'dancing', name: 'DANCING', icon: '♬', category: 'PERFORMANCE',
      kind: 'dancing', goalKey: 'dancingMin', unit: 'MINUTES',
      blurb: '60 MIN OR 1 SONG'
    },
    {
      id: 'study', name: 'STUDY', icon: '✎', category: 'STUDY',
      kind: 'count', goalKey: 'study', unit: 'SESSIONS',
      blurb: 'FINISH 1 STUDY SESSION'
    },
    {
      id: 'running', name: 'RUNNING', icon: '»', category: 'FITNESS',
      kind: 'distance', goalKey: 'runningKm', unit: 'KM',
      blurb: 'RUN 1 KM'
    },
    {
      id: 'fitness', name: 'FITNESS', icon: '✚', category: 'FITNESS',
      kind: 'timer', goalKey: 'fitnessMin', unit: 'MINUTES',
      blurb: 'TRAIN FOR 60 MINUTES'
    },
    {
      id: 'mask', name: 'FACE MASK', icon: '☺', category: 'HEALTH',
      kind: 'check', goalKey: null, unit: 'TIME',
      blurb: 'ONE MASK PER DAY'
    },
    {
      id: 'supplement', name: 'SUPPLEMENT', icon: '◆', category: 'HEALTH',
      kind: 'check', goalKey: null, unit: 'TIME',
      blurb: 'TAKE YOUR SUPPLEMENT'
    },
    {
      id: 'meals', name: 'MEALS', icon: '♨', category: 'HEALTH',
      kind: 'meals', goalKey: null, unit: 'MEALS',
      blurb: 'BREAKFAST + LUNCH + DINNER'
    },
    {
      id: 'water', name: 'WATER', icon: '≈', category: 'HEALTH',
      kind: 'water', goalKey: 'water', unit: 'BOTTLES',
      blurb: 'DRINK 3 LARGE BOTTLES'
    }
  ];

  M.TOTAL = M.LIST.length; /* = 10 primary daily missions */

  M.get = function (id) {
    for (var i = 0; i < M.LIST.length; i++) {
      if (M.LIST[i].id === id) return M.LIST[i];
    }
    return null;
  };

  M.MAIN_IDS = ['korean', 'singing', 'dancing', 'study', 'running', 'fitness', 'mask', 'supplement', 'meals', 'water'];

  /* ----------------------------------------------------------
     DEFAULT DAY SHAPE
     ---------------------------------------------------------- */
  M.blankDay = function (key) {
    return {
      date: key,
      korean: { count: 0 },
      study: { count: 0 },
      dancing: { song: false },
      running: { km: 0 },
      seconds: { singing: 0, dancing: 0, fitness: 0 },
      health: {
        mask: false,
        supplement: false,
        meals: { breakfast: false, lunch: false, dinner: false },
        water: 0
      },
      createdAt: Date.now()
    };
  };

  /* defensive normaliser for imported / older data */
  M.normalizeDay = function (raw, key) {
    var d = M.blankDay(key);
    if (!raw || typeof raw !== 'object') return d;
    d.korean.count = Number(raw.korean && raw.korean.count) || 0;
    d.study.count = Number(raw.study && raw.study.count) || 0;
    d.dancing.song = !!(raw.dancing && raw.dancing.song);
    d.running.km = Number(raw.running && raw.running.km) || 0;
    var sec = raw.seconds || raw.minutes; /* v0 used minutes */
    if (sec) {
      var scale = raw.seconds ? 1 : 60;
      d.seconds.singing = (Number(sec.singing) || 0) * scale;
      d.seconds.dancing = (Number(sec.dancing) || 0) * scale;
      d.seconds.fitness = (Number(sec.fitness) || 0) * scale;
    }
    var h = raw.health || {};
    d.health.mask = !!h.mask;
    d.health.supplement = !!h.supplement;
    var meals = h.meals || {};
    d.health.meals.breakfast = !!meals.breakfast;
    d.health.meals.lunch = !!meals.lunch;
    d.health.meals.dinner = !!meals.dinner;
    d.health.water = Number(h.water) || 0;
    if (raw.createdAt) d.createdAt = raw.createdAt;
    return d;
  };

  /* ----------------------------------------------------------
     COMPLETION — pure, derived from the day record
     `live` = seconds currently running on an active timer
     ---------------------------------------------------------- */
  M.mealsDone = function (day) {
    var m = day.health.meals;
    return !!(m.breakfast && m.lunch && m.dinner);
  };

  M.mealsCount = function (day) {
    var m = day.health.meals;
    return (m.breakfast ? 1 : 0) + (m.lunch ? 1 : 0) + (m.dinner ? 1 : 0);
  };

  /* timer missions share this helper */
  M.TIMER_IDS = ['singing', 'dancing', 'fitness'];

  /* returns { done, value, goal, pct, label, sub } for one mission */
  M.view = function (id, day, settings, live) {
    live = live || {};
    var g = settings.goals;
    var def = M.get(id);
    var out = { id: id, name: def.name, done: false, value: 0, goal: 1, pct: 0, label: '', sub: '' };

    switch (id) {
      case 'korean': {
        var goal = Math.max(1, g.korean);
        out.value = day.korean.count; out.goal = goal;
        out.done = out.value >= goal;
        out.label = out.value + ' / ' + goal;
        out.sub = out.done ? 'COMPLETE' : 'CHAPTER' + (goal > 1 ? 'S' : '');
        out.pct = Math.min(1, out.value / goal);
        break;
      }
      case 'study': {
        var sg = Math.max(1, g.study);
        out.value = day.study.count; out.goal = sg;
        out.done = out.value >= sg;
        out.label = out.value + ' / ' + sg;
        out.sub = out.done ? 'COMPLETE' : 'SESSION' + (sg > 1 ? 'S' : '');
        out.pct = Math.min(1, out.value / sg);
        break;
      }
      case 'singing':
      case 'fitness': {
        var secs = (day.seconds[id] || 0) + Math.round(live[id] || 0);
        var goalMin = (id === 'singing') ? g.singingMin : g.fitnessMin;
        out.goal = goalMin;
        out.value = Math.floor(secs / 60);
        out.done = secs >= goalMin * 60;
        out.label = out.value + ' / ' + out.goal;
        out.sub = out.done ? 'COMPLETE' : 'MINUTES';
        out.pct = Math.min(1, secs / (goalMin * 60));
        break;
      }
      case 'dancing': {
        var dSecs = (day.seconds.dancing || 0) + Math.round(live.dancing || 0);
        out.goal = g.dancingMin;
        out.value = Math.floor(dSecs / 60);
        out.done = day.dancing.song || dSecs >= g.dancingMin * 60;
        if (day.dancing.song) {
          out.label = '1 SONG';
          out.sub = 'COMPLETE';
          out.pct = 1;
        } else {
          out.label = out.value + ' / ' + out.goal;
          out.sub = 'MIN OR 1 SONG';
          out.pct = Math.min(1, dSecs / (g.dancingMin * 60));
        }
        break;
      }
      case 'running': {
        out.goal = g.runningKm;
        out.value = S.round(day.running.km, 1);
        out.done = day.running.km >= g.runningKm - 0.0001;
        out.label = S.fmtKm(day.running.km) + ' / ' + S.fmtKm(out.goal);
        out.sub = out.done ? 'COMPLETE' : 'KM';
        out.pct = Math.min(1, day.running.km / g.runningKm);
        break;
      }
      case 'mask':
      case 'supplement': {
        out.goal = 1;
        out.value = day.health[id] ? 1 : 0;
        out.done = day.health[id];
        out.label = out.done ? 'DONE' : 'PENDING';
        out.sub = out.done ? 'COMPLETE' : '1 TIME / DAY';
        out.pct = out.done ? 1 : 0;
        break;
      }
      case 'meals': {
        var c = M.mealsCount(day);
        out.goal = 3; out.value = c;
        out.done = c >= 3;
        out.label = c + ' / 3';
        out.sub = out.done ? 'MEALS COMPLETE' : 'MEALS';
        out.pct = c / 3;
        break;
      }
      case 'water': {
        var wg = Math.max(1, g.water);
        out.goal = wg; out.value = day.health.water;
        out.done = out.value >= wg;
        out.label = out.value + ' / ' + wg;
        out.sub = out.done ? 'COMPLETE' : 'BOTTLES';
        out.pct = Math.min(1, out.value / wg);
        break;
      }
    }
    return out;
  };

  /* all mission views for a day */
  M.views = function (day, settings, live) {
    var map = {};
    for (var i = 0; i < M.LIST.length; i++) {
      map[M.LIST[i].id] = M.view(M.LIST[i].id, day, settings, live);
    }
    return map;
  };

  /* headline completion: 10 primary missions */
  M.completion = function (day, settings, live) {
    var done = 0;
    for (var i = 0; i < M.MAIN_IDS.length; i++) {
      if (M.view(M.MAIN_IDS[i], day, settings, live).done) done++;
    }
    return {
      done: done,
      total: M.TOTAL,
      pct: Math.round((done / M.TOTAL) * 100),
      allDone: done >= M.TOTAL
    };
  };

  /* coarse calendar state: none / part / full */
  M.dayState = function (day, settings, live) {
    if (!day) return 'none';
    var c = M.completion(day, settings, live);
    if (c.done === 0) return 'none';
    if (c.done >= c.total) return 'full';
    return 'part';
  };

})(window.S);
