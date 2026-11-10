/* Curved glass rim for the landing page panels (Chromium only).
   Each .panel gets its own SVG filter used in backdrop-filter. Within RIM px of the rounded edge a displacement
   map pulls the scene inward, the way the thick edge of a glass pane (or iOS's glass) bends what is behind it.
   The rim stays sharp so the bent lines read; the 9px blur and most of the tint fade in only towards the middle,
   and a thin lit line runs round the edge, brightest where the light comes from (top left).
   Other browsers keep the plain glass from landing.css, because they ignore or reject url() filters in backdrop-filter. */
(function () {
  "use strict";
  const brands = navigator.userAgentData && navigator.userAgentData.brands;
  if (!brands || !brands.some((b) => /Chromium/.test(b.brand))) return;
  if (window.matchMedia("(prefers-reduced-transparency: reduce)").matches) return;

  const RIM = 36, STRENGTH = 96, K = 0.5; // rim width (px), bend strength (px), map resolution
  const LX = -0.5, LY = -0.866; // direction the light comes from (top left)
  const NS = "http://www.w3.org/2000/svg";
  const holder = document.createElementNS(NS, "svg");
  holder.setAttribute("width", "0"); holder.setAttribute("height", "0"); holder.setAttribute("aria-hidden", "true");
  holder.style.position = "absolute";
  document.body.appendChild(holder);

  const smooth = (a) => { a = Math.min(1, Math.max(0, a)); return a * a * (3 - 2 * a); };

  // maps for a w×h rounded rectangle with corner radius r: displacement, blur/tint weight, and the lit edge
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
        // blur and tint weight: 0 on the rim, 1 inside
        const a = smooth((depth - rim * 0.5) / (rim * 0.6));
        M.d[k] = M.d[k + 1] = M.d[k + 2] = 255; M.d[k + 3] = Math.round(a * 255);
        // lit edge: a thin bright line plus a softer glow across the rim, facing the light (and a weaker bounce opposite)
        const face = Math.max(0, -(nx * LX + ny * LY)), back = Math.max(0, nx * LX + ny * LY);
        const light = 0.3 + 0.7 * face + 0.35 * back;
        const s = (Math.exp(-depth / 1.6) * 0.95 + t * t * 0.22) * light;
        S.d[k] = S.d[k + 1] = S.d[k + 2] = 255; S.d[k + 3] = Math.round(Math.min(1, s) * 255);
      }
    }
    [D, M, S].forEach((o) => o.x.putImageData(o.im, 0, 0));
    return { disp: D.c.toDataURL(), mask: M.c.toDataURL(), spec: S.c.toDataURL() };
  }

  const el = (tag, attrs) => { const n = document.createElementNS(NS, tag); for (const a in attrs) n.setAttribute(a, attrs[a]); return n; };
  const tint = () => {
    const cs = getComputedStyle(document.documentElement);
    const rgb = (cs.getPropertyValue("--glass-fill") || "255,255,255").trim();
    const num = (v, d) => { const x = parseFloat(cs.getPropertyValue(v)); return isNaN(x) ? d : x; };
    return { color: `rgb(${rgb})`, a: num("--glass-fill-a", 0.4), rim: num("--glass-fill-rim", 0.22), spec: num("--glass-spec", 1) };
  };
  const floods = [];
  function paintTint() {
    const t = tint();
    // the rim wash sits under the inner tint, so inner + rim together come to the full --glass-fill-a in the middle
    const rimA = t.a * t.rim, innerA = rimA >= 1 ? 0 : Math.max(0, (t.a - rimA) / (1 - rimA));
    floods.forEach(([inner, rimF, specM]) => {
      inner.setAttribute("flood-color", t.color); inner.setAttribute("flood-opacity", String(innerA));
      rimF.setAttribute("flood-color", t.color); rimF.setAttribute("flood-opacity", String(rimA));
      specM.setAttribute("values", `1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${t.spec} 0`);
    });
  }

  let n = 0;
  function attach(p) {
    const id = "lg-" + n++;
    const img = (result) => el("feImage", { x: 0, y: 0, preserveAspectRatio: "none", result });
    const f = el("filter", { id, filterUnits: "userSpaceOnUse", "color-interpolation-filters": "sRGB", x: 0, y: 0 });
    const im = img("map"), mk = img("mask"), sp = img("spec");
    const fillIn = el("feFlood", { result: "fillIn" }), fillRim = el("feFlood", { result: "fillRim" });
    const specM = el("feColorMatrix", { in: "spec", type: "matrix", result: "lit" });
    floods.push([fillIn, fillRim, specM]);
    [
      im,
      el("feDisplacementMap", { in: "SourceGraphic", in2: "map", scale: STRENGTH, xChannelSelector: "R", yChannelSelector: "G", result: "bent" }),
      // bent scene, lightly softened so the rim doesn't alias
      el("feGaussianBlur", { in: "bent", stdDeviation: 1, result: "rim" }),
      // the frosted middle: the full blur, kept only where the mask says "inside"
      el("feGaussianBlur", { in: "bent", stdDeviation: 9, edgeMode: "duplicate", result: "frost" }),
      mk,
      el("feComposite", { in: "frost", in2: "mask", operator: "in", result: "inner" }),
      // tint: a thin wash everywhere, the full tint only inside
      fillRim, fillIn,
      el("feComposite", { in: "fillIn", in2: "mask", operator: "in", result: "tintIn" }),
      sp, specM,
    ].forEach((x) => f.appendChild(x));
    const merge = el("feMerge", {});
    ["rim", "inner", "fillRim", "tintIn", "lit"].forEach((x) => merge.appendChild(el("feMergeNode", { in: x })));
    f.appendChild(merge);
    holder.appendChild(f);
    paintTint();
    let last = "";
    const update = () => {
      const w = Math.round(p.offsetWidth), h = Math.round(p.offsetHeight);
      if (!w || !h || w + "x" + h === last) return; last = w + "x" + h;
      const r = Math.min(parseFloat(getComputedStyle(p).borderTopLeftRadius) || 0, w / 2, h / 2);
      f.setAttribute("width", w); f.setAttribute("height", h);
      const mp = map(w, h, r);
      [im, mk, sp].forEach((x) => { x.setAttribute("width", w); x.setAttribute("height", h); });
      im.setAttribute("href", mp.disp); mk.setAttribute("href", mp.mask); sp.setAttribute("href", mp.spec);
      const bf = `url(#${id}) saturate(1.5)`;
      p.style.backdropFilter = bf; p.style.webkitBackdropFilter = bf;
      p.classList.add("lg");
    };
    update();
    let t = 0;
    if ("ResizeObserver" in window) new ResizeObserver(() => { clearTimeout(t); t = setTimeout(update, 120); }).observe(p);
  }
  const start = () => {
    document.querySelectorAll(".panel").forEach(attach);
    // day/night switches the tint colour
    new MutationObserver(paintTint).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
