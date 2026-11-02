/* Exercise generators for every 2027 exam item that can be produced fresh.
 * Each generator returns { title, prompt, scores:[{abc, caption}], solution:{text, scores}, audio?, notes? } */
(function (root) {
  "use strict";
  const T = root.Theory, H = root.Harmony;

  // ---------- helpers ----------
  function randomKey(r, opts) {
    opts = opts || {};
    const mode = opts.mode || (r.chance(opts.minorP == null ? 0.4 : opts.minorP) ? "minor" : "major");
    const list = T.KEY_LIST[mode].filter(([l, a]) => { const k = T.mkKey(l, a, mode); return Math.abs(T.sigCount(k)) <= (opts.maxAcc == null ? 4 : opts.maxAcc); });
    const [l, a] = r.pick(list);
    return T.mkKey(l, a, mode);
  }
  function passage(r, key, plan, meter) {
    for (let i = 0; i < 6; i++) { const p = H.makePassage({ seed: r, key, phrases: plan, meter }); if (p) return p; }
    throw new Error("could not voice passage");
  }
  function grandStaff(events, opts) {
    opts = opts || {};
    return [
      { clef: "treble", voices: [{ id: "S", events: events[3], stem: "up" }, { id: "A", events: events[2], stem: "down" }] },
      { clef: "bass", voices: [{ id: "T", events: events[1], stem: "up" }, { id: "B", events: events[0], stem: "down" }] }
    ];
  }
  function render(key, meter, staves, extra) { return H.renderABC(Object.assign({ key, meter, staves, brace: staves.length === 2 && !(extra && extra.noBrace) }, extra || {})); }
  function planFor(r, nPhrases, opts) {
    opts = opts || {};
    const plans = {
      1: [[{ cadence: "PAC" }]],
      2: [[{ cadence: "HC" }, { cadence: "PAC" }], [{ cadence: "IAC" }, { cadence: "PAC" }], [{ cadence: "DC" }, { cadence: "PAC" }]],
      3: [[{ cadence: "HC" }, { cadence: "DC" }, { cadence: "PAC" }], [{ cadence: "IAC" }, { cadence: "HC" }, { cadence: "PAC" }]],
      4: [[{ cadence: "HC" }, { cadence: "PAC" }, { cadence: "DC" }, { cadence: "PAC" }], [{ cadence: "IAC" }, { cadence: "HC" }, { cadence: "DC" }, { cadence: "PAC" }]]
    };
    return r.pick(plans[nPhrases]).map((p) => Object.assign({}, p));
  }
  // modulating plan: phrase 2 cadences in the dominant (major) or relative major (minor)
  function modulatingPlan(r, key) {
    const target = key.mode === "major" ? T.dominantKey(key) : T.relMajor(key);
    const pivot = key.mode === "major" ? r.pick(["IV", "vi"]) : r.pick(["vi", "IV"]);
    const label = key.mode === "major" ? (pivot === "IV" ? "pivot: I in " + T.keyShort(key) + " = IV in " + T.keyShort(target) : "pivot: iii in " + T.keyShort(key) + " = vi in " + T.keyShort(target))
      : (pivot === "vi" ? "pivot: i in " + T.keyShort(key) + " = vi in " + T.keyShort(target) : "pivot: VI in " + T.keyShort(key) + " = IV in " + T.keyShort(target));
    return { plan: [{ cadence: "HC" }, { cadence: "PAC", key: target, pivot, pivotLabel: label }, { cadence: "PAC" }], target };
  }
  function analysisText(p) {
    const lines = [];
    let ph = -1, cur = [];
    p.chords.forEach((c) => {
      if (c.phrase !== ph) { if (cur.length) lines.push(cur.join(" – ")); cur = []; ph = c.phrase; }
      cur.push(c.sym + (c.pivot ? " [" + c.pivot + "]" : "") + (c.cadence ? " (" + c.cadence + (c.key !== p.key ? " in " + T.keyShort(c.key) : "") + ")" : ""));
    });
    if (cur.length) lines.push(cur.join(" – "));
    return lines.map((l, i) => "Phrase " + (i + 1) + ": " + l).join("\n");
  }

  // transposition key choice: allow enharmonic re-spelling to the simpler key
  function transposeChoice(key, semis) {
    const cands = [];
    for (let ds = -3; ds <= 3; ds++) {
      const k = T.transposeKey(key, ds, semis);
      if (Math.abs(k.t.a) > 1) continue;
      cands.push({ ds, k, acc: Math.abs(T.sigCount(k)) });
    }
    const base = Math.round(semis * 7 / 12);
    cands.sort((a, b) => (a.acc - b.acc) || (Math.abs(a.ds - base) - Math.abs(b.ds - base)));
    return cands[0];
  }
  function transposeEvents(events, ds, semis) { return events.map((v) => v.map((e) => Object.assign({}, e, { n: e.n ? T.transposeNote(e.n, ds, semis) : null }))); }

  // events -> audio notes
  function audioFrom(eventsByVoice, tempo, which) {
    const spb = 60 / (tempo || 80) / 2; // seconds per eighth
    const notes = [];
    eventsByVoice.forEach((list, vi) => {
      if (which && !which.includes(vi)) return;
      let t = 0;
      list.forEach((e) => { if (e.n) notes.push({ midi: T.midi(e.n), start: t * spb, dur: e.dur * spb * 0.96, voice: vi }); t += e.dur; });
    });
    return { notes, tempo };
  }

  // ---------- keyboard & written generators ----------
  const G = {};

  G.sightReadGrand = function (r, o) { // SPC S8
    const key = randomKey(r, { maxAcc: 3 });
    const meter = r.pick(["4/4", "3/4"]);
    const p = passage(r, key, planFor(r, 2), meter);
    const ev = H.toEvents(p, 0.3, r);
    return { title: "Sight-reading", prompt: o.prompt || "Play at sight on manuals, with pedal optional. " + T.keyShort(key) + ".",
      scores: [{ abc: render(key, meter, grandStaff(ev)) }], audio: audioFrom(ev, 72) };
  };

  G.sightReadTrio = function (r, o) { // CAGO C5, FAGO F2
    const key = randomKey(r, { maxAcc: o.maxAcc || 3 });
    const meter = r.pick(["4/4", "3/4"]);
    const p = passage(r, key, planFor(r, o.phrases || 2), meter);
    const ev = H.toEvents(p, 0.55, r);
    const staves = [
      { clef: "treble", name: "Man. I", voices: [{ id: "RH", events: ev[3] }] },
      { clef: "bass", name: "Man. II", voices: [{ id: "LH", events: ev[1] }] },
      { clef: "bass", name: "Ped.", voices: [{ id: "P", events: ev[0] }] }
    ];
    const tempo = r.pick([60, 66, 72, 76]);
    return { title: "Trio sight-reading", prompt: (o.prompt || "Sight-read this trio texture: right hand, left hand, and pedal on separate staves.") + " Tempo ♩ = " + tempo + ". Choose a registration that separates the two manual lines.",
      scores: [{ abc: render(key, meter, staves, { bracket: true }) }], audio: audioFrom([ev[0], ev[1], [], ev[3]], tempo) };
  };

  G.openScore = function (r, o) { // AAGO A3 (G & F clefs), FAGO F3 (C & F clefs)
    const key = randomKey(r, { maxAcc: 4 });
    const meter = r.pick(["4/4", "3/4"]);
    const p = passage(r, key, planFor(r, 3), meter);
    const ev = H.toEvents(p, 0.45, r);
    const clefs = o.cClefs ? ["alto1", "alto", "tenor", "bass"] : ["treble", "treble", "bass", "bass"];
    const names = ["S", "A", "T", "B"];
    const staves = [3, 2, 1, 0].map((vi, i) => ({ clef: clefs[i], name: names[i], voices: [{ id: names[i] + "v", events: ev[vi] }] }));
    const clefNote = o.cClefs ? "Soprano clef, alto clef, tenor clef, and bass clef." : "Soprano and alto in treble clef, tenor and bass in bass clef.";
    return { title: o.cClefs ? "Clef reading" : "Open-score sight-reading",
      prompt: "Play this four-part passage from open score at sight. " + clefNote + " Pedal by coupler is optional.",
      scores: [{ abc: render(key, meter, staves, { bracket: true }) }], audio: audioFrom(ev, 72),
      solution: { text: "Key: " + T.keyShort(key) + "\n" + analysisText(p) } };
  };

  G.transposition = function (r, o) { // CAGO C7, AAGO A5, FAGO F5
    const key = randomKey(r, { maxAcc: 3 });
    const meter = r.pick(["4/4", "3/4"]);
    const p = passage(r, key, planFor(r, o.phrases || 2), meter);
    const ev = H.toEvents(p, o.embellish == null ? 0.25 : o.embellish, r);
    const choices = o.intervals; // [[label, semis]]
    const picks = r.shuffle(choices).slice(0, o.count || 2);
    const outs = picks.map(([label, semis]) => { const c = transposeChoice(key, semis); return { label, ...c }; });
    const sol = outs.map((x) => ({ abc: render(x.k, meter, grandStaff(transposeEvents(ev, x.ds, semisOf(x)))), caption: x.label + " → " + T.keyShort(x.k) }));
    function semisOf(x) { return picks.find((p2) => p2[0] === x.label)[1]; }
    return { title: "Transposition", prompt: "Transpose this passage " + outs.map((x) => x.label).join(", then ") + ". " + (o.pedal ? "Use pedals." : "Pedal optional.") + " You may play it once in the original key first.",
      scores: [{ abc: render(key, meter, grandStaff(ev)), caption: "Original: " + T.keyShort(key) }],
      solution: { text: outs.map((x) => x.label + ": " + T.keyShort(x.k)).join("\n"), scores: sol }, audio: audioFrom(ev, 76) };
  };

  G.figuredBass = function (r, o) { // CAGO C12 (written), AAGO A7 (played)
    const key = randomKey(r, { maxAcc: 4, minorP: 0.5 });
    const meter = r.pick(["4/4", "3/4", "4/4"]);
    const p = passage(r, key, planFor(r, o.phrases || 2), meter);
    const sig = T.keySig(key);
    const ev = H.toEvents(p, 0, r);
    const bass = ev[0].map((e, i) => Object.assign({}, e, { ann: H.figures(p.chords[i], e.n, sig) }));
    const prompt = o.written
      ? "Realize the figured bass in writing: mostly three-voice right-hand chords above the given bass, following common-practice voice leading."
      : "Realize this figured bass at the organ (chorale or short instrumental movement). Pedals optional.";
    const staves = [{ clef: "treble", voices: [{ id: "RH", events: ev[3].map((e) => Object.assign({}, e, { hidden: true })) }] }, { clef: "bass", voices: [{ id: "BC", events: bass }] }];
    const solStaves = grandStaff(ev);
    solStaves[1].voices[1].events = bass;
    return { title: "Figured bass", prompt, scores: [{ abc: render(key, meter, staves) }],
      solution: { text: "One correct realization (others are possible).\n" + analysisText(p), scores: [{ abc: render(key, meter, solStaves) }] }, audio: audioFrom(ev, 76) };
  };

  G.harmonize = function (r, o) { // AAGO A4: melody part + unfigured bass part; CAGO C6 / ChM melody only
    const key = randomKey(r, { maxAcc: 4, minorP: 0.35 });
    const meter = r.pick(["4/4", "3/4"]);
    const p = passage(r, key, planFor(r, o.phrases || 2), meter);
    const ev = H.toEvents(p, 0, r);
    const nPh = p.phrases.length;
    const split = o.mixed ? Math.ceil(nPh / 2) : nPh; // phrases [0, split) melody-only; [split, n) bass-only
    const hide = (list, keep) => list.map((e) => Object.assign({}, e, { hidden: !keep(e) }));
    const ph = (e) => p.chords[e.ci].phrase;
    const S = hide(ev[3], (e) => ph(e) < split), B = hide(ev[0], (e) => ph(e) >= split);
    const staves = [{ clef: "treble", voices: [{ id: "S", events: S }] }, { clef: "bass", voices: [{ id: "B", events: B }] }];
    const prompt = o.mixed
      ? "Harmonize in four parts, continuously. Phrase 1 gives the melody (treble); the rest gives an unfigured bass. Pedals optional."
      : (o.prompt || "Harmonize this melody in four parts at the keyboard. Pedals optional.");
    return { title: "Harmonization", prompt, scores: [{ abc: render(key, meter, staves) }],
      solution: { text: "One solution (others are possible).\n" + analysisText(p), scores: [{ abc: render(key, meter, grandStaff(ev)) }] }, audio: audioFrom(ev, 76) };
  };

  G.progressions = function (r) { // ChM Ch2
    const items = [];
    const out = [];
    for (let i = 0; i < 3; i++) {
      const key = randomKey(r, { maxAcc: 4, minorP: 0.4 });
      const p = passage(r, key, [{ cadence: r.pick(["PAC", "PAC", "HC", "DC"]) }], "4/4");
      items.push(T.keyShort(key) + ":  " + p.chords.map((c) => c.sym).join(" – "));
      const ev = H.toEvents(p, 0, r);
      out.push({ abc: render(key, "4/4", grandStaff(ev)), caption: T.keyShort(key) });
    }
    return { title: "Harmonic progressions", prompt: "Play each progression in four parts at the piano or organ, with smooth voice leading:\n" + items.join("\n"), scores: [],
      solution: { text: "One voicing of each:", scores: out } };
  };

  // ---- dictation ----
  G.dictation = function (r, o) { // C9 (two-part missing tones), A10 (melody + two-part), F10 (four-part + two-part), Ch3 (two-part)
    const key = randomKey(r, { maxAcc: 3, minorP: 0.35 });
    const meter = r.pick(["4/4", "3/4"]);
    const p = passage(r, key, planFor(r, o.phrases || 1), meter);
    const ev = H.toEvents(p, o.embellish == null ? 0.4 : o.embellish, r);
    const tempo = o.tempo || 72;
    let staves, solStaves, which;
    if (o.kind === "melody") {
      staves = [{ clef: "treble", voices: [{ id: "S", events: ev[3].map((e, i) => Object.assign({}, e, { hidden: i > 0 })) }] }];
      solStaves = [{ clef: "treble", voices: [{ id: "S", events: ev[3] }] }];
      which = [3];
    } else if (o.kind === "four") {
      staves = grandStaff(ev.map((v) => v.map((e, i) => Object.assign({}, e, { hidden: !(i === 0) })))); solStaves = grandStaff(ev); which = [0, 1, 2, 3];
    } else { // two-part (outer voices); "missing" hides about half
      const miss = o.missing;
      const hideFn = (e, i) => (miss ? (i > 0 && r.chance(0.5)) : i > 0);
      staves = [{ clef: "treble", voices: [{ id: "S", events: ev[3].map((e, i) => Object.assign({}, e, { hidden: hideFn(e, i) })) }] },
        { clef: "bass", voices: [{ id: "B", events: ev[0].map((e, i) => Object.assign({}, e, { hidden: hideFn(e, i) })) }] }];
      solStaves = [{ clef: "treble", voices: [{ id: "S", events: ev[3] }] }, { clef: "bass", voices: [{ id: "B", events: ev[0] }] }];
      which = [0, 3];
    }
    return { title: "Aural dictation", prompt: (o.prompt || "Notate what you hear.") + " Play the tonic chord, then the excerpt four times, with 45 seconds between playings. ♩ = " + tempo + ".",
      scores: [{ abc: render(key, meter, staves) }], audio: audioFrom(ev, tempo, which), playTonic: key, repeats: 4,
      solution: { text: "Key: " + T.keyShort(key), scores: [{ abc: render(key, meter, solStaves) }] } };
  };

  G.errorDetection = function (r) { // ChM Ch3 part 2
    const key = randomKey(r, { maxAcc: 3, minorP: 0.3 });
    const p = passage(r, key, planFor(r, 2), "4/4");
    const ev = H.toEvents(p, 0, r);
    const shown = ev.map((v) => v.map((e) => Object.assign({}, e)));
    const errs = [];
    const nErr = 3;
    const used = new Set();
    while (errs.length < nErr) {
      const vi = r.int(4), i = 1 + r.int(shown[vi].length - 2);
      if (used.has(i)) continue;
      used.add(i);
      const e = shown[vi][i];
      const dir = r.chance(0.5) ? 1 : -1;
      const nd = T.fromDia(T.dia(e.n) + dir * (r.chance(0.7) ? 1 : 2), 0);
      const k = p.chords[e.ci].key; const deg = ((nd.L - k.t.L) % 7 + 7) % 7; nd.a = T.degreePC(k, deg).a;
      const bar = Math.floor(shown[vi].slice(0, i).reduce((s, x) => s + x.dur, 0) / 8) + 1;
      const beat = Math.floor((shown[vi].slice(0, i).reduce((s, x) => s + x.dur, 0) % 8) / 2) + 1;
      errs.push({ voice: ["bass", "tenor", "alto", "soprano"][vi], bar, beat, printed: T.name(nd, 1), played: T.name(e.n, 1) });
      e.n = nd;
    }
    errs.sort((a, b) => a.bar - b.bar || a.beat - b.beat);
    return { title: "Error detection", prompt: "The printed hymn-style passage contains three errors. Listen (four playings) and circle each note that differs from what is played.",
      scores: [{ abc: render(key, "4/4", grandStaff(shown)) }], audio: audioFrom(ev, 69), playTonic: key, repeats: 4,
      solution: { text: errs.map((e) => "Bar " + e.bar + ", beat " + e.beat + ", " + e.voice + ": printed " + e.printed + ", played " + e.played).join("\n"), scores: [{ abc: render(key, "4/4", grandStaff(ev)) }] } };
  };

  // ---- aural perception (auto-graded) ----
  G.auralPerception = function (r) {
    const key = randomKey(r, { maxAcc: 3, minorP: 0.4 });
    const meter = r.pick(["4/4", "3/4"]);
    const plan = planFor(r, 2);
    const p = passage(r, key, plan, meter);
    const ev = H.toEvents(p, 0.35, r);
    const first = p.phrases[0].cadence;
    const qs = [
      { q: "What is the meter?", choices: ["4/4", "3/4"], answer: meter === "4/4" ? 0 : 1 },
      { q: "Mode of the excerpt?", choices: ["Major", "Minor"], answer: key.mode === "major" ? 0 : 1 },
      { q: "Cadence at the end of the first phrase?", choices: ["Perfect authentic", "Imperfect authentic", "Half", "Deceptive"], answer: ["PAC", "IAC", "HC", "DC"].indexOf(first) }
    ];
    return { title: "Aural perception", prompt: "Listen three or four times, then answer. (Generated chorale texture; the exam uses recorded organ music.)", scores: [],
      audio: audioFrom(ev, 76), playTonic: null, quiz: qs, repeats: 4,
      solution: { text: "Key: " + T.keyShort(key) + ", meter " + meter + "\n" + analysisText(p), scores: [{ abc: render(key, meter, grandStaff(ev)) }] } };
  };

  // ---- fugue ----
  // subject tokens: degree[#|b][+|-]:eighths  (# raise in minor, + / - octave)
  const SUBJECTS = [
    { mode: "major", s: "1:2 3:2 5:2 4:1 3:1 2:1 3:1 4:1 2:1 7-:2 1:2" },
    { mode: "major", s: "5:2 1+:2 7:1 6:1 5:1 4:1 3:2 4:1 3:1 2:2 1:2" },
    { mode: "major", s: "1:3 2:1 3:1 4:1 5:2 3:1 1:1 6:2 5:1 4:1 3:2" },
    { mode: "major", s: "5:4 6:1 5:1 4:1 3:1 2:2 5:2 1:2 7-:1 6-:1 7-:2" },
    { mode: "major", s: "1:1 2:1 3:1 1:1 5:2 5-:2 6-:1 7-:1 1:1 2:1 3:2 2:2" },
    { mode: "major", s: "1:2 5:3 4:1 3:1 2:1 1:1 7-:1 1:2 2:1 3:1 4:2 3:2" },
    { mode: "minor", s: "1:2 5:2 6:3 5:1 4:1 3:1 2:1 1:1 7#-:2 1:2" },
    { mode: "minor", s: "5:2 1+:2 7#:1 6:1 7#:2 1+:4 5:1 4:1 3:2" },
    { mode: "minor", s: "1:3 7#-:1 1:2 3:2 2:2 1:1 7#-:1 1:2 5-:2" },
    { mode: "minor", s: "1:2 3:2 2:1 1:1 7#-:1 1:1 2:2 5-:2 6-:2 5-:2" },
    { mode: "minor", s: "5:2 6:2 5:2 4:2 3:3 2:1 1:2 7#-:2 1:4" },
    { mode: "minor", s: "1:1 2:1 3:1 4:1 5:2 6:2 2:2 7#-:3 1:1 1:2" }
  ];
  function parseTokens(s) {
    return s.split(/\s+/).map((tok) => {
      const m = /^(\d)(#|b)?([+-]*):(\d+)$/.exec(tok);
      const oct = (m[3].match(/\+/g) || []).length - (m[3].match(/-/g) || []).length;
      return { deg: parseInt(m[1], 10) - 1, alt: m[2] || "", oct, dur: parseInt(m[4], 10) };
    });
  }
  function realize(tokens, key, baseOct) {
    return tokens.map((t) => {
      const pc = T.degreePC(key, t.deg, { raise7: t.alt === "#" && t.deg === 6, raise6: t.alt === "#" && t.deg === 5 });
      if (t.alt === "b") pc.a -= 1;
      const tonicDia = (key.t.L >= 5 ? baseOct - 1 : baseOct) * 7 + key.t.L;
      const d = tonicDia + t.deg + t.oct * 7;
      return { n: { L: pc.L, a: pc.a, o: Math.floor(d / 7) }, dur: t.dur };
    });
  }
  function answerFor(sub, key) {
    // head = leading run of ^1 / ^5 tokens
    const toks = parseTokens(sub.s);
    let headLen = 0; while (headLen < toks.length && (toks[headLen].deg === 0 || toks[headLen].deg === 4) && !toks[headLen].alt) headLen++;
    const tonal = toks.slice(0, headLen).some((t) => t.deg === 4);
    const dk = T.dominantKey(key);
    const subj = realize(toks, key, 4);
    const ans = toks.map((t, i) => {
      if (i < headLen && t.deg === 4) { // ^5 answered by ^1 (a 4th above)
        const n = subj[i].n; return { n: T.transposeNote(n, 3, 5), dur: t.dur };
      }
      return realize([t], dk, 4)[0];
    });
    // keep answer register sensible: shift so it begins within a 5th above/4th below the subject start
    return { subj, ans, tonal };
  }
  G.fugue = function (r, o) {
    const sub = r.pick(SUBJECTS);
    const key = randomKey(r, { mode: sub.mode, maxAcc: 3 });
    const { subj, ans, tonal } = answerFor(sub, key);
    const voices = o.voices || 3;
    const vnames = voices === 4 ? ["soprano", "alto", "tenor", "bass"] : ["soprano", "alto", "bass"];
    const startVoice = r.pick(vnames);
    const one = (evs, clef) => H.renderABC({ key, meter: "4/4", staves: [{ clef: clef || "treble", voices: [{ id: "X", events: evs }] }] });
    const shift = (evs, oct) => evs.map((e) => ({ n: { L: e.n.L, a: e.n.a, o: e.n.o + oct }, dur: e.dur }));
    const clefFor = (v) => (v === "bass" || v === "tenor" ? "bass" : "treble");
    const octFor = (v) => (v === "bass" ? -1 : v === "tenor" ? -1 : 0);
    let prompt = "Write the exposition of a " + voices + "-voice fugue on this subject in " + T.keyShort(key) + ", with a consistent countersubject" + (voices === 4 ? " in invertible counterpoint" : "") + ". The subject begins in the " + startVoice + ".";
    if (o.episode) prompt += " Then write an episode leading to an entry in a related key.";
    if (o.analysis) prompt = "Fugue analysis: name the key, say whether the answer should be tonal or real, and give the first note of the answer. Then sketch the answer.";
    return { title: o.analysis ? "Fugue analysis" : "Fugue", prompt, scores: [{ abc: one(shift(subj, octFor(startVoice)), clefFor(startVoice)), caption: "Subject" }],
      solution: { text: "Answer: " + (tonal ? "tonal (the opening ^5 is answered by ^1, so the answer starts by keeping the tonic's 4th instead of moving to ^2)" : "real (exact transposition to the dominant)") + ".\nAnswer key region: " + T.keyShort(T.dominantKey(key)) + ".",
        scores: [{ abc: one(ans), caption: "Answer (in the dominant)" }] },
      audio: { notes: (() => { let t = 0; const spb = 60 / 84 / 2; return subj.map((e) => { const x = { midi: T.midi(e.n), start: t * spb, dur: e.dur * spb * 0.95 }; t += e.dur; return x; }); })(), tempo: 84 } };
  };

  // ---- improvisation ----
  const GROUNDS = [
    { name: "descending tetrachord (lament)", mode: "minor", meter: "3/4", s: "1:6 7b-:6 6-:6 5-:6" },
    { name: "chromatic lament", mode: "minor", meter: "3/4", s: "1:6 7-:6 7b-:6 6-:6 6b-:6 5-:6" },
    { name: "passacaglia", mode: "minor", meter: "3/4", s: "1:4 7b-:2 6-:4 5-:2 4-:4 5-:2 1-:6" },
    { name: "chaconne (major)", mode: "major", meter: "3/4", s: "1:6 5-:6 6-:6 3-:6 4-:6 1-:6 4-:6 5-:6" },
    { name: "folia-type", mode: "minor", meter: "3/4", s: "1:6 5-:6 1:6 7b-:6 3:6 7b-:6 1:4 5-:2 5-:6" },
    { name: "bergamasca", mode: "major", meter: "4/4", s: "1:2 4:2 5:2 1:2" },
    { name: "walking ground", mode: "major", meter: "4/4", s: "1:2 3:2 4:2 5:2 6:2 4:2 5:2 5-:2 1:8" },
    { name: "minor ground", mode: "minor", meter: "4/4", s: "1:2 3b:2 4:2 5:2 6b-:4 5-:4 1:8" }
  ];
  const HYMN_TUNES = ["OLD HUNDREDTH", "ST. ANNE", "NICAEA", "LASST UNS ERFREUEN", "HYFRYDOL", "WINCHESTER NEW", "DUKE STREET", "EIN FESTE BURG", "WACHET AUF", "LOBE DEN HERREN",
    "DIVINUM MYSTERIUM", "VENI EMMANUEL", "PICARDY", "AURELIA", "REGENT SQUARE", "WESTMINSTER ABBEY", "CWM RHONDDA", "TALLIS' CANON", "ST. THEODULPH", "EASTER HYMN", "DUNDEE", "ITALIAN HYMN", "IN BABILONE", "ABBOT'S LEIGH"];
  const CHANTS = [["Veni Creator Spiritus", "mode 8"], ["Pange lingua gloriosi", "mode 3"], ["Ave maris stella", "mode 1"], ["Victimae paschali laudes", "mode 1"], ["Ubi caritas", "mode 6"],
    ["Conditor alme siderum", "mode 4"], ["Adoro te devote", "mode 5"], ["Puer natus est", "mode 7"], ["Salve Regina (simple tone)", "mode 5"], ["Regina caeli (simple tone)", "mode 6"], ["Rorate caeli", "mode 1"], ["Lux aeterna", "mode 8"]];

  G.improv = function (r, o) {
    const kind = o.kind || r.pick(["ground", "hymn", "chant"]);
    if (kind === "ground") {
      const g = r.pick(GROUNDS);
      const key = randomKey(r, { mode: g.mode, maxAcc: 3 });
      const evs = realize(parseTokens(g.s), key, 3);
      return { title: "Improvisation: ground bass", prompt: "Improvise five or six variations over this ground bass (" + g.name + ", " + T.keyShort(key) + "). Plan a shape: thin texture first, building to a climax, with one contrasting variation (a change of figuration or manual).",
        scores: [{ abc: H.renderABC({ key, meter: g.meter, staves: [{ clef: "bass", voices: [{ id: "G", events: evs }] }] }) }],
        solution: { text: "Ideas: (1) chordal statement; (2) running eighths in the RH; (3) imitation between hands; (4) a quiet, solo-reed variation; (5) broken-chord figuration; (6) full plenum, perhaps with the ground in octaves." } };
    }
    if (kind === "hymn") {
      const t = r.pick(HYMN_TUNES);
      return { title: "Improvisation: hymn prelude", prompt: "Improvise a brief prelude on the hymn tune " + t + ". Choose a form before you start: a cantus firmus in the soprano or tenor, a trio, or a fughetta on the first phrase.", scores: [],
        solution: { text: "Check: the tune must stay recognizable; phrase ends should cadence; aim for about 1½–2½ minutes." } };
    }
    if (kind === "chant") {
      const c = r.pick(CHANTS);
      return { title: "Improvisation: chant prelude", prompt: "Improvise a brief prelude on the chant " + c[0] + " (" + c[1] + "). Keep the modal flavor: use the final and reciting tone as cadence points and avoid leading-tone cadences unless deliberate.", scores: [],
        solution: { text: "Approaches: chant as a pedal cantus firmus under flowing modal counterpoint; chant phrases in the soprano, harmonized in parallel triads or quartal sonorities; or a short versicle-style setting in the French manner." } };
    }
    if (kind === "phrases") { // CAGO C8 option 1/2
      const key = randomKey(r, { maxAcc: 3 });
      const target = key.mode === "major" ? T.dominantKey(key) : T.relMajor(key);
      const p = passage(r, key, [{ cadence: "PAC" }], "4/4");
      const motif = H.toEvents(p, 0.6, r)[3].slice(0, 5);
      const ev = motif.map((e) => Object.assign({}, e)); const used = ev.reduce((s, e) => s + e.dur, 0);
      if (used % 8) ev.push({ n: null, dur: 8 - (used % 8) });
      return { title: "Improvisation: modulating phrases", prompt: "Using this motif, improvise a 16-measure passage in two 8-measure phrases in " + T.keyShort(key) + ". The first phrase modulates to " + T.keyShort(target) + "; the second returns home. Make both cadences clear.",
        scores: [{ abc: H.renderABC({ key, meter: "4/4", staves: [{ clef: "treble", voices: [{ id: "M", events: ev }] }] }), caption: "Motif" }],
        solution: { text: "Plan: phrase 1 = motif + sequence, pivot chord into " + T.keyShort(target) + ", PAC there. Phrase 2 = motif in the new key, return via the V7 of " + T.keyShort(key) + ", PAC at home." } };
    }
    if (kind === "bridge") { // CAGO C8 option 3
      const a = randomKey(r, { mode: "major", maxAcc: 4 }); let b; do { b = randomKey(r, { mode: "major", maxAcc: 4 }); } while (T.sameClass(a.t, b.t));
      return { title: "Improvisation: hymn bridge", prompt: "Improvise a 30-second bridge from a hymn ending in " + T.keyShort(a) + " to a hymn beginning in " + T.keyShort(b) + ". End on the new key's V or V7 so a congregation can enter confidently.", scores: [],
        solution: { text: "Route: find a pivot chord common to both keys, or move by sequence through the circle of fifths, then establish " + T.keyShort(b) + "'s dominant with a clear pedal point." } };
    }
    // ternary (FAGO F6)
    const key = randomKey(r, { maxAcc: 3 });
    const p = passage(r, key, [{ cadence: "HC" }, { cadence: "PAC" }], r.pick(["4/4", "3/4"]));
    const ev = H.toEvents(p, 0.5, r);
    return { title: "Improvisation: ternary form", prompt: "Improvise a piece of 3–4 minutes in ternary form (ABA) on this theme. The B section needs a clearly identifiable secondary theme in a contrasting key and texture.",
      scores: [{ abc: H.renderABC({ key, meter: p.meter, staves: [{ clef: "treble", voices: [{ id: "M", events: ev[3] }] }] }), caption: "Theme" }],
      solution: { text: "Plan: A in " + T.keyShort(key) + " (state the theme, develop briefly); B in " + T.keyShort(key.mode === "major" ? T.relMinor(key) : T.relMajor(key)) + " or the subdominant, new registration; retransition on a dominant pedal; A shortened, with a coda." } };
  };

  // ---- composition starters ----
  G.compositionStart = function (r, o) { // AAGO A12: complete a passage
    const key = randomKey(r, { maxAcc: 3 });
    const meter = r.pick(["4/4", "3/4"]);
    const p = passage(r, key, [{ cadence: "HC" }], meter);
    const ev = H.toEvents(p, 0.6, r);
    return { title: "Composition", prompt: "Continue and conclude this organ passage in about 16 measures. Keep the style and texture consistent and write idiomatically for the instrument; develop the opening motive and cadence clearly at the end.",
      scores: [{ abc: render(key, meter, grandStaff(ev)), caption: "Given opening" }],
      solution: { text: "Self-check: does it modulate and return? Is the motive developed (sequence, inversion, fragmentation)? Are the cadences clear? Is the texture playable by two hands and feet?" } };
  };

  G.cantusFirmus = function (r) { // FAGO F7
    const finals = [["D", "Dorian"], ["E", "Phrygian"], ["G", "Mixolydian"], ["A", "Aeolian"]];
    const [fin, modeName] = r.pick(finals);
    const L0 = T.LETTERS.indexOf(fin);
    let d = 0; const line = [0];
    const len = 9 + r.int(4);
    while (line.length < len - 2) {
      const step = r.weighted([[1, 4], [-1, 4], [2, 2], [-2, 2], [3, 1], [-3, 1]]);
      const nd = d + step;
      if (nd < -2 || nd > 6) continue;
      if (Math.abs(step) >= 2 && line.length > 1 && Math.sign(line[line.length - 1] - line[line.length - 2]) === Math.sign(step) && Math.abs(line[line.length - 1] - line[line.length - 2]) >= 2) continue;
      d = nd; line.push(d);
    }
    line.push(1, 0);
    const evs = line.map((x) => ({ n: T.fromDia(4 * 7 + L0 + x - (L0 >= 5 ? 7 : 0), 0), dur: 8 }));
    const key = T.mkKey("C", 0, "major");
    return { title: "16th-century counterpoint", prompt: "Write two (or three) voices above or below this cantus firmus in the " + modeName + " mode, in the style of Palestrina: mostly stepwise, consonant downbeats, suspensions prepared and resolved, no parallel perfect intervals. Set the text \"Kyrie eleison\" with correct syllable stress.",
      scores: [{ abc: H.renderABC({ key, meter: "4/4", staves: [{ clef: "treble", voices: [{ id: "CF", events: evs }] }] }), caption: "Cantus firmus (" + modeName + ")" }],
      solution: { text: "Self-check: first and last intervals perfect; cadence via the 2–1 / 7–8 clausulae with the leading tone raised where appropriate (except in Phrygian); leaps recovered by step in the opposite direction." } };
  };

  // ---- written prompts from banks ----
  const ANALYSIS_PIECES = [
    "Mozart, Piano Sonata in C major, K. 545, first movement (sonata form)",
    "Haydn, Symphony No. 94 \"Surprise\", second movement (theme and variations)",
    "Mozart, Eine kleine Nachtmusik, K. 525, third movement (minuet and trio)",
    "Beethoven, Piano Sonata Op. 49 No. 2, first movement",
    "Beethoven, Piano Sonata Op. 2 No. 1, third movement (minuet and trio)",
    "Schumann, Album for the Young, Op. 68 No. 10 \"Fröhlicher Landmann\"",
    "Schumann, Album for the Young, Op. 68 No. 8 \"Wilder Reiter\"",
    "Chopin, Prelude in E minor, Op. 28 No. 4",
    "Chopin, Prelude in C minor, Op. 28 No. 20",
    "Brahms, Intermezzo in A major, Op. 118 No. 2 (ternary)",
    "Bach, Invention No. 1 in C major, BWV 772",
    "Bach, Invention No. 8 in F major, BWV 779",
    "Bach, Prelude in C major from The Well-Tempered Clavier I, BWV 846",
    "Schubert, \"Heidenröslein\", D. 257",
    "Haydn, Piano Sonata in C major, Hob. XVI:35, first movement",
    "Mendelssohn, Organ Sonata No. 2, Grave–Adagio"
  ];
  G.analysis = function (r, o) {
    const piece = r.pick(ANALYSIS_PIECES);
    const qs = o.level === "CAGO"
      ? ["Identify the form (binary or ternary) and chart the phrase structure.", "Mark every cadence and name its type.", "Identify the thematic material and any return.", "Name two significant harmonic features with measure numbers (e.g., a secondary dominant, a Neapolitan).", "Suggest a composer and stylistic period, giving reasons."]
      : ["Give an opinion on the composer and approximate date of composition. (2 points)", "Identify the overall form. (1 point)", "Using measure numbers, chart the main sections, tonal centers, and phrase endings, labeling cadences PAC, IAC, HC, or DC. (10–12 points)", "Provide a Roman-numeral analysis of one passage that tonicizes several keys. (9–10 points)", "Answer short questions on compositional devices (sequence, pedal point, augmented sixth, stretto) and performance markings. (3 points)"];
    return { title: "Analysis", prompt: "Score to use (IMSLP has a public-domain edition): " + piece + ". Pretend you don't know the composer; answer as on the exam:\n" + qs.map((q, i) => (i + 1) + ". " + q).join("\n"), scores: [],
      solution: { text: "Time yourself: about 70 minutes for this item at AAGO level. Check your answers against a published analysis or with a colleague." } };
  };
  const ESSAYS = [
    "Trace how orchestral imitative stops on early 20th-century American instruments shaped the repertoire written for them. Discuss at least two builders and three composers.",
    "The municipal and concert-hall organ in America, 1890–1930: who played it, what was played, and why did the culture fade?",
    "Transcriptions and original works: assess the place of orchestral transcriptions in the American symphonic organ tradition.",
    "Describe the 'American Classic' ideal and how it modified the symphonic organ. What repertoire did it seek to serve?",
    "Compare the registration demands of a Sowerby work and a late-Romantic French work on a 1920s American symphonic organ.",
    "The revival of interest in the American symphonic organ since the late 20th century: restorations, recordings, and new repertoire."
  ];
  G.essay = function (r) {
    const pick = r.shuffle(ESSAYS).slice(0, 3);
    return { title: "Essay", prompt: "2027 topic: The American Symphonic Organ: Its Development and Associated Repertoire. Choose one and write for about an hour:\n" + pick.map((e, i) => (i + 1) + ". " + e).join("\n"), scores: [],
      solution: { text: "Graders look for an argument, specific instruments with dates and builders, named repertoire, and command of terminology. Outline for 10 minutes before writing." } };
  };
  const ENSEMBLES = [
    "flute, oboe, clarinet in B♭, bassoon, horn in F, and strings",
    "2 flutes, 2 clarinets in B♭, 2 horns in F, and strings",
    "string quartet",
    "brass quintet: 2 trumpets in B♭, horn in F, trombone, tuba",
    "woodwind quintet: flute, oboe, clarinet in A, horn in F, bassoon",
    "oboe, English horn, 2 bassoons, and strings"
  ];
  G.orchestration = function (r) {
    const ens = r.pick(ENSEMBLES);
    const key = randomKey(r, { maxAcc: 3 });
    const p = passage(r, key, planFor(r, 2), "4/4");
    const ev = H.toEvents(p, 0.4, r);
    return { title: "Orchestration", prompt: "Orchestrate this keyboard passage for " + ens + ". Write transposing instruments in their written keys and stay within practical ranges.",
      scores: [{ abc: render(key, "4/4", grandStaff(ev)) }],
      solution: { text: "Check: B♭ clarinet and trumpet written a major 2nd higher; A clarinet a minor 3rd higher; F horn and English horn a perfect 5th higher; double bass an octave higher than sounding." } };
  };
  const TEXTS = ["Ubi caritas et amor, Deus ibi est.", "Ave verum corpus, natum de Maria Virgine.", "O salutaris hostia, quae caeli pandis ostium.",
    "The Lord is my shepherd: therefore can I lack nothing.", "I was glad when they said unto me: We will go into the house of the Lord.",
    "Lord, let me know mine end, and the number of my days.", "Kyrie eleison. Christe eleison. Kyrie eleison.", "Nunc dimittis servum tuum, Domine, secundum verbum tuum in pace."];
  G.choralComposition = function (r) {
    const t = r.pick(TEXTS); const v = r.pick(["SATB", "SSA", "TTBB", "SAB"]); const len = r.pick([16, 20, 24]);
    return { title: "Composition for voices", prompt: "Compose a work for unaccompanied " + v + " voices on the text: \"" + t + "\" About " + len + " measures. Imaginative, singable, with clear structure.", scores: [],
      solution: { text: "Self-check: natural word stress on strong beats; each part singable (ranges, no awkward leaps); a clear harmonic plan with at least one tonicization; a textural contrast (homophony vs. imitation)." } };
  };
  const CHM_PIECES = [["Palestrina, Sicut cervus / Sitivit anima mea", ["matching vowels on long melismas", "balancing entries so each point of imitation is heard", "tactus: conducting in a steady half-note pulse", "tuning open fifths and octaves at cadences"]],
    ["Brahms, Geistliches Lied", ["the double canon: making the canonic voices audible", "legato over long German phrases", "the final Amen: pacing the crescendo", "consonants placed together on German text"]],
    ["Britten, Jubilate Deo in C", ["rhythmic precision in syncopated entries", "crisp diction at speed", "dynamic contrast between sections", "coordinating with the accompanist"]],
    ["Finzi, I Praise the Tender Flower", ["shaping long lines in strophic verses", "intonation in close harmony", "text-led rubato", "blend in the lower parts"]],
    ["French, Tantum ergo", ["Latin vowels and ecclesiastical pronunciation", "tuning sustained chords", "phrase shape and breath planning", "dynamic control at soft levels"]]];
  G.rehearsal = function (r) {
    const [piece, issues] = r.pick(CHM_PIECES);
    const pick = r.shuffle(issues).slice(0, 2);
    return { title: "Rehearsal and direction", prompt: "The examiners ask you to rehearse a section of " + piece + " with four singers for about 8 minutes. Plan your rehearsal: what you will fix first, how you will demonstrate, and how you will check it worked. Focus areas they will listen for: " + pick.join("; ") + ".", scores: [],
      solution: { text: "Strong rehearsals: start by singing through, diagnose, fix with one specific instruction at a time, re-sing, and end with a run in context. Keep talking to a minimum and conduct the pulse clearly." } };
  };
  G.knowledge = function (r, o) { return { title: o.title || "Knowledge", prompt: "Answer from the question bank (see Daily quiz for scored practice). Topics: " + o.topics.join(", ") + ".", scores: [], factQuiz: { topics: o.topics, level: o.level, n: o.n || 8 } }; };

  // The rules each generator applies, so every exercise can cite them. The exam item it follows
  // comes from js/levels.js (AGO Professional Certification Requirements for 2027).
  const AS = "Aldwell, Schachter & Cadwallader, Harmony and Voice Leading (5th ed., 2019): four-part voice leading (no parallel 5ths/8ves, resolved leading tones and 7ths)";
  const SRC = {
    sightReadGrand: AS,
    sightReadTrio: AS + "; trio texture modeled on Bach, Trio Sonatas BWV 525–530",
    openScore: AS + "; R. O. Morris & H. Ferguson, Preparatory Exercises in Score Reading (1931)",
    transposition: AS + "; Grove Music Online, s.v. \"Transposition\"",
    figuredBass: "Figures derived from the voiced chord (" + "Kostka, Payne & Almén, Tonal Harmony, figured bass); F. T. Arnold, The Art of Accompaniment from a Thorough-Bass (1931)",
    harmonize: AS + "; Frackenpohl, Harmonization at the Piano (6th ed., 1991)",
    progressions: AS + "; Frackenpohl, Harmonization at the Piano",
    dictation: AS,
    errorDetection: AS,
    auralPerception: "Kostka, Payne & Almén, Tonal Harmony: cadences and chord functions",
    fugue: "Tonal/real answer rules: Gauldin, A Practical Approach to 18th-Century Counterpoint (1988); Gedalge, Traité de la fugue (1901)",
    improv: "Gerre Hancock, Improvising: How to Master the Art (1994); Jeffrey Brillhart, Breaking Free (2011)",
    compositionStart: AS,
    cantusFirmus: "Fux, Gradus ad Parnassum (1725), trans. Mann; Jeppesen, Counterpoint (1939)",
    analysis: "Caplin, Classical Form (1998); Kostka, Payne & Almén, Tonal Harmony",
    essay: "Topic as stated for FAGO F9 in the 2027 requirements",
    orchestration: "Samuel Adler, The Study of Orchestration (4th ed., 2016): transpositions and ranges",
    choralComposition: "Topic as stated for FAGO F12 in the 2027 requirements",
    rehearsal: "Repertoire as listed for ChM Ch1 in the 2027 requirements; " + "Collins, Teaching Choral Music (2nd ed., 1999)",
    knowledge: "See each question's source"
  };

  const api = { G, SRC, randomKey, passage, render, grandStaff, audioFrom, SUBJECTS, answerFor, parseTokens, realize, transposeChoice, GROUNDS, HYMN_TUNES, CHANTS, analysisText };
  root.Gen = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
