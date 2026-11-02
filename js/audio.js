/* Small additive "flue chorus" synth: 8′ + 4′ + a little 2′, with chiff-free organ envelope. */
(function (root) {
  "use strict";
  let ctx = null, master = null, live = [];
  function ensure() {
    if (!ctx) {
      const AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.16;
      const comp = ctx.createDynamicsCompressor();
      master.connect(comp); comp.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function voiceAt(m, t0, dur) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(1, t0 + 0.025);
    g.gain.setValueAtTime(1, t0 + Math.max(0.03, dur - 0.04));
    g.gain.linearRampToValueAtTime(0, t0 + dur + 0.03);
    g.connect(master);
    const parts = [[1, 1.0, "sine"], [2, 0.42, "sine"], [3, 0.12, "sine"], [4, 0.16, "sine"]];
    const oscs = parts.map(([mult, amp, type]) => {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = hz(m) * mult;
      const a = ctx.createGain(); a.gain.value = amp * (m > 76 ? 0.7 : 1);
      o.connect(a); a.connect(g); o.start(t0); o.stop(t0 + dur + 0.06); return o;
    });
    live.push(...oscs);
  }
  // notes: [{midi, start, dur}] (seconds)
  function play(notes, opts) {
    if (!ensure()) return 0;
    stop();
    const t0 = ctx.currentTime + 0.06 + ((opts && opts.offset) || 0);
    let end = 0;
    for (const n of notes) { voiceAt(n.midi, t0 + n.start, n.dur); end = Math.max(end, n.start + n.dur); }
    return end;
  }
  function stop() { for (const o of live) { try { o.stop(); } catch (e) { /* already stopped */ } } live = []; }
  // tonic chord + metronome-like count: returns notes array to prepend
  function tonicChord(key, T) {
    const tonic = T.degreePC(key, 0), third = T.degreePC(key, 2), fifth = T.degreePC(key, 4);
    const m = (p, o) => T.midi({ L: p.L, a: p.a, o });
    return [m(tonic, 3), m(third, 4), m(fifth, 4), m(tonic, 5)].map((x) => ({ midi: x, start: 0, dur: 1.4 }));
  }
  root.OrganAudio = { play, stop, tonicChord, available: () => !!(root.AudioContext || root.webkitAudioContext) };
})(typeof window !== "undefined" ? window : globalThis);
