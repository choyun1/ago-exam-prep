/* Auto-graded drill generators for the daily quiz. Each returns
 * { topic, kind, q, choices, answer, explain, abc?, audio? } with the correct choice at index `answer`. */
(function (root) {
  "use strict";
  const T = root.Theory, H = root.Harmony, Gen = root.Gen;

  function mc(r, correct, distractors, n) {
    const pool = []; const seen = new Set([correct]);
    for (const d of distractors) if (!seen.has(d)) { seen.add(d); pool.push(d); }
    const choices = r.shuffle([correct].concat(r.shuffle(pool).slice(0, (n || 4) - 1)));
    return { choices, answer: choices.indexOf(correct) };
  }
  const oneNote = (key, n, clef, extra) => H.renderABC(Object.assign({ key, meter: "none", staves: [{ clef: clef || "treble", voices: [{ id: "X", events: [{ n, dur: 4 }] }] }] }, extra || {}));
  const D = {};

  D.keySignature = function (r) {
    const mode = r.pick(["major", "minor"]);
    const [l, a] = r.pick(T.KEY_LIST[mode]);
    const key = T.mkKey(l, a, mode);
    const abc = "X:1\nM:none\nL:1/4\nK:" + H.abcKey(key) + "\nx4|]\n";
    const correct = T.keyShort(key);
    const others = T.KEY_LIST[mode].map(([l2, a2]) => T.keyShort(T.mkKey(l2, a2, mode))).filter((k) => k !== correct);
    const m = mc(r, correct, others);
    return { topic: "theory", kind: "Key signatures", q: "Which " + mode + " key has this signature?", abc, ...m, explain: correct + " has " + Math.abs(T.sigCount(key)) + (T.sigCount(key) >= 0 ? " sharp(s)." : " flat(s).") };
  };

  D.interval = function (r) {
    const names = ["m2", "M2", "m3", "M3", "P4", "A4", "d5", "P5", "m6", "M6", "m7", "M7"];
    for (;;) {
      const lo = { L: r.int(7), a: r.pick([0, 0, 0, 1, -1]), o: 4 };
      const iv = r.pick(names); const [ds, ss] = T.INTERVALS[iv];
      const hi = T.transposeNote(lo, ds, ss);
      if (Math.abs(hi.a) > 1) continue;
      const key = T.mkKey("C", 0, "major");
      const abc = H.renderABC({ key, meter: "none", staves: [{ clef: "treble", voices: [{ id: "X", events: [{ n: lo, dur: 4 }, { n: hi, dur: 4 }] }] }] });
      const m = mc(r, T.INTERVAL_NAMES[iv], names.map((x) => T.INTERVAL_NAMES[x]));
      return { topic: "theory", kind: "Intervals", q: "Name the interval.", abc, ...m, explain: T.name(lo) + " up to " + T.name(hi) + " is a " + T.INTERVAL_NAMES[iv] + "." };
    }
  };

  D.figuredToRoman = function (r) {
    const key = Gen.randomKey(r, { maxAcc: 4, minorP: 0.45 });
    const p = Gen.passage(r, key, [{ cadence: r.pick(["PAC", "HC", "DC"]) }], "4/4");
    const cand = p.chords.filter((c) => c.key === key);
    const ch = r.pick(cand);
    const i = p.chords.indexOf(ch);
    const bass = p.voicing[i][0];
    const figs = H.figures(ch, bass, T.keySig(key));
    const abc = H.renderABC({ key, meter: "none", staves: [{ clef: "bass", voices: [{ id: "B", events: [{ n: bass, dur: 4, ann: figs.length ? figs : ["(none)"] }] }] }] });
    const pool = ["I", "I6", "I64", "ii", "ii6", "ii65", "IV", "IV6", "V", "V6", "V7", "V65", "V43", "V42", "vi", "vii°6", "iii"].map((s) => H.modeSym(s, key.mode));
    const m = mc(r, ch.sym, pool);
    return { topic: "theory", kind: "Figured bass", q: "In " + T.keyShort(key) + ", which chord do this bass note and figure indicate?", abc, ...m,
      explain: "Bass " + T.name(bass) + (figs.length ? " with " + figs.join("/") : " with no figure (root-position triad)") + " = " + ch.sym + ": " + ch.tones.map(T.pcName).join("–") + "." };
  };

  D.clefReading = function (r) {
    const clef = r.pick([["alto", "alto"], ["tenor", "tenor"], ["alto1", "soprano"]]);
    const key = T.mkKey("C", 0, "major");
    const base = clef[0] === "alto1" ? 4 * 7 : clef[0] === "alto" ? 3 * 7 + 3 : 3 * 7 + 1;
    const d = base + r.int(10); const n = T.fromDia(d, 0);
    const abc = oneNote(key, n, clef[0]);
    const correct = T.name(n, true);
    const others = [-2, -1, 1, 2, 7, -7].map((k) => T.name(T.fromDia(d + k, 0), true));
    const m = mc(r, correct, others);
    return { topic: "theory", kind: "C clefs", q: "Name this note in the " + clef[1] + " clef (middle C = C4).", abc, ...m, explain: "In the " + clef[1] + " clef, middle C sits on the " + (clef[0] === "alto1" ? "bottom line" : clef[0] === "alto" ? "middle line" : "fourth line") + "." };
  };

  D.transposeKey = function (r) {
    const key = Gen.randomKey(r, { maxAcc: 4, minorP: 0.3 });
    const opts = [["up a major 2nd", 2], ["down a minor 2nd", -1], ["up a minor 2nd", 1], ["down a major 2nd", -2], ["up a minor 3rd", 3], ["down a major 3rd", -4]];
    const [label, semis] = r.pick(opts);
    const c = Gen.transposeChoice(key, semis);
    const correct = T.keyShort(c.k);
    const others = [-2, -1, 1, 2, 3, -3].filter((s) => s !== semis).map((s) => T.keyShort(Gen.transposeChoice(key, s).k));
    const m = mc(r, correct, others);
    return { topic: "theory", kind: "Transposition", q: "A passage in " + T.keyShort(key) + " is transposed " + label + ". What is the new key?", ...m, explain: correct + " (" + Math.abs(T.sigCount(c.k)) + " accidental" + (Math.abs(T.sigCount(c.k)) === 1 ? "" : "s") + " in the signature)." };
  };

  D.keyRelations = function (r) {
    const key = Gen.randomKey(r, { maxAcc: 5 });
    const rel = r.pick(["dominant", "subdominant", "relative"]);
    const target = rel === "dominant" ? T.dominantKey(key) : rel === "subdominant" ? T.subdominantKey(key) : (key.mode === "major" ? T.relMinor(key) : T.relMajor(key));
    const correct = T.keyShort(target);
    const others = [T.dominantKey(key), T.subdominantKey(key), key.mode === "major" ? T.relMinor(key) : T.relMajor(key), T.transposeKey(key, 1, 2), T.transposeKey(target, 0, 0)].map((k) => T.keyShort(k)).concat([T.keyShort({ t: target.t, mode: target.mode === "major" ? "minor" : "major" })]);
    const m = mc(r, correct, others);
    return { topic: "theory", kind: "Key relationships", q: "What is the " + rel + " key of " + T.keyShort(key) + "?", ...m, explain: "The " + rel + " of " + T.keyShort(key) + " is " + correct + "." };
  };

  const MODES = [["1", "D", "A", "Dorian (authentic)"], ["2", "D", "F", "Hypodorian (plagal)"], ["3", "E", "C", "Phrygian (authentic)"], ["4", "E", "A", "Hypophrygian (plagal)"],
    ["5", "F", "C", "Lydian (authentic)"], ["6", "F", "A", "Hypolydian (plagal)"], ["7", "G", "D", "Mixolydian (authentic)"], ["8", "G", "C", "Hypomixolydian (plagal)"]];
  D.chantMode = function (r) {
    const [n, fin, dom, nm] = r.pick(MODES);
    const kind = r.int(3);
    if (kind === 0) {
      const correct = "final " + fin + ", reciting tone " + dom;
      const others = MODES.filter((x) => x[0] !== n).map((x) => "final " + x[1] + ", reciting tone " + x[2]);
      return { topic: "chant", kind: "Chant modes", q: "Mode " + n + ": what are its final and reciting tone (dominant)?", ...mc(r, correct, others), explain: "Mode " + n + " is " + nm + ": final " + fin + ", reciting tone " + dom + "." };
    }
    if (kind === 1) {
      const correct = "Mode " + n;
      return { topic: "chant", kind: "Chant modes", q: "A chant ends on " + fin + " and recites on " + dom + ". Which mode is it?", ...mc(r, correct, MODES.map((x) => "Mode " + x[0])), explain: nm + "." };
    }
    const correct = nm.split(" ")[0];
    return { topic: "chant", kind: "Chant modes", q: "What is the traditional name of mode " + n + "?", ...mc(r, correct, MODES.map((x) => x[3].split(" ")[0])), explain: "Mode " + n + " = " + nm + ". Odd-numbered modes are authentic, even-numbered plagal." };
  };

  const STOPS = [["Principal 8′ / Diapason", "8′", "unison"], ["Octave 4′ / Principal 4′", "4′", "octave"], ["Nazard", "2⅔′", "twelfth"], ["Fifteenth / Doublette", "2′", "two octaves (fifteenth)"],
    ["Tierce", "1⅗′", "seventeenth"], ["Larigot", "1⅓′", "nineteenth"], ["Septième", "1⅐′", "twenty-first (flat seventh)"], ["Quint (manual)", "5⅓′", "fifth above 8′ (sub-twelfth of 16′)"]];
  D.mutation = function (r) {
    const kind = r.int(3);
    if (kind === 0) {
      const s = r.pick(STOPS.slice(2));
      return { topic: "registration", kind: "Registration", q: "Which pitch does a " + s[0] + " normally speak at?", ...mc(r, s[1], STOPS.map((x) => x[1])), explain: s[0] + " = " + s[1] + ", sounding the " + s[2] + " above 8′ pitch." };
    }
    if (kind === 1) {
      const s = r.pick(STOPS.slice(2, 7));
      return { topic: "registration", kind: "Registration", q: "A rank at " + s[1] + " pitch sounds what interval above the 8′ unison?", ...mc(r, s[2], STOPS.map((x) => x[2])), explain: s[1] + " sounds the " + s[2] + "." };
    }
    const pairs = [["Cornet", "8′ 4′ 2⅔′ 2′ 1⅗′"], ["Sesquialtera", "2⅔′ 1⅗′"], ["Jeu de tierce (French Classical)", "8′ 4′ 2⅔′ 2′ 1⅗′ (with foundations)"]];
    const p = r.pick(pairs.slice(0, 2));
    return { topic: "registration", kind: "Registration", q: "Which ranks make up a " + p[0] + "?", ...mc(r, p[1], ["8′ 4′ 2⅔′ 2′ 1⅗′", "2⅔′ 1⅗′", "8′ 4′ 2′ 1′", "4′ 2⅔′ 2′", "2⅔′ 2′ 1⅓′"]), explain: p[0] + ": " + p[1] + "." };
  };

  const XPOSE = [["clarinet in B♭", 1, -2, "a major 2nd lower"], ["clarinet in A", 2, -3, "a minor 3rd lower"], ["horn in F", 4, -7, "a perfect 5th lower"], ["English horn", 4, -7, "a perfect 5th lower"],
    ["trumpet in B♭", 1, -2, "a major 2nd lower"], ["alto saxophone (E♭)", 5, -9, "a major 6th lower"], ["double bass", 7, -12, "an octave lower"], ["piccolo", -7, 12, "an octave higher"],
    ["bass clarinet in B♭ (treble clef)", 8, -14, "a major 9th lower"], ["alto flute in G", 3, -5, "a perfect 4th lower"], ["contrabassoon", 7, -12, "an octave lower"], ["glockenspiel", -14, 24, "two octaves higher"]];
  D.orchestral = function (r) {
    const [inst, ds, ss, txt] = r.pick(XPOSE);
    const written = { L: r.pick([0, 1, 2, 3, 4, 5]), a: 0, o: 5 };
    const sounding = T.transposeNote(written, -ds, ss);
    const correct = T.name(sounding, true);
    const others = [[-1, -2], [-2, -3], [-4, -7], [-5, -9], [-7, -12], [1, 2], [7, 12], [-3, -5]].map(([a, b]) => T.name(T.transposeNote(written, a, b), true));
    return { topic: "orchestration", kind: "Orchestral transposition", q: "A " + inst + " plays written " + T.name(written, true) + ". What pitch sounds?", ...mc(r, correct, others), explain: "The " + inst + " sounds " + txt + " than written." };
  };

  D.tonalAnswer = function (r) {
    const sub = r.pick(Gen.SUBJECTS);
    const key = Gen.randomKey(r, { mode: sub.mode, maxAcc: 3 });
    const { subj, ans, tonal } = Gen.answerFor(sub, key);
    const kind = r.chance(0.5);
    const abc = H.renderABC({ key, meter: "4/4", staves: [{ clef: "treble", voices: [{ id: "S", events: subj }] }] });
    if (kind) {
      return { topic: "fugue", kind: "Fugue", q: "Should this subject (" + T.keyShort(key) + ") get a tonal or a real answer?", abc, ...mc(r, tonal ? "Tonal" : "Real", ["Tonal", "Real"], 2),
        explain: tonal ? "The head of the subject contains ^5, which is answered by ^1 to keep the tonic: tonal answer." : "The head stays on ^1 without stressing ^5, so the answer is an exact transposition to the dominant: real answer." };
    }
    const correct = T.name(ans[0].n);
    const others = [T.name(subj[0].n), T.name(T.transposeNote(subj[0].n, 4, 7)), T.name(T.transposeNote(subj[0].n, 3, 5)), T.name(T.transposeNote(subj[0].n, 1, 2))];
    return { topic: "fugue", kind: "Fugue", q: "On which note does the answer to this subject (" + T.keyShort(key) + ") begin?", abc, ...mc(r, correct, others),
      explain: "Answer begins on " + correct + (tonal ? " (tonal answer: the opening ^5 becomes ^1, and ^1 becomes ^5)." : " (real answer: up a perfect 5th).") };
  };

  // ---------- ear ----------
  function chordNotes(midis, start, dur) { return midis.map((m) => ({ midi: m, start, dur })); }
  D.earCadence = function (r) {
    const key = Gen.randomKey(r, { maxAcc: 4, minorP: 0.35 });
    const cad = r.pick(["PAC", "IAC", "HC", "DC", "PL"]);
    let p;
    if (cad === "PL") {
      // plagal: IV – I
      for (let i = 0; i < 8 && !p; i++) {
        const chords = ["I", "IV", "I"].map((s) => H.decorateChord(key, H.modeSym(s, key.mode), { dur: 4, final: s === "I" }));
        const v = H.voice(chords, r); if (v) p = { chords, voicing: v };
      }
    } else p = Gen.passage(r, key, [{ cadence: cad }], "4/4");
    const n = p.chords.length;
    const from = Math.max(0, n - 4);
    const notes = []; let t = 0;
    for (let i = from; i < n; i++) { const d = i === n - 1 ? 1.6 : 0.75; notes.push(...chordNotes(p.voicing[i].map(T.midi), t, d * 0.95)); t += d; }
    const label = { PAC: "Perfect authentic", IAC: "Imperfect authentic", HC: "Half", DC: "Deceptive", PL: "Plagal" };
    return { topic: "ear", kind: "Ear: cadences", q: "Listen. Which cadence ends the excerpt?", audio: { notes, tonicKey: key }, ...mc(r, label[cad], Object.values(label), 5),
      explain: "It was " + label[cad].toLowerCase() + " (" + T.keyShort(key) + "): " + p.chords.slice(from).map((c) => c.sym).join(" – ") + "." };
  };
  const QUAL = [["Major triad", [0, 4, 7]], ["Minor triad", [0, 3, 7]], ["Diminished triad", [0, 3, 6]], ["Augmented triad", [0, 4, 8]],
    ["Dominant seventh", [0, 4, 7, 10]], ["Major seventh", [0, 4, 7, 11]], ["Minor seventh", [0, 3, 7, 10]], ["Half-diminished seventh", [0, 3, 6, 10]], ["Fully diminished seventh", [0, 3, 6, 9]]];
  D.earChord = function (r) {
    const [nm, iv] = r.pick(QUAL); const base = 48 + r.int(12);
    const notes = iv.map((x, i) => ({ midi: base + x, start: i * 0.35, dur: 0.33 })).concat(chordNotes(iv.map((x) => base + x), iv.length * 0.35 + 0.15, 1.6));
    return { topic: "ear", kind: "Ear: chord quality", q: "Listen (arpeggiated, then together). Name the chord quality.", audio: { notes }, ...mc(r, nm, QUAL.map((x) => x[0]), 5), explain: "It was a " + nm.toLowerCase() + "." };
  };
  D.earInterval = function (r) {
    const ivs = [["m2", 1], ["M2", 2], ["m3", 3], ["M3", 4], ["P4", 5], ["A4/d5", 6], ["P5", 7], ["m6", 8], ["M6", 9], ["m7", 10], ["M7", 11], ["P8", 12]];
    const [nm, s] = r.pick(ivs); const lo = 55 + r.int(10); const harm = r.chance(0.4);
    const notes = harm ? chordNotes([lo, lo + s], 0, 1.5) : [{ midi: lo, start: 0, dur: 0.7 }, { midi: lo + s, start: 0.8, dur: 0.9 }];
    const full = (x) => (x === "A4/d5" ? "Tritone" : T.INTERVAL_NAMES[x]);
    return { topic: "ear", kind: "Ear: intervals", q: "Listen. Name the " + (harm ? "harmonic" : "melodic") + " interval.", audio: { notes }, ...mc(r, full(nm), ivs.map((x) => full(x[0])), 5), explain: "It was a " + full(nm).toLowerCase() + "." };
  };

  // Where each drill's answer comes from (the rule it applies) and which 2027 exam items it supports.
  const KPA = "Kostka, Payne & Almén, Tonal Harmony (8th ed., 2018)";
  const SRC = {
    keySignature: { rule: KPA + ", key signatures and the circle of fifths", items: "SPC S2; CAGO C7; AAGO A5; FAGO F5 (transposition)" },
    interval: { rule: KPA + ", intervals", items: "CAGO C9; AAGO A10 (dictation)" },
    figuredToRoman: { rule: KPA + ", figured bass and inversions; F. T. Arnold, The Art of Accompaniment from a Thorough-Bass (1931)", items: "CAGO C12; AAGO A7 (continuo realization)" },
    clefReading: { rule: "Grove Music Online, s.v. \"Clef\"; R. O. Morris & H. Ferguson, Preparatory Exercises in Score Reading (1931)", items: "FAGO F3 (clef reading)" },
    transposeKey: { rule: KPA + ", key signatures; transposition by interval", items: "SPC S2; CAGO C7; AAGO A5; FAGO F5 (transposition)" },
    keyRelations: { rule: KPA + ", closely related keys and modulation", items: "CAGO C8; AAGO A2 (modulating improvisation and interludes)" },
    chantMode: { rule: "Grove Music Online, s.v. \"Mode\" §II (finals and dominants of the eight modes); Liber Usualis (1961)", items: "ChM Ch5 (Gregorian chant)" },
    mutation: { rule: "Stevens Irwin, Dictionary of Pipe Organ Stops (2nd ed., 1983): pitch of a rank = 8′ ÷ harmonic number", items: "AAGO A11 (aural perception: registration)" },
    orchestral: { rule: "Samuel Adler, The Study of Orchestration (4th ed., 2016), transposing instruments", items: "FAGO F11 (orchestration)" },
    tonalAnswer: { rule: "Robert Gauldin, A Practical Approach to 18th-Century Counterpoint (1988), fugal answer; Gedalge, Traité de la fugue (1901)", items: "CAGO C11; AAGO A9; FAGO F8 (fugue)" },
    earCadence: { rule: KPA + ", cadences", items: "CAGO C10; AAGO A11 (aural perception)" },
    earChord: { rule: KPA + ", triads and seventh chords", items: "CAGO C10; AAGO A11; ChM Ch3 (aural tests)" },
    earInterval: { rule: KPA + ", intervals", items: "CAGO C9; AAGO A10; FAGO F10 (dictation)" }
  };
  for (const k of Object.keys(SRC)) {
    const f = D[k];
    D[k] = function (r) { const q = f(r); q.src = SRC[k].rule; q.trains = SRC[k].items; return q; };
  }

  const api = { D, MODES, SRC };
  root.Drills = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
