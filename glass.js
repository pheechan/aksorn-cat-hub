/* Curved glass rim for the landing page panels (Chromium only).
   Each .panel gets its own SVG filter used in backdrop-filter. Within RIM px of the rounded edge a displacement
   map pulls the scene inward, the way the thick edge of a glass pane (or iOS's glass) bends what is behind it;
   the rim stays sharp so the bent lines read, and the 9px blur fades in only towards the middle. Other browsers keep the plain clear glass from landing.css,
   because they ignore or reject url() filters in backdrop-filter. */
(function () {
  "use strict";
  const brands = navigator.userAgentData && navigator.userAgentData.brands;
  if (!brands || !brands.some((b) => /Chromium/.test(b.brand))) return;
  if (window.matchMedia("(prefers-reduced-transparency: reduce)").matches) return;

  const RIM = 22, STRENGTH = 38, K = 0.5; // rim width (px), bend strength (px), map resolution
  const NS = "http://www.w3.org/2000/svg";
  const holder = document.createElementNS(NS, "svg");
  holder.setAttribute("width", "0"); holder.setAttribute("height", "0"); holder.setAttribute("aria-hidden", "true");
  holder.style.position = "absolute";
  document.body.appendChild(holder);

  // displacement map for a w×h rounded rectangle with corner radius r
  function map(w, h, r) {
    const cw = Math.max(2, Math.round(w * K)), ch = Math.max(2, Math.round(h * K));
    const c = document.createElement("canvas"); c.width = cw; c.height = ch;
    const x2d = c.getContext("2d"), img = x2d.createImageData(cw, ch), d = img.data;
    const c2 = document.createElement("canvas"); c2.width = cw; c2.height = ch;
    const x2 = c2.getContext("2d"), mimg = x2.createImageData(cw, ch), md = mimg.data;
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
        const depth = -sd, k = (j * cw + i) * 4;
        let m = 0;
        if (depth < RIM) { const t = 1 - Math.max(0, depth) / RIM; m = 1 - Math.sqrt(1 - t * t); } // circular lens profile
        d[k] = 128 - nx * m * 127; d[k + 1] = 128 - ny * m * 127; d[k + 2] = 128; d[k + 3] = 255;
        const a = Math.min(1, Math.max(0, (depth - RIM * 0.45) / (RIM * 0.75))); // blur weight: 0 on the rim, 1 inside
        md[k] = md[k + 1] = md[k + 2] = 255; md[k + 3] = Math.round(a * a * (3 - 2 * a) * 255);
      }
    }
    x2d.putImageData(img, 0, 0); x2.putImageData(mimg, 0, 0);
    return { disp: c.toDataURL(), mask: c2.toDataURL() };
  }

  let n = 0;
  function attach(el) {
    const id = "lg-" + n++;
    const f = document.createElementNS(NS, "filter");
    f.setAttribute("id", id); f.setAttribute("filterUnits", "userSpaceOnUse"); f.setAttribute("color-interpolation-filters", "sRGB");
    f.setAttribute("x", "0"); f.setAttribute("y", "0");
    const im = document.createElementNS(NS, "feImage");
    im.setAttribute("x", "0"); im.setAttribute("y", "0"); im.setAttribute("preserveAspectRatio", "none"); im.setAttribute("result", "map");
    const dm = document.createElementNS(NS, "feDisplacementMap");
    dm.setAttribute("in", "SourceGraphic"); dm.setAttribute("in2", "map"); dm.setAttribute("scale", String(STRENGTH));
    dm.setAttribute("xChannelSelector", "R"); dm.setAttribute("yChannelSelector", "G"); dm.setAttribute("result", "bent");
    // bent scene, lightly softened so the rim doesn't alias
    const soft = document.createElementNS(NS, "feGaussianBlur"); soft.setAttribute("in", "bent"); soft.setAttribute("stdDeviation", "1.2"); soft.setAttribute("result", "rim");
    // the frosted middle: the full blur, kept only where the mask says "inside"
    const blur = document.createElementNS(NS, "feGaussianBlur"); blur.setAttribute("in", "bent"); blur.setAttribute("stdDeviation", "9"); blur.setAttribute("edgeMode", "duplicate"); blur.setAttribute("result", "frost");
    const mk = document.createElementNS(NS, "feImage");
    mk.setAttribute("x", "0"); mk.setAttribute("y", "0"); mk.setAttribute("preserveAspectRatio", "none"); mk.setAttribute("result", "mask");
    const inner = document.createElementNS(NS, "feComposite"); inner.setAttribute("in", "frost"); inner.setAttribute("in2", "mask"); inner.setAttribute("operator", "in"); inner.setAttribute("result", "inner");
    const merge = document.createElementNS(NS, "feMerge");
    ["rim", "inner"].forEach((x) => { const node = document.createElementNS(NS, "feMergeNode"); node.setAttribute("in", x); merge.appendChild(node); });
    [im, dm, soft, blur, mk, inner, merge].forEach((x) => f.appendChild(x)); holder.appendChild(f);
    let last = "";
    const update = () => {
      const w = Math.round(el.offsetWidth), h = Math.round(el.offsetHeight);
      if (!w || !h || w + "x" + h === last) return; last = w + "x" + h;
      const r = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, w / 2, h / 2);
      f.setAttribute("width", w); f.setAttribute("height", h);
      const mp = map(w, h, r);
      [im, mk].forEach((x) => { x.setAttribute("width", w); x.setAttribute("height", h); });
      im.setAttribute("href", mp.disp); mk.setAttribute("href", mp.mask);
      const bf = `url(#${id}) saturate(1.5)`;
      el.style.backdropFilter = bf; el.style.webkitBackdropFilter = bf;
    };
    update();
    let t = 0;
    if ("ResizeObserver" in window) new ResizeObserver(() => { clearTimeout(t); t = setTimeout(update, 120); }).observe(el);
  }
  const start = () => document.querySelectorAll(".panel").forEach(attach);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
