/* ============================================================
   SPIDEY TRACKER — ui/log.js
   Activity log — retro mission console with category filters
   ============================================================ */
(function (S) {
  'use strict';

  var log = S.views.log = S.views.log || {};

  var FILTERS = [
    { id: 'ALL', label: 'ALL' },
    { id: 'FITNESS', label: 'FITNESS' },
    { id: 'STUDY', label: 'STUDY' },
    { id: 'HEALTH', label: 'HEALTH' },
    { id: 'LANGUAGE', label: 'LANGUAGE' },
    { id: 'PERFORMANCE', label: 'PERFORMANCE' }
  ];

  function catClass(cat) { return 'c-' + String(cat).toLowerCase(); }

  function groupLabel(key) {
    var today = S.todayKey();
    var yesterday = S.dateKey(new Date(Date.now() - 86400000));
    if (key === today) return 'TODAY // ' + S.formatLong(key);
    if (key === yesterday) return 'YESTERDAY // ' + S.formatLong(key);
    return S.formatDow(key) + ' // ' + S.formatLong(key);
  }

  log.render = function (root) {
    var settings = S.store.getSettings();
    var filter = settings.ui.logFilter || 'ALL';
    var items = S.store.activity(filter);

    var chips = FILTERS.map(function (f) {
      return '<button type="button" class="chip" data-act="filter" data-filter="' + f.id + '" ' +
        'aria-pressed="' + (f.id === filter) + '">' + f.label + '</button>';
    }).join('');

    var body = '';
    if (!items.length) {
      body = '<div style="padding:16px">' + S.ui.emptyState({
        mood: 'sad',
        title: filter === 'ALL' ? 'NO ACTIVITY YET' : 'NOTHING IN ' + filter + ' YET',
        text: filter === 'ALL'
          ? 'Your first mission is waiting. Complete anything on the home screen and it will appear here.'
          : 'Complete a ' + filter.toLowerCase() + ' mission and the log will fill up.',
        action: { act: 'goHome', label: 'GO TO COMMAND CENTER' }
      }) + '</div>';
    } else {
      var lastDate = null;
      body = items.map(function (a) {
        var out = '';
        if (a.date !== lastDate) {
          lastDate = a.date;
          out += '<div class="log-group">// ' + S.esc(groupLabel(a.date)) + '</div>';
        }
        out += '<div class="log-row">' +
          '<span class="log-time">' + S.timeLabel(a.ts) + '</span>' +
          '<span class="log-cat ' + catClass(a.cat) + '">' + S.esc(a.title) + '</span>' +
          '<span class="log-txt">' + S.esc(a.text) + '</span>' +
        '</div>';
        return out;
      }).join('');
    }

    root.innerHTML =
      '<div class="page-head">' +
        '<div>' +
          '<h1 class="page-title">ACTIVITY <span>LOG</span></h1>' +
          '<div class="page-sub">EVERY ACTION // NEWEST FIRST // LOCAL RECORD</div>' +
        '</div>' +
        '<div class="tag blue">' + items.length + ' ENTRIES</div>' +
      '</div>' +
      '<div class="filters" role="group" aria-label="Filter activity">' + chips + '</div>' +
      '<div class="terminal">' +
        '<div class="terminal-bar"><span class="dot"></span><span class="dot b"></span><span class="dot g"></span>' +
          '<span style="margin-left:6px">SPIDEY://ACTIVITY ' + (filter === 'ALL' ? '' : '[' + filter + ']') + '</span></div>' +
        '<div class="terminal-body" id="log-body">' + body + '</div>' +
      '</div>';

    S.ui.bind(root, {
      filter: function (el) {
        S.store.updateSettings('ui', { logFilter: el.getAttribute('data-filter') || 'ALL' });
        S.sound.play('toggle');
        S.app.render();
      },
      goHome: function () { location.hash = '#/home'; }
    });
  };

})(window.S);
