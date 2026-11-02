/* Four-part progression generator, SATB voicing (dynamic programming over voice-leading costs),
 * figured-bass figures, and ABC rendering. Depends on Theory. */
(function (root) {
  "use strict";
  const T = root.Theory || (typeof require !== "undefined" ? require("./theory.js") : null);

  // ---------- progression grammar (major-mode symbols; mapped for minor) ----------
  const NEXT = {
    "I": [["IV", 3], ["ii", 2], ["ii6", 3], ["vi", 3], ["V", 2], ["V6", 2], ["I6", 2], ["IV6", 1], ["vii°6", 1], ["V43", 1], ["ii65", 1]],
    "I6": [["IV", 3], ["ii6", 2], ["ii", 1], ["V", 2], ["ii65", 2], ["V43", 1]],
    "ii": [["V", 4], ["V7", 3], ["I64", 2], ["vii°6", 1]],
    "ii6": [["V", 4], ["V7", 3], ["I64", 3], ["V/V", 1]],
    "ii65": [["V", 3], ["V7", 2], ["I64", 3]],
    "iii": [["vi", 3], ["IV", 2]],
    "IV": [["V", 3], ["V7", 2], ["I", 2], ["I64", 2], ["vii°6", 1], ["V/V", 1], ["ii6", 1]],
    "IV6": [["V", 2], ["V6", 1], ["ii65", 1]],
    "V": [["I", 4], ["vi", 2], ["V7", 1], ["I6", 1]],
    "V6": [["I", 4]],
    "V7": [["I", 4], ["vi", 2]],
    "V65": [["I", 4]],
    "V43": [["I", 3], ["I6", 2]],
    "V42": [["I6", 4]],
    "vii°6": [["I", 3], ["I6", 2]],
    "vi": [["ii", 3], ["IV", 3], ["ii6", 3], ["V", 1], ["IV6", 1], ["ii65", 1], ["iii", 1]],
    "I64": [["V", 3], ["V7", 3]],
    "V/V": [["V", 3], ["I64", 1]],
    "V7/V": [["V", 3]],
    "V65/V": [["V", 3]]
  };
  const PREDOM = ["ii", "ii6", "ii65", "IV", "IV6", "V/V", "V7/V", "V65/V"];
  const MINOR_MAP = { "I": "i", "I6": "i6", "I64": "i64", "ii": "ii°", "ii6": "ii°6", "ii65": "iiø65", "iii": "III", "IV": "iv", "IV6": "iv6",
    "vi": "VI", "vii°6": "vii°6", "V/V": "V/V", "V7/V": "V7/V", "V65/V": "V65/V" };
  function modeSym(sym, mode) { return mode === "minor" ? (MINOR_MAP[sym] || sym) : sym; }
  const romanFor = modeSym;

  // Builds a phrase of n chords ending with a cadence. Returns array of major-style symbols.
  function buildPhrase(r, n, cadence, opts) {
    opts = opts || {};
    const allowMinorBad = (s) => !(opts.mode === "minor" && (s === "ii" || s === "iii")); // ii° root position avoided; skip III in walk
    for (let tries = 0; tries < 400; tries++) {
      let tail;
      if (cadence === "PAC") tail = r.pick([["ii6", "V7", "I"], ["IV", "V", "I"], ["I64", "V7", "I"], ["I64", "V", "I"], ["ii65", "V", "I"], ["ii", "V7", "I"]]);
      else if (cadence === "IAC") tail = r.pick([["IV", "V", "I"], ["ii6", "V7", "I"], ["I", "V65", "I"], ["IV", "vii°6", "I"], ["ii6", "V", "I"]]);
      else if (cadence === "HC") tail = r.pick([["I6", "ii6", "V"], ["ii6", "I64", "V"], ["IV", "I64", "V"], ["I", "IV", "V"], ["vi", "V/V", "V"], ["I", "ii6", "V"]]);
      else tail = r.pick([["ii6", "V7", "vi"], ["IV", "V", "vi"], ["I64", "V7", "vi"]]); // DC
      const head = [opts.start || "I"];
      while (head.length < n - tail.length) {
        const opts2 = (NEXT[head[head.length - 1]] || []).filter(([s]) => allowMinorBad(s) && s !== "I64");
        if (!opts2.length) break;
        head.push(r.weighted(opts2));
      }
      if (head.length !== n - tail.length) continue;
      const last = head[head.length - 1];
      if (!(NEXT[last] || []).some(([s]) => s === tail[0])) continue;
      if (!allowMinorBad(tail[0])) continue;
      // avoid immediate repeats
      const full = head.concat(tail);
      let rep = false; for (let i = 1; i < full.length; i++) if (full[i] === full[i - 1]) rep = true;
      if (rep) continue;
      return full;
    }
    return ["I", "IV", "ii6", "I64", "V", "V7", "I"].slice(-n);
  }

  // ---------- voicing ----------
  const RANGE = { B: [40, 60], T: [48, 67], A: [55, 74], S: [60, 79] };

  function notesInRange(pcs, lo, hi) {
    const out = [];
    for (let o = 1; o <= 6; o++) for (const p of pcs) { const n = { L: p.L, a: p.a, o }; const m = T.midi(n); if (m >= lo && m <= hi) out.push(n); }
    return out.sort((x, y) => T.midi(x) - T.midi(y));
  }

  function candidates(ch, ctx) {
    const tones = ch.tones;
    const bassNotes = notesInRange([ch.bassPC], RANGE.B[0], RANGE.B[1]);
    const up = { T: notesInRange(tones, RANGE.T[0], RANGE.T[1]), A: notesInRange(tones, RANGE.A[0], RANGE.A[1]), S: notesInRange(tones, RANGE.S[0], RANGE.S[1]) };
    const lt = ch.ltPC; const sev = ch.seventh ? tones[3] : null; const fifth = tones[2];
    const out = [];
    for (const b of bassNotes) for (const t of up.T) for (const a of up.A) for (const s of up.S) {
      const mb = T.midi(b), mt = T.midi(t), ma = T.midi(a), ms = T.midi(s);
      if (!(ms > ma && ma > mt && mt > mb)) continue;
      if (ms - ma > 12 || ma - mt > 12 || mt - mb > 19) continue;
      const v = [b, t, a, s];
      // completeness
      let cost = 0; let ok = true;
      for (let i = 0; i < tones.length; i++) {
        const present = v.some((n) => T.sameClass(n, tones[i]));
        if (!present) {
          if (i === 2 && (ch.seventh ? ch.inv === 0 : (ch.final && ch.inv === 0))) cost += ch.seventh ? 0.5 : 1.5; else { ok = false; break; }
        }
      }
      if (!ok) continue;
      const count = (pc) => v.filter((n) => T.sameClass(n, pc)).length;
      if (lt && count(lt) > 1) continue;
      if (sev && count(sev) > 1) continue;
      // doubling preferences
      const doubled = tones.filter((p) => count(p) >= 2);
      if (ch.cad64) { if (!T.sameClass(doubled[0] || {}, ch.bassPC)) cost += 4; }
      else if (ch.quality === "d") { if (!doubled.some((p) => T.sameClass(p, tones[1]))) cost += 1; }
      else if (!ch.seventh) {
        if (ch.inv === 0) {
          if (doubled.some((p) => T.sameClass(p, tones[0]))) cost += 0;
          else if (doubled.some((p) => T.sameClass(p, fifth))) cost += 1;
          else cost += ch.quality === "M" ? 3 : 1.2;
          if (ch.dcVi) { if (!doubled.some((p) => T.sameClass(p, tones[1]))) cost += 1; }
        } else if (ch.inv === 1) {
          if (doubled.some((p) => T.sameClass(p, ch.bassPC)) && ch.quality === "M") cost += 1;
        }
      }
      // cadence soprano constraints
      if (ch.sopTarget === "tonic" && !T.sameClass(s, ch.tonicPC)) continue;
      if (ch.sopTarget === "notTonic" && T.sameClass(s, ch.tonicPC)) continue;
      if (ch.first && !(T.sameClass(s, tones[0]) || T.sameClass(s, tones[1]) || T.sameClass(s, fifth))) cost += 1;
      // keep the soprano in a singable middle
      if (ms > 76) cost += 0.8; if (ms < 63) cost += 0.6;
      if (mb > 56) cost += 0.4;
      out.push({ v, cost });
    }
    return out;
  }

  function semis(a, b) { return T.midi(b) - T.midi(a); }
  function steps(a, b) { return T.dia(b) - T.dia(a); }

  function transitionCost(p, pc, c, cc) {
    // p,c: voicings [B,T,A,S]; pc, cc: chord objects
    let cost = 0;
    const P = p.v, C = c.v;
    for (let i = 0; i < 4; i++) {
      const d = semis(P[i], C[i]), ds = Math.abs(steps(P[i], C[i]));
      const ad = Math.abs(d);
      // augmented melodic intervals
      if ((ds === 1 && ad === 3) || (ds === 3 && ad === 6) || (ds === 4 && ad === 8) || (ds === 2 && ad === 5)) return Infinity;
      if (ds === 4 && ad === 6 && i !== 0) return Infinity; // diminished 5th leap in upper voices
      if (i === 3) { if (ad > 9 && ad !== 12) return Infinity; cost += ad === 0 ? 2.2 : ad <= 2 ? 0 : ad <= 4 ? 0.9 : 2.2; }
      else if (i > 0) { if (ad > 9) return Infinity; cost += ad * 0.32 + (ad > 7 ? 3 : ad > 4 ? 1 : 0); }
      else { if (ad > 12) return Infinity; cost += ad * 0.08 + (ad === 0 ? 1.0 : 0); }
      // overlap
      if (i < 3 && T.midi(C[i]) >= T.midi(P[i + 1])) return Infinity;
      if (i > 0 && T.midi(C[i]) <= T.midi(P[i - 1])) return Infinity;
    }
    // parallel / consecutive perfect intervals
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
      const ip = ((semis(P[i], P[j]) % 12) + 12) % 12, ic = ((semis(C[i], C[j]) % 12) + 12) % 12;
      const moved = T.midi(P[i]) !== T.midi(C[i]) || T.midi(P[j]) !== T.midi(C[j]);
      if (moved && ip === ic && (ic === 0 || ic === 7)) {
        const dsp = ((steps(P[i], P[j]) % 7) + 7) % 7, dsc = ((steps(C[i], C[j]) % 7) + 7) % 7;
        if (dsp === dsc) return Infinity;
      }
    }
    // hidden 5ths/8ves in outer voices with soprano leap
    {
      const dB = semis(P[0], C[0]), dS = semis(P[3], C[3]);
      const ic = ((semis(C[0], C[3]) % 12) + 12) % 12;
      if ((ic === 0 || ic === 7) && Math.sign(dB) === Math.sign(dS) && dB !== 0 && Math.abs(dS) > 2) return Infinity;
    }
    // tendency tones
    const resolvesToTonic = pc.ltPC && cc.rootPCInKey && (cc.isTonicOf(pc));
    for (let i = 0; i < 4; i++) {
      if (pc.ltPC && T.sameClass(P[i], pc.ltPC) && resolvesToTonic) {
        const up = semis(P[i], C[i]) === 1;
        if (!up) { if (i === 3 || i === 0 || cc.dcVi) return Infinity; cost += 1.8; }
      }
      if (pc.seventh && T.sameClass(P[i], pc.tones[3])) {
        const sameRoot = T.sameClass(pc.tones[0], cc.tones[0]) && pc.sym.replace(/\d/g, "") === cc.sym.replace(/\d/g, "");
        const d = semis(P[i], C[i]);
        if (!sameRoot && !(d === -1 || d === -2)) return Infinity;
      }
      if (pc.cad64 && i > 0) {
        // 6th and 4th above bass resolve down by step
        const iv = ((steps(P[0], P[i]) % 7) + 7) % 7;
        if (iv === 5 || iv === 3) { const d = semis(P[i], C[i]); if (!(d === -1 || d === -2)) return Infinity; }
      }
    }
    return cost;
  }

  function decorateChord(k, sym, flags) {
    const spec = T.chordSpec(k, sym);
    const tonic = T.degreePC(k, 0);
    spec.tonicPC = tonic;
    // leading tone if dominant-function or secondary dominant
    if (spec.sec) spec.ltPC = spec.tones[1]; // 3rd of a secondary dominant is the applied leading tone
    else if (spec.deg === 4 && (spec.quality === "M" || spec.quality === "Mm7")) spec.ltPC = spec.tones[1];
    else if (spec.deg === 6) spec.ltPC = spec.tones[0];
    spec.rootPCInKey = true;
    spec.isTonicOf = function (prev) {
      if (!prev.ltPC) return false;
      const target = T.transposeNote({ L: prev.ltPC.L, a: prev.ltPC.a, o: 4 }, 1, 1);
      return this.tones.some((t) => T.sameClass(t, target));
    };
    Object.assign(spec, flags || {});
    return spec;
  }

  function voice(chords, r) {
    const cands = chords.map((ch) => candidates(ch).map((c) => ({ v: c.v, cost: c.cost + r() * 0.9 })));
    for (let i = 0; i < cands.length; i++) if (!cands[i].length) return null;
    const best = [cands[0].map((c) => c.cost)], back = [cands[0].map(() => -1)];
    for (let i = 1; i < chords.length; i++) {
      const bi = [], bk = [];
      for (let j = 0; j < cands[i].length; j++) {
        let bv = Infinity, bj = -1;
        for (let q = 0; q < cands[i - 1].length; q++) {
          if (best[i - 1][q] === Infinity) continue;
          const tc = transitionCost(cands[i - 1][q], chords[i - 1], cands[i][j], chords[i]);
          const v = best[i - 1][q] + tc;
          if (v < bv) { bv = v; bj = q; }
        }
        bi.push(bv + cands[i][j].cost); bk.push(bj);
      }
      best.push(bi); back.push(bk);
    }
    const lastRow = best[best.length - 1];
    let bj = 0; for (let j = 1; j < lastRow.length; j++) if (lastRow[j] < lastRow[bj]) bj = j;
    if (lastRow[bj] === Infinity) return null;
    const out = [];
    for (let i = chords.length - 1; i >= 0; i--) { out.unshift(cands[i][bj].v); bj = back[i][bj]; }
    return out;
  }

  // ---------- passage generation ----------
  // opts: { seed, key, mode, phrases:[{cadence, key?, pivot?}], meter: "4/4"|"3/4" }
  function makePassage(opts) {
    const r = typeof opts.seed === "function" ? opts.seed : T.rng(opts.seed || 1);
    const home = opts.key;
    const meter = opts.meter || "4/4";
    const n = meter === "3/4" ? 7 : 7;
    const durs = meter === "3/4" ? [2, 2, 2, 2, 2, 2, 6] : [2, 2, 2, 2, 2, 2, 4];
    for (let attempt = 0; attempt < 30; attempt++) {
      const chords = [], meta = [];
      opts.phrases.forEach((ph, pi) => {
        const k = ph.key || home;
        let start = pi === 0 ? "I" : (ph.pivot || r.pick(["I", "I", "vi", "IV", "I6"]));
        if (k.mode === "minor" && (start === "iii")) start = "I";
        const syms = buildPhrase(r, n, ph.cadence, { start, mode: k.mode });
        syms.forEach((s, i) => {
          const sym = modeSym(s, k.mode);
          const last = i === syms.length - 1;
          const flags = {
            phrase: pi, idx: i, dur: durs[i], fermata: last, first: chords.length === 0, final: last && pi === opts.phrases.length - 1,
            sopTarget: last ? (ph.cadence === "PAC" ? "tonic" : ph.cadence === "IAC" ? "notTonic" : null) : null,
            dcVi: last && ph.cadence === "DC", cadence: last ? ph.cadence : null, pivot: i === 0 && ph.pivotLabel ? ph.pivotLabel : null,
            local: s
          };
          chords.push(decorateChord(k, sym, flags));
        });
        meta.push({ key: k, cadence: ph.cadence });
      });
      const voicing = voice(chords, r);
      if (voicing) return { key: home, meter, chords, voicing, phrases: meta };
    }
    return null;
  }

  // ---------- melodic embellishment (passing tones) ----------
  // returns per-voice event lists [{n, dur, chordIdx}] in eighth-note units
  function toEvents(passage, embellish, r) {
    const V = [[], [], [], []];
    const { chords, voicing } = passage;
    for (let i = 0; i < chords.length; i++) {
      for (let v = 0; v < 4; v++) V[v].push({ n: voicing[i][v], dur: chords[i].dur, ci: i, fermata: chords[i].fermata });
    }
    if (!embellish) return V;
    const prob = typeof embellish === "number" ? embellish : 0.35;
    for (let i = 0; i < chords.length - 1; i++) {
      if (chords[i].dur !== 2 || chords[i].fermata) continue;
      if (!r.chance(prob)) continue;
      const order = r.shuffle([1, 2, 3, 0]);
      for (const v of order) {
        const a = voicing[i][v], b = voicing[i + 1][v];
        if (Math.abs(T.dia(b) - T.dia(a)) !== 2) continue;
        const k = chords[i].key;
        const up = T.dia(b) > T.dia(a);
        const d = T.dia(a) + (up ? 1 : -1);
        const L = ((d % 7) + 7) % 7;
        const deg = ((L - k.t.L) % 7 + 7) % 7;
        const pc = T.degreePC(k, deg, k.mode === "minor" ? { raise7: up && deg === 6, raise6: up && deg === 5 && T.sameClass(b, T.degreePC(k, 6, { raise7: true })) } : null);
        const pn = { L: pc.L, a: pc.a, o: Math.floor(d / 7) };
        const s1 = Math.abs(T.midi(pn) - T.midi(a)), s2 = Math.abs(T.midi(b) - T.midi(pn));
        if (s1 < 1 || s1 > 2 || s2 < 1 || s2 > 2) continue;
        // parallel check: passing note vs other voices' held notes, moving into next chord
        let bad = false;
        for (let w = 0; w < 4; w++) {
          if (w === v) continue;
          const held = voicing[i][w], nxt = voicing[i + 1][w];
          const lo = (x, y) => (T.midi(x) < T.midi(y) ? [x, y] : [y, x]);
          const [p1, p2] = lo(pn, held), [c1, c2] = lo(b, nxt);
          const ip = ((T.midi(p2) - T.midi(p1)) % 12 + 12) % 12, ic = ((T.midi(c2) - T.midi(c1)) % 12 + 12) % 12;
          if ((ip === 7 || ip === 0) && ip === ic && (T.midi(held) !== T.midi(nxt) || T.midi(pn) !== T.midi(b))) bad = true;
          if (w < v && T.midi(pn) <= T.midi(held)) bad = true;
          if (w > v && T.midi(pn) >= T.midi(held)) bad = true;
        }
        if (bad) continue;
        const ev = V[v][i];
        V[v][i] = { n: a, dur: 1, ci: i };
        V[v].splice(i + 1, 0, { n: pn, dur: 1, ci: i, passing: true });
        // keep indices aligned: rebuild by chord index later
        for (let w = 0; w < 4; w++) if (w !== v) V[w].splice(i + 1, 0, null);
        void ev;
        break;
      }
    }
    return V.map((list) => list.filter((e) => e !== null));
  }

  // ---------- figured bass ----------
  const FIG_STD = { "0": [], "1": ["6"], "2": ["6", "4"] };
  const FIG7 = { "0": ["7"], "1": ["6", "5"], "2": ["4", "3"], "3": ["4", "2"] };
  function figures(ch, bassNote, sig) {
    const base = (ch.seventh ? FIG7 : FIG_STD)[String(ch.inv)].slice();
    const marks = {};
    const extras = [];
    for (let i = 0; i < ch.tones.length; i++) {
      if (i === ch.inv) continue;
      const t = ch.tones[i];
      if (t.a === sig[t.L]) continue;
      const num = ((t.L - bassNote.L) % 7 + 7) % 7; // 2=3rd,4=5th,5=6th,3=4th,1=2nd,6=7th
      const fig = String({ 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7 }[num]);
      const acc = t.a - sig[t.L] > 0 ? (t.a === 0 ? "♮" : "♯") : (t.a === 0 ? "♮" : "♭");
      if (base.includes(fig)) marks[fig] = acc;
      else if (fig === "3") extras.push({ fig: "3", acc, bare: true });
      else extras.push({ fig, acc });
    }
    let out = base.map((f) => (marks[f] ? marks[f] + f : f));
    for (const e of extras) {
      if (e.bare) out.push(e.acc); // a lone accidental means the 3rd
      else out.unshift(e.acc + e.fig);
    }
    // order top-down by numeric value
    const val = (s) => (/\d/.test(s) ? parseInt(s.replace(/[^\d]/g, ""), 10) : 3);
    out.sort((x, y) => val(y) - val(x));
    return out;
  }

  // ---------- ABC rendering ----------
  const ABC_ACC = { "-2": "__", "-1": "_", "0": "=", "1": "^", "2": "^^" };
  function abcPitch(n) {
    let s = T.LETTERS[n.L];
    if (n.o >= 5) { s = s.toLowerCase(); s += "'".repeat(n.o - 5); }
    else s += ",".repeat(4 - n.o);
    return s;
  }
  function durStr(d) { return d === 1 ? "" : String(d); }
  function abcKey(k) {
    const t = T.LETTERS[k.t.L] + (k.t.a === 1 ? "#" : k.t.a === -1 ? "b" : "");
    return t + (k.mode === "minor" ? "m" : "");
  }

  // events: [{n|null, dur, hidden?, fermata?, ann?: [strings below], annAbove?}]
  function voiceToABC(events, sig, barLen) {
    let out = "", pos = 0, state = {};
    events.forEach((e, i) => {
      if (pos > 0 && pos % barLen === 0) { out += " | "; state = {}; }
      let tok = "";
      if (e.annAbove) tok += '"^' + e.annAbove + '"';
      if (e.ann) for (const a of e.ann) tok += '"_' + a + '"';
      if (e.fermata) tok += "H";
      if (!e.n) tok += "z" + durStr(e.dur);
      else if (e.hidden) tok += "x" + durStr(e.dur);
      else {
        const key = e.n.L + ":" + e.n.o;
        const cur = key in state ? state[key] : sig[e.n.L];
        if (e.n.a !== cur) { tok += ABC_ACC[String(e.n.a)]; state[key] = e.n.a; }
        tok += abcPitch(e.n) + durStr(e.dur);
      }
      out += tok + " ";
      pos += e.dur;
      void i;
    });
    return out + "|]";
  }

  // layout: "grand" (S+A treble, T+B bass), "open" (4 staves), "trio" (RH, LH, Ped), or custom staves
  function renderABC(o) {
    const sig = T.keySig(o.key);
    const barLen = o.meter === "3/4" ? 6 : 8;
    let abc = "X:1\n";
    if (o.title) abc += "T:" + o.title + "\n";
    abc += "M:" + o.meter + "\nL:1/8\n";
    if (o.tempo) abc += "Q:1/4=" + o.tempo + "\n";
    const staves = o.staves; // [{id, clef, voices:[{id, events, stem}]}]
    const groups = staves.map((st) => st.voices.length > 1 ? "(" + st.voices.map((v) => v.id).join(" ") + ")" : st.voices[0].id);
    const brace = o.brace ? "{" + groups.join(" ") + "}" : (o.bracket ? "[" + groups.join(" ") + "]" : groups.join(" "));
    if (staves.length > 1 || staves[0].voices.length > 1) abc += "%%score " + brace + "\n";
    staves.forEach((st) => st.voices.forEach((v) => {
      abc += "V:" + v.id + " clef=" + st.clef + (v.stem ? " stem=" + v.stem : "") + (st.name && v === st.voices[0] ? ' name="' + st.name + '"' : "") + "\n";
    }));
    abc += "K:" + abcKey(o.key) + "\n";
    staves.forEach((st) => st.voices.forEach((v) => { abc += "[V:" + v.id + "] " + voiceToABC(v.events, sig, barLen) + "\n"; }));
    return abc;
  }

  const api = { NEXT, PREDOM, modeSym, romanFor, buildPhrase, decorateChord, voice, makePassage, toEvents, figures, renderABC, voiceToABC, abcPitch, abcKey, RANGE };
  root.Harmony = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
