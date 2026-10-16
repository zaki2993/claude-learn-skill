#!/usr/bin/env python3
"""Check a /learn lesson before telling the user it's done.

    python3 check.py <library-root> <subject>/<topic> [--depth quick|normal|deep|master] [--lesson N]
                     [--coding | --no-coding]

Prints PASS / FAIL / WARN per check and exits 1 if anything failed.
Standard library only. Minimums come from SKILL.md 4e, markup rules from PAGES.md.

--lesson  defaults to the highest-numbered lesson in the topic.
--depth   defaults to the depth in the lesson's pill ("🧭 Normal"...), else normal.
--coding  coding topics need practice/ folders. Default: coding if the topic has
          a practice/ folder or any .runner.
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from html.parser import HTMLParser
from urllib.parse import unquote, urlsplit

# ---------- minimums (SKILL.md 4e) ----------
MIN = {
    "quick":  {"examples": 2, "visuals": 1, "interactive": 0, "checks": 2,
               "tiers": {"guided": 1, "practice": 2, "real": 1, "boss": 1}, "practice": 0,
               "deep": []},
    "normal": {"examples": 4, "visuals": 1, "interactive": 0, "checks": 3,
               "tiers": {"guided": 2, "practice": 3, "real": 3, "boss": 2}, "practice": 1,
               "deep": []},
    "deep":   {"examples": 8, "visuals": 3, "interactive": 1, "checks": 5,
               "tiers": {"guided": 3, "practice": 5, "real": 6, "boss": 4}, "practice": 2,
               "deep": ["under-the-hood", "edge-cases", "mistakes", "debugging", "connections"]},
    "master": {"examples": 8, "visuals": 3, "interactive": 1, "checks": 5,
               "tiers": {"guided": 3, "practice": 5, "real": 6, "boss": 4}, "practice": 2,
               "deep": ["under-the-hood", "edge-cases", "mistakes", "debugging", "connections",
                        "design", "expert"]},
}
TIERS = ["guided", "practice", "real", "boss"]
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta",
        "source", "track", "wbr"}
CODE_TAGS = {"pre", "code", "textarea", "script", "style"}

# ---------- output ----------
failures = 0


def report(kind, msg):
    global failures
    if kind == "FAIL":
        failures += 1
    print(f"{kind:4}  {msg}")


def ok(cond, msg_pass, msg_fail=None):
    report("PASS" if cond else "FAIL", msg_pass if cond else (msg_fail or msg_pass))
    return cond


# ---------- a tiny DOM ----------
class Node:
    def __init__(self, tag, attrs, parent):
        self.tag = tag
        self.attrs = dict(attrs)
        self.parent = parent
        self.children = []
        self.order = 0

    @property
    def classes(self):
        return (self.attrs.get("class") or "").split()

    def has(self, cls):
        return cls in self.classes

    def id(self):
        return self.attrs.get("id")

    def walk(self):
        for c in self.children:
            if isinstance(c, Node):
                yield c
                yield from c.walk()

    def find(self, pred):
        return [n for n in self.walk() if pred(n)]

    def text(self):
        out = []
        for c in self.children:
            out.append(c.text() if isinstance(c, Node) else c)
        return "".join(out)

    def inside(self, pred):
        p = self.parent
        while p is not None:
            if pred(p):
                return True
            p = p.parent
        return False


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.path = path
        self.root = Node("#root", {}, None)
        self.cur = self.root
        self.count = 0
        self.comments = []
        self.texts = []          # (text, in_code)
        with open(path, encoding="utf-8") as f:
            self.raw = f.read()
        self.feed(self.raw)
        self.close()
        self.ids = {n.id() for n in self.root.walk() if n.id()}

    def _in_code(self):
        n = self.cur
        while n is not None:
            if n.tag in CODE_TAGS:
                return True
            n = n.parent
        return False

    def handle_starttag(self, tag, attrs):
        node = Node(tag, [(k, v or "") for k, v in attrs], self.cur)
        self.count += 1
        node.order = self.count
        self.cur.children.append(node)
        if tag not in VOID:
            self.cur = node

    def handle_startendtag(self, tag, attrs):
        node = Node(tag, [(k, v or "") for k, v in attrs], self.cur)
        self.count += 1
        node.order = self.count
        self.cur.children.append(node)

    def handle_endtag(self, tag):
        n = self.cur
        while n is not None and n.tag != tag:
            n = n.parent
        if n is not None and n.parent is not None:
            self.cur = n.parent

    def handle_data(self, data):
        self.cur.children.append(data)
        self.texts.append((data, self._in_code()))

    def handle_comment(self, data):
        self.comments.append(data)

    def all(self, pred):
        return self.root.find(pred)


_pages = {}


def page(path):
    path = os.path.normpath(path)
    if path not in _pages:
        _pages[path] = Page(path)
    return _pages[path]


# ---------- checks ----------
PLACEHOLDER_ANY = re.compile(r"\{\{")
# Inside code, only template-looking placeholders count ({{fn}}, {{SOLUTION}}, {{...}}),
# so JSX like style={{ color: "red" }} is fine.
PLACEHOLDER_CODE = re.compile(r"\{\{(?:\.\.\.|[A-Za-z_][A-Za-z0-9_+]*|[A-Z][A-Z_]+[^}]*)\}\}")
TEMPLATE_COMMENT = re.compile(r"^\s*(\d+\.\s|STEP \d)")


def check_leftovers(p, name):
    hits = []
    for text, in_code in p.texts:
        pat = PLACEHOLDER_CODE if in_code else PLACEHOLDER_ANY
        for m in pat.finditer(text):
            hits.append(text[m.start():m.start() + 40].split("\n")[0])
    for n in p.root.walk():
        for k, v in n.attrs.items():
            if "{{" in v:
                hits.append(f'{k}="{v[:40]}"')
    ok(not hits, f"{name}: no leftover {{{{placeholders}}}}",
       f"{name}: {len(hits)} leftover placeholder(s), e.g. {hits[:3]}")
    left = [c.strip().split("\n")[0][:60] for c in p.comments if TEMPLATE_COMMENT.match(c)]
    ok(not left, f"{name}: no leftover template comments",
       f"{name}: leftover template comment(s): {left[:3]}")


def check_ids(p, name):
    items = p.all(lambda n: n.has("q") or n.has("runner"))
    missing = [n for n in items if not n.attrs.get("data-id")]
    seen, dupes = set(), set()
    for n in items:
        i = n.attrs.get("data-id")
        if i:
            (dupes if i in seen else seen).add(i)
    ok(not missing, f"{name}: every .q/.runner has a data-id ({len(items)} items)",
       f"{name}: {len(missing)} .q/.runner without data-id")
    ok(not dupes, f"{name}: data-ids are unique", f"{name}: duplicate data-id(s): {sorted(dupes)}")


def check_links(p, name, topic_dir):
    bad = []
    here = os.path.dirname(p.path)
    for n in p.root.walk():
        for attr in ("href", "src"):
            url = n.attrs.get(attr)
            if not url or "{{" in url:
                continue
            parts = urlsplit(url)
            if parts.scheme or url.startswith("//"):
                continue
            if not parts.path:
                if parts.fragment and parts.fragment not in p.ids:
                    bad.append(url)
                continue
            target = os.path.normpath(os.path.join(here, unquote(parts.path)))
            if not os.path.exists(target):
                bad.append(url)
                continue
            if parts.fragment and target.endswith(".html") and \
                    os.path.dirname(target) == os.path.normpath(topic_dir):
                if parts.fragment not in page(target).ids:
                    bad.append(url)
    ok(not bad, f"{name}: all relative links resolve", f"{name}: broken link(s): {sorted(set(bad))[:6]}")


def tier_of(item, section_h3):
    m = re.match(r"^l\d+-([gprb])\d+$", item.attrs.get("data-id", ""))
    if m:
        return {"g": "guided", "p": "practice", "r": "real", "b": "boss"}[m.group(1)]
    for lv in item.find(lambda n: n.has("level")):
        for t in TIERS:
            if lv.has(t):
                return t
    h = (section_h3 or "").lower()
    for word, t in (("guided", "guided"), ("practice", "practice"), ("real", "real"), ("boss", "boss")):
        if word in h:
            return t
    return None


def count_tiers(section):
    counts = {t: 0 for t in TIERS}
    unknown = 0
    h3 = None
    for n in section.walk():
        if n.tag == "h3":
            h3 = n.text()
        is_item = n.has("q") or n.has("runner") or \
            (n.has("card") and n.find(lambda c: c.tag == "pre" and c.has("cmd")))
        if not is_item or n.inside(lambda a: a.has("q") or a.has("runner") or a.has("card")):
            continue
        t = tier_of(n, h3)
        if t:
            counts[t] += 1
        else:
            unknown += 1
    return counts, unknown


def has_node():
    return shutil.which("node") is not None


def run(cmd, cwd=None, timeout=60):
    try:
        r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout)
        return r.returncode, r.stdout + r.stderr
    except subprocess.TimeoutExpired:
        return 124, "timed out"


def deep_equal(a, b):
    if isinstance(a, bool) or isinstance(b, bool):
        return a is b
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return abs(a - b) <= 1e-9 + 1e-6 * abs(b)
    if isinstance(a, list) and isinstance(b, list):
        return len(a) == len(b) and all(deep_equal(x, y) for x, y in zip(a, b))
    if isinstance(a, dict) and isinstance(b, dict):
        return sorted(a) == sorted(b) and all(deep_equal(a[k], b[k]) for k in a)
    return a == b


MARK = "@@LEARN_RESULTS@@"


def run_solution(lang, code, tests, tmp):
    calls = [t["call"] for t in tests]
    if lang == "js":
        if not has_node():
            return None, "node not installed"
        probes = ",".join(
            "(() => { try { return { ok: true, value: (" + c + ") }; } catch (e) { return { ok: false, error: String(e) }; } })()"
            for c in calls)
        src = code + "\n;console.log(" + json.dumps(MARK) + " + JSON.stringify([" + probes + "]));\n"
        f = os.path.join(tmp, "runner.js")
        cmd = ["node", f]
    else:
        if not shutil.which("python3"):
            return None, "python3 not installed"
        src = ("import json as __j\n__ns = {}\nexec(" + repr(code) + ", __ns)\n__out = []\n"
               "for __c in " + repr(calls) + ":\n"
               "    try: __out.append({'ok': True, 'value': eval(__c, __ns)})\n"
               "    except Exception as __e: __out.append({'ok': False, 'error': repr(__e)})\n"
               "print(" + repr(MARK) + " + __j.dumps(__out, default=str))\n")
        f = os.path.join(tmp, "runner.py")
        cmd = [sys.executable, "-I", f]
    with open(f, "w", encoding="utf-8") as fh:
        fh.write(src)
    code_, out = run(cmd, timeout=15)
    line = next((l for l in out.splitlines() if l.startswith(MARK)), None)
    if line is None:
        lines = out.strip().splitlines()
        err = next((l for l in lines if re.search(r"Error|Exception", l)), lines[-1] if lines else f"exit {code_}")
        return [], err.strip()
    return json.loads(line[len(MARK):]), None


def check_runners(p, name, tmp):
    for box in p.all(lambda n: n.has("runner")):
        rid = box.attrs.get("data-id", "?")
        sol = box.find(lambda n: n.tag == "code" and
                       any(c in ("language-js", "language-javascript", "language-py", "language-python")
                           for c in n.classes) and n.inside(lambda a: a.has("solution")))
        tests_tag = box.find(lambda n: n.tag == "script" and n.has("runner-tests"))
        if not sol or not tests_tag:
            report("WARN", f"{name} runner {rid}: no JS/Python solution or no tests to verify")
            continue
        try:
            tests = json.loads(tests_tag[0].text())
        except ValueError as e:
            report("FAIL", f"{name} runner {rid}: runner-tests is not valid JSON ({e})")
            continue
        lang = "js" if any("js" in c or "javascript" in c for c in sol[0].classes) else "py"
        results, err = run_solution(lang, sol[0].text(), tests, tmp)
        if results is None:
            report("WARN", f"{name} runner {rid}: skipped, {err}")
            continue
        if err:
            report("FAIL", f"{name} runner {rid}: solution crashed: {err}")
            continue
        bad = [t["call"] for t, r in zip(tests, results) if not (r.get("ok") and deep_equal(r.get("value"), t["expect"]))]
        ok(not bad and len(results) == len(tests), f"{name} runner {rid}: solution passes all {len(tests)} tests",
           f"{name} runner {rid}: solution fails {bad[:3]}")


def parse_library_js(path):
    """Evaluate library.js with node if possible, else a JSON-ish parse."""
    if has_node():
        js = "global.window={};require(" + json.dumps(os.path.abspath(path)) + ");console.log(JSON.stringify(window.LIBRARY))"
        code, out = run(["node", "-e", js])
        if code != 0:
            return None, "node could not evaluate it: " + out.strip().splitlines()[-1] if out.strip() else "node failed"
        try:
            return json.loads(out), None
        except ValueError:
            return None, "window.LIBRARY is missing"
    src = open(path, encoding="utf-8").read()
    # strip comments outside strings; turn 'single' and `template` strings into "double"
    out, strings, i = [], [], 0
    while i < len(src):
        c = src[i]
        if c in "\"'`":
            j, buf = i + 1, []
            while j < len(src) and src[j] != c:
                if src[j] == "\\":
                    buf.append(src[j:j + 2]); j += 2
                    continue
                buf.append(src[j]); j += 1
            body = "".join(buf)
            if c != '"':
                body = body.replace("\\" + c, c).replace('"', '\\"').replace("\n", "\\n")
            strings.append('"' + body + '"')
            out.append("\x00%d\x00" % (len(strings) - 1))
            i = j + 1
            continue
        elif src.startswith("//", i):
            while i < len(src) and src[i] != "\n":
                i += 1
            continue
        elif src.startswith("/*", i):
            i = src.find("*/", i) + 2
            continue
        else:
            out.append(c)
        i += 1
    s = "".join(out)
    m = re.search(r"window\.LIBRARY\s*=\s*", s)
    if not m:
        return None, "window.LIBRARY = ... not found"
    s = s[m.end():].strip().rstrip(";")
    s = re.sub(r"([{,]\s*)([A-Za-z_$][\w$]*)\s*:", r'\1"\2":', s)
    s = re.sub(r",(\s*[}\]])", r"\1", s)
    s = re.sub(r"\x00(\d+)\x00", lambda m: strings[int(m.group(1))], s)
    try:
        return json.loads(s), None
    except ValueError as e:
        return None, f"could not parse it without node ({e})"


def check_library(root, subject, topic, topic_dir):
    lib, err = parse_library_js(os.path.join(root, "library.js"))
    if not ok(lib is not None, "library.js evaluates", f"library.js: {err}"):
        return
    subj = next((s for s in lib.get("subjects", []) if s.get("id") == subject), None)
    top = next((t for t in (subj or {}).get("topics", []) if t.get("id") == topic), None)
    if not ok(top is not None, f"library.js lists {subject}/{topic}", f"library.js has no topic {subject}/{topic}"):
        return
    listed = {l.get("file") for l in top.get("lessons", [])}
    on_disk = {f for f in os.listdir(topic_dir) if re.match(r"^\d\d-lesson-.*\.html$", f)}
    ok(on_disk <= listed, f"library.js lists every lesson on disk ({len(on_disk)})",
       f"library.js is missing lesson(s): {sorted(on_disk - listed)}")
    ok(listed <= on_disk, "every lesson in library.js exists on disk",
       f"library.js lists missing file(s): {sorted(listed - on_disk)}")
    ok(bool(re.match(r"^\d{4}-\d\d-\d\d$", str(top.get("lastStudied", "")))),
       "library.js lastStudied is a date", "library.js lastStudied is missing or not yyyy-mm-dd")
    ok(bool(top.get("keypoints")), "library.js has keypoints", "library.js keypoints are empty")


PRACTICE_RUN = {
    "js": ("node", lambda d, impl: ["node", "test.js", impl]),
    "mjs": ("node", lambda d, impl: ["node", "test.mjs", impl]),
    "py": ("python3", lambda d, impl: [sys.executable, "test.py", impl]),
}


def check_practice_folder(d):
    name = "practice/" + os.path.basename(d)
    files = os.listdir(d)
    readme = any(f.lower().startswith("readme") for f in files)
    starter = next((f for f in files if f.startswith("starter.")), None)
    solution = next((f for f in files if f.startswith("solution.")), None)
    ext = starter.rsplit(".", 1)[1] if starter else None
    test = next((f for f in files if f.startswith("test.")), None)
    rust_harness = ext == "rs" and "#[test]" in open(os.path.join(d, starter), encoding="utf-8").read()
    if not ok(readme and starter and solution and (test or rust_harness),
              f"{name}: has README, starter, test, solution",
              f"{name}: missing {[x for x, y in (('README', readme), ('starter.*', starter), ('solution.*', solution), ('test.*', test or rust_harness)) if not y]}"):
        return
    if ext == "rs" and not test:
        if not shutil.which("rustc"):
            report("WARN", f"{name}: rustc not installed, tests not run")
            return
        res = {}
        with tempfile.TemporaryDirectory() as tmp:
            for f in (starter, solution):
                out = os.path.join(tmp, f.split(".")[0])
                c, _ = run(["rustc", "--edition", "2021", "--test", "-o", out, os.path.join(d, f)], timeout=120)
                res[f] = run([out], timeout=60)[0] if c == 0 else 1
        ok(res[starter] != 0, f"{name}: tests fail on the starter", f"{name}: tests already pass on the starter")
        ok(res[solution] == 0, f"{name}: tests pass on the solution", f"{name}: tests fail on the solution")
        return
    if ext not in PRACTICE_RUN or not test.endswith("." + ext):
        report("WARN", f"{name}: no automatic run for .{ext}; run the starter and solution by hand")
        return
    tool, cmd = PRACTICE_RUN[ext]
    if not shutil.which(tool):
        report("WARN", f"{name}: {tool} not installed, tests not run")
        return
    c_start, _ = run(cmd(d, starter), cwd=d)
    c_sol, out = run(cmd(d, solution), cwd=d)
    ok(c_start != 0, f"{name}: test fails on the starter",
       f"{name}: test passes on the starter (does test.{ext} read its argument and exit 1 on failure?)")
    ok(c_sol == 0, f"{name}: test passes on the solution",
       f"{name}: test fails on the solution: {out.strip().splitlines()[-1] if out.strip() else ''}")


# ---------- main ----------
def main():
    ap = argparse.ArgumentParser(description="Check a /learn lesson against SKILL.md and PAGES.md.")
    ap.add_argument("library")
    ap.add_argument("topic", help="<subject>/<topic>")
    ap.add_argument("--depth", choices=list(MIN))
    ap.add_argument("--lesson", type=int)
    g = ap.add_mutually_exclusive_group()
    g.add_argument("--coding", dest="coding", action="store_true", default=None)
    g.add_argument("--no-coding", dest="coding", action="store_false")
    a = ap.parse_args()

    root = os.path.abspath(a.library)
    subject, _, topic = a.topic.strip("/").partition("/")
    topic_dir = os.path.join(root, subject, topic)
    if not os.path.isdir(topic_dir):
        print(f"No topic folder at {topic_dir}")
        return 2

    lessons = {}
    for f in os.listdir(topic_dir):
        m = re.match(r"^(\d\d)-lesson-.*\.html$", f)
        if m:
            lessons[int(m.group(1))] = f
    if not lessons:
        print(f"No NN-lesson-*.html in {topic_dir}")
        return 2
    n = a.lesson or max(lessons)
    if n not in lessons:
        print(f"No lesson {n:02d} in {topic_dir}")
        return 2
    lesson_path = os.path.join(topic_dir, lessons[n])
    lp = page(lesson_path)

    depth = a.depth
    if not depth:
        for pill in lp.all(lambda x: x.has("pill")):
            m = re.search(r"\b(quick|normal|deep|master)\b", pill.text().lower())
            if m and not pill.text().lower().startswith("needs"):
                depth = m.group(1)
                break
        if not depth:
            report("WARN", "depth not given and not found in the lesson's pill: using normal")
            depth = "normal"
    need = MIN[depth]
    print(f"Checking {subject}/{topic}, lesson {n} ({lessons[n]}), depth {depth}\n")

    # Minimums
    deeper = lp.all(lambda x: x.has("deeper"))
    cut = deeper[0].order if deeper else float("inf")
    examples = [x for x in lp.all(lambda x: x.has("example")) if x.order < cut]
    ok(len(examples) >= need["examples"], f"worked examples in the core: {len(examples)} (need {need['examples']})")

    checks = [x for x in lp.all(lambda x: x.has("q")) if not x.attrs.get("data-id", "").endswith("-hook")]
    ok(len(checks) >= need["checks"], f"quick checks in the lesson (not the hook): {len(checks)} (need {need['checks']})")

    groups = lp.all(lambda x: x.has("interactive") or x.has("steps"))
    loose = lp.all(lambda x: x.tag in ("svg", "img") and
                   not x.inside(lambda a: a.has("interactive") or a.has("steps") or a.tag == "svg"))
    visuals = len(groups) + len(loose)
    ok(visuals >= need["visuals"], f"visuals (svg, img, .interactive, .steps): {visuals} (need {need['visuals']})")
    if need["interactive"]:
        ok(len(groups) >= need["interactive"], f"interactive visuals: {len(groups)} (need {need['interactive']})")

    ex_path = os.path.join(topic_dir, "exercises.html")
    if ok(os.path.exists(ex_path), "exercises.html exists"):
        sec = page(ex_path).all(lambda x: x.tag == "section" and x.id() == f"lesson-{n}")
        if ok(bool(sec), f"exercises.html has <section id=\"lesson-{n}\">"):
            counts, unknown = count_tiers(sec[0])
            for t in TIERS:
                ok(counts[t] >= need["tiers"][t], f"exercises lesson {n}, {t}: {counts[t]} (need {need['tiers'][t]})")
            if unknown:
                report("WARN", f"exercises lesson {n}: {unknown} item(s) with no tier (use l{n}-g1 ids or a .level tag)")

    coding = a.coding
    why = "--coding" if coding else "--no-coding"
    if coding is None:
        has_practice = os.path.isdir(os.path.join(topic_dir, "practice"))
        has_runner = any(page(os.path.join(topic_dir, f)).all(lambda x: x.has("runner"))
                         for f in os.listdir(topic_dir) if f.endswith(".html"))
        coding = has_practice or has_runner
        why = "has practice/ or a runner" if coding else "no practice/ and no runner"
    pdir = os.path.join(topic_dir, "practice")
    folders = sorted(f for f in os.listdir(pdir) if os.path.isdir(os.path.join(pdir, f))) if os.path.isdir(pdir) else []
    if coding:
        mine = [f for f in folders if f.startswith(f"{n:02d}-")]
        ok(len(mine) >= need["practice"], f"practice folders for lesson {n}: {len(mine)} (need {need['practice']}; coding topic: {why})")
        if depth == "master":
            cap = [f for f in folders if f.startswith("capstone-")]
            report("PASS" if cap else "WARN", "capstone: " + (cap[0] if cap else "not yet (needed with the last part, SKILL.md 4b)"))
    else:
        report("PASS", f"practice folders: not a coding topic ({why}); pass --coding to require them")

    if depth == "normal":
        ok(bool(lp.all(lambda x: x.has("callout") and x.has("warn"))), "trap callout (.callout.warn) present")
    deep_ids = {x.id() for x in lp.all(lambda x: x.tag == "h2" and x.has("deep"))}
    for d in need["deep"]:
        ok(d in deep_ids, f"depth section h2.deep#{d}")
    if need["deep"]:
        ok(bool(deeper), "\"Going deeper\" divider (.deeper) present")
    elif deep_ids or deeper:
        report("WARN", f"{depth} lesson has Going deeper sections; they are for deep/master")

    cheat = lp.all(lambda x: x.id() == f"cheat-{n}")
    if ok(bool(cheat), f"lesson has its cheat card #cheat-{n}"):
        bullets = len(cheat[0].find(lambda x: x.tag == "li"))
        ok(bullets <= 6, f"cheat card bullets: {bullets} (max 6)")
    cs = os.path.join(topic_dir, "cheatsheet.html")
    if ok(os.path.exists(cs), "cheatsheet.html exists"):
        ok(f"cheat-{n}" in page(cs).ids, f"cheatsheet.html has #cheat-{n}")
    cb = os.path.join(topic_dir, "comeback.html")
    if ok(os.path.exists(cb), "comeback.html exists"):
        kps = page(cb).all(lambda x: x.has("keypoint"))
        ok(1 <= len(kps) <= 7, f"comeback key points: {len(kps)} (1 to 7)")

    # Every page of the topic: leftovers, ids, links, runners
    print()
    with tempfile.TemporaryDirectory() as tmp:
        for f in sorted(os.listdir(topic_dir)):
            if not f.endswith(".html"):
                continue
            p = page(os.path.join(topic_dir, f))
            check_leftovers(p, f)
            check_ids(p, f)
            check_links(p, f, topic_dir)
            check_runners(p, f, tmp)

    print()
    check_library(root, subject, topic, topic_dir)

    if folders:
        print()
        for f in folders:
            check_practice_folder(os.path.join(pdir, f))

    print()
    print("All checks pass." if not failures else f"{failures} check(s) failed. Fix them and run again.")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
