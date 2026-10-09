/* ============================================================
   SPIDEY TRACKER — ui/home.js
   Command center: progress hero, mission cards, health tracker
   ============================================================ */
(function (S) {
  'use strict';

  var home = S.views.home = S.views.home || {};
  var CARD_IDS = ['korean', 'singing', 'dancing', 'study', 'running', 'fitness'];
  var HEALTH_IDS = ['mask', 'supplement', 'meals', 'water'];

  function dayNow() { return S.store.getDay(S.todayKey()) || S.missions.blankDay(S.todayKey()); }

  function ctx() {
    var settings = S.store.getSettings();
    var day = dayNow();
    var live = S.timers.liveSeconds();
    return {
      settings: settings,
      day: day,
      views: S.missions.views(day, settings, live),
      completion: S.missions.completion(day, settings, live)
    };
  }

  /* ----------------------------------------------------------
     hero: today's progress + mascot
     ---------------------------------------------------------- */
  function heroHtml(c, day) {
    var timerRunning = !!S.timers.active();
    var mood = S.mascot.moodFor(c, timerRunning);
    var caption = S.mascot.captionFor(c, timerRunning);
    var blocks = '';
    for (var i = 0; i < c.total; i++) blocks += '<i class="' + (i < c.done ? 'on' : '') + '"></i>';

    var msg = c.allDone ? 'ALL MISSIONS CLEARED — <b>SPIDER SENSE TINGLING</b>'
      : c.done === 0 ? 'NO MISSIONS CLEARED YET — <b>START ONE NOW</b>'
      : (c.total - c.done) + ' MISSION' + (c.total - c.done > 1 ? 'S' : '') + ' LEFT — <b>KEEP SWINGING</b>';

    return '' +
      '<section class="status-card" aria-label="Today progress">' +
        '<div class="status-main">' +
          '<div class="status-kicker">TODAY’S PROGRESS</div>' +
          '<div class="pct-row">' +
            '<div class="pct' + (c.allDone ? ' is-full' : '') + '" id="home-pct" data-live-pct>' + c.pct + '%</div>' +
            '<div class="pct-meta"><b id="home-done">' + c.done + ' / ' + c.total + '</b> MISSIONS<br/>' +
              '<span class="muted">' + S.esc(S.formatDow(S.todayKey())) + ' // ' + S.esc(S.formatShort(S.todayKey())) + '</span></div>' +
          '</div>' +
          '<div class="blockbar" id="home-blocks" role="progressbar" aria-valuenow="' + c.pct +
            '" aria-valuemin="0" aria-valuemax="100">' + blocks + '</div>' +
          '<div class="status-msg" id="home-msg">' + msg + '</div>' +
        '</div>' +
        '<div class="status-mascot">' +
          '<div class="mascot-here" id="home-mascot">' +
            (S.store.getSettings().display.mascot ? S.mascot.svg(mood, 104) : '') +
            (mood === 'celebrate' ? '<div class="mascot-sparkle"><span></span><span></span><span></span></div>' : '') +
          '</div>' +
          '<div class="mascot-caption" id="home-caption">' + S.esc(caption) + '</div>' +
        '</div>' +
      '</section>';
  }

  /* ----------------------------------------------------------
     mission card
     ---------------------------------------------------------- */
  function cardHtml(id, v) {
    var def = S.missions.get(id);
    var running = S.timers.isRunning(id);
    return '' +
      '<button type="button" class="mission-card ' + (v.done ? 'done' : '') + '" data-act="open" data-id="' + id + '" ' +
        'aria-label="' + S.esc(def.name) + ' mission, ' + (v.done ? 'complete' : v.label) + '">' +
        '<div class="mc-top">' +
          '<span class="mc-ico" aria-hidden="true">' + def.icon + '</span>' +
          '<span class="mc-id"><span class="mc-name">' + S.esc(def.name) + '</span>' +
            '<span class="mc-cat">' + S.esc(def.category) + '</span></span>' +
          '<span class="mc-state">' + (v.done
            ? '<span class="done-stamp">✔ DONE</span>'
            : running ? '<span class="tag amber">● LIVE</span>' : '') + '</span>' +
        '</div>' +
        '<div class="mc-value" data-mc-value="' + id + '">' + S.esc(v.label) +
          ' <small>' + S.esc(v.sub) + '</small></div>' +
        '<div class="mc-sub">' + S.esc(def.blurb) + '</div>' +
        '<div class="mc-bar' + (v.pct >= 1 ? '' : ' ') + '"><i data-mc-bar="' + id + '" style="width:' +
          Math.round(v.pct * 100) + '%"></i></div>' +
        '<div class="mc-foot"><span class="mc-open">TAP FOR CONTROLS ▸</span>' +
          '<span class="tag ' + (v.done ? 'green' : 'blue') + '">' + Math.round(v.pct * 100) + '%</span></div>' +
      '</button>';
  }

  /* ----------------------------------------------------------
     health tracker
     ---------------------------------------------------------- */
  function healthCellHtml(id, v, views) {
    var def = S.missions.get(id);
    var head = '<h4><span>' + def.icon + ' ' + S.esc(def.name) + '</span>' +
      '<span class="hv">' + S.esc(v.label) + '</span></h4>';

    if (id === 'mask' || id === 'supplement') {
      var on = v.done;
      return '<div class="health-cell" data-health="' + id + '">' + head +
        '<button type="button" class="check-tile" data-act="health-toggle" data-id="' + id + '" ' +
          'aria-pressed="' + on + '">' +
          '<span class="check-box">' + (on ? '✔' : '') + '</span>' +
          '<span class="check-txt">' + (on ? 'COMPLETE' : 'MARK DONE') + '</span>' +
        '</button></div>';
    }

    if (id === 'meals') {
      var meals = [['breakfast', '🍳'], ['lunch', '🍱'], ['dinner', '🍽']];
      var cells = '';
      meals.forEach(function (m) {
        var st = dayNow().health.meals[m[0]];
        cells += '<button type="button" class="meal-btn" data-act="meal" data-meal="' + m[0] + '" ' +
          'aria-pressed="' + st + '" aria-label="Toggle ' + m[0] + '"><span>' + (st ? '✔' : m[1]) + '</span>' +
          '<span>' + m[0].toUpperCase() + '</span></button>';
      });
      return '<div class="health-cell" data-health="meals">' + head +
        '<div class="meal-row">' + cells + '</div>' +
        '<p class="tiny" style="color:' + (v.done ? 'var(--green)' : 'var(--ink-3)') + '">' +
          (v.done ? 'MEALS COMPLETE' : v.label + ' MEALS') + '</p></div>';
    }

    /* water */
    var n = dayNow().health.water;
    var cups = '';
    for (var i = 0; i < v.goal; i++) {
      cups += '<button type="button" class="water-cup ' + (i < n ? 'filled' : '') + '" data-act="water-set" ' +
        'data-n="' + (i + 1) + '" aria-pressed="' + (i < n) + '" aria-label="Set water to ' + (i + 1) + '">' +
        '💧</button>';
    }
    return '<div class="health-cell" data-health="water">' + head +
      '<div class="water-row"><div class="water-cups">' + cups + '</div>' +
      '<div style="display:flex;gap:8px;margin-left:auto">' +
        '<button type="button" class="btn sm" data-act="water-dec" aria-label="Remove bottle">−</button>' +
        '<button type="button" class="btn sm blue" data-act="water-inc" aria-label="Add bottle">+1</button>' +
      '</div></div>' +
      '<p class="tiny" style="color:' + (v.done ? 'var(--green)' : 'var(--ink-3)') + '">' +
        (v.done ? 'TARGET MET — ' + n + ' / ' + v.goal : n + ' / ' + v.goal + ' BOTTLES') + '</p></div>';
  }

  /* ----------------------------------------------------------
     sidebar quick stats (desktop)
     ---------------------------------------------------------- */
  function sidebarHtml(c, day) {
    var trained = Math.floor(((day.seconds.singing || 0) + (day.seconds.dancing || 0) + (day.seconds.fitness || 0)) / 60);
    var streak = S.stats.currentStreak();
    var latest = S.store.activity('ALL').slice(0, 5);

    var logHtml = '';
    if (!latest.length) {
      logHtml = '<p class="tiny muted">NO ACTIVITY YET — YOUR FIRST MISSION IS WAITING.</p>';
    } else {
      logHtml = latest.map(function (a) {
        return '<div class="log-row" style="grid-template-columns:56px minmax(0,1fr);padding:6px 0">' +
          '<span class="log-time">' + S.timeLabel(a.ts) + '</span>' +
          '<span class="log-txt"><span class="log-cat c-' + a.cat.toLowerCase() + '">' + S.esc(a.title) + '</span> ' +
          S.esc(a.text) + '</span></div>';
      }).join('');
    }

    return '' +
      '<div class="side-stats">' +
        '<div class="stat-card accent-red">' +
          '<span class="sc-lbl">MISSIONS DONE</span>' +
          '<span class="sc-val">' + c.done + ' / ' + c.total + '</span>' +
          '<span class="sc-sub">' + c.pct + '% COMPLETE</span>' +
        '</div>' +
        '<div class="stat-card accent-blue">' +
          '<span class="sc-lbl">FULL-DAY STREAK</span>' +
          '<span class="sc-val">' + streak + '</span>' +
          '<span class="sc-sub">CONSECUTIVE 100% DAYS</span>' +
        '</div>' +
        '<div class="stat-card accent-green">' +
          '<span class="sc-lbl">TRAINED TODAY</span>' +
          '<span class="sc-val">' + trained + '<span style="font-size:11px"> MIN</span></span>' +
          '<span class="sc-sub">SINGING + DANCING + FITNESS</span>' +
        '</div>' +
        '<div class="panel-block" style="margin:0;box-shadow:none">' +
          '<h3>// LATEST ACTIVITY</h3>' + logHtml +
          '<a class="btn ghost sm block" href="#/log" style="margin-top:10px">OPEN FULL LOG ▸</a>' +
        '</div>' +
      '</div>';
  }

  /* ----------------------------------------------------------
     render
     ---------------------------------------------------------- */
  home.render = function (root) {
    var c1 = ctx();
    var completion = c1.completion;

    var html = '<div class="home">' +
      '<div class="home-top">' +
        heroHtml(completion, c1.day) +
        sidebarHtml(completion, c1.day) +
      '</div>' +

      '<div class="sec-label" style="margin-top:4px">DAILY MISSIONS // ' + completion.done + ' OF ' + completion.total + ' DONE</div>' +
      '<div class="mission-grid" id="mission-grid">' +
        CARD_IDS.map(function (id) { return cardHtml(id, c1.views[id]); }).join('') +
      '</div>' +

      '<section class="health-panel" style="margin-top:6px">' +
        '<div class="sec-label">HEALTH &amp; SELF-CARE</div>' +
        '<div class="health-grid">' +
          HEALTH_IDS.map(function (id) { return healthCellHtml(id, c1.views[id], c1.views); }).join('') +
        '</div>' +
      '</section>' +

      '<p class="tiny muted center" style="margin-top:14px">DATA IS SAVED IN THIS BROWSER ONLY — ' +
        '<a href="#/settings" style="color:var(--blue)">EXPORT IT</a> ANYTIME</p>' +
    '</div>';

    root.innerHTML = html;
    S.ui.bind(root, {
      open: function (el) {
        S.modal.open(el.getAttribute('data-id'), el);
      },
      'health-toggle': function (el) {
        var id = el.getAttribute('data-id');
        var now = !dayNow().health[id];
        S.store.mutateDay(S.todayKey(), function (d) { d.health[id] = now; });
        S.sound.play(now ? 'check' : 'uncheck');
        if (now) {
          var def = S.missions.get(id);
          S.store.log({ cat: 'HEALTH', title: def.name, text: 'COMPLETE' });
          missionDoneFeedback(id);
        }
      },
      meal: function (el) {
        var meal = el.getAttribute('data-meal');
        var now = !dayNow().health.meals[meal];
        S.store.mutateDay(S.todayKey(), function (d) { d.health.meals[meal] = now; });
        S.sound.play(now ? 'check' : 'uncheck');
        if (now) {
          S.store.log({
            cat: 'HEALTH', title: meal.toUpperCase(),
            text: 'MEAL COMPLETE — ' + S.missions.mealsCount(dayNow()) + ' / 3'
          });
          missionDoneFeedback('meals');
        }
      },
      'water-inc': function () { setWater(dayNow().health.water + 1); },
      'water-dec': function () { setWater(dayNow().health.water - 1); },
      'water-set': function (el) { setWater(Number(el.getAttribute('data-n')) || 0); }
    });
  };

  function setWater(val) {
    var goal = S.store.getSettings().goals.water;
    var next = S.clamp(Math.round(val), 0, goal);
    var before = dayNow().health.water;
    if (next === before) { S.sound.play('error'); return; }
    S.store.mutateDay(S.todayKey(), function (d) { d.health.water = next; });
    S.sound.play('water');
    S.store.log({ cat: 'HEALTH', title: 'WATER', text: 'BOTTLE ' + next + ' / ' + goal });
    missionDoneFeedback('water');
  }

  /* generic completion celebration for health missions */
  var doneMark = {};
  function missionDoneFeedback(id) {
    var settings = S.store.getSettings();
    var v = S.missions.view(id, dayNow(), settings, null);
    var key = S.todayKey() + ':' + id;
    if (v.done && !doneMark[key]) {
      doneMark[key] = true;
      S.sound.play('complete');
      var d = S.missions.get(id);
      S.store.log({ cat: d.category, title: d.name, text: 'MISSION COMPLETE' });
      S.emit('mission:complete', { id: id, label: 'MISSION COMPLETE' });
      var grid = document.getElementById('mission-grid');
      S.ui.confetti(grid, 10);
    } else if (!v.done) {
      delete doneMark[key];
    }
  }

  /* ----------------------------------------------------------
     live paint — timer ticks without re-rendering the page
     ---------------------------------------------------------- */
  home.paintLive = function () {
    var active = S.timers.active();
    if (!active) return;
    var id = active.key;
    var c = ctx();

    var valueEl = document.querySelector('[data-mc-value="' + id + '"]');
    var barEl = document.querySelector('[data-mc-bar="' + id + '"]');
    var v = c.views[id];
    if (valueEl && v) valueEl.innerHTML = S.esc(v.label) + ' <small>' + S.esc(v.sub) + '</small>';
    if (barEl && v) barEl.style.width = Math.round(v.pct * 100) + '%';

    var pctEl = document.querySelector('[data-live-pct]');
    if (pctEl) pctEl.textContent = c.completion.pct + '%';
    var doneEl = document.getElementById('home-done');
    if (doneEl) doneEl.textContent = c.completion.done + ' / ' + c.completion.total;
  };

})(window.S);
