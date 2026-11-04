/* Auto-graded drill generators for the daily quiz. Each returns
 * { topic, kind, q, choices, answer, explain, abc?, audio? } with the correct choice at index `answer`. */
(function (root) {
  "use strict";
  const T = root.Theory,
    H = root.Harmony,
    Gen = root.Gen;

  function mc(r, correct, distractors, n) {
    const pool = [];
    const seen = new Set([correct]);
    for (const d of distractors)
      if (!seen.has(d)) {
        seen.add(d);
        pool.push(d);
      }
    const choices = r.shuffle([correct].concat(r.shuffle(pool).slice(0, (n || 4) - 1)));
    return { choices, answer: choices.indexOf(correct) };
  }
  const oneNote = (key, n, clef, extra) =>
    H.renderABC(
      Object.assign(
        { key, meter: "none", staves: [{ clef: clef || "treble", voices: [{ id: "X", events: [{ n, dur: 4 }] }] }] },
        extra || {},
      ),
    );
  const D = {};

  D.keySignature = function (r) {
    const mode = r.pick(["major", "minor"]);
    const [l, a] = r.pick(T.KEY_LIST[mode]);
    const key = T.mkKey(l, a, mode);
    const abc = "X:1\nM:none\nL:1/4\nK:" + H.abcKey(key) + "\nx4|]\n";
    const correct = T.keyShort(key);
    const others = T.KEY_LIST[mode].map(([l2, a2]) => T.keyShort(T.mkKey(l2, a2, mode))).filter((k) => k !== correct);
    const m = mc(r, correct, others);
    return {
      topic: "theory",
      kind: "Key signatures",
      q: "Which " + mode + " key has this signature?",
      abc,
      ...m,
      explain: correct + " has " + Math.abs(T.sigCount(key)) + (T.sigCount(key) >= 0 ? " sharp(s)." : " flat(s)."),
    };
  };

  D.interval = function (r) {
    const names = ["m2", "M2", "m3", "M3", "P4", "A4", "d5", "P5", "m6", "M6", "m7", "M7"];
    for (;;) {
      const lo = { L: r.int(7), a: r.pick([0, 0, 0, 1, -1]), o: 4 };
      const iv = r.pick(names);
      const [ds, ss] = T.INTERVALS[iv];
      const hi = T.transposeNote(lo, ds, ss);
      if (Math.abs(hi.a) > 1) continue;
      const key = T.mkKey("C", 0, "major");
      const abc = H.renderABC({
        key,
        meter: "none",
        staves: [
          {
            clef: "treble",
            voices: [
              {
                id: "X",
                events: [
                  { n: lo, dur: 4 },
                  { n: hi, dur: 4 },
                ],
              },
            ],
          },
        ],
      });
      const m = mc(
        r,
        T.INTERVAL_NAMES[iv],
        names.map((x) => T.INTERVAL_NAMES[x]),
      );
      return {
        topic: "theory",
        kind: "Intervals",
        q: "Name the interval.",
        abc,
        ...m,
        explain: T.name(lo) + " up to " + T.name(hi) + " is a " + T.INTERVAL_NAMES[iv] + ".",
      };
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
    const abc = H.renderABC({
      key,
      meter: "none",
      staves: [
        { clef: "bass", voices: [{ id: "B", events: [{ n: bass, dur: 4, ann: figs.length ? figs : ["(none)"] }] }] },
      ],
    });
    const pool = [
      "I",
      "I6",
      "I64",
      "ii",
      "ii6",
      "ii65",
      "IV",
      "IV6",
      "V",
      "V6",
      "V7",
      "V65",
      "V43",
      "V42",
      "vi",
      "vii°6",
      "iii",
    ].map((s) => H.modeSym(s, key.mode));
    const m = mc(r, ch.sym, pool);
    return {
      topic: "theory",
      kind: "Figured bass",
      q: "In " + T.keyShort(key) + ", which chord do this bass note and figure indicate?",
      abc,
      ...m,
      explain:
        "Bass " +
        T.name(bass) +
        (figs.length ? " with " + figs.join("/") : " with no figure (root-position triad)") +
        " = " +
        ch.sym +
        ": " +
        ch.tones.map(T.pcName).join("–") +
        ".",
    };
  };

  D.clefReading = function (r) {
    const clef = r.pick([
      ["alto", "alto"],
      ["tenor", "tenor"],
      ["alto1", "soprano"],
    ]);
    const key = T.mkKey("C", 0, "major");
    const base = clef[0] === "alto1" ? 4 * 7 : clef[0] === "alto" ? 3 * 7 + 3 : 3 * 7 + 1;
    const d = base + r.int(10);
    const n = T.fromDia(d, 0);
    const abc = oneNote(key, n, clef[0]);
    const correct = T.name(n, true);
    const others = [-2, -1, 1, 2, 7, -7].map((k) => T.name(T.fromDia(d + k, 0), true));
    const m = mc(r, correct, others);
    return {
      topic: "theory",
      kind: "C clefs",
      q: "Name this note in the " + clef[1] + " clef (middle C = C4).",
      abc,
      ...m,
      explain:
        "In the " +
        clef[1] +
        " clef, middle C sits on the " +
        (clef[0] === "alto1" ? "bottom line" : clef[0] === "alto" ? "middle line" : "fourth line") +
        ".",
    };
  };

  D.transposeKey = function (r) {
    const key = Gen.randomKey(r, { maxAcc: 4, minorP: 0.3 });
    const opts = [
      ["up a major 2nd", 2],
      ["down a minor 2nd", -1],
      ["up a minor 2nd", 1],
      ["down a major 2nd", -2],
      ["up a minor 3rd", 3],
      ["down a major 3rd", -4],
    ];
    const [label, semis] = r.pick(opts);
    const c = Gen.transposeChoice(key, semis);
    const correct = T.keyShort(c.k);
    const others = [-2, -1, 1, 2, 3, -3]
      .filter((s) => s !== semis)
      .map((s) => T.keyShort(Gen.transposeChoice(key, s).k));
    const m = mc(r, correct, others);
    return {
      topic: "theory",
      kind: "Transposition",
      q: "A passage in " + T.keyShort(key) + " is transposed " + label + ". What is the new key?",
      ...m,
      explain:
        correct +
        " (" +
        Math.abs(T.sigCount(c.k)) +
        " accidental" +
        (Math.abs(T.sigCount(c.k)) === 1 ? "" : "s") +
        " in the signature).",
    };
  };

  D.keyRelations = function (r) {
    const key = Gen.randomKey(r, { maxAcc: 5 });
    const rel = r.pick(["dominant", "subdominant", "relative"]);
    const target =
      rel === "dominant"
        ? T.dominantKey(key)
        : rel === "subdominant"
          ? T.subdominantKey(key)
          : key.mode === "major"
            ? T.relMinor(key)
            : T.relMajor(key);
    const correct = T.keyShort(target);
    const others = [
      T.dominantKey(key),
      T.subdominantKey(key),
      key.mode === "major" ? T.relMinor(key) : T.relMajor(key),
      T.transposeKey(key, 1, 2),
      T.transposeKey(target, 0, 0),
    ]
      .map((k) => T.keyShort(k))
      .concat([T.keyShort({ t: target.t, mode: target.mode === "major" ? "minor" : "major" })]);
    const m = mc(r, correct, others);
    return {
      topic: "theory",
      kind: "Key relationships",
      q: "What is the " + rel + " key of " + T.keyShort(key) + "?",
      ...m,
      explain: "The " + rel + " of " + T.keyShort(key) + " is " + correct + ".",
    };
  };

  const MODES = [
    ["1", "D", "A", "Dorian (authentic)"],
    ["2", "D", "F", "Hypodorian (plagal)"],
    ["3", "E", "C", "Phrygian (authentic)"],
    ["4", "E", "A", "Hypophrygian (plagal)"],
    ["5", "F", "C", "Lydian (authentic)"],
    ["6", "F", "A", "Hypolydian (plagal)"],
    ["7", "G", "D", "Mixolydian (authentic)"],
    ["8", "G", "C", "Hypomixolydian (plagal)"],
  ];
  D.chantMode = function (r) {
    const [n, fin, dom, nm] = r.pick(MODES);
    const kind = r.int(3);
    if (kind === 0) {
      const correct = "final " + fin + ", reciting tone " + dom;
      const others = MODES.filter((x) => x[0] !== n).map((x) => "final " + x[1] + ", reciting tone " + x[2]);
      return {
        topic: "chant",
        kind: "Chant modes",
        q: "Mode " + n + ": what are its final and reciting tone (dominant)?",
        ...mc(r, correct, others),
        explain: "Mode " + n + " is " + nm + ": final " + fin + ", reciting tone " + dom + ".",
      };
    }
    if (kind === 1) {
      const correct = "Mode " + n;
      return {
        topic: "chant",
        kind: "Chant modes",
        q: "A chant ends on " + fin + " and recites on " + dom + ". Which mode is it?",
        ...mc(
          r,
          correct,
          MODES.map((x) => "Mode " + x[0]),
        ),
        explain: nm + ".",
      };
    }
    const correct = nm.split(" ")[0];
    return {
      topic: "chant",
      kind: "Chant modes",
      q: "What is the traditional name of mode " + n + "?",
      ...mc(
        r,
        correct,
        MODES.map((x) => x[3].split(" ")[0]),
      ),
      explain: "Mode " + n + " = " + nm + ". Odd-numbered modes are authentic, even-numbered plagal.",
    };
  };

  const STOPS = [
    ["Principal 8′ / Diapason", "8′", "unison"],
    ["Octave 4′ / Principal 4′", "4′", "octave"],
    ["Nazard", "2⅔′", "twelfth"],
    ["Fifteenth / Doublette", "2′", "two octaves (fifteenth)"],
    ["Tierce", "1⅗′", "seventeenth"],
    ["Larigot", "1⅓′", "nineteenth"],
    ["Septième", "1⅐′", "twenty-first (flat seventh)"],
    ["Quint (manual)", "5⅓′", "fifth above 8′ (sub-twelfth of 16′)"],
  ];
  D.mutation = function (r) {
    const kind = r.int(3);
    if (kind === 0) {
      const s = r.pick(STOPS.slice(2));
      return {
        topic: "registration",
        kind: "Registration",
        q: "Which pitch does a " + s[0] + " normally speak at?",
        ...mc(
          r,
          s[1],
          STOPS.map((x) => x[1]),
        ),
        explain: s[0] + " = " + s[1] + ", sounding the " + s[2] + " above 8′ pitch.",
      };
    }
    if (kind === 1) {
      const s = r.pick(STOPS.slice(2, 7));
      return {
        topic: "registration",
        kind: "Registration",
        q: "A rank at " + s[1] + " pitch sounds what interval above the 8′ unison?",
        ...mc(
          r,
          s[2],
          STOPS.map((x) => x[2]),
        ),
        explain: s[1] + " sounds the " + s[2] + ".",
      };
    }
    const pairs = [
      ["Cornet", "8′ 4′ 2⅔′ 2′ 1⅗′"],
      ["Sesquialtera", "2⅔′ 1⅗′"],
      ["Jeu de tierce (French Classical)", "8′ 4′ 2⅔′ 2′ 1⅗′ (with foundations)"],
    ];
    const p = r.pick(pairs.slice(0, 2));
    return {
      topic: "registration",
      kind: "Registration",
      q: "Which ranks make up a " + p[0] + "?",
      ...mc(r, p[1], ["8′ 4′ 2⅔′ 2′ 1⅗′", "2⅔′ 1⅗′", "8′ 4′ 2′ 1′", "4′ 2⅔′ 2′", "2⅔′ 2′ 1⅓′"]),
      explain: p[0] + ": " + p[1] + ".",
    };
  };

  const XPOSE = [
    ["clarinet in B♭", 1, -2, "a major 2nd lower"],
    ["clarinet in A", 2, -3, "a minor 3rd lower"],
    ["horn in F", 4, -7, "a perfect 5th lower"],
    ["English horn", 4, -7, "a perfect 5th lower"],
    ["trumpet in B♭", 1, -2, "a major 2nd lower"],
    ["alto saxophone (E♭)", 5, -9, "a major 6th lower"],
    ["double bass", 7, -12, "an octave lower"],
    ["piccolo", -7, 12, "an octave higher"],
    ["bass clarinet in B♭ (treble clef)", 8, -14, "a major 9th lower"],
    ["alto flute in G", 3, -5, "a perfect 4th lower"],
    ["contrabassoon", 7, -12, "an octave lower"],
    ["glockenspiel", -14, 24, "two octaves higher"],
  ];
  D.orchestral = function (r) {
    const [inst, ds, ss, txt] = r.pick(XPOSE);
    const written = { L: r.pick([0, 1, 2, 3, 4, 5]), a: 0, o: 5 };
    const sounding = T.transposeNote(written, -ds, ss);
    const correct = T.name(sounding, true);
    const others = [
      [-1, -2],
      [-2, -3],
      [-4, -7],
      [-5, -9],
      [-7, -12],
      [1, 2],
      [7, 12],
      [-3, -5],
    ].map(([a, b]) => T.name(T.transposeNote(written, a, b), true));
    return {
      topic: "orchestration",
      kind: "Orchestral transposition",
      q: "A " + inst + " plays written " + T.name(written, true) + ". What pitch sounds?",
      ...mc(r, correct, others),
      explain: "The " + inst + " sounds " + txt + " than written.",
    };
  };

  D.tonalAnswer = function (r) {
    const sub = r.pick(Gen.SUBJECTS);
    const key = Gen.randomKey(r, { mode: sub.mode, maxAcc: 3 });
    const { subj, ans, tonal } = Gen.answerFor(sub, key);
    const kind = r.chance(0.5);
    const abc = H.renderABC({ key, meter: "4/4", staves: [{ clef: "treble", voices: [{ id: "S", events: subj }] }] });
    if (kind) {
      return {
        topic: "fugue",
        kind: "Fugue",
        q: "Should this subject (" + T.keyShort(key) + ") get a tonal or a real answer?",
        abc,
        ...mc(r, tonal ? "Tonal" : "Real", ["Tonal", "Real"], 2),
        explain: tonal
          ? "The head of the subject contains ^5, which is answered by ^1 to keep the tonic: tonal answer."
          : "The head stays on ^1 without stressing ^5, so the answer is an exact transposition to the dominant: real answer.",
      };
    }
    const correct = T.name(ans[0].n);
    const others = [
      T.name(subj[0].n),
      T.name(T.transposeNote(subj[0].n, 4, 7)),
      T.name(T.transposeNote(subj[0].n, 3, 5)),
      T.name(T.transposeNote(subj[0].n, 1, 2)),
    ];
    return {
      topic: "fugue",
      kind: "Fugue",
      q: "On which note does the answer to this subject (" + T.keyShort(key) + ") begin?",
      abc,
      ...mc(r, correct, others),
      explain:
        "Answer begins on " +
        correct +
        (tonal
          ? " (tonal answer: the opening ^5 becomes ^1, and ^1 becomes ^5)."
          : " (real answer: up a perfect 5th)."),
    };
  };

  // ---------- ear ----------
  function chordNotes(midis, start, dur) {
    return midis.map((m) => ({ midi: m, start, dur }));
  }
  D.earCadence = function (r) {
    const key = Gen.randomKey(r, { maxAcc: 4, minorP: 0.35 });
    const cad = r.pick(["PAC", "IAC", "HC", "DC", "PL"]);
    let p;
    if (cad === "PL") {
      // plagal: IV – I
      for (let i = 0; i < 8 && !p; i++) {
        const chords = ["I", "IV", "I"].map((s) =>
          H.decorateChord(key, H.modeSym(s, key.mode), { dur: 4, final: s === "I" }),
        );
        const v = H.voice(chords, r);
        if (v) p = { chords, voicing: v };
      }
    } else p = Gen.passage(r, key, [{ cadence: cad }], "4/4");
    const n = p.chords.length;
    const from = Math.max(0, n - 4);
    const notes = [];
    let t = 0;
    for (let i = from; i < n; i++) {
      const d = i === n - 1 ? 1.6 : 0.75;
      notes.push(...chordNotes(p.voicing[i].map(T.midi), t, d * 0.95));
      t += d;
    }
    const label = { PAC: "Perfect authentic", IAC: "Imperfect authentic", HC: "Half", DC: "Deceptive", PL: "Plagal" };
    return {
      topic: "ear",
      kind: "Ear: cadences",
      q: "Listen. Which cadence ends the excerpt?",
      audio: { notes, tonicKey: key },
      ...mc(r, label[cad], Object.values(label), 5),
      explain:
        "It was " +
        label[cad].toLowerCase() +
        " (" +
        T.keyShort(key) +
        "): " +
        p.chords
          .slice(from)
          .map((c) => c.sym)
          .join(" – ") +
        ".",
    };
  };
  const QUAL = [
    ["Major triad", [0, 4, 7]],
    ["Minor triad", [0, 3, 7]],
    ["Diminished triad", [0, 3, 6]],
    ["Augmented triad", [0, 4, 8]],
    ["Dominant seventh", [0, 4, 7, 10]],
    ["Major seventh", [0, 4, 7, 11]],
    ["Minor seventh", [0, 3, 7, 10]],
    ["Half-diminished seventh", [0, 3, 6, 10]],
    ["Fully diminished seventh", [0, 3, 6, 9]],
  ];
  D.earChord = function (r) {
    const [nm, iv] = r.pick(QUAL);
    const base = 48 + r.int(12);
    const notes = iv
      .map((x, i) => ({ midi: base + x, start: i * 0.35, dur: 0.33 }))
      .concat(
        chordNotes(
          iv.map((x) => base + x),
          iv.length * 0.35 + 0.15,
          1.6,
        ),
      );
    return {
      topic: "ear",
      kind: "Ear: chord quality",
      q: "Listen (arpeggiated, then together). Name the chord quality.",
      audio: { notes },
      ...mc(
        r,
        nm,
        QUAL.map((x) => x[0]),
        5,
      ),
      explain: "It was a " + nm.toLowerCase() + ".",
    };
  };
  D.earInterval = function (r) {
    const ivs = [
      ["m2", 1],
      ["M2", 2],
      ["m3", 3],
      ["M3", 4],
      ["P4", 5],
      ["A4/d5", 6],
      ["P5", 7],
      ["m6", 8],
      ["M6", 9],
      ["m7", 10],
      ["M7", 11],
      ["P8", 12],
    ];
    const [nm, s] = r.pick(ivs);
    const lo = 55 + r.int(10);
    const harm = r.chance(0.4);
    const notes = harm
      ? chordNotes([lo, lo + s], 0, 1.5)
      : [
          { midi: lo, start: 0, dur: 0.7 },
          { midi: lo + s, start: 0.8, dur: 0.9 },
        ];
    const full = (x) => (x === "A4/d5" ? "Tritone" : T.INTERVAL_NAMES[x]);
    return {
      topic: "ear",
      kind: "Ear: intervals",
      q: "Listen. Name the " + (harm ? "harmonic" : "melodic") + " interval.",
      audio: { notes },
      ...mc(
        r,
        full(nm),
        ivs.map((x) => full(x[0])),
        5,
      ),
      explain: "It was a " + full(nm).toLowerCase() + ".",
    };
  };

  // ---------- drills for the written and ear items (C9–C13, A8–A11, F7–F11) ----------
  // a scale-degree note: d counts from the tonic (0 = ^1, -1 = ^7 below, 7 = ^1 an octave up), o = the tonic's octave.
  // In minor, ^7 is raised (it is the leading tone of V in every pattern below).
  function degN(key, d, o) {
    const dd = ((d % 7) + 7) % 7;
    const p = T.degreePC(key, dd, { raise7: true });
    return { L: p.L, a: p.a, o: o + Math.floor(d / 7) + (key.t.L + dd >= 7 ? 1 : 0) };
  }
  const twoStaves = (key, upper, lower) =>
    H.renderABC({
      key,
      meter: "4/4",
      staves: [
        { clef: "treble", voices: [{ id: "U", events: upper }] },
        { clef: "bass", voices: [{ id: "L", events: lower }] },
      ],
    });
  const audioOf = (key, lists, tempo) => Object.assign(Gen.audioFrom(lists, tempo || 76), { tonicKey: key });

  // Non-chord tones over I – V: [degree, eighths, is the non-chord tone, tied to the next note]
  const NCT = {
    "Passing tone": {
      mel: [
        [2, 2],
        [3, 2, 1],
        [4, 4],
      ],
      why: "approached and left by step in the same direction",
    },
    "Neighbor tone": {
      mel: [
        [4, 2],
        [5, 2, 1],
        [4, 4],
      ],
      why: "steps away from a chord tone and back to the same note",
    },
    "Lower neighbor tone": {
      mel: [
        [4, 2],
        [3, 2, 1],
        [4, 4],
      ],
      why: "steps down from a chord tone and back up to it",
    },
    "Escape tone": {
      mel: [
        [0, 2],
        [1, 2, 1],
        [-1, 4],
      ],
      why: "left by leap in the opposite direction after a step",
    },
    Appoggiatura: {
      mel: [
        [2, 4],
        [0, 2, 1],
        [1, 2],
      ],
      why: "approached by leap on the strong beat and resolved by step",
    },
    Anticipation: {
      mel: [
        [2, 2],
        [1, 2, 1],
        [1, 4],
      ],
      why: "sounds a note of the next chord before the chord arrives",
    },
    Suspension: {
      mel: [
        [0, 4, 0, 1],
        [0, 2, 1],
        [-1, 2],
      ],
      why: "held over from the previous chord and resolved down by step",
    },
  };
  D.nonChordTone = function (r) {
    const key = Gen.randomKey(r, { maxAcc: 4, minorP: 0.35 });
    const kind = r.pick(Object.keys(NCT));
    const upper = NCT[kind].mel.map(([d, dur, nct, tie]) => ({
      n: degN(key, d, 4),
      dur,
      tie: !!tie,
      annAbove: nct ? "*" : undefined,
    }));
    const lower = [
      { n: degN(key, 0, 3), dur: 4, ann: [key.mode === "minor" ? "i" : "I"] },
      { n: degN(key, 4, 2), dur: 4, ann: ["V"] },
    ];
    return {
      topic: "theory",
      kind: "Non-chord tones",
      q: "What kind of non-chord tone is the note marked * (" + T.keyShort(key) + ")?",
      abc: twoStaves(key, upper, lower),
      audio: audioOf(key, [lower, upper]),
      ...mc(r, kind, Object.keys(NCT), 4),
      explain: "A " + kind.toLowerCase() + " is " + NCT[kind].why + ".",
    };
  };

  // Suspensions: the upper voice (or, for 2–3, the bass) is prepared, held against the new chord, and resolved.
  // [upper notes, lower notes], each [degree, octave, eighths, tied]
  const SUSP = {
    "4–3": [
      [
        [0, 4, 4, 1],
        [0, 4, 2],
        [-1, 4, 2],
      ],
      [
        [0, 3, 4],
        [4, 2, 4],
      ],
    ],
    "7–6": [
      [
        [0, 4, 4, 1],
        [0, 4, 2],
        [-1, 4, 2],
      ],
      [
        [2, 3, 4],
        [1, 3, 4],
      ],
    ],
    "9–8": [
      [
        [1, 4, 4, 1],
        [1, 4, 2],
        [0, 4, 2],
      ],
      [
        [4, 2, 4],
        [0, 3, 4],
      ],
    ],
    "2–3 (in the bass)": [
      [
        [0, 4, 4],
        [3, 4, 4],
      ],
      [
        [2, 3, 4, 1],
        [2, 3, 2],
        [1, 3, 2],
      ],
    ],
  };
  D.suspensionType = function (r) {
    const key = Gen.randomKey(r, { maxAcc: 4, minorP: 0.35 });
    const kind = r.pick(Object.keys(SUSP));
    const ev = (list) => list.map(([d, o, dur, tie]) => ({ n: degN(key, d, o), dur, tie: !!tie }));
    const [upper, lower] = SUSP[kind].map(ev);
    return {
      topic: "theory",
      kind: "Suspensions",
      q: "Listen and look. Which suspension is this (" + T.keyShort(key) + ")?",
      abc: twoStaves(key, upper, lower),
      audio: audioOf(key, [lower, upper], 66),
      ...mc(r, kind, Object.keys(SUSP), 4),
      explain:
        kind === "2–3 (in the bass)"
          ? "The bass is held while the upper voice moves to a 2nd (9th) above it, then the bass steps down to make a 3rd."
          : "Count the interval between the held note and the bass, then the interval after it resolves down by step: " +
            kind +
            ".",
    };
  };

  // Missing-tone dictation (CAGO C9): soprano and bass of a generated phrase, one note hidden.
  D.missingTone = function (r) {
    const key = Gen.randomKey(r, { maxAcc: 3, minorP: 0.3 });
    const p = Gen.passage(r, key, [{ cadence: r.pick(["PAC", "HC", "IAC"]) }], "4/4");
    const upper = p.chords.map((c, i) => ({ n: p.voicing[i][3], dur: c.dur }));
    const lower = p.chords.map((c, i) => ({ n: p.voicing[i][0], dur: c.dur }));
    const inBass = r.chance(0.5);
    const line = inBass ? lower : upper;
    const i = 1 + r.int(line.length - 2);
    const n = line[i].n;
    const audio = audioOf(key, [lower.map((e) => ({ ...e })), upper.map((e) => ({ ...e }))], 72);
    line[i] = { n: null, dur: line[i].dur, annAbove: "?" }; // shown as a rest marked ?
    // the diatonic notes around it, plus the same letter with the other accidental
    const others = [-2, -1, 1, 2].map((st) => {
      const x = T.fromDia(T.dia(n) + st, 0);
      x.a = T.keySig(key)[x.L];
      return T.name(x);
    });
    others.push(T.name({ L: n.L, a: n.a === 0 ? T.keySig(key)[n.L] || (r.chance(0.5) ? 1 : -1) : 0, o: n.o }));
    return {
      topic: "ear",
      kind: "Ear: missing tones",
      q: "Listen. Which note is missing at the ? in the " + (inBass ? "bass" : "soprano") + "?",
      abc: twoStaves(key, upper, lower),
      audio,
      ...mc(r, T.name(n), others, 4),
      explain:
        "The missing note was " +
        T.name(n) +
        " (" +
        p.chords[i].sym +
        " in " +
        T.keyShort(key) +
        "). Sing the line by scale degree from the note before it.",
    };
  };

  // Binary and ternary forms (CAGO C13, AAGO A8), described as a section/key/cadence chart.
  const FORMS = {
    "Sectional binary": "two repeated halves; the first ends on a PAC in the tonic, and the opening does not return",
    "Continuous binary": "two repeated halves; the first ends away from the tonic (in a new key or on a half cadence)",
    "Rounded binary": "the second half ends by bringing back the opening phrase in the tonic, shortened",
    "Balanced binary": "the closing bars of the first half return at the end of the second half, now in the tonic",
    "Ternary (ABA)": "a closed A section in the tonic, a contrasting B section, and a full return of A",
  };
  D.formType = function (r) {
    const key = Gen.randomKey(r, { maxAcc: 4, minorP: 0.3 });
    const I = T.keyShort(key);
    const other = T.keyShort(key.mode === "minor" ? T.relMajor(key) : T.dominantKey(key));
    const contrast = T.keyShort(
      r.pick([T.subdominantKey(key), key.mode === "minor" ? T.relMajor(key) : T.relMinor(key)]),
    );
    const b = r.pick([8, 8, 12, 16]);
    const form = r.pick(Object.keys(FORMS));
    const rows = {
      "Sectional binary": [
        "||: A (" + b + " bars): " + I + ", ends with a PAC in " + I + " :||",
        "||: B (" + b + " bars): new material, through " + other + ", ends with a PAC in " + I + " :||",
      ],
      "Continuous binary": [
        "||: A (" + b + " bars): " + I + " → " + other + ", ends with a PAC in " + other + " :||",
        "||: B (" + b + " bars): " + other + " → " + I + ", new material, ends with a PAC in " + I + " :||",
      ],
      "Rounded binary": [
        "||: A (" + b + " bars): " + I + " → " + other + ", PAC in " + other + " :||",
        "||: B (" +
          b / 2 +
          " bars) on a dominant pedal, then the first " +
          b / 2 +
          " bars of A in " +
          I +
          ", PAC in " +
          I +
          " :||",
      ],
      "Balanced binary": [
        "||: A (" + b + " bars): " + I + " → " + other + "; last 4 bars are a closing figure, PAC in " + other + " :||",
        "||: B (" +
          (b + 4) +
          " bars): new material back to " +
          I +
          "; ends with A's closing figure transposed to " +
          I +
          " :||",
      ],
      "Ternary (ABA)": [
        "A (" + b + " bars): " + I + ", closes with a PAC in " + I,
        "B (" + b + " bars): " + contrast + ", new theme and texture, ends on a half cadence (retransition)",
        "A (" + b + " bars): the whole of A again, PAC in " + I,
      ],
    }[form];
    return {
      topic: "theory",
      kind: "Form",
      q: "Which form does this chart describe?\n" + rows.join("\n"),
      ...mc(r, form, Object.keys(FORMS), 4),
      explain: form + ": " + FORMS[form] + ".",
    };
  };

  // Fugue analysis (CAGO C11, AAGO A9): the answer's key, or real vs tonal from the written answer.
  D.fugueEntry = function (r) {
    const sub = r.pick(Gen.SUBJECTS);
    const key = Gen.randomKey(r, { mode: sub.mode, maxAcc: 3 });
    const { subj, ans, tonal } = Gen.answerFor(sub, key);
    const abc = H.renderABC({
      key,
      meter: "4/4",
      staves: [
        { clef: "treble", name: "Subject", voices: [{ id: "S", events: subj }] },
        { clef: "treble", name: "Answer", voices: [{ id: "A", events: ans }] },
      ],
    });
    if (r.chance(0.5)) {
      const dk = T.dominantKey(key);
      return {
        topic: "fugue",
        kind: "Fugue",
        q: "The subject is in " + T.keyShort(key) + ". In which key does the answer enter?",
        abc,
        ...mc(
          r,
          T.keyShort(dk),
          [
            T.keyShort(T.subdominantKey(key)),
            T.keyShort(key),
            T.keyShort(key.mode === "minor" ? T.relMajor(key) : T.relMinor(key)),
          ],
          4,
        ),
        explain: "The answer enters in the dominant, " + T.keyShort(dk) + ", a 5th above (or 4th below) the tonic.",
      };
    }
    return {
      topic: "fugue",
      kind: "Fugue",
      q: "Is this answer real or tonal?",
      abc,
      ...mc(r, tonal ? "Tonal" : "Real", ["Tonal", "Real"], 2),
      explain: tonal
        ? "Some notes of the head are answered a 4th up instead of a 5th (^5 answered by ^1), so it is tonal."
        : "Every note is a perfect 5th higher (or 4th lower), so it is a real answer.",
    };
  };

  // First-species counterpoint (FAGO F7): is the move from bar 1 to bar 2 allowed?
  const SPECIES = [
    "Allowed",
    "Parallel fifths",
    "Parallel octaves",
    "Similar motion into a perfect consonance",
    "Dissonant interval",
  ];
  D.speciesMotion = function (r) {
    const key = Gen.randomKey(r, { mode: "major", maxAcc: 3 });
    const sig = T.keySig(key);
    const at = (d) => {
      const x = T.fromDia(d, 0);
      x.a = sig[x.L];
      return x;
    };
    const want = r.pick(SPECIES);
    const kindOf = (lo, hi) => {
      const s = (((T.midi(hi) - T.midi(lo)) % 12) + 12) % 12;
      if (s === 0) return "P8";
      if (s === 7) return "P5";
      if ([3, 4, 8, 9].includes(s)) return "imp";
      return "dis";
    };
    for (let tries = 0; tries < 400; tries++) {
      const l1 = at(T.dia({ ...key.t, o: 3 }) + r.int(5));
      const l2 = at(T.dia(l1) + r.pick([-2, -1, 1, 2]));
      const u1 = at(T.dia(l1) + r.pick([2, 4, 5, 7, 9]));
      const u2 = at(T.dia(l2) + r.pick([2, 3, 4, 5, 6, 7, 9, 11]));
      const k1 = kindOf(l1, u1),
        k2 = kindOf(l2, u2);
      if (k1 === "dis") continue;
      const m1 = Math.sign(T.midi(l2) - T.midi(l1)),
        m2 = Math.sign(T.midi(u2) - T.midi(u1));
      const similar = m1 !== 0 && m1 === m2;
      const got =
        k2 === "dis"
          ? "Dissonant interval"
          : similar && k1 === "P5" && k2 === "P5"
            ? "Parallel fifths"
            : similar && k1 === "P8" && k2 === "P8"
              ? "Parallel octaves"
              : similar && (k2 === "P5" || k2 === "P8")
                ? "Similar motion into a perfect consonance"
                : "Allowed";
      if (got !== want) continue;
      return {
        topic: "counterpoint",
        kind: "Species counterpoint",
        q: "First species, " + T.keyShort(key) + ": is the move from the first to the second interval allowed?",
        abc: twoStaves(
          key,
          [
            { n: u1, dur: 8 },
            { n: u2, dur: 8 },
          ],
          [
            { n: l1, dur: 8 },
            { n: l2, dur: 8 },
          ],
        ),
        audio: audioOf(
          key,
          [
            [
              { n: l1, dur: 8 },
              { n: l2, dur: 8 },
            ],
            [
              { n: u1, dur: 8 },
              { n: u2, dur: 8 },
            ],
          ],
          60,
        ),
        ...mc(r, want, SPECIES, 4),
        explain:
          want === "Allowed"
            ? "Both intervals are consonant and the move breaks no rule of first species."
            : want === "Dissonant interval"
              ? "First species uses only consonances (unison, 3rds, perfect 5th, 6ths, octave); the second interval is dissonant."
              : want === "Similar motion into a perfect consonance"
                ? "A perfect 5th or octave may be approached only by contrary or oblique motion (a hidden or direct " +
                  (k2 === "P5" ? "5th" : "octave") +
                  ")."
                : "Two perfect " +
                  (want === "Parallel fifths" ? "5ths" : "octaves") +
                  " in a row in similar motion are forbidden.",
      };
    }
    throw new Error("no species example for " + want);
  };

  // Lowest sounding notes (Adler, The Study of Orchestration)
  const RANGE = [
    ["Flute", { L: 0, a: 0, o: 4 }],
    ["Oboe", { L: 6, a: -1, o: 3 }],
    ["Clarinet in B♭", { L: 1, a: 0, o: 3 }],
    ["Bassoon", { L: 6, a: -1, o: 1 }],
    ["Trumpet in B♭", { L: 2, a: 0, o: 3 }],
    ["Tenor trombone", { L: 2, a: 0, o: 2 }],
    ["Violin", { L: 4, a: 0, o: 3 }],
    ["Viola", { L: 0, a: 0, o: 3 }],
    ["Cello", { L: 0, a: 0, o: 2 }],
    ["Double bass", { L: 2, a: 0, o: 1 }],
  ];
  D.instrumentRange = function (r) {
    if (r.chance(0.5)) {
      const [inst, low] = r.pick(RANGE);
      return {
        topic: "orchestration",
        kind: "Orchestration",
        q: "What is the lowest sounding note of the " + inst.toLowerCase() + " (standard range)?",
        ...mc(
          r,
          T.name(low, true),
          RANGE.map((x) => T.name(x[1], true)),
          4,
        ),
        explain: "The " + inst.toLowerCase() + " goes down to " + T.name(low, true) + " (middle C = C4).",
      };
    }
    for (;;) {
      const n = r.pick(RANGE)[1];
      const cant = RANGE.filter((x) => T.midi(x[1]) > T.midi(n));
      const can = RANGE.filter((x) => T.midi(x[1]) <= T.midi(n));
      if (!cant.length || can.length < 3) continue;
      const [inst, low] = r.pick(cant);
      return {
        topic: "orchestration",
        kind: "Orchestration",
        q: "Which of these instruments cannot play this sounding pitch?",
        abc: oneNote(T.mkKey("C", 0, "major"), n, T.midi(n) < 60 ? "bass" : "treble"),
        ...mc(
          r,
          inst,
          can.map((x) => x[0]),
          4,
        ),
        explain:
          "The note is " +
          T.name(n, true) +
          "; the " +
          inst.toLowerCase() +
          " goes down only to " +
          T.name(low, true) +
          ".",
      };
    }
  };

  // Where each drill's answer comes from (the rule it applies) and which 2027 exam items it supports.
  const KPA = "Kostka, Payne & Almén, Tonal Harmony (8th ed., 2018)";
  const SRC = {
    keySignature: {
      rule: KPA + ", key signatures and the circle of fifths",
      items: "SPC S2; CAGO C7; AAGO A5; FAGO F5 (transposition)",
    },
    interval: { rule: KPA + ", intervals", items: "CAGO C9; AAGO A10 (dictation)" },
    figuredToRoman: {
      rule: KPA + ", figured bass and inversions; F. T. Arnold, The Art of Accompaniment from a Thorough-Bass (1931)",
      items: "CAGO C12; AAGO A7 (continuo realization)",
    },
    clefReading: {
      rule: 'Grove Music Online, s.v. "Clef"; R. O. Morris & H. Ferguson, Preparatory Exercises in Score Reading (1931)',
      items: "FAGO F3 (clef reading)",
    },
    transposeKey: {
      rule: KPA + ", key signatures; transposition by interval",
      items: "SPC S2; CAGO C7; AAGO A5; FAGO F5 (transposition)",
    },
    keyRelations: {
      rule: KPA + ", closely related keys and modulation",
      items: "CAGO C8; AAGO A2 (modulating improvisation and interludes)",
    },
    chantMode: {
      rule: 'Grove Music Online, s.v. "Mode" §II (finals and dominants of the eight modes); Liber Usualis (1961)',
      items: "ChM Ch5 (Gregorian chant)",
    },
    mutation: {
      rule: "Stevens Irwin, Dictionary of Pipe Organ Stops (2nd ed., 1983): pitch of a rank = 8′ ÷ harmonic number",
      items: "AAGO A11 (aural perception: registration)",
    },
    orchestral: {
      rule: "Samuel Adler, The Study of Orchestration (4th ed., 2016), transposing instruments",
      items: "FAGO F11 (orchestration)",
    },
    tonalAnswer: {
      rule: "Robert Gauldin, A Practical Approach to 18th-Century Counterpoint (1988), fugal answer; Gedalge, Traité de la fugue (1901)",
      items: "CAGO C11; AAGO A9; FAGO F8 (fugue)",
    },
    earCadence: { rule: KPA + ", cadences", items: "CAGO C10; AAGO A11 (aural perception)" },
    earChord: { rule: KPA + ", triads and seventh chords", items: "CAGO C10; AAGO A11; ChM Ch3 (aural tests)" },
    earInterval: { rule: KPA + ", intervals", items: "CAGO C9; AAGO A10; FAGO F10 (dictation)" },
    nonChordTone: {
      rule: KPA + ", non-chord tones (passing, neighbor, appoggiatura, escape, anticipation, suspension)",
      items: "CAGO C10, C13; AAGO A8, A11 (analysis, aural perception)",
    },
    suspensionType: {
      rule: KPA + ", suspensions (4–3, 7–6, 9–8, 2–3)",
      items: "AAGO A8, A11 (analysis; aural perception asks the suspension type)",
    },
    missingTone: { rule: KPA + ", melodic and two-part dictation", items: "CAGO C9; AAGO A10 (two-part dictation)" },
    formType: {
      rule: KPA + ", binary and ternary forms; William E. Caplin, Classical Form (1998)",
      items: "CAGO C13; AAGO A8 (composition analysis)",
    },
    fugueEntry: {
      rule: "Robert Gauldin, A Practical Approach to 18th-Century Counterpoint (1988), the fugal exposition",
      items: "CAGO C11; AAGO A9; FAGO F8 (fugue)",
    },
    speciesMotion: {
      rule: "Knud Jeppesen, Counterpoint (1939), first species; Fux, Gradus ad Parnassum (1725)",
      items: "FAGO F7 (16th-century counterpoint)",
    },
    instrumentRange: {
      rule: "Samuel Adler, The Study of Orchestration (4th ed., 2016), instrument ranges",
      items: "FAGO F11 (orchestration)",
    },
  };
  for (const k of Object.keys(SRC)) {
    const f = D[k];
    D[k] = function (r) {
      const q = f(r);
      q.src = SRC[k].rule;
      q.trains = SRC[k].items;
      return q;
    };
  }

  const api = { D, MODES, SRC };
  root.Drills = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
