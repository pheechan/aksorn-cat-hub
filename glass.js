/* Curved glass rim for the landing page panels (Chromium only).
   Within RIM px of each panel's rounded edge a displacement map pulls the scene inward, the way the thick edge of
   a glass pane (or iOS's glass) bends what is behind it, and a thin lit line runs round the edge, brightest where
   the light comes from (top left). The rim stays sharp so the bent lines read; the 9px blur fades in towards the middle.
   The tint is the panel's own CSS background, so the rim and the middle are equally see-through.

   It is built from two layers behind the panel's content, because one SVG filter doing both the bend and a masked
   blur cost a whole frame at 120 Hz (measured: 8.3 ms -> 16.7 ms a frame):
     .lg-rim  backdrop-filter: url(#lg-N), a cheap filter that only bends the scene and adds the lit edge
     .lg-mid  backdrop-filter: blur(9px), the browser's fast blur, masked so it fades in away from the rim
   (the middle layer blurs what the rim layer drew, so the bent scene and the blur line up).

   Cost: the bend re-runs every frame the 3D scene moves, so it is switched on only when it can
   be afforded: never on touch devices, machines with under 4 cores or 4 GB, data saver or reduced transparency;
   only while a panel is on screen; and it switches itself off for good if the page drops below ~40 fps with it.
   Other browsers (and every case above) keep the plain glass from landing.css. */
(function () {
  "use strict";
  const brands = navigator.userAgentData && navigator.userAgentData.brands;
  if (!brands || !brands.some((b) => /Chromium/.test(b.brand))) return;
  const mq = (q) => window.matchMedia(q).matches;
  if (mq("(prefers-reduced-transparency: reduce)") || mq("(pointer: coarse)")) return;
  if ((navigator.hardwareConcurrency || 8) < 4 || (navigator.deviceMemory || 8) < 4) return; // the frame-rate guard below catches the rest
  if (navigator.connection && navigator.connection.saveData) return;

  const RIM = 36, STRENGTH = 96, K = 0.5; // rim width (px), bend strength (px), map resolution
  const LX = -0.5, LY = -0.866; // direction the light comes from (top left)
  const NS = "http://www.w3.org/2000/svg";
  const holder = document.createElementNS(NS, "svg");
  holder.setAttribute("width", "0"); holder.setAttribute("height", "0"); holder.setAttribute("aria-hidden", "true");
  holder.style.position = "absolute";
  document.body.appendChild(holder);

  const smooth = (a) => { a = Math.min(1, Math.max(0, a)); return a * a * (3 - 2 * a); };

  // maps for a w×h rounded rectangle with corner radius r: displacement, blur weight, and the lit edge
  function map(w, h, r) {
    const rim = Math.min(RIM, Math.min(w, h) * 0.16);
    const cw = Math.max(2, Math.round(w * K)), ch = Math.max(2, Math.round(h * K));
    const mk = () => { const c = document.createElement("canvas"); c.width = cw; c.height = ch; const x = c.getContext("2d"); const im = x.createImageData(cw, ch); return { c, x, im, d: im.data }; };
    const D = mk(), M = mk(), S = mk();
    const hw = w / 2, hh = h / 2;
    for (let j = 0; j < ch; j++) {
      const y = (j + 0.5) / K, py = y - hh, qy = Math.abs(py) - (hh - r);
      for (let i = 0; i < cw; i++) {
        const x = (i + 0.5) / K, px = x - hw, qx = Math.abs(px) - (hw - r);
        // signed distance to the rounded edge (negative inside) and the outward normal
        const ox = Math.max(qx, 0), oy = Math.max(qy, 0);
        const sd = Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r;
        let nx = 0, ny = 0;
        if (ox > 0 && oy > 0) { const l = Math.hypot(ox, oy); nx = Math.sign(px) * ox / l; ny = Math.sign(py) * oy / l; }
        else if (qx > qy) nx = Math.sign(px); else ny = Math.sign(py);
        const depth = Math.max(0, -sd), k = (j * cw + i) * 4;
        // bend: strongest at the edge, easing off across the rim (convex lens)
        const t = depth < rim ? 1 - depth / rim : 0, m = t * t * (1.6 - 0.6 * t);
        D.d[k] = 128 - nx * m * 127; D.d[k + 1] = 128 - ny * m * 127; D.d[k + 2] = 128; D.d[k + 3] = 255;
        // blur weight: 0 on the rim, 1 inside
        const a = smooth((depth - rim * 0.5) / (rim * 0.6));
        M.d[k] = M.d[k + 1] = M.d[k + 2] = 255; M.d[k + 3] = Math.round(a * 255);
        // lit edge: a thin bright line plus a softer glow across the rim, facing the light (and a weaker bounce opposite)
        const face = Math.max(0, -(nx * LX + ny * LY)), back = Math.max(0, nx * LX + ny * LY);
        const s = (Math.exp(-depth / 1.6) * 0.95 + t * t * 0.22) * (0.3 + 0.7 * face + 0.35 * back);
        S.d[k] = S.d[k + 1] = S.d[k + 2] = 255; S.d[k + 3] = Math.round(Math.min(1, s) * 255);
      }
    }
    [D, M, S].forEach((o) => o.x.putImageData(o.im, 0, 0));
    return { disp: D.c.toDataURL(), mask: M.c.toDataURL(), spec: S.c.toDataURL() };
  }

  const el = (tag, attrs) => { const n = document.createElementNS(NS, tag); for (const a in attrs) n.setAttribute(a, attrs[a]); return n; };
  // the lit edge is softer at night, read from --glass-spec in landing.css
  const specs = [];
  function paintSpec() {
    const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--glass-spec"));
    const a = isNaN(v) ? 1 : v;
    specs.forEach((m) => m.setAttribute("values", `1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${a} 0`));
  }

  const panels = [];
  let dead = false;
  function attach(p) {
    const id = "lg-" + panels.length;
    const img = (result) => el("feImage", { x: 0, y: 0, preserveAspectRatio: "none", result });
    const f = el("filter", { id, filterUnits: "userSpaceOnUse", "color-interpolation-filters": "sRGB", x: 0, y: 0 });
    const im = img("map"), sp = img("spec");
    const specM = el("feColorMatrix", { in: "spec", type: "matrix", result: "lit" });
    specs.push(specM);
    [
      im,
      el("feDisplacementMap", { in: "SourceGraphic", in2: "map", scale: STRENGTH, xChannelSelector: "R", yChannelSelector: "G", result: "bent" }),
      sp, specM,
    ].forEach((x) => f.appendChild(x));
    const merge = el("feMerge", {});
    ["bent", "lit"].forEach((x) => merge.appendChild(el("feMergeNode", { in: x })));
    f.appendChild(merge);
    holder.appendChild(f);
    // the two layers sit behind the panel's content (the panel is its own stacking context)
    const layer = (cls) => { const d = document.createElement("div"); d.className = cls; d.setAttribute("aria-hidden", "true"); p.prepend(d); return d; };
    const mid = layer("lg-mid"), rim = layer("lg-rim");
    rim.style.backdropFilter = rim.style.webkitBackdropFilter = `url(#${id}) saturate(1.5)`;
    const st = { p, id, f, im, sp, rim, mid, size: "", on: false, visible: false };
    panels.push(st);
    let t = 0;
    if ("ResizeObserver" in window) new ResizeObserver(() => { clearTimeout(t); t = setTimeout(() => sync(st), 120); }).observe(p);
  }
  // build the maps lazily (first time a panel comes on screen) and switch the filter with visibility
  function sync(st) {
    const want = st.visible && !dead;
    if (want) {
      const w = Math.round(st.p.offsetWidth), h = Math.round(st.p.offsetHeight);
      if (w && h && w + "x" + h !== st.size) {
        st.size = w + "x" + h;
        const r = Math.min(parseFloat(getComputedStyle(st.p).borderTopLeftRadius) || 0, w / 2, h / 2);
        st.f.setAttribute("width", w); st.f.setAttribute("height", h);
        const mp = map(w, h, r);
        [st.im, st.sp].forEach((x) => { x.setAttribute("width", w); x.setAttribute("height", h); });
        st.im.setAttribute("href", mp.disp); st.sp.setAttribute("href", mp.spec);
        const m = `url(${mp.mask}) 0 0 / 100% 100% no-repeat`;
        st.mid.style.webkitMask = m; st.mid.style.mask = m;
      }
    }
    if (want === st.on) return;
    st.on = want;
    // on: the panel hands its own blur to the two layers; off: the layers hide and the CSS glass takes over
    st.p.classList.toggle("lg", want);
    if (want) watch();
  }

  // frame-rate guard: while a bent panel is on screen, sample ~90 frames; if the median frame is slower than
  // ~40 fps, drop back to the plain glass for the rest of the visit
  let watching = false, checked = false;
  function watch() {
    if (watching || checked) return;
    watching = true;
    const times = []; let last = 0, skip = 10;
    const tick = (now) => {
      if (dead) return;
      if (!panels.some((x) => x.on)) { watching = false; return; } // nothing to measure; try again next time
      if (skip > 0) { skip--; last = now; requestAnimationFrame(tick); return; } // let the first frames settle
      times.push(now - last); last = now;
      if (times.length < 90) { requestAnimationFrame(tick); return; }
      watching = false; checked = true;
      times.sort((a, b) => a - b);
      if (times[45] > 25) { dead = true; panels.forEach(sync); }
    };
    requestAnimationFrame(tick);
  }

  const start = () => {
    document.querySelectorAll(".panel").forEach(attach);
    paintSpec();
    new MutationObserver(paintSpec).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      const st = panels.find((x) => x.p === e.target); if (!st) return;
      st.visible = e.isIntersecting; sync(st);
    }), { rootMargin: "120px 0px" });
    panels.forEach((st) => io.observe(st.p));
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
