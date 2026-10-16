/* learn.js: shared engine for every page in a /learn library.
 * No build step and no server needed; works when opened straight from disk (file://).
 *
 * Features (all opt-in by markup, see the skill's PAGES.md):
 *   theme toggle · visit tracking (rust dots) · quizzes · JS/Python code runners
 *   step-through explanations · sliders + function plots · copy buttons · KaTeX / highlight.js
 *
 * Storage keys are "<library id>:<path from the library root>", so moving or renaming the
 * library folder keeps every solved answer and saved code. The id is window.LIBRARY.id (library.js).
 */
(function () {
  "use strict";

  // ---------- tiny helpers ----------
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); }
      catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode */ }
    },
  };
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  function el(tag, attrs, ...kids) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === "text") node.textContent = v;
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    for (const kid of kids) node.append(kid);
    return node;
  }
  // Local date (not UTC), so a late-night session counts for today.
  const today = () => {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  };

  // ---------- where am I? ----------
  // Library root, relative to this page: "../../" for topic pages, "" for the home page.
  const SCRIPT = document.currentScript;
  const ROOT = SCRIPT ? (SCRIPT.getAttribute("src") || "").replace(/assets\/learn\.js.*$/, "") : "";
  const FILE = decodeURIComponent(location.pathname.split("/").pop() || "main.html");
  const IS_LESSON = /-lesson-/.test(FILE) || FILE === "comeback.html";

  // ---------- storage keys ----------
  const ABS_PATH = decodeURIComponent(location.pathname).replace(/\\/g, "/");
  const REL_PATH = ABS_PATH.split("/").slice(-((ROOT.match(/\.\.\//g) || []).length + 1)).join("/");
  let LIB_ID = "lib"; // replaced by window.LIBRARY.id once library.js has loaded
  const pageKey = (rel) => LIB_ID + ":" + (rel || REL_PATH);
  // Before keys were relative, they used the absolute path. Copy an old value over once.
  function migrateKey(newKey, oldKey) {
    try {
      if (localStorage.getItem(newKey) === null && localStorage.getItem(oldKey) !== null) {
        localStorage.setItem(newKey, localStorage.getItem(oldKey));
      }
    } catch (e) { /* private mode */ }
  }

  function loadLibrary() {
    if (window.LIBRARY) return Promise.resolve(window.LIBRARY);
    return new Promise((resolve) => {
      const s = el("script", { src: ROOT + "library.js" });
      s.onload = () => resolve(window.LIBRARY || { subjects: [] });
      s.onerror = () => resolve({ subjects: [] });
      document.head.append(s);
    });
  }

  // ---------- theme ----------
  function currentTheme() {
    return document.documentElement.dataset.theme ||
      (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }
  function themeButton() {
    const saved = store.get("learn:theme", null);
    if (saved) document.documentElement.dataset.theme = saved;
    const btn = el("button", { type: "button", class: "theme-toggle", "aria-label": "Switch light/dark" });
    const paint = () => { btn.textContent = currentTheme() === "dark" ? "Light mode" : "Dark mode"; };
    btn.addEventListener("click", () => {
      const next = currentTheme() === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      store.set("learn:theme", next);
      paint();
      $$("svg.plot").forEach((svg) => svg.__redraw && svg.__redraw());
    });
    paint();
    return btn;
  }

  // ---------- chapters: numbered h2s on lesson pages ----------
  const stripIcon = (s) => s.replace(/^[\s\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}️‍]+/u, "");
  function initChapters() {
    const main = document.querySelector("main");
    if (!main) return [];
    // No emoji in titles, breadcrumbs or core chapters (PAGES.md#emoji): drop them there.
    // Labels, summaries, callouts and "Going deeper" chapters (h2.deep) keep theirs.
    const strip = (n) => {
      const first = n.firstChild;
      if (first && first.nodeType === 3) first.textContent = stripIcon(first.textContent);
    };
    $$(".crumbs a, .crumbs, h1", main).forEach(strip);
    if (document.body.classList.contains("home")) return [];
    const heads = $$("h2", main);
    heads.filter((h) => !h.classList.contains("deep")).forEach(strip);
    return heads.map((h, i) => {
      if (!h.id) h.id = "ch-" + (i + 1);
      const num = String(i + 1).padStart(2, "0");
      if (IS_LESSON) {
        h.classList.add("chapter");
        h.prepend(el("span", { class: "ch-num", "aria-hidden": "true", text: num }));
      }
      return { h, num, title: h.textContent.replace(/^\d\d/, "").trim() };
    });
  }

  // ---------- search (sidebar + home page) ----------
  let searchIndex = [];
  function buildIndex(lib) {
    searchIndex = [];
    (lib.subjects || []).forEach((s) => (s.topics || []).forEach((t) => {
      const b = ROOT + s.id + "/" + t.id + "/";
      searchIndex.push({ title: t.title, where: s.title + " · topic", href: b + "comeback.html", text: [t.title, t.summary, (t.tags || []).join(" ")].join(" ") });
      (t.lessons || []).forEach((l) => searchIndex.push({ title: l.title, where: t.title + " · lesson " + l.n, href: b + l.file, text: [l.title, l.summary, (l.tags || []).join(" ")].join(" ") }));
      (t.keypoints || []).forEach((k, i) => searchIndex.push({ title: k, where: t.title + " · key point", href: b + "comeback.html#kp-" + (i + 1), text: k }));
    }));
  }
  function search(query) {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return searchIndex.filter((it) => words.every((w) => (it.title + " " + it.text).toLowerCase().includes(w))).slice(0, 30);
  }

  // ---------- sidebar shell ----------
  let sidebarParts = null;
  function buildShell(chapters) {
    const main = document.querySelector("main");
    if (!main) return;
    document.body.classList.add("has-sidebar");

    const shell = el("div", { class: "shell" });
    const side = el("aside", { class: "sidebar", "aria-label": "Library navigation" });
    main.before(shell);
    shell.append(side, main);

    // Brand + search
    const brand = el("a", { class: "sb-brand", href: ROOT + "main.html", text: "Library" });
    const input = el("input", { type: "search", placeholder: "Search everything", "aria-label": "Search the library", autocomplete: "off" });
    const results = el("ul", { class: "sb-results", hidden: "" });
    const searchBox = el("div", { class: "sb-search" }, input, el("kbd", { text: "Ctrl K" }), results);

    const treeWrap = el("nav", {}, el("p", { class: "sb-label", text: "Topics" }));
    const tree = el("ul", { class: "sb-tree" });
    treeWrap.append(tree);

    side.append(brand, searchBox);

    // On this page
    let chapterLinks = [];
    if (chapters.length > 1) {
      const list = el("ul", { class: "sb-chapters" });
      let deepShown = false;
      chapterLinks = chapters.map((c) => {
        if (!deepShown && c.h.classList.contains("deep")) {
          deepShown = true;
          list.append(el("li", { class: "sb-deeper", text: "🤿 Going deeper" }));
        }
        const a = el("a", { href: "#" + c.h.id }, el("span", { text: c.num }), el("span", { text: c.title }));
        a.addEventListener("click", () => document.body.classList.remove("nav-open"));
        list.append(el("li", {}, a));
        return a;
      });
      side.append(el("div", {}, el("p", { class: "sb-label", text: "On this page" }), list));
    }

    // Progress (filled by initProgress)
    const progress = el("div", { class: "sb-progress", hidden: "" });
    const share = el("div", { class: "sb-share", hidden: "" });
    side.append(progress, share, treeWrap, el("div", { class: "sb-foot" }, themeButton()));

    // Mobile top bar
    const menuBtn = el("button", { type: "button", "aria-label": "Open navigation", text: "Menu" });
    menuBtn.addEventListener("click", () => document.body.classList.toggle("nav-open"));
    const h1 = main.querySelector("h1");
    const tbFill = el("div", { class: "tb-fill" });
    const topbar = el("div", { class: "topbar" }, menuBtn, el("span", { class: "tb-title", text: h1 ? stripIcon(h1.textContent) : "Library" }), el("div", { class: "tb-track" }, tbFill));
    shell.before(topbar);
    document.addEventListener("click", (e) => {
      if (document.body.classList.contains("nav-open") && !side.contains(e.target) && !topbar.contains(e.target)) document.body.classList.remove("nav-open");
    });

    // Search behaviour
    let sel = -1;
    const paintResults = () => {
      const hits = search(input.value);
      sel = -1;
      results.hidden = !input.value.trim();
      treeWrap.hidden = !results.hidden;
      results.innerHTML = "";
      if (!hits.length) { results.append(el("li", { class: "empty", text: "No match. Try fewer words." })); return; }
      hits.forEach((h) => results.append(el("li", {}, el("a", { href: h.href }, h.title, el("small", { text: h.where })))));
    };
    input.addEventListener("input", paintResults);
    input.addEventListener("keydown", (e) => {
      const links = $$("a", results);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        sel = Math.max(0, Math.min(links.length - 1, sel + (e.key === "ArrowDown" ? 1 : -1)));
        links.forEach((a, k) => a.classList.toggle("sel", k === sel));
      } else if (e.key === "Enter" && links.length) {
        location.href = links[Math.max(0, sel)].getAttribute("href");
      } else if (e.key === "Escape") {
        input.value = ""; paintResults(); input.blur();
      }
    });
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        document.body.classList.add("nav-open");
        input.focus();
      }
    });

    // Scroll-spy: chapters you've passed fill in.
    if (chapterLinks.length && "IntersectionObserver" in window) {
      const spy = () => {
        let current = 0;
        chapters.forEach((c, i) => { if (c.h.getBoundingClientRect().top < window.innerHeight * 0.35) current = i; });
        chapterLinks.forEach((a, i) => { a.classList.toggle("passed", i < current); a.classList.toggle("current", i === current); });
      };
      window.addEventListener("scroll", spy, { passive: true });
      spy();
    }

    sidebarParts = { tree, progress, share, tbFill };
  }

  function fillTree(lib) {
    if (!sidebarParts) return;
    const here = document.body.dataset.topic || "";
    const tree = sidebarParts.tree;
    (lib.subjects || []).filter((s) => (s.topics || []).length).forEach((s) => {
      const inSubject = here.startsWith(s.id + "/");
      const topics = el("ul");
      s.topics.forEach((t) => {
        const isHere = here === s.id + "/" + t.id;
        const b = ROOT + s.id + "/" + t.id + "/";
        const pages = el("ul", { class: "sb-pages" });
        const link = (file, text) => {
          const a = el("a", { href: b + file, text });
          if (isHere && FILE === file) { a.classList.add("here"); a.setAttribute("aria-current", "page"); }
          pages.append(el("li", {}, a));
        };
        (t.lessons || []).forEach((l) => link(l.file, "📜 " + l.n + ". " + l.title));
        pages.append(el("li", { class: "sb-sep", "aria-hidden": "true" }));
        link("exercises.html", "🎲 Exercises");
        link("comeback.html", "🪃 Comeback review");
        link("cheatsheet.html", "🧾 Cheatsheet");
        const d = el("details", { class: "sb-topic" }, el("summary", { text: t.title }), pages);
        if (isHere) d.open = true;
        topics.append(el("li", {}, d));
      });
      const d = el("details", { class: "sb-subject" }, el("summary", { text: s.title }), topics);
      if (inSubject || !here) d.open = true;
      tree.append(el("li", {}, d));
    });
    if (!tree.children.length) tree.append(el("li", { class: "empty", text: "Nothing yet. Run /learn <topic>." }));
  }

  // ---------- visits (feeds the rust dots and "Due for review" on the home page) ----------
  function recordVisit() {
    const topic = document.body.dataset.topic;
    if (!topic) return;
    const visits = store.get("learn:visits", {});
    visits[topic] = today();
    store.set("learn:visits", visits);
    if (FILE === "comeback.html") {
      // One comeback per day at most: { "<subject>/<topic>": { n, last } }
      const key = "learn:comebacks:" + LIB_ID;
      const cbs = store.get(key, {});
      const cb = cbs[topic] || { n: 0, last: "" };
      if (cb.last !== today()) { cb.n++; cb.last = today(); }
      cbs[topic] = cb;
      store.set(key, cbs);
    }
  }

  // ---------- attempts: what Claude can't see (tries, hints, solutions, reveals) ----------
  // learn:attempts:<page key> → { <data-id>: { kind, text, tries, wrong, hints, solutions, revealed, solved, firstTry, date } }
  const attemptsKey = (rel) => "learn:attempts:" + pageKey(rel);
  // The question's first line as plain text, with math back as its TeX source.
  function snippet(item) {
    const p = item.querySelector("p");
    if (!p) return "";
    const c = p.cloneNode(true);
    c.querySelectorAll(".level").forEach((n) => n.remove());
    c.querySelectorAll(".katex").forEach((k) => {
      const tex = k.querySelector('annotation[encoding="application/x-tex"]');
      k.replaceWith(tex ? tex.textContent : k.textContent);
    });
    return c.textContent.replace(/\s+/g, " ").trim().slice(0, 90);
  }
  function noteAttempt(item, change) {
    const all = store.get(attemptsKey(), {});
    const id = item.dataset.id;
    const a = all[id] || { kind: item.classList.contains("runner") ? "runner" : "q", text: snippet(item), tries: 0, wrong: 0, hints: 0, solutions: 0 };
    change(a);
    a.date = today();
    all[id] = a;
    store.set(attemptsKey(), all);
    return a;
  }
  const attemptOf = (item) => store.get(attemptsKey(), {})[item.dataset.id] || null;
  // Count each hint / solution once per page view.
  function watchHelp(item) {
    $$("details", item).forEach((d) => {
      let seen = false;
      d.addEventListener("toggle", () => {
        if (!d.open || seen) return;
        seen = true;
        const sol = d.classList.contains("solution");
        noteAttempt(item, (a) => { if (sol) a.solutions++; else a.hints++; });
      });
    });
  }
  function recordResult(item, ok) {
    return noteAttempt(item, (a) => {
      if (a.solved) return; // already solved: practice runs don't change the record
      a.tries++;
      if (ok) { a.solved = today(); a.firstTry = a.tries === 1 && !a.hints && !a.solutions; }
      else a.wrong++;
    });
  }

  // ---------- "Copy my progress for Claude" ----------
  function progressSummary(topic) {
    const pages = {};
    const kinds = { "learn:attempts:": "attempts", "learn:solved:": "solved" };
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        Object.keys(kinds).forEach((pre) => {
          const p = pre + LIB_ID + ":" + topic + "/";
          if (!k.startsWith(p)) return;
          const file = k.slice(p.length);
          pages[file] = pages[file] || { attempts: {}, solved: {} };
          pages[file][kinds[pre]] = store.get(k, {});
        });
      }
    } catch (e) { /* storage blocked */ }
    const files = Object.keys(pages).sort();
    const solvedBy = files.map((f) => [f, Object.keys(pages[f].solved).length]).filter((x) => x[1]);
    const total = solvedBy.reduce((n, x) => n + x[1], 0);
    const rows = [];
    files.forEach((f) => Object.entries(pages[f].attempts).forEach(([id, a]) => rows.push(Object.assign({ file: f, id }, a))));
    const name = (r) => r.file.replace(/\.html$/, "") + " " + r.id + (r.text ? ': "' + r.text + '"' : "");
    const list = (title, items, extra) => {
      if (!items.length) return [];
      const out = [title + ":"].concat(items.slice(0, 12).map((r) => "- " + name(r) + (extra ? " (" + extra(r) + ")" : "")));
      if (items.length > 12) out.push("- +" + (items.length - 12) + " more");
      return out;
    };
    return [
      "/learn progress summary: " + topic + " (" + today() + ")",
      "Solved: " + total + (total === 1 ? " question" : " questions") + (solvedBy.length ? " (" + solvedBy.map((x) => x[0].replace(/\.html$/, "") + " " + x[1]).join(", ") + ")" : ""),
      "First try: " + rows.filter((r) => r.firstTry).length,
    ].concat(
      list("Took 3+ tries", rows.filter((r) => r.kind === "q" && r.tries >= 3), (r) => r.tries + " tries, " + (r.solved ? "solved" : r.revealed ? "answer revealed" : "not solved")),
      list("Answer revealed, not solved", rows.filter((r) => r.revealed && !r.solved)),
      list("Hints opened", rows.filter((r) => r.hints), (r) => r.hints + "x"),
      list("Solutions opened", rows.filter((r) => r.solutions)),
      list("Code that never passed", rows.filter((r) => r.kind === "runner" && r.tries && !r.solved), (r) => r.tries + " runs"),
    ).join("\n");
  }
  function copyText(text) {
    const fallback = () => {
      const ta = el("textarea", { style: "position:fixed;opacity:0" });
      ta.value = text;
      document.body.append(ta);
      ta.select();
      let done = false;
      try { done = document.execCommand("copy"); } catch (e) { /* not allowed */ }
      ta.remove();
      if (!done) window.prompt("Copy this, then paste it to Claude:", text);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).catch(fallback);
    fallback();
    return Promise.resolve();
  }
  function initShare() {
    const topic = document.body.dataset.topic;
    if (!topic || !sidebarParts) return;
    const box = sidebarParts.share;
    const btn = el("button", { type: "button", class: "ghost", text: "Copy my progress for Claude" });
    btn.addEventListener("click", () => copyText(progressSummary(topic)).then(() => {
      btn.textContent = "Copied ✓ Paste it to Claude";
      setTimeout(() => { btn.textContent = "Copy my progress for Claude"; }, 2000);
    }));
    box.append(btn, el("p", { text: "What was hard on this topic, so Claude can target it next time." }));
    box.hidden = false;
  }

  // ---------- solved tracking + progress ----------
  const solvedKey = () => "learn:solved:" + pageKey();
  function markSolved(id) {
    const solved = store.get(solvedKey(), {});
    if (!solved[id]) { solved[id] = today(); store.set(solvedKey(), solved); }
    updateProgress();
  }
  const isSolved = (id) => Boolean(store.get(solvedKey(), {})[id]);

  let progressUI = null;
  function initProgress() {
    const items = $$(".q, .runner");
    // The home page counts "N / M solved" per topic from this list.
    if (document.body.dataset.topic) store.set("learn:items:" + pageKey(), items.map((n) => n.dataset.id));
    if (items.length < 2 || !sidebarParts) return;
    const box = sidebarParts.progress;
    const label = el("div");
    const fill = el("div", { class: "sb-fill" });
    const reset = el("button", { type: "button", class: "ghost", text: "Reset answers" });
    reset.addEventListener("click", () => {
      if (confirm("Clear your answers on this page?")) { store.set(solvedKey(), {}); location.reload(); }
    });
    box.append(el("p", { class: "sb-label", text: "Your progress" }), label, el("div", { class: "sb-track" }, fill), reset);
    box.hidden = false;
    progressUI = { label, fill, total: items.length };
    updateProgress();
  }
  function updateProgress() {
    if (!progressUI) return;
    const done = $$(".q, .runner").filter((n) => isSolved(n.dataset.id)).length;
    const pct = (100 * done / progressUI.total) + "%";
    progressUI.label.innerHTML = "<b>" + done + " / " + progressUI.total + "</b> solved" + (done === progressUI.total ? ". 🪩 All done!" : "");
    progressUI.fill.style.width = pct;
    sidebarParts.tbFill.style.width = pct;
  }

  // ---------- answer checking ----------
  function toNumber(s) {
    const t = String(s).trim().replace(/,/g, ".").replace(/\s+/g, "");
    if (/^[-+]?\d*\.?\d+$/.test(t)) return parseFloat(t);
    const frac = t.match(/^([-+]?\d*\.?\d+)\/([-+]?\d*\.?\d+)$/);
    if (frac && parseFloat(frac[2]) !== 0) return parseFloat(frac[1]) / parseFloat(frac[2]);
    return null;
  }
  const normalize = (s) => String(s).toLowerCase().replace(/\s+/g, "").replace(/[×*]/g, "*").replace(/−/g, "-");
  function answerMatches(given, accepted) {
    const g = given.trim();
    if (!g) return false;
    return accepted.split("|").some((a) => {
      const gn = toNumber(g), an = toNumber(a);
      if (gn !== null && an !== null) return Math.abs(gn - an) <= 1e-6 + 1e-3 * Math.abs(an);
      return normalize(g) === normalize(a);
    });
  }

  // ---------- quizzes ----------
  function initQuizzes() {
    $$(".q").forEach((q, i) => {
      q.dataset.id = q.dataset.id || "q" + (i + 1);
      const accepted = q.dataset.answer || "";
      const feedback = el("div", { class: "q-feedback", "aria-live": "polite" });
      // After 3 wrong tries, offer the answer. That counts as "revealed", not solved.
      const reveal = el("button", { type: "button", class: "ghost q-reveal", text: "🗝️ Show answer", hidden: "" });
      const done = (ok) => {
        q.classList.toggle("correct", ok);
        q.classList.toggle("wrong", !ok);
        feedback.className = "q-feedback " + (ok ? "ok" : "no");
        feedback.textContent = ok ? "🍀 Correct." : "🌀 Not yet. Try again, or open a hint.";
        const a = recordResult(q, ok);
        if (ok) { markSolved(q.dataset.id); reveal.hidden = true; }
        else if (a.wrong >= 3 && !a.solved && !q.classList.contains("revealed")) reveal.hidden = false;
      };
      const firstAnswer = () => {
        const first = accepted.split("|")[0].trim();
        const opt = q.querySelector('.q-choices li[data-opt="' + first + '"]');
        return opt ? first + ") " + opt.textContent.trim() : first;
      };
      reveal.addEventListener("click", () => {
        q.classList.add("revealed");
        reveal.hidden = true;
        feedback.className = "q-feedback";
        feedback.textContent = "🗝️ Answer: " + firstAnswer();
        noteAttempt(q, (a) => { a.revealed = true; });
      });

      const choices = q.querySelector(".q-choices");
      if (choices) {
        $$("li", choices).forEach((li) => {
          const btn = el("button", { type: "button" });
          btn.append(...Array.from(li.childNodes));
          li.append(btn);
          btn.addEventListener("click", () => {
            const ok = li.dataset.opt === accepted;
            btn.classList.add(ok ? "picked-right" : "picked-wrong");
            done(ok);
          });
        });
        choices.after(feedback);
      } else {
        let input = q.querySelector(".q-input");
        if (!input) input = el("input", { class: "q-input", placeholder: "Your answer" });
        input.setAttribute("autocomplete", "off");
        input.setAttribute("spellcheck", "false");
        const check = el("button", { type: "button", text: "Check" });
        const row = el("div", { class: "q-row" });
        input.replaceWith(row);
        if (!row.parentNode) q.append(row);
        row.append(input, check);
        const run = () => done(answerMatches(input.value, accepted));
        check.addEventListener("click", run);
        input.addEventListener("keydown", (e) => { if (e.key === "Enter") run(); });
        row.after(feedback);
      }

      feedback.after(reveal);
      const why = q.querySelector(".q-why");
      if (why) reveal.after(why);
      watchHelp(q);
      const past = attemptOf(q);
      if (isSolved(q.dataset.id)) { q.classList.add("correct"); feedback.className = "q-feedback ok"; feedback.textContent = "🍀 Solved before."; }
      else if (past && past.wrong >= 3) reveal.hidden = false;
    });
  }

  // ---------- code runners ----------
  function deepEqual(a, b) {
    if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) <= 1e-9 + 1e-6 * Math.abs(b);
    if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
    if (a && b && typeof a === "object" && typeof b === "object") {
      const ka = Object.keys(a).sort(), kb = Object.keys(b).sort();
      return deepEqual(ka, kb) && ka.every((k) => deepEqual(a[k], b[k]));
    }
    return a === b;
  }
  const show = (v) => { try { return JSON.stringify(v); } catch (e) { return String(v); } };

  // User code runs in a Web Worker made from a Blob URL (works from file://), so an endless
  // loop can be stopped after RUN_LIMIT_MS instead of freezing the page.
  const RUN_LIMIT_MS = 3000;
  const STOPPED = "Stopped after " + RUN_LIMIT_MS / 1000 + " s: is there an endless loop?";
  const blobURL = (src) => URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
  // A result crosses from the worker as JSON text: { ok, json } or { ok: false, error }.
  const unpack = (r) => (r.ok ? { ok: true, value: r.json === undefined ? undefined : JSON.parse(r.json) } : r);

  const JS_WORKER = `
self.onmessage = (e) => {
  const { code, tests } = e.data;
  let n = 0;
  const fmt = (args) => args.map((a) => { if (typeof a === "string") return a; try { return JSON.stringify(a); } catch (x) { return String(a); } }).join(" ");
  const log = (...a) => { if (n++ < 500) self.postMessage({ log: fmt(a) }); };
  const fakeConsole = { log, error: log, warn: log, info: log };
  const pack = (v) => { let json; try { json = JSON.stringify(v); } catch (x) { json = JSON.stringify(String(v)); } return { ok: true, json }; };
  const probes = tests.map((t) => "(() => { try { return __pack(" + t.call + "); } catch (e) { return { ok: false, error: String(e) }; } })()");
  try {
    const results = new Function("console", "__pack", code + "\\n;return [" + probes.join(",") + "];")(fakeConsole, pack);
    self.postMessage({ done: true, results });
  } catch (err) {
    self.postMessage({ done: true, error: String(err) });
  }
};`;
  let jsWorkerURL = null;

  function runJS(code, tests) {
    return new Promise((resolve) => {
      let worker;
      try {
        jsWorkerURL = jsWorkerURL || blobURL(JS_WORKER);
        worker = new Worker(jsWorkerURL);
      } catch (e) {
        resolve(runJSInline(code, tests));
        return;
      }
      const logs = [];
      let heard = false;
      const finish = (res) => { clearTimeout(timer); worker.terminate(); resolve(Object.assign({ logs }, res)); };
      const timer = setTimeout(() => finish({ error: STOPPED }), RUN_LIMIT_MS);
      worker.onmessage = (e) => {
        heard = true;
        if (e.data.log !== undefined) { logs.push(e.data.log); return; }
        finish(e.data.error ? { error: e.data.error } : { results: e.data.results.map(unpack) });
      };
      worker.onerror = (e) => {
        e.preventDefault();
        if (heard) return finish({ error: e.message || "Error" });
        // The worker itself could not start (a browser that blocks workers here): run inline.
        clearTimeout(timer); worker.terminate(); resolve(runJSInline(code, tests));
      };
      worker.postMessage({ code, tests });
    });
  }

  // Fallback without a worker: same thing on the main thread (no endless-loop protection).
  function runJSInline(code, tests) {
    const logs = [];
    const fmt = (args) => args.map((a) => (typeof a === "string" ? a : show(a))).join(" ");
    const fakeConsole = { log: (...a) => logs.push(fmt(a)), error: (...a) => logs.push(fmt(a)), warn: (...a) => logs.push(fmt(a)) };
    const probes = tests.map((t) =>
      "(() => { try { return { ok: true, value: (" + t.call + ") }; } catch (e) { return { ok: false, error: String(e) }; } })()");
    try {
      const results = new Function("console", code + "\n;return [" + probes.join(",") + "];")(fakeConsole);
      return { logs, results };
    } catch (e) {
      return { logs, error: String(e) };
    }
  }

  // Python: Pyodide in a worker that stays loaded between runs. On a timeout the worker is
  // stopped and the next run loads a fresh one.
  const PYODIDE = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/";
  const PY_WORKER = `
importScripts("${PYODIDE}pyodide.js");
const ready = loadPyodide({ indexURL: "${PYODIDE}" });
ready.then(() => self.postMessage({ ready: true }), (e) => self.postMessage({ loadError: String((e && e.message) || e) }));
self.onmessage = async (e) => {
  const py = await ready;
  const { code, tests } = e.data;
  const last = (err) => String(err.message || err).trim().split("\\n").slice(-1)[0];
  py.setStdout({ batched: (s) => self.postMessage({ log: s }) });
  py.setStderr({ batched: (s) => self.postMessage({ log: s }) });
  const ns = py.globals.get("dict")();
  try {
    py.runPython(code, { globals: ns });
  } catch (err) {
    ns.destroy();
    self.postMessage({ done: true, error: last(err) });
    return;
  }
  const results = tests.map((t) => {
    try { return { ok: true, json: py.runPython("__import__('json').dumps(" + t.call + ")", { globals: ns }) }; }
    catch (err) { return { ok: false, error: last(err) }; }
  });
  ns.destroy();
  self.postMessage({ done: true, results });
};`;
  let pyWorkerReady = null, pyLoaded = false, pyInline = false;
  function pyWorker() {
    if (!pyWorkerReady) {
      pyWorkerReady = new Promise((resolve, reject) => {
        let w;
        try { w = new Worker(blobURL(PY_WORKER)); } catch (e) { pyInline = true; reject(e); return; }
        w.onmessage = (e) => {
          if (e.data.ready) { pyLoaded = true; resolve(w); }
          else if (e.data.loadError) { w.terminate(); reject(new Error("Could not load Python (needs internet the first time).")); }
        };
        // importScripts failed: offline, or a browser that blocks workers here. Try the main thread next.
        w.onerror = (e) => { e.preventDefault(); w.terminate(); pyInline = true; reject(new Error("worker")); };
      });
      pyWorkerReady.catch(() => { pyWorkerReady = null; });
    }
    return pyWorkerReady;
  }
  async function runPython(code, tests) {
    if (pyInline) return runPythonInline(code, tests);
    let w;
    try { w = await pyWorker(); } catch (e) {
      if (pyInline) return runPythonInline(code, tests);
      throw e;
    }
    return new Promise((resolve) => {
      const logs = [];
      const finish = (res) => { clearTimeout(timer); resolve(Object.assign({ logs }, res)); };
      const timer = setTimeout(() => {
        w.terminate(); pyWorkerReady = null; pyLoaded = false;
        finish({ error: STOPPED + " (Python reloads on the next run.)" });
      }, RUN_LIMIT_MS);
      w.onmessage = (e) => {
        if (e.data.log !== undefined) { logs.push(e.data.log); return; }
        finish(e.data.error ? { error: e.data.error } : { results: e.data.results.map(unpack) });
      };
      w.onerror = (e) => { e.preventDefault(); finish({ error: e.message || "Error" }); };
      w.postMessage({ code, tests });
    });
  }

  // Fallback without a worker: Pyodide on the main thread (no endless-loop protection).
  let pyodideReady = null;
  function loadPyodide() {
    if (!pyodideReady) {
      pyodideReady = new Promise((resolve, reject) => {
        const s = el("script", { src: PYODIDE + "pyodide.js" });
        s.onload = () => window.loadPyodide().then(resolve, reject);
        s.onerror = () => reject(new Error("Could not load Python (needs internet the first time)."));
        document.head.append(s);
      });
    }
    return pyodideReady;
  }
  async function runPythonInline(code, tests) {
    const py = await loadPyodide();
    const logs = [];
    py.setStdout({ batched: (s) => logs.push(s) });
    py.setStderr({ batched: (s) => logs.push(s) });
    const ns = py.globals.get("dict")();
    try {
      py.runPython(code, { globals: ns });
    } catch (e) {
      return { logs, error: String(e.message || e).trim().split("\n").slice(-1)[0] };
    }
    const results = tests.map((t) => {
      try {
        return { ok: true, value: JSON.parse(py.runPython("__import__('json').dumps(" + t.call + ")", { globals: ns })) };
      } catch (e) {
        return { ok: false, error: String(e.message || e).trim().split("\n").slice(-1)[0] };
      }
    });
    ns.destroy();
    return { logs, results };
  }

  function initRunners() {
    $$(".runner").forEach((box, i) => {
      box.dataset.id = box.dataset.id || "code" + (i + 1);
      const lang = (box.dataset.lang || "js").toLowerCase();
      const area = box.querySelector(".runner-code");
      const testsTag = box.querySelector(".runner-tests");
      const tests = testsTag ? JSON.parse(testsTag.textContent) : [];
      const starter = area.value;
      const saveKey = "learn:code:" + pageKey() + ":" + box.dataset.id;
      migrateKey(saveKey, "learn:code:" + ABS_PATH + ":" + box.dataset.id);
      const saved = store.get(saveKey, null);
      if (saved !== null) area.value = saved;
      area.spellcheck = false;

      const out = el("pre", { class: "runner-out", "aria-live": "polite" });
      const runBtn = el("button", { type: "button", text: "Run" });
      const resetBtn = el("button", { type: "button", class: "ghost", text: "Reset code" });
      const langTag = el("span", { class: "runner-lang", text: lang === "py" || lang === "python" ? "Python · Ctrl+Enter" : "JavaScript · Ctrl+Enter" });
      area.after(el("div", { class: "runner-bar" }, runBtn, resetBtn, langTag), out);

      const line = (cls, text) => out.append(el("span", { class: cls, text: text + "\n" }));
      async function run() {
        store.set(saveKey, area.value);
        out.textContent = "";
        out.classList.add("show");
        runBtn.disabled = true;
        let res;
        try {
          if (lang === "py" || lang === "python") {
            if (!pyLoaded && !pyodideReady) line("log", "📟 Loading Python (first run takes a few seconds)…");
            res = await runPython(area.value, tests);
            out.textContent = "";
          } else {
            res = await runJS(area.value, tests);
          }
        } catch (e) {
          res = { logs: [], error: String(e.message || e) };
        }
        runBtn.disabled = false;
        res.logs.forEach((l) => line("log", l.replace(/\n$/, "")));
        if (res.error) { line("fail", "🧨 " + res.error); box.classList.remove("correct"); recordResult(box, false); return; }
        let passed = 0;
        tests.forEach((t, k) => {
          const r = res.results[k];
          const ok = r.ok && deepEqual(r.value, t.expect);
          if (ok) passed++;
          line(ok ? "pass" : "fail", (ok ? "🍀 " : "🌀 ") + t.call + " → " +
            (r.ok ? show(r.value) : "error: " + r.error) + (ok ? "" : "   (expected " + show(t.expect) + ")"));
        });
        if (tests.length) {
          const all = passed === tests.length;
          line(all ? "pass" : "fail", all ? "\n🪩 All " + passed + " tests pass!" : "\n" + passed + " / " + tests.length + " tests pass. Keep going.");
          box.classList.toggle("correct", all);
          recordResult(box, all);
          if (all) markSolved(box.dataset.id);
        }
      }
      runBtn.addEventListener("click", run);
      resetBtn.addEventListener("click", () => { area.value = starter; store.set(saveKey, null); });
      area.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); run(); }
        if (e.key === "Tab") {
          e.preventDefault();
          const { selectionStart: s, selectionEnd: en } = area;
          area.setRangeText("  ", s, en, "end");
        }
      });
      watchHelp(box);
      if (isSolved(box.dataset.id)) box.classList.add("correct");
    });
  }

  // ---------- step-through explanations ----------
  function initSteps() {
    $$(".steps").forEach((wrap) => {
      const steps = $$(":scope > .step", wrap);
      if (!steps.length) return;
      let i = 0;
      const count = el("span", { class: "steps-count" });
      const dots = el("span", { class: "steps-dots", "aria-hidden": "true" }, ...steps.map(() => el("i")));
      const prev = el("button", { type: "button", class: "ghost", text: "Back" });
      const next = el("button", { type: "button", text: "Next step" });
      const all = el("button", { type: "button", class: "ghost", text: "Show all" });
      const paint = () => {
        steps.forEach((s, k) => s.classList.toggle("active", k === i));
        prev.disabled = i === 0;
        next.disabled = i === steps.length - 1;
        count.textContent = (i + 1) + " of " + steps.length;
        Array.from(dots.children).forEach((d, k) => d.classList.toggle("on", k <= i));
      };
      prev.addEventListener("click", () => { i = Math.max(0, i - 1); paint(); });
      next.addEventListener("click", () => { i = Math.min(steps.length - 1, i + 1); paint(); });
      all.addEventListener("click", () => {
        const on = wrap.classList.toggle("show-all");
        all.textContent = on ? "One at a time" : "Show all";
      });
      wrap.append(el("div", { class: "steps-nav" }, prev, next, all, dots, count));
      paint();
    });
  }

  // ---------- sliders + function plots ----------
  // <div class="interactive">
  //   <svg class="plot" data-fn="a*x+b" data-x="-10,10" data-y="-10,10"></svg>
  //   <div class="controls"><label>a <input type="range" data-var="a" min="-5" max="5" step="0.5" value="1"> <output data-out="a"></output></label></div>
  // </div>
  // A page can also listen: document.addEventListener("learn:vars", e => e.detail.scope / e.detail.vars)
  function scopeVars(scope) {
    const vars = {};
    $$("input[data-var]", scope).forEach((inp) => { vars[inp.dataset.var] = parseFloat(inp.value); });
    return vars;
  }
  const PALETTE = ["--accent", "--bad", "--good", "--warn"];
  function drawPlot(svg, vars) {
    const css = getComputedStyle(document.documentElement);
    const [x0, x1] = (svg.dataset.x || "-10,10").split(",").map(Number);
    const [y0, y1] = (svg.dataset.y || "-10,10").split(",").map(Number);
    const W = 600, H = Math.round(W * (svg.dataset.ratio ? Number(svg.dataset.ratio) : 0.6));
    const sx = (x) => ((x - x0) / (x1 - x0)) * W;
    const sy = (y) => H - ((y - y0) / (y1 - y0)) * H;
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    const parts = [];
    const step = (lo, hi) => { const r = hi - lo; return r <= 12 ? 1 : r <= 30 ? 5 : r <= 120 ? 10 : Math.pow(10, Math.floor(Math.log10(r)) - 1) * 5; };
    const gx = step(x0, x1), gy = step(y0, y1);
    for (let x = Math.ceil(x0 / gx) * gx; x <= x1; x += gx) {
      parts.push('<line class="grid" x1="' + sx(x) + '" x2="' + sx(x) + '" y1="0" y2="' + H + '"/>');
      if (x !== 0) parts.push('<text class="tick" x="' + (sx(x) + 3) + '" y="' + Math.min(H - 4, Math.max(12, sy(0) + 14)) + '">' + x + "</text>");
    }
    for (let y = Math.ceil(y0 / gy) * gy; y <= y1; y += gy) {
      parts.push('<line class="grid" y1="' + sy(y) + '" y2="' + sy(y) + '" x1="0" x2="' + W + '"/>');
      if (y !== 0) parts.push('<text class="tick" y="' + (sy(y) - 3) + '" x="' + Math.min(W - 24, Math.max(3, sx(0) + 4)) + '">' + y + "</text>");
    }
    if (x0 <= 0 && x1 >= 0) parts.push('<line class="axis" x1="' + sx(0) + '" x2="' + sx(0) + '" y1="0" y2="' + H + '"/>');
    if (y0 <= 0 && y1 >= 0) parts.push('<line class="axis" y1="' + sy(0) + '" y2="' + sy(0) + '" x1="0" x2="' + W + '"/>');
    (svg.dataset.fn || "").split(";").map((s) => s.trim()).filter(Boolean).forEach((expr, k) => {
      let f;
      try { f = new Function("x", "v", "with (Math) { with (v) { return (" + expr + "); } }"); } catch (e) { return; }
      let d = "", pen = false;
      for (let px = 0; px <= W; px += 2) {
        const x = x0 + (px / W) * (x1 - x0);
        let y;
        try { y = f(x, vars); } catch (e) { y = NaN; }
        if (!isFinite(y) || y < y0 - (y1 - y0) || y > y1 + (y1 - y0)) { pen = false; continue; }
        d += (pen ? "L" : "M") + px.toFixed(1) + " " + sy(y).toFixed(1);
        pen = true;
      }
      const color = css.getPropertyValue(PALETTE[k % PALETTE.length]).trim();
      parts.push('<path class="curve" stroke="' + color + '" d="' + d + '"/>');
    });
    (svg.dataset.points || "").split(";").map((s) => s.trim()).filter(Boolean).forEach((pt) => {
      try {
        const [px, py] = new Function("v", "with (Math) { with (v) { return [" + pt + "]; } }")(vars);
        if (isFinite(px) && isFinite(py)) parts.push('<circle cx="' + sx(px) + '" cy="' + sy(py) + '" r="6" fill="' + css.getPropertyValue("--bad").trim() + '"/>');
      } catch (e) { /* ignore bad point */ }
    });
    svg.innerHTML = parts.join("");
  }
  function initInteractive() {
    const scopes = new Set($$("input[data-var]").map((inp) => inp.closest(".interactive") || document.body));
    $$("svg.plot").forEach((svg) => scopes.add(svg.closest(".interactive") || document.body));
    scopes.forEach((scope) => {
      const refresh = () => {
        const vars = scopeVars(scope);
        $$("[data-out]", scope).forEach((o) => { if (o.dataset.out in vars) o.textContent = vars[o.dataset.out]; });
        $$("svg.plot", scope).forEach((svg) => { svg.__redraw = () => drawPlot(svg, scopeVars(scope)); drawPlot(svg, vars); });
        document.dispatchEvent(new CustomEvent("learn:vars", { detail: { scope, vars } }));
      };
      $$("input[data-var]", scope).forEach((inp) => inp.addEventListener("input", refresh));
      refresh();
    });
  }

  // ---------- copy buttons on code blocks ----------
  function initCopy() {
    $$("pre").forEach((pre) => {
      if (pre.classList.contains("runner-out")) return;
      const btn = el("button", { type: "button", class: "copy-btn", text: "Copy" });
      btn.addEventListener("click", () => {
        const text = (pre.querySelector("code") || pre).innerText;
        navigator.clipboard.writeText(text).then(() => {
          btn.textContent = "Copied ✓";
          setTimeout(() => { btn.textContent = "Copy"; }, 1200);
        });
      });
      pre.append(btn);
    });
  }

  // ---------- optional libraries (load from CDN when online; pages still work offline) ----------
  function initLibs() {
    if (window.hljs) $$("pre code").forEach((c) => window.hljs.highlightElement(c));
    if (window.renderMathInElement) {
      window.renderMathInElement(document.body, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "\\[", right: "\\]", display: true },
          { left: "\\(", right: "\\)", display: false },
        ],
        ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code", "input"],
        throwOnError: false,
      });
    }
  }

  // Public API for page-specific scripts.
  window.Learn = { store, el, answerMatches, markSolved, drawPlot, search, root: ROOT, pageKey, today, progressSummary };

  // Pages made before main.html existed link to index.html: point them at main.html.
  function fixHomeLinks() {
    $$('a[href="' + ROOT + 'index.html"]').forEach((a) => a.setAttribute("href", ROOT + "main.html"));
  }

  function boot() {
    fixHomeLinks();
    const chapters = initChapters();
    if (document.body.classList.contains("home")) document.body.append(themeButton());
    else buildShell(chapters);
    initLibs();
    initSteps();
    initInteractive();
    initCopy();
    // Saved answers are keyed by the library id, so wait for library.js (a local file: instant).
    loadLibrary().then((lib) => {
      if (lib.id) LIB_ID = String(lib.id);
      migrateKey(solvedKey(), "learn:solved:" + ABS_PATH);
      recordVisit();
      initQuizzes();
      initRunners();
      initProgress();
      initShare();
      buildIndex(lib);
      fillTree(lib);
      document.dispatchEvent(new CustomEvent("learn:ready", { detail: { library: lib } }));
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
