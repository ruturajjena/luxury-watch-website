/* ==========================================================================
   BUILT BY RUTURAJ — The Anatomy of Precision
   Scroll-driven cinematic engine:
   Lenis (inertia scroll) + GSAP/ScrollTrigger (scene choreography)
   + frame-accurate video scrubbing across 7 all-intra encoded films.
   ========================================================================== */

(() => {
  'use strict';

  gsap.registerPlugin(ScrollTrigger);

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = p => p * p * (3 - 2 * p);

  const isCoarse = matchMedia('(pointer: coarse)').matches;
  const reduced  = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------
     SCENE SCRIPT — which film, which time-range, how it behaves
  ------------------------------------------------------------------ */
  const SCENES = [
    { vid: 'v1', from: 0.00, to: 1.15, name: 'SILHOUETTE', tilt: 0.55, dim: 0.42 },
    { vid: 'v1', from: 1.15, to: 9.90, name: 'ROTATION',   tilt: 0.85, dim: 0.16 },
    { vid: 'v2', from: 0.00, to: 5.00, name: 'SAPPHIRE',   tilt: 0.85, dim: 0.14 },
    { vid: 'v2', from: 5.00, to: 9.90, name: 'BEZEL',      tilt: 1.10, dim: 0.16 },
    { vid: 'v3', from: 0.00, to: 9.90, name: 'DIAL',       tilt: 0.85, dim: 0.16 },
    { vid: 'v4', from: 0.00, to: 9.90, name: 'MOVEMENT',   tilt: 0.95, dim: 0.18 },
    { vid: 'v5', from: 0.00, to: 9.90, name: 'EXPLODED',   tilt: 2.40, dim: 0.20 },
    { vid: 'v6', from: 0.00, to: 9.90, name: 'FEATURES',   tilt: 0.70, dim: 0.38 },
    { vid: 'v8', from: 0.00, to: 2.40, name: 'SECTION',    tilt: 0.95, dim: 0.16 },
    { vid: 'v8', from: 2.40, to: 8.40, name: 'REASSEMBLY', tilt: 0.85, dim: 0.14 },
    { vid: 'v8', from: 8.40, to: 9.90, name: 'ORBIT',      tilt: 0.60, dim: 0.10 },
    { vid: 'v8', from: 9.90, to: 9.90, name: 'CREDITS',    tilt: 0.30, dim: 0.90 },
  ];
  const N = SCENES.length;

  const FEATURES = [
    { t: 'Power <em>Reserve</em>',      d: 'Seventy-two hours of stored intention. Wound by motion, spent with discipline.', spec: '72 H',    unit: 'TWIN BARREL' },
    { t: 'Automatic <em>Rotor</em>',    d: 'Every gesture becomes energy. The rotor harvests movement in both directions.',   spec: '360°',    unit: 'BIDIRECTIONAL WINDING' },
    { t: 'Titanium <em>Case</em>',      d: 'Grade-5 armor at the weight of a feather. Forged, brushed, then finished by hand.', spec: '98 G',  unit: 'TITANIUM GR.5 · Ø 41 MM' },
    { t: 'Sapphire <em>Crystal</em>',   d: 'Second only to diamond. A window that refuses to scar.',                          spec: '1900 HV', unit: 'VICKERS HARDNESS' },
    { t: 'Precision <em>Engineering</em>', d: 'Regulated in five positions. Two seconds a day, either way — no more.',        spec: '−2/+2',   unit: 'SECONDS / DAY' },
    { t: 'Shock <em>Resistance</em>',   d: 'Five thousand g of violence, absorbed in silence.',                               spec: '5000 G',  unit: 'ISO 1413 CERTIFIED' },
    { t: 'Water <em>Resistance</em>',   d: 'Ten atmospheres of pressure held at the gasket line.',                            spec: '10 ATM',  unit: '100 M DEPTH RATING' },
  ];

  /* ------------------------------------------------------------------
     DOM
  ------------------------------------------------------------------ */
  const stageTilt = $('#stageTilt');
  const scrim   = $('#scrim');
  const barT    = $('#barT'), barB = $('#barB');
  const chapNum = $('#chapNum'), chapName = $('#chapName');
  const tcode   = $('#tcode'), pctEl = $('#pct');
  const layers  = $$('#layerList .layer');
  const featBar = $('#featBar');

  const videos = {};
  $$('.stage video').forEach(el => {
    videos[el.id] = { el, cur: SCENES.find(s => s.vid === el.id)?.from ?? 0, warm: false };
  });

  /* ------------------------------------------------------------------
     STATE
  ------------------------------------------------------------------ */
  let tops = [], ends = [], docH = 1, vh = innerHeight;
  let idx = 0, prog = 0, masterP = 0;
  let mx = 0, my = 0, lx = 0, ly = 0;          // mouse (raw / lerped, -1..1)
  let mpx = innerWidth / 2, mpy = innerHeight / 2, lpx = mpx, lpy = mpy;
  let tiltAmt = SCENES[0].tilt, dimAmt = SCENES[0].dim;
  let lastScrollY = 0, idleMs = 0, idleAmp = 0;

  const measure = () => {
    vh = innerHeight;
    tops = SCENES.map((_, i) => $('#sc' + i).offsetTop);
    docH = document.documentElement.scrollHeight;
    ends = SCENES.map((_, i) => (i < N - 1 ? tops[i + 1] : docH - vh));
  };

  /* ------------------------------------------------------------------
     LENIS + SCROLLTRIGGER
  ------------------------------------------------------------------ */
  const lenis = new Lenis({ duration: reduced ? 0.7 : 1.45, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
  document.body.setAttribute('data-loading', '');

  /* ------------------------------------------------------------------
     VIDEO WARMING (lazy load, staggered + proximity-based)
  ------------------------------------------------------------------ */
  const warm = id => {
    const v = videos[id];
    if (!v || v.warm) return;
    v.warm = true;
    v.el.preload = 'auto';
    if (v.el.readyState === 0) v.el.load();
  };

  /* ------------------------------------------------------------------
     MASTER TICK — the film projector
  ------------------------------------------------------------------ */
  const XFADE = 0.10; // last 10% of a scene cross-dissolves into the next film

  function tick(t, dtMs) {
    const y = window.scrollY;

    // scene index + local progress
    idx = 0;
    for (let i = N - 1; i >= 0; i--) if (y >= tops[i]) { idx = i; break; }
    const span = Math.max(1, ends[idx] - tops[idx]);
    prog = clamp((y - tops[idx]) / span, 0, 1);
    masterP = clamp(y / Math.max(1, docH - vh), 0, 1);

    // idle detection → breathing frames
    if (Math.abs(y - lastScrollY) > 0.5) { idleMs = 0; } else { idleMs += dtMs; }
    lastScrollY = y;
    idleAmp = lerp(idleAmp, idleMs > 1600 ? 1 : 0, 0.03);

    const sc = SCENES[idx];
    const nx = SCENES[idx + 1];
    const crossing = nx && nx.vid !== sc.vid && prog > 1 - XFADE;
    const a = crossing ? smooth((prog - (1 - XFADE)) / XFADE) : 0;

    // target times
    const drift = idleAmp * Math.sin(t * 0.0011) * 0.05;
    const baseT = sc.from + smooth(prog) * (sc.to - sc.from);
    videos[sc.vid].target = clamp(baseT + drift, 0.02, 9.94);
    if (nx && nx.vid !== sc.vid) videos[nx.vid].target = nx.from + 0.02;

    // proximity warming
    if (prog > 0.35 && nx) warm(nx.vid);
    if (prog > 0.6 && SCENES[idx + 2]) warm(SCENES[idx + 2].vid);

    // paint every video: opacity / scale / scrub
    for (const id in videos) {
      const v = videos[id];
      let op = 0, ex = 1;
      if (id === sc.vid) { op = crossing ? 1 - a : 1; ex = 1 + a * 0.02; v.el.style.zIndex = 1; }
      if (crossing && id === nx.vid) { op = a; ex = 1.035 - a * 0.035; v.el.style.zIndex = 2; }
      const vis = op > 0.001;
      v.el.style.opacity = op.toFixed(3);
      v.el.style.visibility = vis ? 'visible' : 'hidden';
      if (vis) v.el.style.transform = `scale(${(1.07 * ex).toFixed(4)})`;

      // scrub with inertia
      if (v.target !== undefined) {
        const d = v.target - v.cur;
        v.cur = Math.abs(d) > 1.6 ? v.target : v.cur + d * 0.16;
        if (vis && v.el.readyState >= 2 && !v.el.seeking && Math.abs(v.el.currentTime - v.cur) > 1 / 60) {
          v.el.currentTime = v.cur;
        }
      }
    }

    // scrim + tilt easing toward scene targets
    dimAmt = lerp(dimAmt, sc.dim, 0.06);
    scrim.style.opacity = dimAmt.toFixed(3);
    tiltAmt = lerp(tiltAmt, isCoarse || reduced ? 0 : sc.tilt, 0.05);

    // stage tilt + breathing bob
    lx = lerp(lx, mx, 0.055); ly = lerp(ly, my, 0.055);
    const bob = reduced ? 0 : Math.sin(t * 0.00042) * 7;
    stageTilt.style.transform =
      `perspective(1200px) rotateX(${(-ly * tiltAmt).toFixed(3)}deg) rotateY(${(lx * tiltAmt).toFixed(3)}deg) translateY(${bob.toFixed(2)}px)`;

    // mouse light position
    lpx = lerp(lpx, mpx, 0.08); lpy = lerp(lpy, mpy, 0.08);
    const mxp = (lpx / innerWidth * 100).toFixed(2) + '%';
    const myp = (lpy / innerHeight * 100).toFixed(2) + '%';
    $('#mlight').style.setProperty('--mx', mxp);   $('#mlight').style.setProperty('--my', myp);
    $('#mlightGold').style.setProperty('--mx', mxp); $('#mlightGold').style.setProperty('--my', myp);

    // HUD readouts
    const shown = videos[sc.vid].cur || 0;
    tcode.textContent = `${String(Math.floor(shown / 60)).padStart(2, '0')}:${String(Math.floor(shown % 60)).padStart(2, '0')}.${Math.floor((shown % 1) * 10)}`;
    pctEl.textContent = String(Math.round(masterP * 100)).padStart(3, '0');

    // scene-9 layer index highlight
    if (idx === 8) {
      const li = clamp(Math.floor(prog * 4), 0, 3);
      layers.forEach((el, k) => el.classList.toggle('on', k === li));
    }
    // features progress line
    if (idx === 7) featBar.style.width = (prog * 100).toFixed(2) + '%';

    // chapter change side-effects
    if (idx !== tick.lastIdx) {
      tick.lastIdx = idx;
      chapNum.textContent = 'SC.' + String(idx + 1).padStart(2, '0');
      chapName.textContent = sc.name;
      document.body.setAttribute('data-scene', idx);
      $$('#rail button').forEach((b, k) => b.classList.toggle('on', k === idx));
      const barH = (idx === 0 || idx === N - 1) ? 0 : '5.5vh';
      gsap.to([barT, barB], { height: barH, duration: 1.1, ease: 'power3.inOut', overwrite: 'auto' });
    }
  }
  tick.lastIdx = -1;

  /* ------------------------------------------------------------------
     RAIL (chapter navigation)
  ------------------------------------------------------------------ */
  const rail = $('#rail');
  SCENES.forEach((s, i) => {
    const b = document.createElement('button');
    b.innerHTML = `<i>${String(i + 1).padStart(2, '0')} — ${s.name}</i>`;
    b.setAttribute('aria-label', `Scene ${i + 1}: ${s.name}`);
    b.addEventListener('click', () => lenis.scrollTo(tops[i] + 4, { duration: 2.4, easing: x => 1 - Math.pow(1 - x, 4) }));
    rail.appendChild(b);
  });

  /* ------------------------------------------------------------------
     FEATURES DOM (scene 08)
  ------------------------------------------------------------------ */
  const featTrack = $('#featTrack');
  FEATURES.forEach((f, i) => {
    const d = document.createElement('div');
    d.className = 'feat';
    d.innerHTML =
      `<div class="feat-main">
         <p class="feat-count">${String(i + 1).padStart(2, '0')} / ${String(FEATURES.length).padStart(2, '0')} — ENGINEERING</p>
         <h3 class="feat-title">${f.t}</h3>
         <p class="feat-desc">${f.d}</p>
       </div>
       <div class="feat-spec"><b>${f.spec}</b><i>${f.unit}</i></div>`;
    featTrack.appendChild(d);
  });

  /* ------------------------------------------------------------------
     TYPE SPLITTING
  ------------------------------------------------------------------ */
  $$('.chars').forEach(el => new SplitType(el, { types: 'words,chars' }));

  /* ------------------------------------------------------------------
     SCENE UI CHOREOGRAPHY (scrubbed)
  ------------------------------------------------------------------ */
  const pad = tl => { tl.to({}, { duration: 0.001 }, 0.999); return tl; };

  function uiTimeline(i, { inAt = 0.06, outAt = 0.86, hold = false, build } = {}) {
    const ui = $(`[data-ui="${i}"]`);
    if (!ui) return;
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: '#sc' + i, start: 'top top', end: 'bottom top', scrub: true },
    });
    tl.fromTo(ui, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.07, ease: 'power1.out' }, inAt);
    const chars = $$('.char', ui);
    if (chars.length) tl.fromTo(chars, { yPercent: 115 }, { yPercent: 0, duration: 0.13, stagger: 0.0035, ease: 'power3.out' }, inAt + 0.01);
    const rises = $$('.rise', ui);
    if (rises.length) tl.fromTo(rises, { y: 44, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.11, stagger: 0.02, ease: 'power2.out' }, inAt + 0.03);
    if (build) build(tl, ui);
    if (!hold) tl.to(ui, { autoAlpha: 0, y: -36, duration: 0.08, ease: 'power1.in' }, outAt).set(ui, { y: 0 }, outAt + 0.09);
    return pad(tl);
  }

  // SC.01 — hero exits upward as film begins
  (() => {
    const ui = $('[data-ui="0"]');
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: '#sc0', start: 'top top', end: 'bottom top', scrub: true },
    });
    tl.to($$('.char', ui), { yPercent: -120, stagger: 0.003, duration: 0.3, ease: 'power2.in' }, 0.3)
      .to($$('.rise', ui), { autoAlpha: 0, y: -24, duration: 0.22 }, 0.32)
      .to(ui, { autoAlpha: 0, duration: 0.12 }, 0.55);
    pad(tl);
  })();

  uiTimeline(1);
  uiTimeline(2);
  uiTimeline(3, { inAt: 0.10 });
  uiTimeline(4, {
    build: (tl, ui) => {
      $$('.part', ui).forEach((p, k) => {
        tl.to(p, { opacity: 1, x: 0, duration: 0.09, ease: 'power2.out' }, 0.2 + k * 0.14);
      });
    },
  });
  uiTimeline(5, {
    build: (tl, ui) => {
      tl.fromTo($('.ghost', ui), { autoAlpha: 0, yPercent: 24 }, { autoAlpha: 1, yPercent: 0, duration: 0.3, ease: 'power2.out' }, 0.18);
    },
  });
  uiTimeline(6, { inAt: 0.08 });

  // SC.08 — feature sequence
  (() => {
    uiTimeline(7, { inAt: 0.015, outAt: 0.94 });
    const feats = $$('.feat');
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: '#sc7', start: 'top top', end: 'bottom top', scrub: true },
    });
    const start = 0.05, endZone = 0.93, len = (endZone - start) / feats.length;
    feats.forEach((f, k) => {
      const st = start + k * len;
      tl.fromTo(f, { autoAlpha: 0, y: 54 }, { autoAlpha: 1, y: 0, duration: len * 0.26, ease: 'power2.out' }, st);
      if (k < feats.length - 1) tl.to(f, { autoAlpha: 0, y: -50, duration: len * 0.24, ease: 'power2.in' }, st + len * 0.74);
    });
    pad(tl);
  })();

  uiTimeline(8, {
    build: (tl, ui) => {
      $$('.layer', ui).forEach((l, k) => tl.to(l, { x: -8, duration: 0.02 }, 0.16 + k * 0.18));
    },
  });
  uiTimeline(9);
  uiTimeline(10, { outAt: 0.82 });
  uiTimeline(11, {
    inAt: 0.07, hold: true,
    build: (tl, ui) => {
      tl.fromTo($('.brand-mark', ui), { scale: 0.75, rotate: -18 }, { scale: 1, rotate: 0, duration: 0.2, ease: 'power2.out' }, 0.07);
    },
  });

  /* ------------------------------------------------------------------
     DUST PARTICLES
  ------------------------------------------------------------------ */
  const dust = $('#dust');
  const dctx = dust.getContext('2d');
  let parts = [];
  const seedDust = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    dust.width = innerWidth * dpr; dust.height = innerHeight * dpr;
    dctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = reduced ? 0 : Math.min(90, Math.round(innerWidth * innerHeight / 22000));
    parts = Array.from({ length: n }, () => ({
      x: Math.random() * innerWidth, y: Math.random() * innerHeight,
      z: 0.25 + Math.random() * 0.75, r: 0.4 + Math.random() * 1.3,
      vy: 0.06 + Math.random() * 0.22, tw: 0.5 + Math.random() * 2.5,
      ph: Math.random() * Math.PI * 2,
    }));
  };
  const drawDust = t => {
    dctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) {
      p.y -= p.vy * p.z; p.x += Math.sin(t * 0.0003 + p.ph) * 0.08;
      if (p.y < -4) { p.y = innerHeight + 4; p.x = Math.random() * innerWidth; }
      const alpha = (0.05 + 0.16 * p.z) * (0.62 + 0.38 * Math.sin(t * 0.001 * p.tw + p.ph));
      dctx.beginPath();
      dctx.arc(p.x + lx * 26 * p.z, p.y + ly * 16 * p.z, p.r * p.z, 0, 7);
      dctx.fillStyle = `rgba(235,230,215,${Math.max(0, alpha).toFixed(3)})`;
      dctx.fill();
    }
  };

  /* ------------------------------------------------------------------
     CURSOR + MAGNETIC
  ------------------------------------------------------------------ */
  const cursor = $('#cursor');
  if (!isCoarse) {
    addEventListener('mousemove', e => {
      mpx = e.clientX; mpy = e.clientY;
      mx = (e.clientX / innerWidth) * 2 - 1;
      my = (e.clientY / innerHeight) * 2 - 1;
    }, { passive: true });

    let cx = 0, cy = 0, rx = 0, ry = 0;
    gsap.ticker.add(() => {
      cx = lerp(cx, mpx, 0.5); cy = lerp(cy, mpy, 0.5);
      rx = lerp(rx, mpx, 0.16); ry = lerp(ry, mpy, 0.16);
      cursor.style.transform = `translate(${cx}px, ${cy}px)`;
      $('.cursor-ring', cursor).style.translate = `${rx - cx}px ${ry - cy}px`;
    });
    document.addEventListener('mouseover', e => {
      if (e.target.closest('a, button, [data-magnetic]')) cursor.classList.add('is-hover');
    });
    document.addEventListener('mouseout', e => {
      if (e.target.closest('a, button, [data-magnetic]')) cursor.classList.remove('is-hover');
    });

    // magnetic pull
    $$('[data-magnetic]').forEach(el => {
      const qx = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3' });
      const qy = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3' });
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        qx((e.clientX - r.left - r.width / 2) * 0.32);
        qy((e.clientY - r.top - r.height / 2) * 0.32);
      });
      el.addEventListener('mouseleave', () => {
        gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.35)' });
      });
    });
  } else {
    cursor.remove();
  }

  /* ------------------------------------------------------------------
     NAV ACTIONS
  ------------------------------------------------------------------ */
  const toTop = e => { e.preventDefault(); lenis.scrollTo(0, { duration: 3, easing: x => 1 - Math.pow(1 - x, 4) }); };
  $('.wordmark').addEventListener('click', toTop);
  $('#replayBtn').addEventListener('click', toTop);

  /* ------------------------------------------------------------------
     LOADER — waits for film v1, then opens the aperture
  ------------------------------------------------------------------ */
  const ticksG = $('.loader-ticks');
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const maj = i % 5 === 0;
    const r1 = maj ? 50 : 53, r2 = 57;
    const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    l.setAttribute('x1', 60 + Math.cos(a) * r1); l.setAttribute('y1', 60 + Math.sin(a) * r1);
    l.setAttribute('x2', 60 + Math.cos(a) * r2); l.setAttribute('y2', 60 + Math.sin(a) * r2);
    if (maj) l.classList.add('maj');
    ticksG.appendChild(l);
  }

  const v1 = videos.v1.el;
  const ring = $('.loader-ring');
  const RING_LEN = 276.46;
  const t0 = performance.now();
  let done = false;

  const loadTick = setInterval(() => {
    let f = 0;
    try { if (v1.buffered.length && v1.duration) f = v1.buffered.end(v1.buffered.length - 1) / v1.duration; } catch (e) {}
    const elapsed = (performance.now() - t0) / 1000;
    const shown = Math.min(Math.max(f, elapsed / 6), v1.readyState >= 3 ? 1 : 0.92);
    ring.style.strokeDashoffset = (RING_LEN * (1 - shown)).toFixed(2);
    $('#loadPct').textContent = String(Math.round(shown * 100)).padStart(2, '0');
    if (shown >= 1 && document.fonts.status === 'loaded' && elapsed > 1.4 && !done) {
      done = true; clearInterval(loadTick); openFilm();
    }
  }, 90);

  function openFilm() {
    $('#loadStatus').textContent = 'MOVEMENT CALIBRATED';
    measure();
    gsap.ticker.add(tick);
    seedDust();
    if (!reduced) gsap.ticker.add(drawDust);

    const heroChars = $$('[data-ui="0"] .char');
    const heroRise = $$('[data-ui="0"] .rise');
    gsap.set(heroChars, { yPercent: 115 });
    gsap.set(heroRise, { autoAlpha: 0, y: 24 });

    const tl = gsap.timeline({
      onComplete: () => {
        document.body.removeAttribute('data-loading');
        lenis.start();
        ScrollTrigger.refresh();
        // warm the rest of the reels, one by one
        ['v2', 'v3', 'v4', 'v5', 'v6', 'v8'].forEach((id, k) => setTimeout(() => warm(id), 900 * (k + 1)));
      },
    });
    tl.to('.loader-core', { autoAlpha: 0, duration: 0.55, ease: 'power2.in' })
      .to('.loader-panel--t', { yPercent: -101, duration: 1.25, ease: 'power4.inOut' }, 0.35)
      .to('.loader-panel--b', { yPercent: 101, duration: 1.25, ease: 'power4.inOut' }, 0.35)
      .set('#loader', { display: 'none' })
      .to(heroChars, { yPercent: 0, duration: 1.3, stagger: 0.028, ease: 'power4.out' }, 0.85)
      .to(heroRise, { autoAlpha: 1, y: 0, duration: 1.0, stagger: 0.14, ease: 'power3.out' }, 1.35);
  }

  /* ------------------------------------------------------------------
     RESIZE
  ------------------------------------------------------------------ */
  let rto;
  addEventListener('resize', () => {
    clearTimeout(rto);
    rto = setTimeout(() => { measure(); seedDust(); ScrollTrigger.refresh(); }, 180);
  });

  measure();
})();
