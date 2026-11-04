# AGO Exam Prep

Practice for the American Guild of Organists certification exams: Service Playing (SPC), Colleague (CAGO), Associateship (AAGO), Choir Master (ChM), and Fellowship (FAGO), following the **2027** published requirements.

The levels are separate exams, not a ladder: SPC, CAGO, AAGO, and ChM can be taken in any order, and the FAGO needs the AAGO held at least a year first. Each level's exam page shows this.

Use it online at https://choyun1.github.io/ago-exam-prep/, or open `index.html` in a browser. There is no build step and no server.

## Running it

- **In a browser:** clone or download the repository and open `index.html`. Everything, including the abcjs score renderer in `vendor/`, is local, so it works offline.
- **As one file:** `npm run build` writes `dist/ago-exam-prep.html`, which you can copy to a tablet or phone and open directly.
- **On GitHub Pages:** in the repository's **Settings → Pages**, set the source to _Deploy from a branch_, branch `main`, folder `/ (root)`. GitHub publishes the site at `https://<user>.github.io/ago-exam-prep/` a minute or two after each push to `main`. No workflow or build is needed, because the site is the repository's static files.

Progress (quiz history, streak, review schedule, chosen level) is kept in the browser's `localStorage` under keys starting `agoprep:`. It stays on that device and browser; clearing site data resets it.

## What it does

- **Daily quiz:** 12 questions a day for the selected level, half from a curated bank of about 300 knowledge questions (chant, hymnody, liturgy, registration, organ history and repertoire, choral repertoire, orchestration) and half from generated drills (figured bass, intervals, C clefs, tonal answers, transposition keys, chant modes, orchestral transpositions, and ear training for cadences, chord qualities, and intervals with built-in organ-tone playback). Missed questions come back the next day; right answers space out to 3, 7, 16, 35, and 90 days. Reviews take at most half of a quiz's knowledge questions so new ones keep coming, no question repeats on the same day (extra rounds included), and look-alike questions (such as the reciting tones of two modes) never share a quiz. When nothing new or due is left, drills fill the gap. Progress is stored in your browser.
- **Exam items:** every item of every exam with points, format, and study advice. Items that can be generated produce a new exercise each time, with a solution: open-score and trio sight-reading, transposition, figured-bass realization, melody/unfigured-bass harmonization, progressions, dictation with audio, error detection, fugue subjects with computed tonal or real answers, ground basses, modulating-phrase and ternary improvisation themes, cantus firmi, analysis assignments, essay and orchestration prompts, and ChM rehearsal scenarios. "Generate a full mock exam" fills every item at once.
- **Study plan:** a phased timeline from today to the exam date, a weekly rotation of keyboard skills, and the AGO's 2027 resource list.

## Citations

Every question and exercise shows where its answer comes from.

- **Knowledge questions** (`js/facts.js`) each carry a `src`: a standard reference that supports the answer, usually a Grove Music Online article, the Canterbury Dictionary of Hymnology, the Book of Common Prayer, Stevens Irwin's _Dictionary of Pipe Organ Stops_, Douglass's _Language of the Classical French Organ_, Adler's _Study of Orchestration_, or a standard harmony or counterpoint text. Citations are to the article or entry, not a page.
- **Daily drills** (`js/drills.js`) cite the rule they apply and the 2027 exam items they train.
- **Generated exercises** (`js/generators.js`) cite the exam item they follow in the _AGO Professional Certification Requirements for 2027_ (The American Organist, July 2026) and the voice-leading or counterpoint rules the generator enforces.

`test/smoke.js` fails if a question, drill, or generator has no citation.

The daily quiz only asks what each exam tests. The SPC is played entirely at the console, so it has no daily quiz and opens on its exam items. The CAGO written section (C9–C13) is ear tests, fugue analysis, continuo, and form analysis, so its quiz has no general-knowledge questions.

## How the music is generated

`js/harmony.js` builds functional progressions (including cadential 6/4, applied dominants, and pivot-chord modulations) in phrases of varying length, and voices them in four parts with dynamic programming over voice-leading costs. Parallel fifths and octaves, hidden outer-voice perfect intervals, augmented melodic intervals, unresolved leading tones and sevenths, doubled leading tones, voice overlap, and bad spacing are rejected outright. Upper voices are then decorated with passing tones, neighbor tones, and prepared 4–3, 7–6, and 9–8 suspensions. Figures are derived from the voiced chord against the key signature, with suspensions written as 4–3, 7–6, or 9–8.

Fugue answers are computed from the subject: real answers move up a perfect 5th; tonal answers answer ^5 with ^1 (and ^1 with ^5) and change over to the dominant at the first leap after the head.

## Editing

- **Questions:** `js/facts.js`, one question per line. `answer` is the exact text of the right choice, so choices can be reordered freely. Every question needs a `src`.
- **Exam requirements and daily mix:** `js/levels.js`. `examDate` drives the countdown and study plan; `gen` names the generator in `js/generators.js` that makes practice for an item.
- **Fugue subjects and ground basses:** `SUBJECTS` and `GROUNDS` in `js/generators.js`, written as scale-degree tokens explained in the comment above them.
- **Short names** (`L`, `a`, `o`, `dia`, `ds`, `ss`) are explained at the top of `js/theory.js`.

## Tests

`npm test` (Node 18 or later, nothing to install) runs:

- `test/smoke.js`: every generator and drill runs for 25 seeds; every question has a valid answer and a source.
- `test/quiz.js`: simulates four months of daily quizzes per level and checks that nothing repeats the same day, look-alike questions never share a quiz, a right answer never returns the next day, and the first month reaches most of the bank.
- `test/check_voicing.js`: 200 voiced passages have no parallel 5ths or octaves.
- `test/music.js`: every generated score has whole bars and no wrong double sharps or flats; every fugue answer keeps its subject's shape; decorated passages have no parallels on any eighth note and every suspension resolves down by step.

`npm run screenshots` opens the app in Chromium (needs Playwright) and saves screenshots of every view to `test/`.

## Files

| Path                        | Contents                                                        |
| --------------------------- | --------------------------------------------------------------- |
| `js/theory.js`              | pitches, keys, intervals, chord spelling, seeded RNG            |
| `js/harmony.js`             | progression grammar, SATB voicing, figured bass, ABC output     |
| `js/generators.js`          | exam-item exercise generators                                   |
| `js/drills.js`              | auto-graded daily drills                                        |
| `js/levels.js`              | 2027 requirements, study advice, daily mix per level            |
| `js/facts.js`               | the knowledge-question bank (original wording)                  |
| `js/quiz.js`                | which knowledge questions go into a quiz, and spaced repetition |
| `js/audio.js`               | small additive organ synth (Web Audio)                          |
| `js/app.js`                 | interface                                                       |
| `vendor/abcjs-basic-min.js` | abcjs, renders ABC notation as scores                           |
| `scripts/build-single.py`   | single-file build                                               |
| `test/`                     | tests and the screenshot script                                 |

`npm run build` (or `python3 -I scripts/build-single.py`) writes `dist/ago-exam-prep.html`, a single self-contained file. `dist/` is git-ignored.

## Copyright note: never commit past exams

Past AGO exams and the AGO's PDFs are copyrighted by the American Guild of Organists. They are **not** included and must **never** be committed to this repository, not even in a branch or pull request, because git history keeps them after deletion. Get them from agohq.org (Certification → Document Center) and keep them outside the repository or in a local `past-exams/` folder. `.gitignore` excludes `*.pdf` and `past-exams/` so a local archive can't be added by accident; don't force-add around it. Every question and exercise here is newly written, and generated exercises follow the published requirements rather than copying exam papers.

Not affiliated with or endorsed by the AGO. Always confirm requirements, dates, and fees at agohq.org.

## License

[MIT](LICENSE), © 2026 Adrian Cho. The bundled `vendor/abcjs-basic-min.js` is [abcjs](https://github.com/paulrosen/abcjs), also MIT-licensed. The license covers this code and the newly written questions, not AGO materials.
