/* Core pitch, key and chord spelling. No dependencies.
 *
 * Glossary of the short names used here and in harmony.js / generators.js:
 *   note      { L, a, o }: L = letter 0–6 (C D E F G A B), a = alteration in semitones (-1 flat, 1 sharp, 2 double sharp),
 *             o = octave (middle C = C4). A pitch class is the same without o.
 *   key       { t, mode }: t = tonic pitch class, mode = "major" | "minor".
 *   dia(n)    diatonic step number (o * 7 + L): counts letter names, so C4→E4 is 2 steps whatever the accidentals.
 *   midi(n)   MIDI number (middle C = 60): counts semitones.
 *   ds, ss    an interval as (diatonic steps, semitones): a major 3rd is (2, 4), a diminished 4th is (3, 4).
 *   deg       scale degree counted from 0 (0 = tonic, 4 = dominant); the UI shows it as ^1–^7.
 *   inv       inversion: 0 root position, 1 first, 2 second, 3 third.
 *   r         a seeded random-number generator from rng(); same seed, same exercise. */
(function (root) {
  "use strict";

  const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
  const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
  const MAJOR = [0, 2, 4, 5, 7, 9, 11];
  const NAT_MINOR = [0, 2, 3, 5, 7, 8, 10];

  // ---------- seeded random ----------
  function rng(seed) {
    let s = seed >>> 0 || 1;
    const f = function () {
      s |= 0;
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.int = (n) => Math.floor(f() * n);
    f.pick = (arr) => arr[Math.floor(f() * arr.length)];
    f.chance = (p) => f() < p;
    f.shuffle = (arr) => {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(f() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };
    f.weighted = (pairs) => {
      // [[item, weight], ...]
      const tot = pairs.reduce((s, p) => s + p[1], 0);
      let r = f() * tot;
      for (const p of pairs) {
        if ((r -= p[1]) < 0) return p[0];
      }
      return pairs[pairs.length - 1][0];
    };
    return f;
  }
  function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  // ---------- notes ----------
  const note = (L, a, o) => ({ L: ((L % 7) + 7) % 7, a, o });
  const dia = (n) => n.o * 7 + n.L; // diatonic step number
  const midi = (n) => 12 * (n.o + 1) + LETTER_PC[n.L] + n.a;
  const pcOf = (n) => (((LETTER_PC[n.L] + n.a) % 12) + 12) % 12;
  const sameClass = (x, y) => x.L === y.L && x.a === y.a;
  function fromDia(d, a) {
    return { L: ((d % 7) + 7) % 7, a, o: Math.floor(d / 7) };
  }

  const ACC_TXT = { "-2": "𝄫", "-1": "♭", 0: "", 1: "♯", 2: "𝄪" };
  const ACC_ASCII = { "-2": "bb", "-1": "b", 0: "", 1: "#", 2: "x" };
  function name(n, withOct) {
    return LETTERS[n.L] + ACC_TXT[n.a] + (withOct ? n.o : "");
  }
  function pcName(p) {
    return LETTERS[p.L] + ACC_TXT[p.a];
  }

  // ---------- keys ----------
  // key = { t: {L,a}, mode: "major"|"minor" }
  const KEY_LIST = {
    major: [
      ["C", 0],
      ["G", 0],
      ["D", 0],
      ["A", 0],
      ["E", 0],
      ["B", 0],
      ["F", 1],
      ["F", 0],
      ["B", -1],
      ["E", -1],
      ["A", -1],
      ["D", -1],
      ["G", -1],
    ],
    minor: [
      ["A", 0],
      ["E", 0],
      ["B", 0],
      ["F", 1],
      ["C", 1],
      ["G", 1],
      ["D", 0],
      ["G", 0],
      ["C", 0],
      ["F", 0],
      ["B", -1],
      ["E", -1],
    ],
  };
  function mkKey(letter, a, mode) {
    return { t: { L: LETTERS.indexOf(letter), a }, mode };
  }
  function keyName(k) {
    return pcName(k.t) + " " + k.mode;
  }
  function keyShort(k) {
    return pcName(k.t) + (k.mode === "minor" ? " minor" : " major");
  }

  // scale-degree pitch class (deg 0..6). raised: use raised ^7 (and ^6 if raise6) in minor
  function degreePC(k, deg, opts) {
    deg = ((deg % 7) + 7) % 7;
    const L = (k.t.L + deg) % 7;
    const scale = k.mode === "major" ? MAJOR : NAT_MINOR;
    let semis = scale[deg];
    if (k.mode === "minor" && opts && ((deg === 6 && opts.raise7) || (deg === 5 && opts.raise6))) semis += 1;
    const tonicPC = LETTER_PC[k.t.L] + k.t.a;
    const target = tonicPC + semis;
    let a = target - LETTER_PC[L];
    a = ((((a + 6) % 12) + 12) % 12) - 6; // normalize to -6..5
    return { L, a };
  }

  // key signature: map letter -> alteration
  function keySig(k) {
    const sig = [0, 0, 0, 0, 0, 0, 0];
    for (let d = 0; d < 7; d++) {
      const p = degreePC(k, d);
      sig[p.L] = p.a;
    }
    return sig;
  }
  function sigCount(k) {
    return keySig(k).reduce((s, a) => s + a, 0);
  } // + sharps, - flats
  function relMajor(k) {
    if (k.mode === "major") return k;
    const p = degreePC(k, 2);
    return { t: p, mode: "major" };
  }
  function relMinor(k) {
    if (k.mode === "minor") return k;
    const p = degreePC(k, 5);
    return { t: p, mode: "minor" };
  }
  function dominantKey(k) {
    const p = degreePC(k, 4);
    return { t: p, mode: k.mode };
  }
  function subdominantKey(k) {
    const p = degreePC(k, 3);
    return { t: p, mode: k.mode };
  }

  // transpose a pitch class / note by an interval given as (diatonic steps, semitones)
  function transposeNote(n, dSteps, semis) {
    const d = dia(n) + dSteps;
    const out = fromDia(d, 0);
    out.a = midi(n) + semis - midi(out);
    return out;
  }
  function transposeKey(k, dSteps, semis) {
    const n = transposeNote({ L: k.t.L, a: k.t.a, o: 4 }, dSteps, semis);
    return { t: { L: n.L, a: n.a }, mode: k.mode };
  }
  function keyIsSane(k) {
    const c = Math.abs(sigCount(k));
    return c <= 7 && Math.abs(k.t.a) <= 1;
  }

  const INTERVALS = {
    // name -> [diatonic steps, semitones]
    m2: [1, 1],
    M2: [1, 2],
    m3: [2, 3],
    M3: [2, 4],
    P4: [3, 5],
    A4: [3, 6],
    d5: [4, 6],
    P5: [4, 7],
    m6: [5, 8],
    M6: [5, 9],
    m7: [6, 10],
    M7: [6, 11],
    P8: [7, 12],
  };
  const INTERVAL_NAMES = {
    m2: "minor 2nd",
    M2: "major 2nd",
    m3: "minor 3rd",
    M3: "major 3rd",
    P4: "perfect 4th",
    A4: "augmented 4th",
    d5: "diminished 5th",
    P5: "perfect 5th",
    m6: "minor 6th",
    M6: "major 6th",
    m7: "minor 7th",
    M7: "major 7th",
    P8: "octave",
  };
  function intervalBetween(lo, hi) {
    // simple interval name or null
    const ds = dia(hi) - dia(lo),
      ss = midi(hi) - midi(lo);
    for (const k in INTERVALS) if (INTERVALS[k][0] === ds && INTERVALS[k][1] === ss) return k;
    return null;
  }

  // ---------- chords ----------
  const QUALITY = {
    // [diatonic, semitone] above root
    M: [
      [0, 0],
      [2, 4],
      [4, 7],
    ],
    m: [
      [0, 0],
      [2, 3],
      [4, 7],
    ],
    d: [
      [0, 0],
      [2, 3],
      [4, 6],
    ],
    A: [
      [0, 0],
      [2, 4],
      [4, 8],
    ],
    Mm7: [
      [0, 0],
      [2, 4],
      [4, 7],
      [6, 10],
    ],
    mm7: [
      [0, 0],
      [2, 3],
      [4, 7],
      [6, 10],
    ],
    MM7: [
      [0, 0],
      [2, 4],
      [4, 7],
      [6, 11],
    ],
    dm7: [
      [0, 0],
      [2, 3],
      [4, 6],
      [6, 10],
    ],
    dd7: [
      [0, 0],
      [2, 3],
      [4, 6],
      [6, 9],
    ],
  };
  // build chord tones (pitch classes {L,a}) from root pc and quality
  function chordTones(rootPC, quality) {
    const r = { L: rootPC.L, a: rootPC.a, o: 4 };
    return QUALITY[quality].map(([ds, ss]) => {
      const n = transposeNote(r, ds, ss);
      return { L: n.L, a: n.a };
    });
  }

  // Roman numeral catalogue. deg = root scale degree; q = quality per mode; inv: 0 root,1,2,3
  // sec: secondary-of degree (e.g. V/V -> sec 4)
  function chordSpec(k, sym) {
    // sym like "I","I6","I64","ii6","V7","V65","V43","V42","vii°6","vii°7","V/V","V7/V","V65/V","viio65"
    const m =
      /^(b?)(vii|iii|vi|iv|ii|v|VII|III|VI|IV|II|V|I|i)(°|ø|\+)?(64|65|43|42|7|6)?(?:\/(V|v|IV|iv|ii|vi|III|VI))?$/.exec(
        sym,
      );
    if (!m) throw new Error("bad chord symbol " + sym);
    const roman = m[2],
      dimMark = m[3] || "",
      fig = m[4] || "",
      sec = m[5];
    const DEG = { i: 0, ii: 1, iii: 2, iv: 3, v: 4, vi: 5, vii: 6 };
    const deg = DEG[roman.toLowerCase()];
    const upper = roman === roman.toUpperCase();
    const seventh = fig === "7" || fig === "65" || fig === "43" || fig === "42";
    const inv = { "": 0, 6: 1, 64: 2, 7: 0, 65: 1, 43: 2, 42: 3 }[fig];
    let quality;
    if (seventh) {
      if (dimMark === "°") quality = "dd7";
      else if (dimMark === "ø") quality = "dm7";
      else if (upper) quality = deg === 4 || sec ? "Mm7" : "MM7";
      else quality = "mm7";
    } else {
      if (dimMark === "°") quality = "d";
      else if (dimMark === "+") quality = "A";
      else quality = upper ? "M" : "m";
    }
    let baseKey = k;
    if (sec) {
      // tonicized key
      const sdeg = DEG[sec.toLowerCase()];
      const tp = degreePC(k, sdeg);
      baseKey = { t: tp, mode: sec === sec.toUpperCase() ? "major" : "minor" };
    }
    const raise7 = k.mode === "minor" && !sec && deg === 6 && (dimMark === "°" || dimMark === "ø");
    const rootPC = degreePC(baseKey, deg, { raise7 });
    const tones = chordTones(rootPC, quality);
    return {
      sym,
      deg,
      quality,
      inv,
      seventh,
      tones,
      root: tones[0],
      bassPC: tones[inv],
      sec: !!sec,
      key: k,
      isDominant: !sec && (deg === 4 || deg === 6),
      cad64: sym === "I64" || sym === "i64",
    };
  }

  // leading tone of key (raised in minor)
  function leadingTone(k) {
    return degreePC(k, 6, { raise7: true });
  }

  const api = {
    LETTERS,
    LETTER_PC,
    rng,
    hashString,
    note,
    dia,
    midi,
    pcOf,
    sameClass,
    fromDia,
    name,
    pcName,
    ACC_TXT,
    ACC_ASCII,
    KEY_LIST,
    mkKey,
    keyName,
    keyShort,
    degreePC,
    keySig,
    sigCount,
    relMajor,
    relMinor,
    dominantKey,
    subdominantKey,
    transposeNote,
    transposeKey,
    keyIsSane,
    INTERVALS,
    INTERVAL_NAMES,
    intervalBetween,
    QUALITY,
    chordTones,
    chordSpec,
    leadingTone,
  };
  root.Theory = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
