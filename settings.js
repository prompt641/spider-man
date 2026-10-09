/* ============================================================
   SPIDEY TRACKER — ui/settings.js
   Settings: sound, display, daily goals, data management
   ============================================================ */
(function (S) {
  'use strict';

  var set = S.views.settings = S.views.settings || {};

  function toggle(group, key, label, hint) {
    var on = S.store.getSettings()[group][key];
    return '<button type="button" class="toggle" data-act="toggle" data-group="' + group + '" data-key="' + key + '" ' +
      'aria-pressed="' + on + '">' +
      '<span class="toggle-lbl">' + label + (hint ? '<small>' + hint + '</small>' : '') + '</span>' +
      '<span class="switch" aria-hidden="true"></span></button>';
  }

  function slider(group, key, label) {
    var v = S.store.getSettings()[group][key];
    return '<div class="set-row">' +
      '<div class="set-row-head"><span class="lbl">' + label + '</span><span class="val" data-val="' +
        group + '.' + key + '">' + v + '%</span></div>' +
      '<input class="range" type="range" min="0" max="100" step="5" value="' + v + '" ' +
        'data-act="range" data-group="' + group + '" data-key="' + key + '" aria-label="' + label + '" />' +
    '</div>';
  }

  function numberRow(key, label, hint, step) {
    var g = S.store.getSettings().goals;
    var min = (key === 'runningKm') ? 0.1
      : (key === 'singingMin' || key === 'dancingMin' || key === 'fitnessMin') ? 5 : 1;
    return '<div class="goal-row">' +
      '<label for="goal-' + key + '">' + label + '<small>' + hint + '</small></label>' +
      '<input class="input num" id="goal-' + key + '" type="number" min="' + min + '" step="' + (step || 1) +
        '" value="' + g[key] + '" data-act="goal" data-key="' + key + '" />' +
    '</div>';
  }

  set.render = function (root) {

    root.innerHTML =
      '<div class="page-head">' +
        '<div>' +
          '<h1 class="page-title">SET<span>TINGS</span></h1>' +
          '<div class="page-sub">SOUND // DISPLAY // GOALS // DATA</div>' +
        '</div>' +
        '<div class="tag ' + (S.store.storageOk() ? 'green' : 'red') + '">' +
          (S.store.storageOk() ? 'STORAGE OK' : 'STORAGE BLOCKED') + '</div>' +
      '</div>' +

      '<div class="settings">' +

        /* ---------------- SOUND ---------------- */
        '<section class="set-group"><h3>♪ SOUND</h3><div class="set-body">' +
          slider('sound', 'master', 'MASTER VOLUME') +
          toggle('sound', 'ui', 'UI SOUNDS', 'CLICKS, BEEPS & COMPLETION JINGLES') +
          slider('sound', 'uiVolume', 'UI SOUND VOLUME') +
          toggle('sound', 'ambient', 'AMBIENT SOUND', 'SOFT GENERATED BACKGROUND HUM') +
          slider('sound', 'ambientVolume', 'AMBIENT VOLUME') +
          '<div class="btn-row">' +
            '<button type="button" class="btn blue" data-act="test">▶ TEST UI SOUND</button>' +
          '</div>' +
          '<p class="data-note">ALL AUDIO IS SYNTHESIZED IN-BROWSER — NO MUSIC FILES, NO COPYRIGHTED TRACKS.</p>' +
        '</div></section>' +

        /* ---------------- DISPLAY ---------------- */
        '<section class="set-group"><h3>▣ DISPLAY</h3><div class="set-body">' +
          toggle('display', 'animations', 'ANIMATIONS', 'MASCOT MOTION, GLITCH & TRANSITIONS') +
          toggle('display', 'crt', 'CRT EFFECT', 'VIGNETTE + SUBTLE FLICKER') +
          toggle('display', 'scanlines', 'SCANLINES', 'RETRO CRT LINE OVERLAY') +
          toggle('display', 'mascot', 'PIXEL MASCOT', 'SHOW YOUR TRACKER COMPANION') +
          '<p class="data-note">REDUCED-MOTION IS ALWAYS RESPECTED FROM YOUR OS SETTING.</p>' +
        '</div></section>' +

        /* ---------------- DAILY GOALS ---------------- */
        '<section class="set-group"><h3>★ DAILY GOALS</h3><div class="set-body">' +
          numberRow('korean', 'KOREAN', 'CHAPTERS PER DAY') +
          numberRow('singingMin', 'SINGING', 'MINUTES PER DAY', 5) +
          numberRow('dancingMin', 'DANCING', 'MINUTES PER DAY (OR 1 SONG)', 5) +
          numberRow('study', 'STUDY', 'SESSIONS PER DAY') +
          numberRow('runningKm', 'RUNNING', 'KILOMETRES PER DAY', 0.1) +
          numberRow('fitnessMin', 'FITNESS', 'MINUTES PER DAY', 5) +
          numberRow('water', 'WATER', 'LARGE BOTTLES PER DAY') +
          '<p class="data-note">FACE MASK, SUPPLEMENT = 1 / DAY · MEALS = 3 / DAY (FIXED)</p>' +
          '<div class="btn-row"><button type="button" class="btn warn" data-act="goals-reset">RESET GOALS</button></div>' +
        '</div></section>' +

        /* ---------------- DATA ---------------- */
        '<section class="set-group"><h3>⛁ DATA</h3><div class="set-body">' +
          '<p class="data-note">EVERYTHING LIVES IN THIS BROWSER (LOCAL STORAGE). NO ACCOUNT, NO SERVER, NO SYNC.</p>' +
          '<div class="btn-row">' +
            '<button type="button" class="btn blue" data-act="export">⭳ EXPORT DATA</button>' +
            '<button type="button" class="btn" data-act="import">⭱ IMPORT DATA</button>' +
            '<button type="button" class="btn success" data-act="merge">⧺ MERGE IMPORT</button>' +
          '</div>' +
          '<div class="btn-row">' +
            '<button type="button" class="btn warn" data-act="clear-log">CLEAR ACTIVITY LOG</button>' +
            '<button type="button" class="btn danger" data-act="reset">RESET ALL DATA</button>' +
          '</div>' +
          '<input type="file" id="import-file" accept="application/json,.json" class="sr-only" tabindex="-1" />' +
          '<p class="tiny muted">EXPORTED FILES ARE STANDARD JSON — RE-IMPORTABLE ON ANY DEVICE.</p>' +
        '</div></section>' +

      '</div>';

    bind(root);
  };

  /* ---------------------------------------------------------- */
  /* ----------------------------------------------------------
     live inputs — installed exactly once per view container
     ---------------------------------------------------------- */
  function installLiveInputs(root) {
    /* range sliders: update settings live without re-rendering (keeps drag focus) */
    root.addEventListener('input', function (e) {
      var el = e.target;
      if (!el.getAttribute) return;
      var act = el.getAttribute('data-act');

      if (act === 'range') {
        var group = el.getAttribute('data-group');
        var key = el.getAttribute('data-key');
        var val = Number(el.value);
        var lbl = root.querySelector('[data-val="' + group + '.' + key + '"]');
        if (lbl) lbl.textContent = val + '%';
        var patch = {}; patch[key] = val;
        S.store.updateSettings(group, patch);
        S.sound.syncFromSettings();
        return;
      }

      if (act === 'goal') {
        var gkey = el.getAttribute('data-key');
        var num = parseFloat(el.value);
        if (!isFinite(num)) return;
        var gpatch = {}; gpatch[gkey] = num;
        S.store.updateSettings('goals', gpatch);
      }
    });

    /* goal inputs: clamp on change + confirm */
    root.addEventListener('change', function (e) {
      var el = e.target;
      if (!el.getAttribute || el.getAttribute('data-act') !== 'goal') return;
      var gkey = el.getAttribute('data-key');
      var num = parseFloat(el.value);
      if (!isFinite(num)) num = 1;
      num = (gkey === 'runningKm') ? S.clamp(S.round(num, 1), 0.1, 100)
        : (gkey === 'singingMin' || gkey === 'dancingMin' || gkey === 'fitnessMin')
          ? Math.max(5, Math.round(num))
          : Math.max(1, Math.round(num));
      var patch = {}; patch[gkey] = num;
      S.store.updateSettings('goals', patch);
      el.value = num;
      S.sound.play('toggle');
      var pretty = gkey === 'runningKm' ? 'RUNNING KM'
        : gkey === 'singingMin' ? 'SINGING MIN'
        : gkey === 'dancingMin' ? 'DANCING MIN'
        : gkey === 'fitnessMin' ? 'FITNESS MIN'
        : gkey.toUpperCase();
      S.ui.toast({ title: 'GOAL SAVED', text: pretty + ' \u2192 ' + num, life: 1600 });
    });
  }

  function bind(root) {
    S.ui.bind(root, {
      toggle: function (el) {
        var group = el.getAttribute('data-group');
        var key = el.getAttribute('data-key');
        var val = el.getAttribute('aria-pressed') !== 'true';
        S.store.updateSettings(group, (function (o) { o[key] = val; return o; })({}));
        S.sound.unlock();
        S.sound.play(val ? 'toggle' : 'uncheck');
        S.sound.syncFromSettings();
        S.app.applyDisplay();
        set.render(root);
      },

      'goals-reset': function () {
        S.ui.confirm({
          title: 'RESET GOALS',
          subtitle: 'DEFAULT TARGETS WILL BE RESTORED',
          body: 'Your tracked history stays untouched — only the daily targets go back to the defaults.',
          list: '<b>KOREAN</b> 1 chapter<br/><b>SINGING</b> 60 min<br/><b>DANCING</b> 60 min or 1 song<br/>' +
                '<b>STUDY</b> 1 session<br/><b>RUNNING</b> 1 km<br/><b>FITNESS</b> 60 min<br/><b>WATER</b> 3 bottles',
          confirmLabel: 'RESET GOALS'
        }).then(function (ok) {
          if (!ok) return;
          S.store.updateSettings('goals', {
            korean: 1, singingMin: 60, dancingMin: 60, study: 1, runningKm: 1, fitnessMin: 60, water: 3
          });
          S.sound.play('reset');
          S.ui.toast({ title: 'GOALS RESET', text: 'DEFAULT TARGETS RESTORED', kind: 'ok' });
          set.render(root);
        });
      },

      test: function () {
        S.sound.unlock();
        S.sound.preview('complete');
      },

      export: function () {
        var data = S.store.exportData();
        S.downloadJSON(data, 'spidey-tracker-' + S.todayKey() + '.json');
        S.sound.play('check');
        S.store.log({ cat: 'SYSTEM', title: 'DATA', text: 'EXPORTED SNAPSHOT' });
        S.ui.toast({ title: 'DATA EXPORTED', text: 'JSON FILE DOWNLOADED', kind: 'ok' });
      },

      import: function () { pickFile('replace'); },
      merge: function () { pickFile('merge'); },

      'clear-log': function () {
        S.ui.confirm({
          title: 'CLEAR ACTIVITY LOG',
          subtitle: 'ONLY THE LOG IS AFFECTED',
          body: 'All log entries will be deleted. Your daily mission records, statistics and settings stay intact.',
          confirmLabel: 'CLEAR LOG', danger: true
        }).then(function (ok) {
          if (!ok) return;
          S.store.clearActivity();
          S.sound.play('reset');
          S.ui.toast({ title: 'LOG CLEARED', text: 'ACTIVITY CONSOLE EMPTIED', kind: 'ok' });
        });
      },

      reset: function () {
        S.ui.confirm({
          title: 'RESET ALL DATA',
          subtitle: 'THIS CANNOT BE UNDONE',
          body: 'Every tracked day, all statistics, the activity log and every setting will be permanently erased from this browser.',
          list: '<b>days</b>: ' + S.store.dayKeys().length + '<br/><b>activity</b>: ' +
                S.store.state.activity.length + ' entries',
          confirmLabel: 'ERASE EVERYTHING', danger: true
        }).then(function (ok) {
          if (!ok) return;
          S.timers.pause(true);
          S.store.resetAll();
          S.sound.play('error');
          S.app.applyDisplay();
          S.sound.syncFromSettings();
          S.ui.toast({ title: 'DATA RESET', text: 'SYSTEM WIPED — FRESH START', kind: 'err' });
          location.hash = '#/home';
          S.app.render();
        });
      }
    });

    /* live inputs (sliders + goal numbers) — installed once per container */
    if (!root.__spideySettingsBound) {
      root.__spideySettingsBound = true;
      installLiveInputs(root);
    }

    /* import file picker (the input itself is recreated each render) */
    var fileInput = root.querySelector('#import-file');
    var pendingMode = 'replace';
    function pickFile(mode) {
      pendingMode = mode;
      S.sound.play('open');
      fileInput.value = '';
      fileInput.click();
    }
    fileInput.addEventListener('change', function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;
      S.readJSONFile(file, function (err, data) {
        if (err) {
          S.sound.play('error');
          S.ui.toast({ title: 'IMPORT FAILED', text: err, kind: 'err' });
          return;
        }
        var v = S.store.validateImport(data);
        if (!v.ok) {
          S.sound.play('error');
          S.ui.toast({ title: 'IMPORT REJECTED', text: v.error, kind: 'err' });
          return;
        }
        var isMerge = pendingMode === 'merge';
        S.ui.confirm({
          title: isMerge ? 'MERGE IMPORT' : 'REPLACE IMPORT',
          subtitle: 'STRUCTURE VALIDATED — READY TO APPLY',
          body: isMerge
            ? 'Existing records are kept. Imported days that you don’t already have are added, and log entries are combined.'
            : 'This replaces ALL current data in this browser with the contents of the file.',
          list: '<b>days</b>: ' + v.summary.days + '<br/><b>activity</b>: ' + v.summary.activity + ' entries',
          confirmLabel: isMerge ? 'MERGE NOW' : 'REPLACE EVERYTHING',
          danger: !isMerge
        }).then(function (ok) {
          if (!ok) return;
          S.store.applyImport(v.data, pendingMode);
          S.sound.play('complete');
          S.app.applyDisplay();
          S.sound.syncFromSettings();
          S.ui.toast({ title: 'IMPORT COMPLETE', text: v.summary.days + ' DAYS LOADED', kind: 'ok' });
          S.app.render();
        });
      });
    });
  }

})(window.S);
