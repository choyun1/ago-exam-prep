// Simulates months of daily quizzes (with extra rounds) for each level and checks that knowledge questions don't
// repeat more than spaced repetition calls for. Run with `npm test` (or `node test/quiz.js`).
globalThis.window = globalThis;
require("../js/theory.js");
require("../js/facts.js");
require("../js/levels.js");
require("../js/quiz.js");
const { pickFacts, grade, family, addDays } = Quiz;
const problems = [];
const N = 6; // fact slots in a 12-question quiz

function simulate(level, pRight, days, extraEvery) {
  const mix = AGO_LEVELS.DAILY[level].facts;
  const pool = AGO_FACTS.filter((f) => mix.some(([t]) => t === f.topic));
  const srs = {};
  const asked = {}; // id -> days asked
  let shown = 0,
    repeats = 0,
    lastMissed = new Set();
  const answer = (r, list, today, missed) =>
    list.forEach((f) => {
      const ok = r() < pRight;
      if (!ok) missed.add(f.id);
      srs[f.id] = grade(srs[f.id], ok, today);
    });
  for (let d = 0; d < days; d++) {
    const today = addDays("2026-11-01", d);
    const yesterday = addDays(today, -1);
    const missed = new Set();
    const rounds = 1 + (extraEvery && d % extraEvery === 0 ? 2 : 0);
    const todayIds = new Set();
    for (let k = 0; k < rounds; k++) {
      const r = Theory.rng(Theory.hashString("daily:" + today + ":" + level + ":" + k));
      const qs = pickFacts(r, AGO_FACTS, N, mix, srs, today);
      const tag = level + " " + today + " round " + k;
      if (qs.length > N) problems.push(tag + ": " + qs.length + " questions");
      const fams = qs.flatMap(family);
      if (new Set(fams).size !== fams.length) problems.push(tag + ": two look-alike questions in one quiz");
      for (const f of qs) {
        if (todayIds.has(f.id)) problems.push(tag + ": " + f.id + " asked twice today");
        todayIds.add(f.id);
        const prev = asked[f.id] || [];
        if (prev.includes(yesterday) && !lastMissed.has(f.id))
          problems.push(tag + ": " + f.id + " back the day after a right answer");
        if (prev.length) repeats++;
        shown++;
        asked[f.id] = prev.concat(today);
      }
      answer(r, qs, today, missed);
    }
    lastMissed = missed;
  }
  return { level, pRight, days, pool: pool.length, shown, repeats, distinct: Object.keys(asked).length };
}

const results = [];
for (const level of Object.keys(AGO_LEVELS.DAILY)) {
  if (!AGO_LEVELS.DAILY[level] || !AGO_LEVELS.DAILY[level].facts.length) continue;
  for (const p of [0.6, 0.9]) results.push(simulate(level, p, 120, 5));
}
for (const x of results) {
  // the first month (6 slots a day, half of them guaranteed to new questions) should reach most of the bank
  const month = simulate(x.level, x.pRight, 30, 0);
  const want = Math.min(month.pool, 3 * 30);
  if (month.distinct < want * 0.9)
    problems.push(
      x.level + " p=" + x.pRight + ": only " + month.distinct + " of " + month.pool + " questions in 30 days",
    );
}

// records saved before `seen` existed: the day asked is worked out from box and due
const legacy = { box: 2, due: "2026-11-05" }; // right twice, last asked Nov 2 (old box 2 waited 3 days)
if (Quiz.lastSeen(legacy) !== "2026-11-02") problems.push("lastSeen for old records: " + Quiz.lastSeen(legacy));

console.table(results);
console.log({ problems: problems.length });
if (problems.length) {
  console.log(problems.slice(0, 20).join("\n"));
  process.exit(1);
}
