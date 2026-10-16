# Break-even: when do two plans cost the same?

Two plans each cost "a fixed amount plus a rate times an amount" (minutes, months, GB...).
Write `breakEven(fixedA, rateA, fixedB, rateB)` in `starter.js`. It returns the amount where both plans cost the same.
If they never cost the same (same rate), return `null`.

Run it:

```
node test.js
```

**Done when:** every test prints 🍀 and the last line is 🪩.

Stuck? Write the equation on paper first: `fixedA + rateA × m = fixedB + rateB × m`.
`solution.js` has the answer, but try first! (`node test.js solution.js` runs the tests on it.)
