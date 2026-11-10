/* Full-screen menu (tablets and phones), shared by index.html and cats.html. See menu.css.
   The header's burger opens it; Esc, a link or the cross closes it. Focus stays inside while it is open,
   and the current page is marked in pink. */
(function () {
  "use strict";
  const btn = document.getElementById("menuBtn"), menu = document.getElementById("siteMenu");
  if (!btn || !menu) return;
  const I = window.I18N;
  const L = (th, en) => (I && I.lang === "en" ? en : th);
  const header = () => document.querySelector(".top, #nav");
  let open = false;

  // which group the page belongs to: the landing page, or a route of the hub (cats.html#/route)
  function currentKey() {
    if (!/cats\.html$/.test(location.pathname)) return "home";
    const seg = location.hash.replace(/^#\/?/, "").split(/[/?]/)[0];
    const STEP = { cats: "know", cat: "know", find: "know", quiz: "know", graph: "know", family: "know", search: "know", knowledge: "learn", article: "learn",
      start: "care", ask: "care", live: "share", share: "share", report: "share", handover: "share", help: "help", about: "about", qr: "about" };
    if (STEP[seg]) return STEP[seg];
    return "hub"; // the home page: the four steps
  }
  function here(a) {
    const u = new URL(a.getAttribute("href"), location.href);
    if (u.pathname !== location.pathname) return false;
    const h = location.hash || (/cats\.html$/.test(location.pathname) ? "#/" : "");
    return u.hash === h || (u.hash === "" && h === "") || (u.hash === "#/" && h === "");
  }
  function mark() {
    const key = currentKey();
    menu.querySelectorAll(".m-group").forEach((g) => g.classList.toggle("active", g.dataset.key === key));
    menu.querySelectorAll("a").forEach((a) => { if (here(a)) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
  }
  function label() { btn.setAttribute("aria-label", open ? L("ปิดเมนู", "Close menu") : L("เปิดเมนู", "Open menu")); }

  function setOpen(o, returnFocus) {
    open = o;
    if (o) {
      const h = header();
      menu.style.setProperty("--menu-top", (h ? Math.round(h.getBoundingClientRect().bottom) : 72) + "px");
      mark();
    }
    menu.classList.toggle("open", o);
    menu.inert = !o;
    menu.setAttribute("aria-hidden", String(!o));
    document.body.classList.toggle("menu-open", o);
    btn.setAttribute("aria-expanded", String(o));
    label();
    if (o) setTimeout(() => { const a = menu.querySelector("a"); if (a) a.focus({ preventScroll: true }); }, 60);
    else if (returnFocus) btn.focus({ preventScroll: true });
  }

  menu.inert = true; menu.setAttribute("aria-hidden", "true"); label();
  btn.addEventListener("click", () => setOpen(!open, true));
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false, false); });
  document.addEventListener("keydown", (e) => {
    if (!open) return;
    if (e.key === "Escape") { e.preventDefault(); setOpen(false, true); return; }
    if (e.key !== "Tab") return;
    // keep Tab inside the menu and its burger
    const items = [btn].concat(Array.from(menu.querySelectorAll("a, button")).filter((x) => x.offsetParent !== null));
    const i = items.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
    else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
  });
  window.addEventListener("hashchange", () => { mark(); if (open) setOpen(false, false); });
  window.addEventListener("resize", () => { if (open && innerWidth > 1180) setOpen(false, false); });
  if (I && I.on) I.on(label);
  mark();
})();
