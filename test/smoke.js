globalThis.window = globalThis;
require("../js/theory.js"); require("../js/harmony.js"); require("../js/generators.js"); require("../js/drills.js");
const {G}=Gen, {D}=Drills; let n=0, err=0; const t0=Date.now();
const calls = [["sightReadGrand",{}],["sightReadTrio",{}],["openScore",{}],["openScore",{cClefs:true}],["transposition",{intervals:[["up a major 2nd",2],["down a minor 2nd",-1]]}],
 ["figuredBass",{}],["figuredBass",{written:true}],["harmonize",{mixed:true}],["harmonize",{}],["progressions",{}],["dictation",{kind:"melody"}],["dictation",{missing:true}],["dictation",{kind:"four"}],
 ["errorDetection",{}],["auralPerception",{}],["fugue",{voices:3}],["fugue",{voices:4,episode:true}],["improv",{kind:"ground"}],["improv",{kind:"phrases"}],["improv",{kind:"bridge"}],["improv",{kind:"ternary"}],
 ["compositionStart",{}],["cantusFirmus",{}],["analysis",{}],["essay",{}],["orchestration",{}],["choralComposition",{}],["rehearsal",{}]];
for (let s=1;s<=25;s++){ for (const [f,o] of calls){ n++; try{ const x=G[f](Theory.rng(s*101+n),o); if(!x.title) throw new Error("no title"); }catch(e){err++; console.log(f,s,e.message);} }
 for (const f of Object.keys(D)){ n++; try{ const x=D[f](Theory.rng(s*7+n)); if(!(x.answer>=0 && x.choices.length>=2 && new Set(x.choices).size===x.choices.length)) throw new Error("bad mc "+JSON.stringify(x.choices)); }catch(e){err++; console.log(f,s,e.message);} } }
console.log({n,err,ms:Date.now()-t0});
const f=G.fugue(Theory.rng(5),{voices:3}); console.log(f.prompt, "\n", f.solution.text); console.log(f.scores[0].abc); console.log(f.solution.scores[0].abc);
const fb=G.figuredBass(Theory.rng(9),{}); console.log(fb.scores[0].abc);
