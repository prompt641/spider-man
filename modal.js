/* ============================================================
   SPIDEY TRACKER — ui/modal.js
   Mission detail panel (centered on desktop, bottom sheet on
   mobile) with per-mission-type controls.
   ============================================================ */
(function (S) {
  'use strict';

  var modal = S.modal = S.modal || {};
  var currentId = null;
  var opener = null;
  var resetArmedAt = 0;
  var danceMode = 'timer';

  /* ----------------------------------------------------------
     state helpers
     ---------------------------------------------------------- */
  function dayNow() { return S.store.getDay(S.todayKey()) || S.missions.blankDay(S.todayKey()); }

  function viewsNow() {
    var settings = S.store.getSettings();
    return S.missions.views(dayNow(), settings, S.timers.liveSeconds());
  }

  function defOf(id) { return S.missions.get(id); }

  /* ----------------------------------------------------------
     control blocks
     ---------------------------------------------------------- */
  function progressBlock(v) {
    return '<div class="mc-bar' + (v.done ? '' : ' amber') + '"><i style="width:' +
      Math.round(v.pct * 100) + '%"></i></div>';
  }

  function countBlock(id, v, unitLabel) {
    var isKorean = id === 'korean';
    return '' +
      '<div class="timer-readout">' +
        '<div class="timer-time">' + v.value + '<span style="font-size:.5em"> / ' + v.goal + '</span></div>' +
        '<div class="timer-target">' + S.esc(unitLabel) + '</div>' +
      '</div>' +
      progressBlock(v) +
      '<div class="stepper">' +
        '<button type="button" class="btn" data-act="dec" aria-label="Decrease ' + S.esc(v.name) + '">−</button>' +
        '<button type="button" class="btn blue" data-act="inc">+1 ' + S.esc(isKorean ? 'CHAPTER' : 'SESSION') + '</button>' +
        '<button type="button" class="btn" data-act="inc" aria-label="Increase">+</button>' +
      '</div>' +
      '<div class="btn-row">' +
        (v.done
          ? '<button type="button" class="btn warn block" data-act="undo">CLEAR PROGRESS</button>'
          : '<button type="button" class="btn success block" data-act="complete">MARK COMPLETE</button>') +
      '</div>';
  }

  function timerBlock(id, v) {
    var running = S.timers.isRunning(id);
    var elapsed = S.timers.elapsedSec(id);
    var armed = (Date.now() - resetArmedAt) < 2600;
    return '' +
      '<div class="timer-readout">' +
        '<div class="timer-time ' + (running ? 'running' : '') + '" data-live-clock="' + id + '">' +
          S.fmtClock(elapsed) +
        '</div>' +
        '<div class="timer-target">TARGET ' + v.goal + ' MINUTES</div>' +
        '<div class="timer-hint">' + (v.done ? 'TARGET REACHED — MISSION COMPLETE'
          : running ? 'TIMER RUNNING — IT KEEPS COUNTING IF YOU LEAVE'
          : elapsed > 0 ? 'PAUSED — RESUME ANYTIME' : 'PRESS START WHEN YOU BEGIN') + '</div>' +
      '</div>' +
      progressBlock(v) +
      '<div class="timer-controls">' +
        (running
          ? '<button type="button" class="btn warn big" data-act="pause">❚❚ PAUSE</button>'
          : '<button type="button" class="btn success big" data-act="start">' +
              (elapsed > 0 ? '▶ RESUME' : '▶ START') + '</button>') +
        '<button type="button" class="btn ' + (armed ? 'primary' : 'danger') + ' big" data-act="reset">' +
          (armed ? 'CONFIRM RESET' : '↺ RESET') + '</button>' +
      '</div>' +
      (v.done ? '<div class="complete-banner">✔ MISSION COMPLETE — ' + S.esc(v.name) + ' ' + v.goal + ' MIN</div>' : '');
  }

  function dancingBlock(v) {
    var songDone = dayNow().dancing.song;
    var seg = '' +
      '<div class="seg" role="tablist" aria-label="Dancing completion method">' +
        '<button type="button" role="tab" class="' + (danceMode === 'timer' ? 'red' : '') +
          '" aria-selected="' + (danceMode === 'timer') + '" data-act="mode" data-mode="timer">TIMER</button>' +
        '<button type="button" role="tab" class="' + (danceMode === 'song' ? 'red' : '') +
          '" aria-selected="' + (danceMode === 'song') + '" data-act="mode" data-mode="song">1 SONG</button>' +
      '</div>';

    var songPanel =
      '<div class="timer-readout">' +
        '<div class="timer-time ' + (songDone ? 'running' : '') + '">' + (songDone ? 'DONE' : '1 SONG') + '</div>' +
        '<div class="timer-target">OPTION B — FINISH ONE SONG</div>' +
        '<div class="timer-hint">DANCE ONE SONG START TO FINISH</div>' +
      '</div>' +
      '<button type="button" class="btn ' + (songDone ? 'warn' : 'success') + ' big block" data-act="song">' +
        (songDone ? '✖ UNDO SONG' : '★ COMPLETE 1 SONG') + '</button>';

    return seg +
      '<p class="tiny muted" style="margin-top:4px">TARGET: 60 MIN <b style="color:var(--amber)">OR</b> 1 SONG</p>' +
      (danceMode === 'song' ? songPanel : timerBlock('dancing', v) +
        '<p class="tiny muted center">OR SWITCH TO “1 SONG” ABOVE</p>');
  }

  function distanceBlock(v) {
    var goal = v.goal;
    return '' +
      '<div class="timer-readout">' +
        '<div class="timer-time">' + S.fmtKm(dayNow().running.km) +
          '<span style="font-size:.42em"> / ' + S.fmtKm(goal) + ' KM</span></div>' +
        '<div class="timer-target">TARGET ' + S.fmtKm(goal) + ' KM</div>' +
        '<div class="timer-hint">MANUAL ENTRY — NO GPS NEEDED</div>' +
      '</div>' +
      progressBlock(v) +
      '<div class="stepper">' +
        '<button type="button" class="btn big" data-act="km-dec" aria-label="Minus 0.1 kilometre">−0.1</button>' +
        '<button type="button" class="btn blue big" data-act="km-input">SET KM</button>' +
        '<button type="button" class="btn big" data-act="km-inc" aria-label="Plus 0.1 kilometre">+0.1</button>' +
      '</div>' +
      (v.done
        ? '<button type="button" class="btn warn block" data-act="km-reset">CLEAR DISTANCE</button>'
        : '<button type="button" class="btn success block" data-act="km-full">MARK ' + S.fmtKm(goal) + ' KM DONE</button>');
  }

  function checkBlock(id) {
    var on = dayNow().health[id];
    return '' +
      '<button type="button" class="check-tile" style="min-height:96px" data-act="toggle" ' +
        'aria-pressed="' + on + '">' +
        '<span class="check-box" style="width:36px;height:36px;font-size:18px">' + (on ? '✔' : '') + '</span>' +
        '<span class="check-txt" style="font-size:12px">' + (on ? 'DONE FOR TODAY' : 'MARK AS DONE') + '</span>' +
      '</button>' +
      '<p class="tiny muted center">ONE PER DAY — TAP TO TOGGLE</p>';
  }

  function mealsBlock() {
    var meals = dayNow().health.meals;
    var list = [['breakfast', 'BREAKFAST'], ['lunch', 'LUNCH'], ['dinner', 'DINNER']];
    var html = '<div class="meal-row">';
    list.forEach(function (m) {
      html += '<button type="button" class="meal-btn" data-act="meal" data-meal="' + m[0] + '" ' +
        'aria-pressed="' + meals[m[0]] + '"><span>' + (meals[m[0]] ? '✔' : '○') + '</span><span>' + m[1] + '</span></button>';
    });
    html += '</div>';
    var c = S.missions.mealsCount(dayNow());
    html += '<p class="tiny center" style="color:' + (c >= 3 ? 'var(--green)' : 'var(--amber)') + '">' +
      (c >= 3 ? 'MEALS COMPLETE' : c + ' / 3 MEALS') + '</p>';
    return html;
  }

  function waterBlock(v) {
    var n = dayNow().health.water;
    var goal = v.goal;
    var cups = '';
    for (var i = 0; i < goal; i++) {
      cups += '<button type="button" class="water-cup ' + (i < n ? 'filled' : '') + '" data-act="water-set" ' +
        'data-n="' + (i + 1) + '" aria-label="Set water to ' + (i + 1) + ' bottles" ' +
        'aria-pressed="' + (i < n) + '">💧</button>';
    }
    return '' +
      '<div class="water-row" style="justify-content:center">' + cups + '</div>' +
      '<p class="tiny center" style="color:' + (v.done ? 'var(--green)' : 'var(--amber)') + '">' +
        n + ' / ' + goal + ' BOTTLES' + (v.done ? ' — TARGET MET' : '') + '</p>' +
      '<div class="stepper">' +
        '<button type="button" class="btn big" data-act="water-dec" aria-label="Remove a bottle">−</button>' +
        '<button type="button" class="btn blue big" data-act="water-inc">+1 BOTTLE</button>' +
        '<button type="button" class="btn big" data-act="water-fill">FILL ALL</button>' +
      '</div>' +
      '<p class="tiny muted center">TAP A BOTTLE OR USE THE BUTTONS — CAPPED AT TARGET</p>';
  }

  function bodyHtml(id) {
    var v = viewsNow()[id];
    switch (id) {
      case 'korean': return countBlock(id, v, 'CHAPTERS TODAY') + hintBlock(id);
      case 'study': return countBlock(id, v, 'SESSIONS TODAY') + hintBlock(id);
      case 'singing': return timerBlock(id, v) + hintBlock(id);
      case 'fitness': return timerBlock(id, v) + hintBlock(id);
      case 'dancing': return dancingBlock(v) + hintBlock(id);
      case 'running': return distanceBlock(v) + hintBlock(id);
      case 'mask':
      case 'supplement': return checkBlock(id) + hintBlock(id);
      case 'meals': return mealsBlock() + hintBlock(id);
      case 'water': return waterBlock(v) + hintBlock(id);
      default: return '';
    }
  }

  function hintBlock(id) {
    var d = defOf(id);
    return '<p class="data-note">' + S.esc(d.blurb) + ' — CATEGORY: ' + S.esc(d.category) + '</p>';
  }

  /* ----------------------------------------------------------
     render
     ---------------------------------------------------------- */
  function shellHtml(id) {
    var d = defOf(id);
    var v = viewsNow()[id];
    return '' +
      '<div class="overlay" data-act="backdrop">' +
        '<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">' +
          '<div class="sheet-head">' +
            '<span class="mc-ico" aria-hidden="true">' + d.icon + '</span>' +
            '<div class="sheet-title" id="sheet-title">' + S.esc(d.name) +
              '<small>' + S.esc(d.category) + ' MISSION // ' + (v.done ? 'COMPLETE' : 'IN PROGRESS') + '</small>' +
            '</div>' +
            '<button type="button" class="sheet-close" data-act="close" aria-label="Close mission detail">X</button>' +
          '</div>' +
          '<div class="sheet-body" id="sheet-body">' + bodyHtml(id) + '</div>' +
          '<div class="sheet-foot">' +
            '<button type="button" class="btn ghost" data-act="close">CLOSE</button>' +
            '<a class="btn blue" href="#/log" data-act="golog">VIEW LOG</a>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function render() {
    var root = document.getElementById('modal-root');
    if (!root || !currentId) return;
    root.innerHTML = shellHtml(currentId);
    bind(root);
    /* keep focus inside the dialog */
    var closeBtn = root.querySelector('.sheet-close');
    if (closeBtn && !root.contains(document.activeElement)) closeBtn.focus();
  }
  modal.render = render;

  /* live clock painting (no full re-render, keeps focus stable) */
  modal.paintLive = function () {
    if (!currentId) return;
    var nodes = document.querySelectorAll('[data-live-clock]');
    for (var i = 0; i < nodes.length; i++) {
      var key = nodes[i].getAttribute('data-live-clock');
      nodes[i].textContent = S.fmtClock(S.timers.elapsedSec(key));
      nodes[i].classList.toggle('running', S.timers.isRunning(key));
    }
  };

  /* ----------------------------------------------------------
     actions
     ---------------------------------------------------------- */
  function today(mutator) {
    S.store.mutateDay(S.todayKey(), mutator);
  }

  function bind(root) {
    S.ui.bind(root, {
      backdrop: function (el, e) { if (e.target === el) modal.close(); },
      close: function () { modal.close(); },
      golog: function () { modal.close(); },

      /* counters */
      inc: function () {
        var id = currentId;
        var step = 1;
        today(function (d) {
          if (id === 'korean') d.korean.count = Math.min(99, d.korean.count + step);
          if (id === 'study') d.study.count = Math.min(99, d.study.count + step);
        });
        S.sound.play('check');
        checkComplete(id);
        afterAction(id);
      },
      dec: function () {
        var id = currentId;
        today(function (d) {
          if (id === 'korean') d.korean.count = Math.max(0, d.korean.count - 1);
          if (id === 'study') d.study.count = Math.max(0, d.study.count - 1);
        });
        S.sound.play('uncheck');
        afterAction(id);
      },
      complete: function () {
        var id = currentId;
        today(function (d) {
          var g = S.store.getSettings().goals;
          if (id === 'korean') d.korean.count = Math.max(d.korean.count, g.korean);
          if (id === 'study') d.study.count = Math.max(d.study.count, g.study);
        });
        checkComplete(currentId);
        afterAction(id);
      },
      undo: function () {
        var id = currentId;
        today(function (d) {
          if (id === 'korean') d.korean.count = 0;
          if (id === 'study') d.study.count = 0;
        });
        S.sound.play('reset');
        afterAction(id);
      },

      /* timers */
      start: function () { S.timers.start(currentId); afterAction(currentId); },
      pause: function () { S.timers.pause(); afterAction(currentId); },
      reset: function () {
        if (Date.now() - resetArmedAt < 2600) {
          resetArmedAt = 0;
          S.timers.reset(currentId);
        } else {
          resetArmedAt = Date.now();
          S.sound.play('error');
          S.ui.toast({ title: 'TAP AGAIN', text: 'RESET CLEARS TODAY’S PROGRESS', kind: 'err', life: 2400 });
          render();
          return;
        }
        afterAction(currentId);
      },
      mode: function (el) {
        danceMode = el.getAttribute('data-mode') || 'timer';
        S.sound.play('toggle');
        render();
      },
      song: function () {
        var now = !dayNow().dancing.song;
        today(function (d) { d.dancing.song = now; });
        S.sound.play(now ? 'complete' : 'uncheck');
        if (now) {
          S.store.log({ cat: 'PERFORMANCE', title: 'DANCING', text: '1 SONG COMPLETE' });
          S.ui.toast({ title: 'MISSION COMPLETE!', text: 'DANCING — 1 SONG', kind: 'ok' });
          S.ui.confetti(document.getElementById('sheet-body'), 16);
        }
        afterAction('dancing');
      },

      /* running */
      'km-inc': function () { changeKm(0.1); },
      'km-dec': function () { changeKm(-0.1); },
      'km-full': function () {
        var goal = S.store.getSettings().goals.runningKm;
        today(function (d) { d.running.km = goal; });
        checkComplete('running');
        afterAction('running');
      },
      'km-reset': function () {
        today(function (d) { d.running.km = 0; });
        S.sound.play('reset');
        afterAction('running');
      },
      'km-input': function () {
        var cur = dayNow().running.km;
        S.ui.promptNumber({ title: 'RUNNING DISTANCE', label: 'KILOMETRES', value: cur, step: 0.1, hint: 'ENTER TOTAL FOR TODAY' })
          .then(function (val) {
            if (val == null) return;
            setKm(val);
          });
      },

      /* health */
      toggle: function () {
        var id = currentId;
        var now = !dayNow().health[id];
        today(function (d) { d.health[id] = now; });
        S.sound.play(now ? 'check' : 'uncheck');
        if (now) {
          var label = id === 'mask' ? 'FACE MASK' : 'SUPPLEMENT';
          S.store.log({ cat: 'HEALTH', title: label, text: 'COMPLETE' });
          checkComplete(id);
        }
        afterAction(id);
      },
      meal: function (el) {
        var meal = el.getAttribute('data-meal');
        var now = !dayNow().health.meals[meal];
        today(function (d) { d.health.meals[meal] = now; });
        S.sound.play(now ? 'check' : 'uncheck');
        if (now) {
          S.store.log({
            cat: 'HEALTH', title: meal.toUpperCase(),
            text: 'MEAL COMPLETE — ' + S.missions.mealsCount(dayNow()) + ' / 3'
          });
          checkComplete('meals');
        }
        afterAction('meals');
      },
      'water-inc': function () { setWater(dayNow().health.water + 1); },
      'water-dec': function () { setWater(dayNow().health.water - 1); },
      'water-fill': function () { setWater(S.store.getSettings().goals.water); },
      'water-set': function (el) { setWater(Number(el.getAttribute('data-n')) || 0); }
    });

    root.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.stopPropagation(); modal.close(); }
    });
  }

  function changeKm(delta) {
    setKm(dayNow().running.km + delta);
  }

  function setKm(val) {
    var goal = S.store.getSettings().goals.runningKm;
    var next = S.round(S.clamp(val, 0, Math.max(goal, val)), 1);
    var before = dayNow().running.km;
    today(function (d) { d.running.km = next; });
    if (next > before) S.sound.play('click');
    else S.sound.play('uncheck');
    if (Math.abs(next - goal) < 0.001 && before < goal - 0.001) checkComplete('running');
    S.store.log({
      cat: 'FITNESS', title: 'RUNNING',
      text: S.fmtKm(next) + ' / ' + S.fmtKm(goal) + ' KM'
    });
    afterAction('running');
  }

  function setWater(val) {
    var goal = S.store.getSettings().goals.water;
    var next = S.clamp(Math.round(val), 0, goal);   /* never overshoot the daily target */
    var before = dayNow().health.water;
    if (next === before) {
      if (next >= goal) S.ui.toast({ title: 'TARGET MET', text: goal + ' / ' + goal + ' BOTTLES', life: 1800 });
      S.sound.play('error');
      return;
    }
    today(function (d) { d.health.water = next; });
    S.sound.play('water');
    S.store.log({ cat: 'HEALTH', title: 'WATER', text: 'BOTTLE ' + next + ' / ' + goal });
    checkComplete('water');
    afterAction('water');
  }

  /* fire completion feedback when a mission crosses its goal */
  function checkComplete(id) {
    var v = viewsNow()[id];
    if (!v.done) return;
    if (checkComplete._last[id] === S.todayKey() + ':done') return;
    checkComplete._last[id] = S.todayKey() + ':done';
    var d = defOf(id);
    S.sound.play('complete');
    S.store.log({
      cat: d.category, title: d.name,
      text: completionText(id, v)
    });
    S.emit('mission:complete', { id: id, label: completionText(id, v) });
    S.ui.confetti(document.getElementById('sheet-body'), 14);
  }
  checkComplete._last = {};

  function completionText(id, v) {
    switch (id) {
      case 'korean': return v.goal + ' CHAPTER' + (v.goal > 1 ? 'S' : '') + ' COMPLETE';
      case 'study': return v.goal + ' SESSION' + (v.goal > 1 ? 'S' : '') + ' COMPLETE';
      case 'running': return S.fmtKm(v.goal) + ' KM COMPLETE';
      case 'meals': return 'ALL 3 MEALS COMPLETE';
      case 'water': return v.goal + ' / ' + v.goal + ' BOTTLES';
      case 'mask': return 'FACE MASK COMPLETE';
      case 'supplement': return 'SUPPLEMENT COMPLETE';
      default: return 'MISSION COMPLETE';
    }
  }

  function afterAction(id) {
    /* allow future completions of the same mission to log again */
    try {
      var cur = viewsNow()[id];
      if (cur && !cur.done) delete checkComplete._last[id];
    } catch (e) { /* ignore */ }
    /* re-render only the modal body so the rest of the page stays put */
    if (currentId) {
      var body = document.getElementById('sheet-body');
      if (body && currentId === id) {
        body.innerHTML = bodyHtml(id);
      } else if (body) {
        body.innerHTML = bodyHtml(currentId);
      }
      var small = document.querySelector('#sheet-title small');
      if (small) {
        var v = viewsNow()[currentId];
        small.textContent = defOf(currentId).category + ' MISSION // ' + (v.done ? 'COMPLETE' : 'IN PROGRESS');
      }
    }
    S.emit('data:change', { date: S.todayKey(), source: 'modal' });
  }

  /* ----------------------------------------------------------
     open / close
     ---------------------------------------------------------- */
  modal.open = function (id, fromEl) {
    if (!S.missions.get(id)) return;
    currentId = id;
    opener = fromEl || document.activeElement;
    resetArmedAt = 0;
    if (id === 'dancing') danceMode = 'timer';
    render();
    S.sound.play('open');
    document.body.style.overflow = 'hidden';
  };

  modal.close = function () {
    if (!currentId) return;
    currentId = null;
    var root = document.getElementById('modal-root');
    if (root) root.innerHTML = '';
    document.body.style.overflow = '';
    S.sound.play('close');
    if (opener && document.contains(opener) && opener.focus) opener.focus();
    opener = null;
  };

  modal.isOpen = function () { return !!currentId; };
  modal.current = function () { return currentId; };
  modal.replayCelebration = function () {
    if (currentId) S.ui.confetti(document.getElementById('sheet-body'), 16);
  };

})(window.S);
