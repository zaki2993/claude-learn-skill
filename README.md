# /learn

A Claude Code skill that turns Claude into a personal teacher. Ask it about any topic (math, programming, a framework, a science) and it builds lessons into a **learning library** on your disk. That's a folder of HTML pages you can open in the browser any time, without Claude.

It was designed for people with ADHD, but anyone who learns better from pictures and examples than from walls of text will like it.

## How it teaches

- **Intuition first.** You see and play with the idea before it gets a name, and you get the picture before the math. The style is close to 3Blue1Brown.
- **Real problems.** Every lesson opens with a problem from the field and ends by solving it.
- **Plain words.** A lesson introduces at most three new terms, and each one only after you've seen what it means.
- **One direct method.** It teaches the most useful way to do something, not a menu of alternatives.
- **Lots of worked examples**, easy to hard, with the reasoning behind every step.
- **Your choice of depth** for each lesson:
  - **Quick** (about 5 minutes)
  - **Normal** (about 15 minutes)
  - **Deep**: adds what happens under the hood, edge cases, common mistakes and debugging
  - **Master**: a multi-part series that ends with a project

  Deep material always comes after the basics.

## What you get for each topic

| Page | What it's for |
|---|---|
| Lessons | The explanation, with diagrams, sliders, live graphs and step-by-step walkthroughs |
| Exercises | Guided problems that teach as you go, then practice, real-world problems and hard "boss" problems. Answers are checked right on the page. |
| Review | For when you come back weeks later: the key points in two minutes, then straight to hard problems |
| Cheatsheet | Every summary card from the topic on one page, for quick lookups |

JavaScript and Python exercises run directly in the page. Bigger coding exercises are real files in a `practice/` folder that you run in your own terminal.

Claude keeps notes on what you found hard and uses them next time.

## Install

```bash
git clone https://github.com/zaki2993/claude-learn-skill.git ~/.claude/skills/learn
```

## Use

Create a folder for your library and start Claude Code in it:

```bash
mkdir ~/learn && cd ~/learn && claude
```

Then ask for what you want in plain words:

```
/learn linear equations
/learn next lesson
/learn more hard problems on react hooks
/learn I forgot how SQL joins work
/learn why does the minus sign flip the inequality?
```

The first run asks before it sets up the library in the current folder. After that, open `main.html` and bookmark it. Every subject, topic and lesson is one click from there.

## Library layout

```
learn/
├── main.html              start here: every subject, topic and lesson
├── library.js             catalogue of everything in the library
├── learn.json             settings
├── assets/                shared style and page engine
└── <subject>/<topic>/
    ├── 01-lesson-*.html   lessons
    ├── exercises.html
    ├── comeback.html      the review page
    ├── cheatsheet.html
    ├── practice/          exercises to run in your terminal
    ├── progress.md        Claude's notes on how you're doing
    └── sources/           optional: your own course PDFs and notes
```

## Files in this skill

| File | Purpose |
|---|---|
| `SKILL.md` | How Claude runs a session |
| `TEACHING.md` | How to explain: the lesson structure, the limit on new terms, the self-review |
| `PAGES.md` | Page components, exercise levels, quality rules |
| `scripts/check.py` | Checks a finished lesson: minimums, ids, links, runner solutions, practice tests. Claude runs it after every lesson |
| `templates/library/` | Copied into a new library: the home page and the shared style and engine |
| `templates/topic/` | Page templates Claude fills in for each topic |

## License

MIT
