/* HUD3D: small helpers over three.js r147 for the desk's 3D stages. No build step. */
(function () {
  'use strict';
  const T = window.THREE;
  if (!T) { console.error('three.min.js must load before scene.js'); return; }

  function makeRenderer(canvas) {
    const r = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    r.setClearColor(0x000000, 0);
    r.outputEncoding = T.sRGBEncoding;
    return r;
  }

  // Orbit rig: drag to rotate, wheel / pinch to zoom, damped, auto-rotates when idle.
  function Orbit(camera, dom, o) {
    o = Object.assign({ target: new T.Vector3(), distance: 18, minDist: 6, maxDist: 60, theta: 0.6, phi: 1.05, minPhi: 0.25, maxPhi: 1.5, autoRotate: 0.08, idleAfter: 4 }, o || {});
    const s = { theta: o.theta, phi: o.phi, dist: o.distance, vTheta: 0, vPhi: 0, vDist: 0, idle: o.idleAfter + 1, dragging: false, pinch: 0 };
    const pts = new Map();
    function apply() {
      s.phi = Math.max(o.minPhi, Math.min(o.maxPhi, s.phi));
      s.dist = Math.max(o.minDist, Math.min(o.maxDist, s.dist));
      camera.position.set(
        o.target.x + s.dist * Math.sin(s.phi) * Math.sin(s.theta),
        o.target.y + s.dist * Math.cos(s.phi),
        o.target.z + s.dist * Math.sin(s.phi) * Math.cos(s.theta));
      camera.lookAt(o.target);
    }
    function touch() { s.idle = 0; if (rig.onInteract) rig.onInteract(); }
    dom.addEventListener('pointerdown', e => { pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); s.dragging = true; s.moved = 0; touch(); dom.setPointerCapture && dom.setPointerCapture(e.pointerId); });
    dom.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return;
      const p = pts.get(e.pointerId); const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      s.moved = (s.moved || 0) + Math.abs(dx) + Math.abs(dy);
      if (pts.size === 1) { s.vTheta -= dx * 0.005; s.vPhi -= dy * 0.005; touch(); }
      else if (pts.size === 2) { const a = [...pts.values()]; const d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); if (s.pinch) s.vDist += (s.pinch - d) * 0.02; s.pinch = d; touch(); }
    });
    const up = e => { pts.delete(e.pointerId); if (!pts.size) { s.dragging = false; s.pinch = 0; } };
    dom.addEventListener('pointerup', up); dom.addEventListener('pointercancel', up); dom.addEventListener('pointerleave', up);
    dom.addEventListener('wheel', e => { e.preventDefault(); s.vDist += e.deltaY * 0.01; touch(); }, { passive: false });
    const rig = {
      state: s, opts: o,
      update(dt) {
        s.idle += dt;
        s.theta += s.vTheta; s.phi += s.vPhi; s.dist += s.vDist;
        s.vTheta *= 0.82; s.vPhi *= 0.82; s.vDist *= 0.8;
        if (!s.dragging && s.idle > o.idleAfter && o.autoRotate) s.theta += o.autoRotate * dt;
        apply();
      },
      set(t, p, d) { if (t != null) s.theta = t; if (p != null) s.phi = p; if (d != null) s.dist = d; apply(); },
      wasClick() { return (s.moved || 0) < 6; },
    };
    apply();
    return rig;
  }

  const texCache = {};
  function glowTexture(hex) {
    const key = String(hex);
    if (texCache[key]) return texCache[key];
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'); const col = new T.Color(hex);
    const rgb = `${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)}`;
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, `rgba(${rgb},1)`); grd.addColorStop(0.25, `rgba(${rgb},.55)`); grd.addColorStop(0.6, `rgba(${rgb},.12)`); grd.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding;
    return (texCache[key] = t);
  }
  function makeGlow(hex, size) {
    const m = new T.SpriteMaterial({ map: glowTexture(hex), color: 0xffffff, transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0.9 });
    const sp = new T.Sprite(m); sp.scale.set(size, size, 1); return sp;
  }

  // Floor: concentric rings + radial spokes, or a square grid. Both subtle.
  function polarFloor(rings, spokes, rMax, color) {
    const pts = [];
    for (let i = 1; i <= rings; i++) { const r = rMax * i / rings; const n = 96; for (let k = 0; k < n; k++) { const a0 = k / n * Math.PI * 2, a1 = (k + 1) / n * Math.PI * 2; pts.push(r * Math.cos(a0), 0, r * Math.sin(a0), r * Math.cos(a1), 0, r * Math.sin(a1)); } }
    for (let k = 0; k < spokes; k++) { const a = k / spokes * Math.PI * 2; pts.push(0, 0, 0, rMax * Math.cos(a), 0, rMax * Math.sin(a)); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
    return new T.LineSegments(g, new T.LineBasicMaterial({ color, transparent: true, opacity: 0.18 }));
  }
  function squareGrid(size, div, color, opacity) {
    const pts = []; const h = size / 2;
    for (let i = 0; i <= div; i++) { const p = -h + size * i / div; pts.push(-h, 0, p, h, 0, p, p, 0, -h, p, 0, h); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
    return new T.LineSegments(g, new T.LineBasicMaterial({ color, transparent: true, opacity: opacity == null ? 0.2 : opacity }));
  }

  // DOM labels projected from 3D anchors.
  function Labels(container) {
    const layer = document.createElement('div'); layer.className = 'labels'; container.appendChild(layer);
    const items = []; const v = new T.Vector3();
    return {
      add(anchor, el, opts) { el.classList.add('lbl'); layer.appendChild(el); const it = { anchor, el, opts: opts || {} }; items.push(it); return it; },
      remove(it) { const i = items.indexOf(it); if (i >= 0) { items.splice(i, 1); it.el.remove(); } },
      clear() { items.splice(0).forEach(it => it.el.remove()); },
      update(camera, w, h) {
        for (const it of items) {
          const a = it.anchor; if (a.isObject3D) a.getWorldPosition(v); else v.copy(a);
          if (it.opts.offset) v.add(it.opts.offset);
          v.project(camera);
          const vis = v.z < 1 && v.z > -1;
          const x = (v.x + 1) / 2 * w, y = (1 - v.y) / 2 * h;
          it.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-100%)`;
          it.el.style.opacity = vis ? (it.opts.fade ? String(Math.max(0.25, 1 - (v.z - 0.9) * 8)) : '1') : '0';
        }
      },
    };
  }

  // Render loop that pauses when the stage is off-screen or the tab is hidden.
  function loop(stage, fn) {
    let visible = true, hidden = false, last = performance.now(), raf = 0;
    const io = new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) kick(); }, { threshold: 0.02 });
    io.observe(stage);
    document.addEventListener('visibilitychange', () => { hidden = document.hidden; if (!hidden) kick(); });
    function frame(now) {
      raf = 0;
      if (!visible || hidden) { last = now; return; }
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      fn(dt, now / 1000);
      raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
    kick();
    return { kick };
  }

  function fit(renderer, camera, stage) {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return false;
    const c = renderer.domElement;
    if (c.width !== Math.floor(w * renderer.getPixelRatio()) || c.height !== Math.floor(h * renderer.getPixelRatio())) {
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    return true;
  }

  // Raycast helper for click / hover selection.
  function Picker(camera, dom) {
    const rc = new T.Raycaster(); const m = new T.Vector2();
    return (ev, objects) => {
      const r = dom.getBoundingClientRect();
      m.x = ((ev.clientX - r.left) / r.width) * 2 - 1; m.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
      rc.setFromCamera(m, camera);
      const hits = rc.intersectObjects(objects, false);
      return hits.length ? hits[0].object : null;
    };
  }

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const smooth = t => t * t * (3 - 2 * t);

  window.HUD3D = { makeRenderer, Orbit, glowTexture, makeGlow, polarFloor, squareGrid, Labels, loop, fit, Picker, lerp, clamp, smooth };
})();
