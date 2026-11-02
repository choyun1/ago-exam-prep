// Checks 200 voiced passages for parallel 5ths and octaves and for passages that could not be voiced.
// Run with `npm test` (or `node test/check_voicing.js`). Exits with an error on any failure.
const T = require("../js/theory.js");
const H = require("../js/harmony.js");
let fails = 0,
  nulls = 0;
for (let s = 1; s <= 200; s++) {
  const r = T.rng(s);
  const mode = r.pick(["major", "minor"]);
  const kl = r.pick(T.KEY_LIST[mode]);
  const key = T.mkKey(kl[0], kl[1], mode);
  const p = H.makePassage({
    seed: r,
    key,
    phrases: [{ cadence: "HC" }, { cadence: "PAC" }],
    meter: r.pick(["4/4", "3/4"]),
  });
  if (!p) {
    nulls++;
    console.log("could not voice a passage in", T.keyName(key));
    continue;
  }
  const v = p.voicing;
  for (let i = 1; i < v.length; i++)
    for (let a = 0; a < 4; a++)
      for (let b = a + 1; b < 4; b++) {
        const ip = (((T.midi(v[i - 1][b]) - T.midi(v[i - 1][a])) % 12) + 12) % 12,
          ic = (((T.midi(v[i][b]) - T.midi(v[i][a])) % 12) + 12) % 12;
        const moved = T.midi(v[i - 1][a]) !== T.midi(v[i][a]);
        if (moved && ip === ic && (ic === 0 || ic === 7)) {
          fails++;
          console.log("parallel at seed", s, "chord", i, "voices", a, b);
        }
      }
}
console.log({ passages: 200, unvoiced: nulls, parallels: fails });
if (fails || nulls) process.exit(1);
