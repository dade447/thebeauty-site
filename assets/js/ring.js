/* =========================================================================
   The Beauty · ring.js
   The hero's liquid-gold brush ring, drawn in a WebGL fragment shader.
   The ring paints itself on load, bends toward the cursor, catches light
   where the pointer is, and grows as the hero scrolls away.
   main.js drives it through window.BeautyRing.state (draw, grow, alpha).
   ========================================================================= */
(function () {
  'use strict';

  var canvas = document.querySelector('.hero__canvas');
  var box = document.querySelector('.hero__ringbox');
  var root = document.documentElement;
  if (!canvas || !box) return;

  var reduce = root.classList.contains('rm');
  var state = { draw: reduce ? 1 : 0, grow: 1, alpha: 1, hover: 0, mx: 0.35, my: 0.45, ready: false };
  window.BeautyRing = { state: state, render: function () {} };

  var gl = null;
  try {
    gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false, powerPreference: 'high-performance' }) ||
         canvas.getContext('experimental-webgl');
  } catch (e) { gl = null; }
  if (!gl) { root.classList.add('no-webgl'); return; }

  var VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';

  var FRAG = [
    'precision highp float;',
    'uniform vec2 uRes;uniform vec2 uCenter;uniform float uRadius;uniform float uTime;',
    'uniform vec2 uMouse;uniform float uHover;uniform float uDraw;uniform float uAlpha;',
    '#define TAU 6.2831853',
    'float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}',
    'float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);',
    ' return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);}',
    'float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.03+17.1;a*=.5;}return v;}',
    // periodic noise along the ring: sample a circle in noise space
    'float ringNoise(float s,float k,float seed){float a=s*TAU;return fbm(vec2(cos(a),sin(a))*k+seed);}',
    // one pass of the brush. s = position along the stroke (0..1.07), r = distance from centre / radius
    'vec4 stroke(float s,float r,vec2 dir,vec2 m,float t){',
    '  float R=1.+(ringNoise(s,1.3,3.1+t*.03)-.5)*.07+s*.028;',
    '  vec2 md=m;float ml=length(md);',
    '  float pull=uHover*.07*pow(max(dot(dir,md/max(ml,1e-3)),0.),6.)*smoothstep(2.4,.6,ml);',
    '  R+=pull;',
    '  float end=uDraw*1.07;',
    '  float taper=smoothstep(0.,.035,s)*(1.-smoothstep(end-.06,end,s));',
    '  float th=(.052+.03*ringNoise(s,2.2,7.3))*taper*(1.+pull*2.5);',
    '  if(s>end||th<.001) return vec4(0.);',
    '  float v=(r-R)/th;',                                   // -1..1 across the stroke
    '  float rag=(noise(vec2(s*260.,v*2.)+9.)-.5)*.55+(noise(vec2(s*60.,3.))-.5)*.35;',
    '  float d=abs(v)+rag*smoothstep(.2,1.,abs(v));',
    '  float aa=1.4/(uRadius*th);',
    '  float cov=1.-smoothstep(1.-aa,1.+aa,d);',
    // dry-brush bristle gaps, heavier toward the end of the stroke and at the edges
    '  float bristle=noise(vec2(v*9.,s*14.))*.6+noise(vec2(v*23.,s*40.))*.4;',
    '  float dry=.18+.35*smoothstep(.55,1.07,s)+.25*smoothstep(.5,1.,abs(v))+.25*(1.-smoothstep(0.,.05,s));',
    '  cov*=smoothstep(dry-.08,dry+.08,bristle+.25);',
    '  return vec4(cov,v,bristle,R);',
    '}',
    'void main(){',
    '  vec2 px=gl_FragCoord.xy;',
    '  vec2 p=(px-uCenter)/uRadius;',
    '  float r=length(p);',
    '  vec3 gold=vec3(.788,.663,.431);',
    '  float halo=exp(-abs(r-1.)*5.)*.07*uDraw;',
    '  if(abs(r-1.)>.24){gl_FragColor=vec4(gold*halo,halo)*uAlpha;return;}',
    '  vec2 dir=p/max(r,1e-4);',
    '  float t=uTime;',
    '  float a=atan(p.y,p.x);',
    '  float s0=fract((a+2.1)/TAU);',                       // start the stroke at the upper left, like the logo
    '  vec2 m=uMouse;',
    '  vec4 A=stroke(s0,r,dir,m,t);',
    '  vec4 B=s0<.07?stroke(s0+1.,r,dir,m,t):vec4(0.);',    // the overlapping tail where the brush comes round again
    '  vec4 S=B.x>A.x?B:A;',
    '  float cov=max(A.x,B.x);',
    '  if(cov<=.002){gl_FragColor=vec4(gold*halo,halo)*uAlpha;return;}',
    '  float v=clamp(S.y,-1.,1.);',
    // treat the stroke like a rounded tube of polished gold
    '  vec3 N=normalize(vec3(dir*v*.95,sqrt(max(1.-v*v,0.))+.08));',
    '  float g1=noise(vec2(v*14.,s0*90.));',
    '  N=normalize(N+vec3(dir*(g1-.5)*.35,0.));',
    '  vec3 L=normalize(vec3(m-p,.9));',
    '  vec3 L2=normalize(vec3(-.6,.8,.7));',
    '  vec3 V=vec3(0.,0.,1.);',
    '  float dif=max(dot(N,L),0.)*.75+max(dot(N,L2),0.)*.35;',
    '  float spec=pow(max(dot(N,normalize(L+V)),0.),38.)*(.6+uHover*.9);',
    '  float spec2=pow(max(dot(N,normalize(L2+V)),0.),60.)*.35;',
    '  vec3 Rf=reflect(-V,N);',
    '  float env=smoothstep(.15,.35,sin(Rf.y*5.+Rf.x*2.+t*.35))*.22;',
    '  vec3 lo=vec3(.30,.20,.08),mid=vec3(.79,.64,.39),hi=vec3(1.,.93,.76);',
    '  vec3 col=mix(lo,mid,dif);',
    '  col+=hi*(spec+spec2)+mid*env;',
    '  col*=.82+.3*S.z;',                                    // brushed streaks along the stroke
    '  col=mix(col,col*vec3(1.05,.98,.9),.3);',
    '  float al=cov*uAlpha;',
    '  gl_FragColor=vec4(col*al+gold*halo*(1.-cov)*uAlpha,al+halo*(1.-cov)*uAlpha);',
    '}'
  ].join('\n');

  function sh(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
    return s;
  }
  var vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) { root.classList.add('no-webgl'); return; }
  var prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { root.classList.add('no-webgl'); return; }
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  var U = {};
  ['uRes', 'uCenter', 'uRadius', 'uTime', 'uMouse', 'uHover', 'uDraw', 'uAlpha'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });

  var dprCap = Math.min(window.devicePixelRatio || 1, 1.75);
  var dpr = dprCap;
  var W = 0, H = 0, cx = 0, cy = 0, rad = 0;
  var cRect = null;

  function measure() {
    cRect = canvas.getBoundingClientRect();
    var b = box.getBoundingClientRect();
    W = Math.max(1, Math.round(cRect.width * dpr));
    H = Math.max(1, Math.round(cRect.height * dpr));
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    cx = (b.left - cRect.left + b.width / 2) * dpr;
    cy = H - (b.top - cRect.top + b.height / 2) * dpr;
    rad = (b.width / 2) * dpr;
  }

  // pointer, in ring units (centre = 0, ring = 1), eased
  var mouse = { x: -0.7, y: 0.9, tx: -0.7, ty: 0.9 };
  window.addEventListener('pointermove', function (e) {
    if (!rad || !visible) return;
    cRect = canvas.getBoundingClientRect();
    var x =(e.clientX - cRect.left) * dpr, y = H - (e.clientY - cRect.top) * dpr;
    mouse.tx = (x - cx) / rad; mouse.ty = (y - cy) / rad;
    var d = Math.hypot(mouse.tx, mouse.ty);
    state.hoverTarget = d < 2.2 ? 1 : 0;
  }, { passive: true });

  var visible = true, running = false, t0 = performance.now(), slow = 0, frames = 0;

  function frame(now) {
    running = false;
    if (!visible) return;
    var t = (now - t0) / 1000;

    // idle drift of the light when the pointer is still, so the gold always shimmers a little
    var idleX = Math.cos(t * 0.35) * 0.9, idleY = Math.sin(t * 0.27) * 0.7 + 0.4;
    var hasPointer = state.hoverTarget !== undefined;
    var tx = hasPointer ? mouse.tx : idleX, ty = hasPointer ? mouse.ty : idleY;
    mouse.x += (tx - mouse.x) * 0.08; mouse.y += (ty - mouse.y) * 0.08;
    state.hover += ((state.hoverTarget || 0) - state.hover) * 0.06;

    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(U.uRes, W, H);
    gl.uniform2f(U.uCenter, cx, cy);
    gl.uniform1f(U.uRadius, rad * state.grow);
    gl.uniform1f(U.uTime, reduce ? 4.0 : t);
    gl.uniform2f(U.uMouse, mouse.x / state.grow, mouse.y / state.grow);
    gl.uniform1f(U.uHover, state.hover);
    gl.uniform1f(U.uDraw, state.draw);
    gl.uniform1f(U.uAlpha, state.alpha);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // adaptive quality: if most of the first 90 frames are slow, drop the resolution once
    if (frames < 90) {
      frames++;
      if (now - (frame.last || now) > 28) slow++;
      frame.last = now;
      if (frames === 90 && slow > 45 && dpr > 1) { dpr = 1; measure(); }
    }

    if (!reduce) loop();
  }
  function loop() { if (!running && visible) { running = true; requestAnimationFrame(frame); } }

  window.BeautyRing.render = function () { if (reduce || !running) requestAnimationFrame(frame); };
  window.BeautyRing.measure = measure;

  measure();
  new ResizeObserver(function () { measure(); window.BeautyRing.render(); }).observe(canvas);
  window.addEventListener('resize', measure);

  var io = new IntersectionObserver(function (en) {
    visible = en[0].isIntersecting && !document.hidden;
    if (visible) loop();
  });
  io.observe(canvas);
  document.addEventListener('visibilitychange', function () {
    visible = !document.hidden;
    if (visible) loop();
  });

  state.ready = true;
  loop();
})();
