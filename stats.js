/* ============================================================
   SPIDEY TRACKER — core/stats.js
   Pure statistics: ranges + aggregates derived from day records
   ============================================================ */
(function (S) {
  'use strict';

  var st = S.stats;

  /* ----------------------------------------------------------
     ranges
     ---------------------------------------------------------- */
  function keysEndingToday(count) {
    var out = [];
    var now = new Date();
    for (var i = count - 1; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      out.push(S.dateKey(d));
    }
    return out;
  }

  st.ranges = function () {
    var now = new Date();
    var today = S.dateKey(now);

    /* WEEK — trailing 7 days including today */
    var week = { id: 'week', label: 'LAST 7 DAYS', keys: keysEndingToday(7) };

    /* MONTH — current calendar month, up to today */
    var monthKeys = [];
    var daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    for (var d = 1; d <= Math.min(daysInMonth, now.getDate()); d++) {
      monthKeys.push(S.dateKey(new Date(now.getFullYear(), now.getMonth(), d)));
    }
    var month = {
      id: 'month',
      label: S.MONTHS[now.getMonth()] + ' ' + now.getFullYear(),
      keys: monthKeys
    };

    /* ALL TIME — every day that holds a record */
    var all = { id: 'all', label: 'ALL TIME', keys: S.store.dayKeys() };
    if (all.keys.indexOf(today) === -1) all.keys.push(today);

    return { week: week, month: month, all: all };
  };

  /* ----------------------------------------------------------
     aggregation
     ---------------------------------------------------------- */
  var BLANK = function () {
    return {
      daysTracked: 0,
      avgPct: 0,
      fullDays: 0,
      partialDays: 0,
      singingMin: 0,
      dancingMin: 0,
      fitnessMin: 0,
      runningKm: 0,
      korean: 0,
      study: 0,
      water: 0,
      meals: 0,
      mask: 0,
      supplement: 0,
      totalDone: 0
    };
  };

  st.aggregate = function (keys, settings) {
    settings = settings || S.store.getSettings();
    var out = BLANK();
    var pctSum = 0;
    var tracked = 0;

    keys.forEach(function (key) {
      var day = S.store.state.days[key];
      if (!day) return;
      day = S.missions.normalizeDay(day, key);
      tracked++;

      var c = S.missions.completion(day, settings, null);
      pctSum += c.pct;
      out.totalDone += c.done;
      if (c.done >= c.total) out.fullDays++;
      else if (c.done > 0) out.partialDays++;

      out.singingMin += (day.seconds.singing || 0) / 60;
      out.dancingMin += (day.seconds.dancing || 0) / 60;
      out.fitnessMin += (day.seconds.fitness || 0) / 60;
      out.runningKm += day.running.km || 0;
      out.korean += day.korean.count || 0;
      out.study += day.study.count || 0;
      out.water += day.health.water || 0;
      out.meals += S.missions.mealsCount(day);
      if (day.health.mask) out.mask++;
      if (day.health.supplement) out.supplement++;
    });

    out.daysTracked = tracked;
    out.avgPct = tracked ? Math.round(pctSum / tracked) : 0;
    out.runningKm = S.round(out.runningKm, 1);
    out.singingMin = Math.round(out.singingMin);
    out.dancingMin = Math.round(out.dancingMin);
    out.fitnessMin = Math.round(out.fitnessMin);
    return out;
  };

  /* per-day series for bar charts */
  st.series = function (keys, settings) {
    settings = settings || S.store.getSettings();
    return keys.map(function (key) {
      var day = S.store.state.days[key] || null;
      var pct = 0, done = 0, total = S.missions.TOTAL;
      if (day) {
        var c = S.missions.completion(S.missions.normalizeDay(day, key), settings, null);
        pct = c.pct; done = c.done; total = c.total;
      }
      return { key: key, pct: pct, done: done, total: total, hasData: !!day };
    });
  };

  /* month-of-year grouping for the ALL TIME tab */
  st.byMonth = function (settings) {
    settings = settings || S.store.getSettings();
    var keys = S.store.dayKeys();
    var groups = [];
    var index = {};
    keys.forEach(function (key) {
      var k = key.slice(0, 7); /* YYYY-MM */
      if (!index[k]) {
        index[k] = { id: k, label: S.MONTHS[Number(k.slice(5, 7)) - 1].slice(0, 3) + ' ' + k.slice(2, 4), keys: [] };
        groups.push(index[k]);
      }
      index[k].keys.push(key);
    });
    return groups.map(function (g) {
      var agg = st.aggregate(g.keys, settings);
      return { label: g.label, pct: agg.avgPct, fullDays: agg.fullDays, days: agg.daysTracked };
    });
  };

  /* consecutive full-completion streak */
  st.currentStreak = function (settings) {
    settings = settings || S.store.getSettings();
    var keys = S.store.dayKeys().slice().reverse();
    var streak = 0;
    for (var i = 0; i < keys.length; i++) {
      var day = S.missions.normalizeDay(S.store.state.days[keys[i]], keys[i]);
      var c = S.missions.completion(day, settings, null);
      if (c.done >= c.total) streak++;
      else if (i === 0 && keys[i] === S.todayKey()) continue; /* today not finished yet */
      else break;
    }
    return streak;
  };

  /* headline cards for a range */
  st.cards = function (range, settings) {
    var agg = st.aggregate(range.keys, settings);
    return agg;
  };

})(window.S);
