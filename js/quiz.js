/* Which knowledge questions go into a quiz, and when each one comes back (spaced repetition).
 * Pure functions with no DOM, so test/quiz.js can simulate months of daily quizzes.
 *
 * The review record for each question, kept in localStorage under "agoprep:srs", is { box, due, seen }:
 *   box   how many times in a row it was answered right (an index into INTERVALS)
 *   due   the first day (YYYY-MM-DD) it may come back as a review
 *   seen  the day it was last asked (records saved before this field existed don't have it; see lastSeen)
 */
(function (root) {
  "use strict";
  // days until a question comes back: a miss returns tomorrow; each right answer in a row waits longer
  const INTERVALS = [1, 3, 7, 16, 35, 90];
  // at most this share of a quiz's question slots go to reviews, so every quiz has new questions while any are left
  const REVIEW_SHARE = 0.5;
  // a question that isn't due is used as filler only if it hasn't been asked for this many days
  const FILLER_GAP = 7;

  const addDays = (s, n) => {
    const d = new Date(s + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const daysBetween = (a, b) => Math.round((new Date(b + "T12:00:00Z") - new Date(a + "T12:00:00Z")) / 86400000);

  // When the question was last asked. Older records only have box and due; under the old intervals a miss came
  // back in 1 day and box b waited [0, 1, 3, 7, 21, 60][b] days, so the day it was asked can be worked out.
  const OLD_INTERVALS = [1, 1, 3, 7, 21, 60];
  function lastSeen(rec) {
    if (rec.seen) return rec.seen;
    return addDays(rec.due, -OLD_INTERVALS[Math.min(rec.box || 0, OLD_INTERVALS.length - 1)]);
  }

  // Questions in the same family look alike ("What is the reciting tone of Mode 4?" and "...of Mode 6?", or two
  // questions whose answer is "A perfect fifth lower than written"), so a quiz takes at most one of each family.
  const stem = (q) =>
    q
      .toLowerCase()
      .replace(/\([^)]*\)/g, " ")
      .replace(/[^a-z ]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 5)
      .join(" ");
  const family = (f) => ["q:" + stem(f.q), "a:" + String(f.answer).toLowerCase()];

  /* Pick up to n questions from `facts` for one quiz.
   *   r             seeded random generator (Theory.rng)
   *   topicWeights  [[topic, weight], ...]; only these topics are used
   *   srs           the review records, by question id
   *   today         YYYY-MM-DD
   * Order of preference: reviews that are due (most overdue first, up to REVIEW_SHARE of n), then new questions
   * by topic weight, then any other due reviews, then questions not asked for FILLER_GAP days (oldest first).
   * Never a question already asked today. May return fewer than n; the quiz fills the rest with drills. */
  function pickFacts(r, facts, n, topicWeights, srs, today) {
    const wanted = new Set(topicWeights.map(([t]) => t));
    const pool = facts.filter((f) => wanted.has(f.topic) && !(srs[f.id] && lastSeen(srs[f.id]) >= today));
    const out = [];
    const used = new Set();
    const fits = (f) => !family(f).some((k) => used.has(k));
    const take = (f) => {
      out.push(f);
      family(f).forEach((k) => used.add(k));
    };

    const due = r
      .shuffle(pool.filter((f) => srs[f.id] && srs[f.id].due <= today))
      .sort((a, b) => srs[a.id].due.localeCompare(srs[b.id].due));
    const reviewCap = Math.ceil(n * REVIEW_SHARE);
    for (const f of due) {
      if (out.length >= reviewCap) break;
      if (fits(f)) take(f);
    }

    const fresh = r.shuffle(pool.filter((f) => !srs[f.id]));
    let guard = 0;
    while (out.length < n && guard++ < 500) {
      const left = fresh.filter((f) => !out.includes(f) && fits(f));
      if (!left.length) break;
      const t = r.weighted(topicWeights.filter(([tp]) => left.some((f) => f.topic === tp)));
      take(left.find((f) => f.topic === t));
    }

    for (const f of due) {
      if (out.length >= n) break;
      if (!out.includes(f) && fits(f)) take(f);
    }

    const filler = r
      .shuffle(pool.filter((f) => srs[f.id] && srs[f.id].due > today))
      .filter((f) => daysBetween(lastSeen(srs[f.id]), today) >= FILLER_GAP)
      .sort((a, b) => lastSeen(srs[a.id]).localeCompare(lastSeen(srs[b.id])));
    for (const f of filler) {
      if (out.length >= n) break;
      if (fits(f)) take(f);
    }
    return out;
  }

  // the new review record after answering; `rec` is the old one (undefined for a new question)
  function grade(rec, correct, today) {
    const box = correct ? (rec ? Math.min(rec.box + 1, INTERVALS.length - 1) : 1) : 0;
    return { box, due: addDays(today, INTERVALS[box]), seen: today };
  }

  root.Quiz = { INTERVALS, REVIEW_SHARE, FILLER_GAP, pickFacts, grade, lastSeen, family, addDays };
  if (typeof module !== "undefined") module.exports = root.Quiz;
})(typeof window !== "undefined" ? window : globalThis);
