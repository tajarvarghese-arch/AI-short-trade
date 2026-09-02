/* VolSurf: model implied-vol surface against live market points, for vol.html. */
(function () {
  'use strict';
  const T = window.THREE, H = window.HUD3D;
  if (!T || !H) { console.error('volsurf.js needs three.min.js and scene.js'); return; }
  const COL = { g: 0x2dffa0, b: 0x45c8ff, a: 0xffb020, r: 0xff4d6a, line: 0x7aa4b4, ink: 0xe4eef1, bg: 0x05080b };
  const W = 8.4, DPT = 6.6, M0 = 0.60, M1 = 1.02, D0 = 30, D1 = 300, V0 = 0.25, V1 = 0.66;
  const X = m => -W / 2 + (m - M0) / (M1 - M0) * W;
  const Z = d => -DPT / 2 + (d - D0) / (D1 - D0) * DPT;
  const Y = v => (H.clamp(v, V0 - 0.05, V1 + 0.1) - V0) / (V1 - V0) * 4;
  function modelIV(iv30, S, K, days, term, skew) { term = term == null ? 0.08 : term; skew = skew == null ? -0.28 : skew; const atm = (iv30 / 100) * Math.pow(days / 30, term); const slope = skew * Math.sqrt(107 / days); const lm = Math.log(K / S); return Math.max(0.08, atm + slope * lm + 0.15 * lm * lm * Math.max(0, -lm)); }
  function ramp(v) {
    const u = H.clamp((v - 0.28) / (0.62 - 0.28), 0, 1); const c = new T.Color();
    if (u < 0.5) { const k = u / 0.5; c.setRGB(0.05 + 0.12 * k, 0.32 + 0.68 * k, 0.42 + 0.2 * k); }
    else { const k = (u - 0.5) / 0.5; c.setRGB(0.17 + 0.83 * k, 1.0 - 0.45 * k, 0.62 - 0.5 * k); }
    return c;
  }

  function init(stage, D, opts) {
    opts = opts || {};
    const canvas = stage.querySelector('canvas');
    const renderer = H.makeRenderer(canvas);
    const scene = new T.Scene(); scene.fog = new T.FogExp2(COL.bg, 0.028);
    const camera = new T.PerspectiveCamera(36, 1, 0.1, 200);
    const rig = H.Orbit(camera, canvas, { target: new T.Vector3(0, 1.4, 0), distance: 17, minDist: 7, maxDist: 34, theta: 0.75, phi: 1.08, minPhi: 0.25, maxPhi: 1.5, autoRotate: 0.035, idleAfter: 6 });
    const labels = H.Labels(stage); const pick = H.Picker(camera, canvas);
    scene.add(new T.HemisphereLight(0x9fc4e8, 0x05080b, 0.6));
    const key = new T.DirectionalLight(0xffffff, 0.8); key.position.set(6, 12, -4); scene.add(key);
    const rim = new T.DirectionalLight(0x45c8ff, 0.3); rim.position.set(-8, 5, 8); scene.add(rim);
    const floor = H.squareGrid(W, 21, COL.line, 0.2); floor.scale.z = DPT / W; scene.add(floor);
    scene.add(new T.LineLoop(new T.BufferGeometry().setFromPoints([new T.Vector3(-W / 2, 0, -DPT / 2), new T.Vector3(W / 2, 0, -DPT / 2), new T.Vector3(W / 2, 0, DPT / 2), new T.Vector3(-W / 2, 0, DPT / 2)]), new T.LineBasicMaterial({ color: COL.ink, transparent: true, opacity: 0.3 })));
    // Axes
    const axis = (t, p, cls) => { const el = document.createElement('div'); el.className = 'axis ' + (cls || ''); el.innerHTML = t; labels.add(p, el); };
    for (const m of [0.6, 0.7, 0.8, 0.9, 1.0]) axis(Math.round(m * 100) + '%', new T.Vector3(X(m), -0.05, DPT / 2 + 0.35));
    axis('strike / spot →', new T.Vector3(0, -0.05, DPT / 2 + 0.95), 'big');
    for (const d of [44, 107, 198, 288]) axis(d + 'd', new T.Vector3(W / 2 + 0.5, -0.05, Z(d)));
    axis('days to expiry →', new T.Vector3(W / 2 + 1.1, 0.7, 0.2), 'big');
    for (const v of [0.3, 0.4, 0.5, 0.6]) axis(Math.round(v * 100) + '%', new T.Vector3(-W / 2 - 0.45, Y(v) + 0.1, -DPT / 2));
    axis('implied vol', new T.Vector3(-W / 2 - 0.5, Y(V1) + 0.6, -DPT / 2), 'big');
    // Expiry guide lines on the floor
    for (const d of [44, 107, 198, 288]) scene.add(new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(-W / 2, 0.01, Z(d)), new T.Vector3(W / 2, 0.01, Z(d))]), new T.LineBasicMaterial({ color: COL.a, transparent: true, opacity: 0.25 })));

    const st = { name: 'SMH', meshes: [], pts: [], ptLabels: [], selected: null };
    function clear() {
      for (const m of st.meshes) { scene.remove(m); m.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.dispose) o.material.dispose(); }); }
      st.meshes = []; st.pts = []; st.ptLabels.forEach(l => labels.remove(l)); st.ptLabels = []; st.selected = null;
    }
    function build(name) {
      clear(); st.name = name;
      const d = D.names[name]; const S = d.S; const col = name === 'SMH' ? COL.g : COL.b;
      const geo = new T.PlaneGeometry(W, DPT, 42, 30); geo.rotateX(-Math.PI / 2);
      const pos = geo.attributes.position; const colors = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) {
        const m = M0 + (pos.getX(i) + W / 2) / W * (M1 - M0), days = D0 + (pos.getZ(i) + DPT / 2) / DPT * (D1 - D0);
        const v = modelIV(d.iv30, S, S * m, days); pos.setY(i, Y(v));
        const c = ramp(v); colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
      }
      geo.setAttribute('color', new T.BufferAttribute(colors, 3)); geo.computeVertexNormals();
      const g = new T.Group();
      g.add(new T.Mesh(geo, new T.MeshStandardMaterial({ vertexColors: true, side: T.DoubleSide, transparent: true, opacity: 0.86, roughness: 0.6, metalness: 0.1, emissive: new T.Color(0x0a2a2a), emissiveIntensity: 0.35 })));
      g.add(new T.LineSegments(new T.WireframeGeometry(geo), new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.07 })));
      scene.add(g); st.meshes.push(g);
      // market points
      const pts = [];
      for (const p of d.smile) pts.push({ K: p.K, mny: p.mny, days: 107, iv: p.ivMid, ivModel: p.ivModel, bid: p.bid, ask: p.ask, mid: p.mid, pxModel: p.pxModel, src: 'smile' });
      for (const K of Object.keys(d.term)) for (const r of d.term[K]) { if (r.days === 107 && d.smile.some(p => p.K === +K)) continue; pts.push({ K: +K, mny: +K / S, days: r.days, iv: r.iv, ivModel: r.ivModel, mid: r.mid, src: 'term' }); }
      const sph = new T.SphereGeometry(0.11, 18, 18);
      const pg = new T.Group();
      for (const p of pts) {
        const diff = p.iv - p.ivModel; const pc = diff <= 0 ? COL.g : COL.r;
        const mesh = new T.Mesh(sph, new T.MeshBasicMaterial({ color: pc })); const s = 0.8 + Math.min(2.2, Math.abs(diff) * 60); mesh.scale.setScalar(s);
        const P = new T.Vector3(X(p.mny), Y(p.iv), Z(p.days)); mesh.position.copy(P); mesh.userData.p = p;
        const glow = H.makeGlow(pc, 0.9 + s * 0.3); glow.position.copy(P); glow.material.opacity = 0.55;
        const drop = new T.Line(new T.BufferGeometry().setFromPoints([P, new T.Vector3(P.x, Y(p.ivModel), P.z)]), new T.LineBasicMaterial({ color: pc, transparent: true, opacity: 0.8 }));
        pg.add(mesh, glow, drop); st.pts.push(mesh);
        const el = document.createElement('div'); el.className = name === 'SMH' ? 't1' : 't3'; el.textContent = p.K + 'P';
        el.addEventListener('click', ev => { ev.stopPropagation(); select(mesh); });
        st.ptLabels.push(labels.add(mesh, el, { offset: new T.Vector3(0, 0.28, 0), fade: true }));
      }
      scene.add(pg); st.meshes.push(pg);
      if (opts.onBuild) opts.onBuild(name, d, pts);
    }
    function select(mesh) {
      st.selected = mesh;
      st.ptLabels.forEach(l => l.el.classList.toggle('sel', mesh && l.anchor === mesh));
      if (opts.onSelect) opts.onSelect(mesh ? mesh.userData.p : null, st.name);
    }
    canvas.addEventListener('pointerup', ev => { if (!rig.wasClick()) return; const hit = pick(ev, st.pts); select(hit || null); });
    canvas.addEventListener('pointermove', ev => { if (ev.pointerType === 'touch') return; canvas.style.cursor = pick(ev, st.pts) ? 'pointer' : 'grab'; });
    canvas.style.cursor = 'grab';
    H.loop(stage, (dt, t) => {
      if (!H.fit(renderer, camera, stage)) return;
      rig.update(dt);
      if (st.selected) st.selected.material.color.setHex(Math.sin(t * 6) > 0 ? 0xffffff : (st.selected.userData.p.iv - st.selected.userData.p.ivModel <= 0 ? COL.g : COL.r));
      renderer.render(scene, camera);
      labels.update(camera, stage.clientWidth, stage.clientHeight);
    });
    build('SMH');
    return { build, select, state: st, rig, resetView: () => rig.set(0.75, 1.08, 17) };
  }
  window.VolSurf = { init, modelIV };
})();
