// Smoke test: every generator, drill, and question loads and is well formed, and everything cites a source.
// Run with `npm test` (or `node test/smoke.js`). Exits with an error on any failure.
globalThis.window = globalThis;
require("../js/theory.js"); require("../js/harmony.js"); require("../js/generators.js"); require("../js/drills.js");
require("../js/facts.js"); require("../js/levels.js");
const { G } = Gen, { D } = Drills;
const problems = [];

// every generator, with the options the exam items use, across many seeds
const calls = AGO_LEVELS.LEVELS.flatMap((L) => L.sections.flatMap((s) => s.items))
  .flatMap((it) => (it.gen ? [it.gen].concat(it.alt || []) : []))
  .concat([["analysis", { level: "ChM" }], ["analysis", { level: "CAGO" }]]);
let n = 0;
for (let s = 1; s <= 25; s++) {
  for (const [f, o] of calls) {
    n++;
    try { const x = G[f](Theory.rng(s * 101 + n), Object.assign({ level: "AAGO" }, o)); if (!x.title || !x.prompt) throw new Error("no title or prompt"); }
    catch (e) { problems.push(f + " seed " + s + ": " + e.message); }
  }
  for (const f of Object.keys(D)) {
    n++;
    try {
      const x = D[f](Theory.rng(s * 7 + n));
      if (!(x.answer >= 0 && x.choices.length >= 2 && new Set(x.choices).size === x.choices.length)) throw new Error("bad choices " + JSON.stringify(x.choices));
      if (!x.src || !x.trains) throw new Error("no citation");
    } catch (e) { problems.push(f + " seed " + s + ": " + e.message); }
  }
}

// the question bank
const ids = new Set();
for (const f of AGO_FACTS) {
  if (ids.has(f.id)) problems.push("duplicate fact id " + f.id);
  ids.add(f.id);
  if (!f.choices.includes(f.answer)) problems.push(f.id + ": answer is not one of the choices");
  if (new Set(f.choices).size !== f.choices.length) problems.push(f.id + ": repeated choice");
  if (!f.src) problems.push(f.id + ": no src");
}
const topics = new Set(AGO_FACTS.map((f) => f.topic));
for (const [L, mix] of Object.entries(AGO_LEVELS.DAILY)) {
  for (const [t] of mix.facts) if (!topics.has(t)) problems.push("DAILY." + L + " uses topic " + t + ", which has no questions");
  for (const [d] of mix.drills) if (!D[d]) problems.push("DAILY." + L + " uses drill " + d + ", which doesn't exist");
}

// every generator cites the rules it applies
for (const k of Object.keys(G)) if (!Gen.SRC[k]) problems.push("generator " + k + " has no entry in Gen.SRC");

console.log({ generated: n, facts: AGO_FACTS.length, problems: problems.length });
if (problems.length) { console.log(problems.slice(0, 20).join("\n")); process.exit(1); }
