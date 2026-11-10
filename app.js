/* คลังความรู้แมวอักษร (Aksorn Cat Knowledge Hub) — the hub (cats.html).
   Built around the newcomer's tasks from Chapter 2: find a cat you saw (2.5.1), learn what is normal for it (2.1.1),
   start caring step by step (SECI internalization/socialization), and share what you know with review (2.4.1).
   Thai and English: every UI string goes through L("ไทย", "English"); sheet text goes through T() (see i18n.js).
   Routes: #/  #/cats?coat=&area=&status=&touch=  #/find?coat=&area=  #/start  #/cat/:id  #/graph[/:id] (#/family = old name)  #/live
           #/knowledge[/:category]  #/article/:id  #/search/:q  #/share?type=&cat=&ctx=  #/help  #/ask  #/quiz  #/handover  #/about  #/qr */
(function () {
  "use strict";

  const CFG = window.SITE_CONFIG || {};
  const { STATUS, CATEGORIES, HISTORY_TYPES, HISTORY_EN, COATS, AREAS, norm, lower, esc } = window.CatData;
  const I = window.I18N;
  const X = window.CONTENT_EN || { names: {}, text: {}, articles: {} };
  const app = document.getElementById("app");
  const banner = document.getElementById("banner");
  const searchInput = document.getElementById("searchInput");
  const enc = encodeURIComponent;
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

  let D = { cats: [], byId: {}, articles: [], articleById: {}, history: [], samples: {}, error: "" };

  /* ---------------- language helpers ---------------- */
  const L = (th, en) => I.L(th, en);
  const isEN = () => I.lang === "en";
  const TITLE = () => L(CFG.SITE_TITLE || "คลังความรู้แมวอักษร", CFG.SITE_TITLE_EN || "Aksorn Cat Knowledge Hub");
  const lbl = (o) => (o ? (isEN() && o.en) || o.label : "");
  const en = (o, k) => (isEN() && o && o.en && o.en[k]) || (o ? o[k] : "");
  // sheet text → escaped HTML in the current language; still-Thai text is marked lang="th" for screen readers
  function T(s) {
    s = norm(s);
    if (!s) return "";
    return I.untranslated(s) ? `<span lang="th">${esc(s)}</span>` : esc(I.tx(s));
  }
  const Tp = (s) => I.tx(norm(s));
  const nm = (c) => (isEN() && I.nameEn(c.name)) || c.name;
  // name as HTML: in English the Thai name stays beside it (it is what is written on the collar tags)
  function nmHtml(c, terms) {
    const e = isEN() && I.nameEn(c.name);
    return e ? `${highlight(e, terms || [])} <span class="th-name" lang="th">${highlight(c.name, terms || [])}</span>` : highlight(c.name, terms || []);
  }

  const STERIL = () => ({ yes: L("ทำหมันแล้ว", "Spayed / neutered"), no: L("ยังไม่ทำหมัน", "Not spayed / neutered"), unknown: L("ไม่ทราบเรื่องทำหมัน", "Spay / neuter unknown") });
  const VACC = () => ({ yes: L("ฉีดวัคซีนแล้ว", "Vaccinated"), no: L("ยังไม่ฉีดวัคซีน", "Not vaccinated"), unknown: L("ไม่ทราบเรื่องวัคซีน", "Vaccines unknown") });
  const SEX = () => ({ male: L("ตัวผู้", "Male"), female: L("ตัวเมีย", "Female"), unknown: "" });
  const STATUS_ORDER = { active: 0, commuter: 1, missing: 2, unknown: 3, adopted: 4, passed: 5 };
  const SEEN_NOW = (c) => c.status === "active" || c.status === "commuter";

  /* ---------------- helpers ---------------- */
  function fmtDate(iso) {
    const m = norm(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return esc(iso);
    return new Intl.DateTimeFormat(I.locale(), { day: "numeric", month: "short", year: "numeric" }).format(new Date(+m[1], +m[2] - 1, +m[3]));
  }
  const fmtTime = (d) => new Intl.DateTimeFormat(I.locale(), { hour: "2-digit", minute: "2-digit" }).format(d) + (isEN() ? "" : " น.");
  // a faculty cat (highlighted yellow in the team's sheet) reads "แมวประจำคณะ"; other active cats "อยู่ในคณะ"
  const statusLbl = (c) => (c.resident ? L("แมวประจำคณะ", "Faculty cat") : lbl(STATUS[c.status]));
  const statusDot = (c) => `<span class="dot ${STATUS[c.status].cls}${c.resident ? " home" : ""}">${statusLbl(c)}</span>`;
  const catHref = (c) => `#/cat/${enc(c.id)}`;
  const shareHref = (type, c, extra) => `#/share?type=${type}${c ? "&cat=" + enc(c.id) : ""}${extra || ""}`;
  const childrenOf = (id) => D.cats.filter((c) => c.mother === id);
  const siblingsOf = (c) => D.cats.filter((x) => x.id !== c.id && ((c.mother && x.mother === c.mother) || (c.siblings || []).includes(x.id)));
  const articlesFor = (id) => D.articles.filter((a) => a.relatedCats.includes(id));
  const historyFor = (id) => D.history.filter((h) => h.cat === id);
  const coatLabel = (c) => (has(COATS, c.coat) ? lbl(COATS[c.coat]) : "");
  // the buildings that have a pin on the landing page's 3D map (landing.js SPOT_XZ)
  const MAP_PINNED = ["brk", "mcs", "tewalai"].concat(Object.keys((window.SITE_CONFIG || {}).MAP_SPOTS || {}).filter((k) => (window.SITE_CONFIG.MAP_SPOTS || {})[k]));
  const mapSpot = (c) => c.areas.find((a) => MAP_PINNED.includes(a)) || "";
  const placeHtml = (c) => (c.locations[0] ? T(c.locations[0]) : c.areas[0] ? esc(lbl(AREAS[c.areas[0]])) : "");
  const byStatusThenName = (a, b) => (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) || ((b.resident ? 1 : 0) - (a.resident ? 1 : 0)) || nm(a).localeCompare(nm(b), I.locale());
  const shortArea = (k) => (isEN() ? AREAS[k].shortEn || AREAS[k].en : AREAS[k].short || AREAS[k].label);

  /* small fixes for raw sheet text (Thai only; English goes through the translation table) */
  // "10 กว่า" → "10 กว่าปี", "4" → "4 ปี"
  const ageText = (a) => (isEN() || !a || /(ปี|เดือน|ขวบ|สัปดาห์)/.test(a) ? T(a) : /กว่า$/.test(a) ? esc(a) + "ปี" : /^[\d.]+$/.test(a) ? esc(a) + " ปี" : T(a));
  // the first mention of a building code gets its Thai name, for newcomers who don't know "BRK"
  const BLD = { BRK: "อาคารบรมราชกุมารี", MCS: "อาคารมหาจักรีสิรินธร" };
  const expandBuildings = (html) => { if (isEN()) return html; const seen = {}; return html.replace(/\b(BRK|MCS)\b(?!\s*\()/g, (m) => (seen[m] ? m : ((seen[m] = 1), `${m} (${BLD[m]})`))); };
  // a one-word health note ("ไต") reads as a fragment; say what it is and where it comes from
  const healthText = (h) => (!isEN() && h && h.length <= 8 && !/\s/.test(h) ? esc(`เรื่อง${h} (ตามข้อมูลในชีต)`) : T(h));
  const looksLikeDate = (v) => /^\d{4}-\d{2}-\d{2}/.test(v) || /^\d{1,2}\s*[/.-]\s*\d{1,2}([/.-]\d{2,4})?$/.test(v);
  const daysAgo = (iso) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 864e5));
  const lastSighting = (c) => { const h = D.history.find((x) => x.cat === c.id && x.type === "sighting"); const a = h ? h.date : "", b = feedSeen(c); return b > a ? b : a; };

  // freshness: when the data was last checked, and whether that was too long ago (REVIEW_EVERY_DAYS in config.js).
  // A site nobody looks after should say so, not quietly show old facts as current.
  const REVIEW_DAYS = +CFG.REVIEW_EVERY_DAYS || 120, UNSEEN_DAYS = +CFG.NOT_SEEN_DAYS || 60;
  const isoDate = (v) => { const m = norm(v).match(/^\d{4}-\d{2}-\d{2}/); return m ? m[0] : ""; };
  const checkedOn = (c) => isoDate(c && c.checked) || isoDate(CFG.DATA_CHECKED);
  const stale = (iso) => !!iso && daysAgo(iso) > REVIEW_DAYS;
  const reviewState = (a) => (!a.reviewedBy ? "pending" : stale(isoDate(a.reviewedOn)) ? "due" : "ok");

  // keepers: until they agree to be named, a role and where to find them stand in for the name (KEEPER_ROLES in config.js)
  const oneSpace = (v) => norm(v).replace(/\s+/g, " ");
  function keeperRole(text) {
    const m = CFG.KEEPER_ROLES || {};
    const k = Object.keys(m).find((x) => oneSpace(x) === oneSpace(text));
    return k ? m[k] : null;
  }
  function keeperHtml(text) {
    if (!text) return "";
    const r = keeperRole(text);
    const where = r && r.where ? `<small class="where">${L("หาได้ที่", "Find them at")} ${esc(en(r, "where"))}</small>` : "";
    if (CFG.SHOW_KEEPER_NAMES) return T(text) + (r ? ` · ${esc(en(r, "role"))}` : "") + where;
    return r ? esc(en(r, "role")) + where : L("มีผู้ดูแลหลัก ติดต่อผ่านทีม", "Has a main keeper; ask through the team");
  }

  /* toast + quick posts (one-tap "seen today", article feedback) */
  function toast(html) {
    let t = document.getElementById("toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; t.setAttribute("role", "status"); t.setAttribute("aria-live", "polite"); document.body.appendChild(t); }
    t.innerHTML = html; t.classList.add("on");
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("on"), 4200);
  }
  async function postQuick(fields) {
    if (!norm(CFG.SUBMIT_URL)) return false;
    const body = new URLSearchParams(Object.assign({ consent: "no", page: location.href, lang: I.lang, website: "" }, fields));
    try { await fetch(CFG.SUBMIT_URL, { method: "POST", mode: "no-cors", body }); return true; } catch (e) { return false; }
  }
  // links shared out should open the public site, not a local copy
  const publicUrl = (hash) => { const u = norm(CFG.SITE_URL); return (u ? (u.endsWith("/") ? u : u + "/") + "cats.html" : location.href.split("#")[0]) + (hash || ""); };
  const shareBtn = () => `<button type="button" class="btn ghost share-btn" data-share>${ICON.share}<span>${L("แชร์", "Share")}</span></button>`;
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode: progress just is not kept */ } }
  };
  const session = {
    get(k) { try { return JSON.parse(sessionStorage.getItem(k) || "null"); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* not kept */ } }
  };
  const START_KEY = "akc-start-v1", MET_KEY = "akc-met-v1";
  const metMap = () => store.get(MET_KEY, {});

  // the list a visitor came from (filtered cats, find results, search), so a profile can lead back and step through it
  function rememberList(ids, th, enLabel) { session.set("akc-list", { hash: location.hash, ids, th, en: enLabel }); }

  // load a library only on the page that needs it (family graph, QR sheet)
  const libs = {};
  function loadScript(src) {
    if (!libs[src]) libs[src] = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src; s.async = true; s.crossOrigin = "anonymous";
      s.onload = resolve; s.onerror = () => { delete libs[src]; reject(new Error("failed to load " + src)); };
      document.head.appendChild(s);
    });
    return libs[src];
  }
  const VIS_JS = "https://unpkg.com/vis-network@9.1.9/standalone/umd/vis-network.min.js";
  const QR_JS = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
  let renderToken = 0;

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
    return `<svg viewBox="0 0 200 250" preserveAspectRatio="xMidYMax meet" role="img" aria-label="${esc(L("ภาพวาดแทนรูปของ " + c.name, "Drawing in place of a photo of " + nm(c)))}">
      <defs><clipPath id="${id}"><path d="${body}"/><ellipse cx="100" cy="110" rx="38" ry="33"/></clipPath></defs>
      <ellipse cx="100" cy="232" rx="64" ry="7" fill="rgba(31,29,26,.12)"/>
      <path d="M138 222 C176 218 184 186 168 164" stroke="${fill}" stroke-width="12" stroke-linecap="round" fill="none"/>
      <path d="${body}" fill="${fill}"/><ellipse cx="100" cy="110" rx="38" ry="33" fill="${fill}"/>
      <path d="M66 96 L70 60 L92 82 Z M134 96 L130 60 L108 82 Z" fill="${fill}"/>${extra}
      <g stroke="#16181d" stroke-width="1.2"><circle cx="86" cy="110" r="6" fill="#fff"/><circle cx="114" cy="110" r="6" fill="#fff"/></g><circle cx="87.5" cy="111" r="2.6" fill="#16181d"/><circle cx="115.5" cy="111" r="2.6" fill="#16181d"/>
    </svg>`;
  }
  const photoAlt = (c) => esc(L("รูปของ" + c.name, "Photo of " + nm(c)));
  function portrait(c, note, large) {
    if (c.photo) {
      return large
        ? `<div class="portrait"><img id="profilePhoto" src="${esc(c.photoLarge || c.photo)}" alt="${photoAlt(c)}" width="900" height="1125" fetchpriority="high" decoding="async"></div>`
        : `<div class="portrait"><img src="${esc(c.photo)}"${c.photoThumb ? ` srcset="${esc(c.photoThumb)} 240w, ${esc(c.photo)} 480w" sizes="(max-width: 640px) 45vw, 230px"` : ""} alt="${photoAlt(c)}" width="400" height="500" loading="lazy" decoding="async"></div>`;
    }
    return `<div class="portrait">${silhouette(c)}${note ? `<span class="ph-note">${L("ยังไม่มีรูป", "No photo yet")}</span>` : ""}</div>`;
  }
  const CHECK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7"/></svg>';
  const metBadge = (c, met) => (met[c.id] ? `<span class="met-badge">${CHECK}${L("รู้จักแล้ว", "Known")}</span>` : "");
  const miniCat = (c) => `<a class="mini" href="${catHref(c)}">${portrait(c)}<span>${nmHtml(c)}</span></a>`;
  function catCard(c, terms, why, met) {
    const meta = [statusDot(c)];
    const place = placeHtml(c);
    if (place) meta.push(`<span>${terms && terms.length ? highlight(Tp(c.locations[0] || ""), terms) || place : place}</span>`);
    const fs = feedSeen(c);
    if (fs && daysAgo(fs) <= 3) meta.push(`<span class="seen-chip">${L("เห็น ", "Seen ")}${relTime(fs)}</span>`);
    return `<a class="cat${c.status === "passed" ? " past" : ""}" href="${catHref(c)}">
      ${portrait(c, true)}${metBadge(c, met || {})}
      <div class="cat-name">${nmHtml(c, terms)}</div>
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
  // an article in the current language; th: true means English was asked for but there is no translation yet
  function art(a) {
    const e = isEN() && X.articles && X.articles[a.id];
    if (!e) return Object.assign({}, a, { th: isEN() });
    return Object.assign({}, a, {
      title: e.title || a.title, summary: e.summary || a.summary, body: e.body || a.body,
      tags: e.tags ? e.tags.split(/\s*,\s*/).filter(Boolean) : a.tags, author: e.author || a.author, source: e.source || a.source, th: false
    });
  }
  const langAttr = (x) => (x.th ? ' lang="th"' : "");

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
  // searches both languages, so "nu dam" and "หนูดำ" find the same cat
  function searchAll(q) {
    q = lower(q);
    const terms = q.split(/\s+/).filter(Boolean);
    if (!terms.length) return { cats: [], articles: [], terms };
    const both = (s) => { const t = X.text && X.text[norm(s).replace(/\s+/g, " ")]; return t ? s + " " + t : s; };
    const cats = D.cats.map((c) => ({ c, s: score([
      [c.name, 10], [X.names && X.names[c.name], 10], [c.nicknames.join(" "), 8],
      [has(COATS, c.coat) ? COATS[c.coat].label + " " + COATS[c.coat].en : "", 4],
      [c.locations.map(both).join(" "), 3], [c.areas.map((a) => AREAS[a].label + " " + AREAS[a].en).join(" "), 2],
      [both(c.marks), 3], [both(c.about), 2], [both(c.personality), 2], [both(c.health), 2], [c.normal, 2], [both(c.notes), 1], [c.interview.map(both).join(" "), 1]
    ], terms, q) })).filter((r) => r.s).sort((a, b) => b.s - a.s).map((r) => r.c);
    const articles = D.articles.map((a) => {
      const e = (X.articles && X.articles[a.id]) || {};
      return { a, s: score([[a.title + " " + (e.title || ""), 10], [a.tags.join(" ") + " " + (e.tags || ""), 6], [CATEGORIES[a.category].label + " " + CATEGORIES[a.category].en, 5], [a.summary + " " + (e.summary || ""), 3], [a.body + " " + (e.body || ""), 1]], terms, q) };
    }).filter((r) => r.s).sort((a, b) => b.s - a.s).map((r) => r.a);
    return { cats, articles, terms };
  }

  function articleRow(raw, terms) {
    const a = art(raw);
    return `<li><a class="article-row" href="#/article/${enc(a.id)}">
      <span class="a-cat">${lbl(CATEGORIES[a.category])}</span>
      <div${langAttr(a)}><h3>${highlight(a.title, terms)}</h3>${a.summary ? `<p>${highlight(a.summary, terms)}</p>` : ""}
      <span class="a-meta">${[esc(a.source || a.author), a.date ? fmtDate(a.date) : "", a.reviewedBy ? L("ตรวจทานโดย ", "Reviewed by ") + esc(a.reviewedBy) + (isoDate(a.reviewedOn) ? L(" เมื่อ ", " on ") + fmtDate(a.reviewedOn) : "") : ""].filter(Boolean).join(" · ")}</span></div>
    </a></li>`;
  }

  const ICON = {
    cats: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20c0-4 2.5-7 7-7s7 3 7 7"/><path d="M7.5 9.5 8 4l3 3h2l3-3 .5 5.5"/><circle cx="12" cy="10" r="4.2"/></svg>',
    book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/></svg>',
    family: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="2.5"/><circle cx="5.5" cy="18" r="2.5"/><circle cx="18.5" cy="18" r="2.5"/><path d="M12 7.5v4M5.5 15.5v-4h13v4"/></svg>',
    share: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/></svg>',
    map: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z"/><circle cx="12" cy="10" r="2.3"/></svg>',
    find: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/><path d="M8 9.5l1-2 1.2 1.6 1.3-1.6 1 2"/></svg>',
    start: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V4"/><path d="M5 4h11l-2 4 2 4H5"/></svg>',
    help: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/><path d="M12 9v5M9.5 11.5h5"/></svg>',
    feeding: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h18a9 7 0 0 1-18 0z"/><path d="M8.5 8.5c0-1.4 1-1.8 1-3.2M12 8.5c0-1.4 1-1.8 1-3.2M15.5 8.5c0-1.4 1-1.8 1-3.2"/></svg>',
    behavior: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5.5" cy="10.5" r="1.8"/><circle cx="9.5" cy="5.8" r="1.8"/><circle cx="14.5" cy="5.8" r="1.8"/><circle cx="18.5" cy="10.5" r="1.8"/><path d="M12 12.2c-3 0-5.4 3.4-5.4 5.8 0 1.6 1.3 2.4 2.8 2.1 1-.2 1.7-.7 2.6-.7s1.6.5 2.6.7c1.5.3 2.8-.5 2.8-2.1 0-2.4-2.4-5.8-5.4-5.8z"/></svg>',
    hygiene: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3s-6 6.4-6 11a6 6 0 0 0 12 0c0-4.6-6-11-6-11z"/><path d="M9.3 14.5a2.7 2.7 0 0 0 2.7 2.7"/></svg>',
    experience: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/><path d="M9.5 8.8c-1 .5-1.6 1.4-1.6 2.7M14 8.8c-1 .5-1.6 1.4-1.6 2.7"/></svg>'
  };
  ICON.health = ICON.help;

  /* ---------------- knowledge helpers (library page and the hub's front page) ---------------- */
  // questions people actually ask, each answered by one article (shown only if that article exists)
  const ASKS = [
    ["a01", "ให้นมแมวได้ไหม", "Can cats have milk?"],
    ["a04", "แมวแบบไหนเข้าใกล้ได้", "Which cats can I go near?"],
    ["a02", "ดูยังไงว่าแมวไม่สบาย", "How can I tell a cat is unwell?"],
    ["a03", "ทำไมต้องทำหมัน", "Why spay the cats?"],
    ["a09", "ผู้ดูแลจำแมวแต่ละตัวยังไง", "How do keepers tell them apart?"],
    ["a08", "ไม่เห็นหนูดำหลายวัน", "Haven't seen Nu Dam for days"]
  ];
  const asksHtml = () => { const list = ASKS.filter(([id]) => D.articleById[id]); return `<ul class="asks asks-c">${list.map(([id, th, enT]) => `<li><a href="#/article/${id}">${L(th, enT)}</a></li>`).join("")}</ul>${list.length > 3 ? `<button type="button" class="linkbtn asks-more" aria-expanded="false">${L("ดูคำถามอื่น", "More questions")}</button>` : ""}`; };
  // words keepers use that a newcomer may not know; each points to where it is explained
  const GLOSSARY = [
    { t: "แมวประจำคณะ", en: "Faculty cats", href: "#/cats?status=resident",
      d: "แมวที่คณบดีและอาจารย์อนุญาตให้เลี้ยงไว้ที่คณะ อยู่ที่นี่เป็นหลัก ในชีตของทีมคือชื่อที่ไฮไลต์สีเหลือง", dEn: "Cats the dean and lecturers have agreed can live at the faculty for good. In the team's sheet, the names highlighted yellow" },
    { t: "แมวไปกลับ", en: "Commuter cat", href: "#/cats?status=commuter",
      d: "แมวที่มีบ้านอยู่แล้ว แต่แวะมาที่คณะบ้างไม่มาบ้าง", dEn: "A cat with a home elsewhere that drops by the faculty now and then" },
    { t: "ผู้ดูแลหลัก", en: "Main keeper", href: "#/article/a01",
      d: "คนที่ดูแลแมวตัวนั้นเป็นประจำ ก่อนให้อาหารควรถามเขาก่อนว่าวันนี้ให้ไปแล้วหรือยัง", dEn: "The person who looks after that cat day to day. Ask them before feeding whether it has eaten already" },
    { t: "ทำหมัน", en: "Spaying / neutering", href: "#/article/a03",
      d: "ช่วยคุมจำนวนแมวในคณะ และทำให้แมวสู้กันน้อยลง ต้องประสานกับผู้ดูแลและสัตวแพทย์ อย่าพาแมวไปเอง", dEn: "Keeps the number of cats in check and means fewer fights. Arranged with the keepers and a vet; never take a cat yourself" },
    { t: "ตัดปลายหู", en: "Ear tip", href: "#/article/a03",
      d: "สัญลักษณ์ที่หลายโครงการใช้บอกว่าแมวทำหมันแล้ว แต่ไม่ใช่ทุกตัว ให้ดูในประวัติแมวเป็นหลัก", dEn: "A mark many programmes use to show a cat is spayed, but not every cat has one. Check the cat's profile instead" },
    { t: "กะพริบตาช้า ๆ", en: "Slow blink", href: "#/article/a04",
      d: "ถ้าแมวกะพริบตาช้า ๆ ใส่ แปลว่ากำลังเปิดรับ เป็นสัญญาณดีก่อนเข้าหา", dEn: "A cat that blinks slowly at you is relaxed and open to you: a good sign before you approach" }
  ];
  const glossary = () => GLOSSARY.filter((g) => !/^#\/article\//.test(g.href) || D.articleById[g.href.split("/").pop()]);
  const glossHtml = (list) => `<dl class="gloss">${list.map((g) => `<div><dt>${L(g.t, g.en)}${isEN() ? ` <span lang="th">${g.t}</span>` : ""}</dt><dd>${L(g.d, g.dEn)} <a href="${g.href}">${L("อ่านต่อ", "More")}<span class="sr"> ${L(g.t, g.en)}</span> →</a></dd></div>`).join("")}</dl>`;
  const readMin = (a) => Math.max(1, Math.round(norm(a.body || "").length / 450));
  function articleCard(raw, terms) {
    const a = art(raw);
    const meta = [L(`อ่าน ${readMin(a)} นาที`, `${readMin(a)} min read`), a.source ? esc(a.source) : ""].filter(Boolean).join(" · ");
    return `<li><a class="a-card" href="#/article/${enc(a.id)}">
      <span class="a-top"><span class="a-ico">${ICON[a.category] || ICON.book}</span>${lbl(CATEGORIES[a.category])}</span>
      <h3${langAttr(a)}>${highlight(a.title, terms)}</h3>
      ${a.summary ? `<p${langAttr(a)}>${highlight(a.summary, terms)}</p>` : ""}
      <span class="a-meta">${meta}${{ ok: `<span class="a-ok">${CHECK}${L("ตรวจทานแล้ว", "Reviewed")}</span>`, due: `<span class="a-pending">${L("ถึงเวลาตรวจทานอีกรอบ", "Due for a re-check")}</span>`, pending: `<span class="a-pending">${L("รอผู้ดูแลตรวจทาน", "Awaiting a keeper's review")}</span>` }[reviewState(a)]}</span>
    </a></li>`;
  }
  function topicCards() {
    return `<div class="topics">${Object.keys(CATEGORIES).map((k) => {
      const n = D.articles.filter((a) => a.category === k).length;
      return n ? `<a class="topic${k === "experience" ? " keepers" : ""}" href="#/knowledge/${k}">
        <span class="task-ico">${ICON[k] || ICON.book}</span><b>${lbl(CATEGORIES[k])}</b>
        <span>${esc(L(CATEGORIES[k].desc, CATEGORIES[k].descEn))}</span><span class="n">${L(`${n} เรื่อง`, `${n} article${n > 1 ? "s" : ""}`)} →</span></a>` : "";
    }).join("")}</div>`;
  }
  const SEARCH_SVG = '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5"/><path d="M13 13l4 4"/></svg>';

  /* ---------------- newcomer path (shared by home and #/start) ---------------- */
  function startSteps() {
    const noTouch = D.cats.filter((c) => c.touch === "no" && SEEN_NOW(c)).map(nm);
    const careful = D.cats.filter((c) => c.touch === "careful" && SEEN_NOW(c)).map(nm);
    const nHome = D.cats.filter((c) => c.resident).length, nOther = D.cats.filter((c) => SEEN_NOW(c) && !c.resident).length;
    return [
      { id: "know", seci: "Combination", title: L("จำแมวที่เจอบ่อยให้ได้", "Learn the cats you'll see most"),
        text: nHome
          ? L(`แมวประจำคณะมี ${nHome} ตัว ยังมีอีก ${nOther} ตัวที่เจอในคณะบ้าง เริ่มจากแมวประจำที่อยู่ตึกที่คุณเรียน ลองจำให้ได้สัก 3 ตัว แล้วกด “จำได้แล้ว” ในหน้าแมวแต่ละตัว`,
            `The faculty has ${nHome} cats of its own, and ${nOther} more turn up now and then. Start with the faculty cats in the building where you study and try to learn three. Tap “I know … now” on a cat's page to keep count.`)
          : L(`ตอนนี้เจอแมวในคณะ ${nOther} ตัว เริ่มจากตัวที่อยู่ตึกที่คุณเรียน ลองจำให้ได้สัก 3 ตัว แล้วกด “จำได้แล้ว” ในหน้าแมวแต่ละตัว`,
            `${nOther} cats are around the faculty now. Start with the ones in the building where you study and try to learn three. Tap “I know … now” on a cat's page to keep count.`),
        links: [nHome ? [L("ดูแมวประจำคณะ", "See the faculty cats"), "#/cats?status=resident"] : [L("ดูแมวที่อยู่ในคณะ", "See the cats at the faculty"), "#/cats?status=active"], [L("ลองทายแมวจากรูป", "Try the cat quiz"), "#/quiz"], [L("ผู้ดูแลจำแมวได้ยังไง", "How keepers tell cats apart"), "#/article/a09"]] },
      { id: "touch", seci: "Internalization", title: L("รู้ว่าตัวไหนจับได้ ตัวไหนไม่ควรจับ", "Know which cats you can approach, and which not to touch"),
        text: [
          noTouch.length ? L(`${noTouch.join(", ")}ไม่ชอบให้จับ`, `${noTouch.join(", ")} ${noTouch.length > 1 ? "don't" : "doesn't"} like being touched.`) : "",
          careful.length ? L(`${careful.join(", ")}ต้องเข้าหาอย่างระวัง`, `Approach ${careful.join(", ")} with care.`) : "",
          noTouch.length || careful.length ? L("ที่เหลือส่วนใหญ่เป็นมิตร แต่ดูท่าทางก่อนเข้าหาทุกครั้งดีที่สุด", "Most of the others are friendly, but always read a cat's body language first.")
            : L("ส่วนใหญ่เป็นมิตร แต่ดูท่าทางก่อนเข้าหาทุกครั้งดีที่สุด", "Most are friendly, but always read a cat's body language before approaching.")
        ].filter(Boolean).join(" "),
        links: [careful.length ? [L("แมวที่ต้องเข้าหาอย่างระวัง", "Cats to approach with care"), "#/cats?touch=careful"] : [L("แมวที่ไม่ชอบให้จับ", "Cats who don't like being touched"), "#/cats?touch=no"], [L("อ่านภาษากายแมว", "Reading cat body language"), "#/article/a04"]] },
      { id: "feed", seci: "Internalization", title: L("ให้อาหารแบบที่ผู้ดูแลทำกัน", "Feed the way the keepers do"),
        text: L("ให้ตรงจุดที่ตกลงกันไว้ ถามก่อนว่าวันนี้มีใครให้ไปแล้วหรือยัง แล้วเก็บชามเมื่อแมวกินเสร็จ ไม่มีใครเขียนเป็นกฎ แต่ผู้ดูแลทุกคนก็ทำแบบนี้",
          "Feed at the agreed spots, ask whether someone has already fed them today, and clear the bowls once they've eaten. None of this was ever written down as a rule, but every keeper does it."),
        links: [[L("เรื่องอาหาร", "Feeding"), "#/article/a01"], [L("ดูแลจุดให้อาหารให้สะอาด", "Keeping feeding spots clean"), "#/article/a05"]] },
      { id: "sick", seci: "Internalization", title: L("รู้ว่าเจอแมวป่วยต้องทำยังไง", "Know what to do if a cat is sick"),
        text: L("ดูอาการ ถ่ายรูป จดเวลากับจุดที่เจอ ห้ามให้ยาคนเด็ดขาด แล้วแจ้งผู้ดูแล", "Watch the symptoms, take a photo, note the time and place, never give human medicine, and tell a keeper."),
        links: [[L("เจอแมวป่วย ทำยังไง", "If you find a sick cat"), "#/help"], [L("สัญญาณว่าแมวไม่สบาย", "Signs a cat is unwell"), "#/article/a02"]] },
      { id: "join", seci: "Socialization", title: L("ไปดูแลจริงกับผู้ดูแลรุ่นก่อนสักครั้ง", "Go on a round with an experienced keeper"),
        text: L("บางเรื่องอ่านอย่างเดียวไม่พอ ต้องไปเห็นเอง เช่น จังหวะเข้าหาแมวขี้ระแวง หรือดูยังไงว่าแมวกินน้อยลง ลองขอไปให้อาหารด้วยกันสักรอบ",
          "Some things can't be learned by reading, like the timing for approaching a wary cat, or noticing that a cat is eating less than usual. Ask to join an experienced keeper on a feeding round."),
        links: [[L("ขอนัดไปให้อาหารด้วยกัน", "Ask to join a feeding round"), shareHref("join")], [L("ถามใครดี", "Who to ask"), "#/ask"]] }
    ];
  }

  // หนูดำ, the mascot (symbols in cats.html)
  const cat = (pose, cls) => `<svg class="nd ${cls || ""}" aria-hidden="true" focusable="false"><use href="#nd-${pose}"/></svg>`;
  const pageHead = (title, lede, extra) => `<header class="page-head"><h1>${title}</h1>${lede ? `<p class="lede">${lede}</p>` : ""}${extra || ""}</header>`;

  /* ---------------- all cats with facets ---------------- */
  function renderCats(q) {
    const met = metMap();
    const f = { status: q.get("status") || "", coat: q.get("coat") || "", area: q.get("area") || "", touch: q.get("touch") || "" };
    const n = (pred) => D.cats.filter(pred).length;
    const chip = (key, val, label, count, swatch) => `<button type="button" data-k="${key}" data-v="${val}" aria-pressed="${f[key] === val}">${swatch ? `<span class="swatch" style="background:${swatch}"></span>` : ""}${label}${count != null ? ` <span class="n">${count}</span>` : ""}</button>`;
    const nHome = n((c) => c.resident);
    const statusChips = [chip("status", "", L("ทั้งหมด", "All"), D.cats.length)].concat(nHome ? [chip("status", "resident", L("แมวประจำคณะ", "Faculty cats"), nHome)] : [], Object.keys(STATUS).filter((k) => n((c) => c.status === k)).map((k) => chip("status", k, lbl(STATUS[k]), n((c) => c.status === k))));
    const coatChips = [chip("coat", "", L("ทุกสี", "Any"))].concat(Object.keys(COATS).filter((k) => n((c) => c.coat === k)).map((k) => chip("coat", k, lbl(COATS[k]), n((c) => c.coat === k), COATS[k].swatch)), n((c) => c.coat === "unknown") ? [chip("coat", "unknown", L("ยังไม่ระบุ", "Not recorded"), n((c) => c.coat === "unknown"))] : []);
    const areaChips = [chip("area", "", L("ทุกที่", "Anywhere"))].concat(Object.keys(AREAS).filter((k) => n((c) => c.areas.includes(k))).map((k) => chip("area", k, shortArea(k), n((c) => c.areas.includes(k)))));
    const touchChips = [chip("touch", "", L("ทั้งหมด", "All")), chip("touch", "yes", L("เข้าหาได้", "Friendly"), n((c) => c.touch === "yes")), chip("touch", "careful", L("เข้าหาอย่างระวัง", "Approach with care"), n((c) => c.touch === "careful")), chip("touch", "no", L("ไม่ชอบให้จับ", "Doesn't like touch"), n((c) => c.touch === "no"))];
    app.innerHTML = `
      ${pageHead(L(`แมวทั้งหมด ${D.cats.length} ตัว`, `All ${D.cats.length} cats`), L("กรองตามสีขน จุดที่เจอบ่อย หรือดูว่าตัวไหนเข้าหาได้ ไม่ต้องรู้ชื่อก็หาเจอ", "Filter by coat, by where they usually are, or by whether you can approach them. No name needed."))}
      <details class="facets-wrap" id="facetsWrap"${innerWidth > 640 ? " open" : ""}><summary>${L("ตัวกรอง", "Filters")}<span class="n" id="fCount"></span></summary>
      <div class="facets" role="group" aria-label="${L("ตัวกรอง", "Filters")}">
        <div class="facet"><span>${L("สถานะ", "Status")}</span><div class="chips">${statusChips.join("")}</div></div>
        <div class="facet"><span>${L("สีขน", "Coat")}</span><div class="chips">${coatChips.join("")}</div></div>
        <div class="facet"><span>${L("เจอบ่อยที่", "Usually at")}</span><div class="chips">${areaChips.join("")}</div></div>
        <div class="facet"><span>${L("จับได้ไหม", "Approach?")}</span><div class="chips">${touchChips.join("")}</div></div>
      </div></details>
      <div class="toolbar"><p class="summary" id="catSummary" aria-live="polite"></p><a href="index.html#map">${L("ดูบนแผนที่ 3D", "See them on the 3D map")} →</a></div>
      <div class="cats" id="catGrid"></div>
      <div id="pastWrap"></div>`;
    const draw = () => {
      const list = D.cats.filter((c) => (!f.status || (f.status === "resident" ? c.resident : c.status === f.status)) && (!f.coat || c.coat === f.coat) && (!f.area || c.areas.includes(f.area)) && (!f.touch || c.touch === f.touch)).sort(byStatusThenName);
      const filtered = f.status || f.coat || f.area || f.touch;
      document.getElementById("catSummary").innerHTML = L(`แสดง ${list.length} จาก ${D.cats.length} ตัว`, `Showing ${list.length} of ${D.cats.length}`) + (filtered ? ` · <button type="button" class="linkbtn" id="clearF">${L("ล้างตัวกรอง", "Clear filters")}</button>` : "");
      // cats that have died get their own quiet section at the end, unless the visitor asked for them
      const main = f.status ? list : list.filter((c) => c.status !== "passed"), past = f.status ? [] : list.filter((c) => c.status === "passed");
      document.getElementById("catGrid").innerHTML = main.length ? main.map((c) => catCard(c, null, "", met)).join("") : past.length ? "" : `<div class="empty">${cat("sleep")}<p>${L("ไม่มีแมวที่ตรงกับตัวกรองนี้", "No cats match these filters")}</p></div>`;
      document.getElementById("pastWrap").innerHTML = past.length ? `<section class="sec memorial"><h2 class="label">${L("รำลึก", "In memory")}</h2><p class="muted small">${L("แมวที่เคยอยู่กับคณะ ขอบคุณที่เคยอยู่ด้วยกัน", "Cats who once lived at the faculty. Thank you for the time together.")}</p><div class="cats">${past.map((c) => catCard(c, null, "", met)).join("")}</div></section>` : "";
      const nOn = Object.keys(f).filter((k) => f[k]).length;
      document.getElementById("fCount").textContent = nOn ? ` · ${nOn}` : "";
      const cl = document.getElementById("clearF");
      if (cl) cl.addEventListener("click", () => { Object.keys(f).forEach((k) => { f[k] = ""; }); sync(); });
      rememberList(list.map((c) => c.id), filtered ? "แมวที่กรองไว้" : "แมวทั้งหมด", filtered ? "Filtered cats" : "All cats");
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
    const met = metMap();
    // "any" in the URL = the visitor chose "not sure"; no parameter = nothing chosen yet
    const pick = (k) => (q.has(k) ? (q.get(k) === "any" ? "" : q.get(k)) : null);
    const st = { coat: pick("coat"), area: pick("area") };
    const places = ["brk", "mcs", "tewalai", "store"].filter((k) => has(AREAS, k));
    app.innerHTML = `
      ${pageHead(L("เจอแมว แต่ไม่รู้ว่าชื่ออะไร?", "Met a cat but don't know its name?"),
        L(`พี่ผู้ดูแลบอกว่า <span class="note-hand">“จำแมวจากหน้า”</span> แต่ถ้าเพิ่งมา เริ่มจากสีขนกับจุดที่เจอก่อนก็พอ`,
          `The keepers say <span class="note-hand">“I know them by their faces”</span>. If you're new, the coat and where you saw it are enough to start.`))}
      <div class="finder">
        <section class="step-card"><h2><span class="n" aria-hidden="true">1</span>${L("สีขน", "Coat")}</h2><p>${L("เลือกที่ใกล้เคียงที่สุด ไม่แน่ใจก็ข้ามได้", "Pick the closest. Not sure? Skip it.")}</p>
          <div class="coat-grid">${Object.keys(COATS).map((k) => `<button type="button" data-k="coat" data-v="${k}" aria-pressed="${st.coat === k}"><span class="swatch" style="background:${COATS[k].swatch}"></span>${lbl(COATS[k])}</button>`).join("")}
            <button type="button" data-k="coat" data-v="" aria-pressed="${st.coat === ""}">${L("ไม่แน่ใจ", "Not sure")}</button></div>
        </section>
        <section class="step-card"><h2><span class="n" aria-hidden="true">2</span>${L("เจอที่ไหน", "Where")}</h2><p>${L("หลายตัวมีที่ประจำ บางตัวก็เดินไปทั่วคณะ", "Many have a regular spot; some wander all over.")}</p>
          <div class="area-grid">${places.map((k) => `<button type="button" data-k="area" data-v="${k}" aria-pressed="${st.area === k}">${lbl(AREAS[k])}</button>`).join("")}
            <button type="button" data-k="area" data-v="" aria-pressed="${st.area === ""}">${L("ที่อื่น / ไม่แน่ใจ", "Elsewhere / not sure")}</button></div>
        </section>
        <section class="matches" id="matches" aria-live="polite"></section>
      </div>`;
    const draw = () => {
      const pool = D.cats.filter((c) => c.status !== "passed" && c.status !== "adopted");
      const ranked = pool.map((c) => {
        let s = 0; const why = [];
        if (st.coat) { if (c.coat === st.coat) { s += 3; why.push(L("สีขนตรง", "Coat matches")); } else if (c.coat === "unknown") { why.push(L("ยังไม่มีข้อมูลสีขน", "Coat not recorded")); } else return null; }
        if (st.area) { if (c.areas.includes(st.area)) { s += 2; why.push(L("เจอบ่อยแถวนี้", "Often here")); } else if (c.status === "commuter" || c.areas.includes("roam")) { s += 1; why.push(L("เดินไปทั่ว", "Wanders around")); } }
        if (SEEN_NOW(c)) s += 0.5;
        return { c, s, why: why.join(" · "), known: !st.coat || c.coat !== "unknown" };
      }).filter(Boolean).sort((a, b) => b.s - a.s || byStatusThenName(a.c, b.c));
      const sure = ranked.filter((r) => r.known), maybe = ranked.filter((r) => !r.known);
      const el = document.getElementById("matches");
      if (!st.coat && !st.area) {
        // nothing narrowed yet: everyone who is around now, so the page is useful before any tap
        const here = pool.filter(SEEN_NOW).sort((a, b) => (b.photo ? 1 : 0) - (a.photo ? 1 : 0) || byStatusThenName(a, b));
        el.innerHTML = `<h2>${L(`แมวที่อยู่ในคณะตอนนี้ ${here.length} ตัว`, `The ${here.length} cats around the faculty now`)}</h2>
          <p class="muted">${L("เลือกสีขนหรือจุดที่เจอด้านบน เดี๋ยวช่วยเรียงตัวที่น่าจะใช่ขึ้นมาก่อน", "Pick a coat or a place above and the likely ones move to the top.")}</p>
          <div class="cats">${here.map((c) => catCard(c, [], "", met)).join("")}</div>`;
        rememberList(here.map((c) => c.id), "แมวในคณะ", "Cats at the faculty");
        return;
      }
      const newCat = `<div class="callout"><h3>${L("ไม่ใช่ตัวไหนเลย?", "None of these?")}</h3><p>${L("อาจเป็นแมวที่ยังไม่มีข้อมูล ส่งรูปมาให้ทีมได้เลย จะได้เพิ่มเข้าไป", "It may be a cat that isn't listed yet. Send the team a photo so we can add it.")}</p><a class="btn" href="${shareHref("newcat", null, (st.coat ? "&coat=" + st.coat : "") + (st.area ? "&area=" + st.area : ""))}">${L("แจ้งแมวตัวใหม่", "Report a new cat")}</a></div>`;
      el.innerHTML = `
        <h2>${sure.length ? L(`น่าจะเป็น ${sure.length} ตัวนี้`, `Probably one of these ${sure.length}`) : L("ยังไม่เจอตัวที่ตรง", "No match yet")}</h2>
        <p class="muted">${sure.length ? L("เทียบหน้ากับปลอกคอดูอีกที แล้วกดเข้าไปดูว่าปกติเป็นยังไง", "Compare the face and collar, then open a cat to see what's normal for it.") : L("ลองเปลี่ยนสีขน หรือเลือก “ไม่แน่ใจ”", "Try another coat, or choose “Not sure”.")}</p>
        ${sure.length ? `<div class="cats">${sure.slice(0, 8).map((r) => catCard(r.c, [], r.why, met)).join("")}</div>` : ""}
        ${maybe.length ? `<div class="maybe"><h3>${L("ตัวที่ยังไม่มีข้อมูลสีขน", "Coat not recorded yet")}</h3><div class="mini-cats">${maybe.map((r) => miniCat(r.c)).join("")}</div></div>` : ""}
        ${newCat}`;
      rememberList(sure.slice(0, 8).map((r) => r.c.id), "ผลการหาแมว", "Find results");
    };
    app.querySelectorAll(".finder button[data-k]").forEach((b) => b.addEventListener("click", () => {
      st[b.dataset.k] = b.dataset.v;
      app.querySelectorAll(`.finder button[data-k="${b.dataset.k}"]`).forEach((x) => x.setAttribute("aria-pressed", x === b));
      const p = new URLSearchParams(); if (st.coat !== null) p.set("coat", st.coat || "any"); if (st.area !== null) p.set("area", st.area || "any");
      history.replaceState(null, "", "#/find" + (p.toString() ? "?" + p : ""));
      draw();
    }));
    draw();
  }

  /* ---------------- newcomer path (internalization → socialization) ---------------- */
  function renderStart() {
    const done = store.get(START_KEY, {});
    const steps = startSteps();
    const met = metMap();
    const nNow = D.cats.filter(SEEN_NOW).length, nMet = D.cats.filter((c) => SEEN_NOW(c) && met[c.id]).length;
    const count = () => steps.filter((s) => done[s.id]).length;
    const ptext = () => L(`ทำไปแล้ว ${count()} จาก ${steps.length} เรื่อง · บันทึกไว้ในเครื่องนี้`, `${count()} of ${steps.length} done · saved on this device`);
    app.innerHTML = `
      ${pageHead(L("5 เรื่องก่อนไปดูแลแมว", "Five things before you start"),
        L("นิสิตที่ช่วยดูแลแมวเปลี่ยนรุ่นทุกปี 5 เรื่องนี้คือสิ่งที่ผู้ดูแลรุ่นก่อนอยากให้รู้ เริ่มจากอ่าน แล้วจบที่ไปดูแลจริงด้วยกัน",
          "Every year the students who help with the cats move on. These steps are what the experienced keepers want newcomers to know: start by reading, finish by doing it together."),
        `<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${steps.length}" aria-valuenow="${count()}" aria-label="${L("ความคืบหน้า", "Progress")}"><i id="pbar" style="width:${(count() / steps.length) * 100}%"></i></div>
        <p class="muted small" id="ptext" aria-live="polite">${ptext()}</p>`)}
      <ol class="path">${steps.map((s) => `
        <li class="${done[s.id] ? "done" : ""}" data-id="${s.id}" id="step-${s.id}" title="SECI: ${s.seci}">
          <div><h2>${esc(s.title)}</h2><p>${esc(s.text)}</p>
            ${s.id === "know" ? `<p class="met-count"><span class="meter" aria-hidden="true"><i style="width:${nNow ? (Math.min(nMet, nNow) / nNow) * 100 : 0}%"></i></span>${L(`จำได้แล้ว ${nMet} จาก ${nNow} ตัว`, `You know ${nMet} of ${nNow}`)}</p>` : ""}
            <div class="links">${s.links.map(([t, h]) => `<a href="${esc(h)}">${esc(t)} →</a>`).join("")}</div>
            <label class="done-toggle"><input type="checkbox" ${done[s.id] ? "checked" : ""}> ${L("ทำแล้ว", "Done")}</label></div>
        </li>`).join("")}
      </ol>
      <p class="muted small seci-note">${L("สำหรับคนที่สนใจทฤษฎี: 5 เรื่องนี้ไล่ตามวงจร SECI ของ Nonaka และ Takeuchi จากอ่านสิ่งที่จดไว้ (Combination) ลงมือทำเอง (Internalization) จนถึงไปเรียนกับผู้ดูแลตัวจริง (Socialization)", "For the theory-minded: these follow Nonaka and Takeuchi's SECI cycle, from reading what was written down (Combination) and doing it yourself (Internalization) to learning alongside a keeper (Socialization).")} <a href="#/about">${L("ดูในหน้าเกี่ยวกับเว็บนี้", "See the About page")}</a></p>`;
    app.querySelectorAll(".path li").forEach((li) => li.querySelector("input").addEventListener("change", (e) => {
      done[li.dataset.id] = e.target.checked;
      store.set(START_KEY, done);
      li.classList.toggle("done", e.target.checked);
      document.getElementById("pbar").style.width = (count() / steps.length) * 100 + "%";
      document.querySelector(".progress").setAttribute("aria-valuenow", count());
      document.getElementById("ptext").textContent = ptext();
    }));
  }

  /* ---------------- one cat ---------------- */
  function approachFor(c) {
    if (c.approach) return T(c.approach);
    if (c.touch === "no") return esc(L("ไม่ชอบให้จับ ดูอยู่ห่าง ๆ ไม่ต้องยื่นมือเข้าไปหรืออุ้ม", "Doesn't like being touched. Watch from a distance; don't reach out or pick it up."));
    if (c.touch === "careful") return esc(L("เข้าหาอย่างระวัง นั่งลงห่าง ๆ ให้แมวเข้ามาหาเองก่อน ไม่ยื่นมือเข้าไปหรืออุ้ม", "Approach with care: sit a little way off and let the cat come to you. Don't reach out or pick it up."));
    if (c.touch === "yes") return esc(L("เป็นมิตร นั่งลงให้ตัวต่ำ ยื่นมือให้ดมก่อน ถ้าเดินเข้ามาเองค่อยลูบ", "Friendly. Crouch down and offer a hand to sniff first; stroke only if the cat comes to you."));
    return esc(L("ยังไม่มีข้อมูล เข้าหาช้า ๆ แล้วดูท่าทีก่อน", "No notes yet. Approach slowly and read its body language first."));
  }
  const metLabel = (c, on) => (on ? L("จำได้แล้ว", "You know " + nm(c)) : L(`จำ${c.name}ได้แล้ว`, `I know ${nm(c)} now`));
  function renderCat(id) {
    const c = D.byId[lower(id)];
    if (!c) { app.innerHTML = `<div class="empty">${cat("peek")}<h1>${L(`ไม่เจอแมวชื่อ “${esc(id)}”`, `No cat called “${esc(id)}”`)}</h1><p><a href="#/find">${L("ลองหาจากสีขนกับจุดที่เจอ", "Try finding it by coat and place")}</a></p></div>`; return; }
    document.title = `${nm(c)} · ${TITLE()}`;
    const met = metMap();
    const mom = c.mother ? D.byId[c.mother] : null, sibs = siblingsOf(c), kids = childrenOf(c.id);
    const hist = historyFor(c.id), rel = articlesFor(c.id);
    const notes = [c.notes].concat(c.interview).filter(Boolean);
    const name = esc(nm(c));
    const strip = [esc(SEX()[c.sex]), c.age ? L("อายุ ", "Age ") + ageText(c.age) : "", coatLabel(c) ? L("สีขน", "Coat: ") + esc(coatLabel(c)) : ""].filter(Boolean).map((t) => `<li>${t}</li>`)
      .concat([`<li class="${c.sterilised === "yes" ? "" : "warn"}">${STERIL()[c.sterilised]}</li>`, `<li class="${c.vaccinated === "yes" ? "" : "warn"}">${VACC()[c.vaccinated]}</li>`]);
    const famRow = (label, html) => (html ? `<div class="family-row"><span>${label}</span><div class="mini-cats">${html}</div></div>` : "");
    const family = famRow(L("แม่", "Mother"), mom ? miniCat(mom) : "") + famRow(L("พี่น้อง", "Siblings"), sibs.map(miniCat).join("")) + famRow(L("ลูก", "Kittens"), kids.map(miniCat).join(""));
    const from = session.get("akc-list");
    const inList = from && Array.isArray(from.ids) && from.ids.includes(c.id);
    const ids = inList ? from.ids : D.cats.slice().sort(byStatusThenName).map((x) => x.id);
    const pos = ids.indexOf(c.id);
    const prev = pos > 0 ? D.byId[ids[pos - 1]] : null, next = pos >= 0 && pos < ids.length - 1 ? D.byId[ids[pos + 1]] : null;
    const backHref = inList ? from.hash : "#/cats", backLabel = inList ? L(from.th, from.en) : L("แมวทั้งหมด", "All cats");
    // "last seen": the newest sighting in the care history, else a date typed in the sheet.
    // Teams sometimes type a story into that column instead of a date; that becomes a keeper's note.
    const seenISO = lastSighting(c);
    const sheetDate = c.lastSeen && looksLikeDate(c.lastSeen) ? c.lastSeen : "";
    const lastSeen = seenISO && seenISO.length > 10 && daysAgo(seenISO) < 7 ? L("มีคนเห็นล่าสุด ", "Last seen ") + relTime(seenISO) : seenISO ? L(`มีคนเห็นล่าสุด ${fmtDate(seenISO)} (${daysAgo(seenISO) ? daysAgo(seenISO) + " วันก่อน" : "วันนี้"})`, `Last seen ${fmtDate(seenISO)} (${daysAgo(seenISO) ? daysAgo(seenISO) + " days ago" : "today"})`)
      : sheetDate ? L("เห็นล่าสุด ", "Last seen ") + (/^\d{4}-/.test(sheetDate) ? fmtDate(sheetDate) : esc(sheetDate)) : "";
    if (c.lastSeen && !sheetDate) notes.unshift(c.lastSeen);
    const chk = checkedOn(c), seenAny = seenISO || isoDate(sheetDate);
    const fresh = [
      stale(chk) ? `${L(`ข้อมูลของ${esc(c.name)}ไม่ได้ตรวจมา ${daysAgo(chk)} วันแล้ว บางอย่างอาจเปลี่ยนไป ถ้าเห็นอะไรไม่ตรง`, `${name}'s details haven't been checked for ${daysAgo(chk)} days, so some may be out of date. If something's wrong,`)} <a href="${shareHref("fix", c)}">${L("แจ้งแก้ได้เลย", "report a fix")}</a>` : "",
      c.status === "active" && seenAny && daysAgo(seenAny) > UNSEEN_DAYS ? L(`ในเว็บยังไม่มีใครบันทึกว่าเห็น${esc(c.name)}มา ${daysAgo(seenAny)} วันแล้ว ถ้าเห็น กดปุ่ม “เห็น${esc(c.name)}วันนี้” ให้หน่อย`, `Nobody has recorded seeing ${name} here for ${daysAgo(seenAny)} days. If you see ${name}, tap “Saw ${name} today”.`) : ""
    ].filter(Boolean);
    app.innerHTML = `
      <nav class="crumbs" aria-label="${L("ตำแหน่ง", "Breadcrumb")}"><a href="${esc(backHref)}">← ${esc(backLabel)}</a>${inList && ids.length > 1 ? `<span class="crumb-pos">${pos + 1} / ${ids.length}</span>` : ""}</nav>
      <article class="profile">
        <div class="profile-side">${portrait(c, true, true)}${c.gallery.length > 1 ? `
          <div class="gallery" role="group" aria-label="${esc(L(`รูปของ${c.name} ${c.gallery.length} รูป`, `${c.gallery.length} photos of ${nm(c)}`))}">${c.gallery.map((p, i) => `<button type="button" class="thumb" aria-pressed="${i === 0}" aria-label="${L("ดูรูปที่ ", "Show photo ")}${i + 1}" data-l="${esc(p.l)}"><img src="${esc(p.t || p.s)}" alt="" width="96" height="120" loading="lazy" decoding="async"></button>`).join("")}</div>` : ""}
          ${c.gallery.length ? "" : `<p class="photo-credit">${L("ยังไม่มีรูป", "No photo yet")} · <a href="${shareHref("photo", c)}">${L("มีรูปน้องไหม? ส่งมาได้เลย", "Have a photo? Send it in")}</a></p>`}
        </div>
        <div class="profile-main">
          <h1>${nmHtml(c)}</h1>
          <div class="cat-meta big">${statusDot(c)}${c.resident ? `<span>${L("คณะรับเลี้ยงไว้ อยู่ที่นี่เป็นหลัก", "Kept by the faculty; lives here")}</span>` : STATUS[c.status].hint ? `<span>${esc(L(STATUS[c.status].hint, STATUS[c.status].hintEn))}</span>` : ""}${lastSeen ? `<span>${lastSeen}</span>` : ""}</div>
          <ul class="facts-strip">${strip.join("")}</ul>
          <div class="actions">
            <button type="button" class="btn met-btn" id="metBtn" aria-pressed="${!!met[c.id]}">${CHECK}<span>${metLabel(c, !!met[c.id])}</span></button>
            ${norm(CFG.SUBMIT_URL) ? `<button type="button" class="btn ghost" id="quickSeen">${L(`เห็น${c.name}วันนี้`, `Saw ${nm(c)} today`)}</button>` : `<a class="btn ghost" href="${shareHref("sighting", c)}">${L(`เห็น${c.name}วันนี้`, `Saw ${nm(c)} today`)}</a>`}
            <a class="btn ghost" href="${shareHref("story", c)}">${L(`เล่าเรื่อง${c.name}`, `Tell us about ${nm(c)}`)}</a>
            ${shareBtn()}
          </div>

          ${fresh.map((t) => `<p class="fresh-note">${t}</p>`).join("")}
          <section class="normal-card" aria-labelledby="normalH">
            <h2 id="normalH">${L(`ปกติ${c.name}เป็นยังไง`, `What's normal for ${nm(c)}`)}</h2>
            <p class="muted">${L("รู้ว่าปกติเป็นแบบไหน จะได้สังเกตออกเวลามีอะไรผิดไป", "Knowing what's normal is how you notice when something changes.")}</p>
            <dl class="normal-list">
              ${c.about ? `<div><dt>${L("ควรรู้ไว้", "Good to know")}</dt><dd>${T(c.about)}</dd></div>` : ""}
              <div><dt>${L("อยู่แถวไหน", "Usually at")}</dt><dd>${c.locations.length ? expandBuildings(c.locations.map(T).join(", ")) : c.areas.length ? esc(c.areas.map((a) => lbl(AREAS[a])).join(", ")) : `<span class="muted">${L("ยังไม่มีข้อมูล", "Not recorded yet")}</span>`}${c.areas.filter((a) => AREAS[a] && AREAS[a].where).map((a) => `<small class="where">${esc(L(AREAS[a].where, AREAS[a].whereEn))}</small>`).join("")}${mapSpot(c) ? ` <a class="map-link" href="index.html#map-${mapSpot(c)}">${L("ดูบนแผนที่", "See on the map")}</a>` : ""}</dd></div>
              <div><dt>${L("เข้าหายังไง", "How to approach")}</dt><dd>${approachFor(c)}</dd></div>
              ${c.caretakers ? `<div><dt>${L("ใครดูแล", "Looked after by")}</dt><dd>${keeperHtml(c.caretakers)}</dd></div>` : ""}
              ${c.health ? `<div><dt>${L("เรื่องสุขภาพ", "Health to watch")}</dt><dd>${healthText(c.health)}</dd></div>` : ""}
              ${c.marks ? `<div><dt>${L("จุดสังเกต", "How to spot")}</dt><dd>${T(c.marks)}</dd></div>` : ""}
              ${c.normal ? `<div><dt>${L("กิจวัตร", "Daily routine")}</dt><dd class="hand">${T(c.normal)}</dd></div>` : ""}
            </dl>
            ${c.normal ? "" : `<div class="ask">${L(`ยังไม่มีใครบันทึกว่าปกติ${esc(c.name)}กินตอนไหน นอนตรงไหน หรือมีนิสัยอะไรพิเศษ ถ้ารู้`, `Nobody has recorded yet when ${name} usually eats, where they sleep, or any special habits. If you know,`)} <a href="${shareHref("story", c, "&topic=normal")}">${L("เล่าให้ทีมฟังหน่อย", "tell the team")}</a></div>`}
          </section>

          ${notes.length ? `<section class="sec"><h2 class="label">${L("ผู้ดูแลเล่าว่า", "The keepers say")}</h2><p class="muted small">${L("คัดจากบันทึกสัมภาษณ์ ตามคำพูดจริง", "From the interview notes. Translated; the Thai original is under each note.")}</p><ul class="keeper-notes">${notes.map((t) => `<li>${T(t)}${isEN() && !I.untranslated(t) && Tp(t) !== t ? `<span class="orig" lang="th">${esc(t)}</span>` : ""}</li>`).join("")}</ul></section>` : ""}

          ${family ? `<section class="sec"><h2 class="label">${L("ครอบครัว", "Family")}</h2><div class="family">${family}</div></section>` : ""}
          <p class="more"><a href="#/graph/${enc(c.id)}">${L(`ดูว่า${esc(c.name)}เชื่อมกับใครและอะไรบ้างในผังความรู้`, `See how ${name} connects to others in the knowledge map`)} →</a></p>

          <section class="sec"><h2 class="label">${L("ประวัติการดูแล", "Care history")}</h2>
            ${hist.length ? `<ol class="timeline">${hist.map((h) => `<li><time datetime="${esc(h.date)}">${fmtDate(h.date)}</time><div><span class="t-type">${L(HISTORY_TYPES[h.type], HISTORY_EN[h.type])}</span>${T(h.note)}${h.by ? `<span class="t-by">${esc(h.by)}</span>` : ""}</div></li>`).join("")}</ol>`
              : `<p class="muted">${L(`ยังไม่มีบันทึก ถ้าเห็นหรือได้ดูแล${esc(c.name)}`, `Nothing yet. If you see or look after ${name},`)} <a href="${shareHref("sighting", c)}">${L("บอกทีมได้เลย", "let the team know")}</a></p>`}
          </section>

          ${rel.length ? `<section class="sec"><h2 class="label">${L(`อ่านเพิ่มเกี่ยวกับ${esc(c.name)}`, `Reading about ${name}`)}</h2><ul class="articles">${rel.map((a) => articleRow(a)).join("")}</ul></section>` : ""}

          <p class="meta-line">${L("ข้อมูลจากชีตของทีม", "From the team's sheet")}${D.loadedAt ? L(" อัปเดต ", ", updated ") + fmtTime(D.loadedAt) : ""}${chk ? L(" · ตรวจข้อมูลล่าสุด ", " · last checked ") + fmtDate(chk) : ""}${c.coatSource === "photo" ? L(" · สีขนดูจากรูปถ่าย", " · coat identified from photos") : ""}${c.source ? L(" · ที่มา: ", " · source: ") + esc(c.source) : ""} · ${L("ข้อมูลผิด?", "Something wrong?")} <a href="${shareHref("fix", c)}">${L("แจ้งแก้", "Report a fix")}</a></p>
        </div>
      </article>
      ${prev || next ? `<nav class="pager" aria-label="${L("แมวตัวอื่นในรายการ", "Other cats in this list")}">
        ${prev ? `<a href="${catHref(prev)}" rel="prev"><small>← ${L("ก่อนหน้า", "Previous")}</small><b>${nmHtml(prev)}</b></a>` : "<span></span>"}
        ${next ? `<a href="${catHref(next)}" rel="next" class="next"><small>${L("ถัดไป", "Next")} →</small><b>${nmHtml(next)}</b></a>` : "<span></span>"}
      </nav>` : ""}`;
    // one tap: tell the team this cat was seen today, no form (once a day per cat on this device)
    const qs = document.getElementById("quickSeen");
    if (qs) qs.addEventListener("click", async () => {
      const key = "akc-seen-" + c.id + "-" + new Date().toISOString().slice(0, 10);
      const more = `<a href="${shareHref("sighting", c)}">${L("เพิ่มรายละเอียด", "Add details")}</a>`;
      if (store.get(key, false)) { toast(L(`วันนี้บอกทีมแล้วว่าเห็น${esc(c.name)} ขอบคุณนะ · `, `Already sent today, thank you · `) + more); return; }
      qs.disabled = true;
      const ok = await postQuick({ type: TYPES.sighting.label, cat: c.name, message: `เห็น${c.name}วันนี้ (กดจากหน้าแมว)` });
      qs.disabled = false;
      if (ok) { store.set(key, true); gave(); noteSeen(c); toast(L(`ส่งแล้ว ทีมรู้แล้วว่าวันนี้มีคนเห็น${esc(c.name)} · `, `Sent: the team knows ${esc(nm(c))} was seen today · `) + more); }
      else toast(L("ส่งไม่สำเร็จ ลองใหม่อีกที หรือ ", "Couldn't send. Try again, or ") + more);
    });
    const mb = document.getElementById("metBtn");
    mb.addEventListener("click", () => {
      const m = metMap(), on = !m[c.id];
      if (on) m[c.id] = true; else delete m[c.id];
      store.set(MET_KEY, m);
      mb.setAttribute("aria-pressed", String(on));
      mb.querySelector("span").textContent = metLabel(c, on);
    });
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
  function renderKnowledge(catKey) {
    catKey = has(CATEGORIES, catKey) ? catKey : "";
    const sorted = (list) => list.slice().sort((a, b) => (b.category === "experience") - (a.category === "experience") || (a.date < b.date ? 1 : -1));
    const n = (k) => D.articles.filter((a) => a.category === k).length;
    const share = `<aside class="callout" aria-label="${L("เล่าให้ทีมฟัง", "Tell the team")}"><h3>${L("มีเรื่องที่รุ่นต่อไปควรรู้ไหม?", "Know something the next keepers should know?")}</h3><p>${L("เคล็ดลับ บทเรียน หรือเรื่องที่เคยเกิดกับแมวในคณะ เล่ามาสั้น ๆ ก็พอ ทีมจะเรียบเรียง ตรวจทาน แล้วใส่ชื่อคุณเป็นเครดิต", "A tip, a lesson, or something that happened with the faculty's cats. A few lines is enough: the team writes it up, reviews it, and credits you.")}</p><a class="btn" href="${shareHref("story")}">${L("เล่าให้ทีมฟัง", "Tell the team")}</a></aside>`;

    // one topic: its own page inside the library
    if (catKey) {
      const C = CATEGORIES[catKey], list = sorted(D.articles.filter((a) => a.category === catKey));
      document.title = `${lbl(C)} · ${L("คลังความรู้", "Knowledge library")} · ${TITLE()}`;
      app.innerHTML = `
        <nav class="crumbs" aria-label="${L("ตำแหน่ง", "Breadcrumb")}"><a href="#/knowledge">${L("คลังความรู้", "Knowledge library")}</a><span>/</span><span>${lbl(C)}</span></nav>
        <header class="page-head k-topic-head"><span class="task-ico">${ICON[catKey] || ICON.book}</span><h1>${lbl(C)}</h1><p class="lede">${esc(L(C.desc, C.descEn))}</p></header>
        <nav class="tabs" aria-label="${L("หัวข้อ", "Topics")}">
          <a href="#/knowledge">${L("ทั้งหมด", "All")}<span class="n">${D.articles.length}</span></a>
          ${Object.keys(CATEGORIES).filter(n).map((k) => `<a href="#/knowledge/${k}" class="${catKey === k ? "on" : ""}" ${catKey === k ? 'aria-current="page"' : ""}>${lbl(CATEGORIES[k])}<span class="n">${n(k)}</span></a>`).join("")}
        </nav>
        <h2 class="sr">${L("เรื่องในหัวข้อนี้", "Articles on this topic")}</h2>
        ${list.length ? `<ul class="a-cards">${list.map((a) => articleCard(a)).join("")}</ul>` : `<div class="empty">${cat("loaf")}<p>${L("ยังไม่มีเรื่องในหัวข้อนี้", "Nothing here yet.")} <a href="${shareHref("story")}">${L("เล่าเป็นคนแรก", "Be the first to share")}</a></p></div>`}
        ${catKey === "health" ? `<aside class="callout danger" aria-label="${L("แมวป่วย", "Sick cat")}"><h3>${L("แมวป่วยอยู่ตอนนี้?", "Is a cat sick right now?")}</h3><p>${L("เว็บนี้วินิจฉัยโรคไม่ได้ ดูวิธีรับมือเบื้องต้นและช่องทางติดต่อได้ที่หน้าแมวป่วย", "This site can't diagnose illness. The first steps and who to contact are on the sick-cat page.")}</p><a class="btn" href="#/help">${L("แมวป่วย ทำยังไง", "Sick cat: what to do")}</a></aside>` : ""}
        ${share}`;
      return;
    }

    const keeper = sorted(D.articles.filter((a) => a.category === "experience"));
    const quotes = (CFG.KEEPER_QUOTES || []).slice(1, 3);
    // what is special about each cat: the knowledge that lives in the profiles
    const watch = D.cats.filter((c) => SEEN_NOW(c) && (c.touch === "no" || c.touch === "careful" || c.health)).sort(byStatusThenName).slice(0, 6);
    const watchNote = (c) => [c.touch === "no" ? L("ไม่ชอบให้จับ ดูอยู่ห่าง ๆ", "Doesn't like being touched") : c.touch === "careful" ? L("เข้าหาอย่างระวัง", "Approach with care") : "", c.health ? L("สุขภาพ: ", "Health: ") + T(c.health) : ""].filter(Boolean).join(" · ");
    document.title = `${L("คลังความรู้", "Knowledge library")} · ${TITLE()}`;
    app.innerHTML = `
      <header class="k-hero">
        <h1>${L("คลังความรู้", "Knowledge library")}</h1>
        <p class="lede">${L("ความรู้เรื่องแมวในคณะ ทั้งวิธีดูแลทั่วไป และสิ่งที่ผู้ดูแลรู้จากการอยู่กับแมวมาหลายปี ทุกเรื่องบอกที่มา และบอกว่าตรวจทานแล้วหรือยัง",
          "What there is to know about the faculty's cats: everyday care, and what the keepers have learned from years with them. Every article says where it came from and whether it has been reviewed.")}</p>
        <form class="k-search" id="kForm" role="search" aria-label="${L("ค้นในคลังความรู้", "Search the library")}">
          <label class="sr" for="kq">${L("ค้นในคลังความรู้", "Search the library")}</label>${SEARCH_SVG}
          <input id="kq" type="search" placeholder="${L("ค้นในคลังความรู้ เช่น นม ทำหมัน ข่วน", "Search the library, e.g. milk, spaying, scratches")}" autocomplete="off" enterkeyhint="search">
        </form>
        ${asksHtml()}
      </header>
      <div class="k-results" id="kResults" hidden></div>
      <p class="sr" id="kStatus" aria-live="polite"></p>
      <div id="kBrowse">
        <section class="sec">
          <div class="sec-head"><h2>${L("เลือกตามหัวข้อ", "Browse by topic")}</h2><p>${L("ทุกหัวข้อมีทั้งเรื่องพื้นฐาน และเรื่องที่ผู้ดูแลเล่าเพิ่ม", "Each topic has the basics plus what the keepers added")}</p></div>
          ${topicCards()}
        </section>

        ${keeper.length ? `<section class="sec k-keepers">
          <div class="sec-head"><h2>${L("ความรู้จากผู้ดูแล", "Learned by the keepers")}</h2><p>${L("เรื่องที่ไม่มีในตำรา ผู้ดูแลรู้จากการอยู่กับแมวทุกวัน เราสัมภาษณ์แล้วจดไว้ให้", "Things no textbook says. The keepers know them from being with the cats every day; we interviewed them and wrote it down.")}</p></div>
          <div class="k-split">
            <ul class="a-cards">${keeper.map((a) => articleCard(a)).join("")}</ul>
            ${quotes.length ? `<div class="k-quotes">${quotes.map((q) => `<figure class="quote"><blockquote>“${esc(en(q, "text"))}”</blockquote><figcaption>${esc(en(q, "context"))}</figcaption></figure>`).join("")}</div>` : ""}
          </div>
        </section>` : ""}

        ${watch.length ? `<section class="sec">
          <div class="toolbar"><h2>${L("แมวแต่ละตัวต้องระวังอะไร", "What to know about each cat")}</h2><a href="#/cats">${L("ดูแมวทุกตัว", "All cats")} →</a></div>
          <p class="k-note">${L("ข้อควรรู้เฉพาะตัว ดูเพิ่มได้ในหน้าประวัติของแมวตัวนั้น", "Notes that apply to one cat only. There is more on each cat's profile.")}</p>
          <ul class="kcats">${watch.map((c) => `<li><a href="${catHref(c)}">${portrait(c)}<span><b>${nmHtml(c)}</b><small>${watchNote(c)}</small></span></a></li>`).join("")}</ul>
        </section>` : ""}

        <a class="urgent-bar ask-bar" href="#/ask"><span class="task-ico">${ICON.share}</span><span><b>${L("ไม่เจอเรื่องที่อยากรู้?", "Can't find what you need?")}</b> ${L("ความรู้บางอย่างยังอยู่ในหัวคน ดูว่าเรื่องไหนควรถามใคร", "Some knowledge still lives in people's heads. See who to ask about what")}</span><span aria-hidden="true">→</span></a>

        <section class="sec">
          <div class="sec-head"><h2>${L("คำที่ได้ยินบ่อย", "Words you'll hear")}</h2><p>${L("คำที่ผู้ดูแลใช้กัน ฟังครั้งแรกอาจงง", "Words the keepers use that can puzzle a newcomer")}</p></div>
          ${glossHtml(glossary())}
        </section>

        <section class="sec">
          <div class="toolbar"><h2>${L("เรื่องพื้นฐานการดูแลแมว", "Cat-care basics")}</h2><span class="summary">${L(`ทั้งคลังมี ${D.articles.length} เรื่อง`, `${D.articles.length} articles in all`)}</span></div>
          <ul class="a-cards">${sorted(D.articles.filter((a) => a.category !== "experience")).map((a) => articleCard(a)).join("")}</ul>
        </section>
      </div>
      ${share}`;

    // search inside the library: articles and words, as you type
    const kq = document.getElementById("kq"), res = document.getElementById("kResults"), browse = document.getElementById("kBrowse"), status = document.getElementById("kStatus");
    let t = 0;
    const run = () => {
      const q = norm(kq.value).toLowerCase();
      browse.hidden = !!q; res.hidden = !q;
      if (!q) { res.innerHTML = ""; status.textContent = ""; return; }
      const terms = q.split(/\s+/).filter(Boolean);
      const hit = (txt) => { const low = txt.toLowerCase(); return terms.every((w) => low.includes(w)); };
      const arts = D.articles.filter((x) => { const a = art(x); return hit([a.title, a.summary, (a.tags || []).join(" "), a.body, x.title, x.summary].join(" ")); });
      const words = glossary().filter((g) => hit([g.t, g.en, g.d, g.dEn].join(" ")));
      const total = arts.length + words.length;
      status.textContent = L(`เจอ ${total} รายการ`, `${total} result${total === 1 ? "" : "s"}`);
      res.innerHTML = total ? `
        <h2>${L(`เจอ ${total} รายการ`, `${total} result${total === 1 ? "" : "s"}`)}</h2>
        ${arts.length ? `<ul class="a-cards">${arts.map((a) => articleCard(a, terms)).join("")}</ul>` : ""}
        ${words.length ? `<h3 class="label">${L("คำที่เกี่ยวข้อง", "Related words")}</h3>${glossHtml(words)}` : ""}
        <p class="more"><a href="#/search/${enc(q)}">${L("ค้นชื่อแมวด้วยคำนี้", "Search the cats for this too")} →</a></p>`
        : `<div class="empty">${cat("peek")}<p>${L("ยังไม่มีเรื่องนี้ในคลัง", "Nothing on that yet.")} <a href="#/search/${enc(q)}">${L("ลองค้นในแมวทุกตัว", "Try searching the cats")}</a> ${L("หรือ", "or")} <a href="${shareHref("story")}">${L("เล่าให้ทีมฟัง", "tell the team")}</a></p></div>`;
    };
    kq.addEventListener("input", () => { clearTimeout(t); t = setTimeout(run, 150); });
    document.getElementById("kForm").addEventListener("submit", (e) => { e.preventDefault(); run(); });
  }

  function renderArticle(id) {
    const raw = D.articleById[lower(id)];
    if (!raw) { app.innerHTML = `<div class="empty">${cat("peek")}<h1>${L("ไม่เจอเรื่องนี้", "Article not found")}</h1><p><a href="#/knowledge">${L("กลับไปคลังความรู้", "Back to the knowledge library")}</a></p></div>`; return; }
    const a = art(raw);
    document.title = `${a.title} · ${TITLE()}`;
    const read = store.get(READ_KEY, {}); read[raw.id] = 1; store.set(READ_KEY, read);
    const cats = a.relatedCats.map((k) => D.byId[k]).filter(Boolean);
    const more = D.articles.filter((x) => x.category === a.category && x.id !== a.id).slice(0, 3);
    const catLbl = lbl(CATEGORIES[a.category]);
    app.innerHTML = `
      <nav class="crumbs" aria-label="${L("ตำแหน่ง", "Breadcrumb")}"><a href="#/knowledge">${L("คลังความรู้", "Knowledge library")}</a><span>/</span><a href="#/knowledge/${a.category}">${catLbl}</a></nav>
      <article class="article">
        ${a.th ? `<p class="lang-note">This article hasn't been translated yet. Here is the Thai original.</p>` : ""}
        <h1${langAttr(a)}>${esc(a.title)}</h1>
        ${a.summary ? `<p class="lede"${langAttr(a)}>${esc(a.summary)}</p>` : ""}
        <div class="byline">
          ${a.author ? `<span>${L("เรียบเรียงโดย", "Written up by")} <b>${esc(a.author)}</b></span>` : ""}
          ${a.source ? `<span>${L("ที่มา", "Source")} <b>${esc(a.source)}</b></span>` : ""}
          ${a.date ? `<span>${fmtDate(a.date)}</span>` : ""}
          <span>${a.reviewedBy ? `${L("ตรวจทานโดย", "Reviewed by")} <b>${esc(a.reviewedBy)}</b>${isoDate(a.reviewedOn) ? L(" เมื่อ ", " on ") + fmtDate(a.reviewedOn) : ""}${reviewState(a) === "due" ? ` <span class="a-pending">${L("ตรวจครั้งล่าสุดนานแล้ว อาจต้องทบทวน", "Last checked a while ago")}</span>` : ""}` : `<span class="a-pending">${L("รอผู้ดูแลตรวจทาน", "Awaiting a keeper's review")}</span>`}</span>
        </div>
        <div class="prose"${langAttr(a)}>${renderBody(a.body)}</div>
        ${a.tags.length ? `<div class="tags">${a.tags.map((t) => `<a class="chip" href="#/search/${enc(t)}">${esc(t)}</a>`).join("")}</div>` : ""}
        ${cats.length ? `<section class="sec"><h2 class="label">${L("แมวในเรื่องนี้", "Cats in this story")}</h2><div class="mini-cats">${cats.map(miniCat).join("")}</div></section>` : ""}
        ${a.category === "health" ? `<aside class="callout danger"><h3>${L("แมวป่วยอยู่ตอนนี้?", "Is a cat sick right now?")}</h3><p>${L("เว็บนี้วินิจฉัยโรคไม่ได้ ดูวิธีรับมือเบื้องต้นและช่องทางติดต่อได้ที่หน้าแมวป่วย", "This site can't diagnose illness. The first steps and who to contact are on the sick-cat page.")}</p><a class="btn" href="#/help">${L("แมวป่วย ทำยังไง", "Sick cat: what to do")}</a></aside>` : ""}
        <div class="helpful" id="helpful">${store.get("akc-vote-" + a.id, "") ? `<p>${L("ขอบคุณที่บอก เราใช้คำตอบนี้ดูว่าเรื่องไหนต้องเติม", "Thanks, this tells us which articles need more work.")}</p>` : `<span>${L("เรื่องนี้ช่วยได้ไหม?", "Did this help?")}</span><button type="button" class="btn ghost" data-vote="yes">${L("ช่วยได้", "Yes")}</button><button type="button" class="btn ghost" data-vote="no">${L("ยังไม่ช่วย", "Not really")}</button>`}${shareBtn()}</div>
        <div class="feedback"><span>${L("เรื่องนี้ขาดอะไรไหม หรือมีตรงไหนผิด?", "Something missing or wrong?")}</span><a class="btn ghost" href="${shareHref("story", null, "&ctx=" + enc(a.id))}">${L("เล่าเพิ่ม", "Add from experience")}</a><a class="btn ghost" href="${shareHref("fix", null, "&ctx=" + enc(a.id))}">${L("แจ้งแก้", "Report a fix")}</a></div>
      </article>
      ${more.length ? `<section class="sec article-more"><h2 class="label">${L(`อ่านต่อในหมวด${catLbl}`, `More in ${catLbl}`)}</h2><ul class="articles">${more.map((x) => articleRow(x)).join("")}</ul></section>` : ""}`;
    // "did this help?": a quiet signal of whether the knowledge is used, sent to the team's review sheet
    const hp = document.getElementById("helpful");
    hp.addEventListener("click", async (e) => {
      const b = e.target.closest("[data-vote]"); if (!b) return;
      const yes = b.dataset.vote === "yes";
      store.set("akc-vote-" + a.id, b.dataset.vote); gave();
      hp.querySelectorAll("[data-vote]").forEach((x) => { x.disabled = true; });
      await postQuick({ type: "ความเห็นต่อบทความ", message: `${raw.id} · ${raw.title}: ${yes ? "ช่วยได้" : "ยังไม่ช่วย"}`, page: location.href });
      hp.querySelector("span").outerHTML = `<p>${yes ? L("ดีใจที่ช่วยได้ ขอบคุณที่บอก", "Glad it helped, thanks for telling us.") : L("ขอบคุณที่บอก ถ้ารู้ว่าขาดอะไร", "Thanks for telling us. If you know what's missing,")} ${yes ? "" : `<a href="${shareHref("story", null, "&ctx=" + enc(a.id))}">${L("เล่าเพิ่มได้เลย", "add it here")}</a>`}</p>`;
      hp.querySelectorAll("[data-vote]").forEach((x) => x.remove());
    });
  }

  function renderSearch(q) {
    q = norm(q);
    if (searchInput.value !== q) searchInput.value = q;
    const r = searchAll(q);
    const met = metMap();
    document.title = `${L("ค้นหา", "Search")} “${q}” · ${TITLE()}`;
    const total = r.cats.length + r.articles.length;
    app.innerHTML = `
      ${pageHead(`“${esc(q)}”`, total ? L(`เจอแมว ${r.cats.length} ตัว และความรู้ ${r.articles.length} เรื่อง`, `${r.cats.length} cat${r.cats.length === 1 ? "" : "s"} and ${r.articles.length} article${r.articles.length === 1 ? "" : "s"}`) : "")}
      ${total ? "" : `<div class="empty">${cat("peek")}<p>${L("ไม่เจอเลย ถ้าไม่รู้ชื่อแมว", "Nothing found. Don't know the cat's name?")} <a href="#/find">${L("ลองหาจากสีขนกับจุดที่เจอ", "Find it by coat and place")}</a></p></div>`}
      ${r.cats.length ? `<section class="results"><h2>${L("แมว", "Cats")}</h2><div class="cats">${r.cats.map((c) => catCard(c, r.terms, "", met)).join("")}</div></section>` : ""}
      ${r.articles.length ? `<section class="results"><h2>${L("ความรู้", "Know-how")}</h2><ul class="articles">${r.articles.map((a) => articleRow(a, r.terms)).join("")}</ul></section>` : ""}`;
    if (r.cats.length) rememberList(r.cats.map((c) => c.id), `ค้นหา “${q}”`, `Search “${q}”`);
  }

  /* ---------------- share (externalization, with review before publishing) ---------------- */
  const TYPES = {
    sighting: { label: "เห็นแมววันนี้", en: "Saw a cat today", ph: "เห็นที่ไหน กำลังทำอะไร ดูปกติดีไหม", phEn: "Where, what it was doing, did it seem normal" },
    sick: { label: "แมวดูไม่สบาย", en: "A cat looks unwell", ph: "เห็นอาการอะไร เห็นตอนไหน ตอนนี้แมวอยู่ตรงไหน", phEn: "What you saw, when, and where the cat is now" },
    newcat: { label: "แมวที่ยังไม่มีในเว็บ", en: "A cat that isn't listed", ph: "สีขน หน้าตา เจอที่ไหน มีปลอกคอไหม", phEn: "Coat, looks, where you saw it, any collar" },
    story: { label: "เคล็ดลับ / ประสบการณ์", en: "A story or tip", ph: "เรื่องที่อยากส่งต่อ เช่น ปกติแมวตัวนี้ชอบทำอะไร หรือเคยแก้ปัญหาอะไรได้", phEn: "Something worth passing on, like what this cat usually does, or a problem you solved" },
    // reached from links (who to ask, a cat with no photo), not shown as chips
    question: { hidden: true, label: "อยากถามผู้ดูแล", en: "A question for the keepers", ph: "อยากรู้อะไร ทีมจะไปถามผู้ดูแลแล้วตอบไว้ในเว็บ", phEn: "What you'd like to know; the team will ask the keepers and answer here" },
    photo: { hidden: true, label: "ส่งรูปแมว", en: "Send a photo", ph: "รูปของตัวไหน ถ่ายที่ไหน", phEn: "Which cat, where it was taken" },
    fix: { label: "ข้อมูลผิด", en: "Something is wrong", ph: "ตรงไหนผิด แล้วที่ถูกคืออะไร", phEn: "What's wrong, and what's right" },
    join: { label: "ขอไปช่วยดูแล", en: "I'd like to help", ph: "อยากไปให้อาหารด้วยกัน หรือช่วยเรื่องไหน เรียนตึกไหน", phEn: "Join a feeding round, or help with something else; which building you study in" }
  };
  const tPh = (k) => L(TYPES[k].ph, TYPES[k].phEn) + "…";
  function shrinkImage(fileObj, max, quality) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(fileObj), img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const cv = document.createElement("canvas"); cv.width = Math.round(img.naturalWidth * k); cv.height = Math.round(img.naturalHeight * k);
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        resolve(cv.toDataURL("image/jpeg", quality).split(",")[1]);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image")); };
      img.src = url;
    });
  }
  function renderShare(q) {
    const type = has(TYPES, q.get("type")) ? q.get("type") : "sighting";
    const pre = D.byId[lower(q.get("cat") || "")];
    const ctxRaw = q.get("ctx") ? D.articleById[lower(q.get("ctx"))] : null;
    const ctx = ctxRaw ? art(ctxRaw) : null;
    const preset = [q.get("topic") === "normal" && pre ? L(`ปกติ${pre.name}...`, `Normally ${nm(pre)}...`) : "", q.get("coat") && has(COATS, q.get("coat")) ? L("สีขน: ", "Coat: ") + lbl(COATS[q.get("coat")]) : "", ctx ? L(`เรื่อง “${ctx.title}”: `, `About “${ctx.title}”: `) : ""].filter(Boolean).join("\n");
    const place = q.get("area") && has(AREAS, q.get("area")) ? lbl(AREAS[q.get("area")]) : "";
    const live = !!norm(CFG.SUBMIT_URL);
    app.innerHTML = `
      ${pageHead(L("เล่าให้ทีมฟัง", "Tell the team"), L("เพิ่งเห็นแมวเมื่อเช้า หรือดูแลแมวมาหลายปี บอกเท่าที่รู้ก็พอ ทีมจะตรวจก่อนขึ้นเว็บ และใส่ชื่อคุณเป็นเครดิตถ้าอยากให้ใส่", "Whether you saw a cat this morning or have looked after them for years, just tell us what you know. The team checks everything before it goes up, and credits you if you like."))}
      <div class="share-grid">
        <form class="form" id="shareForm" novalidate>
          <fieldset class="field"><legend>${L("เรื่องอะไร", "What is it about?")}</legend>
            <div class="type-grid">${Object.keys(TYPES).filter((k) => !TYPES[k].hidden || k === type).map((k) => `<label><input type="radio" name="type" value="${k}" ${k === type ? "checked" : ""}>${lbl(TYPES[k])}</label>`).join("")}</div>
          </fieldset>
          <div class="field"><label for="fCat">${L("แมวตัวไหน", "Which cat?")}</label>
            <select id="fCat" name="cat"><option value="">${L("ไม่รู้ / ยังไม่มีในเว็บ", "Don't know / not listed")}</option>${D.cats.slice().sort(byStatusThenName).map((c) => `<option value="${esc(c.name)}" ${pre && pre.id === c.id ? "selected" : ""}>${esc(isEN() && I.nameEn(c.name) ? `${I.nameEn(c.name)} (${c.name})` : c.name)}</option>`).join("")}</select></div>
          <div class="field"><label for="fMsg">${L("รายละเอียด", "Details")}</label>
            <textarea id="fMsg" name="message" required aria-describedby="msgHint" placeholder="${esc(tPh(type))}">${esc(preset)}</textarea>
            <p class="hint" id="msgHint">${L("เขียนสั้น ๆ ก็ได้ ทีมจะเรียบเรียงให้", "A few lines is fine; the team will tidy it up. Thai or English.")}</p></div>
          <div class="two-fields">
            <div class="field"><label for="fPlace">${L("สถานที่ (ถ้ามี)", "Place (optional)")}</label><input id="fPlace" name="place" type="text" autocomplete="off" value="${esc(place)}" placeholder="${L("เช่น BRK ชั้น 1 หน้าป้อม รปภ.…", "e.g. BRK 1st floor, by the security post…")}"></div>
            ${CFG.PHOTO_UPLOAD && live ? `<div class="field"><label for="fFile">${L("รูป (ถ้ามี)", "Photo (optional)")}</label><input id="fFile" type="file" accept="image/*"><p class="hint">${L("รูปจะถูกย่อในเครื่องก่อนส่ง", "The photo is shrunk on your device before sending.")}</p><img id="fPreview" class="file-preview" alt="" hidden></div>`
              : `<div class="field"><label for="fPhoto">${L("ลิงก์รูป (ถ้ามี)", "Photo link (optional)")}</label><input id="fPhoto" name="photo" type="url" inputmode="url" autocomplete="off" spellcheck="false" placeholder="${L("ลิงก์ Google Drive หรือ Google Photos…", "A Google Drive or Google Photos link…")}"></div>`}
          </div>
          <div class="field" id="whenField" ${type === "join" ? "" : "hidden"}><label for="fWhen">${L("วันและเวลาที่สะดวก", "When suits you")}</label><input id="fWhen" name="when" type="text" autocomplete="off" placeholder="${L("เช่น อังคารหรือพฤหัส หลังสี่โมงเย็น…", "e.g. Tuesdays or Thursdays after 4 pm…")}"></div>
          <div class="two-fields">
            <div class="field"><label for="fName">${L("ชื่อสำหรับเครดิต (ถ้าอยากให้ใส่)", "Name to credit (optional)")}</label><input id="fName" name="name" type="text" autocomplete="nickname" placeholder="${L("เช่น นิสิตปี 2 เอกภาษาไทย…", "e.g. 2nd-year Thai major…")}"></div>
            <div class="field"><label for="fContact">${L("ช่องทางติดต่อกลับ (ถ้ามี)", "How to reach you (optional)")}</label><input id="fContact" name="contact" type="text" autocomplete="off" spellcheck="false" placeholder="${L("LINE ID หรืออีเมล…", "LINE ID or email…")}"></div>
          </div>
          <label class="consent"><input type="checkbox" name="consent" value="yes"> ${L("ให้ทีมเอาเรื่องนี้ขึ้นเว็บได้หลังตรวจ (ถ้าไม่ติ๊ก ทีมจะใช้เพื่อดูแลแมวอย่างเดียว)", "The team may publish this after review (if unticked, it's only used for looking after the cats)")}</label>
          <div class="hp" aria-hidden="true"><label>${L("เว็บไซต์", "Website")} <input name="website" tabindex="-1" autocomplete="off"></label></div>
          <div id="formStatus" role="status" aria-live="polite"></div>
          <div><button class="btn" type="submit" id="fSubmit">${L("ส่งให้ทีม", "Send to the team")}</button></div>
        </form>
        <aside class="share-side">
          <h2 class="label">${L("ส่งแล้วเกิดอะไรขึ้น", "After you send")}</h2>
          <ol class="flow">
            <li><div><b>${L("เข้าคิวรอตรวจ", "It waits for review")}</b>${L("ยังไม่ขึ้นเว็บทันที", "It doesn't go up straight away.")}</div></li>
            <li><div><b>${L("ทีมตรวจทาน", "The team checks it")}</b>${L("ดูว่าถูกต้องและไม่มีข้อมูลส่วนตัว เรื่องสุขภาพจะถามผู้ดูแลหรือสัตวแพทย์ก่อน", "For accuracy and privacy. Health matters are checked with a keeper or vet first.")}</div></li>
            <li><div><b>${L("ขึ้นเว็บพร้อมเครดิต", "Published with credit")}</b>${L("ในหน้าแมว หรือหน้าความรู้ พร้อมที่มา", "On the cat's page or in know-how, with its source.")}</div></li>
          </ol>
          <div class="callout danger"><h3>${L("แมวป่วยหนักหรือบาดเจ็บ?", "Is a cat badly sick or hurt?")}</h3><p>${L("ไม่ต้องรอทีม ทำตามขั้นตอนเร่งด่วนก่อนเลย", "Don't wait for the team. Follow the urgent steps first.")}</p><a class="btn" href="#/help">${L("แมวป่วย ทำยังไง", "Sick cat: what to do")}</a></div>
        </aside>
      </div>`;
    const form = document.getElementById("shareForm"), msg = document.getElementById("fMsg"), status = document.getElementById("formStatus");
    form.querySelectorAll('input[name="type"]').forEach((r) => r.addEventListener("change", () => { msg.placeholder = tPh(r.value); document.getElementById("whenField").hidden = r.value !== "join"; }));
    // photo upload: shrink to 1280px JPEG on the device, preview it, send as base64 with the form
    let photoData = "";
    const file = document.getElementById("fFile");
    if (file) file.addEventListener("change", async () => {
      const prev = document.getElementById("fPreview");
      photoData = ""; prev.hidden = true;
      const f = file.files && file.files[0]; if (!f) return;
      try { photoData = await shrinkImage(f, 1280, 0.82); prev.src = "data:image/jpeg;base64," + photoData; prev.hidden = false; }
      catch (err) { show("err", `<b>${L("อ่านรูปนี้ไม่ได้", "Couldn't read this photo")}</b>${L("ลองรูปอื่น หรือส่งเป็นลิงก์แทน", "Try another photo.")}`); }
    });
    const show = (cls, html) => { status.className = "form-status " + cls; status.innerHTML = html; };
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = new FormData(form);
      if (!norm(data.get("message"))) { show("err", `<b>${L("ยังไม่ได้เขียนรายละเอียด", "Please add some details")}</b>${L("บอกสั้น ๆ ว่าเห็นอะไร หรืออยากบอกอะไร", "A line about what you saw or want to tell us is enough.")}`); msg.setAttribute("aria-invalid", "true"); msg.focus(); return; }
      msg.removeAttribute("aria-invalid");
      const payload = new URLSearchParams();
      ["type", "cat", "message", "place", "photo", "name", "contact", "website"].forEach((k) => payload.set(k, norm(data.get(k))));
      if (data.get("type") === "join" && norm(data.get("when"))) payload.set("message", payload.get("message") + "\nวันเวลาที่สะดวก: " + norm(data.get("when")));
      if (photoData) { payload.set("photoData", photoData); payload.set("photoName", (data.get("cat") || "cat") + ".jpg"); }
      payload.set("type", TYPES[data.get("type")] ? TYPES[data.get("type")].label : data.get("type")); // the review sheet stays in Thai
      payload.set("consent", data.get("consent") === "yes" ? "yes" : "no");
      payload.set("page", location.href);
      payload.set("lang", I.lang);
      if (!live) {
        const text = ["[" + payload.get("type") + "]", payload.get("cat") && "แมว: " + payload.get("cat"), payload.get("message"), payload.get("place") && "สถานที่: " + payload.get("place"), payload.get("photo") && "รูป: " + payload.get("photo"), payload.get("name") && "จาก: " + payload.get("name")].filter(Boolean).join("\n");
        let copied = false;
        try { await navigator.clipboard.writeText(text); copied = true; } catch (err) { /* clipboard blocked */ }
        show("info", `<b>${L("ระบบส่งอัตโนมัติยังไม่เปิด", "Automatic sending isn't on yet")}</b>${copied ? L("คัดลอกข้อความไว้ให้แล้ว ", "Your message has been copied. ") : ""}${L("ส่งให้ทีมผ่านช่องทางในหน้า", "Send it to the team through the")} <a href="#/about">${L("เกี่ยวกับเว็บนี้", "About page")}</a>`);
        return;
      }
      const btn = document.getElementById("fSubmit");
      btn.disabled = true; btn.textContent = L("กำลังส่ง…", "Sending…");
      const sentCat = D.cats.find((x) => x.name === data.get("cat"));
      try {
        // Apps Script web apps do not send CORS headers: no-cors delivers the post; the sheet is the receipt
        await fetch(CFG.SUBMIT_URL, { method: "POST", mode: "no-cors", body: payload });
        form.reset(); photoData = ""; gave(); const pv = document.getElementById("fPreview"); if (pv) pv.hidden = true;
        show("ok", `${cat("play", "ok-cat")}<div><b>${L("ได้รับแล้ว ขอบคุณมาก", "Got it, thank you")}</b>${L("สถานะ: รอทีมตรวจทาน", "Status: waiting for the team to review")}${data.get("type") === "sick" ? ` · ${L("ถ้าแมวอาการหนัก ทำตาม", "If the cat is badly unwell, follow the")}<a href="#/help">${L("ขั้นตอนเร่งด่วน", "urgent steps")}</a>${(isEN() ? "" : "ไปก่อนเลย")}` : ""}
          <span class="next-steps">${sentCat ? `<a class="btn ghost" href="${catHref(sentCat)}">${L(`กลับไปหน้า${sentCat.name}`, `Back to ${nm(sentCat)}`)}</a>` : ""}<button type="button" class="btn ghost" id="again">${L("ส่งอีกเรื่อง", "Send another")}</button><a class="btn ghost" href="#/">${L("หน้าแรก", "Home")}</a></span></div>`);
        const again = document.getElementById("again");
        if (again) again.addEventListener("click", () => { status.className = ""; status.innerHTML = ""; msg.focus(); });
      } catch (err) {
        show("err", `<b>${L("ส่งไม่สำเร็จ", "Couldn't send")}</b>${L("เช็กอินเทอร์เน็ตแล้วลองส่งใหม่ ข้อความยังอยู่ในฟอร์ม", "Check your connection and try again. Your message is still in the form.")}`);
      } finally {
        btn.disabled = false; btn.textContent = L("ส่งให้ทีม", "Send to the team");
      }
    });
  }

  /* ---------------- help ---------------- */
  function renderHelp() {
    const tok = renderToken;
    const contacts = (CFG.EMERGENCY_CONTACTS || []).filter((c) => norm(c.value));
    const kr = Object.values(CFG.KEEPER_ROLES || {}).find((r) => r && r.where);
    const step = (t, d) => `<li><div><b>${t}</b><span>${d}</span></div></li>`;
    app.innerHTML = `
      ${pageHead(L("เจอแมวป่วยหรือบาดเจ็บ", "You've found a sick or injured cat"), L("ทำตามนี้ก่อน แล้วค่อยติดต่อผู้ดูแลหรือสัตวแพทย์", "Do this first, then contact a keeper or a vet."))}
      <div class="help-grid">
        <ol class="steps">
          ${step(L("ถ้าแมวตกใจหรือขู่ อย่าเพิ่งจับ", "If it's scared or hissing, don't touch it"), L("แมวเจ็บอาจกัดหรือข่วน อยู่ห่างแค่พอเห็นอาการ", "A hurt cat may bite or scratch. Stay close enough to watch."))}
          ${step(L("ถ่ายรูป จดจุดที่เจอ", "Take a photo and note where it is"), L("ตัวไหน อยู่ตรงไหน อาการเป็นยังไง กี่โมง", "Which cat, where, what you saw, what time."))}
          ${step(L("ห้ามให้ยาคน", "Never give human medicine"), L("ยาบางตัว เช่น พาราเซตามอล เป็นพิษต่อแมวมาก", "Some, like paracetamol, are seriously toxic to cats."))}
          ${step(L("ติดต่อผู้ดูแลหรือสัตวแพทย์", "Contact a keeper or a vet"), L("ช่องทางอยู่ข้าง ๆ นี้", "See the contacts here."))}
          ${step(L("บอกทีมในเว็บ", "Tell the team here"), L("คนอื่นจะได้รู้ว่ามีคนดูแลแล้ว", "So others know someone is on it.") + ` <a href="${shareHref("sick")}">${L("แจ้งว่าแมวไม่สบาย", "Report a sick cat")}</a>`)}
        </ol>
        <aside class="help-side">
          <h2 class="label">${L("ติดต่อ", "Contacts")}</h2>
          ${contacts.map((c) => `<div class="contact-card"><b>${esc(en(c, "label"))}</b><p>${esc(en(c, "value"))}</p><p class="contact-links">${c.map ? `<a class="btn small" href="${esc(c.map)}" target="_blank" rel="noopener">${L("เปิดแผนที่", "Open map")}</a>` : ""}${c.href ? `<a href="${esc(c.href)}" target="_blank" rel="noopener">${L("ข้อมูลจากจุฬาฯ", "Chula's page")}</a>` : ""}</p></div>`).join("")}
          <div class="contact-card muted-card"><b>${L("ผู้ดูแลแมวในคณะ", "The faculty's cat keepers")}</b><p>${kr ? L(`ยังไม่มีเบอร์ที่ยืนยันแล้ว ระหว่างนี้ไปหาผู้ดูแลได้ที่${esc(kr.where)} (${esc(kr.role)}) หรือแจ้งทีมผ่าน`, `No confirmed number yet. For now, find a keeper at ${esc(en(kr, "where"))} (${esc(en(kr, "role")).replace(/^The /, "the ")}), or use the`) : L("ยังไม่มีเบอร์ที่ยืนยันแล้ว ระหว่างนี้แจ้งทีมผ่าน", "No confirmed number yet. For now, use the")} <a href="${shareHref("sick")}">${L("ฟอร์มแมวป่วย", "sick-cat form")}</a></p></div>
          <p class="muted small">${L("หน้านี้เป็นแนวทางเบื้องต้น ไม่ใช่การวินิจฉัยหรือรักษา ถ้าไม่แน่ใจ ปรึกษาสัตวแพทย์", "This page is basic guidance, not a diagnosis or treatment. If you're unsure, ask a vet.")}</p>
          <p><button type="button" class="btn ghost" id="posterBtn">${L("พิมพ์เป็นโปสเตอร์", "Print as a poster")}</button></p>
          <p class="more"><a href="#/article/a02">${L("สัญญาณว่าแมวอาจไม่สบาย", "Signs that a cat may be unwell")} →</a></p>
        </aside>
      </div>
      <div class="poster-foot print-only"><div id="helpQR"></div><p>${L("สแกนเพื่อเปิดหน้านี้ในมือถือ", "Scan to open this page on your phone")}<br><b>${esc(publicUrl("#/help").replace(/^https?:\/\//, ""))}</b></p></div>`;
    document.getElementById("posterBtn").addEventListener("click", () => {
      const el = document.getElementById("helpQR");
      const go = () => { document.body.classList.add("print-poster"); window.print(); setTimeout(() => document.body.classList.remove("print-poster"), 500); };
      if (el.childNodes.length) return go();
      loadScript(QR_JS).then(() => { if (tok !== renderToken) return; new QRCode(el, { text: publicUrl("#/help"), width: 160, height: 160, correctLevel: QRCode.CorrectLevel.M }); setTimeout(go, 150); }).catch(go);
    });
  }

  /* ---------------- who to ask (an expertise directory) ---------------- */
  function renderAsk() {
    const names = !!CFG.SHOW_KEEPER_NAMES;
    const roles = CFG.ROLES || [];
    const vet = (CFG.EMERGENCY_CONTACTS || []).find((c) => norm(c.value));
    const topics = [
      [L("แมวป่วยหรือบาดเจ็บ", "A sick or injured cat"), vet ? esc(en(vet, "label")) : L("สัตวแพทย์", "A vet"), "#/help", L("ทำอะไรก่อน", "What to do first")],
      [L("อยากไปช่วยดูแล หรือไปให้อาหารด้วยกัน", "Joining a feeding round"), roles[0] ? esc(en(roles[0], "role")) + " · " + esc(en(roles[0], "who")) : "", shareHref("join"), L("ขอนัด", "Ask to join")],
      [L("ข้อมูลในเว็บผิด หรืออยากเพิ่มเรื่อง", "Something's wrong, or you'd like to add something"), roles[1] ? esc(en(roles[1], "role")) + " · " + esc(en(roles[1], "who")) : "", shareHref("fix"), L("แจ้งทีม", "Tell the team")],
      [L("เรื่องเฉพาะของแมวแต่ละตัว", "Anything about one particular cat"), L("ผู้ดูแลหลักของตัวนั้น (ดูตารางด้านล่าง)", "That cat's main keeper (see below)"), "", ""]
    ];
    const here = D.cats.filter(SEEN_NOW).sort(byStatusThenName);
    const who = (c) => (c.caretakers ? keeperHtml(c.caretakers) : `<span class="muted">${L("ยังไม่รู้ว่าใครดูแลประจำ", "Not known yet")}</span>`);
    app.innerHTML = `
      ${pageHead(L("ถามใครดี", "Who to ask"), L("ความรู้บางอย่างยังอยู่ในหัวคน ไม่ได้อยู่ในเว็บ หน้านี้บอกว่าเรื่องไหนควรถามใคร ส่งคำถามผ่านทีมได้ ทีมจะไปถามให้แล้วเติมคำตอบไว้ในเว็บ", "Some knowledge still lives in people's heads, not on this site. This page shows who to ask about what. Send your question through the team; they'll ask and add the answer here."))}
      <section class="sec"><h2 class="label">${L("ตามเรื่อง", "By topic")}</h2>
        <dl class="ask-list">${topics.map(([t, w, h, cta]) => `<div><dt>${t}</dt><dd>${w}${h ? ` <a href="${h}">${cta} →</a>` : ""}</dd></div>`).join("")}</dl></section>
      <section class="sec"><h2 class="label">${L("ตามแมว", "By cat")}</h2>
        <p class="muted small">${names ? "" : L("ตอนนี้บอกเป็นตำแหน่งกับที่ที่หาตัวได้ ชื่อจริงจะแสดงเมื่อเจ้าของชื่ออนุญาตแล้ว", "For now this shows each keeper's role and where to find them. Names will appear once the keepers agree.")}</p>
        <ul class="ask-cats">${here.map((c) => `<li><a class="mini" href="${catHref(c)}">${portrait(c)}<span>${nmHtml(c)}</span></a><span class="ask-who">${who(c)}</span><a class="ask-q" href="${shareHref("question", c)}">${L("ถามเรื่องตัวนี้", "Ask about this cat")} →</a></li>`).join("")}</ul>
        <p class="more"><a href="${shareHref("story")}">${L("รู้ว่าใครดูแลตัวไหน? บอกทีมได้", "Know who looks after a cat? Tell the team")} →</a></p></section>`;
  }

  /* ---------------- about: the KM process made visible ---------------- */
  function renderAbout() {
    const keepers = [...new Set(D.cats.map((c) => c.caretakers).filter(Boolean))];
    // where each kind of data comes from; "kept in the site" is the normal case for tabs that have no sheet yet
    const st = (label, sample, url) => `<li><span>${label}</span><span class="${sample && norm(url) ? "flag-warn" : ""}">${!sample ? L("ชีตของทีม (ล่าสุด)", "Team sheet (live)") : norm(url) ? L("สำเนาสำรอง (โหลดชีตไม่ได้)", "Backup copy (sheet unreachable)") : L("เก็บไว้ในเว็บ", "Kept in the site")}</span></li>`;
    const steps = [
      [L("1. ระบุความรู้ที่สำคัญ", "1. Identify key knowledge"), L("มือใหม่ติดตรงไหน: ไม่รู้ชื่อแมว ไม่รู้ว่าตัวไหนทำหมันแล้ว ไม่รู้ว่าแมวป่วยต้องบอกใคร", "Where newcomers get stuck: not knowing the cats' names, which are spayed, or who to tell when one is sick."), [[L("หาแมว", "Find this cat"), "#/find"], [L("แมวป่วย", "Sick cat"), "#/help"]]],
      [L("2. สร้างและแสวงหาความรู้", "2. Create and acquire"), L("สัมภาษณ์ผู้ดูแลรุ่นก่อน รวบรวมรูปกับข้อมูลในชีต แล้วเรียบเรียงเป็นบทความ", "Interview experienced keepers, gather photos and the team's sheet, and write it up as articles."), [[L("เรื่องเล่าจากผู้ดูแล", "Keepers' stories"), "#/knowledge/experience"]]],
      [L("3. จัดเก็บ", "3. Store"), L("แมวแต่ละตัวมีหน้าของตัวเอง ความรู้แบ่งหมวดและติดแท็ก มีที่มา วันที่ และสถานะตรวจทาน ค้นได้จากสีขน จุดที่เจอ และนิสัย", "A page per cat; articles by category and tag, with source, date and review status; searchable by coat, place and personality."), [[L("แมวทั้งหมด", "All cats"), "#/cats"], [L("ความรู้", "Know-how"), "#/knowledge"]]],
      [L("4. แบ่งปัน", "4. Share"), L("ฟอร์มสั้น ๆ บอกเท่าที่รู้ ทีมตรวจก่อน แล้วขึ้นเว็บพร้อมเครดิต", "A short form: say what you know, the team checks it, then it goes up with credit."), [[L("เล่าต่อ", "Pass it on"), "#/live"], [L("เล่าให้ทีมฟัง", "Tell the team"), "#/share"]]],
      [L("5. นำไปใช้", "5. Use"), L("มือใหม่อ่าน 5 เรื่องก่อนไปดูแลแมว จนได้ไปดูแลจริงกับผู้ดูแลรุ่นก่อน แล้วเอาสิ่งที่ได้เรียนรู้กลับมาเติม", "Newcomers read the five things to know, go on a round with experienced keepers, then feed what they learn back in."), [[L("5 เรื่องก่อนไปดูแลแมว", "Five things before you start"), "#/start"], [L("ถามใครดี", "Who to ask"), "#/ask"]]]
    ];
    const list = (thKey, enKey) => esc(((isEN() && CFG[enKey]) || CFG[thKey] || []).join(", "));
    // placeholder names ("สมาชิกกลุ่ม 1") stay off the page until the real ones are filled in
    const team = esc(((isEN() && CFG.CREDITS_TEAM_EN) || CFG.CREDITS_TEAM || []).filter((n) => !/^(สมาชิกกลุ่ม|group member)\s*\d+$/i.test(norm(n))).join(", "));
    app.innerHTML = `
      ${pageHead(L("ทำไมถึงมีเว็บนี้", "Why this site exists"), L("เรื่องแมวในคณะมีคนรู้อยู่แล้ว แต่กระจายอยู่กับผู้ดูแลไม่กี่คนและในแชตหลายกลุ่ม นิสิตที่ช่วยดูแลก็เปลี่ยนรุ่นทุกปี จบไปทีความรู้ก็หายไปด้วย เว็บนี้เลยรวมทุกอย่างไว้ที่เดียว และเปิดให้ทุกคนช่วยเติม",
        "People already know a lot about the faculty's cats, but it's scattered across a few keepers and several group chats. The students who help change every year, and what they learned leaves when they graduate. This site gathers it in one place, and anyone can add to it."))}
      <div class="about-grid">
        <section>
          <h2 class="label">${L("5 ขั้นของการจัดการความรู้ อยู่ตรงไหนในเว็บ", "The five knowledge management steps, and where they live on the site")}</h2>
          <table class="km-table"><thead><tr><th scope="col">${L("ขั้น", "Step")}</th><th scope="col">${L("ทำอะไร", "What happens")}</th><th scope="col">${L("ดูได้ที่", "On the site")}</th></tr></thead>
            <tbody>${steps.map(([s, d, links]) => `<tr><td>${s}</td><td>${d}</td><td>${links.map(([t, h]) => `<a href="${h}">${t}</a>`).join("<br>")}</td></tr>`).join("")}</tbody></table>
          <p class="muted small">${L("ใช้ทั้งสองแบบ: เก็บความรู้ลงเว็บเป็นหลัก (codification) และพามือใหม่ไปเรียนกับผู้ดูแลตัวจริง (personalization) เพราะความรู้บางอย่างเขียนออกมาได้ไม่หมด",
            "Both approaches: mainly writing knowledge down here (codification), plus newcomers learning directly from experienced keepers (personalization), because some knowledge can't be fully written down.")}</p>
          <h2 class="label">${L("5 เรื่องก่อนไปดูแลแมว กับวงจร SECI", "The five things to know, and the SECI cycle")}</h2>
          <table class="km-table"><thead><tr><th scope="col">${L("เรื่อง", "Step")}</th><th scope="col">SECI</th></tr></thead>
            <tbody>${startSteps().map((x, i) => `<tr><td>${i + 1}. ${esc(x.title)}</td><td>${x.seci}</td></tr>`).join("")}</tbody></table>
          <h2 class="label">${L("ความรู้ในนี้มาจากไหน", "Where this knowledge comes from")}</h2>
          <ol class="kflow">
            <li><b>1</b><div><h3>${L("ฟังจากผู้ดูแล", "Listen to the keepers")}</h3><p>${L("สัมภาษณ์พี่ ๆ ที่ดูแลแมวมานาน ว่าแต่ละตัวเป็นยังไง ต้องระวังอะไร", "We interviewed long-time keepers about each cat and what to watch out for.")}</p></div></li>
            <li><b>2</b><div><h3>${L("จดให้เป็นระบบ", "Write it down properly")}</h3><p>${L("เก็บไว้ในชีตของทีมกับบทความ ค้นได้จากชื่อ สีขน และจุดที่เจอ", "It lives in the team's sheet and articles, searchable by name, coat and place.")}</p></div></li>
            <li><b>3</b><div><h3>${L("ทุกคนช่วยเติม", "Everyone adds to it")}</h3><p>${L("ใครเห็นอะไรใหม่ เล่าให้ทีมฟังได้ ทีมตรวจแล้วค่อยขึ้นเว็บพร้อมเครดิต", "Anyone can tell the team what they've seen; it goes up after review, with credit.")}</p></div></li>
          </ol>
        </section>
        <section>
          <h2 class="label">${L("ใครดูแลเรื่องอะไร", "Who looks after what")}</h2>
          <ul class="roles">${(CFG.ROLES || []).map((r) => `<li><b>${esc(en(r, "role"))}</b><span>${esc(en(r, "who"))}</span><span>${esc(en(r, "duty"))}</span></li>`).join("")}
            ${keepers.length ? `<li><b>${L("ผู้ดูแลหลัก", "Main keepers")}</b><span>${keepers.map(keeperHtml).join("; ")}</span><span><a href="#/ask">${L("ถามใครดี", "Who to ask")} →</a></span></li>` : ""}</ul>
          <p class="more"><a href="#/handover">${L("คู่มือส่งต่องานให้รุ่นถัดไป", "Handover guide for the next team")} →</a></p>
          <h2 class="label">${L("ขอบคุณ", "With thanks to")}</h2>
          <p>${list("CREDITS_KNOWLEDGE_HOLDERS", "CREDITS_KNOWLEDGE_HOLDERS_EN")}</p>
          <h2 class="label">${L("ทีมผู้จัดทำ", "Made by")}</h2>
          <p>${team ? team + "<br>" : ""}<span class="muted">${esc(L(CFG.COURSE || "", CFG.COURSE_EN))}</span></p>
          <h2 class="label">${L("สถานะข้อมูล", "Data status")}</h2>
          <ul class="data-status">${st(L("ข้อมูลแมว", "Cats"), D.samples.cats, CFG.SHEET_CSV_URL)}${st(L("ความรู้", "Know-how"), D.samples.articles, CFG.ARTICLES_CSV_URL)}${st(L("ประวัติการดูแล", "Care history"), D.samples.history, CFG.HISTORY_CSV_URL)}
            <li><span>${L("ตรวจข้อมูลแมวล่าสุด", "Cats last checked")}</span><span class="${stale(isoDate(CFG.DATA_CHECKED)) ? "flag-warn" : ""}">${isoDate(CFG.DATA_CHECKED) ? fmtDate(CFG.DATA_CHECKED) : L("ยังไม่ระบุ", "Not set")}</span></li>
            <li><span>${L("รูปแมว", "Photos")}</span><span>${window.CAT_PHOTO_SYNCED ? L("อัปเดต ", "Updated ") + fmtDate(window.CAT_PHOTO_SYNCED) : L("ยังไม่ได้อัปเดต", "Not synced yet")}</span></li>
            <li><span>${L("ฟอร์มรับเรื่อง", "Submissions")}</span><span class="${norm(CFG.SUBMIT_URL) ? "" : "flag-warn"}">${norm(CFG.SUBMIT_URL) ? L("เปิดอยู่", "On") : L("ยังไม่เปิด", "Not on yet")}</span></li>
            <li><span>${L("ภาษา", "Languages")}</span><span>${L("ไทย · อังกฤษ (ทีมแปลเอง)", "Thai · English (translated by the team)")}</span></li></ul>
        </section>
      </div>`;
  }

  /* ---------------- cat quiz: practise telling the cats apart (internalization) ----------------
     Each round sends an anonymous score to the team's submissions sheet, so the team can see whether
     people who use the site really learn the cats (first try vs later tries on the same device). */
  const QUIZ_KEY = "akc-quiz-v1";
  const shuffle = (list) => { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const quizPool = () => D.cats.filter((c) => SEEN_NOW(c) && c.photo);
  // a random photo of the cat, so the quiz is about the cat and not one picture
  const quizPic = (c) => { const g = c.gallery.length ? c.gallery[Math.floor(Math.random() * c.gallery.length)] : null; return g ? g.s : c.photo; };
  function quizQuestions() {
    const pool = quizPool(), qs = [];
    for (const c of shuffle(pool).slice(0, 5)) {
      // one look-alike (same coat) among the wrong answers, so it takes more than the colour to get it right
      const same = shuffle(pool.filter((o) => o !== c && o.coat === c.coat)).slice(0, 1);
      const rest = shuffle(pool.filter((o) => o !== c && !same.includes(o)));
      const opts = shuffle([c].concat(same, rest).slice(0, 4));
      qs.push({ kind: "name", cat: c, img: quizPic(c), opts: opts.map((o) => ({ label: nmHtml(o), ok: o === c })) });
    }
    // how to approach: prefer a cat that needs care, since that's the answer that matters
    const known = shuffle(D.cats.filter((c) => SEEN_NOW(c) && c.touch !== "unknown"));
    const t = known.find((c) => c.touch !== "yes") || known[0];
    if (t) qs.push({ kind: "touch", cat: t, img: t.photo ? quizPic(t) : "", opts: [
      ["yes", L("เป็นมิตร ยื่นมือให้ดมก่อน แล้วค่อยลูบ", "Friendly: offer a hand to sniff, then stroke")],
      ["careful", L("นั่งห่าง ๆ ให้น้องเข้ามาหาเองก่อน", "Sit a little way off and let it come to you")],
      ["no", L("ดูอยู่ห่าง ๆ ไม่จับเลย", "Watch from a distance; don't touch")]
    ].map(([k, label]) => ({ label: esc(label), ok: k === t.touch })) });
    const st = shuffle(D.cats.filter((c) => SEEN_NOW(c) && c !== t && (c.sterilised === "yes" || c.sterilised === "no")))[0];
    if (st) qs.push({ kind: "steril", cat: st, img: st.photo ? quizPic(st) : "", opts: [
      ["yes", L("ทำหมันแล้ว", "Yes, already")], ["no", L("ยังไม่ทำหมัน", "Not yet")]
    ].map(([k, label]) => ({ label: esc(label), ok: k === st.sterilised })) });
    return qs;
  }
  const quizAsk = (q) => ({
    name: L("แมวตัวนี้ชื่ออะไร", "What's this cat's name?"),
    touch: L(`เจอ${esc(q.cat.name)} ควรเข้าหายังไง`, `You meet ${esc(nm(q.cat))}. How should you approach?`),
    steril: L(`${esc(q.cat.name)}ทำหมันแล้วหรือยัง`, `Is ${esc(nm(q.cat))} spayed or neutered?`)
  }[q.kind]);
  const quizWhy = (q) => ({
    name: L(`ตัวนี้คือ${esc(q.cat.name)}`, `This is ${esc(nm(q.cat))}.`) + (q.cat.marks ? ` ${L("จุดสังเกต:", "How to spot:")} ${T(q.cat.marks)}` : ""),
    touch: approachFor(q.cat),
    steril: esc(STERIL()[q.cat.sterilised])
  }[q.kind]);

  function renderQuiz() {
    const tok = renderToken;
    const sends = !!norm(CFG.SUBMIT_URL);
    app.innerHTML = `
      ${pageHead(L("ทายแมว", "Cat quiz"),
        L(`ดูรูปแล้วทายว่าเป็นแมวตัวไหน ตามด้วยเรื่องที่ต้องรู้ก่อนเข้าหา${sends ? " ทำเสร็จแล้วเว็บจะส่งคะแนนให้ทีมแบบไม่มีชื่อ เพื่อดูว่าเว็บช่วยให้จำแมวได้จริงไหม" : ""}`,
          `Name the cat from its photo, then answer what you need to know before going near.${sends ? " When you finish, your score goes to the team without your name, so they can see whether the site really helps people learn the cats." : ""}`))}
      <div class="quiz" id="quiz"></div>`;
    const box = document.getElementById("quiz");
    if (quizPool().length < 2) { box.innerHTML = `<p class="empty">${L("ยังมีรูปแมวไม่พอให้ทาย", "Not enough cat photos for a quiz yet.")} <a href="#/cats">${L("ดูแมวทั้งหมด", "See all the cats")}</a></p>`; return; }
    let qs, i, right, missed, named;
    const begin = () => { qs = quizQuestions(); i = 0; right = 0; missed = []; named = []; show(); };
    function show() {
      const q = qs[i];
      box.innerHTML = `
        <p class="quiz-pos">${L(`ข้อ ${i + 1} จาก ${qs.length}`, `Question ${i + 1} of ${qs.length}`)}</p>
        <div class="quiz-q">
          ${q.img ? `<div class="portrait quiz-photo"><img src="${esc(q.img)}" alt="${q.kind === "name" ? L("แมวที่ต้องทายชื่อ", "The cat to name") : photoAlt(q.cat)}" width="400" height="500" decoding="async"></div>` : ""}
          <div>
            <h2 id="qH" tabindex="-1">${quizAsk(q)}</h2>
            <div class="quiz-opts" role="group" aria-labelledby="qH">${q.opts.map((o, k) => `<button type="button" class="quiz-opt" data-k="${k}">${o.label}</button>`).join("")}</div>
            <div class="quiz-fb" id="qFb" aria-live="polite"></div>
          </div>
        </div>`;
      if (i > 0) document.getElementById("qH").focus({ preventScroll: true });
      box.querySelector(".quiz-opts").addEventListener("click", (e) => {
        const b = e.target.closest(".quiz-opt");
        if (!b || b.disabled) return;
        const o = q.opts[+b.dataset.k];
        box.querySelectorAll(".quiz-opt").forEach((x, k) => { x.disabled = true; if (q.opts[k].ok) x.classList.add("right"); });
        if (o.ok) { right++; if (q.kind === "name") named.push(q.cat); } else { b.classList.add("wrong"); if (!missed.includes(q.cat)) missed.push(q.cat); }
        document.getElementById("qFb").innerHTML = `
          <p class="${o.ok ? "ok" : "bad"}"><b>${o.ok ? L("ถูก", "Right.") : L("ยังไม่ใช่", "Not quite.")}</b> ${quizWhy(q)}</p>
          <p class="quiz-next"><button type="button" class="btn" id="qNext">${i < qs.length - 1 ? L("ข้อต่อไป", "Next") : L("ดูคะแนน", "See your score")}</button>
            <a href="${catHref(q.cat)}">${L(`ดูหน้าของ${esc(q.cat.name)}`, `${esc(nm(q.cat))}'s page`)} →</a></p>`;
        const nx = document.getElementById("qNext");
        nx.focus({ preventScroll: true });
        nx.addEventListener("click", () => { i++; if (i < qs.length) show(); else finish(); });
      });
    }
    function finish() {
      const prev = store.get(QUIZ_KEY, { tries: 0, best: 0 });
      const tries = (prev.tries || 0) + 1;
      store.set(QUIZ_KEY, { tries, best: Math.max(prev.best || 0, right), last: right, of: qs.length });
      const met = metMap(), toMark = named.filter((c) => !met[c.id]);
      const all = right === qs.length;
      box.innerHTML = `
        <div class="quiz-done">
          <p class="quiz-score"><b>${right}</b> / ${qs.length}</p>
          <h2 tabindex="-1" id="qDone">${all ? L("ถูกหมดเลย", "All correct") : right * 2 >= qs.length ? L("เกือบแล้ว", "Nearly there") : L("ค่อย ๆ จำไป", "Keep at it")}</h2>
          <p>${all ? L("พร้อมไปเจอแมวตัวจริงแล้ว ลองขอไปให้อาหารกับผู้ดูแลสักรอบ", "You're ready to meet them for real. Ask to join a keeper on a feeding round.")
            : L("ตัวที่ยังพลาดอยู่ข้างล่าง เปิดดูหน้าของแต่ละตัว แล้วกลับมาทายใหม่", "The ones you missed are below. Look at their pages, then try again.")}</p>
          ${missed.length ? `<div class="mini-cats">${missed.map(miniCat).join("")}</div>` : ""}
          ${toMark.length ? `<p><button type="button" class="btn ghost" id="qMark">${L(`นับ ${toMark.map((c) => esc(c.name)).join(", ")} เป็นตัวที่จำได้แล้ว`, `Mark ${toMark.map((c) => esc(nm(c))).join(", ")} as known`)}</button></p>` : ""}
          <p class="actions"><button type="button" class="btn" id="qAgain">${L("ทายอีกรอบ", "Play again")}</button><a class="btn ghost" href="${all ? shareHref("join") : "#/start"}">${all ? L("ขอไปให้อาหารด้วยกัน", "Ask to join a round") : L("กลับไป 5 เรื่องก่อนไปดูแลแมว", "Back to the five things")}</a></p>
          <p class="muted small" id="qSent" aria-live="polite"></p>
        </div>`;
      document.getElementById("qDone").focus({ preventScroll: true });
      document.getElementById("qAgain").addEventListener("click", begin);
      const mk = document.getElementById("qMark");
      if (mk) mk.addEventListener("click", () => {
        const m = metMap(); toMark.forEach((c) => { m[c.id] = true; }); store.set(MET_KEY, m);
        mk.outerHTML = `<span class="met-count">${CHECK} ${L(`จำได้แล้ว ${Object.keys(m).length} ตัว`, `You know ${Object.keys(m).length} cats`)}</span>`;
      });
      // anonymous: the score, which try this is on this device, and which cats were missed
      if (sends) postQuick({ type: "ผลทายแมว", message: `ทายแมวได้ ${right}/${qs.length} · ครั้งที่ ${tries} บนเครื่องนี้ · กดจำได้แล้ว ${Object.keys(met).length} ตัว · พลาด: ${missed.map((c) => c.name).join(", ") || "-"}` })
        .then((ok) => { const el = document.getElementById("qSent"); if (ok && el && tok === renderToken) el.textContent = L("ส่งคะแนนให้ทีมแล้ว แบบไม่มีชื่อ", "Your score was sent to the team, without your name."); });
    }
    begin();
  }

  /* ---------------- handover: so the site outlives the team that built it ---------------- */
  function renderHandover() {
    const chk = isoDate(CFG.DATA_CHECKED);
    const names = (list) => list.map((c) => esc(nm(c))).join(", ");
    // work waiting for the content steward, worked out from the data itself
    const unreviewed = D.articles.filter((a) => reviewState(a) === "pending"), due = D.articles.filter((a) => reviewState(a) === "due");
    const noStatus = D.cats.filter((c) => c.status === "unknown");
    const noPhoto = D.cats.filter((c) => SEEN_NOW(c) && !c.photo);
    const noKeeper = D.cats.filter((c) => SEEN_NOW(c) && !c.caretakers);
    const emptyContacts = (CFG.EMERGENCY_CONTACTS || []).filter((c) => !norm(c.value));
    const todo = [
      !chk || stale(chk) ? [L(`ไล่ตรวจข้อมูลแมวทั้งชีตกับผู้ดูแล (ตรวจล่าสุด ${chk ? fmtDate(chk) : "ยังไม่ระบุ"})`, `Check every cat's details with the keepers (last checked ${chk ? fmtDate(chk) : "never"})`), "#/cats"] : null,
      unreviewed.length ? [L(`บทความที่ยังไม่มีผู้ดูแลตรวจทาน ${unreviewed.length} เรื่อง`, `${unreviewed.length} article${unreviewed.length > 1 ? "s" : ""} not yet reviewed by a keeper`), "#/knowledge"] : null,
      due.length ? [L(`บทความที่ตรวจไว้นานแล้ว ควรทบทวน ${due.length} เรื่อง`, `${due.length} article${due.length > 1 ? "s" : ""} due for a re-check`), "#/knowledge"] : null,
      noStatus.length ? [L(`แมวที่ยังไม่ระบุสถานะ: ${names(noStatus)}`, `Cats with no status: ${names(noStatus)}`), "#/cats?status=unknown"] : null,
      noPhoto.length ? [L(`แมวในคณะที่ยังไม่มีรูป: ${names(noPhoto)}`, `Cats at the faculty with no photo: ${names(noPhoto)}`), catHref(noPhoto[0])] : null,
      noKeeper.length ? [L(`แมวในคณะที่ยังไม่รู้ว่าใครดูแลประจำ ${noKeeper.length} ตัว`, `${noKeeper.length} cats at the faculty with no known main keeper`), "#/ask"] : null,
      !CFG.SHOW_KEEPER_NAMES ? [L("ขออนุญาตผู้ดูแลก่อนแสดงชื่อ (ตอนนี้เว็บบอกเป็นตำแหน่งแทน)", "Ask the keepers whether their names can be shown (the site shows roles for now)"), "#/ask"] : null,
      emptyContacts.length ? [L(`ช่องทางติดต่อที่ยังว่างใน config.js: ${emptyContacts.map((c) => esc(c.label)).join(", ")}`, `Contacts still empty in config.js: ${emptyContacts.map((c) => esc(en(c, "label"))).join(", ")}`), "#/help"] : null
    ].filter(Boolean);
    const col = (title, items) => `<div class="hand-col"><h3>${title}</h3><ul>${items.map((t) => `<li>${t}</li>`).join("")}</ul></div>`;
    const COLS = [
      ["ชื่อแมว", "Name", "ถ้าเปลี่ยนการสะกด เว็บยังจับคู่รูปกับประวัติเดิมได้", "If the spelling changes, the site still matches the old photos and history"],
      ["Status", "Status", "active (อยู่ในคณะ) · back home (ไปกลับ) · missing (หาย) · adopted (มีบ้าน) · passed away (จากไป)", "active · back home · missing · adopted · passed away"],
      ["แมวประจำคณะ (เพิ่มคอลัมน์เองได้)", "แมวประจำคณะ (add this column)", "ใช่ / ไม่ใช่ ใช้แทนการไฮไลต์สีเหลือง เว็บอ่านคอลัมน์นี้เองโดยไม่ต้องรันอะไร", "ใช่ (yes) / ไม่ใช่ (no). Use this instead of the yellow highlight: the site reads it directly, no script needed"],
      ["ทำหมัน · Vaccination Status", "ทำหมัน · Vaccination Status", "แล้ว / ยังไม่", "แล้ว (done) / ยังไม่ (not yet)"],
      ["Personality", "Personality", "Friendly · Approach with caution · Don't touch", "Friendly · Approach with caution · Don't touch"],
      ["Personal Information", "Personal Information", "ประวัติ และตัวที่ไม่ถูกกัน ขึ้นเป็นช่อง “ควรรู้ไว้”", "Background and which cats it doesn't get on with; shown as “Good to know”"],
      ["Usual locations", "Usual locations", "ใส่ชื่อตึก เช่น BRK, MCS, เทวาลัย แมวจะขึ้นบนแผนที่ 3D", "Name the building (BRK, MCS, Thewalai) and the cat appears on the 3D map"],
      ["Relationship", "Relationship", "“ลูกกะตั้ว” = แม่คือกะตั้ว · “พี่น้องกับตาต้า” = พี่น้อง", "“ลูกกะตั้ว” = Katua is the mother · “พี่น้องกับตาต้า” = sibling"],
      ["Primary caretaker(s)", "Primary caretaker(s)", "ชื่อหรือตำแหน่ง ชื่อจะขึ้นเว็บเมื่อเจ้าของชื่ออนุญาต (SHOW_KEEPER_NAMES)", "A name or role. Names appear only once the keeper agrees (SHOW_KEEPER_NAMES)"],
      ["Last seen date", "Last seen date", "วันที่แบบ 2026-11-12 (ค.ศ.-เดือน-วัน)", "A date like 2026-11-12"],
      ["Photo", "Photo", "ลิงก์โฟลเดอร์ Drive ของแมวตัวนั้น", "A link to that cat's Drive folder"],
      ["ตรวจล่าสุด (เพิ่มคอลัมน์เองได้)", "ตรวจล่าสุด (add this column)", "วันที่ตรวจแถวนั้นกับผู้ดูแล ถ้าไม่มี เว็บใช้ DATA_CHECKED ใน config.js", "When that row was checked with a keeper; without it the site uses DATA_CHECKED in config.js"]
    ];
    const repo = norm(CFG.REPO_URL);
    app.innerHTML = `
      ${pageHead(L("ส่งต่องานให้รุ่นถัดไป", "Handing over to the next team"),
        L("นิสิตที่ดูแลเว็บนี้ก็เปลี่ยนรุ่นเหมือนกัน หน้านี้สำหรับคนที่รับช่วงต่อ งานส่วนใหญ่ทำในชีตของทีม ไม่ต้องเขียนโค้ด",
          "The students who run this site move on too. This page is for whoever takes over. Most of the work happens in the team's sheet, with no code."))}
      <section class="sec"><h2 class="label">${L("ตอนนี้ใครดูแล", "Who looks after it now")}</h2>
        <ul class="roles">${(CFG.ROLES || []).map((r) => `<li><b>${esc(en(r, "role"))}</b><span>${esc(en(r, "who"))}</span><span>${esc(en(r, "duty"))}</span></li>`).join("")}</ul>
        <p class="muted small">${L("รายชื่อนี้แก้ได้ที่ช่อง ROLES ใน config.js", "Edit these names in ROLES in config.js.")}</p></section>
      ${todo.length ? `<section class="sec"><h2 class="label">${L(`งานที่ค้างอยู่ตอนนี้ (${todo.length})`, `Waiting to be done (${todo.length})`)}</h2>
        <p class="muted small">${L("เว็บนับจากข้อมูลเอง ทำเสร็จแล้วรายการจะหายไปเอง", "Worked out from the data; each item disappears once it's done.")}</p>
        <ul class="todo-list">${todo.map(([t, h]) => `<li><a href="${h}">${t}</a></li>`).join("")}</ul></section>` : ""}
      <section class="sec"><h2 class="label">${L("งานประจำ", "Routine")}</h2>
        <div class="hand-cols">
          ${col(L("ทุกสัปดาห์", "Every week"), [
            L("เปิดชีตรับเรื่อง ดูแถวที่สถานะ “รอตรวจ”", "Open the submissions sheet and look at rows marked “รอตรวจ” (waiting)."),
            L("เรื่องที่ถูกต้องและไม่มีข้อมูลส่วนตัว คัดลงชีตของทีมหรือเขียนเป็นบทความ แล้วเปลี่ยนสถานะเป็น “เผยแพร่แล้ว” เรื่องนั้นจะขึ้นในหน้าเล่าต่อเอง ส่วนเรื่องที่ไม่ใช้ เปลี่ยนเป็น “ไม่เผยแพร่”", "Copy anything accurate and free of personal details into the team's sheet or an article, then set its status to “เผยแพร่แล้ว” (published): it then appears on the Pass it on page. Set anything you won't use to “ไม่เผยแพร่”."),
            L("คำถามที่ส่งมาจากหน้า “ถามใครดี” เอาไปถามผู้ดูแล แล้วเติมคำตอบไว้ในเว็บ", "Take questions sent from “Who to ask” to the keepers, and add the answers to the site."),
            L("แมวที่ไม่มีใครกด “เห็นวันนี้” นานเกินสัปดาห์ ถามผู้ดูแล และแก้สถานะในชีตถ้าหายไปจริง", "If nobody has tapped “Saw … today” for a cat in over a week, ask the keepers and update its status if it's really gone.")
          ])}
          ${col(L("ทุกภาคเรียน", "Every semester"), [
            L("นั่งไล่ชีตกับผู้ดูแลทีละตัว: สถานะ ทำหมัน วัคซีน สุขภาพ ที่อยู่", "Go through the sheet with a keeper, cat by cat: status, spaying, vaccines, health, where it lives."),
            L(`ตรวจเสร็จแล้วแก้ DATA_CHECKED ใน config.js เป็นวันที่ตรวจ ถ้าเกิน ${REVIEW_DAYS} วัน เว็บจะขึ้นป้ายเตือนเอง`, `Then set DATA_CHECKED in config.js to that date. After ${REVIEW_DAYS} days the site warns visitors by itself.`),
            L("ให้ผู้ดูแลอ่านทวนบทความ ใส่ชื่อในช่อง reviewed_by และวันที่ในช่อง reviewed_on", "Ask a keeper to read the articles; put their name in reviewed_by and the date in reviewed_on."),
            L("ดูผล “ทายแมว” กับ “เรื่องนี้ช่วยได้ไหม” ในชีตรับเรื่อง เรื่องที่คนบอกว่ายังไม่ช่วย เอามาเติม", "Look at the quiz scores and “Did this help?” votes in the submissions sheet, and improve what people say didn't help.")
          ])}
          ${col(L("ก่อนรุ่นเดิมจบ", "Before you graduate"), [
            L("หาผู้รับช่วงอย่างน้อย 2 คน ถ้ามีคนเดียวแล้วเขาไม่ว่าง ทุกอย่างก็หยุด", "Find at least two people to take over. With only one, everything stops when they're busy."),
            L("โอนความเป็นเจ้าของชีตของทีม ชีตรับเรื่อง และสคริปต์ ไปที่บัญชีกลางของคณะหรือชมรม ไม่ใช่บัญชีส่วนตัวของใคร", "Move ownership of the team's sheet, the submissions sheet and the script to a shared faculty or club account, not anyone's personal one."),
            L("เพิ่มผู้รับช่วงเป็นผู้ดูแล repo บน GitHub แล้วแก้ชื่อในช่อง ROLES", "Add them as maintainers of the GitHub repo, and update ROLES."),
            L("พาผู้รับช่วงไปให้อาหารกับผู้ดูแลอย่างน้อยหนึ่งรอบ แล้วทำงานประจำสัปดาห์ด้วยกันสักครั้ง", "Take them on a feeding round with a keeper, and do one week's routine together.")
          ])}
        </div></section>
      <section class="sec"><h2 class="label">${L("กรอกชีตยังไง", "Filling in the sheet")}</h2>
        <p class="muted small">${L("แก้ชีตแล้วเว็บอัปเดตเองภายในไม่กี่นาที ลิงก์ชีตขอได้จากผู้ดูแลเนื้อหาคนปัจจุบัน (ไม่ได้ใส่ไว้ในเว็บ เพราะใครมีลิงก์ก็แก้ได้)", "Edits show up on the site within minutes. Ask the current content steward for the sheet link (it isn't on the site, because anyone with the link can edit).")}</p>
        <table class="km-table hand-table"><thead><tr><th scope="col">${L("คอลัมน์", "Column")}</th><th scope="col">${L("ใส่อะไร", "What to put")}</th></tr></thead>
          <tbody>${COLS.map(([th, enC, d, dEn]) => `<tr><td>${esc(L(th, enC))}</td><td>${esc(L(d, dEn))}</td></tr>`).join("")}</tbody></table></section>
      <section class="sec"><h2 class="label">${L("เรื่องที่ยังต้องแตะโค้ด (นาน ๆ ครั้ง)", "What still needs code (rarely)")}</h2>
        <ul class="hand-list">
          <li>${L("ชื่อผู้ดูแล ช่องทางติดต่อ วันที่ตรวจ: แก้ config.js บนหน้าเว็บ GitHub ได้เลย กดรูปดินสอ แก้ แล้วกด Commit", "Keeper names, contacts, the checked date: edit config.js on the GitHub website. Press the pencil, edit, then Commit.")}</li>
          <li>${L("รูปใหม่ในโฟลเดอร์ Drive: รัน python -I tools/sync_photos.py แล้ว push (ถ้าไม่รัน รูปเดิมก็ยังอยู่)", "New photos in a Drive folder: run python -I tools/sync_photos.py, then push. (If nobody does, the existing photos stay.)")}</li>
          ${repo ? `<li><a href="${esc(repo)}#readme" target="_blank" rel="noopener">${L("คู่มือฉบับเต็ม (README บน GitHub)", "The full guide (README on GitHub)")}</a></li>` : ""}
        </ul></section>`;
  }

  /* ---------------- the journey: the four steps of the keepers' knowledge loop ----------------
     Every page belongs to one step. The nav lists the steps in order, the home page shows the visitor's progress
     through them, and step pages end with the next step, so a visitor always knows where they are and what's next. */
  const READ_KEY = "akc-read-v1", GAVE_KEY = "akc-gave-v1";
  const STAGES = [
    { key: "know", href: "#/cats", t: "รู้จักแมว", en: "Meet the cats", d: "แมวแต่ละตัวชื่ออะไร อยู่ตรงไหน เข้าหาได้ไหม", dEn: "Each cat's name, where it lives, and whether you can go near" },
    { key: "learn", href: "#/knowledge", t: "เรียนรู้", en: "Learn", d: "สิ่งที่ผู้ดูแลรู้จากการอยู่กับแมวทุกวัน", dEn: "What the keepers know from being with the cats every day" },
    { key: "care", href: "#/start", t: "ลงมือดูแล", en: "Help out", d: "เตรียมตัวให้พร้อม แล้วไปดูแลจริงกับผู้ดูแลรุ่นก่อน", dEn: "Get ready, then go on a round with an experienced keeper" },
    { key: "share", href: "#/live", t: "เล่าต่อ", en: "Pass it on", d: "บอกว่าเห็นอะไร รู้อะไร ให้รุ่นถัดไปได้ใช้ต่อ", dEn: "Say what you saw and learned, so the next keepers can use it" }
  ];
  const STAGE_OF = { cats: "know", cat: "know", find: "know", quiz: "know", graph: "know", family: "know", knowledge: "learn", article: "learn", start: "care", ask: "care", help: "care", live: "share", share: "share", report: "share", handover: "share" };
  // stage pages that end with the "next step" card (a cat's page has its own pager; forms and the sick-cat page stay focused)
  const NEXT_ON = ["cats", "find", "graph", "family", "knowledge", "article", "start", "ask", "live"];
  const stageTitle = (s) => L(s.t, s.en);
  function stageProgress(key) {
    if (key === "know") {
      const met = metMap(), now = D.cats.filter(SEEN_NOW), v = now.filter((c) => met[c.id]).length;
      return { v, of: now.length, text: L(`จำได้แล้ว ${v} จาก ${now.length} ตัว`, `You know ${v} of ${now.length}`) };
    }
    if (key === "learn") {
      const r = store.get(READ_KEY, {}), v = D.articles.filter((a) => r[a.id]).length;
      return { v, of: D.articles.length, text: L(`อ่านแล้ว ${v} จาก ${D.articles.length} เรื่อง`, `Read ${v} of ${D.articles.length}`) };
    }
    if (key === "care") {
      const steps = startSteps(), d = store.get(START_KEY, {}), v = steps.filter((s) => d[s.id]).length;
      return { v, of: steps.length, text: L(`เตรียมตัวแล้ว ${v} จาก ${steps.length} ข้อ`, `${v} of ${steps.length} steps done`) };
    }
    const v = store.get(GAVE_KEY, 0);
    return { v, of: 3, text: v ? L(`เล่าให้ทีมแล้ว ${v} ครั้ง`, `Shared with the team ${v} time${v > 1 ? "s" : ""}`) : L("ยังไม่เคยเล่า", "Nothing shared yet") };
  }
  const gave = () => store.set(GAVE_KEY, store.get(GAVE_KEY, 0) + 1);
  // the step to suggest: the first one not started yet, else the least finished
  function nextStage() {
    const p = STAGES.map((s) => ({ s, p: stageProgress(s.key) }));
    const fresh = p.find((x) => !x.p.v);
    return (fresh || p.slice().sort((a, b) => a.p.v / (a.p.of || 1) - b.p.v / (b.p.of || 1))[0]).s;
  }
  function nextCard(key) {
    const i = STAGES.findIndex((s) => s.key === key), nx = STAGES[(i + 1) % STAGES.length], last = i === STAGES.length - 1;
    return `<nav class="next-stage" aria-label="${L("ขั้นต่อไป", "Next step")}">
      <ol class="stage-dots">${STAGES.map((s, k) => `<li class="${k === i ? "on" : ""}"${k === i ? ' aria-current="step"' : ""}><a href="${s.href}"><span>${k + 1}</span>${esc(stageTitle(s))}</a></li>`).join("")}</ol>
      <a class="next-go" href="${nx.href}"><span><small>${last ? L("เริ่มรอบใหม่", "Round again") : L("ขั้นต่อไป", "Next step")}</small><b>${(i + 1) % STAGES.length + 1}. ${esc(stageTitle(nx))}</b><span>${esc(last ? L("สิ่งที่คุณเล่าไว้ จะเป็นจุดเริ่มของมือใหม่รุ่นถัดไป", "What you passed on is where the next newcomer starts.") : L(nx.d, nx.dEn))}</span></span><span class="go" aria-hidden="true">→</span></a>
    </nav>`;
  }

  /* ---------------- live feed: what people tell the team, shown back to everyone ----------------
     The submissions script publishes only cat + time for "seen today" taps, counts per type, and the stories
     the content steward has marked "เผยแพร่แล้ว" (tools/submissions.gs, ?feed=1). Without it, pages work as before. */
  let FEED = null;
  const FEED_KEY = "akc-feed-v1";
  const fold = window.CatData.fold;
  const sameCat = (name, c) => !!name && (name === c.name || fold(name) === fold(c.name));
  const catNamed = (name) => D.cats.find((c) => sameCat(name, c));
  const feedSeen = (c) => { const s = FEED && FEED.seen && FEED.seen.find((x) => sameCat(x.cat, c)); return s ? s.t : ""; };
  function relTime(iso) {
    const ms = Date.now() - new Date(iso).getTime();
    if (!(ms >= 0) || norm(iso).length <= 10) return fmtDate(iso);
    const m = Math.round(ms / 6e4), h = Math.round(ms / 36e5), d = Math.floor(ms / 864e5);
    if (m < 2) return L("เมื่อสักครู่", "just now");
    if (m < 60) return L(`${m} นาทีก่อน`, `${m} min ago`);
    if (h < 24) return L(`${h} ชม. ก่อน`, `${h} h ago`);
    if (d < 7) return d === 1 ? L("เมื่อวาน", "yesterday") : L(`${d} วันก่อน`, `${d} days ago`);
    return fmtDate(iso);
  }
  async function loadFeed() {
    const url = norm(CFG.SUBMIT_URL);
    if (!url) return;
    const kept = session.get(FEED_KEY);
    if (kept && kept.data && Date.now() - kept.at < 120000) { FEED = kept.data; return; }
    try {
      const r = await fetch(url + (url.includes("?") ? "&" : "?") + "feed=1", { cache: "no-store" });
      const j = await r.json();
      if (!j || !Array.isArray(j.seen)) return; // the script has no feed yet
      FEED = j;
      session.set(FEED_KEY, { at: Date.now(), data: j });
      const page = location.hash.replace(/^#\/?/, "").split(/[/?]/)[0];
      const busy = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
      if (["", "live", "cats", "cat"].includes(page) && !busy) { const y = window.scrollY; route({ keepScroll: true }); window.scrollTo(0, y); }
    } catch (e) { /* offline or not deployed: no feed */ }
  }
  // a tap from this device shows at once, before the feed catches up
  function noteSeen(c) {
    FEED = FEED || { seen: [], posts: [], counts: {} };
    FEED.seen.unshift({ t: new Date().toISOString(), cat: c.name });
    FEED.counts[TYPES.sighting.label] = (FEED.counts[TYPES.sighting.label] || 0) + 1;
    session.set(FEED_KEY, { at: 0, data: FEED });
  }
  const typeLbl = (label) => { const k = Object.keys(TYPES).find((x) => TYPES[x].label === label); return k ? L(TYPES[k].label, TYPES[k].en) : esc(label); };
  function activity(limit) {
    const items = [], day = new Set();
    ((FEED && FEED.seen) || []).forEach((s) => {
      const c = catNamed(s.cat);
      if (!c) return;
      const k = c.id + s.t.slice(0, 10);
      if (day.has(k)) return; // one line per cat per day
      day.add(k);
      items.push({ t: s.t, kind: "seen", html: L(`มีคนเห็น <a href="${catHref(c)}"><b>${esc(c.name)}</b></a>${c.locations[0] ? ` <span class="muted">· ปกติอยู่แถว ${T(c.locations[0])}</span>` : ""}`, `Someone saw <a href="${catHref(c)}"><b>${esc(nm(c))}</b></a>`) });
    });
    ((FEED && FEED.posts) || []).forEach((p) => {
      const c = catNamed(p.cat);
      items.push({ t: p.t, kind: "post", html: `${c ? `<a href="${catHref(c)}"><b>${nmHtml(c)}</b></a> · ` : ""}<span class="t-type">${typeLbl(p.type)}</span>${esc(p.text)}${p.by ? `<span class="t-by">${L("เล่าโดย ", "From ")}${esc(p.by)}</span>` : ""}` });
    });
    D.history.forEach((h) => {
      const c = D.byId[h.cat];
      items.push({ t: h.date, kind: "note", html: `${c ? `<a href="${catHref(c)}"><b>${nmHtml(c)}</b></a> · ` : ""}<span class="t-type">${L(HISTORY_TYPES[h.type], HISTORY_EN[h.type])}</span>${T(h.note)}` });
    });
    return items.sort((a, b) => (a.t < b.t ? 1 : a.t > b.t ? -1 : 0)).slice(0, limit);
  }
  const activityHtml = (list) => (list.length
    ? `<ol class="timeline feed">${list.map((x) => `<li class="f-${x.kind}"><time datetime="${esc(x.t)}">${relTime(x.t)}</time><div>${x.html}</div></li>`).join("")}</ol>`
    : `<p class="muted">${L("ยังไม่มีความเคลื่อนไหว", "Nothing yet")}</p>`);
  function countsHtml() {
    const c = (FEED && FEED.counts) || null;
    if (!c) return "";
    const rows = [
      [c[TYPES.sighting.label] || 0, L("ครั้งที่มีคนบอกว่าเห็นแมว", "sightings")],
      [Object.keys(TYPES).filter((k) => k !== "sighting").reduce((n, k) => n + (c[TYPES[k].label] || 0), 0), L("เรื่อง รูป และคำถามที่ส่งมา", "stories, photos and questions")],
      [c["ผลทายแมว"] || 0, L("รอบที่มีคนทายแมว", "quiz rounds played")],
      [c["ความเห็นต่อบทความ"] || 0, L("คนบอกว่าบทความช่วยได้ไหม", "article votes")]
    ];
    return `<h2 class="label">${L(`${FEED.days || 30} วันที่ผ่านมา ช่วยกันเติม`, `In the last ${FEED.days || 30} days`)}</h2><dl class="stats live-stats">${rows.map(([n, t]) => `<div><dt>${n}</dt><dd>${t}</dd></div>`).join("")}</dl>`;
  }

  /* ---------------- home: what this is, and the four steps with the visitor's progress ---------------- */
  function renderHome() {
    const met = metMap(), nx = nextStage();
    const here = D.cats.filter(SEEN_NOW).sort((a, b) => (b.resident ? 1 : 0) - (a.resident ? 1 : 0) || (b.photo ? 1 : 0) - (a.photo ? 1 : 0) || byStatusThenName(a, b));
    const G = buildGraph(), nCat = G.nodes.filter((n) => n.kind === "cat").length;
    const loop = STAGES.map((s, i) => {
      const p = stageProgress(s.key), pct = p.of ? Math.min(1, p.v / p.of) : 0, isNext = s === nx;
      return `<li class="stage${isNext ? " is-next" : ""}"><a href="${s.href}">
        <span class="stage-n" aria-hidden="true">${i + 1}</span>
        <h3><span class="sr">${L(`ขั้นที่ ${i + 1}`, `Step ${i + 1}`)}: </span>${esc(stageTitle(s))}</h3>
        <p>${esc(L(s.d, s.dEn))}</p>
        <span class="stage-p"><span class="meter" aria-hidden="true"><i style="width:${pct * 100}%"></i></span>${esc(p.text)}</span>
        ${isNext ? `<span class="stage-go">${p.v ? L("ทำต่อ", "Continue") : L("เริ่มตรงนี้", "Start here")} →</span>` : ""}
      </a></li>`;
    }).join("");
    app.innerHTML = `
      <section class="hello">
        ${cat("sit", "hello-cat")}
        <h1>${L("ความรู้เรื่องแมวในคณะ<br>ส่งต่อจากรุ่นสู่รุ่น", "Cat know-how at Arts,<br>passed on year to year")}</h1>
        <p class="lede">${L("นิสิตที่ช่วยดูแลแมวในคณะเปลี่ยนรุ่นทุกปี เว็บนี้คือสมุดที่ผู้ดูแลแต่ละรุ่นช่วยกันเขียนต่อ ไล่ไปทีละขั้น จากรู้จักแมว จนถึงเล่าต่อให้รุ่นถัดไป",
          "The students who help with the faculty's cats change every year. This site is the notebook each year's keepers add to. Go one step at a time, from meeting the cats to passing on what you learned.")}</p>
        <form class="k-search hero-search" id="homeAsk" role="search" aria-label="${L("ค้นในคลัง", "Search the hub")}">
          <label class="sr" for="homeQ">${L("ค้นแมวหรือความรู้", "Search cats or know-how")}</label>${SEARCH_SVG}
          <input id="homeQ" type="search" placeholder="${L("ชื่อแมว จุดที่เจอ หรือเรื่องที่อยากรู้", "A cat's name, a place, or a question")}" autocomplete="off" enterkeyhint="search">
          <button class="btn" type="submit">${L("ค้นหา", "Search")}</button>
        </form>
      </section>
      <a class="urgent-bar" href="#/help"><span class="task-ico">${ICON.help}</span><span><b>${L("แมวป่วยหรือบาดเจ็บอยู่ตอนนี้?", "Is a cat sick or hurt right now?")}</b> ${L("ดูว่าต้องทำอะไรก่อน และติดต่อใคร", "See what to do first and who to call")}</span><span aria-hidden="true">→</span></a>

      <section class="sec" aria-labelledby="loopH">
        <div class="sec-head"><h2 id="loopH">${L("4 ขั้น จากมือใหม่เป็นผู้ดูแล", "Four steps from newcomer to keeper")}</h2><p>${L("เมนูด้านบนเรียงตาม 4 ขั้นนี้ ความคืบหน้าบันทึกไว้ในเครื่องนี้", "The menu follows these four steps. Your progress is saved on this device.")}</p></div>
        <ol class="loop">${loop}</ol>
        <p class="loop-back"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v5h-5"/></svg>${L("ขั้นที่ 4 ของคุณ คือขั้นที่ 1 ของมือใหม่รุ่นถัดไป", "Your step 4 is the next newcomer's step 1")}</p>
      </section>

      <section class="sec home-split">
        <div>
          <div class="toolbar"><h2>${L("ล่าสุดในคณะ", "Latest at the faculty")}</h2><a href="#/live">${L("ดูทั้งหมด", "See all")} →</a></div>
          ${activityHtml(activity(5))}
          <p class="more"><a href="#/live">${L("เห็นแมววันนี้? แตะบอกได้เลย", "Saw a cat today? Tap to tell us")} →</a></p>
        </div>
        <a class="graph-card" href="#/graph">
          <svg class="graph-art" viewBox="0 0 200 120" aria-hidden="true"><g class="ga-l"><path d="M40 60 100 30 160 58 112 92 40 60 M100 30 112 92 M160 58 176 100 M40 60 22 98 M100 30 92 8"/></g><g class="ga-n"><circle cx="40" cy="60" r="11"/><circle cx="100" cy="30" r="13"/><circle cx="160" cy="58" r="11"/><circle cx="112" cy="92" r="9"/></g><g class="ga-s"><rect x="164" y="94" width="24" height="12" rx="4"/><rect x="10" y="92" width="24" height="12" rx="4"/><rect x="80" y="2" width="24" height="12" rx="4"/></g></svg>
          <h3>${L("ผังความรู้", "Knowledge map")}</h3>
          <p>${L(`แมว ${nCat} ตัว เชื่อมกับครอบครัว เพื่อน ที่อยู่ ผู้ดูแล และบทความ รวม ${G.edges.length} เส้น ดูว่าใครเป็นแม่ลูก ใครไม่ถูกกัน และเรื่องไหนพูดถึงตัวไหน`, `${nCat} cats linked to family, friends, places, keepers and articles: ${G.edges.length} links. See who is whose kitten, who doesn't get on, and which story is about whom.`)}</p>
          <span class="stage-go">${L("เปิดผัง", "Open the map")} →</span>
        </a>
      </section>

      <section class="sec">
        <div class="toolbar"><h2>${L("ตอนนี้อยู่ในคณะ", "At the faculty now")}</h2><a href="#/cats">${L(`ดูทั้งหมด ${D.cats.length} ตัว`, `All ${D.cats.length} cats`)} →</a></div>
        <div class="strip">${here.map((c) => catCard(c, null, "", met)).join("")}</div>
      </section>`;
    document.getElementById("homeAsk").addEventListener("submit", (e) => { e.preventDefault(); const q = norm(document.getElementById("homeQ").value); if (q) location.hash = "#/search/" + enc(q); });
  }

  /* ---------------- step 4, pass it on: one-tap sightings, ways to share, and what others shared ---------------- */
  function renderLive() {
    const sends = !!norm(CFG.SUBMIT_URL);
    const today = new Date().toISOString().slice(0, 10);
    const here = D.cats.filter(SEEN_NOW).sort(byStatusThenName);
    const tapKey = (c) => "akc-seen-" + c.id + "-" + today;
    const tapNote = (c) => (store.get(tapKey(c), false) ? L("บอกแล้ววันนี้", "Sent today") : feedSeen(c) ? L("เห็นล่าสุด ", "Last seen ") + relTime(feedSeen(c)) : L("แตะเพื่อบอก", "Tap to tell"));
    const WAYS = [
      ["story", ICON.experience, L("เคล็ดลับหรือเรื่องที่เจอ", "A tip or a story"), L("ปกติแมวตัวนี้ทำอะไร เคยแก้ปัญหาอะไรได้", "What a cat usually does, or a problem you solved")],
      ["photo", ICON.cats, L("ส่งรูปแมว", "Send a photo"), L("ตัวที่ยังไม่มีรูป หรือรูปที่ชัดกว่าเดิม", "For a cat with no photo, or a clearer one")],
      ["question", ICON.book, L("ถามผู้ดูแล", "Ask the keepers"), L("ทีมจะไปถาม แล้วเติมคำตอบไว้ในเว็บ", "The team asks, then adds the answer here")],
      ["newcat", ICON.find, L("เจอแมวที่ยังไม่มีในเว็บ", "A cat that isn't listed"), L("สีขน หน้าตา เจอที่ไหน", "Coat, looks, where you saw it")],
      ["fix", ICON.start, L("ข้อมูลผิด", "Something's wrong"), L("ตรงไหนผิด แล้วที่ถูกคืออะไร", "What's wrong, and what's right")],
      ["join", ICON.family, L("อยากไปช่วยดูแล", "I'd like to help"), L("ขอไปให้อาหารกับผู้ดูแลสักรอบ", "Join a keeper on a feeding round")]
    ];
    app.innerHTML = `
      ${pageHead(L("เล่าต่อ", "Pass it on"), L("ความรู้ในเว็บนี้โตได้เพราะคนที่เจอแมวทุกวันช่วยกันเล่า แตะว่าเห็นแมวตัวไหน ขึ้นฟีดด้านล่างได้เลย ส่วนเรื่องเล่า รูป และคำถาม ผู้ดูแลเนื้อหาจะตรวจก่อนขึ้นเว็บ",
        "This site grows because the people who see the cats every day tell us what they see. Tap a cat you saw and it shows in the feed below. Stories, photos and questions are checked by the content steward first."))}
      ${sends ? `<section class="sec"><h2 class="label">${L("วันนี้เห็นตัวไหนบ้าง", "Who did you see today?")}</h2>
        <div class="seen-grid">${here.map((c) => `<button type="button" class="seen-tap" data-id="${esc(c.id)}" aria-pressed="${!!store.get(tapKey(c), false)}">${portrait(c)}<span class="st-name">${nmHtml(c)}</span><small>${tapNote(c)}</small></button>`).join("")}</div></section>` : ""}
      <section class="sec"><h2 class="label">${L("อยากเล่ามากกว่านั้น", "Want to tell us more?")}</h2>
        <div class="ways">${WAYS.map(([k, ico, t, d]) => `<a class="way" href="${shareHref(k)}"><span class="task-ico">${ico}</span><b>${t}</b><span>${d}</span></a>`).join("")}</div></section>
      <section class="sec live-split">
        <div><h2 class="label">${L("ล่าสุดในคณะ", "Latest at the faculty")}</h2><div id="liveFeed">${activityHtml(activity(20))}</div></div>
        <aside>${countsHtml()}
          <p class="muted small">${L("เรื่องที่ส่งมาเข้าชีตส่วนตัวของทีมก่อน ชื่อและช่องทางติดต่อของคุณไม่ขึ้นเว็บ ยกเว้นคุณอนุญาตให้ใส่ชื่อเป็นเครดิต", "Everything goes to the team's private sheet first. Your name and contact never appear unless you allow a credit.")}</p>
          <p class="more"><a href="#/handover">${L("ใครตรวจเรื่องที่ส่งมา", "Who reviews what's sent")} →</a></p></aside>
      </section>`;
    app.querySelectorAll(".seen-tap").forEach((b) => b.addEventListener("click", async () => {
      const c = D.byId[b.dataset.id];
      if (store.get(tapKey(c), false)) { toast(L(`วันนี้บอกทีมแล้วว่าเห็น${esc(c.name)} ขอบคุณนะ`, `Already sent today, thank you`)); return; }
      b.disabled = true;
      const ok = await postQuick({ type: TYPES.sighting.label, cat: c.name, message: `เห็น${c.name}วันนี้ (กดจากหน้าเล่าต่อ)` });
      b.disabled = false;
      if (!ok) { toast(L("ส่งไม่สำเร็จ ลองใหม่อีกที", "Couldn't send. Try again.")); return; }
      store.set(tapKey(c), true); gave(); noteSeen(c);
      b.setAttribute("aria-pressed", "true"); b.querySelector("small").textContent = tapNote(c);
      const f = document.getElementById("liveFeed"); if (f) f.innerHTML = activityHtml(activity(20));
      toast(L(`ส่งแล้ว ขอบคุณที่บอกว่าเห็น${esc(c.name)}`, `Sent. Thanks for telling us about ${esc(nm(c))}`));
    }));
  }

  /* ---------------- knowledge map: cats, places, keepers and know-how, and how they connect ----------------
     Built from the sheet (family, Personal Information, locations, keepers) and the library (articles, topics). */
  const EDGE_KINDS = () => ({
    mother: { t: L("แม่ลูก", "Mother and kitten"), g: "family" },
    sibling: { t: L("พี่น้อง", "Siblings"), g: "family" },
    friend: { t: L("เพื่อนสนิท", "Close friends"), g: "social" },
    rival: { t: L("ไม่ค่อยถูกกัน", "Don't get on"), g: "social" },
    place: { t: L("อยู่ที่", "Lives at"), g: "place" },
    keeper: { t: L("ผู้ดูแลหลัก", "Main keeper"), g: "keeper" },
    about: { t: L("บทความที่พูดถึง", "Written about in"), g: "know" },
    topic: { t: L("หมวดของบทความ", "Article topic"), g: "know" }
  });
  const KG_GROUPS = () => [["family", L("ครอบครัว", "Family")], ["social", L("เพื่อน / ไม่ถูกกัน", "Friends and rivals")], ["place", L("ที่อยู่", "Places")], ["keeper", L("ผู้ดูแล", "Keepers")], ["know", L("ความรู้", "Know-how")]];
  const NODE_GROUP = { place: "place", keeper: "keeper", article: "know", topic: "know" };
  let network = null;
  const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  function buildGraph() {
    const nodes = [], edges = [], ids = new Set(), keys = new Set();
    const add = (n) => { if (!ids.has(n.id)) { ids.add(n.id); nodes.push(n); } };
    const link = (from, to, kind, both) => {
      const k = (both ? [from, to].sort().join("|") : from + ">" + to) + kind;
      if (!keys.has(k)) { keys.add(k); edges.push({ id: "e" + edges.length, from, to, kind }); }
    };
    D.cats.forEach((c) => add({ id: "c:" + c.id, kind: "cat", cat: c, label: nm(c) }));
    D.cats.forEach((c) => {
      if (c.mother && D.byId[c.mother]) link("c:" + c.mother, "c:" + c.id, "mother");
      (c.siblings || []).forEach((o) => { if (D.byId[o]) link("c:" + c.id, "c:" + o, "sibling", true); });
      // friends and rivals, from what the team wrote: "ไม่ค่อยถูกกับชาบูและมีบุญ", "เป็นเพื่อนสนิทกับกระทง"
      [c.about, c.relationship, c.personality, c.notes].concat(c.interview || []).join(" ").split(/\s+/).forEach((tok) => {
        const f = fold(tok), rival = /ไม่(ค่อย)?ถูกกับ/.test(f), friend = /เพื่อนสนิท|สนิทกับ/.test(f);
        if (!rival && !friend) return;
        D.cats.forEach((o) => { if (o !== c && o.name.length > 1 && f.includes(fold(o.name))) link("c:" + c.id, "c:" + o.id, rival ? "rival" : "friend", true); });
      });
      c.areas.forEach((a) => { add({ id: "p:" + a, kind: "place", area: a, label: shortArea(a) }); link("c:" + c.id, "p:" + a, "place"); });
      if (c.caretakers) {
        const r = keeperRole(c.caretakers), id = "k:" + oneSpace(c.caretakers);
        const role = r ? en(r, "role").split(/,| กับ/)[0] : "";
        add({ id, kind: "keeper", text: c.caretakers, label: CFG.SHOW_KEEPER_NAMES ? Tp(c.caretakers) : role || L("ผู้ดูแลหลัก", "Main keeper") });
        link(id, "c:" + c.id, "keeper");
      }
    });
    D.articles.forEach((raw) => {
      const a = art(raw);
      add({ id: "a:" + a.id, kind: "article", article: a, label: a.title });
      add({ id: "t:" + a.category, kind: "topic", topic: a.category, label: lbl(CATEGORIES[a.category]) });
      link("a:" + a.id, "t:" + a.category, "topic");
      a.relatedCats.forEach((k) => { if (D.byId[k]) link("a:" + a.id, "c:" + k, "about"); });
    });
    return { nodes, edges };
  }
  const nodeHref = (n) => ({ cat: () => catHref(n.cat), place: () => `#/cats?area=${n.area}`, keeper: () => "#/ask", article: () => `#/article/${enc(n.article.id)}`, topic: () => `#/knowledge/${n.topic}` }[n.kind]());
  const nodeKind = (n) => ({ cat: L("แมว", "Cat"), place: L("ที่อยู่", "Place"), keeper: L("ผู้ดูแล", "Keeper"), article: L("บทความ", "Article"), topic: L("หมวดความรู้", "Topic") }[n.kind]);
  const nodeOpen = (n) => ({ cat: L("เปิดหน้าแมว", "Open the cat's page"), place: L("ดูแมวที่อยู่ที่นี่", "See the cats here"), keeper: L("ถามใครดี", "Who to ask"), article: L("อ่านบทความ", "Read the article"), topic: L("เปิดหมวดนี้", "Open this topic") }[n.kind]);
  // one connection, read from one end: "แม่ของตีตี้", "ไม่ค่อยถูกกับชาบู", "อยู่ที่ BRK"
  function edgeText(e, fromSelf) {
    const K = EDGE_KINDS();
    if (e.kind === "mother") return fromSelf ? L("แม่ของ", "Mother of") : L("ลูกของ", "Kitten of");
    if (e.kind === "about") return fromSelf ? L("พูดถึง", "About") : L("มีในบทความ", "In the article");
    if (e.kind === "topic") return fromSelf ? L("อยู่ในหมวด", "In the topic") : L("มีบทความ", "Has the article");
    if (e.kind === "keeper") return fromSelf ? L("ดูแล", "Looks after") : L("ดูแลโดย", "Looked after by");
    if (e.kind === "place") return fromSelf ? L("อยู่ที่", "Lives at") : L("มีแมว", "Home to");
    return K[e.kind].t;
  }

  function renderGraph(focusId) {
    const tok = renderToken;
    const G = buildGraph(), K = EDGE_KINDS(), byId = {};
    G.nodes.forEach((n) => { byId[n.id] = n; });
    const on = new Set(store.get("akc-kg-groups", KG_GROUPS().map(([g]) => g)));
    const count = (k) => G.nodes.filter((n) => n.kind === k).length;
    const neighbours = (id) => G.edges.filter((e) => e.from === id || e.to === id).map((e) => ({ e, other: byId[e.from === id ? e.to : e.from], self: e.from === id }));
    const hint = `<p class="muted">${L("แตะแมว ที่อยู่ ผู้ดูแล หรือบทความในผัง เพื่อดูว่าเชื่อมกับอะไรบ้าง", "Tap a cat, place, keeper or article in the map to see what it connects to.")}</p>
      <ul class="kg-legend">${Object.keys(K).map((k) => `<li><i class="kg-line kg-${k}"></i>${K[k].t}</li>`).join("")}</ul>
      <p class="muted small">${L("วงชมพูหนา = แมวประจำคณะ · สีจาง = จากไปแล้ว", "Thick pink ring = faculty cat · faded = passed away")}</p>`;
    function panel(id) {
      const n = byId[id];
      if (!n) return hint;
      const rows = {};
      neighbours(id).forEach(({ e, other, self }) => { const t = edgeText(e, self); (rows[t] = rows[t] || []).push(other); });
      const c = n.cat;
      return `<div class="kg-head">${c ? `<a class="kg-pic" href="${catHref(c)}">${portrait(c)}</a>` : ""}<div><small>${nodeKind(n)}</small><h2>${c ? nmHtml(c) : esc(n.label)}</h2>${c ? `<div class="cat-meta">${statusDot(c)}</div>` : ""}</div></div>
        ${n.kind === "article" && n.article.summary ? `<p>${esc(n.article.summary)}</p>` : ""}
        ${Object.keys(rows).length ? `<dl class="kg-rels">${Object.keys(rows).map((t) => `<div><dt>${t}</dt><dd>${rows[t].map((o) => `<button type="button" class="linkbtn" data-node="${esc(o.id)}">${esc(o.label)}</button>`).join(", ")}</dd></div>`).join("")}</dl>` : `<p class="muted">${L("ยังไม่มีความสัมพันธ์ที่บันทึกไว้", "No connections recorded yet")}</p>`}
        <p><a class="btn small" href="${nodeHref(n)}">${nodeOpen(n)} →</a></p>
        ${c ? `<p class="muted small">${L(`รู้ว่า${esc(c.name)}สนิทหรือไม่ถูกกับตัวไหน?`, `Know who ${esc(nm(c))} gets on with?`)} <a href="${shareHref("story", c)}">${L("บอกทีม", "Tell the team")}</a></p>` : ""}`;
    }
    const list = Object.keys(K).map((k) => {
      const es = G.edges.filter((e) => e.kind === k);
      return es.length ? `<div><h3>${K[k].t} <span class="muted">(${es.length})</span></h3><ul>${es.map((e) => `<li><a href="${nodeHref(byId[e.from])}">${esc(byId[e.from].label)}</a> ${e.kind === "mother" || e.kind === "keeper" || e.kind === "place" || e.kind === "about" || e.kind === "topic" ? "→" : "↔"} <a href="${nodeHref(byId[e.to])}">${esc(byId[e.to].label)}</a></li>`).join("")}</ul></div>` : "";
    }).join("");
    app.innerHTML = `
      ${pageHead(L("ผังความรู้", "Knowledge map"), L("แมวทุกตัวในคณะ เชื่อมกับครอบครัว เพื่อน ที่อยู่ ผู้ดูแล และบทความที่พูดถึง ทุกเส้นดึงมาจากชีตของทีมและคลังความรู้ แตะจุดไหนก็ได้เพื่อดูรายละเอียด",
        "Every cat at the faculty, linked to family, friends, places, keepers and the articles about them. Every link comes from the team's sheet and the library. Tap anything to see more."))}
      <p class="kg-stats">${[[count("cat"), L("แมว", "cats")], [count("place"), L("ที่อยู่", "places")], [count("keeper"), L("ผู้ดูแล", "keepers")], [count("article"), L("บทความ", "articles")], [G.edges.length, L("ความสัมพันธ์", "links")]].map(([v, t]) => `<span><b>${v}</b> ${t}</span>`).join("")}</p>
      <div class="chips kg-filters" role="group" aria-label="${L("แสดงความสัมพันธ์", "Show links")}">${KG_GROUPS().map(([g, t]) => `<button type="button" data-g="${g}" aria-pressed="${on.has(g)}"><i class="kg-sw kg-g-${g}" aria-hidden="true"></i>${t}</button>`).join("")}</div>
      <div class="kg-wrap">
        <div id="kg" class="kg" role="img" aria-label="${L("ผังความรู้ รายการแบบข้อความอยู่ใต้ผัง", "Knowledge map; a text list is below it")}"><p class="empty">${L("กำลังวาดผัง…", "Drawing the map…")}</p></div>
        <aside class="kg-panel" id="kgPanel" aria-live="polite">${hint}</aside>
      </div>
      <details class="kg-list"><summary>${L("ดูทุกความสัมพันธ์เป็นรายการ", "See every link as a list")}</summary><div class="kg-cols">${list}</div></details>`;
    const pnl = document.getElementById("kgPanel"), box = document.getElementById("kg");
    let sel = focusId && byId["c:" + lower(focusId)] ? "c:" + lower(focusId) : "";
    if (sel) pnl.innerHTML = panel(sel);
    loadScript(VIS_JS).then(() => {
      if (tok !== renderToken || !document.getElementById("kg")) return;
      box.innerHTML = "";
      const v = (n, d) => cssVar(n) || d;
      const ink = v("--ink", "#16181d"), ink2 = v("--ink-2", "#3d4048"), muted = v("--muted", "#6a6e76"), line = v("--line-strong", "#c9ccd2"), surf = v("--bg", "#fff"),
        pink = v("--pink", "#e2447a"), ok = v("--ok", "#2f9e6a"), bad = v("--bad", "#d64545"), violet = v("--violet", "#7a6ae0"), soft = v("--pink-soft", "#fde8ef");
      const font = (size, color) => ({ face: "Google Sans, Noto Sans Thai, sans-serif", size, color, strokeWidth: 3, strokeColor: surf });
      const nodeStyle = (n) => {
        if (n.kind === "cat") {
          const c = n.cat, fill = (DRAW[c.coat] || DRAW.unknown)[0], img = c.photoThumb || c.photo;
          return Object.assign({ size: c.resident ? 30 : 23, borderWidth: c.resident ? 5 : 2, opacity: c.status === "passed" ? 0.4 : 1, font: font(15, ink),
            color: { border: c.resident ? pink : ink, background: fill, highlight: { border: pink, background: fill } } }, img ? { shape: "circularImage", image: img } : { shape: "dot" });
        }
        if (n.kind === "place") return { shape: "box", margin: 10, shapeProperties: { borderRadius: 10 }, color: { background: surf, border: line, highlight: { background: surf, border: pink } }, font: font(14, ink) };
        if (n.kind === "keeper") return { shape: "diamond", size: 14, color: { background: violet, border: violet, highlight: { background: violet, border: pink } }, font: font(13, ink2) };
        if (n.kind === "topic") return { shape: "ellipse", margin: 8, color: { background: soft, border: pink, highlight: { background: soft, border: ink } }, font: font(13, ink) };
        return { shape: "box", margin: 7, widthConstraint: { maximum: 150 }, shapeProperties: { borderRadius: 6 }, color: { background: surf, border: line, highlight: { background: surf, border: pink } }, font: font(11.5, ink2) };
      };
      const edgeStyle = (k) => ({
        mother: { arrows: { to: { enabled: true, scaleFactor: 0.6 } }, color: ink, width: 2.5 }, sibling: { dashes: [7, 5], color: pink, width: 2.5 },
        friend: { color: ok, width: 3.5 }, rival: { dashes: [4, 5], color: bad, width: 2.5 }, place: { color: line, width: 1 },
        keeper: { color: violet, width: 1.5 }, about: { color: muted, width: 1, dashes: [2, 4] }, topic: { color: line, width: 1 }
      }[k]);
      const hiddenNode = (n) => !!NODE_GROUP[n.kind] && !on.has(NODE_GROUP[n.kind]);
      const nodes = new vis.DataSet(G.nodes.map((n) => Object.assign({ id: n.id, label: n.label, hidden: hiddenNode(n) }, nodeStyle(n))));
      const edges = new vis.DataSet(G.edges.map((e) => Object.assign({ id: e.id, from: e.from, to: e.to, hidden: !on.has(K[e.kind].g), smooth: false }, edgeStyle(e.kind))));
      if (network) { network.destroy(); network = null; }
      network = new vis.Network(box, { nodes, edges }, {
        layout: { randomSeed: 11, improvedLayout: true },
        physics: { solver: "forceAtlas2Based", forceAtlas2Based: { gravitationalConstant: -70, centralGravity: 0.035, springLength: 95, springConstant: 0.08, avoidOverlap: 0.7 }, stabilization: { iterations: 600 } },
        interaction: { hover: true, tooltipDelay: 200, navigationButtons: false, keyboard: false }
      });
      const pick = (id, zoom) => {
        sel = id; pnl.innerHTML = panel(id);
        if (!id) { network.unselectAll(); return; }
        network.selectNodes([id]);
        if (zoom) network.focus(id, { scale: 1.15, animation: { duration: 350 } });
      };
      // fit everything, but never so small that the names can't be read (the list under the map has every link)
      network.once("stabilizationIterationsDone", () => { network.setOptions({ physics: false }); network.fit({ animation: false }); const min = innerWidth < 700 ? 0.6 : 0.72; if (network.getScale() < min) network.moveTo({ scale: min }); if (sel) pick(sel, true); });
      network.on("click", (p) => pick(p.nodes && p.nodes[0] ? p.nodes[0] : "", false));
      network.on("doubleClick", (p) => { if (p.nodes && p.nodes[0]) location.hash = nodeHref(byId[p.nodes[0]]); });
      pnl.addEventListener("click", (e) => { const b = e.target.closest("[data-node]"); if (b) { const n = byId[b.dataset.node]; if (n && NODE_GROUP[n.kind] && !on.has(NODE_GROUP[n.kind])) return; pick(b.dataset.node, true); } });
      app.querySelectorAll(".kg-filters button").forEach((b) => b.addEventListener("click", () => {
        const g = b.dataset.g, show = !on.has(g);
        if (show) on.add(g); else on.delete(g);
        store.set("akc-kg-groups", [...on]);
        b.setAttribute("aria-pressed", String(show));
        nodes.update(G.nodes.filter((n) => NODE_GROUP[n.kind] === g).map((n) => ({ id: n.id, hidden: !show })));
        edges.update(G.edges.filter((e) => K[e.kind].g === g).map((e) => ({ id: e.id, hidden: !show })));
      }));
    }).catch(() => { if (tok === renderToken) box.innerHTML = `<p class="empty">${L("โหลดผังไม่ได้ (ต้องต่ออินเทอร์เน็ต) ดูรายการด้านล่างแทนได้", "Couldn't load the map (needs an internet connection). The list below has the same links.")}</p>`; });
  }

  /* ---------------- QR sheet ---------------- */
  function renderQR() {
    const tok = renderToken;
    const u = norm(CFG.SITE_URL);
    const base = u ? (u.endsWith("/") ? u : u + "/") + "cats.html" : location.href.split("#")[0];
    const isLocal = !u && location.protocol === "file:";
    const list = D.cats.filter((c) => SEEN_NOW(c) || c.status === "missing").sort(byStatusThenName);
    app.innerHTML = `
      <div class="no-print">${pageHead(L("QR ประจำตัวแมว", "A QR code for each cat"), L("ติดไว้ตรงจุดที่แมวอยู่ประจำ สแกนแล้วจะเปิดหน้าของแมวตัวนั้น ขออนุญาตคณะก่อนติดด้วย", "Put one up where each cat usually stays; scanning it opens that cat's page. Ask the faculty before putting anything up."))}
        ${isLocal ? `<p class="callout danger">${L("ตอนนี้เปิดไฟล์จากเครื่อง QR จะใช้ในมือถือไม่ได้ ใส่ <code>SITE_URL</code> ใน config.js ก่อนพิมพ์", "This is a local file, so the QR codes won't work on phones. Set <code>SITE_URL</code> in config.js before printing.")}</p>` : ""}
        <p><button class="btn" type="button" id="printBtn">${L("พิมพ์", "Print")}</button></p></div>
      <div class="qr-grid">${list.map((c) => `<div class="qr-card"><svg class="qr-mark" aria-hidden="true"><use href="#nd-head"/></svg><div class="qr-name" lang="th">${esc(c.name)}</div>${I.nameEn(c.name) ? `<div class="qr-en">${esc(I.nameEn(c.name))}</div>` : ""}<div class="qr" data-url="${esc(base + "#/cat/" + enc(c.id))}"></div><div class="qr-hint">สแกนเพื่อรู้จักฉัน · Scan to meet me</div></div>`).join("")}</div>`;
    document.getElementById("printBtn").addEventListener("click", () => window.print());
    loadScript(QR_JS).then(() => {
      if (tok !== renderToken) return;
      app.querySelectorAll(".qr").forEach((el) => new QRCode(el, { text: el.getAttribute("data-url"), width: 150, height: 150, correctLevel: QRCode.CorrectLevel.M }));
    }).catch(() => { /* the cards still show the names; codes need the internet */ });
  }

  /* ---------------- router ---------------- */
  // the nav is the four steps of the journey (STAGE_OF); the sick-cat pill is its own item
  const NAV_OF = Object.assign({ "": "home", about: "about", qr: "about" }, STAGE_OF, { help: "help" });
  function route(evt) {
    const keep = evt && evt.keepScroll;
    renderToken++;
    const raw = location.hash.replace(/^#\/?/, "");
    const qi = raw.indexOf("?");
    const path = qi < 0 ? raw : raw.slice(0, qi);
    const q = new URLSearchParams(qi < 0 ? "" : raw.slice(qi + 1));
    const slash = path.indexOf("/");
    const page = slash < 0 ? path : path.slice(0, slash);
    let arg = slash < 0 ? "" : path.slice(slash + 1);
    try { arg = decodeURIComponent(arg); } catch (e) { /* keep raw */ }
    document.title = TITLE();
    const navPage = NAV_OF[page] ?? "__";
    document.querySelectorAll("[data-page]").forEach((a) => {
      const on = a.dataset.page === navPage;
      a.classList.toggle("active", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    if (page !== "graph" && page !== "family" && network) { network.destroy(); network = null; }
    if (page !== "search" && document.activeElement !== searchInput) searchInput.value = "";
    switch (page) {
      case "": renderHome(); break;
      case "cats": renderCats(q); break;
      case "find": renderFind(q); break;
      case "start": renderStart(); break;
      case "cat": renderCat(arg); break;
      case "graph": case "family": renderGraph(arg); break;
      case "live": renderLive(); break;
      case "knowledge": renderKnowledge(arg); break;
      case "article": renderArticle(arg); break;
      case "search": renderSearch(arg); break;
      case "share": renderShare(q); break;
      case "report": renderShare(new URLSearchParams("type=sighting")); break;
      case "help": renderHelp(); break;
      case "ask": renderAsk(); break;
      case "quiz": renderQuiz(); break;
      case "handover": renderHandover(); break;
      case "about": renderAbout(); break;
      case "qr": renderQR(); break;
      default: app.innerHTML = `<div class="empty">${cat("peek")}<h1>${L("ไม่เจอหน้านี้", "Page not found")}</h1><p><a href="#/">${L("กลับหน้าแรก", "Back to home")}</a></p></div>`;
    }
    if (NEXT_ON.includes(page) && STAGE_OF[page]) app.insertAdjacentHTML("beforeend", nextCard(STAGE_OF[page]));
    if (keep) return;
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

  // texts outside #app that depend on the data and the language
  function chrome() {
    const msgs = [];
    if (D.samples.cats) msgs.push(L("โหลดชีตล่าสุดไม่ได้ เลยแสดงข้อมูลสำรองที่เก็บไว้ในเว็บ", "Couldn't load the latest sheet, so this is the saved copy of the data."));
    else if (D.error) msgs.push(D.error);
    const chk = isoDate(CFG.DATA_CHECKED);
    if (stale(chk)) msgs.push(L(`ทีมไม่ได้ตรวจข้อมูลแมวมา ${daysAgo(chk)} วันแล้ว บางอย่างอาจไม่ตรงกับตอนนี้`, `Nobody has checked the cat details for ${daysAgo(chk)} days, so some may be out of date.`));
    banner.textContent = msgs.join(" · ");
    banner.hidden = !msgs.length;
    const meta = document.getElementById("footMeta");
    if (meta) meta.textContent = [
      L(`ข้อมูลแมว ${D.cats.length} ตัวจากชีตของทีม${D.samples.cats ? " (สำเนา)" : ""} · อัปเดต ${fmtTime(D.loadedAt)}`, `${D.cats.length} cats from the team's sheet${D.samples.cats ? " (saved copy)" : ""} · read at ${fmtTime(D.loadedAt)}`),
      isoDate(CFG.DATA_CHECKED) ? L("ตรวจข้อมูลล่าสุด ", "last checked ") + fmtDate(CFG.DATA_CHECKED) : "",
            L(CFG.COURSE || "", CFG.COURSE_EN)
    ].filter(Boolean).join(" · ");
  }

  // things that live outside a single page: share buttons, "more questions", back to top
  document.addEventListener("click", async (e) => {
    const sh = e.target.closest("[data-share]");
    if (sh) {
      const url = publicUrl(location.hash), title = document.title;
      if (navigator.share) { try { await navigator.share({ title, url }); } catch (err) { /* cancelled */ } return; }
      let copied = false;
      try { await navigator.clipboard.writeText(url); copied = true; } catch (err) { /* blocked */ }
      toast(`${copied ? L("คัดลอกลิงก์แล้ว · ", "Link copied · ") : ""}<a href="https://social-plugins.line.me/lineit/share?url=${enc(url)}" target="_blank" rel="noopener">${L("แชร์ทาง LINE", "Share on LINE")}</a>`);
      return;
    }
    const more = e.target.closest(".asks-more");
    if (more) { const ul = more.previousElementSibling; const open = !ul.classList.contains("open"); ul.classList.toggle("open", open); more.setAttribute("aria-expanded", String(open)); more.textContent = open ? L("ย่อ", "Show fewer") : L("ดูคำถามอื่น", "More questions"); }
  });
  function wireToTop() {
    const b = document.createElement("button");
    b.type = "button"; b.className = "to-top"; b.setAttribute("aria-label", L("กลับขึ้นบนสุด", "Back to top"));
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
    b.addEventListener("click", () => window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }));
    document.body.appendChild(b);
    const on = () => b.classList.toggle("on", window.scrollY > innerHeight * 1.5);
    window.addEventListener("scroll", on, { passive: true }); on();
    I.on(() => b.setAttribute("aria-label", L("กลับขึ้นบนสุด", "Back to top")));
  }

  async function init() {
    wireSearch();
    wireToTop();
    // the device's copy of the sheet shows at once; if the live sheet is newer, the page redraws (never mid-form)
    D = await window.CatData.load(CFG, (fresh) => {
      D = fresh; chrome();
      if (!/^#\/share/.test(location.hash) && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") { const y = window.scrollY; route({ keepScroll: true }); window.scrollTo(0, y); }
    });
    chrome();
    loadFeed();
    window.addEventListener("hashchange", route);
    I.on(() => { chrome(); const y = window.scrollY; route({ keepScroll: true }); window.scrollTo(0, y); });
    route();
  }

  init();
})();
