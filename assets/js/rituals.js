/* =========================================================================
   The Beauty · rituals.js
   The three ritual artworks:
     Face  – a pearl with a moving dew highlight, drifting droplets and a gold orbit
     Body  – silk threads that ripple and part around the pointer
     Nails – a gel swatch fan with a sliding gloss and a shade picker
   Each canvas only animates while it is on screen.
   ========================================================================= */
(function () {
  'use strict';

  var reduce = document.documentElement.classList.contains('rm');
  var DPR = Math.min(window.devicePixelRatio || 1, 2);

  function onScreen(el, cb) {
    if (!('IntersectionObserver' in window)) { cb(true); return; }
    new IntersectionObserver(function (en) { cb(en[0].isIntersecting); }, { rootMargin: '80px' }).observe(el);
  }

  function setup(canvas, draw) {
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    var w = 0, h = 0, visible = false, running = false, t0 = performance.now();
    var pointer = { x: 0.62, y: 0.3, tx: 0.62, ty: 0.3, inside: false, active: 0 };

    function size() {
      var r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = Math.max(1, Math.round(w * DPR));
      canvas.height = Math.max(1, Math.round(h * DPR));
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      if (reduce || !running) tick(t0 + 4000);
    }
    function tick(now) {
      running = false;
      pointer.x += (pointer.tx - pointer.x) * 0.07;
      pointer.y += (pointer.ty - pointer.y) * 0.07;
      pointer.active += ((pointer.inside ? 1 : 0) - pointer.active) * 0.06;
      ctx.clearRect(0, 0, w, h);
      draw(ctx, w, h, (now - t0) / 1000, pointer);
      if (!reduce && visible) { running = true; requestAnimationFrame(tick); }
    }
    var host = canvas.parentElement;
    host.addEventListener('pointermove', function (e) {
      var r = canvas.getBoundingClientRect();
      pointer.tx = (e.clientX - r.left) / r.width;
      pointer.ty = (e.clientY - r.top) / r.height;
      pointer.inside = true;
    });
    host.addEventListener('pointerleave', function () { pointer.inside = false; pointer.tx = 0.62; pointer.ty = 0.3; });
    new ResizeObserver(size).observe(canvas);
    onScreen(canvas, function (v) {
      visible = v;
      if (v && !running && !reduce) { running = true; requestAnimationFrame(tick); }
    });
    size();
  }

  /* ---------- Face: pearl ---------- */
  var drops = [];
  for (var i = 0; i < 9; i++) {
    drops.push({ a: Math.random() * Math.PI * 2, d: 0.25 + Math.random() * 0.62, s: 0.02 + Math.random() * 0.035, v: 0.02 + Math.random() * 0.05, o: Math.random() * 10 });
  }
  function pearl(ctx, w, h, t, p) {
    var cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.3;
    // light direction follows the pointer
    var lx = (p.x - 0.5) * 2, ly = (p.y - 0.5) * 2;
    var ll = Math.hypot(lx, ly) || 1;
    if (ll > 1) { lx /= ll; ly /= ll; }
    var hx = cx + lx * R * 0.52, hy = cy + ly * R * 0.52;

    // warm glow behind
    var glow = ctx.createRadialGradient(cx, cy, R * 0.6, cx, cy, R * 2.1);
    glow.addColorStop(0, 'rgba(201,169,110,.20)');
    glow.addColorStop(1, 'rgba(201,169,110,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    // orbit, back half
    var tilt = -0.32, orx = R * 1.5, ory = R * 0.34;
    function orbit(from, to, alpha) {
      ctx.save();
      ctx.translate(cx, cy); ctx.rotate(tilt);
      ctx.beginPath(); ctx.ellipse(0, 0, orx, ory, 0, from, to);
      ctx.strokeStyle = 'rgba(234,213,166,' + alpha + ')'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.restore();
    }
    orbit(Math.PI, Math.PI * 2, 0.28);
    var ba = t * 0.35;
    var bx = Math.cos(ba) * orx, by = Math.sin(ba) * ory;
    function bead() {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(tilt);
      var g = ctx.createRadialGradient(bx - 2, by - 2, 0, bx, by, 7);
      g.addColorStop(0, '#FFF6DE'); g.addColorStop(0.5, '#C9A96E'); g.addColorStop(1, '#6B5024');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, 6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    if (Math.sin(ba) < 0) bead();

    // the pearl
    var body = ctx.createRadialGradient(hx, hy, R * 0.05, cx, cy, R * 1.02);
    body.addColorStop(0, '#FFFBF3');
    body.addColorStop(0.28, '#F1E7D8');
    body.addColorStop(0.62, '#CDBBA0');
    body.addColorStop(0.9, '#7E6A51');
    body.addColorStop(1, '#4A3D2E');
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
    // nacre: a slowly turning wash of pastel colour
    if (ctx.createConicGradient) {
      var cg = ctx.createConicGradient(t * 0.12, cx, cy);
      cg.addColorStop(0, 'rgba(255,190,200,.22)');
      cg.addColorStop(0.25, 'rgba(190,220,255,.18)');
      cg.addColorStop(0.5, 'rgba(210,255,225,.16)');
      cg.addColorStop(0.75, 'rgba(255,225,170,.22)');
      cg.addColorStop(1, 'rgba(255,190,200,.22)');
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = cg; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
      ctx.globalCompositeOperation = 'source-over';
    }
    // rim light opposite the key light
    var rim = ctx.createRadialGradient(cx - lx * R * 0.2, cy - ly * R * 0.2, R * 0.78, cx, cy, R);
    rim.addColorStop(0, 'rgba(255,240,215,0)');
    rim.addColorStop(1, 'rgba(255,236,205,.35)');
    ctx.fillStyle = rim; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

    // dew drops sliding over the surface
    for (var k = 0; k < drops.length; k++) {
      var d = drops[k];
      var a = d.a + Math.sin(t * d.v + d.o) * 0.4;
      var dd = d.d + Math.sin(t * d.v * 1.7 + d.o) * 0.05;
      var x = cx + Math.cos(a) * dd * R, y = cy + Math.sin(a) * dd * R;
      var s = d.s * R * (1 - dd * 0.35);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      ctx.scale(1 - dd * 0.4, 1);
      var dg = ctx.createRadialGradient(-s * 0.2, -s * 0.2, 0, 0, 0, s);
      dg.addColorStop(0, 'rgba(255,255,255,.05)');
      dg.addColorStop(0.7, 'rgba(120,95,65,.16)');
      dg.addColorStop(1, 'rgba(70,55,40,.32)');
      ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      ctx.beginPath(); ctx.arc(lx * s * 0.45, ly * s * 0.45, s * 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    // specular highlight
    var sp = ctx.createRadialGradient(hx, hy, 0, hx, hy, R * (0.22 + p.active * 0.06));
    sp.addColorStop(0, 'rgba(255,255,255,.95)');
    sp.addColorStop(0.35, 'rgba(255,252,240,.45)');
    sp.addColorStop(1, 'rgba(255,250,235,0)');
    ctx.fillStyle = sp;
    ctx.beginPath(); ctx.arc(hx, hy, R * 0.3, 0, Math.PI * 2); ctx.fill();

    // orbit, front half
    orbit(0, Math.PI, 0.6);
    if (Math.sin(ba) >= 0) bead();
  }

  /* ---------- Body: silk ---------- */
  function silk(ctx, w, h, t, p) {
    var N = w < 420 ? 34 : 46;
    var mx = p.x * w, my = p.y * h, RR = Math.min(w, h) * 0.2, push = 1.3 * p.active;
    var step = Math.max(6, w / 90);
    var grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#9A7840');
    grad.addColorStop(0.45, '#EAD5A6');
    grad.addColorStop(0.7, '#C9A96E');
    grad.addColorStop(1, '#6B5024');
    ctx.strokeStyle = grad;
    for (var i = 0; i < N; i++) {
      var f = i / (N - 1);
      var y0 = h * (0.12 + 0.76 * f);
      var amp = h * (0.045 + 0.03 * Math.sin(f * 3.1 + t * 0.2));
      ctx.globalAlpha = 0.25 + 0.6 * Math.pow(Math.sin(f * Math.PI), 1.5);
      ctx.lineWidth = 0.6 + 0.9 * Math.sin(f * Math.PI);
      ctx.beginPath();
      for (var x = -step; x <= w + step; x += step) {
        var u = x / w;
        var y = y0 +
          Math.sin(u * 5.2 + t * 0.7 + f * 2.4) * amp +
          Math.sin(u * 11.0 - t * 0.45 + f * 5.1) * amp * 0.35 +
          Math.sin(u * 2.1 + t * 0.25 - f * 1.3) * amp * 1.2;
        if (push > 0.01) {
          // threads part smoothly around the pointer, like running a finger through silk
          var dx = x - mx, dy = y - my;
          y += dy * push * Math.exp(-(dx * dx + dy * dy) / (RR * RR));
        }
        if (x === -step) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // soft vignette so the threads melt into the circle's edge
    var v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.28, w / 2, h / 2, Math.min(w, h) * 0.52);
    v.addColorStop(0, 'rgba(21,18,15,0)');
    v.addColorStop(1, 'rgba(21,18,15,.95)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
  }

  document.querySelectorAll('canvas[data-art]').forEach(function (c) {
    setup(c, c.dataset.art === 'pearl' ? pearl : silk);
  });

  /* ---------- Nails: gloss + shade picker ---------- */
  var nails = document.querySelector('.nails');
  if (nails) {
    var art = nails.parentElement;
    var gloss = nails.querySelectorAll('.nail__gloss');
    var fan = nails.querySelector('.nails__fan');
    var gx = 0.3, tx = 0.3, frame = null;
    function paint() {
      frame = null;
      gx += (tx - gx) * 0.12;
      for (var i = 0; i < gloss.length; i++) gloss[i].setAttribute('x', (2 + gx * 38 + (i - 2) * 1.5).toFixed(2));
      if (Math.abs(tx - gx) > 0.002) frame = requestAnimationFrame(paint);
    }
    art.addEventListener('pointermove', function (e) {
      var r = art.getBoundingClientRect();
      tx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      if (!frame) frame = requestAnimationFrame(paint);
    });
    art.addEventListener('pointerleave', function () { tx = 0.3; if (!frame) frame = requestAnimationFrame(paint); });
    paint();

    var buttons = document.querySelectorAll('.shade');
    buttons.forEach(function (b) {
      b.setAttribute('data-cursor', b.textContent.trim());
      b.addEventListener('click', function () {
        buttons.forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
        nails.style.setProperty('--shade', b.dataset.shade);
        nails.classList.toggle('is-french', b.hasAttribute('data-french'));
        if (window.gsap && !reduce) {
          gsap.fromTo(nails.querySelectorAll('.nail'), { y: 0 }, { y: -14, duration: 0.28, ease: 'power2.out', stagger: 0.05, yoyo: true, repeat: 1 });
        }
      });
    });
    if (window.gsap && !reduce && fan) {
      // a slow sway so the fan feels held rather than printed
      gsap.to(fan, { rotation: 2.5, svgOrigin: '200 332', duration: 3.2, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    }
  }
})();
