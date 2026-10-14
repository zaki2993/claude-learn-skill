# /learn: a Claude Code skill for learning anything

Turns Claude into a personal teacher that builds you a **learning library**: beautiful HTML lessons, self-checking exercises, and "comeback" pages for when you've forgotten everything. All of it works in your browser **without Claude**.

Built for ADHD brains, and nice for everyone else:
- 🎯 Every lesson starts from a **real problem** you can play with, and ends by solving it
- 🧠 **Intuition first** (3Blue1Brown style): see the idea, then name it, then the math and code
- 🖼️ **Visual**: diagrams, sliders, live graphs, one-step-at-a-time explanations
- ⚙️ Teaches **why** it works, one direct method, lots of worked examples
- ✍️ Exercise ladder: 🧩 guided discovery → 🟢 practice → 🟡 real-world → 🔴 boss, checked instantly
- 💻 JS/Python run in the page; harder coding tasks are real files you run in your terminal
- 🔁 **Comeback pages**: 2-minute key points, then straight to hard problems. Dust off, don't restart.
- 🟢🟠🔴 Rust dots show which topics are fading
- 🔎 One home page to search everything you've ever learned
- 🎚️ 4 depth levels: ⚡ quick · 📘 normal · 🔬 deep (under the hood, edge cases, debugging) · 🧠 master (multi-part series + capstone)

## Install

```bash
git clone https://github.com/zaki2993/claude-learn-skill.git ~/.claude/skills/learn
```

## Use

```bash
mkdir ~/learn && cd ~/learn && claude
```

Then, in plain words:

```
/learn linear equations
/learn next lesson
/learn more hard problems on react hooks
/learn I forgot how SQL joins work
/learn why does the minus sign flip the inequality?
```

The first run asks to set up a library in the current folder. Open **`main.html`** (and bookmark it): every subject, topic and lesson is one click from there.

## Library layout

```
learn/
├── main.html   ← start here: every subject, topic and lesson
├── library.js  learn.json  assets/
└── <subject>/<topic>/
    ├── 01-lesson-*.html   exercises.html   comeback.html   cheatsheet.html
    ├── practice/          ← terminal exercises
    ├── progress.md        ← Claude's notes on your struggles
    └── sources/           ← optional: your class PDFs/notes
```

## Files in this skill

- `SKILL.md`: how Claude runs a session
- `TEACHING.md`: how to explain (intuition first, jargon budget, lesson arc, self-review)
- `PAGES.md`: page components, exercise ladder, quality rules
- `templates/library/`: copied once into a new library (shared CSS/JS engine, home page)
- `templates/topic/`: page skeletons Claude fills in for each topic

## License

MIT
