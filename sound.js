/* ============================================================
   SPIDEY TRACKER — core/sound.js
   Two audio layers: short UI blips + optional ambient loop.
   100% synthesized (no copyrighted / external audio assets).
   ============================================================ */
(function (S) {
  'use strict';

  var snd = S.sound;

  var ctx = null;
  var master = null;
  var uiBus = null;
  var ambientBus = null;
  var ambientNodes = null;
  var unlocked = false;
  var pendingAmbient = false;

  /* ----------------------------------------------------------
     unlock — browsers only allow audio after a user gesture
     ---------------------------------------------------------- */
  function ensureCtx() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.connect(ctx.destination);
      uiBus = ctx.createGain();
      uiBus.connect(master);
      ambientBus = ctx.createGain();
      ambientBus.connect(master);
      applyVolumes();
    } catch (e) {
      ctx = null;
    }
    return ctx;
  }

  snd.unlock = function () {
    if (unlocked) return;
    var c = ensureCtx();
    if (!c) return;
    unlocked = true;
    if (c.state === 'suspended') c.resume();
    /* flush an ambient request that arrived before the first gesture */
    if (pendingAmbient) { pendingAmbient = false; startAmbient(); }
    applyVolumes();
  };

  snd.isUnlocked = function () { return unlocked; };

  function installUnlockHooks() {
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (evt) {
      window.addEventListener(evt, function once() {
        snd.unlock();
        window.removeEventListener(evt, once);
      }, { once: true, passive: true });
    });
  }

  /* ----------------------------------------------------------
     volumes
     ---------------------------------------------------------- */
  function applyVolumes() {
    if (!ctx) return;
    var s = S.store.getSettings().sound;
    var now = ctx.currentTime;
    master.gain.setTargetAtTime((s.master / 100) * 0.9, now, 0.02);
    uiBus.gain.setTargetAtTime(s.ui ? (s.uiVolume / 100) * 0.9 : 0, now, 0.02);
    ambientBus.gain.setTargetAtTime(s.ambient ? (s.ambientVolume / 100) * 0.5 : 0, now, 0.08);
  }
  snd.applyVolumes = applyVolumes;

  /* ----------------------------------------------------------
     tiny synth helpers
     ---------------------------------------------------------- */
  function tone(opts) {
    if (!ctx) return;
    var t0 = ctx.currentTime + (opts.delay || 0);
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = opts.type || 'square';
    osc.frequency.setValueAtTime(opts.freq, t0);
    if (opts.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, opts.slide), t0 + opts.dur);
    var vol = (opts.vol == null ? 0.25 : opts.vol);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
    osc.connect(gain).connect(opts.bus || uiBus);
    osc.start(t0);
    osc.stop(t0 + opts.dur + 0.03);
  }

  function noise(opts) {
    if (!ctx) return;
    var t0 = ctx.currentTime + (opts.delay || 0);
    var frames = Math.floor(ctx.sampleRate * opts.dur);
    var buf = ctx.createBuffer(1, Math.max(1, frames), ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    var src = ctx.createBufferSource();
    src.buffer = buf;
    var filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = opts.filter || 1400;
    filter.Q.value = 1.1;
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(opts.vol == null ? 0.18 : opts.vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
    src.connect(filter).connect(gain).connect(opts.bus || uiBus);
    src.start(t0);
  }

  /* ----------------------------------------------------------
     UI SOUND BANK
     ---------------------------------------------------------- */
  var bank = {
    click: function () {
      tone({ freq: 660, dur: 0.06, type: 'square', vol: 0.16 });
      tone({ freq: 990, dur: 0.04, type: 'square', vol: 0.08, delay: 0.02 });
    },
    nav: function () {
      tone({ freq: 440, dur: 0.05, type: 'triangle', vol: 0.14 });
      tone({ freq: 660, dur: 0.07, type: 'triangle', vol: 0.12, delay: 0.05 });
    },
    open: function () {
      tone({ freq: 320, dur: 0.10, type: 'square', vol: 0.14, slide: 720 });
      noise({ dur: 0.08, filter: 2400, vol: 0.07 });
    },
    close: function () {
      tone({ freq: 640, dur: 0.09, type: 'square', vol: 0.12, slide: 240 });
    },
    toggle: function () {
      tone({ freq: 880, dur: 0.05, type: 'square', vol: 0.13 });
    },
    check: function () {
      tone({ freq: 740, dur: 0.07, type: 'square', vol: 0.16 });
      tone({ freq: 1180, dur: 0.09, type: 'square', vol: 0.12, delay: 0.05 });
    },
    uncheck: function () {
      tone({ freq: 520, dur: 0.07, type: 'square', vol: 0.12, slide: 320 });
    },
    water: function () {
      tone({ freq: 520, dur: 0.09, type: 'sine', vol: 0.2, slide: 1040 });
      tone({ freq: 1300, dur: 0.10, type: 'sine', vol: 0.1, delay: 0.06, slide: 700 });
    },
    'timer-start': function () {
      tone({ freq: 440, dur: 0.07, type: 'square', vol: 0.16 });
      tone({ freq: 660, dur: 0.07, type: 'square', vol: 0.16, delay: 0.07 });
      tone({ freq: 880, dur: 0.10, type: 'square', vol: 0.14, delay: 0.14 });
    },
    'timer-pause': function () {
      tone({ freq: 660, dur: 0.07, type: 'square', vol: 0.14 });
      tone({ freq: 440, dur: 0.10, type: 'square', vol: 0.14, delay: 0.07 });
    },
    reset: function () {
      tone({ freq: 700, dur: 0.06, type: 'sawtooth', vol: 0.12, slide: 220 });
      tone({ freq: 500, dur: 0.09, type: 'sawtooth', vol: 0.10, delay: 0.06, slide: 180 });
    },
    complete: function () {
      var notes = [523, 659, 784, 1047];
      notes.forEach(function (f, i) {
        tone({ freq: f, dur: 0.16, type: 'square', vol: 0.2, delay: i * 0.075 });
      });
      noise({ dur: 0.22, filter: 3200, vol: 0.10, delay: 0.24 });
      tone({ freq: 1568, dur: 0.30, type: 'triangle', vol: 0.16, delay: 0.30 });
    },
    fanfare: function () {
      var notes = [523, 659, 784, 1047, 784, 1047, 1319];
      notes.forEach(function (f, i) {
        tone({ freq: f, dur: 0.18, type: 'square', vol: 0.2, delay: i * 0.09 });
      });
    },
    error: function () {
      tone({ freq: 200, dur: 0.14, type: 'sawtooth', vol: 0.18, slide: 120 });
      tone({ freq: 150, dur: 0.18, type: 'sawtooth', vol: 0.16, delay: 0.13, slide: 90 });
    },
    boot: function () {
      tone({ freq: 220, dur: 0.12, type: 'square', vol: 0.14, slide: 660 });
      tone({ freq: 880, dur: 0.16, type: 'square', vol: 0.12, delay: 0.12 });
    },
    type: function () {
      noise({ dur: 0.03, filter: 2600, vol: 0.07 });
    }
  };

  snd.play = function (name) {
    var s = S.store.getSettings().sound;
    if (!s.ui || !s.master) return;
    if (!unlocked) return;               /* never before a user gesture */
    if (!ensureCtx()) return;
    if (ctx.state === 'suspended') ctx.resume();
    var fn = bank[name];
    if (!fn) return;
    try { fn(); } catch (e) { /* audio must never break the UI */ }
  };

  snd.names = Object.keys(bank);

  /* ----------------------------------------------------------
     AMBIENT LOOP — soft generated "city night" hum
     ---------------------------------------------------------- */
  function startAmbient() {
    if (!unlocked) { pendingAmbient = true; return; }
    if (!ensureCtx()) return;
    if (ambientNodes) return;

    var t = ctx.currentTime;
    var out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.6, t + 2.5);
    out.connect(ambientBus);

    /* filtered noise bed */
    var frames = ctx.sampleRate * 3;
    var buf = ctx.createBuffer(1, frames, ctx.sampleRate);
    var d = buf.getChannelData(0);
    var last = 0;
    for (var i = 0; i < frames; i++) {          /* brown-ish noise */
      var w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.2;
    }
    var noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = buf;
    noiseSrc.loop = true;
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 480;
    var noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.16;
    noiseSrc.connect(lp).connect(noiseGain).connect(out);

    /* slow pad: three detuned oscillators + gentle LFO */
    var padGain = ctx.createGain();
    padGain.gain.value = 0.05;
    padGain.connect(out);
    var freqs = [110, 164.81, 220];
    var oscs = freqs.map(function (f, idx) {
      var o = ctx.createOscillator();
      o.type = idx === 1 ? 'triangle' : 'sine';
      o.frequency.value = f;
      o.detune.value = idx * 4 - 4;
      o.connect(padGain);
      o.start(t);
      return o;
    });

    var lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.07;
    var lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.028;
    lfo.connect(lfoGain).connect(padGain.gain);
    lfo.start(t);

    noiseSrc.start(t);

    ambientNodes = { out: out, src: noiseSrc, oscs: oscs, lfo: lfo };
    applyVolumes();
  }

  function stopAmbient() {
    if (!ambientNodes || !ctx) return;
    var n = ambientNodes;
    ambientNodes = null;
    var t = ctx.currentTime;
    try {
      n.out.gain.cancelScheduledValues(t);
      n.out.gain.setTargetAtTime(0.0001, t, 0.35);
      setTimeout(function () {
        try { n.src.stop(); n.lfo.stop(); n.oscs.forEach(function (o) { o.stop(); }); } catch (e) {}
      }, 1400);
    } catch (e) { /* ignore */ }
  }

  snd.startAmbient = startAmbient;
  snd.stopAmbient = stopAmbient;

  /* react to settings */
  snd.syncFromSettings = function () {
    var s = S.store.getSettings().sound;
    applyVolumes();
    if (s.ambient && s.master > 0) startAmbient();
    else stopAmbient();
  };

  /* preview a sound from the settings screen */
  snd.preview = function (name) {
    snd.unlock();
    snd.play(name || 'complete');
  };

  installUnlockHooks();

})(window.S);
