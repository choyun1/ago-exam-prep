// Musical correctness checks for the generators. Run with `npm test` (or `node test/music.js`).
// Exits with an error if any check fails, printing the first few failures of each kind.
globalThis.window = globalThis;
require("../js/theory.js");
require("../js/harmony.js");
require("../js/generators.js");
require("../js/drills.js");
const T = Theory,
  H = Harmony,
  { G } = Gen;

const failures = {};
function fail(kind, msg) {
  (failures[kind] = failures[kind] || []).push(msg);
}

// ---- 1. Every generated score: no double sharps/flats, and every bar adds up to the meter ----
function checkABC(abc, where) {
  const meter = (/^M:(.*)$/m.exec(abc) || [])[1];
  const barLen = meter === "3/4" ? 6 : meter === "4/4" ? 8 : null;
  const km = /^K:([A-G])([#b]?)(m?)$/m.exec(abc);
  const sig = T.keySig(T.mkKey(km[1], km[2] === "#" ? 1 : km[2] === "b" ? -1 : 0, km[3] ? "minor" : "major"));
  for (const line of abc.split("\n").filter((l) => l.startsWith("[V:"))) {
    const body = line.replace(/^\[V:[^\]]*\]/, "").replace(/"[^"]*"/g, "");
    // double sharps/flats are right only on a letter the key signature already sharpens/flattens (e.g. F𝄪 in G♯ minor)
    body.replace(/(\^\^|__)([A-Ga-g])/g, (m, acc, letter) => {
      if (sig[T.LETTERS.indexOf(letter.toUpperCase())] !== (acc === "^^" ? 1 : -1))
        fail("double accidental", where + ": " + line.slice(0, 80));
      return m;
    });
    if (!barLen) continue;
    const bars = body
      .split(/\|\]?/)
      .map((b) => b.trim())
      .filter(Boolean);
    bars.forEach((bar, bi) => {
      let len = 0;
      bar.replace(/(?:\^\^|__|\^|_|=)?[A-Ga-gzx][,']*(\d*)/g, (m, d) => {
        len += d ? parseInt(d, 10) : 1;
        return m;
      });
      const last = bi === bars.length - 1;
      if (last ? len > barLen : len !== barLen)
        fail("bar length", where + " bar " + (bi + 1) + " has " + len + " eighths: " + bar);
    });
  }
}
const calls = [
  ["sightReadGrand", {}],
  ["sightReadTrio", {}],
  ["sightReadTrio", { phrases: 3, maxAcc: 4 }],
  ["openScore", {}],
  ["openScore", { cClefs: true }],
  [
    "transposition",
    {
      intervals: [
        ["up a major 2nd", 2],
        ["down a minor 2nd", -1],
      ],
      count: 2,
    },
  ],
  ["transposition", { intervals: [["up a major 3rd", 4]], count: 1, embellish: 0 }],
  ["figuredBass", {}],
  ["harmonize", { mixed: true }],
  ["harmonize", {}],
  ["progressions", {}],
  ["dictation", { kind: "melody", phrases: 2 }],
  ["dictation", { missing: true }],
  ["dictation", { kind: "four", embellish: 0.2 }],
  ["errorDetection", {}],
  ["auralPerception", {}],
  ["fugue", { voices: 3 }],
  ["fugue", { voices: 4, episode: true }],
  ["improv", { kind: "ground" }],
  ["improv", { kind: "phrases" }],
  ["improv", { kind: "ternary" }],
  ["compositionStart", {}],
  ["cantusFirmus", {}],
  ["orchestration", {}],
];
let generated = 0;
for (let s = 1; s <= 40; s++) {
  for (const [f, o] of calls) {
    const ex = G[f](T.rng(s * 977 + f.length), o);
    for (const sc of (ex.scores || []).concat((ex.solution && ex.solution.scores) || [])) {
      checkABC(sc.abc, f + " seed " + s);
      generated++;
    }
  }
}
for (const g of Gen.GROUNDS) {
  for (const [l, a] of Theory.KEY_LIST[g.mode]) {
    const key = T.mkKey(l, a, g.mode);
    if (Math.abs(T.sigCount(key)) > 4) continue;
    for (const e of Gen.realize(Gen.parseTokens(g.s), key, 3))
      if (Math.abs(e.n.a) > 1) fail("double accidental", 'ground "' + g.name + '" in ' + T.keyName(key));
  }
}

// ---- 2. Fugue answers keep the subject's shape ----
// Each step in the answer must match the subject's, except at a tonal mutation, where a leap (never a step
// or a repeated note) may grow or shrink by one step.
for (const [si, sub] of Gen.SUBJECTS.entries()) {
  for (const [l, a] of Theory.KEY_LIST[sub.mode]) {
    const key = T.mkKey(l, a, sub.mode);
    if (Math.abs(T.sigCount(key)) > 3) continue;
    const { subj, ans, tonal } = Gen.answerFor(sub, key);
    for (const e of subj.concat(ans))
      if (Math.abs(e.n.a) > 1) fail("double accidental", "fugue subject " + (si + 1) + " in " + T.keyName(key));
    for (let i = 1; i < subj.length; i++) {
      const ds = T.dia(subj[i].n) - T.dia(subj[i - 1].n),
        da = T.dia(ans[i].n) - T.dia(ans[i - 1].n);
      if (ds === da) continue;
      if (!tonal || Math.abs(ds - da) !== 1 || Math.abs(ds) < 2 || da === 0)
        fail(
          "fugue answer shape",
          "subject " +
            (si + 1) +
            " in " +
            T.keyName(key) +
            ", note " +
            (i + 1) +
            ": subject moves " +
            ds +
            " steps, answer " +
            da,
        );
    }
    const first = T.dia(ans[0].n) - T.dia(subj[0].n);
    if (first !== 3 && first !== 4)
      fail(
        "fugue answer register",
        "subject " + (si + 1) + " in " + T.keyName(key) + ": answer starts " + first + " steps above the subject",
      );
  }
}

// ---- 3. Decorated passages: no parallel 5ths/8ves on any eighth, suspensions resolve down by step ----
let susCount = 0;
for (let s = 1; s <= 150; s++) {
  const r = T.rng(s * 31);
  const mode = r.pick(["major", "minor"]);
  const [l, a] = r.pick(T.KEY_LIST[mode]);
  const key = T.mkKey(l, a, mode);
  const p = H.makePassage({
    seed: r,
    key,
    phrases: [{ cadence: "HC" }, { cadence: "PAC" }],
    meter: r.pick(["4/4", "3/4"]),
  });
  if (!p) {
    fail("voicing", "no voicing for seed " + s);
    continue;
  }
  const ev = H.toEvents(p, { passing: 0.6, neighbor: 0.4, suspension: 0.6 }, r);
  // sounding note of each voice on each eighth
  const grid = ev.map((list) => {
    const out = [];
    for (const e of list) for (let k = 0; k < e.dur; k++) out.push({ n: e.n, attack: k === 0 });
    return out;
  });
  const len = Math.min(...grid.map((g) => g.length));
  if (grid.some((g) => g.length !== len)) fail("voice lengths", "seed " + s + ": voices have different lengths");
  for (let t = 1; t < len; t++) {
    for (let x = 0; x < 4; x++)
      for (let y = x + 1; y < 4; y++) {
        const p0 = grid[x][t - 1].n,
          p1 = grid[y][t - 1].n,
          c0 = grid[x][t].n,
          c1 = grid[y][t].n;
        if (T.midi(p0) === T.midi(c0) || T.midi(p1) === T.midi(c1)) continue; // a voice held still
        const ip = (((T.midi(p1) - T.midi(p0)) % 12) + 12) % 12,
          ic = (((T.midi(c1) - T.midi(c0)) % 12) + 12) % 12;
        if ((ip === 0 || ip === 7) && ip === ic)
          fail("parallels", "seed " + s + " eighth " + t + ", voices " + x + "/" + y + " (" + T.keyName(key) + ")");
      }
  }
  for (const [ci, sus] of Object.entries(ev.suspensions)) {
    susCount++;
    const list = ev[sus.voice];
    const k = list.findIndex((e) => e.susp === Number(ci));
    const res = list[k + 1];
    if (k < 0 || !res || T.dia(list[k].n) - T.dia(res.n) !== 1)
      fail("suspension", "seed " + s + " chord " + ci + " does not resolve down by step");
    const figs = H.figures(p.chords[ci], p.voicing[ci][0], T.keySig(p.chords[ci].key), sus).join(" ");
    if (!figs.includes(sus.sus + "–")) fail("suspension figure", "seed " + s + " chord " + ci + ": figures " + figs);
  }
}
if (susCount < 50) fail("suspension", "only " + susCount + " suspensions in 150 passages; expected more");

const kinds = Object.keys(failures);
console.log({
  scoresChecked: generated,
  suspensions: susCount,
  failures: Object.fromEntries(kinds.map((k) => [k, failures[k].length])),
});
for (const k of kinds) console.log("\n" + k + ":\n  " + failures[k].slice(0, 5).join("\n  "));
if (kinds.length) process.exit(1);
