# How to explain

Read this before writing any lesson. It decides whether the lesson works. The page design comes second.

The style is **visual intuition first**, like 3Blue1Brown: build the picture in the reader's head, one small step at a time, until the idea feels *obvious*. Only then name it, and only then make it precise with math or code. The reader has ADHD: if the first screen is boring or full of words they don't know, they leave.

## The 7 rules

1. **Experience before explanation.** The reader does or sees the thing before you explain it: plays a guess, drags a slider, watches a step run, predicts an output. Explanations land on something they already felt.
2. **Plain words before jargon.** Describe the idea in everyday words first. Introduce the official term only after the reader has *seen* the thing: "That list of all the pieces the model knows? It's called the **vocabulary**." Never use a term before it's introduced, not even in titles, diagrams, or captions.
3. **Jargon budget: max 3 new terms** in the core of a lesson (everything before Going deeper). If the topic needs more, it's more than one lesson.
4. **No formula before intuition.** The first half of a lesson has no formulas and no symbols. When math comes, it comes in this order: a number worked by hand → the pattern in words → the formula → the code. A formula always restates something the reader already understands.
5. **Every chapter answers a question the reader now has.** End each chapter on the next natural question ("OK, but how does it know which word is likely?") and open the next chapter with it. This curiosity chain is what keeps an ADHD brain scrolling. Don't answer questions nobody is asking yet.
6. **One idea per sentence. Three sentences per paragraph, max.** If a sentence has a comma-separated list of concepts, split it or cut it.
7. **Pictures carry the idea, words support them.** Each core chapter has a visual that *shows* the idea (it would still make sense with the caption covered). Decorative boxes-and-arrows with labels the reader doesn't know don't count.

## The lesson arc

Every lesson, at every depth, follows this arc. Depth changes how far you go, never how gently you start.

| # | Chapter | What it does | Rules |
|---|---|---|---|
| 1 | **Hook** (the problem) | A real problem or a surprising question, plus something to **do** in the first screen: guess, predict, click, drag. | Zero jargon. Concrete: real text, real numbers, real code. ≤ 120 words. |
| 2 | **Build the picture** | Discover the idea step by step: "What if we tried X? Watch. It breaks here. So we fix it like this." Each step fixes a problem the reader just *saw*. | Visual or interactive at every step (`.steps`, sliders, SVG). Plain words only. This is the heart of the lesson; give it the most care. |
| 3 | **Name it** | Map official terms onto what they just saw. A small table "what you saw → what it's called" works well. | Only now introduce the ≤ 3 terms. |
| 4 | **Make it precise** | The math or code, now that it feels obvious. | Worked numbers first, then formula, then `.annotated` code. |
| 5 | **Examples** | Worked examples, easy → hard. | Each step: what + why. |
| 6 | **Solve the problem** | Back to the hook, now solved. A visible win. | |
| 7 | **Your turn** | Quick checks, then link to the exercises. | |
| 8 | **Cheat card** | The core in ≤ 6 bullets. | |
| — | **Going deeper** *(Deep / Master only)* | Under the hood, edge cases, mistakes, debugging, connections (+ design, expert for Master). | Starts with a `<div class="deeper">` divider. The reader has the basics now, so it can go hard, but rules 2, 4, 5 and 6 still apply. |
| 9 | **Next** | | |

**The core (chapters 1–8) of a Deep or Master lesson must be readable by a total beginner.** Depth goes *after* the basics.

**Master series:** part 1 is the gentlest page of the whole series. Difficulty climbs part by part. Never preview names from later parts (no "SFT, DPO, KV cache" on page 1). Show where the journey goes with outcomes in plain words ("by part 5 it can fix bugs in your code").

## Titles

Plain words, a question or an outcome. No jargon.

| Bad | Good |
|---|---|
| Text becomes a training signal | How does a computer guess the next word? |
| Inside GPT-2: the decoder-only Transformer | How a GPT pays attention to the right words |
| The filter chain | Who checks a request before your code runs? |

## Hooks that work

- **Play first:** "Guess the next word: *The cat sat on the ___*" with buttons, then reveal what a real model would say and how sure it is.
- **Predict the output:** show 3 lines of code, ask what they print, then run them.
- **A mystery:** "This line works. This almost identical line crashes. Why?"
- **A slider:** "Drag this and watch the line tilt. What does the number control?"
- **A broken thing:** "Your page shows 401 for everyone. Here's the log."

A hook is never a definition, a learning objective, or a list of what the lesson covers.

## Self-review before finishing (mandatory)

Reread chapters 1–3 as someone who has never heard of the topic, then fix every issue:

- [ ] List every technical term used before chapter 3. Each one must be introduced in plain words first. Count the core terms: ≤ 3.
- [ ] No formulas or symbols in chapters 1–2.
- [ ] The first screen has something to *do*.
- [ ] Each chapter ends on a question the next one answers.
- [ ] No paragraph over 3 sentences. No sentence carrying 3+ new ideas.
- [ ] Every visual in chapters 1–2 makes sense without knowing any jargon.
- [ ] The title is plain words.

If the lesson fails this check, rewrite it. Don't just patch words.
