/* ============================================================
   SPIDEY TRACKER — ui/history.js
   Monthly calendar + daily record viewer (read-only for past days)
   ============================================================ */
(function (S) {
  'use strict';

  var history = S.views.history = S.views.history || {};

  var viewYear = null;
  var viewMonth = null;      /* 0-11 */
  var selected = null;       /* YYYY-MM-DD or null */

  function ensureInit() {
    var now = new Date();
    if (viewYear == null) { viewYear = now.getFullYear(); viewMonth = now.getMonth(); }
  }

  var SYMBOL = { none: '○', part: '◐', full: '●' };

  function dayRecordHtml(key) {
    var settings = S.store.getSettings();
    var raw = S.store.state.days[key];
    var future = S.keyToDate(key) > new Date(new Date().setHours(23, 59, 59, 999));

    if (!raw) {
      return '<div class="record">' + S.ui.emptyState({
        mood: 'sad',
        cls: future ? '' : '',
        title: future ? 'MISSION NOT LOGGED YET' : 'YOUR JOURNEY STARTS HERE',
        text: future
          ? 'This day hasn’t happened yet — come back and track it when it does.'
          : 'No record for this day. Complete missions on the home screen and every day fills up here.'
      }) + '</div>';
    }

    var day = S.missions.normalizeDay(raw, key);
    var c = S.missions.completion(day, settings, null);
    var views = S.missions.views(day, settings, null);

    var rows = S.missions.MAIN_IDS.map(function (id) {
      var v = views[id];
      var cls = v.done ? 'yes' : (v.pct > 0 ? 'part' : 'no');
      var mark = v.done ? '✓' : (v.pct > 0 ? '◐' : '✗');
      return '<div class="rec-item ' + cls + '"><span>' + S.esc(v.name) + '</span>' +
        '<span class="rv">' + mark + ' ' + S.esc(v.done ? 'DONE' : v.label) + '</span></div>';
    }).join('');

    var acts = S.store.activityForDate(key);
    var actHtml = '';
    if (acts.length) {
      actHtml = '<div class="panel-block" style="margin-top:14px"><h3>// LOG FOR THIS DAY</h3>' +
        acts.slice(0, 40).map(function (a) {
          return '<div class="log-row" style="grid-template-columns:64px 110px minmax(0,1fr)">' +
            '<span class="log-time">' + S.timeLabel(a.ts) + '</span>' +
            '<span class="log-cat c-' + a.cat.toLowerCase() + '">' + S.esc(a.title) + '</span>' +
            '<span class="log-txt">' + S.esc(a.text) + '</span></div>';
        }).join('') + '</div>';
    }

    return '' +
      '<div class="record">' +
        '<div class="record-head">' +
          '<div>' +
            '<div class="record-title">' + S.esc(S.formatDow(key)) + ' // ' + S.esc(S.formatLong(key)) + '</div>' +
            '<div class="page-sub">DAILY COMPLETION — ' + c.done + ' / ' + c.total + ' MISSIONS</div>' +
          '</div>' +
          '<div class="record-pct">' + c.pct + '%</div>' +
        '</div>' +
        '<div class="rec-grid">' + rows + '</div>' +
        (key === S.todayKey()
          ? '<div class="btn-row" style="margin-top:12px"><a class="btn blue block" href="#/home">EDIT TODAY ▸</a></div>'
          : '<p class="data-note" style="margin-top:12px">HISTORICAL RECORD — VIEW ONLY. PAST DAYS ARE KEPT EXACTLY AS THEY WERE TRACKED.</p>') +
        actHtml +
      '</div>';
  }

  history.render = function (root) {
    ensureInit();

    var first = new Date(viewYear, viewMonth, 1);
    var daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    var startDow = (first.getDay() + 6) % 7;   /* Monday-first */
    var settings = S.store.getSettings();
    var todayKey = S.todayKey();

    var cells = '';
    ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].forEach(function (d) {
      cells += '<div class="cal-dow">' + d + '</div>';
    });
    for (var i = 0; i < startDow; i++) cells += '<div class="cal-day empty" aria-hidden="true"></div>';

    for (var d = 1; d <= daysInMonth; d++) {
      var key = S.dateKey(new Date(viewYear, viewMonth, d));
      var raw = S.store.state.days[key];
      var st = 'none';
      if (raw) st = S.missions.dayState(S.missions.normalizeDay(raw, key), settings, null);
      var isToday = key === todayKey;
      var sel = key === selected;
      cells += '<button type="button" class="cal-day s-' + st + (isToday ? ' today' : '') +
        (raw ? ' has-data' : '') + '" data-act="pick" data-key="' + key + '" ' +
        'aria-label="' + S.esc(S.formatLong(key)) + ', ' + st + ' completion"' +
        (sel ? ' style="outline:2px solid var(--red);outline-offset:-4px"' : '') + '>' +
        '<span>' + d + '</span>' +
        '<span class="dot-state" aria-hidden="true">' + SYMBOL[st] + '</span>' +
      '</button>';
    }

    var trackedCount = S.store.dayKeys().length;

    root.innerHTML =
      '<div class="page-head">' +
        '<div>' +
          '<h1 class="page-title">HISTORY <span>CAL</span></h1>' +
          '<div class="page-sub">PAST MISSION RECORDS // NEVER OVERWRITTEN</div>' +
        '</div>' +
        '<div class="tag blue">' + trackedCount + ' DAYS TRACKED</div>' +
      '</div>' +

      '<div class="cal">' +
        '<div class="cal-head">' +
          '<div class="cal-title">' + S.MONTHS[viewMonth] + ' ' + viewYear + '</div>' +
          '<div class="cal-nav">' +
            '<button type="button" data-act="prev" aria-label="Previous month">◀</button>' +
            '<button type="button" data-act="today" aria-label="Go to current month" style="width:auto;padding:0 12px;font-size:9px">TODAY</button>' +
            '<button type="button" data-act="next" aria-label="Next month">▶</button>' +
          '</div>' +
        '</div>' +
        '<div class="cal-grid">' + cells + '</div>' +
        '<div class="cal-legend">' +
          '<span><b>○</b> NO ACTIVITY</span>' +
          '<span><b>◐</b> PARTIAL COMPLETION</span>' +
          '<span><b>●</b> FULL COMPLETION</span>' +
          '<span><b>▣</b> TODAY</span>' +
        '</div>' +
      '</div>' +

      (trackedCount === 0
        ? '<div class="record">' + S.ui.emptyState({
            mood: 'sad',
            title: 'YOUR JOURNEY STARTS HERE',
            text: 'Track today’s missions and this calendar will start filling up with your progress.',
            action: { act: 'goHome', label: 'START TODAY' }
          }) + '</div>'
        : (selected ? dayRecordHtml(selected) : ''));

    S.ui.bind(root, {
      prev: function () {
        viewMonth--;
        if (viewMonth < 0) { viewMonth = 11; viewYear--; }
        S.sound.play('nav');
        S.app.render();
      },
      next: function () {
        viewMonth++;
        if (viewMonth > 11) { viewMonth = 0; viewYear++; }
        S.sound.play('nav');
        S.app.render();
      },
      today: function () {
        var now = new Date();
        viewYear = now.getFullYear(); viewMonth = now.getMonth();
        selected = S.todayKey();
        S.sound.play('nav');
        S.app.render();
      },
      pick: function (el) {
        selected = el.getAttribute('data-key');
        S.sound.play('open');
        S.app.render();
      },
      goHome: function () { location.hash = '#/home'; }
    });
  };

  history.reset = function () { selected = null; };

})(window.S);
