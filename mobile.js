/* แมวอักษร, the phone landing page (m.html). The same story as index.html without the 3D scene:
   a still of the campus, the four steps, the cats, and where they live. Data comes from the team's sheet (data.js). */
(function () {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const I = window.I18N || { L: (th) => th, lang: "th", nameEn: () => "", tx: (x) => x, on() {} };
  const L = (th, en) => I.L(th, en);
  const esc = (window.CatData && window.CatData.esc) || ((s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => "&#" + c.charCodeAt(0) + ";"));
  const nm = (c) => (I.lang === "en" && I.nameEn(c.name)) || c.name;
  const COAT_FILL = { orange: "#d9822b", black: "#232326", bicolor: "#232326", white: "#efe9dd", calico: "#e3c9a4", tabby: "#8b8478", cream: "#e2d3b8", unknown: "#b9b2a6" };
  const avatar = (c, size) => c.photoThumb || c.photo
    ? `<img src="${esc(c.photoThumb || c.photo)}" alt="" loading="lazy" decoding="async" width="${size}" height="${size}">`
    : `<svg aria-hidden="true" style="--cat:${COAT_FILL[c.coat] || COAT_FILL.unknown}"><use href="#nd-head"/></svg>`;
  const CHEV = '<svg class="m-chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5"/></svg>';

  // search hands the query to the hub's search page
  const form = $("#heroSearch");
  if (form) form.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = ($("#heroQ").value || "").trim();
    location.href = q ? "cats.html#/search/" + encodeURIComponent(q) : "cats.html";
  });

  // sections fade up as they come on screen (not with reduced motion)
  if ("IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.documentElement.classList.add("m-anim");
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
    document.querySelectorAll(".m-sec, .m-sick").forEach((el) => io.observe(el));
  }

  async function fill() {
    if (!window.CatData) return;
    const r = await window.CatData.load(window.SITE_CONFIG || {});
    const { AREAS } = window.CatData;
    const cats = r.cats, alive = cats.filter((c) => c.status !== "passed");
    const homes = cats.filter((c) => c.resident);
    const pct = (k) => (alive.length ? Math.round(100 * alive.filter((c) => c[k] === "yes").length / alive.length) + "%" : "—");
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set("stCats", cats.length); set("stHome", homes.length || cats.filter((c) => c.status === "active").length); set("stSteril", pct("sterilised"));

    // faculty cats first, then the rest still around; photos before drawings
    const ORDER = { active: 0, commuter: 1, missing: 2, unknown: 3, adopted: 4 };
    const strip = alive.filter((c) => c.status !== "adopted")
      .sort((a, b) => (b.resident ? 1 : 0) - (a.resident ? 1 : 0) || (ORDER[a.status] ?? 5) - (ORDER[b.status] ?? 5) || (b.photo ? 1 : 0) - (a.photo ? 1 : 0));
    const here = cats.filter((c) => !["passed", "adopted"].includes(c.status));
    const spots = ["brk", "mcs", "tewalai", "store", "cage", "roam"].filter((k) => AREAS[k])
      .map((k) => ({ k, cats: here.filter((c) => c.areas.includes(k)) })).filter((s) => s.cats.length);

    const draw = () => {
      const box = $("#mCats");
      if (box) box.innerHTML = strip.map((c) => `<a class="m-cat${c.resident ? " is-home" : ""}" href="cats.html#/cat/${encodeURIComponent(c.id)}">
          <span class="m-av">${avatar(c, 72)}</span><span class="m-cat-n">${esc(nm(c))}</span></a>`).join("")
        + `<a class="m-cat m-all" href="cats.html#/cats"><span class="m-av"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5"/></svg></span><span class="m-cat-n">${L("ดูทั้งหมด", "See all")}</span></a>`;
      const list = $("#mSpots");
      if (list) list.innerHTML = spots.map((s) => `<li><a href="cats.html#/cats?area=${s.k}">
          <span class="m-avs">${s.cats.slice(0, 3).map((c) => `<span>${avatar(c, 36)}</span>`).join("")}</span>
          <span><strong>${esc(L(AREAS[s.k].label, AREAS[s.k].en))}</strong><small>${L(`${s.cats.length} ตัว`, `${s.cats.length} cat${s.cats.length > 1 ? "s" : ""}`)}</small></span>${CHEV}</a></li>`).join("");
    };
    draw();
    I.on(draw);
  }
  const go = () => fill().catch((e) => console.warn("cats:", e));
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go); else go();
})();
