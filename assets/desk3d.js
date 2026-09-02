/* Desk3D: the two 3D stages of the AI Complex Put Desk.
   Cascade: the transmission map. Terrain: the payoff surface. Both read live results from the pricing engine. */
(function () {
  'use strict';
  const T = window.THREE, H = window.HUD3D;
  if (!T || !H) { console.error('desk3d.js needs three.min.js and scene.js'); return; }
  const COL = { t1: 0x2dffa0, t2: 0xffb020, t3: 0x45c8ff, ghost: 0x5f7380, ink: 0xe4eef1, line: 0x7aa4b4, red: 0xff4d6a, bg: 0x05080b };
  const TIER = { 1: COL.t1, 2: COL.t2, 3: COL.t3 };
  const pctS = f => (f * 100).toFixed(0) + '%';

  // ---------------------------------------------------------------- CASCADE
  // Static layout and transmission edges. Angles in degrees on each ring; nodes not listed are spaced evenly.
  const ANGLE = { HYG: 355, AEP: 60, XLU: 80, XLI: 140, XLF: 215, AMLP: 285, ET: 305, PFF: 250,
    BKLN: 5, ARCC: 330, IEF: 120, TLT: 160, FXY: 225, UUP: 265 };
  const RAD = { 1: 3.7, 2: 7.2, 3: 10.4 };
  const EDGES = [
    ['core', 'HYG', 'Neocloud and data-center high yield, GPU-backed ABS', 0.15, 0.95],
    ['core', 'AEP', '24 GW of signed large-load commitments', 0.15, 0.95],
    ['core', 'XLI', 'Switchgear, transformers, turbines, cooling orders', 0.15, 0.95],
    ['core', 'XLF', 'Fee pools, construction loans, index beta', 0.15, 0.95],
    ['core', 'XLU', 'Sector version of the power leg', 0.15, 0.95],
    ['core', 'AMLP', 'Gas-to-power narrative', 0.15, 0.95],
    ['core', 'ET', 'Direct data-center gas supply', 0.15, 0.95],
    ['HYG', 'BKLN', 'Loan marks follow high-yield spreads', 0.9, 1.7],
    ['XLF', 'BKLN', 'Banks syndicated the data-center loans', 0.9, 1.7],
    ['HYG', 'ARCC', 'Private credit holds the rest', 0.9, 1.7],
    ['XLF', 'PFF', 'Junior bank capital', 0.9, 1.7],
    ['XLI', 'IEF', 'A point of GDP investment growth disappears; the Fed path reprices', 0.9, 1.7],
    ['AEP', 'IEF', 'Power capex freeze feeds the growth shock', 0.9, 1.7],
    ['IEF', 'TLT', 'The long end follows if term premium allows', 1.5, 2.2],
    ['core', 'FXY', 'The yen carry that funded the AI longs unwinds (August 2024)', 0.5, 1.9],
    ['core', 'UUP', 'Foreign inflows into US AI equities reverse', 0.5, 1.9],
  ];
  const LAG = { 1: 0, 2: 0.7, 3: 1.4 };
  const PLAY_LEN = 3.4;

  function heightOf(mult) { return 0.3 + 0.72 * Math.sqrt(H.clamp(mult, 0, 20)); }

  function initCascade(stage, opts) {
    opts = opts || {};
    const canvas = stage.querySelector('canvas');
    const renderer = H.makeRenderer(canvas);
    const scene = new T.Scene();
    scene.fog = new T.FogExp2(COL.bg, 0.022);
    const camera = new T.PerspectiveCamera(38, 1, 0.1, 200);
    const rig = H.Orbit(camera, canvas, { target: new T.Vector3(0, 1.0, 0), distance: 27, minDist: 9, maxDist: 52, theta: 0.35, phi: 0.98, minPhi: 0.3, maxPhi: 1.45, autoRotate: 0.05, idleAfter: 5 });
    const labels = H.Labels(stage);
    const pick = H.Picker(camera, canvas);

    scene.add(new T.HemisphereLight(0x9fc4e8, 0x05080b, 0.55));
    const key = new T.DirectionalLight(0xffffff, 0.75); key.position.set(8, 14, 6); scene.add(key);
    const rim = new T.DirectionalLight(0x45c8ff, 0.35); rim.position.set(-10, 6, -8); scene.add(rim);
    const coreLight = new T.PointLight(COL.t1, 1.4, 14, 2); coreLight.position.set(0, 1.2, 0); scene.add(coreLight);

    scene.add(H.polarFloor(13, 24, 12.6, COL.line));
    for (const k of [1, 2, 3]) {
      const c = new T.EllipseCurve(0, 0, RAD[k], RAD[k], 0, Math.PI * 2, false, 0).getPoints(128).map(p => new T.Vector3(p.x, 0.02, p.y));
      const g = new T.BufferGeometry().setFromPoints(c);
      scene.add(new T.LineLoop(g, new T.LineBasicMaterial({ color: TIER[k], transparent: true, opacity: 0.35 })));
    }
    const ringNames = { 1: '1° · chips and the complex', 2: '2° · credit · power · build-out · fees', 3: '3° · loans · rates · FX' };
    for (const k of [1, 2, 3]) { const el = document.createElement('div'); el.className = 'axis'; el.textContent = ringNames[k]; el.style.color = '#' + TIER[k].toString(16).padStart(6, '0'); el.style.opacity = '.8'; labels.add(new T.Vector3(RAD[k] * 0.62 + 0.4, 0.05, RAD[k] * 0.78 + 0.5), el); }

    // Core: the AI complex itself.
    const core = new T.Group();
    const shell = new T.Mesh(new T.IcosahedronGeometry(1.15, 1), new T.MeshBasicMaterial({ color: COL.t1, wireframe: true, transparent: true, opacity: 0.55 }));
    const heart = new T.Mesh(new T.IcosahedronGeometry(0.62, 2), new T.MeshStandardMaterial({ color: 0x0b2a1c, emissive: COL.t1, emissiveIntensity: 0.9, roughness: 0.4, metalness: 0.2 }));
    const coreGlow = H.makeGlow(COL.t1, 5.5);
    core.add(shell, heart, coreGlow); core.position.y = 1.35; scene.add(core);
    const coreLabel = document.createElement('div'); coreLabel.className = 'core'; coreLabel.innerHTML = 'AI COMPLEX<small></small>';
    labels.add(core, coreLabel, { offset: new T.Vector3(0, 1.75, 0) });

    // Shock waves and edge pulses.
    const waveGeo = new T.BufferGeometry().setFromPoints(new T.EllipseCurve(0, 0, 1, 1, 0, Math.PI * 2, false, 0).getPoints(96).map(p => new T.Vector3(p.x, 0, p.y)));
    const waves = [1, 2, 3].map(k => { const l = new T.LineLoop(waveGeo, new T.LineBasicMaterial({ color: TIER[k], transparent: true, opacity: 0 })); l.position.y = 0.06; l.visible = false; scene.add(l); return l; });

    const hexGeo = new T.CylinderGeometry(1, 1, 1, 6, 1); hexGeo.translate(0, 0.5, 0);
    const coneGeo = new T.ConeGeometry(0.16, 0.34, 4);
    const state = { nodes: new Map(), edges: [], drawdown: -0.3, target: -0.3, playing: false, playT: 0, selected: null, hovered: null, data: null, pickables: [] };

    function disposeAll() {
      for (const n of state.nodes.values()) { scene.remove(n.group); labels.remove(n.label); n.group.traverse(o => { if (o.material && o.material.dispose && o !== n.mesh) o.material.dispose(); }); }
      for (const e of state.edges) { scene.remove(e.line); if (e.pulse) scene.remove(e.pulse); e.line.geometry.dispose(); }
      state.nodes.clear(); state.edges = []; state.pickables = []; state.selected = null; state.hovered = null;
    }

    function place(list, tier) {
      const fixed = list.filter(n => ANGLE[n.t] != null), free = list.filter(n => ANGLE[n.t] == null);
      fixed.forEach(n => n.angle = ANGLE[n.t] * Math.PI / 180);
      free.forEach((n, i) => n.angle = -Math.PI / 2 + i / Math.max(1, free.length) * Math.PI * 2);
      for (const n of list) n.pos = new T.Vector3(RAD[tier] * Math.cos(n.angle), 0, RAD[tier] * Math.sin(n.angle));
    }

    function setData(data) {
      disposeAll();
      state.data = data; state.target = data.target;
      if (!state.playing) state.drawdown = data.target;
      const byTier = { 1: [], 2: [], 3: [] };
      for (const d of data.nodes) byTier[d.tier].push(d);
      byTier[1].sort((a, b) => b.weight - a.weight);
      for (const k of [1, 2, 3]) place(byTier[k], k);
      for (const d of data.nodes) {
        const col = d.ghost ? COL.ghost : TIER[d.tier];
        const radius = d.ghost ? 0.2 : 0.22 + 0.42 * Math.sqrt(H.clamp(d.weight, 0, 1));
        const group = new T.Group(); group.position.copy(d.pos);
        const mat = d.ghost
          ? new T.MeshBasicMaterial({ color: col, wireframe: true, transparent: true, opacity: 0.4 })
          : new T.MeshStandardMaterial({ color: new T.Color(col).multiplyScalar(0.28), emissive: col, emissiveIntensity: 0.25, roughness: 0.35, metalness: 0.45, transparent: !d.inBook, opacity: d.inBook ? 1 : 0.55 });
        const mesh = new T.Mesh(hexGeo, mat); mesh.scale.set(radius, 0.35, radius); mesh.userData.node = d; group.add(mesh);
        let cone = null, glow = null, base = null;
        if (!d.ghost) {
          cone = new T.Mesh(coneGeo, new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }));
          if (d.dir !== 'call') cone.rotation.x = Math.PI; group.add(cone);
          glow = H.makeGlow(col, 0.9 + radius * 1.8); glow.material.opacity = 0.0; group.add(glow);
          base = new T.Mesh(new T.RingGeometry(radius * 1.15, radius * 1.4, 6), new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.0, side: T.DoubleSide })); base.rotation.x = -Math.PI / 2; base.position.y = 0.03; group.add(base);
        }
        scene.add(group);
        const el = document.createElement('div'); el.className = (d.ghost ? 'ghost' : 't' + d.tier) + (d.inBook ? '' : ' dim');
        el.innerHTML = d.t + (d.ghost ? '<small>zero weight</small>' : '');
        el.addEventListener('click', ev => { ev.stopPropagation(); select(d.t); });
        const label = labels.add(group, el, { offset: new T.Vector3(0, 0.6, 0), fade: true });
        const node = { d, group, mesh, cone, glow, base, label, radius, h: 0.35, ignite: 0 };
        state.nodes.set(d.t, node); state.pickables.push(mesh);
      }
      for (const [a, b, via, t0, t1] of EDGES) {
        const A = a === 'core' ? null : state.nodes.get(a), B = state.nodes.get(b);
        if (!B || (a !== 'core' && !A)) continue;
        const pa = a === 'core' ? new T.Vector3(0, 1.2, 0) : A.group.position.clone(), pb = B.group.position.clone();
        const mid = pa.clone().add(pb).multiplyScalar(0.5); mid.y = Math.max(pa.y, pb.y) + 1.6 + pa.distanceTo(pb) * 0.12;
        const curve = new T.QuadraticBezierCurve3(pa, mid, pb);
        const geo = new T.BufferGeometry().setFromPoints(curve.getPoints(40));
        const ghost = B.d.ghost || (A && A.d.ghost);
        const line = new T.Line(geo, new T.LineBasicMaterial({ color: ghost ? COL.ghost : TIER[B.d.tier], transparent: true, opacity: ghost ? 0.12 : 0.3 }));
        scene.add(line);
        let pulse = null;
        if (!ghost) { pulse = H.makeGlow(TIER[B.d.tier], 0.9); pulse.visible = false; scene.add(pulse); }
        state.edges.push({ a, b, via, t0, t1, curve, line, pulse, ghost, from: A, to: B });
        B.fedBy = B.fedBy || []; B.fedBy.push({ from: a === 'core' ? 'AI complex' : a, via });
      }
      if (opts.onData) opts.onData(state);
      renderCard();
    }

    function drawdownFor(tier) {
      if (!state.playing) return state.drawdown;
      const e = state.playT - LAG[tier];
      return state.target * H.smooth(H.clamp(e / 2.4, 0, 1));
    }
    function multAt(node, f) { return node.d.mult ? node.d.mult(f) : 0; }

    function select(t) {
      const n = t ? state.nodes.get(t) : null;
      state.selected = n || null;
      for (const m of state.nodes.values()) m.label.el.classList.toggle('sel', m === state.selected);
      renderCard();
      if (opts.onSelect) opts.onSelect(n ? n.d : null, n);
    }
    function renderCard() {
      if (!opts.card) return;
      const n = state.selected;
      const f = n ? drawdownFor(n.d.tier) : state.drawdown;
      opts.card(n ? n.d : null, n ? { mult: multAt(n, f), f, fedBy: n.fedBy || [] } : { f });
    }

    canvas.addEventListener('pointermove', ev => {
      if (ev.pointerType === 'touch') return;
      const hit = pick(ev, state.pickables);
      const n = hit ? state.nodes.get(hit.userData.node.t) : null;
      if (n !== state.hovered) { state.hovered = n; canvas.style.cursor = n ? 'pointer' : 'grab'; }
    });
    canvas.addEventListener('pointerup', ev => {
      if (!rig.wasClick()) return;
      const hit = pick(ev, state.pickables);
      select(hit ? hit.userData.node.t : null);
    });
    canvas.style.cursor = 'grab';

    function play() { state.playing = true; state.playT = 0; state.drawdown = 0; if (opts.onPlay) opts.onPlay(true); }
    function setShock(f) { state.playing = false; state.drawdown = f; renderCard(); if (opts.onShock) opts.onShock(f); }

    let lastCard = 0;
    H.loop(stage, (dt, t) => {
      if (!H.fit(renderer, camera, stage)) return;
      rig.update(dt);
      if (state.playing) {
        state.playT += dt;
        state.drawdown = state.target * H.smooth(H.clamp(state.playT / 2.4, 0, 1));
        if (opts.onShock) opts.onShock(drawdownFor(1), true);
        for (const e of state.edges) {
          if (!e.pulse) continue;
          const u = (state.playT - e.t0) / (e.t1 - e.t0);
          e.pulse.visible = u > 0 && u < 1;
          if (e.pulse.visible) { e.pulse.position.copy(e.curve.getPoint(u)); e.line.material.opacity = 0.3 + 0.5 * Math.sin(u * Math.PI); }
          else e.line.material.opacity = 0.3;
        }
        waves.forEach((w, i) => { const k = i + 1; const e = state.playT - LAG[k] * 0.9; const u = e / 1.7; w.visible = u > 0 && u < 1; if (w.visible) { const r = 0.4 + u * 12.4; w.scale.set(r, 1, r); w.material.opacity = 0.9 * (1 - u); } });
        if (state.playT > PLAY_LEN) { state.playing = false; state.drawdown = state.target; waves.forEach(w => w.visible = false); state.edges.forEach(e => { if (e.pulse) e.pulse.visible = false; e.line.material.opacity = e.ghost ? 0.12 : 0.3; }); if (opts.onPlay) opts.onPlay(false); if (opts.onShock) opts.onShock(state.drawdown); }
        if (t - lastCard > 0.1) { lastCard = t; renderCard(); }
      }
      const sev = H.clamp(-state.drawdown / 0.6, 0, 1);
      const pulse = 1 + 0.06 * Math.sin(t * 2.2) + 0.08 * sev * Math.sin(t * 6);
      shell.scale.setScalar(pulse); shell.rotation.y += dt * 0.25; shell.rotation.x += dt * 0.11; heart.rotation.y -= dt * 0.4;
      heart.material.emissiveIntensity = 0.7 + 0.6 * sev + 0.15 * Math.sin(t * 5);
      coreGlow.material.opacity = 0.55 + 0.4 * sev; coreLight.intensity = 1.2 + 1.6 * sev;
      coreLabel.querySelector('small').textContent = 'complex ' + pctS(state.drawdown);
      for (const n of state.nodes.values()) {
        const f = drawdownFor(n.d.tier);
        const m = n.d.ghost ? 0 : multAt(n, f);
        const targetH = n.d.ghost ? 0.35 : heightOf(m);
        n.h = H.lerp(n.h, targetH, Math.min(1, dt * 7));
        n.mesh.scale.y = n.h;
        const ig = n.d.ghost ? 0 : H.clamp(m / 3, 0, 1.15);
        n.ignite = H.lerp(n.ignite, ig, Math.min(1, dt * 6));
        const sel = n === state.selected, hov = n === state.hovered;
        if (!n.d.ghost) {
          n.mesh.material.emissiveIntensity = (0.16 + 0.7 * n.ignite) * (n.d.inBook ? 1 : 0.35) + (sel ? 0.5 : hov ? 0.25 : 0);
          n.glow.material.opacity = (0.08 + 0.5 * n.ignite) * (n.d.inBook ? 1 : 0.2) + (sel ? 0.3 : 0);
          n.glow.position.y = n.h + 0.12; n.glow.scale.setScalar((0.9 + n.radius * 1.8) * (1 + 0.35 * n.ignite));
          n.cone.position.y = n.h + 0.35; n.cone.rotation.y += dt * 0.8;
          n.base.material.opacity = sel ? 0.9 : hov ? 0.5 : 0.18 * n.ignite;
        }
        n.label.opts.offset.y = n.h + 0.55;
      }
      renderer.render(scene, camera);
      labels.update(camera, stage.clientWidth, stage.clientHeight);
    });

    return { setData, play, setShock, select, state, rig, resetView: () => rig.set(0.35, 1.02, 25), get drawdown() { return state.drawdown; } };
  }

  // ---------------------------------------------------------------- TERRAIN
  function initTerrain(stage, opts) {
    opts = opts || {};
    const canvas = stage.querySelector('canvas');
    const renderer = H.makeRenderer(canvas);
    const scene = new T.Scene();
    scene.fog = new T.FogExp2(COL.bg, 0.03);
    const camera = new T.PerspectiveCamera(36, 1, 0.1, 200);
    const rig = H.Orbit(camera, canvas, { target: new T.Vector3(0, 0.9, 0), distance: 17, minDist: 7, maxDist: 34, theta: -0.7, phi: 1.05, minPhi: 0.25, maxPhi: 1.5, autoRotate: 0.035, idleAfter: 6 });
    const labels = H.Labels(stage);
    scene.add(new T.HemisphereLight(0x9fc4e8, 0x05080b, 0.6));
    const key = new T.DirectionalLight(0xffffff, 0.8); key.position.set(-6, 12, 5); scene.add(key);
    const rim = new T.DirectionalLight(0x45c8ff, 0.3); rim.position.set(8, 5, -8); scene.add(rim);

    const NX = 36, NZ = 18, W = 9, DPT = 6; // x: drawdown 0..-60%, z: lambda 0..1.5
    const st = { data: null, lambda: 1, ymax: 4, meshes: [], marker: null, axisLabels: [] };
    const floor = H.squareGrid(W, 18, COL.line, 0.22); floor.scale.z = DPT / W; scene.add(floor);
    const zeroFrame = new T.LineLoop(new T.BufferGeometry().setFromPoints([new T.Vector3(-W / 2, 0, -DPT / 2), new T.Vector3(W / 2, 0, -DPT / 2), new T.Vector3(W / 2, 0, DPT / 2), new T.Vector3(-W / 2, 0, DPT / 2)]), new T.LineBasicMaterial({ color: COL.ink, transparent: true, opacity: 0.35 })); scene.add(zeroFrame);

    const X = f => -W / 2 + (-f / 0.6) * W;          // f in [0,-0.6]
    const Z = lam => -DPT / 2 + (lam / 1.5) * DPT;    // lam in [0,1.5]
    const Y = v => H.clamp(v, -1.05, st.ymax * 1.15) / st.ymax * 4;

    function axisLabel(text, pos, cls) { const el = document.createElement('div'); el.className = 'axis ' + (cls || ''); el.innerHTML = text; st.axisLabels.push(labels.add(pos, el)); }
    function buildAxes() {
      st.axisLabels.forEach(l => labels.remove(l)); st.axisLabels = [];
      for (let k = 0; k <= 6; k++) axisLabel(pctS(-k * 0.1), new T.Vector3(X(-k * 0.1), -0.05, DPT / 2 + 0.35));
      axisLabel('complex drawdown →', new T.Vector3(0, -0.05, DPT / 2 + 0.95), 'big');
      for (const l of [0, 0.5, 1, 1.5]) axisLabel(l.toFixed(1) + '×', new T.Vector3(W / 2 + 0.55, -0.05, Z(l)));
      axisLabel('transmission →<br><span style="letter-spacing:.06em;text-transform:none">realised β / assumed β</span>', new T.Vector3(W / 2 + 1.35, 0.9, 0), 'big');
      const ticks = [-1, 0, 1, 2, 3, 4, 6, 8].filter(v => v <= st.ymax + 0.01);
      for (const v of ticks) axisLabel((v > 0 ? '+' : '') + v + '×', new T.Vector3(-W / 2 - 0.5, Y(v) + 0.12, -DPT / 2));
      axisLabel('P&amp;L / premium', new T.Vector3(-W / 2 - 0.6, Y(st.ymax) + 0.75, -DPT / 2), 'big');
    }

    function colorFor(v) {
      const c = new T.Color();
      if (v >= 0) { const u = H.clamp(v / st.ymax, 0, 1); c.setRGB(0.05 + 0.13 * u, 0.28 + 0.72 * Math.pow(u, 0.7), 0.22 + 0.4 * u); }
      else { const u = H.clamp(-v, 0, 1); c.setRGB(0.28 + 0.68 * u, 0.1 + 0.08 * (1 - u), 0.14 + 0.16 * u); }
      return c;
    }
    function surface(fn, opts2) {
      const geo = new T.PlaneGeometry(W, DPT, NX, NZ); geo.rotateX(-Math.PI / 2);
      const pos = geo.attributes.position; const colors = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i);
        const f = -(x + W / 2) / W * 0.6, lam = (z + DPT / 2) / DPT * 1.5;
        const v = fn(f, lam); pos.setY(i, Y(v));
        const c = opts2.mono ? new T.Color(opts2.mono) : colorFor(v); colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
      }
      geo.setAttribute('color', new T.BufferAttribute(colors, 3)); geo.computeVertexNormals();
      const g = new T.Group();
      const fill = new T.Mesh(geo, new T.MeshStandardMaterial({ vertexColors: true, side: T.DoubleSide, transparent: true, opacity: opts2.opacity, roughness: 0.55, metalness: 0.15, emissive: opts2.mono ? new T.Color(opts2.mono) : new T.Color(0x0a2a1c), emissiveIntensity: opts2.mono ? 0.12 : 0.35, depthWrite: opts2.opacity > 0.5 }));
      const wire = new T.LineSegments(new T.WireframeGeometry(geo), new T.LineBasicMaterial({ color: opts2.wire, transparent: true, opacity: opts2.wireOpacity }));
      g.add(fill, wire); scene.add(g); st.meshes.push(g);
      return g;
    }
    function crossLines(fn) {
      const lam = st.lambda, f0 = st.data.target;
      const a = []; for (let i = 0; i <= 60; i++) { const f = -0.6 * i / 60; a.push(new T.Vector3(X(f), Y(fn(f, lam)) + 0.03, Z(lam))); }
      const b = []; for (let i = 0; i <= 30; i++) { const l = 1.5 * i / 30; b.push(new T.Vector3(X(f0), Y(fn(f0, l)) + 0.03, Z(l))); }
      const la = new T.Line(new T.BufferGeometry().setFromPoints(a), new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }));
      const lb = new T.Line(new T.BufferGeometry().setFromPoints(b), new T.LineBasicMaterial({ color: COL.t2, transparent: true, opacity: 0.9 }));
      const g = new T.Group(); g.add(la, lb); scene.add(g); st.meshes.push(g);
      // marker at (target, lambda)
      const v = fn(f0, lam); const p = new T.Vector3(X(f0), Y(v), Z(lam));
      const ball = new T.Mesh(new T.SphereGeometry(0.13, 16, 16), new T.MeshBasicMaterial({ color: 0xffffff }));
      ball.position.copy(p); const glow = H.makeGlow(v >= 0 ? COL.t1 : COL.red, 1.6); glow.position.copy(p);
      const drop = new T.Line(new T.BufferGeometry().setFromPoints([p, new T.Vector3(p.x, 0, p.z)]), new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
      g.add(ball, glow, drop);
      if (st.markerLabel) labels.remove(st.markerLabel);
      const el = document.createElement('div'); el.className = 'sel';
      el.innerHTML = `${pctS(f0)} · λ ${lam.toFixed(2)}<small>${opts.fmt ? opts.fmt(v * st.data.base) : (v * 100).toFixed(0) + '%'} · ${(v + 1).toFixed(2)}× premium</small>`;
      st.markerLabel = labels.add(p, el, { offset: new T.Vector3(0, 0.35, 0) });
    }
    function rebuild() {
      for (const m of st.meshes) { scene.remove(m); m.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.dispose) o.material.dispose(); }); }
      st.meshes = [];
      const d = st.data; if (!d) return;
      let vmax = 0; for (let i = 0; i <= NX; i++) for (let j = 0; j <= NZ; j++) { const v = d.plan(-0.6 * i / NX, 1.5 * j / NZ); if (isFinite(v)) vmax = Math.max(vmax, v); }
      if (d.bench) for (let i = 0; i <= NX; i++) vmax = Math.max(vmax, d.bench(-0.6 * i / NX));
      st.ymax = H.clamp(Math.ceil(vmax), 2, 8);
      if (d.bench) surface((f) => d.bench(f), { mono: 0x7a8f9a, opacity: 0.16, wire: 0x9bb0ba, wireOpacity: 0.35 });
      surface(d.plan, { opacity: 0.9, wire: 0x2dffa0, wireOpacity: 0.12 });
      crossLines(d.plan);
      buildAxes();
      if (opts.onRebuild) opts.onRebuild(st);
    }
    function setData(d) { st.data = d; rebuild(); }
    function setLambda(l) { st.lambda = l; if (st.data) { const m = st.meshes.pop(); if (m) { scene.remove(m); m.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.dispose) o.material.dispose(); }); } crossLines(st.data.plan); if (opts.onRebuild) opts.onRebuild(st); } }

    H.loop(stage, (dt) => {
      if (!H.fit(renderer, camera, stage)) return;
      rig.update(dt);
      renderer.render(scene, camera);
      labels.update(camera, stage.clientWidth, stage.clientHeight);
    });
    return { setData, setLambda, state: st, rig, resetView: () => rig.set(-0.7, 1.05, 17) };
  }

  window.Desk3D = { initCascade, initTerrain, COL };
})();
