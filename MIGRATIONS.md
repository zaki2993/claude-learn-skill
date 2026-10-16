# Upgrading old libraries

The upgrade check in [SKILL.md §1](./SKILL.md#1-find-the-library) copies the new shared files (`assets/`, `main.html`) into a library. Some changes also need edits to the library's own files: `learn.json`, `library.js`, and the topic pages. They are listed here by version.

Run every section whose version is **higher** than the library's old `templateVersion`, oldest first. Do them silently; tell the user in one line at the end ("Upgraded your library to version 2: math now works offline.").

## To version 2

Libraries made before this version have `"learnLibrary": 1` and no `templateVersion`. Treat them as version 1.

1. **Home page.** If the root has `index.html` instead of `main.html`: copy `main.html` in, delete `index.html`, and replace `../../index.html` with `../../main.html` in every topic page. (`learn.js` also fixes these links on the fly, but fix the files anyway.)
2. **Library id.** If `learn.json` has no `libraryId`: make one (`python3 -c "import uuid; print(uuid.uuid4())"`), add it as `"libraryId"` in `learn.json` and as `id: "..."` at the top of `window.LIBRARY` in `library.js`. Saved answers move over to the new keys by themselves on the next page load.
3. **Review intervals.** Add `"reviewIntervalsDays": [1, 3, 7, 21]` to `learn.json` and `reviewIntervalsDays: [1, 3, 7, 21],` to `library.js`.
4. **Dead settings.** Remove `language` and `lengths` from `learn.json`, and any `emoji` field from subjects in `library.js`. Nothing reads them.
5. **Offline math.** In every topic page, replace the four `cdnjs.cloudflare.com` tags (KaTeX css, KaTeX js, auto-render, highlight.js) with the `../../assets/vendor/...` tags from [templates/topic/lesson.html](./templates/topic/lesson.html).
6. **Emoji.** Old pages may have emoji from the banned list on hints, solutions and tier labels. `learn.js` used to hide them; it no longer does. Grep every topic page for the banned list in [PAGES.md](./PAGES.md#emoji) and swap each one for its emoji from the set (🕯️ hint, 🗝️ solution, 🔦 🥋 🛰️ 👾 tiers...).
7. **Hand-written TOC.** Delete `<ul class="toc">...</ul>` from `exercises.html`. The sidebar already lists the sections.
8. **Ids.** No bulk edit. The next time you edit a page, give every `.q` and `.runner` without a `data-id` one (PAGES.md id patterns), and use dated ids when you refresh a comeback.
