/* =========================================================================
   The Beauty · main.js
   Everything here is an enhancement: the page is complete without it.
   Order: helpers → hours → tabs → menu overlay → anchors → motion (GSAP).
   ========================================================================= */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = root.classList.contains('rm');
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var G = window.gsap;
  var smoother = null;

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  var yearEl = $('[data-year]');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------------------------------------------------------------------
     Hand-drawn circle path (used by tabs and link hovers).
     Starts a little inside, spirals out and overshoots its start, like a pen.
     --------------------------------------------------------------------- */
  function rnd(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
  function roughEllipse(w, h, seed) {
    var r = rnd(seed || 7), n = 26, cx = w / 2, cy = h / 2, pts = [];
    var start = -Math.PI * 0.72 + (r() - 0.5) * 0.3, span = Math.PI * 2 * 1.09;
    for (var i = 0; i <= n; i++) {
      var t = i / n, a = start + span * t;
      var k = 0.95 + t * 0.09 + (r() - 0.5) * 0.035;
      pts.push([cx + Math.cos(a) * (w / 2) * k, cy + Math.sin(a) * (h / 2) * k * (1 + (r() - 0.5) * 0.04)]);
    }
    var d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (var j = 0; j < pts.length - 1; j++) {
      var p0 = pts[j - 1] || pts[j], p1 = pts[j], p2 = pts[j + 1], p3 = pts[j + 2] || p2;
      d += 'C' + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) + ' ' + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1) + ' ' +
        (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) + ' ' + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1) + ' ' +
        p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
    }
    return d;
  }

  /* ---------------------------------------------------------------------
     Opening hours and live status, in South African time
     --------------------------------------------------------------------- */
  var HOURS = { 0: null, 1: [8, 17], 2: [8, 18], 3: [8, 18], 4: [8, 18], 5: [8, 18], 6: [8, 15] };
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  function hh(h) { return (h < 10 ? '0' : '') + h + ':00'; }
  function nowJHB() {
    try {
      var o = {};
      new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Johannesburg', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
        .formatToParts(new Date()).forEach(function (p) { o[p.type] = p.value; });
      return { d: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(o.weekday), m: (+o.hour % 24) * 60 + (+o.minute) };
    } catch (e) {
      var d0 = new Date(), n = new Date(d0.getTime() + d0.getTimezoneOffset() * 60000 + 7200000);
      return { d: n.getDay(), m: n.getHours() * 60 + n.getMinutes() };
    }
  }
  function updateStatus() {
    var n = nowJHB(), h = HOURS[n.d], cls = '', shortT, longT;
    if (n.d < 0) return;
    if (h && n.m >= h[0] * 60 && n.m < h[1] * 60) {
      var left = h[1] * 60 - n.m;
      if (left <= 45) { cls = 'is-soon'; shortT = 'Closing at ' + hh(h[1]); longT = 'Closing soon, at ' + hh(h[1]); }
      else { cls = 'is-open'; shortT = 'Open · till ' + hh(h[1]); longT = 'Open now, until ' + hh(h[1]) + ' today'; }
    } else if (h && n.m < h[0] * 60) {
      shortT = 'Opens ' + hh(h[0]); longT = 'Closed right now. Opens today at ' + hh(h[0]);
    } else {
      for (var i = 1; i <= 7; i++) {
        var dd = (n.d + i) % 7;
        if (HOURS[dd]) {
          var when = i === 1 ? 'tomorrow' : DAYS[dd];
          shortT = 'Opens ' + (i === 1 ? 'tomorrow' : DAYS[dd].slice(0, 3)) + ' ' + hh(HOURS[dd][0]);
          longT = 'Closed now. Opens ' + when + ' at ' + hh(HOURS[dd][0]);
          break;
        }
      }
    }
    $$('[data-status]').forEach(function (el) {
      el.classList.remove('is-open', 'is-soon');
      if (cls) el.classList.add(cls);
      var t = $('.status__text', el);
      if (t) t.textContent = el.getAttribute('data-status') === 'short' ? shortT : longT;
    });
    $$('.hours__table tr').forEach(function (tr) { tr.classList.toggle('is-today', +tr.getAttribute('data-day') === n.d); });
  }
  updateStatus();
  setInterval(updateStatus, 60000);

  /* ---------------------------------------------------------------------
     Menu tabs (ARIA tabs: arrows, Home, End)
     --------------------------------------------------------------------- */
  var tablist = $('.tabs');
  var tabs = tablist ? $$('[role="tab"]', tablist) : [];
  var tabRing = tablist ? $('.tabs__ring', tablist) : null;
  var tabRingPath = tabRing ? $('path', tabRing) : null;
  var refreshTimer = null;

  function placeRing(tab, animate) {
    if (!tabRing || !tab) return;
    var px = 8, py = 5;
    var w = tab.offsetWidth + px * 2, h = tab.offsetHeight + py * 2;
    tabRing.style.width = w + 'px';
    tabRing.style.height = h + 'px';
    tabRing.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    tabRing.style.left = (tab.offsetLeft - px) + 'px';
    tabRing.style.top = (tab.offsetTop - py) + 'px';
    tabRingPath.setAttribute('d', roughEllipse(w, h, tabs.indexOf(tab) * 131 + 17));
    if (G && window.DrawSVGPlugin && animate && !reduce) {
      G.fromTo(tabRingPath, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: 0.75, ease: 'power2.inOut' });
    } else if (G && window.DrawSVGPlugin) {
      G.set(tabRingPath, { drawSVG: '0% 100%' });
    }
  }

  function selectTab(tab, opts) {
    opts = opts || {};
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      if (!panel) return;
      if (on) panel.removeAttribute('data-inactive'); else panel.setAttribute('data-inactive', '');
    });
    if (opts.focus) tab.focus();
    placeRing(tab, !opts.instant);
    if (tablist.scrollWidth > tablist.clientWidth + 2) {
      var target = tab.offsetLeft - (tablist.clientWidth - tab.offsetWidth) / 2;
      tablist.scrollTo({ left: target, behavior: reduce ? 'auto' : 'smooth' });
    }
    var panel = document.getElementById(tab.getAttribute('aria-controls'));
    if (G && !reduce && !opts.instant && panel) {
      G.fromTo($$('.item, .group__title', panel), { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', stagger: 0.022, overwrite: true });
    }
    if (window.ScrollTrigger) {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(function () { ScrollTrigger.refresh(); }, 120);
    }
  }

  if (tablist) {
    tabs.forEach(function (t) {
      t.addEventListener('click', function () { selectTab(t); });
      t.addEventListener('keydown', function (e) {
        var i = tabs.indexOf(t), n = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = tabs[(i + 1) % tabs.length];
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === 'Home') n = tabs[0];
        else if (e.key === 'End') n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); selectTab(n, { focus: true }); }
      });
    });
    var placeCurrent = function () { placeRing(tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0], false); };
    window.addEventListener('resize', placeCurrent);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeCurrent);
    placeCurrent();
  }

  /* ---------------------------------------------------------------------
     Scrolling to sections (works with and without smooth scrolling)
     --------------------------------------------------------------------- */
  function goTo(target) {
    if (!target) return;
    if (target.id === 'top') {
      if (smoother) smoother.scrollTo(0, true); else window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    } else if (smoother) {
      smoother.scrollTo(target, true, 'top 70px');
    } else {
      target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }
    // move keyboard focus to the section as well, so the next Tab continues from there
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }

  /* ---------------------------------------------------------------------
     Mobile menu overlay
     --------------------------------------------------------------------- */
  var nav = $('[data-nav]');
  var toggle = $('.nav__toggle');
  var overlay = $('#overlay');
  var overlayOpen = false;

  function openOverlay() {
    overlayOpen = true;
    overlay.hidden = false;
    nav.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    if (G) G.set(nav, { yPercent: 0 });
    if (smoother) smoother.paused(true); else document.body.style.overflow = 'hidden';
    if (G && !reduce) {
      var r = toggle.getBoundingClientRect();
      var at = ' at ' + (r.left + r.width / 2) + 'px ' + (r.top + r.height / 2) + 'px)';
      G.fromTo(overlay, { clipPath: 'circle(0px' + at }, { clipPath: 'circle(' + Math.hypot(innerWidth, innerHeight) + 'px' + at, duration: 0.8, ease: 'power3.inOut' });
      G.fromTo($$('.overlay__links a, .overlay__foot > *', overlay), { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out', stagger: 0.05, delay: 0.25 });
    }
    var first = $('a', overlay);
    if (first) first.focus({ preventScroll: true });
  }
  function closeOverlay(then) {
    if (!overlayOpen) { if (then) then(); return; }
    overlayOpen = false;
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    function done() {
      overlay.hidden = true;
      overlay.style.clipPath = '';
      if (smoother) smoother.paused(false); else document.body.style.overflow = '';
      if (then) then();
    }
    if (G && !reduce) {
      var r = toggle.getBoundingClientRect();
      var at = ' at ' + (r.left + r.width / 2) + 'px ' + (r.top + r.height / 2) + 'px)';
      G.to(overlay, { clipPath: 'circle(0px' + at, duration: 0.55, ease: 'power3.inOut', onComplete: done });
    } else done();
  }
  if (toggle && overlay) {
    toggle.addEventListener('click', function () { if (overlayOpen) { closeOverlay(); toggle.focus(); } else openOverlay(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlayOpen) { closeOverlay(); toggle.focus(); }
      if (e.key === 'Tab' && overlayOpen) {
        var f = [toggle].concat($$('a', overlay));
        var i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    });
    window.addEventListener('resize', function () { if (overlayOpen && innerWidth > 900) closeOverlay(); });
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    var target = id ? document.getElementById(id) : null;
    if (!target) return;
    e.preventDefault();
    var tabKey = a.getAttribute('data-tab');
    if (tabKey) {
      var t = document.getElementById('tab-' + tabKey);
      if (t) selectTab(t, { instant: true });
    }
    closeOverlay(function () {
      goTo(target);
      if (tabKey) setTimeout(function () { placeCurrentSafe(true); }, 900);
    });
  });
  function placeCurrentSafe(animate) {
    var cur = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0];
    placeRing(cur, animate);
  }

  /* ---------------------------------------------------------------------
     Reviews rail: buttons, progress, mouse drag with momentum
     --------------------------------------------------------------------- */
  var rail = $('.rail');
  if (rail) {
    var bar = $('.rail__progress i');
    var prev = $('[data-rail="prev"]'), next = $('[data-rail="next"]');
    var railMax = function () { return Math.max(0, rail.scrollWidth - rail.clientWidth); };
    var railUpdate = function () {
      var m = railMax(), p = m ? rail.scrollLeft / m : 1;
      if (bar) bar.style.transform = 'scaleX(' + (0.12 + 0.88 * p).toFixed(4) + ')';
      if (prev) prev.disabled = rail.scrollLeft < 4;
      if (next) next.disabled = rail.scrollLeft > m - 4;
    };
    rail.addEventListener('scroll', railUpdate, { passive: true });
    window.addEventListener('resize', railUpdate);
    railUpdate();

    var step = function (dir) {
      var card = rail.querySelector('.review');
      var amount = (card ? card.offsetWidth + 18 : 320) * (innerWidth > 900 ? 2 : 1) * dir;
      var target = clamp(rail.scrollLeft + amount, 0, railMax());
      if (G && fine && !reduce) G.to(rail, { scrollLeft: target, duration: 0.9, ease: 'power3.inOut', overwrite: true });
      else rail.scrollBy({ left: amount, behavior: reduce ? 'auto' : 'smooth' });
    };
    if (prev) prev.addEventListener('click', function () { step(-1); });
    if (next) next.addEventListener('click', function () { step(1); });
    rail.addEventListener('keydown', function (e) {
      if (e.target !== rail) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    });

    if (fine) {
      rail.classList.add('is-draggable');
      var down = false, sx = 0, sl = 0, lx = 0, lt = 0, vel = 0, moved = 0;
      rail.addEventListener('pointerdown', function (e) {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        down = true; moved = 0; sx = lx = e.clientX; sl = rail.scrollLeft; lt = performance.now(); vel = 0;
        if (G) G.killTweensOf(rail);
        rail.classList.add('is-dragging');
      });
      window.addEventListener('pointermove', function (e) {
        if (!down) return;
        var dx = e.clientX - sx;
        moved = Math.max(moved, Math.abs(dx));
        rail.scrollLeft = sl - dx;
        var now = performance.now(), dt = now - lt;
        if (dt > 0) vel = vel * 0.7 + ((e.clientX - lx) / dt) * 0.3;
        lx = e.clientX; lt = now;
      });
      window.addEventListener('pointerup', function () {
        if (!down) return;
        down = false;
        rail.classList.remove('is-dragging');
        if (performance.now() - lt > 90) vel = 0;
        var target = clamp(rail.scrollLeft - vel * 380, 0, railMax());
        if (G && !reduce) G.to(rail, { scrollLeft: target, duration: 1, ease: 'power3.out', overwrite: true });
      });
      rail.addEventListener('click', function (e) { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);
      rail.addEventListener('dragstart', function (e) { e.preventDefault(); });
    }
  }

  /* ---------------------------------------------------------------------
     Without GSAP, or with reduced motion, stop here: the page is complete.
     --------------------------------------------------------------------- */
  if (!G) { root.classList.add('is-ready'); showHeroNow(); return; }

  G.registerPlugin(ScrollTrigger, ScrollSmoother, SplitText, DrawSVGPlugin);
  var ring = window.BeautyRing && !root.classList.contains('no-webgl') ? window.BeautyRing.state : null;

  // smooth scrolling for mouse and trackpad only; touch keeps native scrolling
  if (fine && !reduce) {
    smoother = ScrollSmoother.create({
      wrapper: '#smooth-wrapper', content: '#smooth-content', smooth: 1.1, effects: true, smoothTouch: false,
      // sections focused by our own links are already being scrolled to; don't let focus handling jump the page
      onFocusIn: function (self, e) { return e.target.getAttribute('tabindex') !== '-1'; }
    });
  }

  // nav: glass background once scrolled, hides on the way down, returns on the way up
  var floatWa = $('.float-wa');
  var navShown = true;
  function showNav(v) {
    if (navShown === v) return;
    navShown = v;
    G.to(nav, { yPercent: v ? 0 : -170, duration: v ? 0.6 : 0.45, ease: v ? 'power3.out' : 'power2.in', overwrite: true });
  }
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: function (self) {
      var y = self.scroll();
      nav.classList.toggle('is-scrolled', y > 30);
      if (floatWa) floatWa.classList.toggle('is-shown', y > innerHeight * 0.85);
      if (overlayOpen || reduce) return;
      if (self.direction === 1 && y > 500) showNav(false);
      else if (self.direction === -1) showNav(true);
    }
  });
  nav.addEventListener('focusin', function () { showNav(true); });

  // current section in the nav
  $$('.nav__links a').forEach(function (a) {
    var sec = document.getElementById(a.getAttribute('href').slice(1));
    if (!sec) return;
    ScrollTrigger.create({
      trigger: sec, start: 'top 45%', end: 'bottom 45%',
      onToggle: function (self) { a.classList.toggle('is-active', self.isActive); }
    });
  });

  if (reduce) {
    root.classList.add('is-ready');
    showHeroNow();
    if (ring) { ring.draw = 1; window.BeautyRing.render(); }
    return;
  }

  function showHeroNow() {
    $$('.hero__title, .hero__sub, .hero__foot > *, .hero__corner, .hero__scroll').forEach(function (el) { el.style.opacity = 1; });
  }

  /* ---------------------------------------------------------------------
     Hero intro: the brush paints the ring, then the name rises through it
     --------------------------------------------------------------------- */
  function intro() {
    root.classList.add('is-ready');
    var lines = $$('.hero__line');
    var split = SplitText.create(lines, { type: 'chars', mask: 'chars', charsClass: 'ch', tag: 'span', aria: 'none' });
    var tl = G.timeline({ delay: 0.1 });
    if (ring) tl.to(ring, { draw: 1, duration: 2.2, ease: 'power2.inOut' }, 0);
    else tl.fromTo('.hero__fallback', { rotation: -40, opacity: 0 }, { rotation: 0, opacity: 1, duration: 1.6, ease: 'power3.out' }, 0);
    tl.set('.hero__title', { opacity: 1 }, 0.45)
      .fromTo(split.chars, { yPercent: 115 }, { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.05 }, 0.45)
      .fromTo('.hero__sub', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out' }, 1.05)
      .fromTo('.hero__corner', { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.1 }, 1.2)
      .fromTo('.hero__foot > *', { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.09 }, 1.25)
      .fromTo('.hero__scroll', { opacity: 0 }, { opacity: 1, duration: 1 }, 1.8);

    // on the way out: the ring swells and fades, the name sinks back
    G.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
      .to('.hero__center', { y: () => innerHeight * 0.18, scale: 0.94, opacity: 0, ease: 'none' }, 0)
      .to('.hero__foot', { y: 70, opacity: 0, ease: 'none' }, 0)
      .to('.hero__corner', { opacity: 0, ease: 'none', duration: 0.5 }, 0)
      .to('.hero__fallback', { scale: 1.5, opacity: 0, ease: 'none' }, 0);
    if (ring) {
      ScrollTrigger.create({
        trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true,
        onUpdate: function (self) { ring.grow = 1 + self.progress * 0.75; ring.alpha = 1 - self.progress * 0.9; }
      });
    }
  }

  /* ---------------------------------------------------------------------
     Headings: lines rise out of a mask as they enter
     --------------------------------------------------------------------- */
  function headings() {
    $$('[data-split]').forEach(function (el) {
      SplitText.create(el, {
        type: 'lines', mask: 'lines', linesClass: 'ln', autoSplit: true,
        onSplit: function (self) {
          return G.from(self.lines, {
            yPercent: 108, duration: 1.2, ease: 'expo.out', stagger: 0.1,
            scrollTrigger: { trigger: el, start: 'top 86%', once: true }
          });
        }
      });
    });
    $$('.label').forEach(function (el) {
      G.from(el, { opacity: 0, x: -20, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
  }

  /* ---------------------------------------------------------------------
     Marquee: two rows in opposite directions, pushed by scroll speed
     --------------------------------------------------------------------- */
  function marquee() {
    var rows = $$('.marquee__row');
    var tweens = rows.map(function (row, i) {
      var track = $('.marquee__track', row);
      var w = track.offsetWidth || 1;
      var copies = Math.max(1, Math.ceil((innerWidth * 1.6) / w));
      for (var c = 0; c < copies; c++) row.appendChild(track.cloneNode(true));
      var dir = i % 2 ? 1 : -1;
      var tracks = row.children;
      return dir < 0
        ? G.fromTo(tracks, { xPercent: 0 }, { xPercent: -100, ease: 'none', duration: w / 60, repeat: -1 })
        : G.fromTo(tracks, { xPercent: -100 }, { xPercent: 0, ease: 'none', duration: w / 45, repeat: -1 });
    });
    var boost = { v: 1 };
    ScrollTrigger.create({
      trigger: '.marquee', start: 'top bottom', end: 'bottom top',
      onUpdate: function (self) {
        var v = clamp(Math.abs(self.getVelocity()) / 250, 0, 6);
        G.to(boost, { v: 1 + v, duration: 0.2, overwrite: true, onUpdate: apply });
        G.to(boost, { v: 1, duration: 1.2, delay: 0.2, ease: 'power2.out', onUpdate: apply });
      },
      onToggle: function (self) { tweens.forEach(function (t) { t.paused(!self.isActive); }); }
    });
    function apply() { tweens.forEach(function (t) { t.timeScale(boost.v); }); }
  }

  /* ---------------------------------------------------------------------
     Welcome
     --------------------------------------------------------------------- */
  function welcome() {
    G.from('.welcome__body > *', { y: 30, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.1, scrollTrigger: { trigger: '.welcome__body', start: 'top 85%', once: true } });
    G.from('.badge', { scale: 0.6, rotation: -60, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.badge', start: 'top 90%', once: true } });
    G.from('.features li', { y: 34, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.07, scrollTrigger: { trigger: '.features', start: 'top 88%', once: true } });
    G.from('.features svg', { scale: 0, rotation: -90, duration: 0.9, ease: 'back.out(2)', stagger: 0.07, scrollTrigger: { trigger: '.features', start: 'top 88%', once: true } });
  }

  /* ---------------------------------------------------------------------
     Rituals: pinned horizontal travel on large screens, stacked elsewhere
     --------------------------------------------------------------------- */
  function rituals() {
    var sec = $('.rituals');
    var track = $('.rituals__track');
    var panels = $$('.ritual');
    var countEl = $('[data-ritual-index]');
    var barEl = $('.rituals__bar i');
    var hintEl = $('.rituals__hint');
    var mm = G.matchMedia();

    mm.add('(min-width: 1024px) and (min-height: 620px)', function () {
      sec.classList.add('is-horizontal');
      var dist = function () { return track.scrollWidth - innerWidth; };
      var travel = G.to(track, {
        x: function () { return -dist(); }, ease: 'none',
        scrollTrigger: {
          trigger: '.rituals__pin', start: 'top top', end: function () { return '+=' + dist(); },
          pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1,
          snap: { snapTo: 1 / (panels.length - 1), inertia: false, directional: false, duration: { min: 0.35, max: 0.9 }, delay: 0.15, ease: 'power2.inOut' },
          onUpdate: function (self) {
            if (barEl) barEl.style.transform = 'scaleX(' + self.progress.toFixed(4) + ')';
            if (countEl) countEl.textContent = '0' + (Math.round(self.progress * (panels.length - 1)) + 1);
            if (hintEl) hintEl.textContent = self.progress > 0.97 ? 'Next: the full menu' : 'Keep scrolling';
          }
        }
      });
      panels.forEach(function (p, i) {
        var ringEl = $('.ritual__ring', p);
        G.fromTo(ringEl, { rotation: i * 118 - 50 }, {
          rotation: i * 118 + 50, ease: 'none',
          scrollTrigger: { trigger: p, containerAnimation: travel, start: 'left right', end: 'right left', scrub: true }
        });
        if (i === 0) return;
        G.from($$('.ritual__copy > *', p), {
          x: 80, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.06,
          scrollTrigger: { trigger: p, containerAnimation: travel, start: 'left 65%', toggleActions: 'play none none reverse' }
        });
        G.from($('.ritual__art', p), {
          scale: 0.8, rotation: -8, opacity: 0.3, ease: 'none',
          scrollTrigger: { trigger: p, containerAnimation: travel, start: 'left right', end: 'left 25%', scrub: true }
        });
      });
      G.from($$('.ritual__copy > *', panels[0]), { y: 40, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.07, scrollTrigger: { trigger: '.rituals__pin', start: 'top 70%', once: true } });
      G.from($('.ritual__art', panels[0]), { scale: 0.85, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.rituals__pin', start: 'top 75%', once: true } });
      return function () { sec.classList.remove('is-horizontal'); };
    });

    mm.add('not all and (min-width: 1024px) and (min-height: 620px)', function () {
      panels.forEach(function (p) {
        G.from($('.ritual__art', p), { scale: 0.82, rotation: -10, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: p, start: 'top 85%', once: true } });
        G.from($$('.ritual__copy > *', p), { y: 34, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.06, scrollTrigger: { trigger: $('.ritual__copy', p), start: 'top 88%', once: true } });
      });
    });
  }

  /* ---------------------------------------------------------------------
     Menu, reviews, team, mobile band, visit, footer
     --------------------------------------------------------------------- */
  function sections() {
    G.from('.tabs .tab', { y: 20, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.04, scrollTrigger: { trigger: '.tabs', start: 'top 88%', once: true, onEnter: function () { setTimeout(function () { placeCurrentSafe(true); }, 350); } } });
    G.from('.panel:not([data-inactive]) .item', { y: 20, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.03, scrollTrigger: { trigger: '.panels', start: 'top 85%', once: true } });
    G.from('.menu__foot', { y: 40, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.menu__foot', start: 'top 92%', once: true } });

    // reviews
    var count = $('[data-count]');
    if (count) {
      var n = { v: 0 }, end = +count.getAttribute('data-count');
      count.textContent = '0';
      G.to(n, { v: end, duration: 2.2, ease: 'power2.out', scrollTrigger: { trigger: '.score', start: 'top 90%', once: true }, onUpdate: function () { count.textContent = Math.round(n.v); } });
    }
    G.from('.score__num', { yPercent: 40, opacity: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: '.score', start: 'top 90%', once: true } });
    G.from('.score__stars svg', { scale: 0, rotation: -120, duration: 0.8, ease: 'back.out(2.2)', stagger: 0.08, scrollTrigger: { trigger: '.score', start: 'top 90%', once: true } });
    G.from('.review', { x: 120, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: 0.07, scrollTrigger: { trigger: '.rail', start: 'top 88%', once: true } });

    // team
    G.from('.member', { y: 60, opacity: 0, duration: 1.1, ease: 'power3.out', stagger: 0.12, scrollTrigger: { trigger: '.team__grid', start: 'top 88%', once: true } });
    G.from('.member__mono svg', { rotation: -200, scale: 0.6, duration: 1.6, ease: 'expo.out', stagger: 0.12, scrollTrigger: { trigger: '.team__grid', start: 'top 88%', once: true } });

    // mobile band
    var big = $('.mobile__big');
    if (big) {
      var s = SplitText.create(big, { type: 'chars', mask: 'chars', charsClass: 'ch', tag: 'span', aria: 'none' });
      G.from(s.chars, { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.03, scrollTrigger: { trigger: '.mobile', start: 'top 75%', once: true } });
      G.from('.mobile__title em, .mobile__text, .mobile .btn', { y: 30, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.1, delay: 0.3, scrollTrigger: { trigger: '.mobile', start: 'top 75%', once: true } });
    }

    // visit
    G.from('.visit__address, .visit__perks li, .visit__ctas', { y: 26, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08, scrollTrigger: { trigger: '.visit__grid', start: 'top 80%', once: true } });
    G.from('.hours', { y: 50, opacity: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: '.hours', start: 'top 90%', once: true } });
    G.from('.hours__table tr', { x: -16, opacity: 0, duration: 0.7, ease: 'power3.out', stagger: 0.05, delay: 0.2, scrollTrigger: { trigger: '.hours', start: 'top 90%', once: true } });
    G.fromTo('.map', { clipPath: 'inset(14% 10% 14% 10% round 32px)' }, { clipPath: 'inset(0% 0% 0% 0% round 32px)', ease: 'none', scrollTrigger: { trigger: '.map', start: 'top bottom', end: 'center 60%', scrub: true } });
    G.from('.map__pin', { scale: 0, rotation: -180, duration: 1.2, ease: 'back.out(1.6)', scrollTrigger: { trigger: '.map', start: 'top 60%', once: true } });

    // footer
    G.from('.footer__line, .footer__cta .btn', { y: 40, opacity: 0, duration: 1.1, ease: 'power3.out', stagger: 0.1, scrollTrigger: { trigger: '.footer', start: 'top 80%', once: true } });
    var word = $('.footer__word');
    if (word) {
      G.fromTo(word, { yPercent: 35, clipPath: 'inset(0% 0% 100% 0%)' }, { yPercent: 0, clipPath: 'inset(0% 0% -10% 0%)', duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: word, start: 'top 98%', once: true } });
      // gold light follows the pointer across the wordmark; drifts on its own on touch screens
      var pos = { x: 50, y: 50 };
      var paint = function () { word.style.setProperty('--mx', pos.x.toFixed(1) + '%'); word.style.setProperty('--my', pos.y.toFixed(1) + '%'); };
      if (fine) {
        var qx = G.quickTo(pos, 'x', { duration: 0.9, ease: 'power3', onUpdate: paint });
        var qy = G.quickTo(pos, 'y', { duration: 0.9, ease: 'power3', onUpdate: paint });
        $('.footer').addEventListener('pointermove', function (e) {
          var r = word.getBoundingClientRect();
          qx((e.clientX - r.left) / r.width * 100);
          qy((e.clientY - r.top) / r.height * 100);
        });
      } else {
        G.fromTo(pos, { x: 5 }, { x: 95, duration: 6, ease: 'sine.inOut', yoyo: true, repeat: -1, onUpdate: paint });
      }
    }
  }

  /* ---------------------------------------------------------------------
     Pointer niceties: cursor ring, magnetic buttons, hand-drawn circles
     --------------------------------------------------------------------- */
  function pointer() {
    // button fill grows from where the pointer entered
    $$('.btn').forEach(function (b) {
      b.addEventListener('pointerenter', function (e) {
        var r = b.getBoundingClientRect();
        b.style.setProperty('--x', (e.clientX - r.left) + 'px');
        b.style.setProperty('--y', (e.clientY - r.top) + 'px');
      });
    });
    if (!fine) return;

    root.classList.add('has-cursor');
    var cur = $('.cursor'), label = $('.cursor__label');
    G.set(cur, { x: -100, y: -100 });
    var xTo = G.quickTo(cur, 'x', { duration: 0.35, ease: 'power3' });
    var yTo = G.quickTo(cur, 'y', { duration: 0.35, ease: 'power3' });
    var last = { x: -100, y: -100 };
    function check(el) {
      if (!el || !el.closest) return;
      var hit = el.closest('[data-cursor], a, button, .item, [role="tab"]');
      var lab = hit ? hit.getAttribute('data-cursor') : null;
      if (hit && !lab && hit.classList.contains('item')) lab = 'Book';
      cur.classList.toggle('is-label', !!lab);
      cur.classList.toggle('is-link', !!hit && !lab);
      cur.classList.toggle('is-hidden', !!el.closest('.map'));
      if (lab) label.textContent = lab;
    }
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      last.x = e.clientX; last.y = e.clientY;
      xTo(e.clientX); yTo(e.clientY);
      check(e.target);
    }, { passive: true });
    window.addEventListener('scroll', function () {
      requestAnimationFrame(function () { check(document.elementFromPoint(last.x, last.y)); });
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', function () { cur.classList.add('is-hidden'); });
    document.documentElement.addEventListener('pointerenter', function () { cur.classList.remove('is-hidden'); });

    // magnetic buttons
    $$('[data-magnetic]').forEach(function (b) {
      var bx = G.quickTo(b, 'x', { duration: 0.6, ease: 'power3' });
      var by = G.quickTo(b, 'y', { duration: 0.6, ease: 'power3' });
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        bx((e.clientX - r.left - r.width / 2) * 0.22);
        by((e.clientY - r.top - r.height / 2) * 0.3);
      });
      b.addEventListener('pointerleave', function () { bx(0); by(0); });
    });

    // a pen circle drawn around links on hover
    var NS = 'http://www.w3.org/2000/svg';
    $$('[data-brush]').forEach(function (a, i) {
      var svg = null, path = null;
      a.addEventListener('pointerenter', function () {
        var w = a.offsetWidth + 28, h = a.offsetHeight + 14;
        if (!svg) {
          svg = document.createElementNS(NS, 'svg');
          svg.setAttribute('class', 'brush');
          svg.setAttribute('aria-hidden', 'true');
          path = document.createElementNS(NS, 'path');
          svg.appendChild(path);
          a.appendChild(svg);
        }
        svg.setAttribute('width', w); svg.setAttribute('height', h);
        svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
        svg.style.left = '-14px'; svg.style.top = '-7px';
        path.setAttribute('d', roughEllipse(w, h, i * 97 + 31));
        G.fromTo(path, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: 0.6, ease: 'power2.inOut', overwrite: true });
      });
      a.addEventListener('pointerleave', function () {
        if (path) G.to(path, { drawSVG: '100% 100%', duration: 0.45, ease: 'power2.in', overwrite: true });
      });
    });
  }

  /* ---------------------------------------------------------------------
     Go
     --------------------------------------------------------------------- */
  var started = false;
  function start() {
    if (started) return;
    started = true;
    intro();
    headings();
    marquee();
    welcome();
    rituals();
    sections();
    pointer();
    ScrollTrigger.refresh();
    if (location.hash) {
      var t = document.getElementById(location.hash.slice(1));
      if (t) setTimeout(function () { goTo(t); }, 200);
    }
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(start);
    setTimeout(start, 1500);
  } else start();
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
