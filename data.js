/* Shared data layer for คลังความรู้แมวอักษร (Aksorn Cat Knowledge Hub).
   Used by the landing page (index.html) and the hub (cats.html).
   Each Google Sheet tab is published as its own CSV (see config.js); any tab that is not set or fails
   falls back to the sample data in data-sample.js, and the result says which parts are samples. */
window.CatData = (function () {
  "use strict";

  const STATUS = {
    active: { label: "อยู่ในคณะ", cls: "ok", color: "#5fc48a" },
    missing: { label: "ไม่ได้พบช่วงนี้", cls: "warn", color: "#e0a23a" },
    adopted: { label: "ได้บ้านใหม่แล้ว", cls: "info", color: "#6ea4e0" },
    passed: { label: "จากไปแล้ว", cls: "", color: "#8f9893" }
  };

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
    const m = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]+)/);
    if (m) return "https://lh3.googleusercontent.com/d/" + m[1];
    if (/^https?:\/\//i.test(u)) return u;
    // a photo stored with the site, e.g. photos/c-somsom.jpg
    return /^[\w\-./]+\.(jpe?g|png|webp|gif|avif)$/i.test(u) && !u.includes("..") ? u : "";
  }

  // Accepts English or Thai values typed into the sheet.
  function yesNo(v) {
    v = lower(v);
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
    return "tabby";
  }

  function toCat(r) {
    const c = {
      id: lower(r.id),
      name: norm(r.name),
      nicknames: splitList(r.nicknames),
      photo: photoUrl(r.photo),
      sex: sexOf(r.sex),
      age: norm(r.age),
      marks: norm(r.marks),
      sterilised: yesNo(r.sterilised),
      vaccinated: yesNo(r.vaccinated),
      health: norm(r.health_notes),
      personality: norm(r.personality),
      locations: splitList(r.locations),
      mother: lower(r.mother_id),
      status: pick(STATUS, lower(r.status), "active"),
      caretakers: norm(r.caretakers),
      lastSeen: norm(r.last_seen),
      source: norm(r.source),
      notes: norm(r.notes)
    };
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

  async function fetchCsv(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const text = await res.text();
    return Papa.parse(text, {
      header: true, skipEmptyLines: true,
      transformHeader: (h) => h.replace(/^﻿/, "").trim().toLowerCase()
    }).data;
  }

  // Load one sheet tab; falls back to the sample rows when the URL is empty or the fetch fails.
  async function loadTab(url, sample, map, keep, label, errors) {
    url = norm(url);
    if (url) {
      if (!window.Papa) errors.push("โหลดตัวอ่าน CSV ไม่ได้ (ตรวจการเชื่อมต่ออินเทอร์เน็ต)");
      else {
        try {
          const rows = (await fetchCsv(url)).map(map).filter(keep);
          if (rows.length) return { rows, sample: false };
          errors.push(`ชีต${label}ไม่มีข้อมูล (ตรวจชื่อหัวคอลัมน์)`);
        } catch (e) {
          console.warn(label, "load failed:", e);
          errors.push(`โหลดชีต${label}ไม่สำเร็จ`);
        }
      }
    }
    return { rows: (sample || []).map(map).filter(keep), sample: true };
  }

  async function load(cfg) {
    cfg = cfg || {};
    const errors = [];
    const [cats, articles, history] = await Promise.all([
      loadTab(cfg.SHEET_CSV_URL, window.SAMPLE_CATS, toCat, (c) => c.id && c.name, "แมว", errors),
      loadTab(cfg.ARTICLES_CSV_URL, window.SAMPLE_ARTICLES, toArticle, (a) => a.id && a.title && a.published, "บทความ", errors),
      loadTab(cfg.HISTORY_CSV_URL, window.SAMPLE_HISTORY, toHistory, (h) => h.cat && h.published, "ประวัติการดูแล", errors)
    ]);
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
