# Building pages

How to *explain* is in [TEACHING.md](./TEACHING.md). Read it first. This file is about markup.

All pages live in `<library>/<subject>/<topic>/`, link `../../assets/style.css` and `../../assets/learn.js`, and set `<body data-topic="<subject>/<topic>">` (feeds the rust dots). Start every page from its template in [templates/topic/](./templates/topic/): keep the `<head>` exactly, then replace the `{{PLACEHOLDERS}}` and delete the HTML comments.

The design is set by `style.css`: a study notebook, with cool paper, ink blue, and a yellow highlighter. `learn.js` builds the **sidebar** on every page automatically: search (Ctrl K), the library tree with "you are here", the numbered chapters of the page (from its `<h2>`s, filled in as you scroll), and progress. It also adds the big chapter numbers on lesson and comeback pages. So:

- **Emoji: only the set below** (see [Emoji](#emoji)).
- **No hand-written table of contents, chapter numbers, or progress bars.** They're automatic.
- Each `<h2>` is a chapter: give it a short plain title ("How it works", "Under the hood") and an `id`.
- **Don't add per-page CSS** unless a diagram truly needs it. If something reusable is missing, add it to `assets/style.css` / `assets/learn.js` in the library *and* in this skill's `templates/library/assets/`.

## Emoji

The user likes emoji, but not the generic ones every chatbot uses. So there is one fixed set. Each emoji means one thing, everywhere: pages, chat, runner output, test files.

**Banned everywhere (too generic):** ✅ 🎉 🚀 💡 🔥 ✨ 👉 📚 🎯 💪 🧠 📌 ⚡ 📘 🔬 🔍 🟢 🟡 🔴 ✍️ 💻 🙌 👀 📝 🤔 ⚠️ 🐛

**The set** (one emoji per label, never stacked, nothing outside this table):

| Thing | Emoji | Why it fits |
|---|---|---|
| Depth: Quick (~5 min) | 🪁 | light, quick |
| Depth: Normal (~15 min) | 🧭 | find your way |
| Depth: Deep (~40 min) | 🤿 | dives *down*: depth means going further down |
| Depth: Master (multi-part) | 🐉 | the big one |
| Exercise tier: Guided discovery | 🔦 | discovering in the dark |
| Exercise tier: Practice | 🥋 | dojo reps |
| Exercise tier: Real-world | 🛰️ | out in the field |
| Exercise tier: Boss | 👾 | game boss |
| Lesson page | 📜 | |
| Exercises page | 🎲 | |
| Comeback / review page | 🪃 | it comes back |
| Cheatsheet | 🧾 | compact receipt |
| Terminal practice task | 📟 | |
| Capstone | 🏔️ | |
| Hint | 🕯️ | a little light |
| Full solution | 🗝️ | |
| Correct answer | 🍀 | |
| Not yet / try again | 🌀 | |
| All tests pass / all solved | 🪩 | |
| Runtime error in a runner | 🧨 | |
| Classic trap callout | 🪤 | |
| "You can now" win callout | 🏅 | |
| Next step (in chat) | 🛤️ | |
| Going deeper: Under the hood | 🔩 | |
| Going deeper: Edge cases | 🧗 | |
| Going deeper: Common mistakes | 🪤 | |
| Going deeper: Debugging it | 🪲 | |
| Going deeper: Connections | 🕸️ | |
| Going deeper: Why it's designed this way | 📐 | |
| Going deeper: Expert level | 🥷 | |
| Rusty topic (chat overview) | 🦴 | |
| Fresh topic (chat overview) | 🌱 | |

**Where emoji go:** chat replies (the SKILL.md §8 card, the first-run card, the overview), the depth question options, exercise tier labels (`.level` tags and the tier `<h3>`s), callout titles, hint and solution `<summary>`s, the depth pill, depth section `<h2>`s (the emoji comes first in the source; the chapter number is added in front of it), and the "Going deeper" divider. `learn.js` adds them to quiz feedback, runner output, sidebar page links and the "Going deeper" sidebar group.

**Where they don't:** `<h1>` titles, core chapter `<h2>`s (the big chapter numbers already do that job), breadcrumbs, body text. Exception: body text that is *about* emoji.

`learn.js` strips leading emoji from `<h1>`, breadcrumbs and core `<h2>`s, so a slip there is harmless. Everywhere else it leaves them alone.

## Writing style

- Short paragraphs (≤ 3 lines). Wrap the one phrase that matters most in a section in `<mark>` (yellow highlighter). At most one or two per chapter, or it stops meaning anything.
- Talk to the reader: "you", "we". Friendly, direct, no fluff, no "In this lesson we will explore...".
- Start sections with a concrete thing (a number, a line of code, a picture), then the explanation.
- Every step in a solution: **what** you do + `<span class="why">why: ...</span>`.
- Name things consistently. Once a term is in the glossary, always use it the same way.
- Math: `\( x^2 \)` inline, `$$ ... $$` or `\[ ... \]` for display (KaTeX). Don't use single `$`. KaTeX ships in `assets/vendor/`, so it works offline. Still write math that reads OK as raw text.
- Code: `<pre><code class="language-js">`. Escape `<`, `>`, `&` inside HTML.

## Layout: vary it

Pages must not be a stack of identical boxes. Pick the component that fits each piece of content:
code to explain → `.annotated` · a comparison → `.split` · a process → `.steps` or `ol.work` · something that changes → `.interactive` · a structure → SVG diagram · the main insight → `.big-idea` · an aside → `.side-note`.
Plain paragraphs between components are good: they give the eye a rest. Aim for at least 4 different component types per lesson.

## Components (all styled + wired by the shared assets)

| Need | Markup |
|---|---|
| Real problem box | `<div class="problem"><p>...</p></div>` |
| Key phrase | `<mark>...</mark>` (highlighter, sparingly) |
| Code explained line by line | `<div class="annotated"><div class="row"><pre><code>code</code></pre><div class="note">what + why</div></div>...</div>`: code on the left, explanation beside it. **Use this instead of a code block followed by paragraphs.** |
| Side by side | `<div class="split"><div>...</div><div>...</div></div>`: wrong vs right, before vs after, two approaches. Stacks on mobile. |
| Margin note | `<p class="side-note">...</p>`: an aside (history, fun fact, "you'll see this again in..."). Goes into the right margin on wide screens. |
| One-sentence big idea | `<div class="big-idea">...</div>` |
| Callout | `<div class="callout"><strong>Short title</strong> text</div>` · `.good` (win: `🏅 You can now`) · `.warn` (trap: `🪤 Classic trap`) · `.bad` (wrong way). The first `<strong>` becomes the callout's title. |
| Worked example | `<div class="example"><header>Title <span class="level easy">easy</span></header><div class="body">...</div></div>` (levels: `easy` `medium` `hard`; exercise tags, with their emoji: `<span class="level guided">🔦 Guided</span>` · `practice` 🥋 · `real` 🛰️ · `boss` 👾) |
| Numbered solution steps | `<ol class="work"><li>do X <span class="why">why: ...</span></li></ol>` |
| One-step-at-a-time explainer | `<div class="card steps"><div class="step">...</div>...</div>` (adds Back/Next/Show all) |
| Hint / solution | `<details class="hint"><summary>🕯️ Hint</summary><p>...</p></details>` · `<details class="solution"><summary>🗝️ Full solution</summary>...</details>` |
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
  <details class="hint"><summary>🕯️ Hint</summary><p>Undo the +3 first.</p></details>
  <p class="q-why">Shown once correct: the insight to keep.</p>
</div>

<!-- multiple choice -->
<div class="q" data-id="l2-p4" data-answer="b">
  <p>Question?</p>
  <ul class="q-choices"><li data-opt="a">...</li><li data-opt="b">...</li><li data-opt="c">...</li></ul>
</div>
```

- **Every `.q` and `.runner` has an explicit `data-id`.** Without one, `learn.js` falls back to the position on the page, which shifts when a question is inserted and marks the wrong question as solved.
- `data-id` must be **unique on the page and never change** (solved state is saved under it). Patterns:

  | Where | Pattern | Example |
  |---|---|---|
  | Lesson hook | `l<lesson>-hook` | `l2-hook` |
  | Lesson quick checks ("Your turn", Expert level) | `l<lesson>-q<n>` | `l2-q3` |
  | `exercises.html` lesson section | `l<lesson>-<g\|p\|r\|b><n>` (runners: `c<n>`) | `l2-p3`, `l2-c1` |
  | `exercises.html` extra section | `x<yyyymmdd>-<n>` | `x20261016-4` |
  | `comeback.html` | `cb<yyyymmdd>-w<n>` (warm-up), `cb<yyyymmdd>-h<n>` (hard) | `cb20261016-h2` |

  The comeback date is the day the problems were written. A refresh replaces them with problems dated today.
- After 3 wrong tries, a "🗝️ Show answer" button appears. It shows the **first** accepted answer and the `.q-why`, and counts as revealed, not solved. So put the clearest form first (`-2|x=-2`, not `x=-2|-2`), and write `.q-why` so it also teaches someone who gave up.
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
  <details class="solution"><summary>🗝️ Solution</summary><pre><code class="language-js">...</code></pre></details>
</div>
```

- `call` is an expression in the runner's language; `expect` is JSON (numbers get a tolerance; arrays/objects compared deeply).
- `console.log` / `print` output is shown too.
- Python loads Pyodide from the CDN on first run (needs internet). JS works offline.
- Code runs in a background worker: an endless loop is stopped after 3 s with a 🧨 message, and the page never freezes.
- **Verify:** `scripts/check.py` runs every JS/Python runner solution against its tests (SKILL.md §4d).
- Other languages (C, Java, PHP, Rust, Go, SQL, frameworks...): no runner. Use a 📟 terminal task (below) + a `Done when:` checklist.

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

Each lesson gets a `<section>` in `exercises.html`. **Counts depend on depth: use the table in SKILL.md §4e.**

| Tier | Purpose |
|---|---|
| 🔦 Guided discovery | **Teaches while doing.** Small steps that lead to an insight the harder tiers need ("try x=1, then x=2... what do you notice?"). The insight goes in `.q-why`. |
| 🥋 Practice | Direct use of the lesson's method. Full solution. |
| 🛰️ Real-world | A realistic situation from the field (a bug, a budget, a physics setup, an API response). Hint + full solution. |
| 👾 Boss | Hard. Combines this lesson with earlier lessons/topics. Two layered hints + full solution with the why. |

Deep/Master: 🛰️ and 👾 must also hit the depth sections: an edge case, a "find the bug" on a common mistake, a debugging scenario ("here's the log/output, what's wrong?").

The lesson page itself has its quick checks (guided + practice) and links to the full ladder.

Every solution shows the **reasoning**, not just the answer.

## Depth sections

Deep and Master lessons add these sections **after the cheat card**, behind the divider (the core lesson stays beginner-friendly). Master adds the last two. Each `<h2>` gets `class="deep"`, and the sidebar groups them under "Going deeper".

```html
<div class="deeper"><p class="deeper-title">🤿 Going deeper</p><p>You have the basics. Now: what really happens inside, and where it breaks.</p></div>
``` Each one is **substantial**: several paragraphs, diagrams, code/math, not a single callout.

```html
<h2 id="under-the-hood" class="deep">🔩 Under the hood</h2>   <!-- the real mechanism, step by step: use .steps + an SVG diagram -->
<h2 id="edge-cases" class="deep">🧗 Edge cases</h2>            <!-- ≥ 4 × .example: input → surprising result → why -->
<h2 id="mistakes" class="deep">🪤 Common mistakes</h2>         <!-- ≥ 4 × callout.bad (wrong code/work + exact error) then callout.good (fix + why) -->
<h2 id="debugging" class="deep">🪲 Debugging it</h2>           <!-- how to make the invisible visible: logs, debugger, print the state, sanity checks -->
<h2 id="connections" class="deep">🕸️ Connections</h2>          <!-- links to other lessons/topics + "learn next" -->
<h2 id="design" class="deep">📐 Why it's designed this way</h2> <!-- Master: the original problem, what came before, trade-offs -->
<h2 id="expert" class="deep">🥷 Expert level</h2>              <!-- Master: performance, security, scale, interview questions (as .q with solutions) -->
```

Master lessons are parts of a series. The sidebar lists every part, so no extra navigator is needed. Start each part's subtitle with "Part N of M:".

## Practice folder

For coding topics, at least one 👾 boss per lesson goes in `practice/NN-<name>/` so the user runs it in their own terminal:

```
practice/02-cart-total/
├── README.md       ← the task, the "done when" checklist, the run command
├── starter.js      ← what the user edits (TODOs, signatures)
├── test.js         ← tests starter.js, or the file given: `node test.js solution.js`
└── solution.js     ← reference solution (README says: try first!)
```

- **No dependencies** unless the topic is the framework itself. Use what the language ships with: `node:assert` for JS, plain `assert` + `python3 test.py` for Python, a `main` + expected output for C/Java/Go.
- Framework topics (React, Laravel...): a tiny real project is fine. README gives the exact setup commands (`npm create vite@latest ...`), using the current versions you looked up.
- The test file prints friendly output: `🍀 <test name>` or `🌀 <test name>: expected X, got Y` per test, then `🪩 All N tests pass!` at the end. Never a raw stack trace as the only feedback.
- **The test file takes the file to test as its argument**, default the starter: `node test.js` tests `starter.js`, `node test.js solution.js` tests the solution (Python: `python3 test.py [solution.py]`). It **exits with code 1** if any test fails. Rust: put `#[test]`s in `starter.rs` and `solution.rs` instead (run with `rustc --test`).

  ```js
  const path = require("node:path");
  const { cartTotal } = require(path.resolve(__dirname, process.argv[2] || "starter.js"));
  ```
- **Verify:** `scripts/check.py` checks the folder has all four files, the test fails on the starter and passes on the solution. Other languages (C, Java, Go...) get a warning: run those by hand.
- Link it from `exercises.html` with a `pre.cmd` box showing `cd` + run command (path relative to the library root).

## Comeback page rules

- 5–7 key points for the **whole topic**. Rewrite as it grows, never just append.
- Each key point = bold sentence + tiny example (≤ 4 lines of code/math) + link to the exact lesson section.
- 1 warm-up (easy, with a "peek at key point" hint) → 2–4 hard mixed problems.
- Must work as a 5-minute "I'm back" session.

## Cheatsheet rules

- One `.cheat` per lesson, same `id="cheat-N"` as the lesson's card, plus an "open lesson →" link.
- Glossary at the bottom: plain-English meaning + original-language term when the user's sources are not English.
