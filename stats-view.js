/* ============================================================
   SPIDEY TRACKER — ui/stats-view.js
   Statistics page: WEEK / MONTH / ALL TIME
   ============================================================ */
(function (S) {
  'use strict';

  var sv = S.views.stats = S.views.stats || {};

  function heroCards(agg, range) {
    function card(lbl, val, sub, accent) {
      return '<div class="stat-card ' + (accent || '') + '">' +
        '<span class="sc-lbl">' + lbl + '</span>' +
        '<span class="sc-val">' + val + '</span>' +
        '<span class="sc-sub">' + sub + '</span></div>';
    }
    return '' +
      card('AVG COMPLETION', agg.avgPct + '%', 'OVER ' + agg.daysTracked + ' DAY' + (agg.daysTracked === 1 ? '' : 'S'), 'accent-green') +
      card('FULL DAYS', agg.fullDays, 'ALL MISSIONS CLEARED', 'accent-amber') +
      card('SINGING', S.fmtMinutes(agg.singingMin), 'TOTAL TIME', 'accent-red') +
      card('DANCING', S.fmtMinutes(agg.dancingMin), 'TOTAL TIME', 'accent-red') +
      card('FITNESS', S.fmtMinutes(agg.fitnessMin), 'TOTAL TIME', 'accent-red') +
      card('RUNNING', S.round(agg.runningKm, 1) + ' KM', 'TOTAL DISTANCE', 'accent-blue') +
      card('KOREAN', agg.korean, 'CHAPTER' + (agg.korean === 1 ? '' : 'S'), 'accent-blue') +
      card('STUDY', agg.study, 'SESSION' + (agg.study === 1 ? '' : 'S'), 'accent-blue') +
      card('WATER', agg.water, 'BOTTLES DRUNK', 'accent-blue') +
      card('MEALS', agg.meals, 'MEALS EATEN', 'accent-green') +
      card('MASK / SUPPLEMENT', agg.mask + ' / ' + agg.supplement, 'TIMES COMPLETED', 'accent-green') +
      card('STREAK', S.stats.currentStreak(), 'CONSECUTIVE FULL DAYS', 'accent-amber');
  }

  function chart(range) {
    var series = S.stats.series(range.keys);
    var isAll = range.id === 'all';
    var monthly = null;

    if (isAll) {
      var groups = S.stats.byMonth();
      if (groups.length > 1) monthly = groups;
    }

    var cols;
    if (monthly) {
      cols = monthly.map(function (g) {
        var cls = g.pct >= 100 ? 'full' : g.pct >= 40 ? 'part' : '';
        return '<div class="bar-col">' +
          '<span class="bar-val">' + g.pct + '%</span>' +
          '<div class="bar ' + cls + '" style="height:' + Math.max(4, g.pct) + '%" title="' + g.days + ' days"></div>' +
          '<span class="bar-lbl">' + S.esc(g.label) + '</span></div>';
      }).join('');
    } else {
      cols = series.map(function (p) {
        var cls = p.pct >= 100 ? 'full' : p.pct >= 40 ? 'part' : '';
        var day = S.keyToDate(p.key);
        var lbl = range.id === 'week' ? S.DOW_SHORT[day.getDay()] : String(day.getDate());
        return '<div class="bar-col">' +
          '<span class="bar-val">' + (p.hasData ? p.pct + '%' : '–') + '</span>' +
          '<div class="bar ' + cls + '" style="height:' + Math.max(3, p.pct) + '%"></div>' +
          '<span class="bar-lbl">' + lbl + '</span></div>';
      }).join('');
    }

    return '<div class="panel-block"><h3>// COMPLETION PER ' +
      (monthly ? 'MONTH' : range.id === 'week' ? 'DAY — LAST 7 DAYS' : 'DAY') + '</h3>' +
      '<div class="bars">' + cols + '</div></div>';
  }

  function missionMeters(range) {
    var settings = S.store.getSettings();
    var keys = range.keys;
    var rows = S.missions.MAIN_IDS.map(function (id) {
      var done = 0, tracked = 0;
      keys.forEach(function (k) {
        var raw = S.store.state.days[k];
        if (!raw) return;
        tracked++;
        var day = S.missions.normalizeDay(raw, k);
        if (S.missions.view(id, day, settings, null).done) done++;
      });
      var pct = tracked ? Math.round((done / tracked) * 100) : 0;
      var colorCls = id === 'water' || id === 'meals' || id === 'mask' || id === 'supplement' ? 'green'
        : id === 'korean' || id === 'study' ? 'blue'
        : id === 'running' || id === 'fitness' ? 'amber' : '';
      return '<div class="meter-row">' +
        '<span class="meter-name">' + S.esc(S.missions.get(id).name) + '</span>' +
        '<span class="meter-track"><span class="meter-fill ' + colorCls + '" style="width:' + pct + '%"></span></span>' +
        '<span class="meter-val">' + done + '/' + (tracked || 0) + '</span>' +
      '</div>';
    }).join('');

    return '<div class="panel-block"><h3>// MISSION CLEAR RATE (' + range.label + ')</h3>' +
      '<div class="meter">' + rows + '</div>' +
      '<p class="tiny muted" style="margin-top:12px">DAYS COMPLETED / DAYS TRACKED</p></div>';
  }

  sv.render = function (root) {
    var settings = S.store.getSettings();
    var ranges = S.stats.ranges();
    var tab = settings.ui.statsTab || 'week';
    if (!ranges[tab]) tab = 'week';
    var range = ranges[tab];
    var agg = S.stats.aggregate(range.keys, settings);
    var hasData = S.store.dayKeys().length > 0;

    var tabs = ['week', 'month', 'all'].map(function (t) {
      var label = t === 'week' ? 'WEEK' : t === 'month' ? 'MONTH' : 'ALL TIME';
      return '<button type="button" role="tab" data-act="tab" data-tab="' + t + '" ' +
        'aria-selected="' + (t === tab) + '">' + label + '</button>';
    }).join('');

    var body;
    if (!hasData) {
      body = S.ui.emptyState({
        mood: 'sad',
        title: 'NOT ENOUGH DATA YET',
        text: 'Track a few missions and your weekly, monthly and all-time statistics will appear here.',
        action: { act: 'goHome', label: 'START TRACKING' }
      });
    } else {
      body =
        '<div class="page-sub" style="margin-bottom:12px">PERIOD: ' + S.esc(range.label) +
          ' // ' + agg.daysTracked + ' DAY' + (agg.daysTracked === 1 ? '' : 'S') + ' WITH RECORDS</div>' +
        '<div class="stat-hero">' + heroCards(agg, range) + '</div>' +
        chart(range) +
        missionMeters(range) +
        '<div class="btn-row"><a class="btn blue" href="#/history">OPEN HISTORY CALENDAR ▸</a></div>';
    }

    root.innerHTML =
      '<div class="page-head">' +
        '<div>' +
          '<h1 class="page-title">STATIS<span>TICS</span></h1>' +
          '<div class="page-sub">WEEK // MONTH // ALL TIME</div>' +
        '</div>' +
      '</div>' +
      '<div class="tabs" role="tablist" aria-label="Statistics range">' + tabs + '</div>' +
      body;

    S.ui.bind(root, {
      tab: function (el) {
        S.store.updateSettings('ui', { statsTab: el.getAttribute('data-tab') || 'week' });
        S.sound.play('toggle');
        S.app.render();
      },
      goHome: function () { location.hash = '#/home'; }
    });
  };

})(window.S);
