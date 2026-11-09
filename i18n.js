/* Thai / English switch (and day / night theme) shared by the landing page and the hub.
   - Choice comes from ?lang=en|th, then the visitor's last choice (localStorage), else Thai.
   - Static text: an element with data-en="…" swaps its innerHTML; data-en-placeholder / -aria-label / -title / -content / -alt swap attributes.
   - Dynamic text: I18N.L("ไทย", "English"). Sheet text: I18N.tx(text) looks up CONTENT_EN.text by the exact Thai,
     so a translation disappears by itself when the team edits the Thai in the sheet (never shows a stale translation).
   - Buttons with data-set-lang="th|en" switch language; listeners registered with I18N.on(fn) re-render. */
(function () {
  "use strict";
  const KEY = "akc-lang";
  const ATTRS = ["placeholder", "aria-label", "title", "content", "alt"];
  const read = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  const write = (v) => { try { localStorage.setItem(KEY, v); } catch (e) { /* private mode: choice lasts for this page only */ } };
  const ok = (v) => v === "th" || v === "en";
  const fromUrl = new URLSearchParams(location.search).get("lang");
  let lang = ok(fromUrl) ? fromUrl : ok(read()) ? read() : "th";
  if (ok(fromUrl)) write(fromUrl);
  const subs = [];
  const squash = (s) => String(s == null ? "" : s).replace(/\s+/g, " ").trim();
  const THAI = /[฀-๿]/;

  function L(th, en) { return lang === "en" && en != null && en !== "" ? en : th; }

  // Translate one piece of sheet/config text; returns the original when there is no exact translation.
  function tx(s) {
    if (lang !== "en" || !s) return s;
    const map = (window.CONTENT_EN && window.CONTENT_EN.text) || {};
    const k = squash(s);
    return Object.prototype.hasOwnProperty.call(map, k) ? map[k] : s;
  }
  // true when English is on and this text is still Thai (no translation): callers mark it lang="th"
  function untranslated(s) { return lang === "en" && THAI.test(String(s || "")) && tx(s) === s; }
  function nameEn(name) {
    const m = (window.CONTENT_EN && window.CONTENT_EN.names) || {};
    return Object.prototype.hasOwnProperty.call(m, name) ? m[name] : "";
  }

  function apply(root) {
    root = root || document;
    root.querySelectorAll("[data-en]").forEach((el) => {
      if (el.__th == null) el.__th = el.innerHTML;
      el.innerHTML = lang === "en" ? el.getAttribute("data-en") : el.__th;
    });
    ATTRS.forEach((a) => {
      root.querySelectorAll(`[data-en-${a}]`).forEach((el) => {
        const store = "__th_" + a;
        if (el[store] == null) el[store] = el.getAttribute(a) || "";
        el.setAttribute(a, lang === "en" ? el.getAttribute(`data-en-${a}`) : el[store]);
      });
    });
    document.querySelectorAll("[data-set-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.setLang === lang)));
  }

  function set(next) {
    if (!ok(next) || next === lang) return;
    lang = next;
    write(next);
    document.documentElement.lang = next;
    // keep the address bar honest: an old ?lang= would undo the choice on reload
    const u = new URL(location.href);
    if (u.searchParams.has("lang")) { u.searchParams.set("lang", next); history.replaceState(history.state, "", u); }
    apply(document);
    paintTheme();
    subs.forEach((fn) => { try { fn(next); } catch (e) { console.error(e); } });
  }

  document.documentElement.lang = lang;
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-set-lang]");
    if (b) { e.preventDefault(); set(b.dataset.setLang); }
  });

  /* Day / night theme, shared by both pages: <html data-theme="light|dark">, remembered.
     Default follows the visitor's system setting. Buttons with data-toggle-theme flip it; I18N.onTheme(fn) listens. */
  const TKEY = "akc-theme", themeSubs = [];
  const readT = () => { try { return localStorage.getItem(TKEY); } catch (e) { return null; } };
  let theme = readT() === "dark" || readT() === "light" ? readT() : (window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  function paintTheme() {
    document.documentElement.setAttribute("data-theme", theme);
    document.querySelectorAll("[data-toggle-theme]").forEach((b) => {
      b.setAttribute("aria-pressed", String(theme === "dark"));
      b.setAttribute("aria-label", lang === "en" ? (theme === "dark" ? "Switch to day mode" : "Switch to night mode") : (theme === "dark" ? "เปลี่ยนเป็นโหมดกลางวัน" : "เปลี่ยนเป็นโหมดกลางคืน"));
    });
  }
  function setTheme(next) {
    if (next !== "dark" && next !== "light") return;
    theme = next;
    try { localStorage.setItem(TKEY, next); } catch (e) { /* not kept */ }
    paintTheme();
    themeSubs.forEach((fn) => { try { fn(next); } catch (e) { console.error(e); } });
  }
  paintTheme();
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-toggle-theme]");
    if (b) { e.preventDefault(); setTheme(theme === "dark" ? "light" : "dark"); }
  });

  window.I18N = {
    get theme() { return theme; },
    setTheme, onTheme(fn) { themeSubs.push(fn); },
    get lang() { return lang; },
    L, tx, untranslated, nameEn, apply, set,
    on(fn) { subs.push(fn); },
    locale() { return lang === "en" ? "en-GB" : "th-TH"; }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => { apply(document); paintTheme(); });
  else { apply(document); paintTheme(); }
})();
