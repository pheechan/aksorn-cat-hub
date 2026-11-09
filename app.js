/* คลังความรู้แมวอักษร (Aksorn Cat Knowledge Hub) — hub app (cats.html).
   Routes: #/  #/cat/:id  #/family[/:id]  #/knowledge[/:category]  #/article/:id  #/search/:q
           #/share  #/report  #/help  #/about  #/qr
   Data comes from window.CatData (data.js): Google Sheet tabs, or sample data until those are set. */
(function () {
  "use strict";

  const CFG = window.SITE_CONFIG || {};
  const { STATUS, CATEGORIES, HISTORY_TYPES, norm, lower, esc } = window.CatData;
  const app = document.getElementById("app");
  const banner = document.getElementById("banner");
  const searchInput = document.getElementById("searchInput");
  const TITLE = CFG.SITE_TITLE || "คลังความรู้แมวอักษร";

  let D = { cats: [], byId: {}, articles: [], articleById: {}, history: [], samples: {}, error: "" };
  const catFilter = { status: "", needSteril: false };

  const STERIL = { yes: "ทำหมันแล้ว", no: "ยังไม่ทำหมัน", unknown: "ไม่ทราบ" };
  const VACC = { yes: "ฉีดแล้ว", no: "ยังไม่ฉีด", unknown: "ไม่ทราบ" };
  const SEX = { male: "ตัวผู้", female: "ตัวเมีย", unknown: "ไม่ทราบ" };
  const STATUS_ORDER = { active: 0, commuter: 1, missing: 2, unknown: 3, adopted: 4, passed: 5 };
  const enc = encodeURIComponent;

  /* ---------------- small helpers ---------------- */
  // ISO date → Thai date (e.g. 9 พ.ย. 2569) via Intl; free text from the sheet is shown as typed
  const TH_DATE = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" });
  function thDate(iso) {
    const m = norm(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return esc(iso);
    return TH_DATE.format(new Date(+m[1], +m[2] - 1, +m[3]));
  }
  const statusDot = (c) => `<span class="dot ${STATUS[c.status].cls}">${STATUS[c.status].label}</span>`;
  const catHref = (c) => `#/cat/${enc(c.id)}`;
  const childrenOf = (id) => D.cats.filter((c) => c.mother === id);
  // siblings = same mother, or named in the sheet's Relationship column
  const siblingsOf = (c) => D.cats.filter((x) => x.id !== c.id && ((c.mother && x.mother === c.mother) || (c.siblings || []).includes(x.id)));
  const articlesFor = (id) => D.articles.filter((a) => a.relatedCats.includes(id));
  const historyFor = (id) => D.history.filter((h) => h.cat === id);

  // Illustrated sitting-cat silhouette in the cat's coat colour, used when there is no photo.
  const COATS = {
    orange: { fill: "#c8782f", dark: "#a35f22" }, black: { fill: "#1d1e22", dark: "#111214" },
    grey: { fill: "#6f757b", dark: "#565b60" }, white: { fill: "#e3dfd5", dark: "#c9c3b6" },
    tabby: { fill: "#8a6a4a", dark: "#5f4730" }, calico: { fill: "#e3dfd5", dark: "#c9c3b6" },
    unknown: { fill: "#3b434a", dark: "#2c3338" } // coat not recorded yet: neutral, not a made-up colour
  };
  let svgId = 0;
  function silhouette(c) {
    const k = COATS[c.coat] || COATS.unknown, id = "s" + (++svgId);
    const body = "M58 230 C50 190 56 150 78 128 L122 128 C144 150 150 190 142 230 Z";
    let extra = "";
    if (c.coat === "calico") {
      extra = `<g clip-path="url(#${id})"><ellipse cx="72" cy="168" rx="26" ry="34" fill="#c8782f"/><ellipse cx="128" cy="200" rx="22" ry="26" fill="#1d1e22"/><ellipse cx="118" cy="96" rx="22" ry="16" fill="#c8782f"/><ellipse cx="80" cy="92" rx="14" ry="12" fill="#1d1e22"/></g>`;
    } else if (c.coat === "tabby" || c.coat === "orange") {
      extra = `<g clip-path="url(#${id})" stroke="${k.dark}" stroke-width="5" stroke-linecap="round" fill="none"><path d="M90 84 L92 98 M100 82 L100 97 M110 84 L108 98"/><path d="M62 170 C80 168 90 172 98 176 M60 194 C80 190 92 196 102 200 M140 172 C126 170 116 174 108 178"/></g>`;
    }
    return `<svg viewBox="0 0 200 250" preserveAspectRatio="xMidYMax meet" role="img" aria-label="ภาพวาดแทนรูปของ ${esc(c.name)}">
      <defs><clipPath id="${id}"><path d="${body}"/><ellipse cx="100" cy="110" rx="38" ry="33"/></clipPath>
      <radialGradient id="${id}g"><stop offset="0" stop-color="#dcff86" stop-opacity=".55"/><stop offset="1" stop-color="#dcff86" stop-opacity="0"/></radialGradient></defs>
      <ellipse cx="100" cy="232" rx="64" ry="7" fill="rgba(0,0,0,.4)"/>
      <path d="M138 222 C176 218 184 186 168 164" stroke="${k.fill}" stroke-width="12" stroke-linecap="round" fill="none"/>
      <path d="${body}" fill="${k.fill}"/>
      <ellipse cx="100" cy="110" rx="38" ry="33" fill="${k.fill}"/>
      <path d="M66 96 L70 60 L92 82 Z M134 96 L130 60 L108 82 Z" fill="${k.fill}"/>
      ${extra}
      <circle cx="86" cy="110" r="11" fill="url(#${id}g)"/><circle cx="114" cy="110" r="11" fill="url(#${id}g)"/>
      <circle cx="86" cy="110" r="4.2" fill="#dcff86"/><circle cx="114" cy="110" r="4.2" fill="#dcff86"/>
    </svg>`;
  }
  function portrait(c, note, large) {
    if (c.photo) {
      return large
        ? `<div class="portrait"><img id="profilePhoto" src="${esc(c.photoLarge || c.photo)}" alt="รูปของ ${esc(c.name)}" width="900" height="1200" fetchpriority="high" decoding="async"></div>`
        : `<div class="portrait"><img src="${esc(c.photo)}" alt="รูปของ ${esc(c.name)}" width="400" height="500" loading="lazy" decoding="async"></div>`;
    }
    return `<div class="portrait">${silhouette(c)}${note ? '<span class="ph-note">ยังไม่มีรูป</span>' : ""}</div>`;
  }
  function miniCat(c) {
    return `<a class="mini" href="${catHref(c)}">${portrait(c)}${esc(c.name)}</a>`;
  }

  // Article body: blank line = new paragraph, "## " = subheading, "- " lines = bullet list.
  function renderBody(text) {
    return norm(text).split(/\n\s*\n/).map((block) => {
      const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
      let html = "", list = [], para = [];
      const flushList = () => { if (list.length) { html += `<ul>${list.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>`; list = []; } };
      const flushPara = () => { if (para.length) { html += `<p>${para.map(esc).join("<br>")}</p>`; para = []; } };
      for (const l of lines) {
        if (l.startsWith("## ")) { flushList(); flushPara(); html += `<h2>${esc(l.slice(3))}</h2>`; }
        else if (/^[-•]\s+/.test(l)) { flushPara(); list.push(l.replace(/^[-•]\s+/, "")); }
        else { flushList(); para.push(l); }
      }
      flushList(); flushPara();
      return html;
    }).join("");
  }

  /* ---------------- search ---------------- */
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  function highlight(text, terms) {
    let h = esc(text);
    if (!terms.length) return h;
    const re = new RegExp("(" + terms.map((t) => reEsc(esc(t))).join("|") + ")", "gi");
    return h.replace(re, "<mark>$1</mark>");
  }
  function score(fields, terms, q) {
    const all = fields.map(([v]) => lower(v)).join(" \n ");
    if (!terms.every((t) => all.includes(t))) return 0;
    let s = 1;
    for (const [v, w] of fields) {
      const x = lower(v);
      if (!x) continue;
      if (x === q) s += w * 3; else if (x.startsWith(q)) s += w * 2; else if (x.includes(q)) s += w;
    }
    return s;
  }
  function searchAll(q) {
    q = lower(q);
    const terms = q.split(/\s+/).filter(Boolean);
    if (!terms.length) return { cats: [], articles: [], terms };
    const cats = D.cats.map((c) => ({ c, s: score([[c.name, 10], [c.nicknames.join(" "), 8], [c.marks, 3], [c.locations.join(" "), 3], [c.personality, 2], [c.health, 2], [c.notes, 1]], terms, q) }))
      .filter((r) => r.s).sort((a, b) => b.s - a.s).map((r) => r.c);
    const articles = D.articles.map((a) => ({ a, s: score([[a.title, 10], [a.tags.join(" "), 6], [CATEGORIES[a.category].label, 5], [a.summary, 3], [a.body, 1]], terms, q) }))
      .filter((r) => r.s).sort((a, b) => b.s - a.s).map((r) => r.a);
    return { cats, articles, terms };
  }

  /* ---------------- pages ---------------- */
  function articleRow(a, terms) {
    terms = terms || [];
    return `<li><a class="article-row" href="#/article/${enc(a.id)}">
      <span class="a-cat">${CATEGORIES[a.category].label}</span>
      <div><h3>${highlight(a.title, terms)}</h3>${a.summary ? `<p>${highlight(a.summary, terms)}</p>` : ""}
      <span class="a-meta">${[esc(a.source || a.author), a.date ? thDate(a.date) : ""].filter(Boolean).join(" · ")}</span></div>
    </a></li>`;
  }
  function catCard(c, terms) {
    terms = terms || [];
    const meta = [statusDot(c)];
    if (c.locations[0]) meta.push(highlight(c.locations[0], terms));
    if (c.status === "active" && c.sterilised !== "yes") meta.push(`<span class="flag-warn">${c.sterilised === "no" ? "ยังไม่ทำหมัน" : "ไม่ทราบเรื่องทำหมัน"}</span>`);
    return `<a class="cat${c.status === "passed" ? " past" : ""}" href="${catHref(c)}">
      ${portrait(c, true)}
      <div class="cat-name">${highlight(c.name, terms)}</div>
      ${c.nicknames.length ? `<div class="cat-aka">${highlight(c.nicknames.join(" · "), terms)}</div>` : ""}
      <div class="cat-meta">${meta.join("")}</div>
    </a>`;
  }

  function renderCats() {
    const count = (s) => D.cats.filter((c) => c.status === s).length;
    const active = D.cats.filter((c) => c.status === "active");
    const needSteril = active.filter((c) => c.sterilised !== "yes").length;
    const tabs = [["", "ทั้งหมด", D.cats.length]].concat(Object.keys(STATUS).map((k) => [k, STATUS[k].label, count(k)]));
    app.innerHTML = `
      <header class="page-head">
        <span class="eyebrow">Cats of the faculty</span>
        <h1>แมวในคณะอักษรศาสตร์</h1>
        <p class="lede">ทำความรู้จักแมวทีละตัว นิสัย ที่ที่มักอยู่ สุขภาพ และใครเป็นพี่น้องกับใคร ทั้งหมดรวบรวมจากผู้ดูแลที่เห็นแมวทุกวัน</p>
      </header>
      <div class="tabs" role="group" aria-label="กรองตามสถานะแมว">
        ${tabs.filter(([k, , n]) => !k || n).map(([k, label, n]) => `<button type="button" aria-pressed="${catFilter.status === k}" class="${catFilter.status === k ? "on" : ""}" data-status="${k}"${STATUS[k] && STATUS[k].hint ? ` title="${esc(STATUS[k].hint)}"` : ""}>${label}<span class="n">${n}</span></button>`).join("")}
      </div>
      <div class="toolbar">
        <p class="summary" id="catSummary"></p>
        ${needSteril || catFilter.needSteril ? `<label class="check"><input type="checkbox" id="needSteril" ${catFilter.needSteril ? "checked" : ""}> เฉพาะตัวที่ยังไม่ทำหมันหรือไม่ทราบ (${needSteril})</label>` : ""}
      </div>
      <div class="cats" id="catGrid"></div>`;
    const draw = () => {
      const list = D.cats.filter((c) => (!catFilter.status || c.status === catFilter.status) && (!catFilter.needSteril || (c.status === "active" && c.sterilised !== "yes")))
        .sort((a, b) => (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) || a.name.localeCompare(b.name, "th"));
      document.getElementById("catSummary").textContent = `แสดง ${list.length} จาก ${D.cats.length} ตัว`;
      document.getElementById("catGrid").innerHTML = list.length ? list.map((c) => catCard(c)).join("") : `<p class="empty">ไม่มีแมวในหมวดนี้</p>`;
    };
    // keep the filter in the URL so a refresh or a shared link shows the same list
    const syncUrl = () => {
      const q = new URLSearchParams();
      if (catFilter.status) q.set("status", catFilter.status);
      if (catFilter.needSteril) q.set("steril", "1");
      const qs = q.toString();
      history.replaceState(null, "", "#/" + (qs ? "?" + qs : ""));
    };
    app.querySelectorAll("[data-status]").forEach((b) => b.addEventListener("click", () => {
      catFilter.status = b.dataset.status;
      app.querySelectorAll("[data-status]").forEach((x) => { const on = x === b; x.classList.toggle("on", on); x.setAttribute("aria-pressed", on); });
      syncUrl(); draw();
    }));
    const ns = document.getElementById("needSteril");
    if (ns) ns.addEventListener("change", (e) => { catFilter.needSteril = e.target.checked; syncUrl(); draw(); });
    draw();
  }

  function reportUrl(cat) {
    const base = norm(CFG.FORM_URL);
    if (!base) return "#/report";
    if (cat && norm(CFG.FORM_CAT_ENTRY)) {
      const sep = base.includes("?") ? "&" : "?";
      return `${base}${sep}usp=pp_url&${enc(CFG.FORM_CAT_ENTRY)}=${enc(cat.name + " (" + cat.id + ")")}`;
    }
    return base;
  }
  const extAttrs = (u) => (/^https?:/.test(u) ? ' target="_blank" rel="noopener"' : "");

  function renderCat(id) {
    const c = D.byId[lower(id)];
    if (!c) { app.innerHTML = `<nav class="crumbs"><a href="#/">แมวในคณะ</a></nav><p class="empty">ไม่พบแมวรหัส “${esc(id)}” ในคลัง</p>`; return; }
    document.title = `${c.name} · ${TITLE}`;
    const mom = c.mother ? D.byId[c.mother] : null, sibs = siblingsOf(c), kids = childrenOf(c.id);
    const hist = historyFor(c.id), rel = articlesFor(c.id);
    const fact = (k, v, wide) => (norm(v) ? `<div${wide ? ' class="wide"' : ""}><dt>${k}</dt><dd>${esc(v)}</dd></div>` : "");
    const famRow = (label, html) => `<div class="family-row"><span>${label}</span><div class="mini-cats">${html || '<span class="muted">ไม่มีข้อมูล</span>'}</div></div>`;
    const ru = reportUrl(c);
    app.innerHTML = `
      <nav class="crumbs" aria-label="ตำแหน่ง"><a href="#/">แมวในคณะ</a><span>/</span>${esc(c.name)}</nav>
      <article class="profile">
        <div class="profile-side">${portrait(c, true, true)}${c.gallery && c.gallery.length > 1 ? `
          <div class="gallery" role="group" aria-label="รูปของ${esc(c.name)} ${c.gallery.length} รูป">${c.gallery.map((p, i) => `<button type="button" class="thumb" aria-pressed="${i === 0}" aria-label="ดูรูปที่ ${i + 1}" data-l="${esc(p.l)}"><img src="${esc(p.s)}" alt="" width="96" height="120" loading="lazy" decoding="async"></button>`).join("")}</div>` : ""}</div>
        <div>
          <h1>${esc(c.name)}</h1>
          ${c.nicknames.length ? `<p class="aka">ชื่อที่คนเรียก: ${esc(c.nicknames.join(" · "))}</p>` : ""}
          <div class="status-line">${statusDot(c)}${STATUS[c.status].hint ? `<span>${esc(STATUS[c.status].hint)}</span>` : ""}${c.lastSeen ? `<span>พบล่าสุด ${thDate(c.lastSeen)}</span>` : ""}</div>
          <div class="actions">
            <a class="btn" href="${esc(ru)}"${extAttrs(ru)}>แจ้งข่าวเกี่ยวกับ${esc(c.name)}</a>
            <a class="btn ghost" href="#/family/${enc(c.id)}">ดูในผังครอบครัว</a>
          </div>

          <section class="sec"><span class="label">ข้อมูลประจำตัว</span>
            <dl class="facts">
              ${fact("เพศ", SEX[c.sex])}${fact("อายุ", c.age)}
              ${fact("ลักษณะเด่น", c.marks, true)}
              ${fact("มักอยู่แถว", c.locations.join(", "))}${fact("ผู้ดูแลหลัก", c.caretakers)}
            </dl>
          </section>

          <section class="sec"><span class="label">สุขภาพและนิสัย</span>
            <dl class="facts">
              <div><dt>ทำหมัน</dt><dd class="${c.sterilised === "yes" ? "" : "flag-warn"}">${STERIL[c.sterilised]}</dd></div>
              <div><dt>วัคซีน</dt><dd>${VACC[c.vaccinated]}</dd></div>
              ${fact("นิสัย", c.personality, true)}
            </dl>
            ${c.health ? `<p class="note">${esc(c.health)}</p>` : ""}
            ${c.notes ? `<p class="note" style="border-color:var(--line-strong)">${esc(c.notes)}</p>` : ""}
          </section>

          <section class="sec"><span class="label">ครอบครัว</span>
            <div class="family">
              ${famRow("แม่", mom ? miniCat(mom) : c.mother ? esc(c.mother) : "")}
              ${famRow("พี่น้อง", sibs.map(miniCat).join(""))}
              ${c.relationship && !sibs.length ? `<p class="muted" style="margin:0">${esc(c.relationship)}</p>` : ""}
              ${famRow("ลูก", kids.map(miniCat).join(""))}
            </div>
          </section>

          <section class="sec"><span class="label">ประวัติการดูแล</span>
            ${hist.length ? `<ol class="timeline">${hist.map((h) => `<li><time datetime="${esc(h.date)}">${thDate(h.date)}</time><div><span class="t-type">${HISTORY_TYPES[h.type]}</span>${esc(h.note)}${h.by ? `<span class="t-by">${esc(h.by)}</span>` : ""}</div></li>`).join("")}</ol>`
              : `<p class="muted">ยังไม่มีบันทึก ถ้าคุณดูแลแมวตัวนี้ <a href="${esc(ru)}"${extAttrs(ru)}>ช่วยบันทึกได้</a></p>`}
          </section>

          ${rel.length ? `<section class="sec"><span class="label">ความรู้ที่เกี่ยวข้อง</span><ul class="articles">${rel.map((a) => articleRow(a)).join("")}</ul></section>` : ""}

          ${c.interview && c.interview.length ? `<section class="sec"><span class="label">บันทึกจากการสัมภาษณ์ผู้ดูแล (ข้อความตามที่จดไว้)</span><ul class="interview">${c.interview.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></section>` : ""}

          ${c.source ? `<p class="source">ที่มาของข้อมูล: ${esc(c.source)}</p>` : ""}
        </div>
      </article>`;
  }

  // profile gallery: thumbnails swap the main photo (event delegation, survives re-renders)
  app.addEventListener("click", (e) => {
    const t = e.target.closest(".gallery .thumb");
    if (!t) return;
    const main = document.getElementById("profilePhoto");
    if (main) main.src = t.dataset.l;
    t.parentNode.querySelectorAll(".thumb").forEach((b) => b.setAttribute("aria-pressed", b === t));
  });

  function renderKnowledge(cat) {
    cat = Object.prototype.hasOwnProperty.call(CATEGORIES, cat) ? cat : "";
    const list = D.articles.filter((a) => !cat || a.category === cat).sort((a, b) => (a.date < b.date ? 1 : -1));
    const n = (k) => D.articles.filter((a) => a.category === k).length;
    app.innerHTML = `
      <header class="page-head">
        <span class="eyebrow">Knowledge base</span>
        <h1>คลังความรู้การดูแลแมว</h1>
        <p class="lede">ความรู้พื้นฐานและบทเรียนจากผู้ดูแลจริง จัดเป็นหมวดให้หาง่าย ทุกบทความระบุที่มาและผู้ตรวจทาน</p>
      </header>
      <nav class="tabs" aria-label="หมวดความรู้">
        <a href="#/knowledge" class="${cat ? "" : "on"}">ทั้งหมด<span class="n">${D.articles.length}</span></a>
        ${Object.keys(CATEGORIES).map((k) => `<a href="#/knowledge/${k}" class="${cat === k ? "on" : ""}">${CATEGORIES[k].label}<span class="n">${n(k)}</span></a>`).join("")}
      </nav>
      ${cat ? `<p class="cat-desc">${esc(CATEGORIES[cat].desc)}</p>` : ""}
      ${list.length ? `<ul class="articles">${list.map((a) => articleRow(a)).join("")}</ul>` : `<p class="empty">ยังไม่มีบทความในหมวดนี้ <a href="#/share">เป็นคนแรกที่แบ่งปัน</a></p>`}
      <aside class="callout"><h3>รู้อะไรที่คนอื่นควรรู้?</h3><p>เคล็ดลับ ประสบการณ์ หรือบทเรียนจากการดูแลแมวในคณะ ส่งมาได้ ทีมจะตรวจทานก่อนเผยแพร่พร้อมให้เครดิต</p><a class="btn ghost" href="#/share">แบ่งปันความรู้</a></aside>`;
  }

  function renderArticle(id) {
    const a = D.articleById[lower(id)];
    if (!a) { app.innerHTML = `<nav class="crumbs"><a href="#/knowledge">คลังความรู้</a></nav><p class="empty">ไม่พบบทความนี้</p>`; return; }
    document.title = `${a.title} · ${TITLE}`;
    const cats = a.relatedCats.map((k) => D.byId[k]).filter(Boolean);
    const more = D.articles.filter((x) => x.category === a.category && x.id !== a.id).slice(0, 3);
    app.innerHTML = `
      <nav class="crumbs" aria-label="ตำแหน่ง"><a href="#/knowledge">คลังความรู้</a><span>/</span><a href="#/knowledge/${a.category}">${CATEGORIES[a.category].label}</a></nav>
      <article class="article">
        <span class="eyebrow">${CATEGORIES[a.category].en}</span>
        <h1>${esc(a.title)}</h1>
        ${a.summary ? `<p class="lede">${esc(a.summary)}</p>` : ""}
        <div class="byline">
          ${a.author ? `<span>เขียนโดย <b>${esc(a.author)}</b></span>` : ""}
          ${a.source ? `<span>ที่มา <b>${esc(a.source)}</b></span>` : ""}
          ${a.date ? `<span>${thDate(a.date)}</span>` : ""}
          <span>${a.reviewedBy ? `ตรวจทานโดย <b>${esc(a.reviewedBy)}</b>` : `<span class="flag-warn">ยังไม่ได้ตรวจทาน</span>`}</span>
        </div>
        <div class="prose">${renderBody(a.body)}</div>
        ${a.tags.length ? `<div class="tags">${a.tags.map((t) => `<a class="tag" href="#/search/${enc(t)}">${esc(t)}</a>`).join("")}</div>` : ""}
        ${cats.length ? `<section class="sec"><span class="label">แมวที่เกี่ยวข้อง</span><div class="mini-cats">${cats.map(miniCat).join("")}</div></section>` : ""}
        ${a.category === "health" ? `<aside class="callout danger"><h3>แมวป่วยหรือบาดเจ็บตอนนี้?</h3><p>คลังนี้ไม่ใช่ระบบวินิจฉัยโรค ดูขั้นตอนเบื้องต้นและเบอร์ติดต่อได้ที่หน้าเจอแมวป่วย</p><a class="btn ghost" href="#/help">เจอแมวป่วย</a></aside>` : ""}
      </article>
      ${more.length ? `<section class="sec"><span class="label">อ่านต่อในหมวด${CATEGORIES[a.category].label}</span><ul class="articles">${more.map((x) => articleRow(x)).join("")}</ul></section>` : ""}`;
  }

  function renderSearch(q) {
    q = norm(q);
    if (searchInput.value !== q) searchInput.value = q;
    const r = searchAll(q);
    document.title = `ค้นหา “${q}” · ${TITLE}`;
    app.innerHTML = `
      <header class="page-head"><span class="eyebrow">Search</span><h1>ผลการค้นหา “${esc(q)}”</h1>
        <p class="lede">${r.cats.length + r.articles.length ? `พบแมว ${r.cats.length} ตัว และความรู้ ${r.articles.length} บทความ` : "ไม่พบผลลัพธ์ ลองค้นด้วยชื่อเล่น สีขน สถานที่ หรือคำอย่าง “ทำหมัน” “อาหาร”"}</p></header>
      ${r.cats.length ? `<section class="results"><h2 class="label">แมว</h2><div class="cats">${r.cats.map((c) => catCard(c, r.terms)).join("")}</div></section>` : ""}
      ${r.articles.length ? `<section class="results"><h2 class="label">ความรู้</h2><ul class="articles">${r.articles.map((a) => articleRow(a, r.terms)).join("")}</ul></section>` : ""}`;
  }

  function renderShare(focus) {
    const report = norm(CFG.FORM_URL), share = norm(CFG.SHARE_FORM_URL);
    const embedUrl = (u) => u.replace(/\/viewform.*$/, "/viewform?embedded=true");
    const embed = focus === "report" ? report : share || report;
    const btn = (u, label) => (u ? `<a class="btn ghost" href="${esc(u)}" target="_blank" rel="noopener">${label}</a>` : `<span class="unset" style="font-size:14px">ยังไม่ได้ตั้งค่าแบบฟอร์ม</span>`);
    app.innerHTML = `
      <header class="page-head"><span class="eyebrow">Share what you know</span><h1>แบ่งปันความรู้</h1>
        <p class="lede">คลังนี้โตได้เพราะทุกคนช่วยกันเติม ไม่ว่าจะเห็นแมวตัวหนึ่งเมื่อเช้า หรือดูแลแมวในคณะมาหลายปี</p></header>
      <ul class="routes">
        <li id="report"><span class="num">01</span><div><h3>แจ้งข่าวแมว</h3><p>เห็นแมว แมวดูไม่สบาย เจอแมวตัวใหม่ หรือข้อมูลในคลังไม่ถูกต้อง</p></div>${btn(report, "เปิดแบบฟอร์ม")}</li>
        <li><span class="num">02</span><div><h3>ส่งบทความหรือประสบการณ์</h3><p>เคล็ดลับการดูแล เรื่องเล่า หรือบทเรียนที่อยากส่งต่อให้ผู้ดูแลรุ่นต่อไป</p></div>${btn(share, "เปิดแบบฟอร์ม")}</li>
        <li><span class="num">03</span><div><h3>อยากเล่า แต่ไม่สะดวกเขียน</h3><p>ทีมยินดีไปนั่งคุยและจดให้ แล้วส่งให้คุณอ่านก่อนเผยแพร่ ติดต่อผ่านช่องทางในหน้าเจอแมวป่วย</p></div><a class="btn ghost" href="#/help">ช่องทางติดต่อ</a></li>
      </ul>
      <section><span class="label">หลังจากกดส่ง</span>
        <ol class="flow">
          <li><b>ส่งเข้ามา</b>ข้อมูลไปอยู่ในชีตรอตรวจ ยังไม่ขึ้นเว็บ</li>
          <li><b>ทีมตรวจทาน</b>เช็กความถูกต้อง ความเป็นส่วนตัว และถามผู้ดูแลหรือสัตวแพทย์เมื่อเป็นเรื่องสุขภาพ</li>
          <li><b>เผยแพร่</b>ขึ้นคลังพร้อมระบุที่มาและเครดิตผู้ให้ความรู้</li>
        </ol>
      </section>
      ${embed ? `<iframe class="form-embed" src="${esc(embedUrl(embed))}" title="แบบฟอร์ม" loading="lazy"></iframe>` : ""}`;
    if (focus === "report") document.getElementById("report").scrollIntoView();
  }

  function renderHelp() {
    const contacts = (CFG.EMERGENCY_CONTACTS || []).map((c) => {
      const unset = /ยังไม่ได้กรอก/.test(c.value);
      return `<div><dt>${esc(c.label)}</dt><dd class="${unset ? "unset" : ""}">${esc(c.value)}</dd></div>`;
    }).join("");
    app.innerHTML = `
      <div class="article">
        <header class="page-head"><span class="eyebrow">Urgent</span><h1>เจอแมวป่วยหรือบาดเจ็บ</h1>
          <p class="lede">ทำตามนี้ก่อน แล้วติดต่อผู้ดูแลหรือสัตวแพทย์</p></header>
        <ol class="steps">
          <li><div><b>อย่าเพิ่งจับถ้าแมวตกใจหรือขู่</b> แมวที่เจ็บอาจกัดหรือข่วน อยู่ห่างพอดูอาการได้</div></li>
          <li><div><b>ถ่ายรูปและจดตำแหน่ง</b> แมวตัวไหน อยู่ตรงไหน เห็นอาการอะไร เวลาเท่าไร</div></li>
          <li><div><b>ห้ามให้ยาของคน</b> ยาบางชนิดเช่นพาราเซตามอลเป็นพิษร้ายแรงต่อแมว</div></li>
          <li><div><b>ติดต่อผู้ดูแลหรือสัตวแพทย์</b> ตามรายชื่อด้านล่าง</div></li>
          <li><div><b>แจ้งในเว็บ</b> ผ่าน <a href="#/report">แบบฟอร์มแจ้งข่าวแมว</a> ให้คนอื่นรู้ว่ามีคนดูแลแล้ว</div></li>
        </ol>
        <section><span class="label">ติดต่อ</span><dl class="contact">${contacts || '<div><dt class="unset">ยังไม่ได้กรอกข้อมูลติดต่อใน config.js</dt></div>'}</dl></section>
        <p class="muted" style="margin-top:22px;font-size:14.5px">หน้านี้เป็นแนวทางเบื้องต้นสำหรับคนทั่วไป ไม่ใช่การวินิจฉัยหรือรักษา หากไม่แน่ใจให้ปรึกษาสัตวแพทย์</p>
      </div>`;
  }

  function renderAbout() {
    const li = (a) => (a || []).map((x) => `<li>${esc(x)}</li>`).join("");
    const st = (label, sample) => `<li><span>${label}</span><span class="${sample ? "unset" : ""}">${sample ? "ไฟล์ตั้งต้น (data-sample.js)" : "Google Sheet"}</span></li>`;
    app.innerHTML = `
      <header class="page-head"><span class="eyebrow">About</span><h1>เกี่ยวกับโครงการ</h1>
        <p class="lede">ความรู้เรื่องแมวในคณะอักษรศาสตร์เคยกระจายอยู่ตามความทรงจำของผู้ดูแลและแชตหลายกลุ่ม คลังนี้รวบรวมไว้ที่เดียว ให้ผู้ดูแลรุ่นใหม่เรียนรู้ได้โดยไม่ต้องเริ่มจากศูนย์</p></header>
      <div class="about-grid">
        <section><span class="label">กระบวนการจัดการความรู้</span>
          <ol class="steps">
            <li><div><b>แสวงหาความรู้</b> สัมภาษณ์ผู้ดูแลแมวและสำรวจแมวในพื้นที่จริง</div></li>
            <li><div><b>จัดเก็บและจัดระเบียบ</b> ประวัติแมวรายตัว ผังครอบครัว และคลังความรู้แยกหมวด ชื่อเล่นหลายชื่อรวมไว้ใต้ชื่อหลักชื่อเดียว (authority control)</div></li>
            <li><div><b>เข้าถึง</b> ค้นหาด้วยชื่อ หมวด หรือคำสำคัญ และสแกน QR ตรงจุดที่แมวอยู่</div></li>
            <li><div><b>แลกเปลี่ยนและนำไปใช้</b> ทุกคนส่งข่าวและความรู้ได้ ทีมตรวจทานก่อนเผยแพร่</div></li>
          </ol>
        </section>
        <section>
          <span class="label">ขอบคุณผู้ให้ความรู้</span><ul>${li(CFG.CREDITS_KNOWLEDGE_HOLDERS)}</ul>
          <span class="label" style="margin-top:26px">ผู้จัดทำ</span><ul>${li(CFG.CREDITS_TEAM)}</ul>
          <p class="muted">${esc(CFG.COURSE || "")}</p>
          <span class="label" style="margin-top:26px">สถานะข้อมูล</span>
          <ul class="data-status">${st("ข้อมูลแมว", D.samples.cats)}${st("คลังความรู้", D.samples.articles)}${st("ประวัติการดูแล", D.samples.history)}</ul>
          <p class="no-print" style="margin-top:18px"><a href="#/qr">พิมพ์ QR code สำหรับติดตามจุดที่แมวอยู่</a></p>
        </section>
      </div>`;
  }

  let network = null;
  function renderFamily(focusId) {
    app.innerHTML = `
      <header class="page-head"><span class="eyebrow">Family tree</span><h1>ผังครอบครัวแมว</h1>
        <p class="lede">เส้นประเชื่อมแมวที่เป็นพี่น้องกัน ลูกศรชี้จากแม่ไปหาลูก แตะที่แมวเพื่อเปิดประวัติ</p></header>
      <div class="legend">${Object.keys(STATUS).filter((k) => D.cats.some((c) => c.status === k)).map((k) => `<span class="dot" style="--c:${STATUS[k].color}">${STATUS[k].label}</span>`).join("")}</div>
      <div id="graph"></div>
      <section class="sec"><span class="label">ยังไม่มีข้อมูลครอบครัว</span><div class="mini-cats" id="noFamily"></div>
        <p class="muted" style="margin-top:12px">รู้ว่าแมวตัวไหนเป็นพี่น้องหรือแม่ลูกกัน? <a href="#/share">แบ่งปันให้ทีม</a></p></section>`;
    // only cats with a known relation go in the graph; the rest are listed below it
    const related = new Set();
    D.cats.forEach((c) => {
      if (c.mother && D.byId[c.mother]) { related.add(c.id); related.add(c.mother); }
      (c.siblings || []).forEach((o) => { if (D.byId[o]) { related.add(c.id); related.add(o); } });
    });
    document.getElementById("noFamily").innerHTML = D.cats.filter((c) => !related.has(c.id)).map(miniCat).join("");
    if (!window.vis) { document.getElementById("graph").innerHTML = `<p class="empty">โหลดตัวแสดงผังไม่ได้ (ต้องต่ออินเทอร์เน็ต)</p>`; return; }
    if (!related.size) { document.getElementById("graph").innerHTML = `<p class="empty">ยังไม่มีข้อมูลความสัมพันธ์ระหว่างแมว</p>`; return; }
    const nodes = D.cats.filter((c) => related.has(c.id)).map((c) => {
      const base = { id: c.id, label: c.name, title: [c.name].concat(c.nicknames).join(" / "), font: { color: "#e6ece7", face: "Google Sans", size: 16 }, borderWidth: 3, color: { border: STATUS[c.status].color, background: (COATS[c.coat] || COATS.tabby).fill, highlight: { border: "#ef6d9f", background: (COATS[c.coat] || COATS.tabby).fill } } };
      return c.photo ? Object.assign(base, { shape: "circularImage", image: c.photo, size: 26 }) : Object.assign(base, { shape: "dot", size: 17 });
    });
    const edges = D.cats.filter((c) => c.mother && D.byId[c.mother]).map((c) => ({ from: c.mother, to: c.id, arrows: "to" }));
    const seen = new Set(); // sibling links from the Relationship column, drawn once as dashed lines
    D.cats.forEach((c) => (c.siblings || []).forEach((o) => {
      const k = [c.id, o].sort().join("|");
      if (D.byId[o] && !seen.has(k)) { seen.add(k); edges.push({ from: c.id, to: o, dashes: true, color: "#9b8cf0" }); }
    }));
    if (network) { network.destroy(); network = null; }
    // tree layout only when there are mother→kitten links; sibling-only data reads better as small clusters
    const hasTree = edges.some((e) => e.arrows);
    network = new vis.Network(document.getElementById("graph"), { nodes: new vis.DataSet(nodes), edges: new vis.DataSet(edges) }, hasTree ? {
      layout: { hierarchical: { enabled: true, direction: "UD", sortMethod: "directed", levelSeparation: 110, nodeSpacing: 120 } },
      physics: false, edges: { color: "#7f8a84", smooth: { type: "cubicBezier", forceDirection: "vertical" } }, interaction: { hover: true }
    } : {
      layout: { randomSeed: 7 },
      physics: { solver: "forceAtlas2Based", forceAtlas2Based: { gravitationalConstant: -180, springLength: 110, avoidOverlap: 1 }, stabilization: { iterations: 400 } },
      edges: { width: 2, smooth: false }, nodes: { size: 26 }, interaction: { hover: true }
    });
    network.once("stabilizationIterationsDone", () => { network.setOptions({ physics: false }); network.fit({ animation: false }); });
    network.on("click", (p) => { if (p.nodes && p.nodes.length) location.hash = `#/cat/${enc(p.nodes[0])}`; });
    const f = lower(focusId);
    if (f && D.byId[f]) network.once("afterDrawing", () => { network.selectNodes([f]); network.focus(f, { scale: 1.3, animation: { duration: 400 } }); });
  }

  function siteBase() {
    const u = norm(CFG.SITE_URL);
    if (u) return (u.endsWith("/") ? u : u + "/") + "cats.html";
    return location.href.split("#")[0];
  }
  function renderQR() {
    const base = siteBase();
    const isLocal = !norm(CFG.SITE_URL) && location.protocol === "file:";
    const list = D.cats.filter((c) => c.status === "active" || c.status === "missing");
    app.innerHTML = `
      <div class="no-print"><header class="page-head"><span class="eyebrow">Print</span><h1>QR code ติดตามจุดที่แมวอยู่</h1>
        <p class="lede">สแกนแล้วเปิดหน้าประวัติของแมวตัวนั้น ขออนุญาตคณะก่อนติดประกาศ</p></header>
        ${isLocal ? `<p class="callout danger">ตอนนี้เปิดไฟล์จากเครื่อง QR จะใช้ในมือถือไม่ได้ ใส่ <code>SITE_URL</code> ใน config.js หลังขึ้นเว็บจริงก่อนพิมพ์</p>` : ""}
        <p><button class="btn" onclick="window.print()">พิมพ์</button></p></div>
      <div class="qr-grid">${list.map((c) => `<div class="qr-card"><div class="qr-name">${esc(c.name)}</div>${c.nicknames.length ? `<div class="qr-hint">${esc(c.nicknames.join(" · "))}</div>` : ""}<div class="qr" data-url="${esc(base + "#/cat/" + enc(c.id))}"></div><div class="qr-hint">สแกนเพื่อรู้จักฉัน · ${esc(TITLE)}</div></div>`).join("")}</div>`;
    if (!window.QRCode) return;
    app.querySelectorAll(".qr").forEach((el) => new QRCode(el, { text: el.getAttribute("data-url"), width: 150, height: 150, correctLevel: QRCode.CorrectLevel.M }));
  }

  /* ---------------- router ---------------- */
  function route() {
    let raw = location.hash.replace(/^#\/?/, "");
    if (raw.startsWith("?")) { // cat list filters: #/?status=commuter&steril=1
      const q = new URLSearchParams(raw.slice(1));
      catFilter.status = Object.prototype.hasOwnProperty.call(STATUS, q.get("status")) ? q.get("status") : "";
      catFilter.needSteril = q.get("steril") === "1";
      raw = "";
    }
    const slash = raw.indexOf("/");
    const page = slash < 0 ? raw : raw.slice(0, slash);
    let arg = slash < 0 ? "" : raw.slice(slash + 1);
    try { arg = decodeURIComponent(arg); } catch (e) { /* keep raw */ }
    document.title = TITLE;
    const navPage = { cat: "", article: "knowledge", report: "share", search: "__" }[page] ?? page;
    document.querySelectorAll("#nav a").forEach((a) => a.classList.toggle("active", a.dataset.page === navPage));
    if (page !== "family" && network) { network.destroy(); network = null; }
    if (page !== "search" && document.activeElement !== searchInput) searchInput.value = "";
    switch (page) {
      case "cat": renderCat(arg); break;
      case "family": renderFamily(arg); break;
      case "knowledge": renderKnowledge(arg); break;
      case "article": renderArticle(arg); break;
      case "search": renderSearch(arg); break;
      case "share": renderShare(); break;
      case "report": renderShare("report"); break;
      case "help": renderHelp(); break;
      case "about": renderAbout(); break;
      case "qr": renderQR(); break;
      default: renderCats();
    }
    if (page !== "search" && page !== "report") { window.scrollTo(0, 0); if (route.navigated) app.focus({ preventScroll: true }); }
    route.navigated = true;
  }

  function wireSearch() {
    let t = null;
    document.getElementById("searchForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const q = norm(searchInput.value);
      if (q) location.hash = "#/search/" + enc(q);
    });
    searchInput.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const q = norm(searchInput.value);
        if (q) location.replace("#/search/" + enc(q));
        else if (location.hash.startsWith("#/search")) location.replace("#/");
      }, 220);
    });
  }

  async function init() {
    document.getElementById("footCourse").textContent = CFG.COURSE || "";
    wireSearch();
    D = await window.CatData.load(CFG);
    const parts = [];
    if (D.samples.articles) parts.push("คลังความรู้");
    const msgs = [];
    // the cat list falls back to a saved copy of the team sheet: say so once, without the raw load error
    if (D.samples.cats) msgs.push("กำลังแสดงสำเนาข้อมูลแมวที่บันทึกไว้ เพราะโหลดชีตล่าสุดไม่สำเร็จ");
    else if (D.error) msgs.push(D.error);
    if (parts.length) msgs.push(`${parts.join(" ")} ยังเป็นบทความตัวอย่าง รอตรวจทาน`);
    if (msgs.length) { banner.textContent = msgs.join(" · "); banner.hidden = false; }
    window.addEventListener("hashchange", route);
    route();
  }

  init();
})();
