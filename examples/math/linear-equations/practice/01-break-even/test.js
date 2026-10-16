// node test.js              → tests starter.js
// node test.js solution.js  → tests the solution
const path = require("node:path");
const { breakEven } = require(path.resolve(__dirname, process.argv[2] || "starter.js"));

const close = (a, b) => (a === null || b === null ? a === b : typeof a === "number" && Math.abs(a - b) < 1e-9);
const tests = [
  ["phone plans (example 4)", [20, 0.10, 5, 0.25], 100],
  ["gyms (boss 1)", [30, 15, 0, 25], 3],
  ["°F and °C (boss 2)", [32, 1.8, 0, 1], -40],
  ["same rate never meets", [10, 2, 4, 2], null],
];

let passed = 0;
for (const [name, args, expect] of tests) {
  let got;
  try { got = breakEven(...args); } catch (e) { got = "error: " + e.message; }
  if (close(got, expect)) { passed++; console.log("🍀 " + name); }
  else console.log("🌀 " + name + ": expected " + expect + ", got " + got);
}
if (passed === tests.length) console.log("\n🪩 All " + passed + " tests pass!");
else { console.log("\n" + passed + " / " + tests.length + " pass. Keep going."); process.exit(1); }
