/* คลังความรู้แมวอักษร — landing page.
   A night scene of the real Faculty of Arts courtyard: the Boromrajakumari (BRK) and Maha Chakri Sirindhorn (MCS)
   buildings from the group's SketchUp models, placed at their OpenStreetMap positions (metres, campus-grid aligned,
   origin = BRK), with the Chula Auditorium and flagpole in the distance. Around them: the ลานอักษรสิทธิ์ plaza,
   rain trees, lamps, benches and cats with glowing eyes. A scroll-driven camera moves between chapters, small
   "viewport" cards render close-ups into the same canvas, and live numbers come from the shared cat data (data.js).

   Performance: each building is one draw call (texture atlas, meshopt geometry, WebP); trees, lamps, benches and the
   skyline are instanced; BRK+MCS load first, the auditorium+flag stream in after the first frame. If anything about
   the models fails, a procedural hall stands in so the page always works. */
(function () {
  "use strict";

  const CFG = window.SITE_CONFIG || {};
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = window.matchMedia("(max-width: 760px)").matches;
  const esc = (window.CatData && window.CatData.esc) || ((s) => String(s == null ? "" : s));

  // deterministic random so the scene looks the same on every load
  function rng(seed) {
    let s = seed % 2147483647; if (s <= 0) s += 2147483646;
    return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  }

  /* ============================================================ preloader */
  // time-based (not frame-based) so a slow GPU can never hold the page behind the loader
  let plValue = 0, plDone = false;
  function setProgress(p) {
    if (plDone || p <= plValue) return;
    plValue = p;
    $("#plPct").textContent = p + "%";
    $("#plBar").style.width = p + "%";
    if (p >= 100) { plDone = true; setTimeout(() => document.body.classList.remove("is-loading"), 450); }
  }
  setTimeout(() => setProgress(100), 6000); // hard safety net

  /* ============================================================ grain */
  function makeGrain() {
    const c = document.createElement("canvas"); c.width = c.height = 180;
    const x = c.getContext("2d"); const d = x.createImageData(180, 180);
    for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    x.putImageData(d, 0, 0);
    const g = $("#grain"); g.style.backgroundImage = `url(${c.toDataURL()})`;
    if (!reduce) { let k = 0; setInterval(() => { k++; g.style.backgroundPosition = `${(k * 37) % 180}px ${(k * 71) % 180}px`; }, 90); }
  }

  /* ============================================================ foreground grass (SVG) */
  function makeGrass() {
    const svg = $("#fgGrass"); const W = 1000, H = 260; const r = rng(7);
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const mound = (x) => {
      const a = Math.exp(-Math.pow((x - 0.08) / 0.16, 2)), b = Math.exp(-Math.pow((x - 0.93) / 0.14, 2)), c = Math.exp(-Math.pow((x - 0.5) / 0.35, 2));
      return 0.25 + 0.75 * Math.max(a, b * 0.9) + 0.12 * c;
    };
    const layer = (n, hMax, color) => {
      let d = "";
      for (let i = 0; i < n; i++) {
        const x = r() * W, m = mound(x / W), h = (0.35 + r() * 0.65) * hMax * m, w = 3 + r() * 6, lean = (r() - 0.5) * 50;
        d += `M${(x - w).toFixed(1)} ${H} Q${(x + lean * 0.3).toFixed(1)} ${(H - h * 0.6).toFixed(1)} ${(x + lean).toFixed(1)} ${(H - h).toFixed(1)} Q${(x + lean * 0.2 + w * 0.4).toFixed(1)} ${(H - h * 0.5).toFixed(1)} ${(x + w).toFixed(1)} ${H} Z`;
      }
      return `<path d="${d}" fill="${color}"/>`;
    };
    let dots = "";
    for (let i = 0; i < 26; i++) {
      const x = r() * W, y = H - r() * 60 * mound(x / W);
      dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(1.2 + r() * 1.8).toFixed(1)}" fill="#ef6d9f" opacity="${(0.4 + r() * 0.5).toFixed(2)}"/>`;
    }
    svg.innerHTML = `<defs><linearGradient id="gfade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#07090c" stop-opacity="0"/><stop offset=".55" stop-color="#07090c" stop-opacity=".6"/><stop offset="1" stop-color="#07090c"/></linearGradient></defs>`
      + layer(420, 230, "#0f1a14") + dots + layer(520, 170, "#080d0a") + `<rect x="0" y="${H * 0.45}" width="${W}" height="${H * 0.55}" fill="url(#gfade)"/>`;
  }

  /* ============================================================ canvas textures */
  function canvasTex(w, h, draw) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c); t.needsUpdate = true; return t;
  }
  const radial = (stops) => canvasTex(128, 128, (x, s) => {
    const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    stops.forEach(([o, c]) => g.addColorStop(o, c)); x.fillStyle = g; x.fillRect(0, 0, s, s);
  });

  /* ============================================================ campus layout (metres, three.js frame)
     x ≈ east and z ≈ south along the campus grid (8.2° off true north), y up, origin = BRK footprint centre.
     Positions come from OpenStreetMap: BRK way 158138511, MCS way 158138507 (+ parking 158138513),
     Auditorium way 157591132, flagpole node 1694957992, plaza ลานอักษรสิทธิ์ way 930031082, garden way 1119285458,
     recreation-ground trees (nodes 10064006607…10064019941) and plaza trees (13706933288/89). */
  const SITE = {
    brkFront: 17.5, brkStepsY: 0.6, gable: { apex: [1.0, 26.8], legL: -6.5, legR: 8.5, legTop: 14.1, z: 16.35 },
    plaza: { x0: -31, x1: 84, z0: 17.6, z1: 51.5 },
    garden: { x0: -14, x1: 79, z0: 58, z1: 90 },
    auditorium: [-68, 132], flagpole: [-133.8, 131.8],
    osmPlazaTrees: [[-8.5, 34.9], [-6.5, 39.8], [-46.6, 20.5], [-52, 41.1], [-95.6, 35.4]],
    osmGrove: [[-109.9, 113.9], [-108, 108.1], [-97.8, 110.2], [-100.1, 101.8], [-86.6, 102.2], [-54.7, 104.9], [-45.3, 104.1], [-30.5, 108.1],
      [-27.6, 98.8], [-45.3, 91.1], [-49, 84.5], [-61.5, 84.5], [-62, 91.8], [-75.3, 92], [-77.5, 83.2], [-92.1, 82.6], [-92, 90.9], [-109.3, 67.5],
      [-98.4, 70.1], [-87.6, 69.7], [-79.4, 68.6], [-69.8, 69.5], [-61.3, 70.4], [-53, 68.3], [-34, 74.5], [-34, 83.3], [-33.1, 92.2],
      [-25.2, 74.9], [-23.4, 81.9], [-23.9, 89.6]]
  };

  /* ============================================================ the world */
  let renderer, scene, camera;
  const world = { cats: [], lampGlow: null, blossoms: null, eyeGlow: null, models: {}, fallback: null };

  function initGL() {
    if (!window.THREE) return false;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: $("#gl"), antialias: !isMobile, powerPreference: "high-performance" });
    } catch (e) { return false; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 1.75));
    renderer.setSize(innerWidth, innerHeight, false);
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07090c);
    scene.fog = new THREE.FogExp2(0x0b0e14, isMobile ? 0.0052 : 0.0046);
    camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 1000);
    window.__aksornLanding = { renderer, scene, camera }; // handy for debugging/perf checks in devtools
    return true;
  }

  const std = (color, o) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.92, metalness: 0 }, o || {}));
  const lambert = (color, o) => new THREE.MeshLambertMaterial(Object.assign({ color }, o || {}));
  function box(w, h, d, mat, x, y, z) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x || 0, y || 0, z || 0); return m; }
  function flatPlane(w, d, mat, x, y, z) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); return m; }

  // instanced helper: list of {p:[x,y,z], s:[sx,sy,sz], r:[rx,ry,rz], c?:Color}
  function instanced(geo, mat, items) {
    const im = new THREE.InstancedMesh(geo, mat, items.length);
    const o = new THREE.Object3D();
    items.forEach((it, i) => {
      o.position.set(...it.p); o.scale.set(...(it.s || [1, 1, 1])); o.rotation.set(...(it.r || [0, 0, 0])); o.updateMatrix();
      im.setMatrixAt(i, o.matrix);
      if (it.c) im.setColorAt(i, it.c);
    });
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    scene.add(im); return im;
  }

  // points that keep a minimum on-screen size, so distant glows (cat eyes, lamps) still read as sparkles
  function glowPoints(positions, color, size, minPx, map, opacity) {
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: map }, color: { value: new THREE.Color(color) }, size: { value: size }, minPx: { value: minPx }, scale: { value: 1 }, opacity: { value: opacity || 1 } },
      vertexShader: "uniform float size; uniform float minPx; uniform float scale; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = max(minPx, size * scale / max(0.1, -mv.z)); gl_Position = projectionMatrix * mv; }",
      fragmentShader: "uniform sampler2D map; uniform vec3 color; uniform float opacity; void main(){ float a = texture2D(map, gl_PointCoord).a * opacity; gl_FragColor = vec4(color * a, a); }",
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; scene.add(pts); return pts;
  }
  function updatePointScale() {
    const s = renderer.getDrawingBufferSize(new THREE.Vector2()).y / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    [world.lampGlow, world.eyeGlow].forEach((p) => { if (p) { p.material.uniforms.scale.value = s; p.material.uniforms.minPx.value = (p === world.eyeGlow ? 2.6 : 3) * renderer.getPixelRatio(); } });
  }

  function buildSky(TEX) {
    // horizon dome: an open cylinder with a vertical gradient (Bangkok city glow near the horizon)
    const grad = canvasTex(4, 256, (x, w, h) => {
      const g = x.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#04060a"); g.addColorStop(0.45, "#0a0f1c"); g.addColorStop(0.7, "#1f1627"); g.addColorStop(0.8, "#2e1b2a"); g.addColorStop(1, "#0b0a0f");
      x.fillStyle = g; x.fillRect(0, 0, w, h);
    });
    const dome = new THREE.Mesh(new THREE.CylinderGeometry(560, 560, 340, 32, 1, true),
      new THREE.MeshBasicMaterial({ map: grad, side: THREE.BackSide, fog: false, depthWrite: false }));
    dome.position.y = 110; dome.renderOrder = -2; scene.add(dome);

    const r = rng(11), n = isMobile ? 500 : 900, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const th = r() * Math.PI * 2, ph = Math.acos(0.18 + r() * 0.82), R = 520;
      pos[i * 3] = R * Math.sin(ph) * Math.cos(th); pos[i * 3 + 1] = R * Math.cos(ph) + 20; pos[i * 3 + 2] = R * Math.sin(ph) * Math.sin(th);
    }
    const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xcfd8e6, size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.75, depthWrite: false })));

    // moon (upper right of the hero view, above MCS) with soft craters and a pink halo
    const moonTex = canvasTex(512, 512, (x, s) => {
      const R = s / 2 - 6, cx = s / 2, cy = s / 2;
      const g = x.createRadialGradient(cx - R * 0.25, cy - R * 0.25, R * 0.1, cx, cy, R);
      g.addColorStop(0, "#fff6f8"); g.addColorStop(0.7, "#f6d3dd"); g.addColorStop(1, "#d99aae");
      x.fillStyle = g; x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.fill();
      x.save(); x.clip(); const rr = rng(5);
      for (let i = 0; i < 38; i++) {
        const a = rr() * Math.PI * 2, d = Math.sqrt(rr()) * R * 0.9, cr = 6 + rr() * 46;
        const gx = cx + Math.cos(a) * d, gy = cy + Math.sin(a) * d;
        const cg = x.createRadialGradient(gx, gy, 0, gx, gy, cr);
        cg.addColorStop(0, `rgba(170,95,120,${0.1 + rr() * 0.18})`); cg.addColorStop(1, "rgba(170,95,120,0)");
        x.fillStyle = cg; x.fillRect(gx - cr, gy - cr, cr * 2, cr * 2);
      }
      x.restore();
    });
    world.moonPos = new THREE.Vector3(150, 212, -360);
    const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex, fog: false, transparent: true, depthWrite: false }));
    moon.position.copy(world.moonPos); moon.scale.set(62, 62, 1); moon.renderOrder = -1; scene.add(moon);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: 0xef6d9f, fog: false, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.position.copy(world.moonPos); halo.scale.set(240, 240, 1); halo.renderOrder = -1; scene.add(halo);

    // distant Bangkok skyline ring: one instanced draw call, windows from a shared emissive texture
    const winTex = canvasTex(64, 128, (x, w, h) => {
      x.fillStyle = "#000"; x.fillRect(0, 0, w, h); const rw = rng(9);
      for (let yy = 4; yy < h - 4; yy += 6) for (let xx = 4; xx < w - 4; xx += 7) if (rw() < 0.28) { x.fillStyle = rw() < 0.7 ? "#7a5a3a" : "#4c5f7a"; x.fillRect(xx, yy, 3, 3); }
    });
    const rc = rng(21), items = [];
    for (let i = 0; i < 70; i++) {
      const a = (i / 70) * Math.PI * 2 + (rc() - 0.5) * 0.05, R = 300 + rc() * 90;
      const h = 14 + Math.pow(rc(), 2) * 120, w = 14 + rc() * 22;
      items.push({ p: [Math.cos(a) * R, h / 2, Math.sin(a) * R], s: [w, h, w], r: [0, rc() * Math.PI, 0] });
    }
    instanced(new THREE.BoxGeometry(1, 1, 1), lambert(0x0a0d13, { emissive: 0xffffff, emissiveMap: winTex }), items);
  }

  function buildGround(TEX) {
    const grassTex = canvasTex(256, 256, (x, s) => {
      x.fillStyle = "#0b100e"; x.fillRect(0, 0, s, s); const r = rng(3);
      for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(${30 + r() * 30},${45 + r() * 30},${35 + r() * 20},${0.08 + r() * 0.12})`; x.fillRect(r() * s, r() * s, 1 + r() * 2, 1 + r() * 2); }
    });
    grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping; grassTex.repeat.set(160, 160);
    scene.add(flatPlane(1400, 1400, lambert(0xffffff, { map: grassTex }), 0, 0, 0));

    // ลานอักษรสิทธิ์: square stone paving in front of BRK and MCS
    const pave = canvasTex(256, 256, (x, s) => {
      x.fillStyle = "#2a2c2f"; x.fillRect(0, 0, s, s); const r = rng(13);
      for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { const v = 38 + r() * 14; x.fillStyle = `rgb(${v},${v + 1},${v + 3})`; x.fillRect(i * 32 + 1, j * 32 + 1, 30, 30); }
    });
    pave.wrapS = pave.wrapT = THREE.RepeatWrapping;
    const P = SITE.plaza, pw = P.x1 - P.x0, pd = P.z1 - P.z0;
    pave.repeat.set(pw / 4, pd / 4);
    scene.add(flatPlane(pw, pd, lambert(0xffffff, { map: pave }), (P.x0 + P.x1) / 2, 0.02, (P.z0 + P.z1) / 2));
    // apron under BRK/MCS so the buildings never float on grass
    scene.add(flatPlane(170, 46, lambert(0x24262a), 49, 0.015, -2));

    // roads: along the south edge of the plaza, south to the auditorium, and the service lane behind BRK
    const asphalt = lambert(0x16181b);
    scene.add(flatPlane(190, 7, asphalt, 35, 0.03, 55));
    scene.add(flatPlane(7, 130, asphalt, -21, 0.03, 118));
    scene.add(flatPlane(170, 6, asphalt, 50, 0.03, -23));
    const kerb = lambert(0x3a3d42);
    scene.add(flatPlane(190, 0.25, kerb, 35, 0.035, 51.6)); scene.add(flatPlane(190, 0.25, kerb, 35, 0.035, 58.4));

    // garden south of the road (way 1119285458): lawn, low clipped hedges and a central path
    const G = SITE.garden;
    scene.add(flatPlane(G.x1 - G.x0, G.z1 - G.z0, lambert(0x0f1b13), (G.x0 + G.x1) / 2, 0.025, (G.z0 + G.z1) / 2));
    scene.add(flatPlane(4, G.z1 - G.z0, lambert(0x2a2c2f), 32, 0.03, (G.z0 + G.z1) / 2));
    const hedges = [];
    for (let x = G.x0 + 4; x < G.x1 - 4; x += 9) for (const z of [G.z0 + 4, G.z1 - 4]) if (Math.abs(x - 32) > 5) hedges.push({ p: [x, 0.45, z], s: [7, 0.9, 1.2] });
    for (let z = G.z0 + 10; z < G.z1 - 8; z += 9) for (const x of [26, 38]) hedges.push({ p: [x, 0.45, z], s: [1.2, 0.9, 6.5] });
    instanced(new THREE.BoxGeometry(1, 1, 1), lambert(0x14261a), hedges);

    // the Chula front lawn and the flagpole roundabout get a slightly different grass so the far view reads
    scene.add(flatPlane(110, 50, lambert(0x0d1912), -77, 0.02, 85));
  }

  /* ---------- building materials: daytime photo textures re-lit for night, with lit windows ---------- */
  const GLOW_GLSL = `
    #include <emissivemap_fragment>
    {
      vec3 wn = normalize(cross(dFdx(vWPos), dFdy(vWPos)));
      float vertical = 1.0 - smoothstep(0.25, 0.5, abs(wn.y));
      #ifdef USE_MAP
        vec3 tc = texelColor.rgb;
      #else
        vec3 tc = vec3(0.5);
      #endif
      float lum = dot(tc, vec3(0.299, 0.587, 0.114));
      float glass = (1.0 - smoothstep(uGlassLo, uGlassHi, lum)) * step(tc.r - 0.08, tc.b + 0.05);
      vec3 cell = floor(vWPos / vec3(2.6, 3.6, 2.6) + uSeed);
      float h = fract(sin(dot(cell, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
      float lit = step(1.0 - uLit, h);
      // light an inset pane inside each cell (dark frame around it) so close-ups read as windows, not slabs
      vec3 f = fract(vWPos / vec3(2.6, 3.6, 2.6) + uSeed);
      float fu = abs(wn.x) > abs(wn.z) ? f.z : f.x;
      float pane = smoothstep(0.08, 0.14, fu) * (1.0 - smoothstep(0.86, 0.92, fu)) * smoothstep(0.16, 0.22, f.y) * (1.0 - smoothstep(0.80, 0.86, f.y));
      float warm = min(0.55 + 0.35 * fract(h * 7.13), 0.85);
      totalEmissiveRadiance += mix(vec3(1.0, 0.70, 0.38), vec3(1.0, 0.86, 0.66), fract(h * 3.7)) * glass * vertical * lit * pane * warm * uGlow;
    }`;
  function buildingMaterial(map, o) {
    o = Object.assign({ tint: 0x7d8296, glow: 1.25, lit: 0.34, seed: 0, glassLo: 0.17, glassHi: 0.36 }, o || {});
    const m = new THREE.MeshPhongMaterial({ map, color: o.tint, flatShading: true, shininess: 0, specular: 0x000000, side: THREE.DoubleSide });
    m.extensions = { derivatives: true };
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uGlow = { value: o.glow }; sh.uniforms.uLit = { value: o.lit }; sh.uniforms.uSeed = { value: o.seed };
      sh.uniforms.uGlassLo = { value: o.glassLo }; sh.uniforms.uGlassHi = { value: o.glassHi };
      sh.vertexShader = "varying vec3 vWPos;\n" + sh.vertexShader.replace("#include <project_vertex>", "#include <project_vertex>\n  vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;");
      sh.fragmentShader = "varying vec3 vWPos;\nuniform float uGlow; uniform float uLit; uniform float uSeed; uniform float uGlassLo; uniform float uGlassHi;\n"
        + sh.fragmentShader.replace("#include <emissivemap_fragment>", GLOW_GLSL);
    };
    m.customProgramCacheKey = () => "aksorn-building";
    return m;
  }
  function nightify(root, opts) {
    root.traverse((o) => {
      if (!o.isMesh) return;
      const src = o.material, map = src.map;
      if (map) { map.encoding = THREE.LinearEncoding; map.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy()); map.needsUpdate = true; }
      o.material = buildingMaterial(map, opts); src.dispose();
    });
    root.updateMatrixWorld(true);
    root.traverse((o) => { o.matrixAutoUpdate = false; });
  }

  /* ---------- model loading (GLB shipped as base64 <script> so it works from file:// too) ---------- */
  const LIBS = [
    "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js",
    "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/meshopt_decoder.js"
  ];
  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement("script"); s.src = src; s.async = true;
      s.onload = res; s.onerror = () => rej(new Error("failed to load " + src));
      document.head.appendChild(s);
    });
  }
  let libsP = null;
  const libs = () => libsP || (libsP = Promise.all(LIBS.map(loadScript)));
  function b64ToBuf(b64) { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
  async function loadModel(name) {
    await Promise.all([libs(), loadScript(`models/${name}.glb.js`)]);
    const store = window.__AKSORN_GLB || {}, b64 = store[name];
    if (!b64 || !THREE.GLTFLoader || !window.MeshoptDecoder) throw new Error("model " + name + " unavailable");
    const loader = new THREE.GLTFLoader(); loader.setMeshoptDecoder(window.MeshoptDecoder);
    const gltf = await new Promise((res, rej) => loader.parse(b64ToBuf(b64), "", res, rej));
    delete store[name];
    return gltf.scene;
  }

  // BRK detail pass: gold trim + chofa on the Thai gable, warm façade uplights, a lit lobby
  function enhanceBRK(TEX) {
    const g = SITE.gable, z = g.z + 0.12;
    const gold = new THREE.MeshPhongMaterial({ color: 0xd8a64c, emissive: 0x6a4512, shininess: 40, specular: 0x553311 });
    const grp = new THREE.Group();
    const rake = (x0, y0, x1, y1) => {
      const len = Math.hypot(x1 - x0, y1 - y0), b = box(len + 0.3, 0.28, 0.3, gold, (x0 + x1) / 2, (y0 + y1) / 2, z);
      b.rotation.z = Math.atan2(y1 - y0, x1 - x0); grp.add(b);
    };
    rake(g.legL, g.legTop, g.apex[0], g.apex[1]); rake(g.legR, g.legTop, g.apex[0], g.apex[1]);
    // hang hong tips where the rakes meet the legs, and a chofa finial on the apex
    [[g.legL, -1], [g.legR, 1]].forEach(([x, s]) => { const t = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.3, 6), gold); t.position.set(x + s * 0.3, g.legTop + 0.2, z); t.rotation.z = -s * 0.7; grp.add(t); });
    const chofa = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.16, 6, 16, Math.PI * 1.1), gold);
    chofa.position.set(g.apex[0] + 0.25, g.apex[1] + 0.75, z); chofa.rotation.z = Math.PI * 0.15; grp.add(chofa);
    scene.add(grp);

    // uplight washes: additive vertical gradients painted onto the façade and the gable legs
    const washTex = canvasTex(64, 128, (x, w, h) => {
      const gr = x.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, "rgba(255,196,120,0.95)"); gr.addColorStop(0.35, "rgba(255,180,110,0.35)"); gr.addColorStop(1, "rgba(255,170,100,0)");
      x.fillStyle = gr; x.fillRect(0, 0, w, h);
      const rg = x.createRadialGradient(w / 2, h, 0, w / 2, h, w * 0.75); rg.addColorStop(0, "rgba(0,0,0,0)"); rg.addColorStop(1, "rgba(0,0,0,0.85)");
      x.globalCompositeOperation = "destination-out"; x.fillStyle = rg; x.fillRect(0, 0, w, h);
    });
    const washMat = new THREE.MeshBasicMaterial({ map: washTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 });
    const wash = (x, zz, w, h) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), washMat); m.position.set(x, h / 2 + 0.1, zz); scene.add(m); };
    [-21, -15, 17, 23].forEach((x) => wash(x, 14.92, 5, 13));
    wash(g.legL + 0.6, z + 0.05, 3.2, 17); wash(g.legR - 0.6, z + 0.05, 3.2, 17);
    // lobby glow behind the entrance
    const lobby = new THREE.Mesh(new THREE.PlaneGeometry(11, 9), new THREE.MeshBasicMaterial({ map: TEX.glow, color: 0xffc48a, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
    lobby.position.set(1, 4, 15.2); scene.add(lobby);
    const L = new THREE.PointLight(0xffb36a, 1.6, 26, 2); L.position.set(1, 5, 21); scene.add(L);
  }

  // soft floodlight on the far auditorium so it reads as a warm silhouette
  function enhanceAuditorium(TEX) {
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: 0xffb070, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.position.set(SITE.auditorium[0], 10, SITE.auditorium[1] - 20); glow.scale.set(110, 40, 1); scene.add(glow);
  }

  async function loadCampus(TEX) {
    const hero = Promise.all([
      loadModel("brk").then((m) => { nightify(m, { seed: 3.1 }); scene.add(m); world.models.brk = m; enhanceBRK(TEX); }),
      loadModel("mcs").then((m) => { nightify(m, { seed: 7.7, lit: 0.36 }); scene.add(m); world.models.mcs = m; })
    ]);
    try { await hero; }
    catch (e) {
      console.warn("Campus models unavailable, using the procedural hall:", e);
      if (!world.fallback) buildFallbackHall();
      return;
    }
    // distant models stream in after the hero is on screen; failures here are cosmetic
    requestAnimationFrame(() => {
      loadModel("aud").then((m) => { nightify(m, { seed: 1.9, lit: 0.3, glow: 1.0, tint: 0x8a7f86 }); scene.add(m); world.models.aud = m; enhanceAuditorium(TEX); }).catch((e) => console.warn(e));
      loadModel("flag").then((m) => { nightify(m, { seed: 5.3, lit: 0, glow: 0, tint: 0x9196a8 }); scene.add(m); world.models.flag = m; }).catch((e) => console.warn(e));
    });
  }

  /* ---------- fallback: the original procedural Thai hall, set where BRK stands ---------- */
  function gable(w, h, d, mat, gold) {
    const g = new THREE.Group();
    const sh = new THREE.Shape(); sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(0, h); sh.closePath();
    const geo = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false }); geo.translate(0, 0, -d / 2);
    g.add(new THREE.Mesh(geo, mat));
    const len = Math.hypot(w / 2, h), ang = Math.atan2(h, w / 2);
    [-1, 1].forEach((s) => {
      const b = box(len + 0.4, 0.22, 0.28, gold); b.position.set(s * w / 4, h / 2, d / 2 + 0.08); b.rotation.z = s < 0 ? ang : -ang; g.add(b);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.9, 6), gold); tip.position.set(s * (w / 2 + 0.15), 0.35, d / 2 + 0.08); tip.rotation.z = -s * 0.6; g.add(tip);
    });
    const chofa = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.1, 6, 14, Math.PI * 1.1), gold);
    chofa.position.set(0.2, h + 0.35, d / 2 + 0.08); chofa.rotation.z = Math.PI * 0.15; g.add(chofa);
    return g;
  }
  function buildFallbackHall() {
    const root = new THREE.Group(); root.position.set(1, 0, 42); root.scale.setScalar(1.4);
    const g = new THREE.Group(); g.position.set(0, 0, -30); root.add(g);
    const stone = std(0x2b2c2f), wall = std(0x1d2024), white = std(0xcfc8b8), wood = std(0x2a1913);
    const roof = std(0x4d2219, { roughness: 0.75 }), gold = std(0xd5a24a, { roughness: 0.45, metalness: 0.35, emissive: 0x2a1a05 });
    g.add(box(38, 1.6, 17, stone, 0, 0.8, 0));
    for (let k = 0; k < 8; k++) g.add(box(11, (k + 1) * 0.2, 0.5, stone, 0, (k + 1) * 0.1, 8.5 + (7 - k) * 0.5 + 0.25));
    g.add(box(29, 6.2, 11, wall, 0, 4.7, -0.5));
    for (let i = 0; i < 10; i++) g.add(box(0.5, 6.2, 0.5, white, -13.5 + i * 3, 4.7, 6.6));
    const r = rng(17), lit = new THREE.MeshBasicMaterial({ color: 0xffc77d }), dark = new THREE.MeshBasicMaterial({ color: 0x1a140e });
    for (let row = 0; row < 2; row++) for (let i = 0; i < 10; i++) {
      if (i === 4 || i === 5) continue;
      const p = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.0), r() > 0.16 ? lit : dark); p.position.set(-12.6 + i * 2.8, 3.5 + row * 2.6, 5.02); g.add(p);
    }
    const door = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), new THREE.MeshBasicMaterial({ color: 0xffd79a })); door.position.set(0, 3.7, 5.02); g.add(door);
    g.add(box(31, 0.45, 14, wood, 0, 8.0, 0));
    const t1 = gable(32, 5.2, 14.5, roof, gold); t1.position.set(0, 8.2, 0); g.add(t1);
    const t2 = gable(23, 8.4, 11, roof, gold); t2.position.set(0, 9.2, 1.4); g.add(t2);
    const t3 = gable(14, 6.4, 4, roof, gold); t3.position.set(0, 8.2, 6.9); g.add(t3);
    const light = new THREE.PointLight(0xffb870, 1.4, 34, 2); light.position.set(0, 4, 9); g.add(light);
    scene.add(root); world.fallback = root;
  }

  /* ---------- rain trees: canopy, trunks and branches are three instanced draw calls for the whole campus ---------- */
  function buildTrees(TEX) {
    const r = rng(41), trees = [];
    const add = (x, z, s) => trees.push({ x, z, s });
    SITE.osmPlazaTrees.forEach(([x, z]) => add(x, z, 1.5 + r() * 0.3));
    SITE.osmGrove.forEach(([x, z]) => add(x, z, 1.4 + r() * 0.5));
    // plaza edges (the satellite view shows a canopy along the plaza), keeping BRK's entrance axis open
    [[-26, 24], [-27, 44], [-19, 49], [26, 49], [30, 26], [40, 44], [52, 27], [64, 44], [76, 27], [84, 46], [-36, 56], [92, 33]].forEach(([x, z]) => add(x + (r() - 0.5) * 2, z + (r() - 0.5) * 2, 1.45 + r() * 0.35));
    // garden and roadside
    [[-14, 64], [44, 64], [58, 70], [72, 82], [-12, 96], [66, 96], [34, 116], [46, 104]].forEach(([x, z]) => add(x, z, 1.3 + r() * 0.5));
    // behind BRK / MCS so their silhouettes sit in greenery
    [[-36, -8], [-38, 10], [-30, -30], [30, -30], [6, -32], [128, -10], [136, 20], [-60, 0]].forEach(([x, z]) => add(x, z, 1.5 + r() * 0.4));

    const canopy = [], trunks = [], branches = [], bl = [];
    const leafBase = new THREE.Color(0x1c3326);
    for (const t of trees) {
      const s = t.s;
      trunks.push({ p: [t.x, 2.2 * s, t.z], s: [s, s, s] });
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + r();
        branches.push({ p: [t.x + Math.cos(a) * 1.1 * s, 5.2 * s, t.z + Math.sin(a) * 1.1 * s], s: [s, s, s], r: [Math.sin(a) * 0.8, 0, -Math.cos(a) * 0.8] });
      }
      for (let i = 0; i < 9; i++) {
        const a = r() * Math.PI * 2, d = (i === 0 ? 0 : 1.6 + r() * 3.6) * s;
        const p = [t.x + Math.cos(a) * d, (6.4 + r() * 1.3 - d * 0.08 / s) * s, t.z + Math.sin(a) * d];
        const sc = [(2.4 + r() * 1.3) * s, (0.9 + r() * 0.5) * s, (2.4 + r() * 1.3) * s];
        canopy.push({ p, s: sc, r: [0, r() * 3, 0], c: leafBase.clone().multiplyScalar(0.8 + r() * 0.5) });
        for (let k = 0; k < (isMobile ? 4 : 8); k++) {
          const th = r() * Math.PI * 2, ph = r() * Math.PI * 0.45;
          bl.push(p[0] + Math.sin(ph) * Math.cos(th) * sc[0] * 0.98, p[1] + Math.cos(ph) * sc[1] * 0.98, p[2] + Math.sin(ph) * Math.sin(th) * sc[2] * 0.98);
        }
      }
    }
    const bark = lambert(0x1b1510);
    instanced(new THREE.CylinderGeometry(0.4, 0.75, 4.4, 7), bark, trunks);
    instanced(new THREE.CylinderGeometry(0.16, 0.32, 3.4, 5), bark, branches);
    instanced(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), canopy);
    const pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(bl), 3));
    scene.add(new THREE.Points(pg, new THREE.PointsMaterial({ map: TEX.blossom, color: 0xff8fbd, size: 0.7, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.85 })));
  }

  /* ---------- lamps and benches (instanced) ---------- */
  const LAMPS = [[-4, 24], [6, 24], [-4, 34], [6, 34], [-14, 45], [18, 42], [30, 22], [48, 22], [66, 22], [-24, 30], [20, 53], [-16, 53], [50, 53]];
  const LIT_LAMPS = [[-4, 34], [-4, 24], [48, 22]];
  function buildLamps(TEX) {
    const metal = new THREE.MeshPhongMaterial({ color: 0x1c1e20, shininess: 20 });
    instanced(new THREE.CylinderGeometry(0.07, 0.11, 4.4, 8), metal, LAMPS.map(([x, z]) => ({ p: [x, 2.2, z] })));
    instanced(new THREE.BoxGeometry(0.62, 0.16, 0.62), metal, LAMPS.map(([x, z]) => ({ p: [x, 4.62, z] })));
    instanced(new THREE.CylinderGeometry(0.22, 0.16, 0.42, 8), new THREE.MeshBasicMaterial({ color: 0xffe3b5 }), LAMPS.map(([x, z]) => ({ p: [x, 4.33, z] })));
    const pools = instanced(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ map: TEX.pool, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }),
      LAMPS.map(([x, z]) => ({ p: [x, 0.05, z], r: [-Math.PI / 2, 0, 0] })));
    pools.renderOrder = 1;
    world.lampGlow = glowPoints(LAMPS.flatMap(([x, z]) => [x, 4.33, z]), 0xffb867, 3.4, 3, TEX.glow, 0.85);
    LIT_LAMPS.forEach(([x, z]) => { const l = new THREE.PointLight(0xffb15e, 1.3, 14, 2); l.position.set(x, 4.1, z); scene.add(l); });
  }
  // concrete benches facing the plaza walkway (BRK's entrance axis is x≈1)
  const BENCHES = [[-6.2, 28, Math.PI / 2], [-6.2, 38, Math.PI / 2], [8.2, 28, -Math.PI / 2], [8.2, 38, -Math.PI / 2], [-8.5, 31.6, 0], [26, 36, Math.PI / 2], [44, 32, 0], [60, 32, 0]];
  function buildBenches() {
    const seat = [], legs = [];
    for (const [x, z, ry] of BENCHES) {
      seat.push({ p: [x, 0.45, z], s: [2.6, 0.12, 0.62], r: [0, ry, 0] });
      [-1, 1].forEach((k) => legs.push({ p: [x + Math.cos(ry) * k * 1.05, 0.2, z - Math.sin(ry) * k * 1.05], s: [0.18, 0.4, 0.5], r: [0, ry, 0] }));
    }
    instanced(new THREE.BoxGeometry(1, 1, 1), lambert(0x5b5853), seat);
    instanced(new THREE.BoxGeometry(1, 1, 1), lambert(0x3d3b38), legs);
  }

  /* ---------- cats: merged parts (body, head, eyes, tail) + one shared glow layer for every pair of eyes ---------- */
  function merge(parts) {
    const pos = [], nrm = [];
    for (const { geo, m } of parts) {
      const g = (geo.index ? geo.toNonIndexed() : geo.clone()).applyMatrix4(m);
      pos.push(...g.attributes.position.array); nrm.push(...g.attributes.normal.array);
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
    return out;
  }
  const M4 = (px, py, pz, sx, sy, sz, rx, ry, rz) => new THREE.Matrix4().compose(new THREE.Vector3(px, py, pz), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0)), new THREE.Vector3(sx, sy, sz));
  const CAT_GEO = {};
  function catGeometry(pose) {
    if (CAT_GEO[pose]) return CAT_GEO[pose];
    const sph = new THREE.SphereGeometry(1, 16, 12), leg = new THREE.CylinderGeometry(0.065, 0.075, 0.55, 8), ear = new THREE.ConeGeometry(0.1, 0.22, 4);
    const body = pose === "sit"
      ? merge([{ geo: sph, m: M4(0, 0.5, -0.05, 0.42, 0.52, 0.4) }, { geo: sph, m: M4(0, 0.78, 0.08, 0.3, 0.32, 0.28) },
        { geo: leg, m: M4(-0.13, 0.27, 0.22, 1, 1, 1) }, { geo: leg, m: M4(0.13, 0.27, 0.22, 1, 1, 1) },
        { geo: sph, m: M4(-0.13, 0.03, 0.27, 0.08, 0.05, 0.1) }, { geo: sph, m: M4(0.13, 0.03, 0.27, 0.08, 0.05, 0.1) }])
      : merge([{ geo: sph, m: M4(0, 0.32, 0, 0.4, 0.32, 0.62) }]);
    const head = merge([{ geo: sph, m: M4(0, 0, 0, 0.3, 0.27, 0.28) }, { geo: sph, m: M4(0, -0.07, 0.2, 0.14, 0.1, 0.11) },
      { geo: ear, m: M4(-0.15, 0.23, 0, 1, 1, 1, 0, Math.PI / 4, 0.28) }, { geo: ear, m: M4(0.15, 0.23, 0, 1, 1, 1, 0, Math.PI / 4, -0.28) }]);
    const eye = new THREE.SphereGeometry(0.048, 10, 8);
    const eyes = merge([{ geo: eye, m: M4(-0.1, 0, 0, 1, 1, 0.5) }, { geo: eye, m: M4(0.1, 0, 0, 1, 1, 0.5) }]);
    const pts = pose === "sit" ? [[0, 0, 0], [0.25, -0.02, -0.08], [0.48, 0, 0.12], [0.46, 0.02, 0.42]] : [[0, 0, 0], [0.3, 0, -0.1], [0.5, 0, 0.25], [0.42, 0, 0.6]];
    const tail = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 16, 0.055, 6, false);
    return (CAT_GEO[pose] = { body, head, eyes, tail });
  }
  const EYE_MAT = () => world.eyeMat || (world.eyeMat = new THREE.MeshBasicMaterial({ color: 0xdcff86 }));
  function makeCat(color, pose) {
    const G = catGeometry(pose), fur = new THREE.MeshLambertMaterial({ color });
    const g = new THREE.Group();
    g.add(new THREE.Mesh(G.body, fur));
    const head = new THREE.Group(); head.position.set(0, pose === "sit" ? 1.12 : 0.6, pose === "sit" ? 0.12 : 0.5);
    head.add(new THREE.Mesh(G.head, fur));
    const eyes = new THREE.Mesh(G.eyes, EYE_MAT()); eyes.position.set(0, 0.03, 0.245); head.add(eyes);
    g.add(head);
    const tail = new THREE.Mesh(G.tail, fur); tail.position.set(0.05, pose === "sit" ? 0.1 : 0.14, pose === "sit" ? -0.38 : -0.55); g.add(tail);
    return { group: g, parts: { head, eyes, tail }, phase: Math.random() * 10, nextBlink: 1 + Math.random() * 4, blinkT: -1, blink: 1 };
  }
  function placeCat(color, pose, x, y, z, faceX, faceZ, scale) {
    const c = makeCat(color, pose);
    c.group.position.set(x, y, z);
    c.group.rotation.y = Math.atan2(faceX - x, faceZ - z);
    c.group.scale.setScalar(scale);
    scene.add(c.group); world.cats.push(c); return c;
  }
  const CAT_SCALE = 0.62;
  function buildCats(TEX) {
    const ORANGE = 0xc8782f, BLACK = 0x18181b, GREY = 0x6d7277, WHITE = 0xdcd8cf, TABBY = 0x8a6a4a, S = CAT_SCALE, Y = SITE.brkStepsY, F = SITE.brkFront;
    world.byKey = {
      steps: placeCat(ORANGE, "sit", -2.4, Y, F + 0.1, 3, 70, S),           // on BRK's entrance steps
      stepsLoaf: placeCat(BLACK, "loaf", 4.6, Y, F - 0.1, 2, 70, S),
      platform: placeCat(BLACK, "sit", 9.4, 0, F + 1.4, 4, 70, S),          // at the foot of the gable's right leg
      lamp: placeCat(GREY, "sit", -3.1, 0, 34.9, 6, 50, S),                 // under a lit plaza lamp
      bench: placeCat(WHITE, "loaf", -6.2, 0.51, 37.6, 6, 37.6, S),         // curled up on a bench
      benchFoot: placeCat(TABBY, "sit", -7.2, 0, 29.4, 6, 40, S),
      path1: placeCat(BLACK, "sit", 1.8, 0, 30.5, 2, 60, S),                // on the walkway
      path2: placeCat(ORANGE, "loaf", 4.0, 0, 33.0, 2, 60, S),
      path3: placeCat(GREY, "sit", 0.2, 0, 26.0, 1, 60, S),
      tree: placeCat(WHITE, "sit", -5.0, 0, 41.6, 4, 60, S)                // at the base of an OSM plaza tree
    };
    world.eyeGlow = glowPoints(new Array(world.cats.length * 2 * 3).fill(0), 0xc6f55a, 0.16, 2.6, TEX.glow, 1);
  }
  const _v = new THREE.Vector3();
  function updateEyeGlow() {
    const a = world.eyeGlow.geometry.attributes.position;
    world.cats.forEach((c, i) => {
      [-0.1, 0.1].forEach((ex, k) => {
        _v.set(ex, 0, 0.03); c.parts.eyes.localToWorld(_v);
        if (c.blink < 0.35) _v.y = -50; // hidden while blinking
        a.setXYZ(i * 2 + k, _v.x, _v.y, _v.z);
      });
    });
    a.needsUpdate = true;
  }

  function buildBlossoms(TEX) {
    const n = isMobile ? 160 : 420, pos = new Float32Array(n * 3), meta = [];
    const r = rng(29);
    const spawn = (i, top) => { pos[i * 3] = -40 + r() * 130; pos[i * 3 + 1] = top ? 18 + r() * 10 : r() * 26; pos[i * 3 + 2] = 10 + r() * 60; };
    for (let i = 0; i < n; i++) { spawn(i, false); meta.push({ v: 0.5 + r() * 0.9, ph: r() * 10, sway: 0.3 + r() * 0.6 }); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: TEX.blossom, color: 0xffa3c7, size: 0.32, transparent: true, depthWrite: false, opacity: 0.9 }));
    pts.frustumCulled = false; scene.add(pts); world.blossoms = { pts, pos, meta, n, spawn };
  }

  function buildWorld() {
    const TEX = {
      glow: radial([[0, "rgba(255,255,255,1)"], [0.18, "rgba(255,255,255,.55)"], [0.5, "rgba(255,255,255,.12)"], [1, "rgba(255,255,255,0)"]]),
      pool: radial([[0, "rgba(255,190,110,.55)"], [0.5, "rgba(255,170,90,.16)"], [1, "rgba(255,160,80,0)"]]),
      blossom: canvasTex(64, 64, (x, s) => {
        const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
        g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.35, "rgba(255,190,215,.9)"); g.addColorStop(1, "rgba(255,120,170,0)");
        x.fillStyle = g; x.beginPath(); x.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2); x.fill();
      })
    };
    world.TEX = TEX;
    scene.add(new THREE.HemisphereLight(0x6070a0, 0x0b0907, 0.85));
    const moonLight = new THREE.DirectionalLight(0xffd6e4, 0.5); moonLight.position.set(150, 212, -360); scene.add(moonLight);
    const fill = new THREE.DirectionalLight(0x5c76b8, 0.3); fill.position.set(-80, 60, 160); scene.add(fill);

    buildSky(TEX); setProgress(25);
    buildGround(TEX);
    buildTrees(TEX); setProgress(45);
    buildLamps(TEX); buildBenches();
    buildCats(TEX); setProgress(60);
    buildBlossoms(TEX);
  }

  /* ============================================================ camera rig */
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  let KEYS = [];
  function defineKeys() {
    KEYS = [
      { pos: V(-6, 9, 128), look: V(18, 25, 0) },          // 00 hero: BRK's gable and tower, MCS to the right, the moon above
      { pos: V(7.5, 1.7, 47), look: V(-5.5, 0.9, 33) },     // 01 keepers: the bench, the lamp and the cats around them
      { pos: V(3.2, 0.75, 42), look: V(1.4, 0.7, 24) },     // 02 field notes: cat eye level on the plaza walkway
      { pos: V(-40, 120, 235), look: V(40, 0, 60) },        // 03 process: the whole precinct from above, auditorium and flag included
      { pos: V(-20, 6, 192), look: V(-125, 22, 132) }      // 04 care: along the auditorium to the flagpole
    ];
    if (isMobile) { KEYS[0].pos.set(-2, 10, 170); KEYS[0].look.set(14, 30, 0); KEYS[1].pos.set(9, 2.2, 52); KEYS[3].pos.set(-55, 160, 300); }
  }
  const cam = { pos: null, look: null, tPos: null, tLook: null };
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  let sections = [], activeIdx = 0;

  function scrollState() {
    const mid = window.scrollY + innerHeight * 0.5;
    const centers = sections.map((s, i) => (i === 0 ? innerHeight * 0.5 : s.offsetTop + s.offsetHeight * 0.5));
    let i = 0; while (i < centers.length - 1 && mid > centers[i + 1]) i++;
    let t = 0;
    if (i < centers.length - 1) { t = (mid - centers[i]) / (centers[i + 1] - centers[i]); t = Math.min(1, Math.max(0, t)); t = t * t * (3 - 2 * t); }
    let nearest = 0, best = Infinity;
    centers.forEach((c, k) => { const d = Math.abs(c - mid); if (d < best) { best = d; nearest = k; } });
    return { i, t, nearest };
  }

  /* ============================================================ viewports */
  const vpCams = {};
  function vpCamera(catRef, side, dist, up) {
    const k = catRef.group.scale.x;
    const c = new THREE.PerspectiveCamera(32, 1, 0.05, 600);
    const head = new THREE.Vector3(); catRef.parts.head.getWorldPosition(head);
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(catRef.group.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(catRef.group.quaternion);
    c.position.copy(head).addScaledVector(fwd, dist * k).addScaledVector(right, side * k).add(new THREE.Vector3(0, up * k, 0));
    c.lookAt(head.clone().add(new THREE.Vector3(0, -0.15 * k, 0)));
    return c;
  }
  function defineViewports() {
    scene.updateMatrixWorld(true);
    const k = world.byKey;
    vpCams.hero = vpCamera(k.steps, 1.4, 5.4, 1.1);
    // one portrait camera per 3D cat; field-note cards pick the one whose colour matches the real cat
    Object.keys(k).forEach((key, i) => { vpCams["cat:" + key] = vpCamera(k[key], i % 2 ? 0.8 : -0.8, 4.0, 0.55); });
  }

  // match a real cat (from the sheet) to a 3D stand-in by the colour words in its description
  const COLOR_POOLS = {
    orange: ["steps", "path2"], black: ["path1", "stepsLoaf", "platform"], grey: ["lamp", "path3"],
    white: ["bench", "tree"], mixed: ["benchFoot"]
  };
  function colorOf(c) {
    const s = [c.marks, c.name, ...(c.nicknames || [])].join(" ");
    if (/สามสี|ลาย|สลิด|calico|tabby/i.test(s)) return /ส้ม/.test(s) && !/สามสี/.test(s) ? "orange" : "mixed";
    if (/ส้ม|orange|ginger/i.test(s)) return "orange";
    if (/ดำ|black/i.test(s)) return "black";
    if (/เทา|grey|gray/i.test(s)) return "grey";
    if (/ขาว|white/i.test(s)) return "white";
    return "mixed";
  }
  function standInFor(cat, used) {
    const order = [colorOf(cat), "mixed", "orange", "grey", "black", "white"];
    for (const col of order) for (const key of COLOR_POOLS[col]) if (!used.has(key)) { used.add(key); return key; }
    return "lamp";
  }
  function renderViewports() {
    const els = $$("[data-vp-key]");
    let any = false;
    for (const el of els) {
      const c = vpCams[el.dataset.vpKey]; if (!c) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > innerHeight || getComputedStyle(el).display === "none") continue;
      c.aspect = r.width / r.height; c.updateProjectionMatrix();
      const x = Math.round(r.left), y = Math.round(innerHeight - r.bottom), w = Math.round(r.width), h = Math.round(r.height);
      renderer.setScissorTest(true); renderer.setViewport(x, y, w, h); renderer.setScissor(x, y, w, h);
      renderer.render(scene, c); any = true;
    }
    if (any) { renderer.setScissorTest(false); renderer.setViewport(0, 0, innerWidth, innerHeight); }
  }

  /* ============================================================ animation */
  let last = performance.now(), running = true, firstFrame = null;
  const firstFrameP = new Promise((res) => { firstFrame = res; });
  const _off = new THREE.Vector3();
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; const t = now / 1000;

    const st = scrollState();
    const a = KEYS[st.i], b = KEYS[Math.min(st.i + 1, KEYS.length - 1)];
    cam.tPos.copy(a.pos).lerp(b.pos, st.t); cam.tLook.copy(a.look).lerp(b.look, st.t);
    const k = reduce ? 1 : 1 - Math.exp(-dt * 3.2);
    cam.pos.lerp(cam.tPos, k); cam.look.lerp(cam.tLook, k);
    pointer.sx += (pointer.x - pointer.sx) * (reduce ? 1 : 1 - Math.exp(-dt * 2.5));
    pointer.sy += (pointer.y - pointer.sy) * (reduce ? 1 : 1 - Math.exp(-dt * 2.5));
    const par = Math.min(2.5, 0.02 * cam.pos.distanceTo(cam.look)); // parallax scales with framing distance
    camera.position.copy(cam.pos).add(_off.set(pointer.sx * par, -pointer.sy * par * 0.5, 0));
    camera.lookAt(cam.look);

    if (!reduce) {
      for (const c of world.cats) {
        c.parts.tail.rotation.y = Math.sin(t * 1.3 + c.phase) * 0.35;
        c.parts.head.rotation.y = Math.sin(t * 0.28 + c.phase) * 0.32;
        c.nextBlink -= dt;
        if (c.nextBlink <= 0 && c.blinkT < 0) { c.blinkT = 0; c.nextBlink = 2.5 + Math.random() * 5; }
        if (c.blinkT >= 0) {
          c.blinkT += dt; const s = c.blinkT < 0.07 ? 1 - c.blinkT / 0.07 : c.blinkT < 0.16 ? (c.blinkT - 0.07) / 0.09 : 1;
          c.blink = Math.max(0.08, s); c.parts.eyes.scale.y = c.blink;
          if (c.blinkT >= 0.16) { c.blinkT = -1; c.blink = 1; }
        }
      }
      const B = world.blossoms;
      if (B) {
        for (let i = 0; i < B.n; i++) {
          const m = B.meta[i];
          B.pos[i * 3 + 1] -= m.v * dt;
          B.pos[i * 3] += Math.sin(t * 0.8 + m.ph) * m.sway * dt;
          B.pos[i * 3 + 2] += Math.cos(t * 0.6 + m.ph) * m.sway * 0.5 * dt;
          if (B.pos[i * 3 + 1] < 0) B.spawn(i, true);
        }
        B.pts.geometry.attributes.position.needsUpdate = true;
      }
      world.lampGlow.material.uniforms.opacity.value = 0.82 + Math.sin(t * 7) * 0.03 + Math.sin(t * 13) * 0.02;
    }
    updateEyeGlow();

    renderer.render(scene, camera);
    if (window.__aksornLanding) window.__aksornLanding.models = Object.keys(world.models).join(","), window.__aksornLanding.heroCalls = renderer.info.render.calls, window.__aksornLanding.heroTris = renderer.info.render.triangles;
    renderViewports();
    if (firstFrame) { firstFrame(); firstFrame = null; }
    requestAnimationFrame(frame);
  }

  /* ============================================================ page wiring */
  function wirePage() {
    sections = $$("[data-cam]");
    const navLinks = $$(".nav-links a"), rail = $$("#rail a");
    const wordmark = $(".wordmark"), grass = $("#fgGrass");
    const nav = $("#nav");
    const onScroll = () => {
      nav.classList.toggle("scrolled", window.scrollY > 40);
      const st = scrollState();
      if (st.nearest !== activeIdx || !onScroll.once) {
        activeIdx = st.nearest; onScroll.once = true;
        rail.forEach((a) => a.classList.toggle("active", +a.dataset.i === activeIdx));
        navLinks.forEach((a, i) => a.classList.toggle("active", i + 1 === activeIdx));
      }
      const y = window.scrollY;
      if (y < innerHeight * 1.2 && !reduce) {
        if (wordmark) wordmark.style.transform = `translate(-50%, ${y * 0.32}px)`;
        if (grass) grass.style.transform = `translateY(${y * -0.06}px)`;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.12 });
      $$("[data-rv]").forEach((el) => io.observe(el));
    } else $$("[data-rv]").forEach((el) => el.classList.add("in"));

    window.addEventListener("pointermove", (e) => { pointer.x = e.clientX / innerWidth * 2 - 1; pointer.y = e.clientY / innerHeight * 2 - 1; }, { passive: true });
    const fc = $("#footCourse"); if (fc) fc.textContent = CFG.COURSE || "";
  }

  /* ============================================================ live data */
  async function fillData() {
    if (!window.CatData) return;
    const r = await window.CatData.load(CFG);
    const cats = r.cats, active = cats.filter((c) => c.status === "active");
    const moms = new Set(cats.filter((c) => c.mother && r.byId[c.mother]).map((c) => c.mother));
    const steril = active.length ? Math.round(100 * active.filter((c) => c.sterilised === "yes").length / active.length) : 0;
    const sources = new Set(cats.map((c) => c.source).filter(Boolean));
    const set = (sel, v) => { const el = $(sel); if (el) el.textContent = v; };
    set("#stCats", cats.length); set("#stFamilies", moms.size); set("#stSteril", steril + "%"); set("#stSources", sources.size);
    if (r.usingSample && $(".stats")) {
      const n = document.createElement("p"); n.className = "card-note"; n.style.marginTop = "14px";
      n.textContent = "ตัวเลขนี้มาจากข้อมูลตั้งต้นที่ดึงจาก Instagram @aksorncats ยังไม่ได้ยืนยัน";
      $(".stats").after(n);
    }

    const cardsEl = $("#cards"); if (!cardsEl) return;
    const picks = active.filter((c) => c.photo).concat(active.filter((c) => !c.photo)).slice(0, 3);
    const hasGL = !document.body.classList.contains("no-gl");
    const used = new Set();
    cardsEl.innerHTML = picks.map((c, i) => {
      const meta = [c.locations[0], c.sterilised === "yes" ? "ทำหมันแล้ว" : c.sterilised === "no" ? "ยังไม่ทำหมัน" : ""].filter(Boolean).join(" · ");
      const visual = c.photo
        ? `<div class="ph-img"><img src="${esc(c.photo)}" alt="รูปของ ${esc(c.name)}" loading="lazy"></div>`
        : `<div class="vp" data-vp-key="cat:${standInFor(c, used)}" aria-hidden="true"></div>`;
      return `<a class="card" data-rv href="cats.html#/cat/${encodeURIComponent(c.id)}">
        ${visual}
        <div class="card-cap"><h3>${esc(c.name)}</h3><span>0${i + 1} / 0${picks.length}</span></div>
        <div class="card-meta">${esc(meta)}</div>
        ${c.photo ? "" : `<div class="card-note">${hasGL ? "ภาพจำลอง · ยังไม่มีรูปจริง" : "ยังไม่มีรูป"}</div>`}
      </a>`;
    }).join("");
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.12 });
      $$("#cards [data-rv]").forEach((el) => io.observe(el));
    } else $$("#cards [data-rv]").forEach((el) => el.classList.add("in"));
  }

  /* ============================================================ boot */
  function boot() {
    const t0 = performance.now();
    makeGrain(); makeGrass(); setProgress(10);
    const heroVp = $(".hero-vp .vp"); if (heroVp) heroVp.dataset.vpKey = "hero";
    wirePage();
    let ok = initGL(), campusP = Promise.resolve();
    if (ok) {
      try { buildWorld(); defineKeys(); defineViewports(); campusP = loadCampus(world.TEX); }
      catch (e) { console.error("3D scene failed, showing the page without it:", e); ok = false; }
    }
    if (!ok) { document.body.classList.add("no-gl"); }
    else {
      cam.pos = KEYS[0].pos.clone(); cam.look = KEYS[0].look.clone(); cam.tPos = cam.pos.clone(); cam.tLook = cam.look.clone();
      const st = scrollState(); const a = KEYS[st.i], b = KEYS[Math.min(st.i + 1, KEYS.length - 1)];
      cam.pos.copy(a.pos).lerp(b.pos, st.t); cam.look.copy(a.look).lerp(b.look, st.t);
      window.addEventListener("resize", () => {
        renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); updatePointScale();
      });
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) running = false; else if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
      });
      camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); updatePointScale();
      requestAnimationFrame(frame);
      firstFrameP.then(() => { if (window.__aksornLanding) window.__aksornLanding.firstFrameMs = Math.round(performance.now() - t0); });
    }
    // the loader waits for the cat data and (briefly) for BRK+MCS, never for the distant models
    const heroReady = Promise.race([campusP.then(() => setProgress(90)), new Promise((r) => setTimeout(r, 3500))]);
    Promise.all([fillData().catch((e) => console.warn(e)), heroReady]).finally(() => {
      setProgress(100);
      if (window.__aksornLanding) window.__aksornLanding.readyMs = Math.round(performance.now() - t0);
    });
    const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    Promise.race([fontsReady, new Promise((r) => setTimeout(r, 2500))]).then(() => setProgress(75));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
