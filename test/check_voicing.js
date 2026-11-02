const T = require("../js/theory.js"); const H = require("../js/harmony.js");
let fails=0, nulls=0, total=0; const t0=Date.now();
for (let s=1; s<=60; s++) {
  const r = T.rng(s);
  const mode = r.pick(["major","minor"]); const kl = r.pick(T.KEY_LIST[mode]);
  const key = T.mkKey(kl[0], kl[1], mode);
  const p = H.makePassage({ seed: r, key, phrases:[{cadence:"HC"},{cadence:"PAC"}] });
  total++;
  if (!p) { nulls++; console.log("NULL", T.keyName(key)); continue; }
  const v = p.voicing;
  for (let i=1;i<v.length;i++) for (let a=0;a<4;a++) for (let b=a+1;b<4;b++){
    const ip=((T.midi(v[i-1][b])-T.midi(v[i-1][a]))%12+12)%12, ic=((T.midi(v[i][b])-T.midi(v[i][a]))%12+12)%12;
    const moved = T.midi(v[i-1][a])!==T.midi(v[i][a]);
    if (moved && ip===ic && (ic===0||ic===7)) { fails++; console.log("parallel", s, i, a, b); }
  }
  if (s<=4) console.log(T.keyName(key), p.chords.map(c=>c.sym).join(" "), "\n  S:", v.map(x=>T.name(x[3],1)).join(" "), "\n  B:", v.map(x=>T.name(x[0],1)).join(" "));
}
console.log({total, nulls, fails, ms: Date.now()-t0});
