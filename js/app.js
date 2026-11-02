/* UI: level selection, daily quiz, exam items with generated exercises, study plan. */
(function () {
  "use strict";
  const T = window.Theory,
    Gen = window.Gen,
    Drills = window.Drills,
    Audio = window.OrganAudio;
  const { LEVELS, DAILY, RESOURCES, REQUIREMENTS } = window.AGO_LEVELS;
  const FACTS = window.AGO_FACTS || [];
  const QUIZ_LEN = 12;

  // ---------- storage (best-effort) ----------
  const store = {
    get(k, d) {
      try {
        const v = localStorage.getItem("agoprep:" + k);
        return v == null ? d : JSON.parse(v);
      } catch (e) {
        return d;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem("agoprep:" + k, JSON.stringify(v));
      } catch (e) {
        /* storage unavailable */
      }
    },
  };

  // ---------- helpers ----------
  const $ = (sel, el) => (el || document).querySelector(sel);
  const h = (tag, attrs, ...kids) => {
    const el = document.createElement(tag);
    for (const k in attrs || {}) {
      if (k === "class") el.className = attrs[k];
      else if (k === "text") el.textContent = attrs[k];
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== false && attrs[k] != null) el.setAttribute(k, attrs[k]);
    }
    for (const c of kids.flat()) if (c != null) el.append(c.nodeType ? c : document.createTextNode(c));
    return el;
  };
  const todayStr = () => {
    const d = new Date();
    return (
      d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0")
    );
  };
  const daysBetween = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 86400000);
  const addDays = (s, n) => {
    const d = new Date(s + "T12:00:00");
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };
  // citation line shown under every answer and exercise
  const cite = (label, text, extra) =>
    h("p", { class: "cite" }, h("span", { class: "cite-l" }, label + ": "), text, extra || null);
  const reqLink = () => h("a", { href: REQUIREMENTS.url, target: "_blank", rel: "noopener" }, REQUIREMENTS.title);
  function citeQ(q) {
    const out = [];
    if (q.src) out.push(cite("Source", q.src));
    if (q.trains) out.push(cite("Exam items", q.trains + ", per ", reqLink()));
    return out;
  }
  const fmtDate = (s) =>
    new Date(s + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  function renderScore(el, abc) {
    if (!window.ABCJS) {
      el.append(h("pre", { class: "abc-src" }, abc));
      return;
    }
    const cw = el.clientWidth || 600;
    const w = Math.max(260, Math.min(760, cw - 10));
    const opts = {
      responsive: "resize",
      staffwidth: w,
      paddingtop: 4,
      paddingbottom: 4,
      paddingleft: 4,
      paddingright: 4,
      foregroundColor: "currentColor",
      add_classes: true,
    };
    if (/\|/.test(abc) && /M:(?!none)/.test(abc))
      opts.wrap = { minSpacing: 1.6, maxSpacing: 2.6, preferredMeasuresPerLine: cw < 520 ? 2 : 4 };
    window.ABCJS.renderAbc(el, abc, opts);
  }

  // ---------- state ----------
  let level = store.get("level", "AAGO");
  if (!LEVELS.some((l) => l.id === level)) level = "AAGO";
  const levelObj = () => LEVELS.find((l) => l.id === level);

  // ---------- level knobs ----------
  function drawKnobs() {
    const jamb = $("#jamb");
    jamb.innerHTML = "";
    LEVELS.forEach((l) => {
      const on = l.id === level;
      const b = h(
        "button",
        {
          class: "knob" + (on ? " drawn" : ""),
          "aria-pressed": on ? "true" : "false",
          id: "knob-" + l.id,
          onclick: () => {
            level = l.id;
            store.set("level", level);
            drawKnobs();
            route();
          },
        },
        h("span", { class: "knob-face" }, h("span", { class: "knob-abbr" }, l.short)),
        h("span", { class: "knob-name" }, l.name),
      );
      jamb.append(b);
    });
    const days = daysBetween(todayStr(), levelObj().examDate);
    $("#countdown").textContent =
      days >= 0
        ? level === "SPC"
          ? "SPC window closes in " + days + " days"
          : levelObj().short + " exam in " + days + " days"
        : "";
  }

  // ---------- spaced repetition for facts ----------
  const INTERVALS = [0, 1, 3, 7, 21, 60];
  function srs() {
    return store.get("srs", {});
  }
  function pickFacts(r, n, topicWeights) {
    const s = srs(),
      today = todayStr();
    const wanted = new Set(topicWeights.map(([t]) => t));
    const pool = FACTS.filter((f) => wanted.has(f.topic));
    const due = r.shuffle(pool.filter((f) => s[f.id] && s[f.id].due <= today));
    const fresh = r.shuffle(pool.filter((f) => !s[f.id]));
    const out = [];
    for (const f of due) {
      if (out.length >= n) break;
      out.push(f);
    }
    let guard = 0;
    while (out.length < n && fresh.length && guard++ < 500) {
      const t = r.weighted(topicWeights);
      const i = fresh.findIndex((f) => f.topic === t);
      if (i >= 0) out.push(fresh.splice(i, 1)[0]);
      else if (!fresh.some((f) => wanted.has(f.topic))) break;
    }
    // fall back to anything not yet chosen
    const rest = r.shuffle(pool.filter((f) => !out.includes(f)));
    while (out.length < n && rest.length) out.push(rest.pop());
    return out;
  }
  function gradeFact(id, correct) {
    const s = srs();
    const cur = s[id] || { box: 0 };
    const box = correct ? Math.min(cur.box + 1, INTERVALS.length - 1) : 0;
    s[id] = { box, due: addDays(todayStr(), correct ? INTERVALS[box] : 1) };
    store.set("srs", s);
  }
  function factToQ(f, r) {
    const order = r.shuffle(f.choices.map((c, i) => i));
    return {
      topic: f.topic,
      kind: topicLabel(f.topic),
      q: f.q,
      choices: order.map((i) => f.choices[i]),
      answer: order.indexOf(f.choices.indexOf(f.answer)),
      explain: f.explain,
      src: f.src,
      factId: f.id,
    };
  }
  const TOPIC_LABELS = {
    chant: "Chant",
    hymnody: "Hymnody",
    liturgy: "Liturgy",
    choir: "Choir training",
    "choral-rep": "Choral repertoire",
    "organ-history": "Organ history",
    registration: "Registration",
    "organ-rep": "Organ repertoire",
    theory: "Theory",
    fugue: "Fugue",
    counterpoint: "Counterpoint",
    orchestration: "Orchestration",
    history: "Music history",
    performance: "Performance practice",
    ear: "Ear training",
  };
  function topicLabel(t) {
    return TOPIC_LABELS[t] || t;
  }

  function buildQuiz(seedStr, lvl) {
    const r = T.rng(T.hashString(seedStr));
    const mix = DAILY[lvl];
    const nFacts = FACTS.length && mix.facts.length ? Math.round(QUIZ_LEN / 2) : 0;
    const qs = pickFacts(r, nFacts, mix.facts).map((f) => factToQ(f, r));
    while (qs.length < QUIZ_LEN) {
      const kind = r.weighted(mix.drills);
      try {
        qs.push(Drills.D[kind](r));
      } catch (e) {
        console.warn(kind, e);
      }
    }
    return r.shuffle(qs);
  }

  // ---------- daily view ----------
  function history() {
    return store.get("history", []);
  }
  function streak() {
    const days = new Set(history().map((x) => x.date));
    let n = 0;
    let d = todayStr();
    if (!days.has(d)) d = addDays(d, -1);
    while (days.has(d)) {
      n++;
      d = addDays(d, -1);
    }
    return n;
  }
  function statsByKind() {
    const agg = {};
    history()
      .slice(-60)
      .forEach((x) =>
        Object.entries(x.byKind || {}).forEach(([k, v]) => {
          agg[k] = agg[k] || [0, 0];
          agg[k][0] += v[0];
          agg[k][1] += v[1];
        }),
      );
    return Object.entries(agg)
      .filter(([, v]) => v[1] >= 2)
      .map(([k, v]) => ({ k, right: v[0], n: v[1], pct: v[0] / v[1] }))
      .sort((a, b) => a.pct - b.pct);
  }

  function viewDaily(main, extraSeed) {
    const date = todayStr();
    const seed = "daily:" + date + ":" + level + (extraSeed ? ":" + extraSeed : "");
    const done = history().find((x) => x.date === date && x.level === level && !extraSeed);
    const qs = buildQuiz(seed, level);
    let i = 0,
      right = 0;
    const byKind = {};
    const head = h(
      "div",
      { class: "view-head" },
      h(
        "div",
        {},
        h("p", { class: "eyebrow" }, extraSeed ? "Extra round" : "Daily quiz · " + fmtDate(date)),
        h("h2", {}, levelObj().name + ": " + QUIZ_LEN + " questions"),
      ),
      h(
        "div",
        { class: "stat-row" },
        h(
          "div",
          { class: "stat" },
          h("span", { class: "stat-n" }, String(streak())),
          h("span", { class: "stat-l" }, "day streak"),
        ),
        h(
          "div",
          { class: "stat" },
          h("span", { class: "stat-n" }, String(history().length)),
          h("span", { class: "stat-l" }, "quizzes done"),
        ),
      ),
    );
    const progress = h(
      "div",
      { class: "pips" },
      qs.map(() => h("span", { class: "pip" })),
    );
    const stage = h("div", { class: "stage" });
    main.append(head);
    if (done && !extraSeed)
      main.append(
        h(
          "p",
          { class: "note" },
          "You finished today's quiz (" +
            done.right +
            "/" +
            done.n +
            "). You can retake it or start an extra round below.",
        ),
      );
    if (DAILY[level].note) main.append(h("p", { class: "note" }, DAILY[level].note));
    main.append(progress, stage, weakPanel());
    const refreshStats = () => {
      const n = head.querySelectorAll(".stat-n");
      n[0].textContent = String(streak());
      n[1].textContent = String(history().length);
    };

    function showQ() {
      stage.innerHTML = "";
      const q = qs[i];
      [...progress.children].forEach((p, j) => p.classList.toggle("cur", j === i));
      const card = h(
        "div",
        { class: "qcard" },
        h("p", { class: "eyebrow" }, i + 1 + " / " + qs.length + " · " + (q.kind || topicLabel(q.topic))),
        h("p", { class: "qtext" }, q.q),
      );
      if (q.abc) {
        const sc = h("div", { class: "abc small" });
        card.append(sc);
        requestAnimationFrame(() => renderScore(sc, q.abc));
      }
      if (q.audio) card.append(audioControls(q.audio));
      const opts = h("div", { class: "choices" });
      const fb = h("div", { class: "feedback", hidden: true });
      q.choices.forEach((c, ci) => {
        opts.append(
          h(
            "button",
            {
              class: "choice",
              id: "c" + i + "-" + ci,
              onclick: (ev) => {
                if (opts.dataset.done) return;
                opts.dataset.done = "1";
                const ok = ci === q.answer;
                if (ok) right++;
                const k = q.kind || topicLabel(q.topic);
                byKind[k] = byKind[k] || [0, 0];
                byKind[k][1]++;
                if (ok) byKind[k][0]++;
                if (q.factId) gradeFact(q.factId, ok);
                ev.currentTarget.classList.add(ok ? "right" : "wrong");
                opts.children[q.answer].classList.add("right");
                progress.children[i].classList.add(ok ? "ok" : "miss");
                fb.hidden = false;
                fb.className = "feedback " + (ok ? "ok" : "miss");
                fb.append(h("strong", {}, ok ? "Correct. " : "Not quite. "), q.explain || "");
                fb.append(...citeQ(q));
                fb.append(
                  h(
                    "div",
                    { class: "fb-actions" },
                    h(
                      "button",
                      { class: "btn primary", id: "next-q", onclick: next },
                      i === qs.length - 1 ? "Finish" : "Next",
                    ),
                  ),
                );
                $("#next-q").focus();
              },
            },
            c,
          ),
        );
      });
      card.append(opts, fb);
      stage.append(card);
    }
    function next() {
      Audio.stop();
      i++;
      if (i < qs.length) showQ();
      else finish();
    }
    function finish() {
      const hist = history();
      if (!extraSeed) {
        const idx = hist.findIndex((x) => x.date === date && x.level === level);
        const rec = { date, level, right, n: qs.length, byKind };
        if (idx >= 0) hist[idx] = rec;
        else hist.push(rec);
      } else hist.push({ date, level, right, n: qs.length, byKind, extra: true });
      store.set("history", hist.slice(-400));
      stage.innerHTML = "";
      stage.append(
        h(
          "div",
          { class: "qcard done" },
          h("p", { class: "eyebrow" }, "Done"),
          h("p", { class: "big-score" }, right + " / " + qs.length),
          h(
            "p",
            {},
            right / qs.length >= 0.7
              ? "Above the 70% pass line."
              : "Below the 70% pass line. Missed facts come back tomorrow.",
          ),
          h(
            "div",
            { class: "fb-actions" },
            h(
              "button",
              {
                class: "btn primary",
                id: "extra-round",
                onclick: () => {
                  main.innerHTML = "";
                  viewDaily(main, String(Date.now()));
                },
              },
              "Extra round",
            ),
            h("a", { class: "btn", href: "#exam" }, "Practice exam items"),
          ),
        ),
      );
      const wp = $(".weak");
      if (wp) wp.replaceWith(weakPanel());
      refreshStats();
    }
    showQ();
  }
  function weakPanel() {
    const s = statsByKind();
    const box = h("section", { class: "weak" }, h("h3", {}, "Accuracy by topic (last 60 quizzes)"));
    if (!s.length) {
      box.append(h("p", { class: "muted" }, "Topics appear here after a few quizzes, weakest first."));
      return box;
    }
    const list = h("div", { class: "bars" });
    s.slice(0, 10).forEach((x) =>
      list.append(
        h(
          "div",
          { class: "bar-row" },
          h("span", { class: "bar-l" }, x.k),
          h(
            "span",
            { class: "bar-track" },
            h("span", {
              class: "bar-fill" + (x.pct < 0.7 ? " low" : ""),
              style: "width:" + Math.round(x.pct * 100) + "%",
            }),
          ),
          h("span", { class: "bar-n" }, Math.round(x.pct * 100) + "% · " + x.n),
        ),
      ),
    );
    box.append(list);
    return box;
  }

  // ---------- audio controls ----------
  function audioControls(a, opts) {
    opts = opts || {};
    const wrap = h("div", { class: "audio" });
    if (!Audio.available()) {
      wrap.append(h("span", { class: "muted" }, "Audio is not available in this browser."));
      return wrap;
    }
    const status = h("span", { class: "muted audio-status" });
    let timer = null;
    const play = () => {
      clearTimeout(timer);
      const dur = Audio.play(a.notes);
      status.textContent = "Playing…";
      timer = setTimeout(
        () => {
          status.textContent = "";
        },
        dur * 1000 + 300,
      );
    };
    const key = opts.tonicKey || a.tonicKey;
    if (key)
      wrap.append(
        h(
          "button",
          {
            class: "btn",
            onclick: () => {
              Audio.play(Audio.tonicChord(key, T));
            },
          },
          "Tonic chord",
        ),
      );
    wrap.append(h("button", { class: "btn primary", onclick: play }, "▶ Play"));
    wrap.append(
      h(
        "button",
        {
          class: "btn",
          onclick: () => {
            Audio.stop();
            status.textContent = "";
          },
        },
        "Stop",
      ),
    );
    wrap.append(status);
    return wrap;
  }

  const L_short = () => levelObj().short;
  // ---------- exercise card ----------
  function exerciseCard(item, spec, seed) {
    const [fn, o] = spec;
    const r = T.rng(seed);
    let ex;
    try {
      ex = Gen.G[fn](r, Object.assign({ level }, o));
    } catch (e) {
      return h("p", { class: "note" }, "Could not generate this one (" + e.message + "). Try again.");
    }
    const card = h("div", { class: "exercise" });
    card.append(h("p", { class: "ex-prompt" }, ex.prompt));
    card.append(
      cite(
        "Follows",
        L_short() + " " + item.id + ", " + item.name + ", in ",
        h("span", {}, reqLink(), ", " + REQUIREMENTS.pub),
      ),
    );
    if (Gen.SRC[fn]) card.append(cite("Rules", Gen.SRC[fn]));
    (ex.scores || []).forEach((s) => {
      const box = h("figure", { class: "score" });
      const div = h("div", { class: "abc" });
      box.append(div);
      if (s.caption) box.append(h("figcaption", {}, s.caption));
      card.append(box);
      requestAnimationFrame(() => renderScore(div, s.abc));
    });
    if (ex.audio) {
      card.append(audioControls(ex.audio, { tonicKey: ex.playTonic }));
      if (ex.repeats)
        card.append(
          h(
            "p",
            { class: "muted small-note" },
            "Exam procedure: tonic chord, then " + ex.repeats + " playings with 45 seconds between them.",
          ),
        );
    }
    if (ex.quiz) {
      ex.quiz.forEach((q, qi) => {
        const opts = h("div", { class: "choices compact" });
        q.choices.forEach((c, ci) =>
          opts.append(
            h(
              "button",
              {
                class: "choice",
                onclick: (e) => {
                  if (opts.dataset.done) return;
                  opts.dataset.done = 1;
                  e.currentTarget.classList.add(ci === q.answer ? "right" : "wrong");
                  opts.children[q.answer].classList.add("right");
                },
              },
              c,
            ),
          ),
        );
        card.append(h("div", { class: "mini-q" }, h("p", {}, qi + 1 + ". " + q.q), opts));
      });
    }
    if (ex.solution) {
      const sol = h("div", { class: "solution", hidden: true });
      if (ex.solution.text) sol.append(h("p", { class: "sol-text" }, ex.solution.text));
      const btn = h(
        "button",
        {
          class: "btn ghost",
          onclick: () => {
            sol.hidden = !sol.hidden;
            btn.textContent = sol.hidden ? "Show solution" : "Hide solution";
            if (!sol.hidden && !sol.dataset.r) {
              sol.dataset.r = 1;
              (ex.solution.scores || []).forEach((s) => {
                const f = h("figure", { class: "score" });
                const d = h("div", { class: "abc" });
                f.append(d);
                if (s.caption) f.append(h("figcaption", {}, s.caption));
                sol.append(f);
                renderScore(d, s.abc);
              });
            }
          },
        },
        "Show solution",
      );
      card.append(btn, sol);
    }
    return card;
  }

  function factBlock(topics, n, seed) {
    const r = T.rng(seed);
    const pool = r.shuffle(FACTS.filter((f) => topics.includes(f.topic))).slice(0, n);
    const wrap = h("div", { class: "exercise" });
    if (!pool.length) {
      wrap.append(h("p", { class: "muted" }, "The question bank for this topic is empty."));
      return wrap;
    }
    pool.forEach((f, qi) => {
      const q = factToQ(f, r);
      const opts = h("div", { class: "choices compact" });
      const fb = h("div", { class: "muted", hidden: true }, h("p", {}, q.explain || ""), ...citeQ(q));
      q.choices.forEach((c, ci) =>
        opts.append(
          h(
            "button",
            {
              class: "choice",
              onclick: (e) => {
                if (opts.dataset.done) return;
                opts.dataset.done = 1;
                e.currentTarget.classList.add(ci === q.answer ? "right" : "wrong");
                opts.children[q.answer].classList.add("right");
                fb.hidden = false;
                gradeFact(f.id, ci === q.answer);
              },
            },
            c,
          ),
        ),
      );
      wrap.append(h("div", { class: "mini-q" }, h("p", {}, qi + 1 + ". " + q.q), opts, fb));
    });
    return wrap;
  }

  // ---------- exam view ----------
  function viewExam(main) {
    const L = levelObj();
    const total = L.sections.reduce((s, sec) => s + sec.items.reduce((a, it) => a + it.pts, 0), 0);
    main.append(
      h(
        "div",
        { class: "view-head" },
        h("div", {}, h("p", { class: "eyebrow" }, "2027 requirements"), h("h2", {}, L.name + " (" + L.short + ")")),
        h(
          "dl",
          { class: "facts" },
          h("div", {}, h("dt", {}, "Exam"), h("dd", {}, L.date)),
          h("div", {}, h("dt", {}, "Apply"), h("dd", {}, L.deadline)),
          h("div", {}, h("dt", {}, "Fee"), h("dd", {}, L.fee)),
          h("div", {}, h("dt", {}, "Pass"), h("dd", {}, L.pass)),
        ),
      ),
    );
    const mockBtn = h(
      "button",
      {
        class: "btn primary",
        id: "mock-all",
        onclick: () => {
          const base = Math.floor(Math.random() * 9000) + 1000;
          main.querySelectorAll(".item").forEach((el, i) => {
            const b = el.querySelector(".gen-btn");
            if (b) b.dispatchEvent(new CustomEvent("gen", { detail: base * 31 + i }));
          });
          mockLabel.textContent = "Mock exam #" + base + " generated below.";
        },
      },
      "Generate a full mock exam",
    );
    const mockLabel = h("span", { class: "muted" }, "Or generate items one at a time.");
    main.append(h("div", { class: "toolbar" }, mockBtn, mockLabel));
    main.append(h("p", { class: "muted" }, L.where + " Total " + total + " points."));
    L.sections.forEach((sec) => {
      const s = h("section", { class: "exam-section" }, h("h3", {}, sec.name));
      sec.items.forEach((it) => s.append(itemRow(it)));
      main.append(s);
    });
  }
  function itemRow(it) {
    const row = h("article", { class: "item kind-" + it.kind, id: "item-" + it.id });
    const out = h("div", { class: "item-out" });
    row.append(
      h(
        "header",
        { class: "item-head" },
        h("span", { class: "item-id" }, it.id),
        h("span", { class: "item-name" }, it.name),
        h("span", { class: "item-pts" }, it.pts + " pts"),
      ),
    );
    row.append(h("p", { class: "item-guide" }, it.guide));
    const specs = it.gen ? [it.gen].concat(it.alt || []) : null;
    if (specs || it.topics) {
      let k = 0;
      const gen = (seed) => {
        out.innerHTML = "";
        if (it.topics) out.append(factBlock(it.topics, 6, seed));
        else {
          const spec = specs[k % specs.length];
          k++;
          out.append(exerciseCard(it, spec, seed));
        }
      };
      const b = h(
        "button",
        { class: "btn gen-btn", onclick: () => gen(Math.floor(Math.random() * 1e9)) },
        it.topics ? "Practice questions" : specs.length > 1 ? "New exercise (rotates options)" : "New exercise",
      );
      b.addEventListener("gen", (e) => gen(e.detail));
      row.append(h("div", { class: "item-actions" }, b), out);
    } else {
      row.append(
        h(
          "p",
          { class: "muted small-note" },
          it.kind === "rep"
            ? "Prepared repertoire: practice at the organ and record yourself."
            : "Prepared at the instrument; nothing to generate.",
        ),
      );
    }
    return row;
  }

  // ---------- plan view ----------
  function viewPlan(main) {
    const L = levelObj();
    const today = todayStr();
    const examDate = L.examDate;
    const days = daysBetween(today, examDate);
    const weeks = Math.max(1, Math.floor(days / 7));
    main.append(
      h(
        "div",
        { class: "view-head" },
        h("div", {}, h("p", { class: "eyebrow" }, "Study plan"), h("h2", {}, L.name + ": " + weeks + " weeks to go")),
        h("p", { class: "muted" }, "Based on " + fmtDate(today) + " → " + fmtDate(examDate) + "."),
      ),
    );
    const phases = [
      [
        "Foundation",
        0.35,
        "Learn the repertoire; start a daily 25-minute keyboard-skills block; take the daily quiz. Work one past exam's written items untimed each week.",
      ],
      [
        "Build",
        0.4,
        "Rotate every keyboard item through the week (below). One timed written item each weekend. Lessons or a coach every 2–3 weeks.",
      ],
      [
        "Mock exams",
        0.17,
        "A full section under exam conditions every week, alternating practical and written. Play repertoire on unfamiliar organs.",
      ],
      [
        "Taper",
        0.08,
        "Run repertoire in recital order; short keyboard-skill warmups only; review missed quiz topics; rest.",
      ],
    ];
    let cursor = today;
    const tl = h("ol", { class: "timeline" });
    phases.forEach(([nm, frac, txt], i) => {
      const len = i === phases.length - 1 ? Math.max(0, daysBetween(cursor, examDate)) : Math.round(days * frac);
      const end = addDays(cursor, len);
      tl.append(
        h(
          "li",
          {},
          h("div", { class: "tl-when" }, fmtDate(cursor) + " – " + fmtDate(end)),
          h("div", { class: "tl-what" }, h("strong", {}, nm), h("p", {}, txt)),
        ),
      );
      cursor = end;
    });
    main.append(h("section", { class: "plan-sec" }, h("h3", {}, "Phases"), tl));
    if (level !== "SPC" && level !== "FAGO")
      main.append(
        h(
          "p",
          { class: "note" },
          "Applications for the June 2027 exams open Jan. 1 and close Apr. 1, 2027. You can sit one section in 2027 and the other later; passed sections count for five years.",
        ),
      );

    // weekly rotation of keyboard + ear items
    const kb = L.sections.flatMap((s) => s.items).filter((it) => it.kind === "keyboard" || it.kind === "ear");
    const wr = L.sections.flatMap((s) => s.items).filter((it) => it.kind === "written" || it.kind === "knowledge");
    const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const grid = h("div", { class: "week" });
    daysOfWeek.forEach((d, i) => {
      const a = kb[i % Math.max(1, kb.length)],
        b = kb[(i + 3) % Math.max(1, kb.length)];
      const items = [a, b].filter((x, j, arr) => x && arr.indexOf(x) === j);
      grid.append(
        h(
          "div",
          { class: "day" },
          h("span", { class: "day-n" }, d),
          items.map((x) => h("span", { class: "chip" }, x.id + " " + x.name)),
          h("span", { class: "chip quiz" }, "Daily quiz"),
          i === 5 && wr.length ? h("span", { class: "chip written" }, "Timed: " + wr[0].id + "…") : null,
        ),
      );
    });
    main.append(
      h(
        "section",
        { class: "plan-sec" },
        h("h3", {}, "A practice week"),
        h(
          "p",
          { class: "muted" },
          "About 25 minutes of skills a day plus repertoire. Rotate through the written items on Saturdays.",
        ),
        grid,
      ),
    );

    const res = h("ul", { class: "res" });
    (RESOURCES[level] || []).concat(RESOURCES.common).forEach((x) => res.append(h("li", {}, x)));
    main.append(h("section", { class: "plan-sec" }, h("h3", {}, "Resources (AGO 2027 list and others)"), res));
  }

  // ---------- routing ----------
  const VIEWS = { daily: viewDaily, exam: viewExam, plan: viewPlan };
  function route() {
    Audio.stop();
    const v = (location.hash || "#daily").slice(1);
    const view = VIEWS[v] ? v : "daily";
    document
      .querySelectorAll(".tabs a")
      .forEach((a) => a.setAttribute("aria-current", a.getAttribute("href") === "#" + view ? "page" : "false"));
    const main = $("#main");
    main.innerHTML = "";
    VIEWS[view](main);
  }
  window.addEventListener("hashchange", route);
  drawKnobs();
  route();
  if (!FACTS.length) console.warn("No question bank loaded; daily quiz uses generated drills only.");
})();
