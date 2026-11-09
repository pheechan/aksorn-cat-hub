/* Shared data layer for คลังความรู้แมวอักษร (Aksorn Cat Knowledge Hub).
   Used by the landing page (index.html) and the hub (cats.html).
   Each Google Sheet tab is published as its own CSV (see config.js); any tab that is not set or fails
   falls back to the sample data in data-sample.js, and the result says which parts are samples. */
window.CatData = (function () {
  "use strict";

  const STATUS = {
    active: { label: "อยู่ในคณะ", cls: "ok", color: "#5fc48a" },
    missing: { label: "ไม่ได้พบช่วงนี้", cls: "warn", color: "#e0a23a" },
    commuter: { label: "ไปกลับ", cls: "info", color: "#9b8cf0", hint: "มีบ้านแล้ว แวะมาคณะเป็นครั้งคราว" },
    adopted: { label: "ได้บ้านใหม่แล้ว", cls: "info", color: "#6ea4e0" },
    unknown: { label: "ยังไม่ระบุ", cls: "", color: "#6b7570" },
    passed: { label: "จากไปแล้ว", cls: "", color: "#8f9893" }
  };
  // Values the team types in the sheet's Status column → our status keys
  const STATUS_WORDS = [
    [/^(active|อยู่|อยู่ในคณะ)/i, "active"],
    [/back ?home|ไปกลับ|ไป-กลับ|commut/i, "commuter"],
    [/missing|หาย|หาไม่เจอ/i, "missing"],
    [/adopt|มีบ้าน|รับไปเลี้ยง/i, "adopted"],
    [/passed|died|dead|เสียชีวิต|จากไป/i, "passed"]
  ];
  const PERSONALITY_WORDS = { "friendly": "เป็นมิตร เข้าหาได้", "don't touch": "ไม่ชอบให้จับ", "dont touch": "ไม่ชอบให้จับ", "shy": "ขี้อาย" };

  // Knowledge-base categories (scope: การให้อาหาร สุขภาพ พฤติกรรม สุขอนามัย + ประสบการณ์จากผู้ดูแล)
  const CATEGORIES = {
    feeding: { label: "การให้อาหาร", en: "Feeding", desc: "ให้อะไร ให้เท่าไร ให้ที่ไหน และสิ่งที่ไม่ควรให้" },
    health: { label: "สุขภาพ", en: "Health", desc: "สัญญาณผิดปกติ การทำหมัน วัคซีน และเมื่อไรควรพบสัตวแพทย์" },
    behavior: { label: "พฤติกรรม", en: "Behaviour", desc: "อ่านภาษากายแมว เข้าหาอย่างไรให้แมวไม่เครียด" },
    hygiene: { label: "สุขอนามัย", en: "Hygiene", desc: "ความสะอาดของคนและพื้นที่ให้อาหาร" },
    experience: { label: "ประสบการณ์จากผู้ดูแล", en: "From the keepers", desc: "เรื่องเล่าและบทเรียนจากคนที่ดูแลแมวจริง" }
  };

  const HISTORY_TYPES = {
    health: "สุขภาพ", sterilised: "ทำหมัน", vaccine: "วัคซีน", feeding: "อาหาร",
    sighting: "พบเห็น", birth: "เกิด", adopted: "มีบ้าน", other: "บันทึก"
  };

  const norm = (v) => (v == null ? "" : String(v)).trim();
  const lower = (v) => norm(v).toLowerCase();
  const splitList = (v) => norm(v).split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  function esc(s) {
    return norm(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function pick(map, key, fallback) { return Object.prototype.hasOwnProperty.call(map, key) ? key : fallback; }

  // Accept Google Drive share links and turn them into direct image links.
  function photoUrl(u) {
    u = norm(u);
    if (!u) return "";
    if (/drive\.google\.com\/drive\/(u\/\d+\/)?folders\//.test(u)) return ""; // a folder is not an image: tools/sync_photos.py handles folders
    const m = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]+)/);
    if (m) return "https://lh3.googleusercontent.com/d/" + m[1];
    if (/^https?:\/\//i.test(u)) return u;
    // a photo stored with the site, e.g. photos/c-somsom.jpg
    return /^[\w\-./]+\.(jpe?g|png|webp|gif|avif)$/i.test(u) && !u.includes("..") ? u : "";
  }

  // Accepts English or Thai values typed into the sheet.
  function yesNo(v) {
    v = lower(v);
    if (/ยังไม่|ไม่ได้/.test(v)) return "no";
    if (/แล้ว/.test(v)) return "yes";
    if (["yes", "y", "true", "1", "ใช่", "แล้ว", "ทำแล้ว", "ฉีดแล้ว"].includes(v)) return "yes";
    if (["no", "n", "false", "0", "ไม่", "ยัง", "ยังไม่"].includes(v)) return "no";
    return "unknown";
  }
  function sexOf(v) {
    v = lower(v);
    if (["male", "m", "ผู้", "ตัวผู้"].includes(v)) return "male";
    if (["female", "f", "เมีย", "ตัวเมีย"].includes(v)) return "female";
    return "unknown";
  }
  // Rows are public unless the sheet marks them otherwise (draft/pending/hidden = not shown).
  function isPublished(v) {
    v = lower(v);
    return !v || ["published", "publish", "yes", "เผยแพร่", "เผยแพร่แล้ว", "ok"].includes(v);
  }
  // Rough coat colour from the description, used for the illustrated placeholder when there is no photo.
  function coatOf(c) {
    const s = [c.marks, c.name].concat(c.nicknames || []).join(" ");
    if (/สามสี|calico|tortie|กระดองเต่า/i.test(s)) return "calico";
    if (/ส้ม|orange|ginger/i.test(s)) return "orange";
    if (/ดำ|black/i.test(s)) return "black";
    if (/เทา|grey|gray|สลิด/i.test(s)) return "grey";
    if (/ขาว|white/i.test(s)) return "white";
    return "unknown"; // coat not recorded: the hub draws a neutral silhouette rather than guessing
  }

  function statusOf(v) {
    v = norm(v);
    if (!v) return "unknown";
    if (Object.prototype.hasOwnProperty.call(STATUS, lower(v))) return lower(v);
    for (const [re, key] of STATUS_WORDS) if (re.test(v)) return key;
    return "unknown";
  }
  const clean = (v) => (/^[-–—?]+$/.test(norm(v)) ? "" : norm(v)); // "-" or "???" in the sheet = no data

  function toCat(r, cfg) {
    const name = clean(r.name);
    const photos = (cfg && cfg.CAT_PHOTOS) || {};
    const c = {
      id: lower(r.id) || name,
      name,
      nicknames: splitList(r.nicknames),
      // photos synced from the team's Drive folders (photos/manifest.js), then a direct image link, then config
      gallery: ((window.CAT_PHOTO_SETS || {})[name] || []).filter((p) => p && p.s && p.l),
      photo: "",
      photoLarge: "",
      sex: sexOf(r.sex),
      age: clean(r.age),
      // "ไปกลับ" typed into the marks column is a status note, not a coat marking
      marks: /^ไป\s*-?\s*กล.{0,3}บ$/.test(clean(r.marks)) ? "" : clean(r.marks),
      sterilised: yesNo(r.sterilised),
      vaccinated: yesNo(r.vaccinated),
      health: clean(r.health_notes),
      personality: PERSONALITY_WORDS[lower(r.personality)] || clean(r.personality),
      locations: splitList(clean(r.locations)),
      relationship: clean(r.relationship),
      siblings: [],
      interview: (r._extra || []).map(clean).filter(Boolean),
      mother: lower(r.mother_id),
      status: statusOf(r.status),
      caretakers: clean(r.caretakers),
      lastSeen: clean(r.last_seen),
      source: clean(r.source),
      notes: clean(r.notes)
    };
    const direct = photoUrl(r.photo) || photoUrl(photos[name]);
    c.photo = c.gallery.length ? c.gallery[0].s : direct;
    c.photoLarge = c.gallery.length ? c.gallery[0].l : direct;
    c.coat = coatOf(c);
    return c;
  }

  function toArticle(r) {
    return {
      id: lower(r.id),
      title: norm(r.title),
      category: pick(CATEGORIES, lower(r.category), "experience"),
      summary: norm(r.summary),
      body: norm(r.body),
      author: norm(r.author),
      source: norm(r.source),
      date: norm(r.date),
      tags: splitList(r.tags),
      relatedCats: splitList(r.related_cats).map(lower),
      reviewedBy: norm(r.reviewed_by),
      published: isPublished(r.status)
    };
  }

  function toHistory(r) {
    return {
      date: norm(r.date),
      cat: lower(r.cat_id),
      type: pick(HISTORY_TYPES, lower(r.type), "other"),
      note: norm(r.note),
      by: norm(r.by),
      published: isPublished(r.status)
    };
  }

  // Column names the team may use (sheet headers, Thai or English) → our field names.
  const ALIASES = {
    name: ["name", "ชื่อ", "ชื่อแมว"], photo: ["photo", "รูป", "รูปภาพ"],
    marks: ["distinguishing marks", "marks", "ลักษณะเด่น", "ลักษณะ"], sex: ["sex", "เพศ"], age: ["age", "อายุ"],
    vaccinated: ["vaccination status", "vaccinated", "vaccine", "วัคซีน"], sterilised: ["ทำหมัน", "sterilised", "sterilized", "neutered"],
    health_notes: ["health notes", "health", "สุขภาพ"], status: ["status", "สถานะ"], personality: ["personality", "นิสัย"],
    locations: ["usual locations", "locations", "location", "ที่อยู่", "จุดที่พบ"], relationship: ["relationship", "ความสัมพันธ์", "ครอบครัว"],
    caretakers: ["primary caretaker", "caretakers", "caretaker", "ผู้ดูแล"], last_seen: ["last seen", "พบล่าสุด"], notes: ["note", "notes", "หมายเหตุ"]
  };
  function fieldOf(h) {
    h = lower(h).replace(/^﻿/, "");
    if (!h) return "";
    for (const k in ALIASES) if (ALIASES[k].some((a) => h === a || h.startsWith(a + " ") || h.startsWith(a + "("))) return k;
    return h; // already a field name (our CSV templates)
  }
  // Parses a sheet even when it has a title/group row above the real header row.
  async function fetchCsv(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return parseCsv(await res.text());
  }
  function parseCsv(text) {
    const rows = Papa.parse(text, { header: false, skipEmptyLines: true }).data;
    let hi = rows.findIndex((r) => r.some((v) => /^(name|id|title|date)$/i.test(norm(v).replace(/^﻿/, ""))));
    if (hi < 0) hi = 0;
    const keys = rows[hi].map(fieldOf);
    return rows.slice(hi + 1).map((r) => {
      const o = { _extra: [] };
      r.forEach((v, i) => { if (keys[i]) o[keys[i]] = v; else if (norm(v)) o._extra.push(v); });
      return o;
    });
  }

  // Link cats named in each other's Relationship text ("พี่น้องกับมีตัง") as siblings, both ways.
  const fold = (s) => norm(s).replace(/[์็]/g, "").replace(/ร(?=โ|ค)/g, ""); // ignore ์ ็ and ชาร์โคล/ชาโคล-style spellings
  function linkSiblings(cats) {
    for (const c of cats) {
      if (!c.relationship) continue;
      const rel = fold(c.relationship);
      for (const o of cats) {
        if (o === c || !o.name || o.name.length < 2) continue;
        if (rel.includes(fold(o.name))) {
          if (!c.siblings.includes(o.id)) c.siblings.push(o.id);
          if (!o.siblings.includes(c.id)) o.siblings.push(c.id);
        }
      }
    }
  }

  // Load one sheet tab; falls back to the sample rows when the URL is empty or the fetch fails.
  async function loadTab(url, sample, map, keep, label, errors) {
    url = norm(url);
    if (url) {
      if (!window.Papa) errors.push("โหลดตัวอ่าน CSV ไม่ได้ (ตรวจการเชื่อมต่ออินเทอร์เน็ต)");
      else {
        try {
          const rows = (await fetchCsv(url)).map((r) => map(r, cfgRef)).filter(keep);
          if (rows.length) return { rows, sample: false };
          errors.push(`ชีต${label}ไม่มีข้อมูล (ตรวจชื่อหัวคอลัมน์)`);
        } catch (e) {
          console.warn(label, "load failed:", e);
          errors.push(`โหลดชีต${label}ไม่สำเร็จ`);
        }
      }
    }
    // offline copy: a CSV snapshot of the sheet (same parser as live), else plain objects
    const base = typeof sample === "string" ? (window.Papa ? parseCsv(sample) : []) : (sample || []);
    return { rows: base.map((r) => map(r, cfgRef)).filter(keep), sample: true };
  }

  let cfgRef = {};
  async function load(cfg) {
    cfg = cfg || {};
    cfgRef = cfg;
    const errors = [];
    const [cats, articles, history] = await Promise.all([
      loadTab(cfg.SHEET_CSV_URL, window.SAMPLE_CATS_CSV || window.SAMPLE_CATS, toCat, (c) => c.id && c.name, "แมว", errors),
      loadTab(cfg.ARTICLES_CSV_URL, window.SAMPLE_ARTICLES, toArticle, (a) => a.id && a.title && a.published, "บทความ", errors),
      loadTab(cfg.HISTORY_CSV_URL, window.SAMPLE_HISTORY, toHistory, (h) => h.cat && h.published, "ประวัติการดูแล", errors)
    ]);
    linkSiblings(cats.rows);
    const byId = {};
    cats.rows.forEach((c) => { byId[c.id] = c; });
    const articleById = {};
    articles.rows.forEach((a) => { articleById[a.id] = a; });
    history.rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    return {
      cats: cats.rows, byId,
      articles: articles.rows, articleById,
      history: history.rows,
      usingSample: cats.sample, // kept for the landing page
      samples: { cats: cats.sample, articles: articles.sample, history: history.sample },
      error: errors.join(" · ")
    };
  }

  return { STATUS, CATEGORIES, HISTORY_TYPES, norm, lower, esc, load };
})();
