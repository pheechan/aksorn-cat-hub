/* คลังความรู้แมวอักษร (Aksorn Cat Knowledge Hub) — the hub (cats.html).
   Built around the newcomer's tasks from Chapter 2: find a cat you saw (2.5.1), learn what is normal for it (2.1.1),
   start caring step by step (SECI internalization/socialization), and share what you know with review (2.4.1).
   Thai and English: every UI string goes through L("ไทย", "English"); sheet text goes through T() (see i18n.js).
   Routes: #/  #/cats?coat=&area=&status=&touch=  #/find?coat=&area=  #/start  #/cat/:id  #/family[/:id]
           #/knowledge[/:category]  #/article/:id  #/search/:q  #/share?type=&cat=&ctx=  #/help  #/about  #/qr */
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
  const statusDot = (c) => `<span class="dot ${STATUS[c.status].cls}">${lbl(STATUS[c.status])}</span>`;
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
  const byStatusThenName = (a, b) => (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) || nm(a).localeCompare(nm(b), I.locale());
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
      <circle cx="86" cy="110" r="4.4" style="fill:var(--pink)"/><circle cx="114" cy="110" r="4.4" style="fill:var(--pink)"/>
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
      [both(c.marks), 3], [both(c.personality), 2], [both(c.health), 2], [c.normal, 2], [both(c.notes), 1], [c.interview.map(both).join(" "), 1]
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
      <span class="a-meta">${[esc(a.source || a.author), a.date ? fmtDate(a.date) : "", a.reviewedBy ? L("ตรวจทานโดย ", "Reviewed by ") + esc(a.reviewedBy) : ""].filter(Boolean).join(" · ")}</span></div>
    </a></li>`;
  }

  const ICON = {
    find: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/><path d="M8 9.5l1-2 1.2 1.6 1.3-1.6 1 2"/></svg>',
    start: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V4"/><path d="M5 4h11l-2 4 2 4H5"/></svg>',
    help: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/><path d="M12 9v5M9.5 11.5h5"/></svg>'
  };

  /* ---------------- newcomer path (shared by home and #/start) ---------------- */
  function startSteps() {
    const noTouch = D.cats.filter((c) => c.touch === "no" && SEEN_NOW(c)).map(nm);
    const nNow = D.cats.filter(SEEN_NOW).length;
    return [
      { id: "know", seci: "Combination", title: L("จำแมวที่เจอบ่อยให้ได้", "Learn the cats you'll see most"),
        text: L(`ตอนนี้มีแมวในคณะ ${nNow} ตัว เริ่มจากตัวที่อยู่ตึกที่คุณเรียน ลองจำให้ได้สัก 3 ตัว แล้วกด “จำได้แล้ว” ในหน้าแมวแต่ละตัว`,
          `There are ${nNow} cats at the faculty right now. Start with the ones in the building where you study and try to learn three. Tap “I know … now” on a cat's page to keep count.`),
        links: [[L("ดูแมวที่อยู่ในคณะ", "See the cats at the faculty"), "#/cats?status=active"], [L("ผู้ดูแลจำแมวได้ยังไง", "How keepers tell cats apart"), "#/article/a09"]] },
      { id: "touch", seci: "Internalization", title: L("รู้ว่าตัวไหนจับได้ ตัวไหนไม่ควรจับ", "Know which cats you can approach, and which not to touch"),
        text: noTouch.length
          ? L(`${noTouch.join(", ")}ไม่ชอบให้จับ ที่เหลือส่วนใหญ่เป็นมิตร แต่ดูท่าทางก่อนเข้าหาทุกครั้งดีที่สุด`, `${noTouch.join(", ")} ${noTouch.length > 1 ? "don't" : "doesn't"} like being touched. Most of the others are friendly, but always read a cat's body language first.`)
          : L("ส่วนใหญ่เป็นมิตร แต่ดูท่าทางก่อนเข้าหาทุกครั้งดีที่สุด", "Most are friendly, but always read a cat's body language before approaching."),
        links: [[L("แมวที่ไม่ชอบให้จับ", "Cats who don't like being touched"), "#/cats?touch=no"], [L("อ่านภาษากายแมว", "Reading cat body language"), "#/article/a04"]] },
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
        links: [[L("ขอไปช่วยดูแล", "Ask to help out"), shareHref("join")], [L("ใครดูแลเรื่องอะไร", "Who looks after what"), "#/about"]] }
    ];
  }

  // หนูดำ, the mascot (symbols in cats.html)
  const cat = (pose, cls) => `<svg class="nd ${cls || ""}" aria-hidden="true" focusable="false"><use href="#nd-${pose}"/></svg>`;
  const pageHead = (title, lede, extra) => `<header class="page-head"><h1>${title}</h1>${lede ? `<p class="lede">${lede}</p>` : ""}${extra || ""}</header>`;

  /* ---------------- home ---------------- */
  function renderHome() {
    const met = metMap();
    const now = D.cats.filter(SEEN_NOW).sort((a, b) => (b.photo ? 1 : 0) - (a.photo ? 1 : 0) || byStatusThenName(a, b));
    const active = D.cats.filter((c) => c.status === "active").length;
    const commuters = D.cats.filter((c) => c.status === "commuter").length;
    const keeperArticles = D.articles.filter((a) => a.category === "experience").length;
    const quotes = (CFG.KEEPER_QUOTES || []).slice(0, 4);
    const recent = D.history.slice(0, 4);
    const firstReads = ["a09", "a01", "a04", "a02"].map((id) => D.articleById[id]).filter(Boolean);
    const steps = startSteps(), done = store.get(START_KEY, {}), nDone = steps.filter((s) => done[s.id]).length;
    const next = steps.find((s) => !done[s.id]);
    const nMet = D.cats.filter((c) => met[c.id]).length;
    const resume = nDone > 0 && next ? `<a class="resume" href="#/start">
        <span class="resume-ring" style="--p:${nDone / steps.length}" aria-hidden="true"><b>${nDone}/${steps.length}</b></span>
        <span><b>${L("ทำต่อได้เลย", "Pick up where you left off")}</b><span>${L("ขั้นถัดไป: ", "Next: ")}${esc(next.title)}${nMet ? L(` · จำแมวได้แล้ว ${nMet} ตัว`, ` · you know ${nMet} cat${nMet > 1 ? "s" : ""}`) : ""}</span></span><span class="go" aria-hidden="true">→</span></a>` : "";
    app.innerHTML = `
      <section class="hello">
        ${cat("sit", "hello-cat")}
        <h1>${L("รู้จักแมวอักษร<br>ให้ครบทุกตัว", "Get to know every cat<br>at the Faculty of Arts")}</h1>
        <p class="lede">${L("ชื่อ นิสัย ที่ประจำ และเรื่องสุขภาพ รวมไว้จากพี่ ๆ ผู้ดูแลที่อยู่กับแมวมาหลายปี ใครเพิ่งมาช่วยดูแลก็เริ่มได้เลย ไม่ต้องเริ่มจากศูนย์",
          "Names, habits, favourite spots and health notes, gathered from the keepers who have looked after these cats for years. New to helping out? Start here, not from zero.")}</p>
        <div class="hello-actions"><a class="btn" href="#/find">${L("หาแมวที่เพิ่งเจอ", "Find a cat you just met")}</a><a class="btn ghost" href="#/start">${L("มือใหม่เริ่มที่นี่", "New here? Start here")}</a></div>
        <dl class="stats" aria-label="${L("ตอนนี้", "Right now")}">
          <div><dt>${active}</dt><dd>${L("ตัวอยู่ในคณะ", "living here")}</dd></div>
          <div><dt>${commuters}</dt><dd>${L("ตัวแวะมาบ้าง", "drop by")}</dd></div>
          <div><dt>${keeperArticles}</dt><dd>${L("เรื่องเล่าผู้ดูแล", "keepers' stories")}</dd></div>
        </dl>
      </section>
      ${resume}
      <div class="tasks">
        <a class="task" href="#/find"><span class="task-ico">${ICON.find}</span><h2>${L("เจอแมว แต่ไม่รู้ว่าตัวไหน", "Met a cat but don't know who?")}</h2><p>${L("เลือกสีขนกับจุดที่เจอ แล้วดูว่าน่าจะเป็นใคร", "Pick its coat and where you saw it, and see who it probably is.")}</p><span class="go">${L("หาแมว", "Find this cat")} →</span></a>
        <a class="task" href="#/start"><span class="task-ico">${ICON.start}</span><h2>${L("อยากช่วยดูแลแมว", "Want to help with the cats?")}</h2><p>${L("เริ่มจาก 5 เรื่องที่ผู้ดูแลอยากให้รู้ก่อน", "Start with the five things the keepers want you to know.")}</p><span class="go">${nDone ? L(`ทำไปแล้ว ${nDone}/5 · ทำต่อ`, `${nDone}/5 done · continue`) : L("เริ่มเลย", "Start")} →</span></a>
        <a class="task urgent" href="#/help"><span class="task-ico">${ICON.help}</span><h2>${L("แมวป่วยหรือบาดเจ็บ", "A cat looks sick or hurt")}</h2><p>${L("ทำอะไรก่อน อะไรห้ามทำ และต้องติดต่อใคร", "What to do first, what not to do, and who to call.")}</p><span class="go">${L("ดูวิธีรับมือ", "See the steps")} →</span></a>
      </div>

      <section class="sec">
        <div class="toolbar"><h2>${L("ตอนนี้อยู่ในคณะ", "At the faculty now")}</h2><a href="#/cats">${L(`ดูทั้งหมด ${D.cats.length} ตัว`, `All ${D.cats.length} cats`)} →</a></div>
        <div class="strip">${now.map((c) => catCard(c, null, "", met)).join("")}</div>
      </section>

      ${quotes.length ? `<section class="sec">
        <div class="sec-head"><h2>${L("ผู้ดูแลเล่าว่า", "In the keepers' words")}</h2>
        <p>${L("ฟังมาจากการสัมภาษณ์ ไม่เคยมีใครจดไว้ที่ไหนมาก่อน", "From our interviews. None of this had ever been written down before.")}</p></div>
        <div class="quotes">${quotes.map((q) => `<figure class="quote"><blockquote>“${esc(en(q, "text"))}”</blockquote>${isEN() && q.en ? `<p class="orig" lang="th">“${esc(q.text)}”</p>` : ""}<figcaption>${esc(en(q, "context"))}${q.href ? `<a href="${esc(q.href)}">${esc(en(q, "cta") || L("อ่านต่อ", "Read more"))} →</a>` : ""}</figcaption></figure>`).join("")}</div>
      </section>` : ""}

      <section class="sec two">
        <div>
          <div class="sec-head"><h2>${L("บันทึกล่าสุด", "Latest notes")}</h2><p>${L("ข่าวและการดูแลที่ทีมจดไว้", "News and care the team has noted")}</p></div>
          ${recent.length ? `<ol class="timeline">${recent.map((h) => { const c = D.byId[h.cat]; return `<li><time datetime="${esc(h.date)}">${fmtDate(h.date)}</time><div>${c ? `<a href="${catHref(c)}"><b>${nmHtml(c)}</b></a> · ` : ""}<span class="t-type">${L(HISTORY_TYPES[h.type], HISTORY_EN[h.type])}</span>${T(h.note)}</div></li>`; }).join("")}</ol>` : `<p class="muted">${L("ยังไม่มีบันทึก", "Nothing yet")}</p>`}
          <p class="more"><a href="${shareHref("sighting")}">${L("เห็นแมววันนี้? บอกทีมได้เลย", "Saw a cat today? Tell the team")} →</a></p>
        </div>
        <div>
          <div class="sec-head"><h2>${L("อ่านก่อนไปดูแลแมว", "Read before you go")}</h2><p>${L("เรื่องที่มือใหม่ถามบ่อย", "What newcomers ask most")}</p></div>
          <ul class="articles">${firstReads.map((a) => articleRow(a)).join("")}</ul>
        </div>
      </section>`;
  }

  /* ---------------- all cats with facets ---------------- */
  function renderCats(q) {
    const met = metMap();
    const f = { status: q.get("status") || "", coat: q.get("coat") || "", area: q.get("area") || "", touch: q.get("touch") || "" };
    const n = (pred) => D.cats.filter(pred).length;
    const chip = (key, val, label, count, swatch) => `<button type="button" data-k="${key}" data-v="${val}" aria-pressed="${f[key] === val}">${swatch ? `<span class="swatch" style="background:${swatch}"></span>` : ""}${label}${count != null ? ` <span class="n">${count}</span>` : ""}</button>`;
    const statusChips = [chip("status", "", L("ทั้งหมด", "All"), D.cats.length)].concat(Object.keys(STATUS).filter((k) => n((c) => c.status === k)).map((k) => chip("status", k, lbl(STATUS[k]), n((c) => c.status === k))));
    const coatChips = [chip("coat", "", L("ทุกสี", "Any"))].concat(Object.keys(COATS).filter((k) => n((c) => c.coat === k)).map((k) => chip("coat", k, lbl(COATS[k]), n((c) => c.coat === k), COATS[k].swatch)), n((c) => c.coat === "unknown") ? [chip("coat", "unknown", L("ยังไม่ระบุ", "Not recorded"), n((c) => c.coat === "unknown"))] : []);
    const areaChips = [chip("area", "", L("ทุกที่", "Anywhere"))].concat(Object.keys(AREAS).filter((k) => n((c) => c.areas.includes(k))).map((k) => chip("area", k, lbl(AREAS[k]), n((c) => c.areas.includes(k)))));
    const touchChips = [chip("touch", "", L("ทั้งหมด", "All")), chip("touch", "yes", L("เข้าหาได้", "Friendly"), n((c) => c.touch === "yes")), chip("touch", "no", L("ไม่ชอบให้จับ", "Doesn't like touch"), n((c) => c.touch === "no"))];
    app.innerHTML = `
      ${pageHead(L(`แมวทั้งหมด ${D.cats.length} ตัว`, `All ${D.cats.length} cats`), L("กรองตามสีขน จุดที่เจอบ่อย หรือดูว่าตัวไหนเข้าหาได้ ไม่ต้องรู้ชื่อก็หาเจอ", "Filter by coat, by where they usually are, or by whether you can approach them. No name needed."))}
      <div class="facets" role="group" aria-label="${L("ตัวกรอง", "Filters")}">
        <div class="facet"><span>${L("สถานะ", "Status")}</span><div class="chips">${statusChips.join("")}</div></div>
        <div class="facet"><span>${L("สีขน", "Coat")}</span><div class="chips">${coatChips.join("")}</div></div>
        <div class="facet"><span>${L("เจอบ่อยที่", "Usually at")}</span><div class="chips">${areaChips.join("")}</div></div>
        <div class="facet"><span>${L("จับได้ไหม", "Approach?")}</span><div class="chips">${touchChips.join("")}</div></div>
      </div>
      <div class="toolbar"><p class="summary" id="catSummary" aria-live="polite"></p><a href="#/family">${L("ดูผังครอบครัว", "Family tree")} →</a></div>
      <div class="cats" id="catGrid"></div>`;
    const draw = () => {
      const list = D.cats.filter((c) => (!f.status || c.status === f.status) && (!f.coat || c.coat === f.coat) && (!f.area || c.areas.includes(f.area)) && (!f.touch || c.touch === f.touch)).sort(byStatusThenName);
      const filtered = f.status || f.coat || f.area || f.touch;
      document.getElementById("catSummary").innerHTML = L(`แสดง ${list.length} จาก ${D.cats.length} ตัว`, `Showing ${list.length} of ${D.cats.length}`) + (filtered ? ` · <button type="button" class="linkbtn" id="clearF">${L("ล้างตัวกรอง", "Clear filters")}</button>` : "");
      document.getElementById("catGrid").innerHTML = list.length ? list.map((c) => catCard(c, null, "", met)).join("") : `<div class="empty">${cat("sleep")}<p>${L("ไม่มีแมวที่ตรงกับตัวกรองนี้", "No cats match these filters")}</p></div>`;
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
    const st = { coat: q.get("coat") || "", area: q.get("area") || "" };
    const places = ["brk", "mcs", "tewalai", "store"].filter((k) => has(AREAS, k));
    app.innerHTML = `
      ${pageHead(L("เจอแมว แต่ไม่รู้ว่าชื่ออะไร?", "Met a cat but don't know its name?"),
        L(`พี่ผู้ดูแลบอกว่า <span class="note-hand">“จำแมวจากหน้า”</span> แต่ถ้าเพิ่งมา เริ่มจากสีขนกับจุดที่เจอก่อนก็พอ`,
          `The keepers say <span class="note-hand">“I know them by their faces”</span>. If you're new, the coat and where you saw it are enough to start.`))}
      <div class="finder">
        <section class="step-card"><h2><span class="n" aria-hidden="true">1</span>${L("สีขน", "Coat")}</h2><p>${L("เลือกที่ใกล้เคียงที่สุด ไม่แน่ใจก็ข้ามได้", "Pick the closest. Not sure? Skip it.")}</p>
          <div class="coat-grid">${Object.keys(COATS).map((k) => `<button type="button" data-k="coat" data-v="${k}" aria-pressed="${st.coat === k}"><span class="swatch" style="background:${COATS[k].swatch}"></span>${lbl(COATS[k])}</button>`).join("")}
            <button type="button" data-k="coat" data-v="" aria-pressed="${!st.coat}">${L("ไม่แน่ใจ", "Not sure")}</button></div>
        </section>
        <section class="step-card"><h2><span class="n" aria-hidden="true">2</span>${L("เจอที่ไหน", "Where")}</h2><p>${L("หลายตัวมีที่ประจำ บางตัวก็เดินไปทั่วคณะ", "Many have a regular spot; some wander all over.")}</p>
          <div class="area-grid">${places.map((k) => `<button type="button" data-k="area" data-v="${k}" aria-pressed="${st.area === k}">${lbl(AREAS[k])}</button>`).join("")}
            <button type="button" data-k="area" data-v="" aria-pressed="${!st.area}">${L("ที่อื่น / ไม่แน่ใจ", "Elsewhere / not sure")}</button></div>
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
      if (!st.coat && !st.area) { el.innerHTML = `<div class="empty">${cat("stretch")}<p>${L("เลือกสีขนหรือจุดที่เจออย่างน้อยหนึ่งอย่าง เดี๋ยวช่วยเรียงตัวที่น่าจะใช่ให้", "Pick a coat or a place and we'll list the likely cats.")}</p></div>`; return; }
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
      const p = new URLSearchParams(); if (st.coat) p.set("coat", st.coat); if (st.area) p.set("area", st.area);
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
    const ptext = () => L(`ทำไปแล้ว ${count()} จาก ${steps.length} ขั้น · บันทึกไว้ในเครื่องนี้`, `${count()} of ${steps.length} steps done · saved on this device`);
    app.innerHTML = `
      ${pageHead(L("เริ่มดูแลแมวใน 5 ขั้น", "Five steps to becoming a keeper"),
        L("นิสิตที่ช่วยดูแลแมวเปลี่ยนรุ่นทุกปี 5 ขั้นนี้คือสิ่งที่ผู้ดูแลรุ่นก่อนอยากให้รู้ เริ่มจากอ่าน แล้วจบที่ไปดูแลจริงด้วยกัน",
          "Every year the students who help with the cats move on. These steps are what the experienced keepers want newcomers to know: start by reading, finish by doing it together."),
        `<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${steps.length}" aria-valuenow="${count()}" aria-label="${L("ความคืบหน้า", "Progress")}"><i id="pbar" style="width:${(count() / steps.length) * 100}%"></i></div>
        <p class="muted small" id="ptext" aria-live="polite">${ptext()}</p>`)}
      <ol class="path">${steps.map((s) => `
        <li class="${done[s.id] ? "done" : ""}" data-id="${s.id}" id="step-${s.id}">
          <div><h2>${esc(s.title)}<span class="seci" title="${L("ขั้นใน SECI model", "Stage in the SECI model")}">${s.seci}</span></h2><p>${esc(s.text)}</p>
            ${s.id === "know" ? `<p class="met-count"><span class="meter" aria-hidden="true"><i style="width:${nNow ? (Math.min(nMet, nNow) / nNow) * 100 : 0}%"></i></span>${L(`จำได้แล้ว ${nMet} จาก ${nNow} ตัว`, `You know ${nMet} of ${nNow}`)}</p>` : ""}
            <div class="links">${s.links.map(([t, h]) => `<a href="${esc(h)}">${esc(t)} →</a>`).join("")}</div></div>
          <label class="done-toggle"><input type="checkbox" ${done[s.id] ? "checked" : ""}> ${L("ทำแล้ว", "Done")}</label>
        </li>`).join("")}
      </ol>`;
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
    const name = esc(nm(c));
    const strip = [esc(SEX()[c.sex]), c.age ? L("อายุ ", "Age ") + T(c.age) : "", coatLabel(c) ? L("สีขน", "Coat: ") + esc(coatLabel(c)) : ""].filter(Boolean).map((t) => `<li>${t}</li>`)
      .concat([`<li class="${c.sterilised === "yes" ? "" : "warn"}">${STERIL()[c.sterilised]}</li>`, `<li class="${c.vaccinated === "yes" ? "" : "warn"}">${VACC()[c.vaccinated]}</li>`]);
    const famRow = (label, html) => (html ? `<div class="family-row"><span>${label}</span><div class="mini-cats">${html}</div></div>` : "");
    const family = famRow(L("แม่", "Mother"), mom ? miniCat(mom) : "") + famRow(L("พี่น้อง", "Siblings"), sibs.map(miniCat).join("")) + famRow(L("ลูก", "Kittens"), kids.map(miniCat).join(""));
    const notes = [c.notes].concat(c.interview).filter(Boolean);
    const from = session.get("akc-list");
    const inList = from && Array.isArray(from.ids) && from.ids.includes(c.id);
    const ids = inList ? from.ids : D.cats.slice().sort(byStatusThenName).map((x) => x.id);
    const pos = ids.indexOf(c.id);
    const prev = pos > 0 ? D.byId[ids[pos - 1]] : null, next = pos >= 0 && pos < ids.length - 1 ? D.byId[ids[pos + 1]] : null;
    const backHref = inList ? from.hash : "#/cats", backLabel = inList ? L(from.th, from.en) : L("แมวทั้งหมด", "All cats");
    const lastSeen = c.lastSeen ? (/^\d{4}-\d{2}-\d{2}/.test(c.lastSeen) ? L("เห็นล่าสุด ", "Last seen ") + fmtDate(c.lastSeen) : T(c.lastSeen)) : "";
    app.innerHTML = `
      <nav class="crumbs" aria-label="${L("ตำแหน่ง", "Breadcrumb")}"><a href="${esc(backHref)}">← ${esc(backLabel)}</a>${inList && ids.length > 1 ? `<span class="crumb-pos">${pos + 1} / ${ids.length}</span>` : ""}</nav>
      <article class="profile">
        <div class="profile-side">${portrait(c, true, true)}${c.gallery.length > 1 ? `
          <div class="gallery" role="group" aria-label="${esc(L(`รูปของ${c.name} ${c.gallery.length} รูป`, `${c.gallery.length} photos of ${nm(c)}`))}">${c.gallery.map((p, i) => `<button type="button" class="thumb" aria-pressed="${i === 0}" aria-label="${L("ดูรูปที่ ", "Show photo ")}${i + 1}" data-l="${esc(p.l)}"><img src="${esc(p.t || p.s)}" alt="" width="96" height="120" loading="lazy" decoding="async"></button>`).join("")}</div>` : ""}
          ${c.gallery.length ? "" : `<p class="photo-credit">${L("ยังไม่มีรูป", "No photo yet")} · <a href="${shareHref("photo", c)}">${L("มีรูปน้องไหม? ส่งมาได้เลย", "Have a photo? Send it in")}</a></p>`}
        </div>
        <div class="profile-main">
          <h1>${nmHtml(c)}</h1>
          <div class="cat-meta big">${statusDot(c)}${STATUS[c.status].hint ? `<span>${esc(L(STATUS[c.status].hint, STATUS[c.status].hintEn))}</span>` : ""}${lastSeen ? `<span>${lastSeen}</span>` : ""}</div>
          <ul class="facts-strip">${strip.join("")}</ul>
          <div class="actions">
            <button type="button" class="btn met-btn" id="metBtn" aria-pressed="${!!met[c.id]}">${CHECK}<span>${metLabel(c, !!met[c.id])}</span></button>
            <a class="btn ghost" href="${shareHref("sighting", c)}">${L(`เห็น${c.name}วันนี้`, `Saw ${nm(c)} today`)}</a>
            <a class="btn ghost" href="${shareHref("story", c)}">${L(`เล่าเรื่อง${c.name}`, `Tell us about ${nm(c)}`)}</a>
          </div>

          <section class="normal-card" aria-labelledby="normalH">
            <h2 id="normalH">${L(`ปกติ${c.name}เป็นยังไง`, `What's normal for ${nm(c)}`)}</h2>
            <p class="muted">${L("รู้ว่าปกติเป็นแบบไหน จะได้สังเกตออกเวลามีอะไรผิดไป", "Knowing what's normal is how you notice when something changes.")}</p>
            <dl class="normal-list">
              <div><dt>${L("อยู่แถวไหน", "Usually at")}</dt><dd>${c.locations.length ? c.locations.map(T).join(", ") : c.areas.length ? esc(c.areas.map((a) => lbl(AREAS[a])).join(", ")) : `<span class="muted">${L("ยังไม่มีข้อมูล", "Not recorded yet")}</span>`}${mapSpot(c) ? ` <a class="map-link" href="index.html#map-${mapSpot(c)}">${L("ดูบนแผนที่", "See on the map")}</a>` : ""}</dd></div>
              <div><dt>${L("เข้าหายังไง", "How to approach")}</dt><dd>${approachFor(c)}</dd></div>
              ${c.health ? `<div><dt>${L("เรื่องสุขภาพ", "Health to watch")}</dt><dd>${T(c.health)}</dd></div>` : ""}
              ${c.marks ? `<div><dt>${L("ลักษณะและนิสัย", "Looks and habits")}</dt><dd>${T(c.marks)}</dd></div>` : ""}
              ${c.normal ? `<div><dt>${L("กิจวัตร", "Daily routine")}</dt><dd class="hand">${T(c.normal)}</dd></div>` : ""}
            </dl>
            ${c.normal ? "" : `<div class="ask">${L(`ยังไม่มีใครบันทึกว่าปกติ${esc(c.name)}กินตอนไหน นอนตรงไหน หรือมีนิสัยอะไรพิเศษ ถ้ารู้`, `Nobody has recorded yet when ${name} usually eats, where they sleep, or any special habits. If you know,`)} <a href="${shareHref("story", c, "&topic=normal")}">${L("เล่าให้ทีมฟังหน่อย", "tell the team")}</a></div>`}
          </section>

          ${notes.length ? `<section class="sec"><h2 class="label">${L("ผู้ดูแลเล่าว่า", "The keepers say")}</h2><p class="muted small">${L("คัดจากบันทึกสัมภาษณ์ ตามคำพูดจริง", "From the interview notes. Translated; the Thai original is under each note.")}</p><ul class="keeper-notes">${notes.map((t) => `<li>${T(t)}${isEN() && !I.untranslated(t) && Tp(t) !== t ? `<span class="orig" lang="th">${esc(t)}</span>` : ""}</li>`).join("")}</ul></section>` : ""}

          ${family ? `<section class="sec"><h2 class="label">${L("ครอบครัว", "Family")}</h2><div class="family">${family}</div><p class="more"><a href="#/family/${enc(c.id)}">${L("ดูในผังครอบครัว", "See in the family tree")} →</a></p></section>` : ""}

          <section class="sec"><h2 class="label">${L("ประวัติการดูแล", "Care history")}</h2>
            ${hist.length ? `<ol class="timeline">${hist.map((h) => `<li><time datetime="${esc(h.date)}">${fmtDate(h.date)}</time><div><span class="t-type">${L(HISTORY_TYPES[h.type], HISTORY_EN[h.type])}</span>${T(h.note)}${h.by ? `<span class="t-by">${esc(h.by)}</span>` : ""}</div></li>`).join("")}</ol>`
              : `<p class="muted">${L(`ยังไม่มีบันทึก ถ้าเห็นหรือได้ดูแล${esc(c.name)}`, `Nothing yet. If you see or look after ${name},`)} <a href="${shareHref("sighting", c)}">${L("บอกทีมได้เลย", "let the team know")}</a></p>`}
          </section>

          ${rel.length ? `<section class="sec"><h2 class="label">${L(`อ่านเพิ่มเกี่ยวกับ${esc(c.name)}`, `Reading about ${name}`)}</h2><ul class="articles">${rel.map((a) => articleRow(a)).join("")}</ul></section>` : ""}

          <p class="meta-line">${L("ข้อมูลจากชีตของทีม", "From the team's sheet")}${D.loadedAt ? L(" อัปเดต ", ", updated ") + fmtTime(D.loadedAt) : ""}${c.coatSource === "photo" ? L(" · สีขนดูจากรูปถ่าย", " · coat identified from photos") : ""}${c.source ? L(" · ที่มา: ", " · source: ") + esc(c.source) : ""} · ${L("ข้อมูลผิด?", "Something wrong?")} <a href="${shareHref("fix", c)}">${L("แจ้งแก้", "Report a fix")}</a></p>
        </div>
      </article>
      ${prev || next ? `<nav class="pager" aria-label="${L("แมวตัวอื่นในรายการ", "Other cats in this list")}">
        ${prev ? `<a href="${catHref(prev)}" rel="prev"><small>← ${L("ก่อนหน้า", "Previous")}</small><b>${nmHtml(prev)}</b></a>` : "<span></span>"}
        ${next ? `<a href="${catHref(next)}" rel="next" class="next"><small>${L("ถัดไป", "Next")} →</small><b>${nmHtml(next)}</b></a>` : "<span></span>"}
      </nav>` : ""}`;
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
    const list = D.articles.filter((a) => !catKey || a.category === catKey).sort((a, b) => (a.category === "experience" ? -1 : 0) - (b.category === "experience" ? -1 : 0) || (a.date < b.date ? 1 : -1));
    const n = (k) => D.articles.filter((a) => a.category === k).length;
    app.innerHTML = `
      ${pageHead(L("ความรู้เรื่องแมว", "Cat care know-how"), L("วิธีดูแลแมวทั่วไป กับเรื่องที่ผู้ดูแลเจอมาจริง ทุกเรื่องบอกที่มา และบอกว่าตรวจทานแล้วหรือยัง", "General cat care, plus what the keepers have actually been through. Every article shows its source and whether it has been reviewed."))}
      <nav class="tabs" aria-label="${L("หมวด", "Categories")}">
        <a href="#/knowledge" class="${catKey ? "" : "on"}" ${catKey ? "" : 'aria-current="page"'}>${L("ทั้งหมด", "All")}<span class="n">${D.articles.length}</span></a>
        ${Object.keys(CATEGORIES).filter((k) => n(k)).map((k) => `<a href="#/knowledge/${k}" class="${catKey === k ? "on" : ""}" ${catKey === k ? 'aria-current="page"' : ""}>${lbl(CATEGORIES[k])}<span class="n">${n(k)}</span></a>`).join("")}
      </nav>
      ${catKey ? `<p class="cat-desc">${esc(L(CATEGORIES[catKey].desc, CATEGORIES[catKey].descEn))}</p>` : ""}
      <h2 class="sr">${L("รายการความรู้", "Articles")}</h2>
      ${list.length ? `<ul class="articles">${list.map((a) => articleRow(a)).join("")}</ul>` : `<div class="empty">${cat("loaf")}<p>${L("ยังไม่มีเรื่องในหมวดนี้", "Nothing here yet.")} <a href="${shareHref("story")}">${L("เล่าเป็นคนแรก", "Be the first to share")}</a></p></div>`}
      <aside class="callout"><h3>${L("มีเรื่องที่รุ่นต่อไปควรรู้ไหม?", "Know something the next keepers should know?")}</h3><p>${L("เคล็ดลับ บทเรียน หรือเรื่องที่เคยเกิดกับแมวในคณะ เล่ามาสั้น ๆ ก็พอ ทีมจะเรียบเรียง ตรวจทาน แล้วใส่ชื่อคุณเป็นเครดิต", "A tip, a lesson, or something that happened with the faculty's cats. A few lines is enough: the team writes it up, reviews it, and credits you.")}</p><a class="btn" href="${shareHref("story")}">${L("เล่าให้ทีมฟัง", "Tell the team")}</a></aside>`;
  }

  function renderArticle(id) {
    const raw = D.articleById[lower(id)];
    if (!raw) { app.innerHTML = `<div class="empty">${cat("peek")}<h1>${L("ไม่เจอเรื่องนี้", "Article not found")}</h1><p><a href="#/knowledge">${L("กลับไปหน้าความรู้", "Back to know-how")}</a></p></div>`; return; }
    const a = art(raw);
    document.title = `${a.title} · ${TITLE()}`;
    const cats = a.relatedCats.map((k) => D.byId[k]).filter(Boolean);
    const more = D.articles.filter((x) => x.category === a.category && x.id !== a.id).slice(0, 3);
    const catLbl = lbl(CATEGORIES[a.category]);
    app.innerHTML = `
      <nav class="crumbs" aria-label="${L("ตำแหน่ง", "Breadcrumb")}"><a href="#/knowledge">${L("ความรู้", "Know-how")}</a><span>/</span><a href="#/knowledge/${a.category}">${catLbl}</a></nav>
      <article class="article">
        ${a.th ? `<p class="lang-note">This article hasn't been translated yet. Here is the Thai original.</p>` : ""}
        <h1${langAttr(a)}>${esc(a.title)}</h1>
        ${a.summary ? `<p class="lede"${langAttr(a)}>${esc(a.summary)}</p>` : ""}
        <div class="byline">
          ${a.author ? `<span>${L("เรียบเรียงโดย", "Written up by")} <b>${esc(a.author)}</b></span>` : ""}
          ${a.source ? `<span>${L("ที่มา", "Source")} <b>${esc(a.source)}</b></span>` : ""}
          ${a.date ? `<span>${fmtDate(a.date)}</span>` : ""}
          <span>${a.reviewedBy ? `${L("ตรวจทานโดย", "Reviewed by")} <b>${esc(a.reviewedBy)}</b>` : `<span class="flag-warn">${L("ยังไม่ได้ตรวจทาน", "Not yet reviewed")}</span>`}</span>
        </div>
        <div class="prose"${langAttr(a)}>${renderBody(a.body)}</div>
        ${a.tags.length ? `<div class="tags">${a.tags.map((t) => `<a class="chip" href="#/search/${enc(t)}">${esc(t)}</a>`).join("")}</div>` : ""}
        ${cats.length ? `<section class="sec"><h2 class="label">${L("แมวในเรื่องนี้", "Cats in this story")}</h2><div class="mini-cats">${cats.map(miniCat).join("")}</div></section>` : ""}
        ${a.category === "health" ? `<aside class="callout danger"><h3>${L("แมวป่วยอยู่ตอนนี้?", "Is a cat sick right now?")}</h3><p>${L("เว็บนี้วินิจฉัยโรคไม่ได้ ดูวิธีรับมือเบื้องต้นและช่องทางติดต่อได้ที่หน้าแมวป่วย", "This site can't diagnose illness. The first steps and who to contact are on the sick-cat page.")}</p><a class="btn" href="#/help">${L("แมวป่วย ทำยังไง", "Sick cat: what to do")}</a></aside>` : ""}
        <div class="feedback"><span>${L("เรื่องนี้ขาดอะไรไหม หรือมีตรงไหนผิด?", "Something missing or wrong?")}</span><a class="btn ghost" href="${shareHref("story", null, "&ctx=" + enc(a.id))}">${L("เล่าเพิ่ม", "Add from experience")}</a><a class="btn ghost" href="${shareHref("fix", null, "&ctx=" + enc(a.id))}">${L("แจ้งแก้", "Report a fix")}</a></div>
      </article>
      ${more.length ? `<section class="sec"><h2 class="label">${L(`อ่านต่อในหมวด${catLbl}`, `More in ${catLbl}`)}</h2><ul class="articles">${more.map((x) => articleRow(x)).join("")}</ul></section>` : ""}`;
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
    question: { label: "อยากถามผู้ดูแล", en: "A question for the keepers", ph: "อยากรู้อะไร ทีมจะไปถามผู้ดูแลแล้วตอบไว้ในเว็บ", phEn: "What you'd like to know; the team will ask the keepers and answer here" },
    photo: { label: "ส่งรูปแมว", en: "Send a photo", ph: "รูปของตัวไหน ถ่ายที่ไหน (วางลิงก์รูปด้านล่าง)", phEn: "Which cat, where it was taken (paste the photo link below)" },
    fix: { label: "ข้อมูลผิด", en: "Something is wrong", ph: "ตรงไหนผิด แล้วที่ถูกคืออะไร", phEn: "What's wrong, and what's right" },
    join: { label: "อยากช่วยดูแล", en: "I'd like to help", ph: "ว่างช่วงไหน เรียนตึกไหน", phEn: "When you're free, which building you study in" }
  };
  const tPh = (k) => L(TYPES[k].ph, TYPES[k].phEn) + "…";
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
            <div class="type-grid">${Object.keys(TYPES).map((k) => `<label><input type="radio" name="type" value="${k}" ${k === type ? "checked" : ""}>${lbl(TYPES[k])}</label>`).join("")}</div>
          </fieldset>
          <div class="field"><label for="fCat">${L("แมวตัวไหน", "Which cat?")}</label>
            <select id="fCat" name="cat"><option value="">${L("ไม่รู้ / ยังไม่มีในเว็บ", "Don't know / not listed")}</option>${D.cats.slice().sort(byStatusThenName).map((c) => `<option value="${esc(c.name)}" ${pre && pre.id === c.id ? "selected" : ""}>${esc(isEN() && I.nameEn(c.name) ? `${I.nameEn(c.name)} (${c.name})` : c.name)}</option>`).join("")}</select></div>
          <div class="field"><label for="fMsg">${L("รายละเอียด", "Details")}</label>
            <textarea id="fMsg" name="message" required aria-describedby="msgHint" placeholder="${esc(tPh(type))}">${esc(preset)}</textarea>
            <p class="hint" id="msgHint">${L("เขียนสั้น ๆ ก็ได้ ทีมจะเรียบเรียงให้", "A few lines is fine; the team will tidy it up. Thai or English.")}</p></div>
          <div class="two-fields">
            <div class="field"><label for="fPlace">${L("สถานที่ (ถ้ามี)", "Place (optional)")}</label><input id="fPlace" name="place" type="text" autocomplete="off" value="${esc(place)}" placeholder="${L("เช่น BRK ชั้น 1 หน้าป้อม รปภ.…", "e.g. BRK 1st floor, by the security post…")}"></div>
            <div class="field"><label for="fPhoto">${L("ลิงก์รูป (ถ้ามี)", "Photo link (optional)")}</label><input id="fPhoto" name="photo" type="url" inputmode="url" autocomplete="off" spellcheck="false" placeholder="${L("ลิงก์ Google Drive หรือ Google Photos…", "A Google Drive or Google Photos link…")}"></div>
          </div>
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
    form.querySelectorAll('input[name="type"]').forEach((r) => r.addEventListener("change", () => { msg.placeholder = tPh(r.value); }));
    const show = (cls, html) => { status.className = "form-status " + cls; status.innerHTML = html; };
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = new FormData(form);
      if (!norm(data.get("message"))) { show("err", `<b>${L("ยังไม่ได้เขียนรายละเอียด", "Please add some details")}</b>${L("บอกสั้น ๆ ว่าเห็นอะไร หรืออยากบอกอะไร", "A line about what you saw or want to tell us is enough.")}`); msg.setAttribute("aria-invalid", "true"); msg.focus(); return; }
      msg.removeAttribute("aria-invalid");
      const payload = new URLSearchParams();
      ["type", "cat", "message", "place", "photo", "name", "contact", "website"].forEach((k) => payload.set(k, norm(data.get(k))));
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
        form.reset();
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
    const contacts = (CFG.EMERGENCY_CONTACTS || []).filter((c) => norm(c.value));
    app.innerHTML = `
      <div class="article">
        ${pageHead(L("เจอแมวป่วยหรือบาดเจ็บ", "You've found a sick or injured cat"), L("ทำตามนี้ก่อน แล้วค่อยติดต่อผู้ดูแลหรือสัตวแพทย์", "Do this first, then contact a keeper or a vet."))}
        <ol class="steps">
          <li><div><b>${L("ถ้าแมวตกใจหรือขู่ อย่าเพิ่งจับ", "If it's scared or hissing, don't touch it")}</b> ${L("แมวเจ็บอาจกัดหรือข่วน อยู่ห่างแค่พอเห็นอาการ", "A hurt cat may bite or scratch. Stay close enough to watch.")}</div></li>
          <li><div><b>${L("ถ่ายรูป จดจุดที่เจอ", "Take a photo and note where it is")}</b> ${L("ตัวไหน อยู่ตรงไหน อาการเป็นยังไง กี่โมง", "Which cat, where, what you saw, what time.")}</div></li>
          <li><div><b>${L("ห้ามให้ยาคน", "Never give human medicine")}</b> ${L("ยาบางตัว เช่น พาราเซตามอล เป็นพิษต่อแมวมาก", "Some, like paracetamol, are seriously toxic to cats.")}</div></li>
          <li><div><b>${L("ติดต่อผู้ดูแลหรือสัตวแพทย์", "Contact a keeper or a vet")}</b> ${L("ช่องทางอยู่ด้านล่าง", "Details below.")}</div></li>
          <li><div><b>${L("บอกทีมในเว็บ", "Tell the team here")}</b> ${L("คนอื่นจะได้รู้ว่ามีคนดูแลแล้ว", "So others know someone is on it.")} <a href="${shareHref("sick")}">${L("แจ้งว่าแมวไม่สบาย", "Report a sick cat")}</a></div></li>
        </ol>
        <section class="sec"><h2 class="label">${L("ติดต่อ", "Contacts")}</h2>
          ${contacts.length ? `<dl class="contact">${contacts.map((c) => `<div><dt>${esc(en(c, "label"))}</dt><dd>${esc(en(c, "value"))}${c.href ? ` · <a href="${esc(c.href)}" target="_blank" rel="noopener">${L("ข้อมูลจากจุฬาฯ", "Chula's page")}</a>` : ""}</dd></div>`).join("")}</dl>` : ""}
          <p class="muted small">${L("ตอนนี้ยังไม่มีเบอร์ผู้ดูแลในคณะที่ยืนยันแล้ว ระหว่างนี้แจ้งทีมผ่าน", "We don't have a confirmed phone number for the faculty's keepers yet. For now, use the")}<a href="${shareHref("sick")}">${L("ฟอร์มแมวป่วย", " sick-cat form")}</a>${(isEN() ? "" : "ไปก่อน")}</p>
        </section>
        <p class="muted small">${L("หน้านี้เป็นแนวทางเบื้องต้น ไม่ใช่การวินิจฉัยหรือรักษา ถ้าไม่แน่ใจ ปรึกษาสัตวแพทย์", "This page is basic guidance, not a diagnosis or treatment. If you're unsure, ask a vet.")}</p>
        <p class="more"><a href="#/article/a02">${L("สัญญาณว่าแมวอาจไม่สบาย", "Signs that a cat may be unwell")} →</a></p>
      </div>`;
  }

  /* ---------------- about: the KM process made visible ---------------- */
  function renderAbout() {
    const keepers = [...new Set(D.cats.map((c) => c.caretakers).filter(Boolean))];
    const st = (label, sample) => `<li><span>${label}</span><span class="${sample ? "flag-warn" : ""}">${sample ? L("สำเนาในเว็บ", "Saved copy") : L("ชีตของทีม (ล่าสุด)", "Team sheet (live)")}</span></li>`;
    const steps = [
      [L("1. ระบุความรู้ที่สำคัญ", "1. Identify key knowledge"), L("มือใหม่ติดตรงไหน: ไม่รู้ชื่อแมว ไม่รู้ว่าตัวไหนทำหมันแล้ว ไม่รู้ว่าแมวป่วยต้องบอกใคร", "Where newcomers get stuck: not knowing the cats' names, which are spayed, or who to tell when one is sick."), [[L("หาแมว", "Find this cat"), "#/find"], [L("แมวป่วย", "Sick cat"), "#/help"]]],
      [L("2. สร้างและแสวงหาความรู้", "2. Create and acquire"), L("สัมภาษณ์ผู้ดูแลรุ่นก่อน รวบรวมรูปกับข้อมูลในชีต แล้วเรียบเรียงเป็นบทความ", "Interview experienced keepers, gather photos and the team's sheet, and write it up as articles."), [[L("เรื่องเล่าจากผู้ดูแล", "Keepers' stories"), "#/knowledge/experience"]]],
      [L("3. จัดเก็บ", "3. Store"), L("แมวแต่ละตัวมีหน้าของตัวเอง ความรู้แบ่งหมวดและติดแท็ก มีที่มา วันที่ และสถานะตรวจทาน ค้นได้จากสีขน จุดที่เจอ และนิสัย", "A page per cat; articles by category and tag, with source, date and review status; searchable by coat, place and personality."), [[L("แมวทั้งหมด", "All cats"), "#/cats"], [L("ความรู้", "Know-how"), "#/knowledge"]]],
      [L("4. แบ่งปัน", "4. Share"), L("ฟอร์มสั้น ๆ บอกเท่าที่รู้ ทีมตรวจก่อน แล้วขึ้นเว็บพร้อมเครดิต", "A short form: say what you know, the team checks it, then it goes up with credit."), [[L("เล่าให้ทีมฟัง", "Tell the team"), "#/share"]]],
      [L("5. นำไปใช้", "5. Use"), L("มือใหม่ทำตาม 5 ขั้น จนได้ไปดูแลจริงกับผู้ดูแลรุ่นก่อน แล้วเอาสิ่งที่ได้เรียนรู้กลับมาเติม", "Newcomers follow the five steps through to caring alongside experienced keepers, then feed what they learn back in."), [[L("มือใหม่เริ่มที่นี่", "Start here"), "#/start"]]]
    ];
    const list = (thKey, enKey) => esc(((isEN() && CFG[enKey]) || CFG[thKey] || []).join(", "));
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
        </section>
        <section>
          <h2 class="label">${L("ใครดูแลเรื่องอะไร", "Who looks after what")}</h2>
          <ul class="roles">${(CFG.ROLES || []).map((r) => `<li><b>${esc(en(r, "role"))}</b><span>${esc(en(r, "who"))}</span><span>${esc(en(r, "duty"))}</span></li>`).join("")}
            ${keepers.length ? `<li><b>${L("ผู้ดูแลแมวที่ชื่ออยู่ในชีต", "Keepers named in the sheet")}</b><span>${keepers.map(T).join(", ")}</span></li>` : ""}</ul>
          <h2 class="label">${L("ขอบคุณ", "With thanks to")}</h2>
          <p>${list("CREDITS_KNOWLEDGE_HOLDERS", "CREDITS_KNOWLEDGE_HOLDERS_EN")}</p>
          <h2 class="label">${L("ทีมผู้จัดทำ", "Made by")}</h2>
          <p>${list("CREDITS_TEAM", "CREDITS_TEAM_EN")}<br><span class="muted">${esc(L(CFG.COURSE || "", CFG.COURSE_EN))}</span></p>
          <h2 class="label">${L("สถานะข้อมูล", "Data status")}</h2>
          <ul class="data-status">${st(L("ข้อมูลแมว", "Cats"), D.samples.cats)}${st(L("ความรู้", "Know-how"), D.samples.articles)}${st(L("ประวัติการดูแล", "Care history"), D.samples.history)}
            <li><span>${L("รูปแมว", "Photos")}</span><span>${window.CAT_PHOTO_SYNCED ? L("อัปเดต ", "Updated ") + fmtDate(window.CAT_PHOTO_SYNCED) : L("ยังไม่ได้อัปเดต", "Not synced yet")}</span></li>
            <li><span>${L("ฟอร์มรับเรื่อง", "Submissions")}</span><span class="${norm(CFG.SUBMIT_URL) ? "" : "flag-warn"}">${norm(CFG.SUBMIT_URL) ? L("เปิดอยู่", "On") : L("ยังไม่เปิด", "Not on yet")}</span></li>
            <li><span>${L("ภาษา", "Languages")}</span><span>${L("ไทย · อังกฤษ (ทีมแปลเอง)", "Thai · English (translated by the team)")}</span></li></ul>
        </section>
      </div>`;
  }

  /* ---------------- family graph ---------------- */
  let network = null;
  const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  function renderFamily(focusId) {
    const tok = renderToken;
    app.innerHTML = `
      ${pageHead(L("ใครเป็นพี่น้องกับใคร", "Who's related to whom"), L("เส้นประคือพี่น้อง ลูกศรชี้จากแม่ไปหาลูก แตะที่แมวเพื่อดูหน้าของตัวนั้น", "Dashed lines join siblings; arrows point from mother to kitten. Tap a cat to open its page."))}
      <div id="graph" role="img" aria-label="${L("ผังความสัมพันธ์ของแมว", "Diagram of how the cats are related")}"><p class="empty">${L("กำลังวาดผัง…", "Drawing the tree…")}</p></div>
      <section class="sec"><h2 class="label">${L("ยังไม่มีข้อมูลครอบครัว", "No family recorded yet")}</h2><div class="mini-cats" id="noFamily"></div>
        <p class="muted small">${L("รู้ว่าตัวไหนเป็นพี่น้องหรือแม่ลูกกัน?", "Know which cats are siblings, or mother and kitten?")} <a href="${shareHref("story")}">${L("บอกทีมได้", "Tell the team")}</a></p></section>`;
    const related = new Set();
    D.cats.forEach((c) => {
      if (c.mother && D.byId[c.mother]) { related.add(c.id); related.add(c.mother); }
      (c.siblings || []).forEach((o) => { if (D.byId[o]) { related.add(c.id); related.add(o); } });
    });
    document.getElementById("noFamily").innerHTML = D.cats.filter((c) => !related.has(c.id)).sort(byStatusThenName).map(miniCat).join("");
    const graph = document.getElementById("graph");
    if (!related.size) { graph.innerHTML = `<p class="empty">${L("ยังไม่มีข้อมูลความสัมพันธ์", "No relationships recorded yet")}</p>`; return; }
    loadScript(VIS_JS).then(() => {
      if (tok !== renderToken || !document.getElementById("graph")) return; // the visitor has moved on
      graph.innerHTML = "";
      const ink = cssVar("--ink") || "#16181d", pink = cssVar("--pink") || "#e2447a", muted = cssVar("--muted") || "#6b7079";
      const nodes = D.cats.filter((c) => related.has(c.id)).map((c) => {
        const fill = (DRAW[c.coat] || DRAW.unknown)[0];
        const base = { id: c.id, label: nm(c), font: { color: ink, face: "Google Sans, sans-serif", size: 16 }, borderWidth: 3, color: { border: ink, background: fill, highlight: { border: pink, background: fill } } };
        return c.photo ? Object.assign(base, { shape: "circularImage", image: c.photoThumb || c.photo, size: 30 }) : Object.assign(base, { shape: "dot", size: 20 });
      });
      const edges = D.cats.filter((c) => c.mother && D.byId[c.mother]).map((c) => ({ from: c.mother, to: c.id, arrows: "to" }));
      const seen = new Set();
      D.cats.forEach((c) => (c.siblings || []).forEach((o) => {
        const k = [c.id, o].sort().join("|");
        if (D.byId[o] && !seen.has(k)) { seen.add(k); edges.push({ from: c.id, to: o, dashes: true, color: pink }); }
      }));
      if (network) { network.destroy(); network = null; }
      const hasTree = edges.some((e) => e.arrows);
      network = new vis.Network(graph, { nodes: new vis.DataSet(nodes), edges: new vis.DataSet(edges) }, hasTree ? {
        layout: { hierarchical: { enabled: true, direction: "UD", sortMethod: "directed", levelSeparation: 110, nodeSpacing: 120 } },
        physics: false, edges: { color: muted, smooth: { type: "cubicBezier", forceDirection: "vertical" } }, interaction: { hover: true }
      } : {
        layout: { randomSeed: 7 },
        physics: { solver: "forceAtlas2Based", forceAtlas2Based: { gravitationalConstant: -180, springLength: 110, avoidOverlap: 1 }, stabilization: { iterations: 400 } },
        edges: { width: 2, smooth: false }, interaction: { hover: true }
      });
      network.once("stabilizationIterationsDone", () => { network.setOptions({ physics: false }); network.fit({ animation: false }); });
      network.on("click", (p) => { if (p.nodes && p.nodes.length) location.hash = `#/cat/${enc(p.nodes[0])}`; });
      const f = lower(focusId);
      if (f && D.byId[f]) network.once("afterDrawing", () => { network.selectNodes([f]); network.focus(f, { scale: 1.3, animation: { duration: 400 } }); });
    }).catch(() => { if (tok === renderToken) graph.innerHTML = `<p class="empty">${L("โหลดผังไม่ได้ (ต้องต่ออินเทอร์เน็ต)", "Couldn't load the diagram (needs an internet connection)")}</p>`; });
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
  const NAV_OF = { "": "home", cats: "cats", cat: "cats", family: "cats", find: "find", start: "start", knowledge: "knowledge", article: "knowledge", share: "share", report: "share", help: "help", about: "about", qr: "about" };
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
      default: app.innerHTML = `<div class="empty">${cat("peek")}<h1>${L("ไม่เจอหน้านี้", "Page not found")}</h1><p><a href="#/">${L("กลับหน้าแรก", "Back to home")}</a></p></div>`;
    }
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

  // phone menu: a native <dialog> (focus is trapped and Esc closes it)
  function wireMenu() {
    const dlg = document.getElementById("menu"), open = document.getElementById("menuOpen");
    if (!dlg || !open || typeof dlg.showModal !== "function") return;
    open.addEventListener("click", () => { dlg.showModal(); open.setAttribute("aria-expanded", "true"); });
    dlg.addEventListener("close", () => open.setAttribute("aria-expanded", "false"));
    dlg.addEventListener("click", (e) => { if (e.target === dlg || e.target.closest("a") || e.target.closest("[data-close]")) dlg.close(); });
  }

  // texts outside #app that depend on the data and the language
  function chrome() {
    const msgs = [];
    if (D.samples.cats) msgs.push(L("โหลดชีตล่าสุดไม่ได้ เลยแสดงข้อมูลสำรองที่เก็บไว้ในเว็บ", "Couldn't load the latest sheet, so this is the saved copy of the data."));
    else if (D.error) msgs.push(D.error);
    banner.textContent = msgs.join(" · ");
    banner.hidden = !msgs.length;
    const meta = document.getElementById("footMeta");
    if (meta) meta.textContent = [
      L(`ข้อมูลแมว ${D.cats.length} ตัวจากชีตของทีม${D.samples.cats ? " (สำเนา)" : ""} · อัปเดต ${fmtTime(D.loadedAt)}`, `${D.cats.length} cats from the team's sheet${D.samples.cats ? " (saved copy)" : ""} · read at ${fmtTime(D.loadedAt)}`),
            L(CFG.COURSE || "", CFG.COURSE_EN)
    ].filter(Boolean).join(" · ");
  }

  async function init() {
    wireSearch();
    wireMenu();
    D = await window.CatData.load(CFG);
    chrome();
    window.addEventListener("hashchange", route);
    I.on(() => { chrome(); const y = window.scrollY; route({ keepScroll: true }); window.scrollTo(0, y); });
    route();
  }

  init();
})();
