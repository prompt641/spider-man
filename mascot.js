/* ============================================================
   SPIDEY TRACKER — ui/mascot.js
   Original pixel-art mascot (Spider-Man-inspired, drawn from
   scratch as pixel maps) rendered to crisp SVG rectangles.
   ============================================================ */
(function (S) {
  'use strict';

  var mascot = S.mascot = S.mascot || {};

  var PALETTE = {
    R: '#e5352b',   /* suit red */
    r: '#a8241d',   /* suit red shade */
    B: '#2f6bf0',   /* suit blue */
    b: '#1b3c8f',   /* suit blue shade */
    W: '#f4f7ff',   /* eye white */
    K: '#0b0d16',   /* outline */
    Y: '#ffb02e',   /* sparkle */
    G: '#37d67a',   /* sparkle */
    '.': null
  };

  var W = 16;

  /* ----------------------------------------------------------
     PIXEL MAPS (16 x 16)
     ---------------------------------------------------------- */
  var MAPS = {
    /* standing, relaxed */
    idle: [
      '................',
      '.....rrrrrr.....',
      '....rrrrrrrr....',
      '....rWWrrWWr....',
      '....rWKrrKWr....',
      '....rrrrrrrr....',
      '.....rrrrrr.....',
      '......rrrr......',
      '...BBBBBBBBBB...',
      '..BBBrrrrrrBBB..',
      '..BBBrrrrrrBBB..',
      '..BB.RRRRRR.BB..',
      '.....RRRRRR.....',
      '....BB....BB....',
      '....BB....BB....',
      '...KKKK..KKKK...'
    ],
    /* mid-action: legs apart, arms out */
    active: [
      '................',
      '.....rrrrrr.....',
      '....rrrrrrrr....',
      '....rWWrrWWr....',
      '....rWKrrKWr....',
      '....rrrrrrrr....',
      '.....rrrrrr.....',
      '......rrrr......',
      '...BBBBBBBBBB...',
      '..BBBrrrrrrBBB..',
      '..BBBrrrrrrBBB..',
      '...BBRRRRRRBB...',
      '.....RRRRRR.....',
      '...BB......BB...',
      '..BB........BB..',
      '..KK........KK..'
    ],
    /* celebration: arms up + sparkles */
    celebrate: [
      'Y..............Y',
      '.....rrrrrr.....',
      '....rrrrrrrr....',
      '....rWWrrWWr....',
      '....rWKrrKWr....',
      '....rrrrrrrr....',
      '.....rrrrrr.....',
      '......rrrr......',
      'BB...BBBBBBBB...B',
      'BB...rrrrrr...BB',
      '..B..rrrrrr..B..',
      '.....RRRRRR.....',
      '....RRRRRRRR....',
      '....BB....BB....',
      '....BB....BB....',
      '...KKK....KKK...'
    ],
    /* droopy eyes — empty states / no activity */
    sad: [
      '................',
      '.....rrrrrr.....',
      '....rrrrrrrr....',
      '....rrrrrrrr....',
      '....rWWrrWWr....',
      '....rWKrrKWr....',
      '.....rrrrrr.....',
      '......rrrr......',
      '...BBBBBBBBBB...',
      '..BBBrrrrrrBBB..',
      '..BBBrrrrrrBBB..',
      '..BB.RRRRRR.BB..',
      '.....RRRRRR.....',
      '....BB....BB....',
      '....BB....BB....',
      '...KKKK..KKKK...'
    ]
  };

  /* celebrate row lengths are hand-tuned; pad/truncate defensively */
  function row(str, i) {
    var s = String(str);
    if (s.length > W) return s.slice(0, W);
    while (s.length < W) s += '.';
    return s;
  }

  var FRAME_CLASS = {
    idle: 'mascot-idle',
    active: 'mascot-active',
    celebrate: 'mascot-celebrate',
    sad: 'mascot-sleep'
  };

  /* ----------------------------------------------------------
     render
     ---------------------------------------------------------- */
  mascot.svg = function (mood, size) {
    var map = MAPS[mood] || MAPS.idle;
    var px = 1;                 /* viewBox units */
    var rects = '';
    for (var y = 0; y < map.length; y++) {
      var line = row(map[y], y);
      var x = 0;
      while (x < W) {
        var ch = line[x];
        if (ch === '.' || !PALETTE[ch]) { x++; continue; }
        var run = 1;
        while (x + run < W && line[x + run] === ch) run++;
        rects += '<rect x="' + x + '" y="' + y + '" width="' + run + '" height="' + px +
                 '" fill="' + PALETTE[ch] + '"/>';
        x += run;
      }
    }
    var cls = FRAME_CLASS[mood] || FRAME_CLASS.idle;
    var s = size || 96;
    return '<svg class="' + cls + '" viewBox="0 0 16 16" width="' + s + '" height="' + s +
      '" shape-rendering="crispEdges" role="img" aria-label="Spidey tracker mascot">' +
      rects + '</svg>';
  };

  /* mood from the current day state */
  mascot.moodFor = function (completion, timerRunning) {
    if (completion.allDone) return 'celebrate';
    if (timerRunning) return 'active';
    if (completion.done === 0 && !timerRunning) return 'sad';
    return 'idle';
  };

  /* short playful caption */
  mascot.captionFor = function (completion, timerRunning) {
    if (completion.allDone) return 'TODAY COMPLETE!';
    if (timerRunning) return 'MISSION IN PROGRESS!';
    if (completion.done === 0) return 'READY FOR TODAY?';
    if (completion.done < 6) return 'A FEW MISSIONS LEFT...';
    return 'NICE! KEEP GOING!';
  };

  mascot.greeting = function (completion) {
    if (completion.allDone) return 'TODAY COMPLETE!';
    if (completion.done === 0) return 'YOUR JOURNEY STARTS HERE';
    return 'READY FOR TODAY?';
  };

})(window.S);
