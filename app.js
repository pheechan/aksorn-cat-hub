/* คลังความรู้แมวอักษร (Aksorn Cat Knowledge Hub) — the hub (cats.html), "The Keepers' Notebook".
   Built around the newcomer's tasks from Chapter 2: find a cat you saw (2.5.1), learn what is normal for it (2.1.1),
   start caring step by step (SECI internalization/socialization), and share what you know with review (2.4.1).
   Routes: #/  #/cats?coat=&area=&status=&touch=  #/find?coat=&area=  #/start  #/cat/:id  #/family[/:id]
           #/knowledge[/:category]  #/article/:id  #/search/:q  #/share?type=&cat=&ctx=  #/help  #/about  #/qr */
(function () {
  "use strict";

  const CFG = window.SITE_CONFIG || {};
  const { STATUS, CATEGORIES, HISTORY_TYPES, COATS, AREAS, norm, lower, esc } = window.CatData;
  const app = document.getElementById("app");
  const banner = document.getElementById("banner");
  const searchInput = document.getElementById("searchInput");
  const TITLE = CFG.SITE_TITLE || "คลังความรู้แมวอักษร";
  const enc = encodeURIComponent;
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

  let D = { cats: [], byId: {}, articles: [], articleById: {}, history: [], samples: {}, error: "" };

  const STERIL = { yes: "ทำหมันแล้ว", no: "ยังไม่ทำหมัน", unknown: "ไม่ทราบเรื่องทำหมัน" };
  const VACC = { yes: "ฉีดวัคซีนแล้ว", no: "ยังไม่ฉีดวัคซีน", unknown: "ไม่ทราบเรื่องวัคซีน" };
  const SEX = { male: "ตัวผู้", female: "ตัวเมีย", unknown: "" };
  const TOUCH = { yes: "เป็นมิตร เข้าหาได้", no: "ไม่ชอบให้จับ" };
  const STATUS_ORDER = { active: 0, commuter: 1, missing: 2, unknown: 3, adopted: 4, passed: 5 };
  const SEEN_NOW = (c) => c.status === "active" || c.status === "commuter";

  /* ---------------- helpers ---------------- */
  const TH_DATE = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" });
  const TH_TIME = new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit" });
  function thDate(iso) {
    const m = norm(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return esc(iso);
    return TH_DATE.format(new Date(+m[1], +m[2] - 1, +m[3]));
  }
  const statusDot = (c) => `<span class="dot ${STATUS[c.status].cls}">${STATUS[c.status].label}</span>`;
  const catHref = (c) => `#/cat/${enc(c.id)}`;
  const shareHref = (type, c, extra) => `#/share?type=${type}${c ? "&cat=" + enc(c.id) : ""}${extra || ""}`;
  const childrenOf = (id) => D.cats.filter((c) => c.mother === id);
  const siblingsOf = (c) => D.cats.filter((x) => x.id !== c.id && ((c.mother && x.mother === c.mother) || (c.siblings || []).includes(x.id)));
  const articlesFor = (id) => D.articles.filter((a) => a.relatedCats.includes(id));
  const historyFor = (id) => D.history.filter((h) => h.cat === id);
  const coatLabel = (c) => (has(COATS, c.coat) ? COATS[c.coat].label : "");
  const placeOf = (c) => c.locations[0] || (c.areas[0] ? AREAS[c.areas[0]].label : "");
  const byStatusThenName = (a, b) => (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) || a.name.localeCompare(b.name, "th");
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode: progress just is not kept */ } }
  };

  // Drawn sitting cat in the cat's coat colour, used when there is no photo yet.
  const DRAW = {
    orange: ["#d9822b", "#b0641c"], black: ["#232326", "#111"], bicolor: ["#232326", "#111"], white: ["#f4f1ea", "#d9d3c7"],
    calico: ["#f4f1ea", "#d9d3c7"], tabby: ["#8b8478", "#5d574e"], cream: ["#e2d3b8", "#c7b38f"], unknown: ["#cbc1b0", "#b3a893"]
  };
  let svgId = 0;
  function silhouette(c) {
    const [fill, dark] = DRAW[c.coat] || DRAW.unknown, id = "s" + (++svgId);
    const body = "M58 230 C50 190 56 150 78 128 L122 128 C144 150 150 190 142 230 Z";
    let extra = "";
    if (c.coat === "calico") extra = `<g clip-path="url(#${id})"><ellipse cx="72" cy="168" rx="26" ry="34" fill="#d9822b"/><ellipse cx="128" cy="200" rx="22" ry="26" fill="#232326"/><ellipse cx="118" cy="96" rx="22" ry="16" fill="#d9822b"/><ellipse cx="80" cy="92" rx="14" ry="12" fill="#232326"/></g>`;
    else if (c.coat === "bicolor") extra = `<g clip-path="url(#${id})" fill="#f4f1ea"><path d="M84 112 Q100 104 116 112 L112 150 Q100 160 88 150 Z"/><ellipse cx="100" cy="200" rx="26" ry="34"/></g>`;
    else if (c.coat === "tabby" || c.coat === "orange" || c.coat === "cream") extra = `<g clip-path="url(#${id})" stroke="${dark}" stroke-width="5" stroke-linecap="round" fill="none"><path d="M90 84 L92 98 M100 82 L100 97 M110 84 L108 98"/><path d="M62 170 C80 168 90 172 98 176 M60 194 C80 190 92 196 102 200 M140 172 C126 170 116 174 108 178"/></g>`;
    return `<svg viewBox="0 0 200 250" preserveAspectRatio="xMidYMax meet" role="img" aria-label="ภาพวาดแทนรูปของ ${esc(c.name)}">
      <defs><clipPath id="${id}"><path d="${body}"/><ellipse cx="100" cy="110" rx="38" ry="33"/></clipPath></defs>
      <ellipse cx="100" cy="232" rx="64" ry="7" fill="rgba(31,29,26,.12)"/>
      <path d="M138 222 C176 218 184 186 168 164" stroke="${fill}" stroke-width="12" stroke-linecap="round" fill="none"/>
      <path d="${body}" fill="${fill}"/><ellipse cx="100" cy="110" rx="38" ry="33" fill="${fill}"/>
      <path d="M66 96 L70 60 L92 82 Z M134 96 L130 60 L108 82 Z" fill="${fill}"/>${extra}
      <circle cx="86" cy="110" r="4.4" fill="#c2416f"/><circle cx="114" cy="110" r="4.4" fill="#c2416f"/>
    </svg>`;
  }
  function portrait(c, note, large) {
    if (c.photo) {
      return large
        ? `<div class="portrait"><img id="profilePhoto" src="${esc(c.photoLarge || c.photo)}" alt="รูปของ${esc(c.name)}" width="900" height="1125" fetchpriority="high" decoding="async"></div>`
        : `<div class="portrait"><img src="${esc(c.photo)}" alt="รูปของ${esc(c.name)}" width="400" height="500" loading="lazy" decoding="async"></div>`;
    }
    return `<div class="portrait">${silhouette(c)}${note ? '<span class="ph-note">ยังไม่มีรูป</span>' : ""}</div>`;
  }
  const miniCat = (c) => `<a class="mini" href="${catHref(c)}">${portrait(c)}${esc(c.name)}</a>`;
  function catCard(c, terms, why) {
    const meta = [statusDot(c)];
    const place = placeOf(c);
    if (place) meta.push(`<span>${highlight(place, terms || [])}</span>`);
    return `<a class="cat${c.status === "passed" ? " past" : ""}" href="${catHref(c)}">
      ${portrait(c, true)}
      <div class="cat-name">${highlight(c.name, terms || [])}</div>
      <div class="cat-meta">${meta.join("")}</div>
      ${why ? `<span class="why">${esc(why)}</span>` : ""}
    </a>`;
  }

  // Article body: blank line = paragraph, "## " = subheading, "- " = list item.
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
    const h = esc(text);
    if (!terms || !terms.length) return h;
    return h.replace(new RegExp("(" + terms.map((t) => reEsc(esc(t))).join("|") + ")", "gi"), "<mark>$1</mark>");
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
    const cats = D.cats.map((c) => ({ c, s: score([[c.name, 10], [c.nicknames.join(" "), 8], [coatLabel(c), 4], [c.locations.join(" "), 3], [c.areas.map((a) => AREAS[a].label).join(" "), 2], [c.marks, 3], [c.personality, 2], [c.health, 2], [c.normal, 2], [c.notes, 1], [c.interview.join(" "), 1]], terms, q) }))
      .filter((r) => r.s).sort((a, b) => b.s - a.s).map((r) => r.c);
    const articles = D.articles.map((a) => ({ a, s: score([[a.title, 10], [a.tags.join(" "), 6], [CATEGORIES[a.category].label, 5], [a.summary, 3], [a.body, 1]], terms, q) }))
      .filter((r) => r.s).sort((a, b) => b.s - a.s).map((r) => r.a);
    return { cats, articles, terms };
  }

  function articleRow(a, terms) {
    return `<li><a class="article-row" href="#/article/${enc(a.id)}">
      <span class="a-cat">${CATEGORIES[a.category].label}</span>
      <div><h3>${highlight(a.title, terms)}</h3>${a.summary ? `<p>${highlight(a.summary, terms)}</p>` : ""}
      <span class="a-meta">${[esc(a.source || a.author), a.date ? thDate(a.date) : "", a.reviewedBy ? "ตรวจทานโดย " + esc(a.reviewedBy) : ""].filter(Boolean).join(" · ")}</span></div>
    </a></li>`;
  }

  const ICON = {
    find: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/><path d="M8 9.5l1-2 1.2 1.6 1.3-1.6 1 2"/></svg>',
    start: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V4"/><path d="M5 4h11l-2 4 2 4H5"/></svg>',
    help: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/><path d="M12 9v5M9.5 11.5h5"/></svg>'
  };

  /* ---------------- home ---------------- */
  function renderHome() {
    const now = D.cats.filter(SEEN_NOW).sort((a, b) => (b.photo ? 1 : 0) - (a.photo ? 1 : 0) || byStatusThenName(a, b));
    const active = D.cats.filter((c) => c.status === "active").length;
    const commuters = D.cats.filter((c) => c.status === "commuter").length;
    const keeperArticles = D.articles.filter((a) => a.category === "experience").length;
    const quotes = (CFG.KEEPER_QUOTES || []).slice(0, 4);
    const recent = D.history.slice(0, 4);
    const firstReads = ["a09", "a01", "a04", "a02"].map((id) => D.articleById[id]).filter(Boolean);
    app.innerHTML = `
      <section class="hello">
        <div>
          <span class="eyebrow">สมุดผู้ดูแลแมว คณะอักษรศาสตร์</span>
          <h1>สิ่งที่ผู้ดูแลรู้ เกี่ยวกับแมวทุกตัวในคณะ</h1>
          <p class="lede">ความรู้เรื่องแมวในคณะเคยอยู่กับผู้ดูแลไม่กี่คน และทุกปีนิสิตที่ช่วยดูแลก็เปลี่ยนรุ่น สมุดเล่มนี้เก็บสิ่งที่พวกเขารู้ไว้ให้คนมาใหม่ ไม่ต้องเริ่มจากศูนย์</p>
        </div>
        <div class="hello-stats" aria-label="สรุปตอนนี้">
          <div><b>${active}</b><span>ตัวอยู่ในคณะ</span></div>
          <div><b>${commuters}</b><span>ตัวแวะมาบ้าง</span></div>
          <div><b>${keeperArticles}</b><span>เรื่องเล่าผู้ดูแล</span></div>
        </div>
      </section>

      <div class="tasks">
        <a class="task" href="#/find"><span class="task-ico">${ICON.find}</span><h2>เพิ่งเจอแมว อยากรู้ว่าตัวไหน</h2><p>ไม่ต้องรู้ชื่อ เลือกสีขนและที่ที่เจอ แล้วดูว่าเป็นแมวตัวไหน</p><span class="go">หาแมวตัวนี้ →</span></a>
        <a class="task" href="#/start"><span class="task-ico">${ICON.start}</span><h2>มาใหม่ อยากช่วยดูแล</h2><p>5 ขั้นที่ผู้ดูแลเดิมอยากให้รู้ ตั้งแต่จำแมวไปจนถึงไปดูแลจริง</p><span class="go">เริ่มที่นี่ →</span></a>
        <a class="task urgent" href="#/help"><span class="task-ico">${ICON.help}</span><h2>แมวดูไม่สบาย หรือบาดเจ็บ</h2><p>ทำอะไรก่อน อะไรห้ามทำ และติดต่อใคร</p><span class="go">ดูขั้นตอน →</span></a>
      </div>

      <section class="sec">
        <div class="toolbar"><h2>ตอนนี้ในคณะ</h2><a href="#/cats">ดูแมวทั้งหมด ${D.cats.length} ตัว →</a></div>
        <div class="strip">${now.map((c) => catCard(c)).join("")}</div>
      </section>

      ${quotes.length ? `<section class="sec">
        <h2>จากสมุดผู้ดูแล</h2>
        <p class="muted">คำพูดจริงจากการสัมภาษณ์ผู้ดูแลแมว ความรู้แบบนี้ไม่เคยถูกเขียนไว้ที่ไหนมาก่อน</p>
        <div class="quotes">${quotes.map((q) => `<figure class="quote"><blockquote>“${esc(q.text)}”</blockquote><figcaption>${esc(q.context)}${q.href ? ` · <a href="${esc(q.href)}">${esc(q.cta || "อ่านต่อ")}</a>` : ""}</figcaption></figure>`).join("")}</div>
      </section>` : ""}

      <section class="sec two">
        <div>
          <h2>บันทึกล่าสุด</h2>
          <p class="muted">ข่าวและการดูแลที่ทีมบันทึกไว้</p>
          ${recent.length ? `<ol class="timeline">${recent.map((h) => { const c = D.byId[h.cat]; return `<li><time datetime="${esc(h.date)}">${thDate(h.date)}</time><div>${c ? `<a href="${catHref(c)}"><b>${esc(c.name)}</b></a> · ` : ""}<span class="t-type">${HISTORY_TYPES[h.type]}</span>${esc(h.note)}</div></li>`; }).join("")}</ol>` : `<p class="muted">ยังไม่มีบันทึก</p>`}
          <p style="margin-top:14px"><a href="${shareHref("sighting")}">เห็นแมววันนี้? บันทึกให้ทีม →</a></p>
        </div>
        <div>
          <h2>อ่านก่อนไปดูแลแมว</h2>
          <p class="muted">เรื่องที่ผู้ดูแลใหม่ถามบ่อยที่สุด</p>
          <ul class="articles">${firstReads.map((a) => articleRow(a)).join("")}</ul>
        </div>
      </section>`;
  }

  /* ---------------- all cats with facets ---------------- */
  function renderCats(q) {
    const f = { status: q.get("status") || "", coat: q.get("coat") || "", area: q.get("area") || "", touch: q.get("touch") || "" };
    const n = (pred) => D.cats.filter(pred).length;
    const chip = (key, val, label, count, swatch) => `<button type="button" data-k="${key}" data-v="${val}" aria-pressed="${f[key] === val}">${swatch ? `<span class="swatch" style="background:${swatch}"></span>` : ""}${label}${count != null ? ` <span class="n">${count}</span>` : ""}</button>`;
    const statusChips = [chip("status", "", "ทั้งหมด", D.cats.length)].concat(Object.keys(STATUS).filter((k) => n((c) => c.status === k)).map((k) => chip("status", k, STATUS[k].label, n((c) => c.status === k))));
    const coatChips = [chip("coat", "", "ทุกสี")].concat(Object.keys(COATS).filter((k) => n((c) => c.coat === k)).map((k) => chip("coat", k, COATS[k].label, n((c) => c.coat === k), COATS[k].swatch)), n((c) => c.coat === "unknown") ? [chip("coat", "unknown", "ยังไม่ระบุสี", n((c) => c.coat === "unknown"))] : []);
    const areaChips = [chip("area", "", "ทุกที่")].concat(Object.keys(AREAS).filter((k) => n((c) => c.areas.includes(k))).map((k) => chip("area", k, AREAS[k].label, n((c) => c.areas.includes(k)))));
    const touchChips = [chip("touch", "", "ทั้งหมด"), chip("touch", "yes", "เป็นมิตร เข้าหาได้", n((c) => c.touch === "yes")), chip("touch", "no", "ไม่ชอบให้จับ", n((c) => c.touch === "no"))];
    app.innerHTML = `
      <header class="page-head">
        <span class="eyebrow">แมวในคณะ</span>
        <h1>แมวทั้ง ${D.cats.length} ตัวในสมุด</h1>
        <p class="lede">กรองตามสีขน ที่ที่เจอบ่อย หรือดูว่าตัวไหนเข้าหาได้ ไม่รู้ชื่อก็หาเจอ</p>
      </header>
      <div class="facets" role="group" aria-label="ตัวกรอง">
        <div class="facet"><span>สถานะ</span><div class="chips">${statusChips.join("")}</div></div>
        <div class="facet"><span>สีขน</span><div class="chips">${coatChips.join("")}</div></div>
        <div class="facet"><span>เจอบ่อยที่</span><div class="chips">${areaChips.join("")}</div></div>
        <div class="facet"><span>เข้าหาได้ไหม</span><div class="chips">${touchChips.join("")}</div></div>
      </div>
      <div class="toolbar"><p class="summary" id="catSummary" aria-live="polite"></p><span><a href="#/family">ผังครอบครัว</a></span></div>
      <div class="cats" id="catGrid"></div>`;
    const draw = () => {
      const list = D.cats.filter((c) => (!f.status || c.status === f.status) && (!f.coat || c.coat === f.coat) && (!f.area || c.areas.includes(f.area)) && (!f.touch || c.touch === f.touch)).sort(byStatusThenName);
      const filtered = f.status || f.coat || f.area || f.touch;
      document.getElementById("catSummary").innerHTML = `แสดง ${list.length} จาก ${D.cats.length} ตัว${filtered ? ` · <button type="button" class="linkbtn" id="clearF">ล้างตัวกรอง</button>` : ""}`;
      document.getElementById("catGrid").innerHTML = list.length ? list.map((c) => catCard(c)).join("") : `<p class="empty">ไม่มีแมวที่ตรงกับตัวกรองนี้</p>`;
      const cl = document.getElementById("clearF");
      if (cl) cl.addEventListener("click", () => { Object.keys(f).forEach((k) => { f[k] = ""; }); sync(); });
    };
    const sync = () => {
      const p = new URLSearchParams();
      Object.keys(f).forEach((k) => { if (f[k]) p.set(k, f[k]); });
      history.replaceState(null, "", "#/cats" + (p.toString() ? "?" + p : ""));
      app.querySelectorAll(".facets button").forEach((b) => b.setAttribute("aria-pressed", f[b.dataset.k] === b.dataset.v));
      draw();
    };
    app.querySelectorAll(".facets button").forEach((b) => b.addEventListener("click", () => { f[b.dataset.k] = b.dataset.v; sync(); }));
    draw();
  }

  /* ---------------- find this cat (browse by what you can see: 2.5.1) ---------------- */
  function renderFind(q) {
    const st = { coat: q.get("coat") || "", area: q.get("area") || "" };
    const places = ["brk", "mcs", "tewalai", "store"].filter((k) => has(AREAS, k));
    app.innerHTML = `
      <header class="page-head">
        <span class="eyebrow">หาแมวตัวนี้</span>
        <h1>เจอแมวตัวหนึ่ง แต่ไม่รู้ว่าชื่ออะไร</h1>
        <p class="lede">ผู้ดูแลบอกว่า <span class="note-hand">“จำแมวจากหน้า”</span> ซึ่งต้องใช้เวลา สำหรับคนมาใหม่ เริ่มจากสิ่งที่เห็นได้ทันที คือสีขนกับที่ที่เจอ</p>
      </header>
      <div class="finder">
        <section class="step-card"><h2><span class="n">ขั้นที่ 1</span>สีขนเป็นแบบไหน</h2><p>เลือกที่ใกล้เคียงที่สุด ถ้าไม่แน่ใจข้ามไปได้</p>
          <div class="coat-grid">${Object.keys(COATS).map((k) => `<button type="button" data-k="coat" data-v="${k}" aria-pressed="${st.coat === k}"><span class="swatch" style="background:${COATS[k].swatch}"></span>${COATS[k].label}</button>`).join("")}
            <button type="button" data-k="coat" data-v="" aria-pressed="${!st.coat}">ไม่แน่ใจ</button></div>
        </section>
        <section class="step-card"><h2><span class="n">ขั้นที่ 2</span>เจอที่ไหน</h2><p>แมวหลายตัวมีที่ประจำ แต่บางตัวก็เดินไปทั่วคณะ</p>
          <div class="area-grid">${places.map((k) => `<button type="button" data-k="area" data-v="${k}" aria-pressed="${st.area === k}">${AREAS[k].label}</button>`).join("")}
            <button type="button" data-k="area" data-v="" aria-pressed="${!st.area}">ที่อื่น หรือไม่แน่ใจ</button></div>
        </section>
        <section class="matches" id="matches" aria-live="polite"></section>
      </div>`;
    const draw = () => {
      const pool = D.cats.filter((c) => c.status !== "passed" && c.status !== "adopted");
      const ranked = pool.map((c) => {
        let s = 0; const why = [];
        if (st.coat) { if (c.coat === st.coat) { s += 3; why.push("สีขนตรง"); } else if (c.coat === "unknown") { why.push("ยังไม่มีข้อมูลสีขน"); } else return null; }
        if (st.area) { if (c.areas.includes(st.area)) { s += 2; why.push("เจอบ่อยที่นี่"); } else if (c.status === "commuter" || c.areas.includes("roam")) { s += 1; why.push("เดินไปหลายที่"); } }
        if (SEEN_NOW(c)) s += 0.5;
        return { c, s, why: why.join(" · "), known: !st.coat || c.coat !== "unknown" };
      }).filter(Boolean).sort((a, b) => b.s - a.s || byStatusThenName(a.c, b.c));
      const sure = ranked.filter((r) => r.known), maybe = ranked.filter((r) => !r.known);
      const el = document.getElementById("matches");
      if (!st.coat && !st.area) { el.innerHTML = `<h2>เลือกอย่างน้อยหนึ่งข้อ</h2><p>ระบบจะเรียงแมวที่น่าจะเป็นมาให้ดู</p>`; return; }
      const newCat = `<div class="callout"><h3>ไม่ตรงกับตัวไหนเลย?</h3><p>อาจเป็นแมวที่ยังไม่อยู่ในสมุด แจ้งทีมพร้อมรูปถ้ามี เราจะได้เพิ่มเข้าไป</p><a class="btn pink" href="${shareHref("newcat", null, (st.coat ? "&coat=" + st.coat : "") + (st.area ? "&area=" + st.area : ""))}">แจ้งแมวตัวใหม่</a></div>`;
      el.innerHTML = `
        <h2>${sure.length ? `น่าจะเป็น ${sure.length} ตัวนี้` : "ยังไม่พบแมวที่ตรง"}</h2>
        <p>${sure.length ? "ลองเทียบหน้าและปลอกคอกับรูป แล้วกดเข้าไปดูว่าปกติแมวตัวนั้นเป็นอย่างไร" : "ลองเปลี่ยนสีขนหรือเลือก “ไม่แน่ใจ”"}</p>
        ${sure.length ? `<div class="cats">${sure.slice(0, 8).map((r) => catCard(r.c, [], r.why)).join("")}</div>` : ""}
        ${maybe.length ? `<section class="sec"><h2 style="font-size:19px">ยังไม่มีข้อมูลสีขน อาจเป็นตัวใดตัวหนึ่งนี้</h2><div class="mini-cats" style="margin-top:12px">${maybe.map((r) => miniCat(r.c)).join("")}</div></section>` : ""}
        ${newCat}`;
    };
    app.querySelectorAll(".finder button[data-k]").forEach((b) => b.addEventListener("click", () => {
      st[b.dataset.k] = b.dataset.v;
      app.querySelectorAll(`.finder button[data-k="${b.dataset.k}"]`).forEach((x) => x.setAttribute("aria-pressed", x === b));
      const p = new URLSearchParams(); if (st.coat) p.set("coat", st.coat); if (st.area) p.set("area", st.area);
      history.replaceState(null, "", "#/find" + (p.toString() ? "?" + p : ""));
      draw();
    }));
    draw();
  }

  /* ---------------- newcomer path (internalization → socialization) ---------------- */
  function renderStart() {
    const KEY = "akc-start-v1";
    const done = store.get(KEY, {});
    const noTouch = D.cats.filter((c) => c.touch === "no" && SEEN_NOW(c));
    const nNow = D.cats.filter(SEEN_NOW).length;
    const steps = [
      { id: "know", seci: "Combination", title: "รู้จักแมวที่คุณจะเจอบ่อย", text: `ตอนนี้มีแมวในคณะ ${nNow} ตัว เริ่มจากตัวที่อยู่ในอาคารที่คุณเรียน แล้วลองจำให้ได้ 3 ตัว`, links: [["ดูแมวที่อยู่ในคณะ", "#/cats?status=active"], ["วิธีที่ผู้ดูแลจำแมว", "#/article/a09"]] },
      { id: "touch", seci: "Internalization", title: "รู้ว่าตัวไหนเข้าหาได้ ตัวไหนไม่ควรจับ", text: noTouch.length ? `${noTouch.map((c) => c.name).join(", ")} ไม่ชอบให้จับ ส่วนตัวอื่นส่วนใหญ่เป็นมิตร แต่ก็ควรอ่านท่าทางก่อนทุกครั้ง` : "ส่วนใหญ่เป็นมิตร แต่ควรอ่านท่าทางแมวก่อนเข้าหาทุกครั้ง", links: [["แมวที่ไม่ชอบให้จับ", "#/cats?touch=no"], ["อ่านภาษากายแมว", "#/article/a04"]] },
      { id: "feed", seci: "Internalization", title: "ให้อาหารตามธรรมเนียมของคณะ", text: "ให้ในจุดที่ตกลงกันไว้ ไม่ให้ซ้ำกับคนอื่น และเก็บชามหลังแมวกินเสร็จ ธรรมเนียมเหล่านี้ไม่เคยถูกเขียนเป็นกฎ แต่ผู้ดูแลทุกคนทำเหมือนกัน", links: [["การให้อาหาร", "#/article/a01"], ["ความสะอาดของจุดให้อาหาร", "#/article/a05"]] },
      { id: "sick", seci: "Internalization", title: "รู้ว่าเจอแมวป่วยต้องทำอะไร และแจ้งใคร", text: "สังเกตอาการ ถ่ายรูป จดเวลาและสถานที่ ห้ามให้ยาของคน แล้วแจ้งผู้ดูแล", links: [["เจอแมวป่วย ทำอย่างไร", "#/help"], ["สัญญาณว่าแมวไม่สบาย", "#/article/a02"]] },
      { id: "join", seci: "Socialization", title: "ไปดูแลจริงกับผู้ดูแลเดิมสักรอบ", text: "บางอย่างเรียนจากการอ่านไม่ได้ เช่น จังหวะการเข้าหาแมวขี้ระแวง หรือวิธีสังเกตว่าแมวกินน้อยกว่าปกติ ขอไปให้อาหารกับผู้ดูแลเดิมสักครั้ง", links: [["ขอไปช่วยดูแลด้วย", shareHref("join")], ["ใครดูแลอะไร", "#/about"]] }
    ];
    const count = () => steps.filter((s) => done[s.id]).length;
    app.innerHTML = `
      <header class="page-head">
        <span class="eyebrow">มาใหม่ เริ่มที่นี่</span>
        <h1>5 ขั้น จากคนที่เห็นแมวผ่าน ๆ สู่ผู้ดูแล</h1>
        <p class="lede">ทุกปีนิสิตที่ช่วยดูแลแมวเปลี่ยนรุ่น ขั้นตอนนี้สรุปสิ่งที่ผู้ดูแลเดิมอยากให้คนมาใหม่รู้ เริ่มจากอ่าน จบที่ลงมือทำจริงกับผู้ดูแลเดิม</p>
        <div class="progress" aria-hidden="true"><i id="pbar" style="width:${(count() / steps.length) * 100}%"></i></div>
        <p class="muted" id="ptext" aria-live="polite" style="font-size:14.5px">ทำแล้ว ${count()} จาก ${steps.length} ขั้น · บันทึกไว้ในเบราว์เซอร์นี้</p>
      </header>
      <ol class="path">${steps.map((s) => `
        <li class="${done[s.id] ? "done" : ""}" data-id="${s.id}">
          <div><h2>${esc(s.title)}<span class="seci" title="ขั้นใน SECI model">${s.seci}</span></h2><p>${esc(s.text)}</p>
            <div class="links">${s.links.map(([t, h]) => `<a href="${esc(h)}">${esc(t)} →</a>`).join("")}</div></div>
          <label class="done-toggle"><input type="checkbox" ${done[s.id] ? "checked" : ""}> ทำแล้ว</label>
        </li>`).join("")}
      </ol>`;
    app.querySelectorAll(".path li").forEach((li) => li.querySelector("input").addEventListener("change", (e) => {
      done[li.dataset.id] = e.target.checked;
      store.set(KEY, done);
      li.classList.toggle("done", e.target.checked);
      document.getElementById("pbar").style.width = (count() / steps.length) * 100 + "%";
      document.getElementById("ptext").textContent = `ทำแล้ว ${count()} จาก ${steps.length} ขั้น · บันทึกไว้ในเบราว์เซอร์นี้`;
    }));
  }

  /* ---------------- one cat ---------------- */
  function approachFor(c) {
    if (c.approach) return c.approach;
    if (c.touch === "no") return "ไม่ชอบให้จับ ดูอยู่ห่าง ๆ อย่ายื่นมือเข้าไปหรืออุ้ม";
    if (c.touch === "yes") return "เป็นมิตร นั่งลงให้ตัวต่ำแล้วยื่นมือให้ดมก่อน ถ้าแมวเดินเข้ามาเองค่อยลูบ";
    return "ยังไม่มีข้อมูล ให้เข้าหาอย่างระวังและอ่านท่าทางก่อน";
  }
  function renderCat(id) {
    const c = D.byId[lower(id)];
    if (!c) { app.innerHTML = `<nav class="crumbs"><a href="#/cats">แมวในคณะ</a></nav><p class="empty">ไม่พบแมว “${esc(id)}” ในสมุด <a href="#/find">ลองหาจากสีขนและที่ที่เจอ</a></p>`; return; }
    document.title = `${c.name} · ${TITLE}`;
    const mom = c.mother ? D.byId[c.mother] : null, sibs = siblingsOf(c), kids = childrenOf(c.id);
    const hist = historyFor(c.id), rel = articlesFor(c.id);
    const strip = [SEX[c.sex], c.age ? "อายุ " + c.age : "", coatLabel(c) ? "สีขน" + coatLabel(c) : ""].filter(Boolean).map((t) => `<li>${esc(t)}</li>`)
      .concat([`<li class="${c.sterilised === "yes" ? "" : "warn"}">${STERIL[c.sterilised]}</li>`, `<li class="${c.vaccinated === "yes" ? "" : "warn"}">${VACC[c.vaccinated]}</li>`]);
    const famRow = (label, html) => (html ? `<div class="family-row"><span>${label}</span><div class="mini-cats">${html}</div></div>` : "");
    const family = famRow("แม่", mom ? miniCat(mom) : "") + famRow("พี่น้อง", sibs.map(miniCat).join("")) + famRow("ลูก", kids.map(miniCat).join(""));
    const notes = [c.notes].concat(c.interview).filter(Boolean);
    const coatNote = c.coatSource === "photo" ? " (ระบุจากรูปถ่าย)" : "";
    app.innerHTML = `
      <nav class="crumbs" aria-label="ตำแหน่ง"><a href="#/cats">แมวในคณะ</a><span>/</span>${esc(c.name)}</nav>
      <article class="profile">
        <div class="profile-side">${portrait(c, true, true)}${c.gallery.length > 1 ? `
          <div class="gallery" role="group" aria-label="รูปของ${esc(c.name)} ${c.gallery.length} รูป">${c.gallery.map((p, i) => `<button type="button" class="thumb" aria-pressed="${i === 0}" aria-label="ดูรูปที่ ${i + 1}" data-l="${esc(p.l)}"><img src="${esc(p.s)}" alt="" width="96" height="120" loading="lazy" decoding="async"></button>`).join("")}</div>` : ""}
          ${c.gallery.length ? `<p class="photo-credit">รูปจากโฟลเดอร์ Google Drive ของทีม${window.CAT_PHOTO_SYNCED ? " · อัปเดต " + thDate(window.CAT_PHOTO_SYNCED) : ""}</p>` : `<p class="photo-credit">ยังไม่มีรูป <a href="${shareHref("photo", c)}">มีรูปแมวตัวนี้? ส่งให้ทีม</a></p>`}
        </div>
        <div>
          <h1>${esc(c.name)}</h1>
          <div class="cat-meta" style="font-size:15px">${statusDot(c)}${STATUS[c.status].hint ? `<span>${esc(STATUS[c.status].hint)}</span>` : ""}${c.lastSeen ? `<span>พบล่าสุด ${thDate(c.lastSeen)}</span>` : ""}</div>
          <ul class="facts-strip">${strip.join("")}</ul>
          <div class="actions">
            <a class="btn" href="${shareHref("sighting", c)}">เห็น${esc(c.name)}วันนี้</a>
            <a class="btn ghost" href="${shareHref("story", c)}">เล่าเรื่องของ${esc(c.name)}</a>
          </div>

          <section class="normal-card" aria-labelledby="normalH">
            <h2 id="normalH">ปกติ${esc(c.name)}เป็นอย่างไร</h2>
            <p>รู้ว่าปกติเป็นแบบไหน จึงสังเกตได้ว่าเมื่อไรผิดไปจากเดิม</p>
            <dl class="normal-list">
              <div><dt>มักอยู่ที่</dt><dd>${c.locations.length ? esc(c.locations.join(", ")) : c.areas.length ? esc(c.areas.map((a) => AREAS[a].label).join(", ")) : '<span class="muted">ยังไม่มีข้อมูล</span>'}</dd></div>
              <div><dt>เข้าหาอย่างไร</dt><dd>${esc(approachFor(c))}</dd></div>
              ${c.health ? `<div><dt>สุขภาพที่ต้องจับตา</dt><dd>${esc(c.health)}</dd></div>` : ""}
              ${c.marks ? `<div><dt>ลักษณะและข้อสังเกต</dt><dd>${esc(c.marks)}</dd></div>` : ""}
              ${c.normal ? `<div><dt>กิจวัตรตามที่ผู้ดูแลเล่า</dt><dd class="hand">${esc(c.normal)}</dd></div>` : ""}
            </dl>
            ${c.normal ? "" : `<div class="ask">ผู้ดูแลยังไม่ได้บันทึกว่าปกติ${esc(c.name)}กินเวลาไหน นอนตรงไหน หรือมีนิสัยอะไรเป็นพิเศษ ถ้าคุณรู้ <a href="${shareHref("story", c, "&topic=normal")}">ช่วยเล่าให้ทีม</a></div>`}
          </section>

          ${notes.length ? `<section class="sec"><span class="label">จากบันทึกสัมภาษณ์ผู้ดูแล (ข้อความตามที่จดไว้)</span><ul class="keeper-notes">${notes.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></section>` : ""}

          ${family ? `<section class="sec"><span class="label">ครอบครัว</span><div class="family">${family}</div><p style="margin:12px 0 0;font-size:15px"><a href="#/family/${enc(c.id)}">ดูในผังครอบครัว</a></p></section>` : ""}

          <section class="sec"><span class="label">ประวัติการดูแล</span>
            ${hist.length ? `<ol class="timeline">${hist.map((h) => `<li><time datetime="${esc(h.date)}">${thDate(h.date)}</time><div><span class="t-type">${HISTORY_TYPES[h.type]}</span>${esc(h.note)}${h.by ? `<span class="t-by">${esc(h.by)}</span>` : ""}</div></li>`).join("")}</ol>`
              : `<p class="muted">ยังไม่มีบันทึก ถ้าคุณดูแลหรือเห็น${esc(c.name)} <a href="${shareHref("sighting", c)}">บันทึกให้ทีมได้</a></p>`}
          </section>

          ${rel.length ? `<section class="sec"><span class="label">ความรู้ที่เกี่ยวกับ${esc(c.name)}</span><ul class="articles">${rel.map((a) => articleRow(a)).join("")}</ul></section>` : ""}

          <p class="meta-line">ข้อมูลจากชีตข้อมูลแมวของทีม${D.loadedAt ? " อ่านล่าสุด " + TH_TIME.format(D.loadedAt) + " น." : ""}${coatNote ? " · สีขน" + coatNote : ""}${c.source ? " · ที่มา: " + esc(c.source) : ""} · ข้อมูลไม่ถูกต้อง? <a href="${shareHref("fix", c)}">แจ้งแก้</a></p>
        </div>
      </article>`;
  }

  // profile gallery: thumbnails swap the main photo (event delegation survives re-renders)
  app.addEventListener("click", (e) => {
    const t = e.target.closest(".gallery .thumb");
    if (!t) return;
    const main = document.getElementById("profilePhoto");
    if (main) main.src = t.dataset.l;
    t.parentNode.querySelectorAll(".thumb").forEach((b) => b.setAttribute("aria-pressed", b === t));
  });

  /* ---------------- knowledge ---------------- */
  function renderKnowledge(cat) {
    cat = has(CATEGORIES, cat) ? cat : "";
    const list = D.articles.filter((a) => !cat || a.category === cat).sort((a, b) => (a.category === "experience" ? -1 : 0) - (b.category === "experience" ? -1 : 0) || (a.date < b.date ? 1 : -1));
    const n = (k) => D.articles.filter((a) => a.category === k).length;
    app.innerHTML = `
      <header class="page-head">
        <span class="eyebrow">คลังความรู้</span>
        <h1>ความรู้การดูแลแมว และเรื่องเล่าจากผู้ดูแล</h1>
        <p class="lede">ทุกเรื่องบอกที่มาและสถานะการตรวจทาน เรื่องเล่าจากผู้ดูแลมาก่อน เพราะเป็นความรู้ที่หาอ่านที่อื่นไม่ได้</p>
      </header>
      <nav class="tabs" aria-label="หมวดความรู้">
        <a href="#/knowledge" class="${cat ? "" : "on"}">ทั้งหมด<span class="n">${D.articles.length}</span></a>
        ${Object.keys(CATEGORIES).filter((k) => n(k)).map((k) => `<a href="#/knowledge/${k}" class="${cat === k ? "on" : ""}">${CATEGORIES[k].label}<span class="n">${n(k)}</span></a>`).join("")}
      </nav>
      ${cat ? `<p class="cat-desc">${esc(CATEGORIES[cat].desc)}</p>` : ""}
      ${list.length ? `<ul class="articles">${list.map((a) => articleRow(a)).join("")}</ul>` : `<p class="empty">ยังไม่มีเรื่องในหมวดนี้ <a href="${shareHref("story")}">เป็นคนแรกที่เล่า</a></p>`}
      <aside class="callout"><h3>รู้อะไรที่ผู้ดูแลรุ่นต่อไปควรรู้?</h3><p>เคล็ดลับ บทเรียน หรือเรื่องที่เคยเกิดขึ้นกับแมวในคณะ บอกเท่าที่รู้ก็พอ ทีมจะเรียบเรียงและตรวจทานก่อนเผยแพร่ พร้อมใส่ชื่อคุณเป็นเครดิต</p><a class="btn pink" href="${shareHref("story")}">เล่าให้ทีมฟัง</a></aside>`;
  }

  function renderArticle(id) {
    const a = D.articleById[lower(id)];
    if (!a) { app.innerHTML = `<nav class="crumbs"><a href="#/knowledge">คลังความรู้</a></nav><p class="empty">ไม่พบเรื่องนี้</p>`; return; }
    document.title = `${a.title} · ${TITLE}`;
    const cats = a.relatedCats.map((k) => D.byId[k]).filter(Boolean);
    const more = D.articles.filter((x) => x.category === a.category && x.id !== a.id).slice(0, 3);
    app.innerHTML = `
      <nav class="crumbs" aria-label="ตำแหน่ง"><a href="#/knowledge">คลังความรู้</a><span>/</span><a href="#/knowledge/${a.category}">${CATEGORIES[a.category].label}</a></nav>
      <article class="article">
        <span class="eyebrow">${CATEGORIES[a.category].label}</span>
        <h1>${esc(a.title)}</h1>
        ${a.summary ? `<p class="lede">${esc(a.summary)}</p>` : ""}
        <div class="byline">
          ${a.author ? `<span>เรียบเรียงโดย <b>${esc(a.author)}</b></span>` : ""}
          ${a.source ? `<span>ที่มา <b>${esc(a.source)}</b></span>` : ""}
          ${a.date ? `<span>${thDate(a.date)}</span>` : ""}
          <span>${a.reviewedBy ? `ตรวจทานโดย <b>${esc(a.reviewedBy)}</b>` : `<span class="flag-warn">ยังไม่ได้ตรวจทาน</span>`}</span>
        </div>
        <div class="prose">${renderBody(a.body)}</div>
        ${a.tags.length ? `<div class="tags">${a.tags.map((t) => `<a class="chip" href="#/search/${enc(t)}">${esc(t)}</a>`).join("")}</div>` : ""}
        ${cats.length ? `<section class="sec"><span class="label">แมวในเรื่องนี้</span><div class="mini-cats">${cats.map(miniCat).join("")}</div></section>` : ""}
        ${a.category === "health" ? `<aside class="callout danger"><h3>แมวป่วยหรือบาดเจ็บตอนนี้?</h3><p>คลังนี้ไม่ใช่การวินิจฉัยโรค ดูขั้นตอนเบื้องต้นและช่องทางติดต่อได้ที่หน้าเจอแมวป่วย</p><a class="btn" href="#/help">เจอแมวป่วย</a></aside>` : ""}
        <div class="feedback"><span>เรื่องนี้ขาดอะไร หรือมีตรงไหนไม่ถูก?</span><a class="btn ghost" href="${shareHref("story", null, "&ctx=" + enc(a.id))}">เพิ่มเติมจากประสบการณ์</a><a class="btn ghost" href="${shareHref("fix", null, "&ctx=" + enc(a.id))}">แจ้งแก้</a></div>
      </article>
      ${more.length ? `<section class="sec"><span class="label">อ่านต่อในหมวด${CATEGORIES[a.category].label}</span><ul class="articles">${more.map((x) => articleRow(x)).join("")}</ul></section>` : ""}`;
  }

  function renderSearch(q) {
    q = norm(q);
    if (searchInput.value !== q) searchInput.value = q;
    const r = searchAll(q);
    document.title = `ค้นหา “${q}” · ${TITLE}`;
    app.innerHTML = `
      <header class="page-head"><span class="eyebrow">ค้นหา</span><h1>ผลการค้นหา “${esc(q)}”</h1>
        <p class="lede">${r.cats.length + r.articles.length ? `พบแมว ${r.cats.length} ตัว และความรู้ ${r.articles.length} เรื่อง` : `ไม่พบผลลัพธ์ ถ้าไม่รู้ชื่อแมว <a href="#/find">ลองหาจากสีขนและที่ที่เจอ</a>`}</p></header>
      ${r.cats.length ? `<section class="results"><h2>แมว</h2><div class="cats">${r.cats.map((c) => catCard(c, r.terms)).join("")}</div></section>` : ""}
      ${r.articles.length ? `<section class="results"><h2>ความรู้</h2><ul class="articles">${r.articles.map((a) => articleRow(a, r.terms)).join("")}</ul></section>` : ""}`;
  }

  /* ---------------- share (externalization, with review before publishing) ---------------- */
  const TYPES = {
    sighting: { label: "เห็นแมววันนี้", ph: "เห็นที่ไหน ทำอะไรอยู่ ดูปกติไหม" },
    sick: { label: "แมวดูไม่สบาย", ph: "อาการที่เห็น เห็นเมื่อไร ตอนนี้แมวอยู่ที่ไหน" },
    newcat: { label: "เจอแมวที่ไม่มีในสมุด", ph: "สีขน ลักษณะ เจอที่ไหน มีปลอกคอไหม" },
    story: { label: "เล่าประสบการณ์ / เคล็ดลับ", ph: "เรื่องที่อยากส่งต่อ เช่น ปกติแมวตัวนี้ทำอะไร หรือเคยแก้ปัญหาอะไรได้" },
    question: { label: "มีคำถามถึงผู้ดูแล", ph: "อยากรู้อะไร ทีมจะถามผู้ดูแลและตอบในคลัง" },
    photo: { label: "ส่งรูปแมว", ph: "รูปของแมวตัวไหน ถ่ายที่ไหน (ใส่ลิงก์รูปด้านล่าง)" },
    fix: { label: "ข้อมูลไม่ถูกต้อง", ph: "ตรงไหนผิด และที่ถูกคืออะไร" },
    join: { label: "อยากไปช่วยดูแล", ph: "สะดวกช่วงไหน เรียนอยู่อาคารไหน" }
  };
  function renderShare(q) {
    const type = has(TYPES, q.get("type")) ? q.get("type") : "sighting";
    const cat = D.byId[lower(q.get("cat") || "")];
    const ctx = q.get("ctx") ? D.articleById[lower(q.get("ctx"))] : null;
    const preset = [q.get("topic") === "normal" && cat ? `ปกติ${cat.name}...` : "", q.get("coat") && has(COATS, q.get("coat")) ? "สีขน: " + COATS[q.get("coat")].label : "", ctx ? `เกี่ยวกับเรื่อง “${ctx.title}”: ` : ""].filter(Boolean).join("\n");
    const place = q.get("area") && has(AREAS, q.get("area")) ? AREAS[q.get("area")].label : "";
    const live = !!norm(CFG.SUBMIT_URL);
    app.innerHTML = `
      <header class="page-head"><span class="eyebrow">แบ่งปันความรู้</span><h1>บอกเท่าที่รู้ก็พอ</h1>
        <p class="lede">เห็นแมวเมื่อเช้า หรือดูแลแมวในคณะมาหลายปี ทุกเรื่องช่วยให้สมุดเล่มนี้ทันสมัย ทีมจะตรวจทานก่อนเผยแพร่และใส่ชื่อคุณเป็นเครดิตถ้าต้องการ</p></header>
      <div class="share-grid">
        <form class="form" id="shareForm" novalidate>
          <fieldset class="field"><legend>เรื่องที่จะบอก</legend>
            <div class="type-grid">${Object.keys(TYPES).map((k) => `<label><input type="radio" name="type" value="${k}" ${k === type ? "checked" : ""}>${TYPES[k].label}</label>`).join("")}</div>
          </fieldset>
          <div class="field"><label for="fCat">แมวตัวไหน</label>
            <select id="fCat" name="cat"><option value="">ไม่ทราบ หรือไม่อยู่ในสมุด</option>${D.cats.slice().sort(byStatusThenName).map((c) => `<option value="${esc(c.name)}" ${cat && cat.id === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></div>
          <div class="field"><label for="fMsg">รายละเอียด</label>
            <textarea id="fMsg" name="message" required placeholder="${esc(TYPES[type].ph)}…">${esc(preset)}</textarea>
            <p class="hint" id="msgHint">ไม่ต้องเขียนยาว ทีมจะเรียบเรียงให้</p></div>
          <div class="two-fields">
            <div class="field"><label for="fPlace">สถานที่ (ถ้ามี)</label><input id="fPlace" name="place" type="text" autocomplete="off" value="${esc(place)}" placeholder="เช่น BRK ชั้น 1 หน้าป้อม รปภ.…"></div>
            <div class="field"><label for="fPhoto">ลิงก์รูป (ถ้ามี)</label><input id="fPhoto" name="photo" type="url" inputmode="url" autocomplete="off" spellcheck="false" placeholder="ลิงก์ Google Drive หรือ Google Photos…"></div>
          </div>
          <div class="two-fields">
            <div class="field"><label for="fName">ชื่อที่ให้ใส่เป็นเครดิต (ถ้าต้องการ)</label><input id="fName" name="name" type="text" autocomplete="nickname" placeholder="เช่น นิสิตปี 2 ภาคภาษาไทย…"></div>
            <div class="field"><label for="fContact">ช่องทางติดต่อกลับ (ถ้าต้องการ)</label><input id="fContact" name="contact" type="text" autocomplete="off" spellcheck="false" placeholder="LINE ID หรืออีเมล…"></div>
          </div>
          <label class="consent"><input type="checkbox" name="consent" value="yes"> อนุญาตให้ทีมเผยแพร่เรื่องนี้ในคลังหลังตรวจทาน (ถ้าไม่ติ๊ก ทีมจะใช้เพื่อดูแลแมวเท่านั้น)</label>
          <div class="hp" aria-hidden="true"><label>เว็บไซต์ <input name="website" tabindex="-1" autocomplete="off"></label></div>
          <div id="formStatus" role="status" aria-live="polite"></div>
          <div><button class="btn pink" type="submit" id="fSubmit">ส่งให้ทีม</button></div>
        </form>
        <aside>
          <span class="label">หลังจากกดส่ง</span>
          <ol class="flow">
            <li><div><b>เข้าชีตรอตรวจ</b>เรื่องของคุณยังไม่ขึ้นเว็บทันที</div></li>
            <li><div><b>ผู้ดูแลเนื้อหาตรวจทาน</b>เช็กความถูกต้องและความเป็นส่วนตัว เรื่องสุขภาพจะถามผู้ดูแลหรือสัตวแพทย์ก่อน</div></li>
            <li><div><b>เผยแพร่พร้อมเครดิต</b>ขึ้นในหน้าแมวหรือคลังความรู้ พร้อมที่มา</div></li>
          </ol>
          <div class="callout danger"><h3>แมวป่วยหนักหรือบาดเจ็บ?</h3><p>อย่ารอให้ทีมตรวจ ทำตามขั้นตอนเร่งด่วนก่อน</p><a class="btn" href="#/help">เจอแมวป่วย</a></div>
        </aside>
      </div>`;
    const form = document.getElementById("shareForm"), msg = document.getElementById("fMsg"), status = document.getElementById("formStatus");
    form.querySelectorAll('input[name="type"]').forEach((r) => r.addEventListener("change", () => { msg.placeholder = TYPES[r.value].ph + "…"; }));
    const show = (cls, html) => { status.className = "form-status " + cls; status.innerHTML = html; };
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = new FormData(form);
      if (!norm(data.get("message"))) { show("err", "<b>ยังไม่ได้ใส่รายละเอียด</b>เขียนสั้น ๆ ว่าเห็นอะไรหรืออยากบอกอะไร"); msg.focus(); return; }
      const payload = new URLSearchParams();
      ["type", "cat", "message", "place", "photo", "name", "contact", "website"].forEach((k) => payload.set(k, norm(data.get(k))));
      payload.set("type", TYPES[data.get("type")] ? TYPES[data.get("type")].label : data.get("type"));
      payload.set("consent", data.get("consent") === "yes" ? "yes" : "no");
      payload.set("page", location.href);
      if (!live) {
        const text = ["[" + payload.get("type") + "]", payload.get("cat") && "แมว: " + payload.get("cat"), payload.get("message"), payload.get("place") && "สถานที่: " + payload.get("place"), payload.get("photo") && "รูป: " + payload.get("photo"), payload.get("name") && "จาก: " + payload.get("name")].filter(Boolean).join("\n");
        let copied = false;
        try { await navigator.clipboard.writeText(text); copied = true; } catch (err) { /* clipboard blocked */ }
        show("info", `<b>ระบบรับเรื่องอัตโนมัติยังไม่เปิด</b>${copied ? "คัดลอกข้อความของคุณไว้แล้ว " : ""}ส่งให้ทีมผ่านช่องทางที่ระบุในหน้า <a href="#/about">เกี่ยวกับโครงการ</a> ได้เลย`);
        return;
      }
      const btn = document.getElementById("fSubmit");
      btn.disabled = true; btn.textContent = "กำลังส่ง…";
      try {
        // Apps Script web apps do not send CORS headers: no-cors delivers the post; the sheet is the receipt
        await fetch(CFG.SUBMIT_URL, { method: "POST", mode: "no-cors", body: payload });
        form.reset();
        show("ok", `<b>ได้รับเรื่องแล้ว ขอบคุณมาก</b>สถานะ: รอทีมตรวจทาน${data.get("type") === "sick" ? ' · ถ้าแมวอาการหนัก ทำตาม<a href="#/help">ขั้นตอนเร่งด่วน</a>ด้วย' : ""}`);
      } catch (err) {
        show("err", "<b>ส่งไม่สำเร็จ</b>ตรวจการเชื่อมต่ออินเทอร์เน็ตแล้วกดส่งอีกครั้ง ข้อความของคุณยังอยู่ในฟอร์ม");
      } finally {
        btn.disabled = false; btn.textContent = "ส่งให้ทีม";
      }
    });
  }

  /* ---------------- help ---------------- */
  function renderHelp() {
    const contacts = (CFG.EMERGENCY_CONTACTS || []).filter((c) => norm(c.value));
    app.innerHTML = `
      <div class="article">
        <header class="page-head"><span class="eyebrow" style="color:var(--bad)">เร่งด่วน</span><h1>เจอแมวป่วยหรือบาดเจ็บ</h1>
          <p class="lede">ทำตามนี้ก่อน แล้วติดต่อผู้ดูแลหรือสัตวแพทย์</p></header>
        <ol class="steps">
          <li><div><b>อย่าเพิ่งจับถ้าแมวตกใจหรือขู่</b> แมวที่เจ็บอาจกัดหรือข่วน อยู่ห่างพอดูอาการได้</div></li>
          <li><div><b>ถ่ายรูปและจดตำแหน่ง</b> แมวตัวไหน อยู่ตรงไหน เห็นอาการอะไร เวลาเท่าไร</div></li>
          <li><div><b>ห้ามให้ยาของคน</b> ยาบางชนิด เช่น พาราเซตามอล เป็นพิษร้ายแรงต่อแมว</div></li>
          <li><div><b>ติดต่อผู้ดูแลหรือสัตวแพทย์</b> ตามช่องทางด้านล่าง</div></li>
          <li><div><b>แจ้งทีมในเว็บ</b> คนอื่นจะได้รู้ว่ามีคนดูแลแล้ว <a href="${shareHref("sick")}">แจ้งว่าแมวไม่สบาย</a></div></li>
        </ol>
        <section><span class="label">ติดต่อ</span>
          ${contacts.length ? `<dl class="contact">${contacts.map((c) => `<div><dt>${esc(c.label)}</dt><dd>${esc(c.value)}${c.href ? ` · <a href="${esc(c.href)}" target="_blank" rel="noopener">ข้อมูลจากจุฬาฯ</a>` : ""}</dd></div>`).join("")}</dl>` : ""}
          <p class="muted" style="margin-top:14px;font-size:15px">ยังไม่มีเบอร์ของผู้ดูแลแมวในคณะที่ยืนยันแล้ว ระหว่างนี้แจ้งทีมผ่าน<a href="${shareHref("sick")}">ฟอร์มแจ้งแมวไม่สบาย</a></p>
        </section>
        <p class="muted" style="margin-top:22px;font-size:14.5px">หน้านี้เป็นแนวทางเบื้องต้นสำหรับคนทั่วไป ไม่ใช่การวินิจฉัยหรือรักษา หากไม่แน่ใจให้ปรึกษาสัตวแพทย์</p>
        <p style="margin-top:10px"><a href="#/article/a02">สัญญาณที่บอกว่าแมวอาจไม่สบาย →</a></p>
      </div>`;
  }

  /* ---------------- about: the KM process made visible ---------------- */
  function renderAbout() {
    const keepers = [...new Set(D.cats.map((c) => c.caretakers).filter(Boolean))];
    const st = (label, sample) => `<li><span>${label}</span><span class="${sample ? "flag-warn" : ""}">${sample ? "สำเนาในเว็บ" : "ชีตของทีม (สด)"}</span></li>`;
    const steps = [
      ["1. ระบุความรู้ที่สำคัญ", "ผู้ดูแลใหม่ไม่รู้ชื่อแมว ไม่รู้ว่าตัวไหนทำหมันแล้ว และไม่รู้ว่าแมวป่วยต้องแจ้งใคร", [["หาแมวตัวนี้", "#/find"], ["เจอแมวป่วย", "#/help"]]],
      ["2. สร้างและแสวงหาความรู้", "สัมภาษณ์ผู้ดูแลเดิม รวบรวมรูปและข้อมูลจากชีตของทีม แปลงเรื่องเล่าเป็นบทความ", [["เรื่องเล่าจากผู้ดูแล", "#/knowledge/experience"]]],
      ["3. จัดเก็บ", "ประวัติแมวรายตัว หมวดความรู้ แท็ก และเมทาดาต้า (ที่มา วันที่ สถานะตรวจทาน) จัดแบบหลายมิติ ค้นได้จากสีขน ที่ที่เจอ และนิสัย", [["แมวในคณะ", "#/cats"], ["คลังความรู้", "#/knowledge"]]],
      ["4. แบ่งปัน", "ฟอร์มสั้น บอกเท่าที่รู้ เข้าชีตรอตรวจ เผยแพร่พร้อมเครดิต", [["แบ่งปันความรู้", "#/share"]]],
      ["5. นำไปใช้", "ผู้ดูแลใหม่ทำตาม 5 ขั้น จนไปดูแลจริงกับผู้ดูแลเดิม แล้วส่งสิ่งที่เรียนรู้กลับมาเป็นความรู้ใหม่", [["มาใหม่ เริ่มที่นี่", "#/start"]]]
    ];
    app.innerHTML = `
      <header class="page-head"><span class="eyebrow">เกี่ยวกับโครงการ</span><h1>ทำไมต้องมีสมุดเล่มนี้</h1>
        <p class="lede">ความรู้เรื่องแมวในคณะมีอยู่แล้ว แต่กระจายอยู่กับผู้ดูแลไม่กี่คนและแชตหลายกลุ่ม นิสิตที่ช่วยดูแลเปลี่ยนรุ่นทุกปีการศึกษา ความรู้จากประสบการณ์จึงหายไปพร้อมคนที่จบไป คลังนี้รวบรวมไว้ที่เดียว และเปิดให้ทุกคนช่วยเติม</p></header>
      <div class="about-grid">
        <section>
          <span class="label">กระบวนการจัดการความรู้ 5 ขั้น กับส่วนต่าง ๆ ของเว็บ</span>
          <table class="km-table"><thead><tr><th scope="col">ขั้น</th><th scope="col">ทำอะไร</th><th scope="col">ดูในเว็บ</th></tr></thead>
            <tbody>${steps.map(([s, d, links]) => `<tr><td>${s}</td><td>${d}</td><td>${links.map(([t, h]) => `<a href="${h}">${t}</a>`).join("<br>")}</td></tr>`).join("")}</tbody></table>
          <p class="muted" style="font-size:14.5px;margin-top:14px">กลยุทธ์แบบผสม: เก็บความรู้ลงคลังเป็นหลัก (codification) และพาคนมาใหม่ไปเรียนจากผู้ดูแลเดิมโดยตรงเป็นส่วนเสริม (personalization) เพราะความรู้โดยนัยบางส่วนเขียนออกมาไม่ได้ครบ</p>
        </section>
        <section>
          <span class="label">ใครดูแลอะไร</span>
          <ul class="roles">${(CFG.ROLES || []).map((r) => `<li><b>${esc(r.role)}</b><span>${esc(r.who)}</span><span>${esc(r.duty)}</span></li>`).join("")}
            ${keepers.length ? `<li><b>ผู้ดูแลแมวตามข้อมูลในชีต</b><span>${esc(keepers.join(", "))}</span></li>` : ""}</ul>
          <span class="label" style="margin-top:26px">ขอบคุณผู้ให้ความรู้</span>
          <p>${esc((CFG.CREDITS_KNOWLEDGE_HOLDERS || []).join(", "))}</p>
          <span class="label" style="margin-top:20px">ผู้จัดทำ</span>
          <p>${esc((CFG.CREDITS_TEAM || []).join(", "))}<br><span class="muted">${esc(CFG.COURSE || "")}</span></p>
          <span class="label" style="margin-top:20px">สถานะข้อมูล</span>
          <ul class="data-status">${st("ข้อมูลแมว", D.samples.cats)}${st("คลังความรู้", D.samples.articles)}${st("ประวัติการดูแล", D.samples.history)}
            <li><span>รูปแมว</span><span>${window.CAT_PHOTO_SYNCED ? "ซิงก์จาก Drive " + thDate(window.CAT_PHOTO_SYNCED) : "ยังไม่ได้ซิงก์"}</span></li>
            <li><span>ระบบรับเรื่อง</span><span class="${norm(CFG.SUBMIT_URL) ? "" : "flag-warn"}">${norm(CFG.SUBMIT_URL) ? "เปิดใช้งาน" : "ยังไม่เปิด"}</span></li></ul>
        </section>
      </div>`;
  }

  /* ---------------- family graph ---------------- */
  let network = null;
  function renderFamily(focusId) {
    app.innerHTML = `
      <header class="page-head"><span class="eyebrow">ผังครอบครัว</span><h1>ใครเป็นพี่น้องกับใคร</h1>
        <p class="lede">เส้นประเชื่อมแมวที่เป็นพี่น้องกัน ลูกศรชี้จากแม่ไปหาลูก แตะที่แมวเพื่อเปิดหน้าของแมวตัวนั้น</p></header>
      <div id="graph" role="img" aria-label="ผังความสัมพันธ์ของแมว"></div>
      <section class="sec"><span class="label">ยังไม่มีข้อมูลครอบครัว</span><div class="mini-cats" id="noFamily"></div>
        <p class="muted" style="margin-top:12px">รู้ว่าแมวตัวไหนเป็นพี่น้องหรือแม่ลูกกัน? <a href="${shareHref("story")}">บอกทีม</a></p></section>`;
    const related = new Set();
    D.cats.forEach((c) => {
      if (c.mother && D.byId[c.mother]) { related.add(c.id); related.add(c.mother); }
      (c.siblings || []).forEach((o) => { if (D.byId[o]) { related.add(c.id); related.add(o); } });
    });
    document.getElementById("noFamily").innerHTML = D.cats.filter((c) => !related.has(c.id)).sort(byStatusThenName).map(miniCat).join("");
    if (!window.vis) { document.getElementById("graph").innerHTML = `<p class="empty">โหลดตัวแสดงผังไม่ได้ (ต้องต่ออินเทอร์เน็ต)</p>`; return; }
    if (!related.size) { document.getElementById("graph").innerHTML = `<p class="empty">ยังไม่มีข้อมูลความสัมพันธ์ระหว่างแมว</p>`; return; }
    const nodes = D.cats.filter((c) => related.has(c.id)).map((c) => {
      const fill = (DRAW[c.coat] || DRAW.unknown)[0];
      const base = { id: c.id, label: c.name, font: { color: "#1f1d1a", face: "Google Sans", size: 16 }, borderWidth: 3, color: { border: "#1f1d1a", background: fill, highlight: { border: "#c2416f", background: fill } } };
      return c.photo ? Object.assign(base, { shape: "circularImage", image: c.photo, size: 30 }) : Object.assign(base, { shape: "dot", size: 20 });
    });
    const edges = D.cats.filter((c) => c.mother && D.byId[c.mother]).map((c) => ({ from: c.mother, to: c.id, arrows: "to" }));
    const seen = new Set();
    D.cats.forEach((c) => (c.siblings || []).forEach((o) => {
      const k = [c.id, o].sort().join("|");
      if (D.byId[o] && !seen.has(k)) { seen.add(k); edges.push({ from: c.id, to: o, dashes: true, color: "#c2416f" }); }
    }));
    if (network) { network.destroy(); network = null; }
    const hasTree = edges.some((e) => e.arrows);
    network = new vis.Network(document.getElementById("graph"), { nodes: new vis.DataSet(nodes), edges: new vis.DataSet(edges) }, hasTree ? {
      layout: { hierarchical: { enabled: true, direction: "UD", sortMethod: "directed", levelSeparation: 110, nodeSpacing: 120 } },
      physics: false, edges: { color: "#675f54", smooth: { type: "cubicBezier", forceDirection: "vertical" } }, interaction: { hover: true }
    } : {
      layout: { randomSeed: 7 },
      physics: { solver: "forceAtlas2Based", forceAtlas2Based: { gravitationalConstant: -180, springLength: 110, avoidOverlap: 1 }, stabilization: { iterations: 400 } },
      edges: { width: 2, smooth: false }, interaction: { hover: true }
    });
    network.once("stabilizationIterationsDone", () => { network.setOptions({ physics: false }); network.fit({ animation: false }); });
    network.on("click", (p) => { if (p.nodes && p.nodes.length) location.hash = `#/cat/${enc(p.nodes[0])}`; });
    const f = lower(focusId);
    if (f && D.byId[f]) network.once("afterDrawing", () => { network.selectNodes([f]); network.focus(f, { scale: 1.3, animation: { duration: 400 } }); });
  }

  /* ---------------- QR sheet ---------------- */
  function renderQR() {
    const u = norm(CFG.SITE_URL);
    const base = u ? (u.endsWith("/") ? u : u + "/") + "cats.html" : location.href.split("#")[0];
    const isLocal = !u && location.protocol === "file:";
    const list = D.cats.filter((c) => SEEN_NOW(c) || c.status === "missing").sort(byStatusThenName);
    app.innerHTML = `
      <div class="no-print"><header class="page-head"><span class="eyebrow">พิมพ์</span><h1>QR ประจำตัวแมว</h1>
        <p class="lede">ติดไว้ตรงจุดที่แมวอยู่ประจำ สแกนแล้วเปิดหน้าของแมวตัวนั้น ขออนุญาตคณะก่อนติดประกาศ</p></header>
        ${isLocal ? `<p class="callout danger">ตอนนี้เปิดไฟล์จากเครื่อง QR จะใช้ในมือถือไม่ได้ ใส่ <code>SITE_URL</code> ใน config.js ก่อนพิมพ์</p>` : ""}
        <p><button class="btn" type="button" id="printBtn">พิมพ์</button></p></div>
      <div class="qr-grid">${list.map((c) => `<div class="qr-card"><svg class="brand-mark" aria-hidden="true"><use href="#mark"/></svg><div class="qr-name">${esc(c.name)}</div><div class="qr" data-url="${esc(base + "#/cat/" + enc(c.id))}"></div><div class="qr-hint">สแกนเพื่อรู้จักฉัน · ${esc(TITLE)}</div></div>`).join("")}</div>`;
    document.getElementById("printBtn").addEventListener("click", () => window.print());
    if (!window.QRCode) return;
    app.querySelectorAll(".qr").forEach((el) => new QRCode(el, { text: el.getAttribute("data-url"), width: 150, height: 150, correctLevel: QRCode.CorrectLevel.M }));
  }

  /* ---------------- router ---------------- */
  const NAV_OF = { "": "", cats: "cats", cat: "cats", family: "cats", find: "find", start: "start", knowledge: "knowledge", article: "knowledge", share: "share", report: "share", help: "help" };
  function route() {
    const raw = location.hash.replace(/^#\/?/, "");
    const qi = raw.indexOf("?");
    const path = qi < 0 ? raw : raw.slice(0, qi);
    const q = new URLSearchParams(qi < 0 ? "" : raw.slice(qi + 1));
    const slash = path.indexOf("/");
    const page = slash < 0 ? path : path.slice(0, slash);
    let arg = slash < 0 ? "" : path.slice(slash + 1);
    try { arg = decodeURIComponent(arg); } catch (e) { /* keep raw */ }
    document.title = TITLE;
    const navPage = NAV_OF[page] ?? "__";
    document.querySelectorAll("#nav a").forEach((a) => {
      const on = a.dataset.page === navPage;
      a.classList.toggle("active", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    if (page !== "family" && network) { network.destroy(); network = null; }
    if (page !== "search" && document.activeElement !== searchInput) searchInput.value = "";
    switch (page) {
      case "": renderHome(); break;
      case "cats": renderCats(q); break;
      case "find": renderFind(q); break;
      case "start": renderStart(); break;
      case "cat": renderCat(arg); break;
      case "family": renderFamily(arg); break;
      case "knowledge": renderKnowledge(arg); break;
      case "article": renderArticle(arg); break;
      case "search": renderSearch(arg); break;
      case "share": renderShare(q); break;
      case "report": renderShare(new URLSearchParams("type=sighting")); break;
      case "help": renderHelp(); break;
      case "about": renderAbout(); break;
      case "qr": renderQR(); break;
      default: app.innerHTML = `<p class="empty">ไม่พบหน้านี้ <a href="#/">กลับหน้าแรกของคลัง</a></p>`;
    }
    if (page !== "search") { window.scrollTo(0, 0); if (route.navigated) app.focus({ preventScroll: true }); }
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
    wireSearch();
    D = await window.CatData.load(CFG);
    const msgs = [];
    if (D.samples.cats) msgs.push("กำลังแสดงสำเนาข้อมูลแมวที่บันทึกไว้ในเว็บ เพราะโหลดชีตล่าสุดไม่สำเร็จ");
    else if (D.error) msgs.push(D.error);
    if (msgs.length) { banner.textContent = msgs.join(" · "); banner.hidden = false; }
    const meta = document.getElementById("footMeta");
    if (meta) meta.textContent = [`ข้อมูลแมว ${D.cats.length} ตัวจากชีตของทีม${D.samples.cats ? " (สำเนา)" : ""} · อ่านเมื่อ ${TH_TIME.format(D.loadedAt)} น.`, window.CAT_PHOTO_SYNCED ? "รูปอัปเดต " + TH_DATE.format(new Date(window.CAT_PHOTO_SYNCED)) : "", CFG.COURSE || ""].filter(Boolean).join(" · ");
    window.addEventListener("hashchange", route);
    route();
  }

  init();
})();
