/* learn.js: shared engine for every page in a /learn library.
 * No build step and no server needed; works when opened straight from disk (file://).
 *
 * Features (all opt-in by markup, see the skill's PAGES.md):
 *   theme toggle · visit tracking (rust dots) · quizzes · JS/Python code runners
 *   step-through explanations · sliders + function plots · copy buttons · KaTeX / highlight.js
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
  const today = () => new Date().toISOString().slice(0, 10);
  const pageKey = () => decodeURIComponent(location.pathname).replace(/\\/g, "/");

  // ---------- theme ----------
  function currentTheme() {
    return document.documentElement.dataset.theme ||
      (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }
  function initTheme() {
    const saved = store.get("learn:theme", null);
    if (saved) document.documentElement.dataset.theme = saved;
    const btn = el("button", { class: "theme-toggle", title: "Toggle light/dark", "aria-label": "Toggle light/dark" });
    const paint = () => { btn.textContent = currentTheme() === "dark" ? "☀️" : "🌙"; };
    btn.addEventListener("click", () => {
      const next = currentTheme() === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      store.set("learn:theme", next);
      paint();
      $$("svg.plot").forEach((svg) => svg.__redraw && svg.__redraw());
    });
    paint();
    document.body.append(btn);
  }

  // ---------- visits (feeds the rust dots on the home page) ----------
  function recordVisit() {
    const topic = document.body.dataset.topic;
    if (!topic) return;
    const visits = store.get("learn:visits", {});
    visits[topic] = today();
    store.set("learn:visits", visits);
  }

  // ---------- solved tracking + progress bar ----------
  const solvedKey = () => "learn:solved:" + pageKey();
  function markSolved(id) {
    const solved = store.get(solvedKey(), {});
    if (!solved[id]) { solved[id] = today(); store.set(solvedKey(), solved); }
    updateProgress();
  }
  const isSolved = (id) => Boolean(store.get(solvedKey(), {})[id]);

  let progressBar = null;
  function initProgress() {
    const items = $$(".q, .runner");
    if (items.length < 2) return;
    const fill = el("div", { class: "progress-fill" });
    const label = el("span");
    const reset = el("button", { class: "ghost", title: "Clear your answers on this page", text: "↺" });
    reset.addEventListener("click", () => {
      if (confirm("Reset your progress on this page?")) { store.set(solvedKey(), {}); location.reload(); }
    });
    progressBar = { fill, label, total: items.length };
    const bar = el("div", { class: "progress" }, label, el("div", { class: "progress-track" }, fill), reset);
    const h1 = document.querySelector("main h1");
    (h1 && h1.parentElement === document.querySelector("main") ? h1 : document.querySelector("main").firstChild)
      .after(bar);
    updateProgress();
  }
  function updateProgress() {
    if (!progressBar) return;
    const done = $$(".q, .runner").filter((n) => isSolved(n.dataset.id)).length;
    progressBar.label.textContent = (done === progressBar.total ? "🏆 " : "✅ ") + done + " / " + progressBar.total + " solved";
    progressBar.fill.style.width = (100 * done / progressBar.total) + "%";
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
      const done = (ok) => {
        q.classList.toggle("correct", ok);
        q.classList.toggle("wrong", !ok);
        feedback.className = "q-feedback " + (ok ? "ok" : "no");
        feedback.textContent = ok ? "✅ Correct!" : "❌ Not yet. Try again, or open a hint.";
        if (ok) markSolved(q.dataset.id);
      };

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

      const why = q.querySelector(".q-why");
      if (why) feedback.after(why);
      if (isSolved(q.dataset.id)) { q.classList.add("correct"); feedback.className = "q-feedback ok"; feedback.textContent = "✅ Solved before"; }
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

  function runJS(code, tests) {
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

  let pyodideReady = null;
  function loadPyodide() {
    if (!pyodideReady) {
      pyodideReady = new Promise((resolve, reject) => {
        const s = el("script", { src: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js" });
        s.onload = () => window.loadPyodide().then(resolve, reject);
        s.onerror = () => reject(new Error("Could not load Python (needs internet the first time)."));
        document.head.append(s);
      });
    }
    return pyodideReady;
  }
  async function runPython(code, tests) {
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
      const saved = store.get(saveKey, null);
      if (saved !== null) area.value = saved;
      area.spellcheck = false;

      const out = el("pre", { class: "runner-out", "aria-live": "polite" });
      const runBtn = el("button", { type: "button", text: "▶ Run" });
      const resetBtn = el("button", { type: "button", class: "ghost", text: "↺ Reset code" });
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
            if (!pyodideReady) line("log", "⏳ Loading Python (first run takes a few seconds)…");
            res = await runPython(area.value, tests);
            out.textContent = "";
          } else {
            res = runJS(area.value, tests);
          }
        } catch (e) {
          res = { logs: [], error: String(e.message || e) };
        }
        runBtn.disabled = false;
        res.logs.forEach((l) => line("log", l.replace(/\n$/, "")));
        if (res.error) { line("fail", "💥 " + res.error); box.classList.remove("correct"); return; }
        let passed = 0;
        tests.forEach((t, k) => {
          const r = res.results[k];
          const ok = r.ok && deepEqual(r.value, t.expect);
          if (ok) passed++;
          line(ok ? "pass" : "fail", (ok ? "✅ " : "❌ ") + t.call + " → " +
            (r.ok ? show(r.value) : "error: " + r.error) + (ok ? "" : "   (expected " + show(t.expect) + ")"));
        });
        if (tests.length) {
          const all = passed === tests.length;
          line(all ? "pass" : "fail", all ? "\n🎉 All " + passed + " tests pass!" : "\n" + passed + " / " + tests.length + " tests pass. Keep going.");
          box.classList.toggle("correct", all);
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
      const prev = el("button", { type: "button", class: "ghost", text: "← Back" });
      const next = el("button", { type: "button", text: "Next step →" });
      const all = el("button", { type: "button", class: "ghost", text: "Show all" });
      const paint = () => {
        steps.forEach((s, k) => s.classList.toggle("active", k === i));
        prev.disabled = i === 0;
        next.disabled = i === steps.length - 1;
        count.textContent = "Step " + (i + 1) + " / " + steps.length;
      };
      prev.addEventListener("click", () => { i = Math.max(0, i - 1); paint(); });
      next.addEventListener("click", () => { i = Math.min(steps.length - 1, i + 1); paint(); });
      all.addEventListener("click", () => {
        const on = wrap.classList.toggle("show-all");
        all.textContent = on ? "One at a time" : "Show all";
      });
      wrap.append(el("div", { class: "steps-nav" }, prev, next, all, count));
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
  window.Learn = { store, el, answerMatches, markSolved, drawPlot };

  function boot() {
    initTheme();
    recordVisit();
    initLibs();
    initQuizzes();
    initRunners();
    initSteps();
    initInteractive();
    initCopy();
    initProgress();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
