# Building pages

All pages live in `<library>/<subject>/<topic>/`, link `../../assets/style.css` and `../../assets/learn.js`, and set `<body data-topic="<subject>/<topic>">` (feeds the rust dots). Start every page from its template in [templates/topic/](./templates/topic/): keep the `<head>` exactly, then replace the `{{PLACEHOLDERS}}` and delete the HTML comments.

The design is set by `style.css`: clean, calm, one column. **Don't add per-page CSS** unless a diagram truly needs it. If something reusable is missing, add it to `assets/style.css` / `assets/learn.js` in the library *and* in this skill's `templates/library/assets/`.

## Writing style

- Short paragraphs (≤ 3 lines). Bold the one phrase that matters.
- Talk to the reader: "you", "we". Friendly, direct, no fluff, no "In this lesson we will explore...".
- Start sections with a concrete thing (a number, a line of code, a picture), then the explanation.
- Every step in a solution: **what** you do + `<span class="why">why: ...</span>`.
- Name things consistently. Once a term is in the glossary, always use it the same way.
- Math: `\( x^2 \)` inline, `$$ ... $$` or `\[ ... \]` for display (KaTeX). Don't use single `$`. Write it so it still reads OK as raw text if KaTeX doesn't load (offline).
- Code: `<pre><code class="language-js">`. Escape `<`, `>`, `&` inside HTML.

## Components (all styled + wired by the shared assets)

| Need | Markup |
|---|---|
| Real problem box | `<div class="problem"><p>...</p></div>` |
| One-sentence big idea | `<div class="big-idea">...</div>` |
| Callout | `<div class="callout">` · `.good` (win) · `.warn` (trap) · `.bad` (wrong way) |
| Worked example | `<div class="example"><header>Title <span class="level easy">easy</span></header><div class="body">...</div></div>` (levels: `easy` `medium` `hard`; exercise tags: `guided` `practice` `real` `boss`) |
| Numbered solution steps | `<ol class="work"><li>do X <span class="why">why: ...</span></li></ol>` |
| One-step-at-a-time explainer | `<div class="card steps"><div class="step">...</div>...</div>` (adds Back/Next/Show all) |
| Hint / solution | `<details class="hint"><summary>💡 Hint</summary><p>...</p></details>` · `class="solution"` |
| Terminal command | `<pre class="cmd"><code>node test.js</code></pre>` |
| Cheat card | `<div class="cheat" id="cheat-N"><h3>...</h3><ul>...</ul><div class="formula">...</div></div>` |
| Comeback key point | `<div class="keypoints"><div class="keypoint" id="kp-N">...</div></div>` |
| Next links | `<div class="next-nav"><a href="..."><small>label</small>Title</a></div>` |

### Quizzes (auto-checked)

```html
<!-- typed answer: several accepted answers separated by | ; numbers compare numerically, "3/4" = 0.75 -->
<div class="q" data-id="l2-p3" data-answer="4|x=4">
  <p>Solve \( 2x + 3 = 11 \)</p>
  <input class="q-input" placeholder="x = ?">
  <details class="hint"><summary>💡 Hint</summary><p>Undo the +3 first.</p></details>
  <p class="q-why">Shown once correct: the insight to keep.</p>
</div>

<!-- multiple choice -->
<div class="q" data-id="l2-p4" data-answer="b">
  <p>Question?</p>
  <ul class="q-choices"><li data-opt="a">...</li><li data-opt="b">...</li><li data-opt="c">...</li></ul>
</div>
```

- `data-id` must be **unique on the page and never change** (solved state is saved under it). Pattern: `l<lesson>-<g|p|r|b><n>`, extras `x<yyyymmdd>-<n>`.
- Typed answers: prefer numbers or short exact tokens. Text compare ignores case and spaces. List every reasonable form (`-2|x=-2`).
- Multiple choice: all options about the same length. The right one must not stand out. Wrong options = real misconceptions.

### Code runner (JavaScript or Python, in the browser)

```html
<div class="runner" data-id="l1-c1" data-lang="js">   <!-- or data-lang="py" -->
  <p>Write <code>slope(x1, y1, x2, y2)</code>...</p>
  <textarea class="runner-code">function slope(x1, y1, x2, y2) {
  // your code here
}</textarea>
  <script type="application/json" class="runner-tests">[
    {"call": "slope(0, 0, 2, 4)", "expect": 2},
    {"call": "slope(1, 5, 3, 1)", "expect": -2}
  ]</script>
  <details class="solution"><summary>✅ Solution</summary><pre><code class="language-js">...</code></pre></details>
</div>
```

- `call` is an expression in the runner's language; `expect` is JSON (numbers get a tolerance; arrays/objects compared deeply).
- `console.log` / `print` output is shown too.
- Python loads Pyodide from the CDN on first run (needs internet). JS works offline.
- **Verify:** before finishing, run the solution against the tests locally (`node -e` / `python3 -c`).
- Other languages (C, Java, PHP, Rust, Go, SQL, frameworks...): no runner. Use a terminal task (below) + a `✅ Done when:` checklist.

### Interactive visuals

```html
<div class="interactive">
  <svg class="plot" data-fn="a*x + b; 2*x" data-x="-10,10" data-y="-10,10" data-points="0, b"></svg>
  <div class="controls">
    <label>a <input type="range" data-var="a" min="-5" max="5" step="0.5" value="1"> <output data-out="a"></output></label>
    <label>b <input type="range" data-var="b" min="-5" max="5" step="1" value="0"> <output data-out="b"></output></label>
  </div>
</div>
```

- `data-fn`: one or more expressions in `x` separated by `;` (Math functions allowed: `sin(x)`, `sqrt(x)`, `pow(x,2)`). Slider vars in scope.
- `data-points`: `x, y` pairs separated by `;`, may use vars.
- `[data-out="a"]` shows the live value anywhere inside the `.interactive`.
- Custom visuals: listen for `document.addEventListener("learn:vars", e => { e.detail.scope; e.detail.vars })` and update your own inline SVG. Keep page scripts small and inline, at the end of `<body>`.
- Static diagrams: inline `<svg class="diagram">` with `fill="currentColor"` / CSS vars (`var(--accent)`) so they work in dark mode. Boxes + arrows beat paragraphs.

**When to use what:** anything that *changes* (a graph with parameters, a loop running, state updating, an array being sorted) → sliders or `.steps`. A structure (memory layout, component tree, request flow) → static SVG diagram.

## The exercise ladder

Each lesson's section in `exercises.html` (normal length; quick ≈ half, deep ≈ double):

| Tier | Count | Purpose |
|---|---|---|
| 🧩 Guided discovery | 2 | **Teaches while doing.** Small steps that lead to an insight the harder tiers need ("try x=1, then x=2... what do you notice?"). The insight goes in `.q-why`. |
| 🟢 Practice | 2–3 | Direct use of the lesson's method. Full solution. |
| 🟡 Real-world | 3–4 | A realistic situation from the field (a bug, a budget, a physics setup, an API response). Hint + full solution. |
| 🔴 Boss | 2 | Hard. Combines this lesson with earlier lessons/topics. Two layered hints + full solution with the why. |

The lesson page itself has 2–3 quick ones (🧩 + 🟢) and links here.

Every solution shows the **reasoning**, not just the answer.

## Practice folder

For coding topics, at least one 🔴 boss per lesson goes in `practice/NN-<name>/` so the user runs it in their own terminal:

```
practice/02-cart-total/
├── README.md       ← the task, the "done when" checklist, the run command
├── starter.js      ← what the user edits (TODOs, signatures)
├── test.js         ← runs the checks, prints ✅/❌ per test + a final 🎉
└── solution.js     ← reference solution (README says: try first!)
```

- **No dependencies** unless the topic is the framework itself. Use what the language ships with: `node:assert` for JS, plain `assert` + `python3 test.py` for Python, a `main` + expected output for C/Java/Go.
- Framework topics (React, Laravel...): a tiny real project is fine. README gives the exact setup commands (`npm create vite@latest ...`), using the current versions you looked up.
- The test file prints friendly output. Never a raw stack trace as the only feedback.
- **Verify** the solution passes the tests and the starter fails them before finishing.
- Link it from `exercises.html` with a `pre.cmd` box showing `cd` + run command (path relative to the library root).

## Comeback page rules

- 5–7 key points for the **whole topic**. Rewrite as it grows, never just append.
- Each key point = bold sentence + tiny example (≤ 4 lines of code/math) + link to the exact lesson section.
- 1 warm-up (easy, with a "peek at key point" hint) → 2–4 hard mixed problems.
- Must work as a 5-minute "I'm back" session.

## Cheatsheet rules

- One `.cheat` per lesson, same `id="cheat-N"` as the lesson's card, plus an "open lesson →" link.
- Glossary at the bottom: plain-English meaning + original-language term when the user's sources are not English.
