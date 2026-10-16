# Vendored libraries

Copied here so math and code highlighting work offline, straight from disk. Don't edit these files.

| Folder | Library | Version | Source |
|---|---|---|---|
| `katex/` | KaTeX: `katex.min.css`, `katex.min.js`, `contrib/auto-render.min.js`, `fonts/*.woff2` | 0.16.9 | npm `katex@0.16.9`, `dist/` |
| `highlight/` | highlight.js: `highlight.min.js` (common languages) | 11.9.0 | npm `@highlightjs/cdn-assets@11.9.0` |

Only the `.woff2` fonts are included. Every current browser picks woff2 first, so the `.woff`/`.ttf` fallbacks in `katex.min.css` are never requested.

Licenses: MIT (KaTeX), BSD-3-Clause (highlight.js), in each folder.
