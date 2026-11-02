# AGO Exam Prep

Practice for the American Guild of Organists certification exams: Service Playing (SPC), Colleague (CAGO), Associateship (AAGO), Choir Master (ChM), and Fellowship (FAGO), following the **2027** published requirements.

Open `index.html` in a browser, or serve the folder with GitHub Pages. There is no build step and no server.

## What it does

- **Daily quiz:** 12 questions a day for the selected level, half from a curated bank of about 300 knowledge questions (chant, hymnody, liturgy, registration, organ history and repertoire, choral repertoire, orchestration) and half from generated drills (figured bass, intervals, C clefs, tonal answers, transposition keys, chant modes, orchestral transpositions, and ear training for cadences, chord qualities, and intervals with built-in organ-tone playback). Missed questions come back the next day; known ones space out to 3, 7, 21, and 60 days. Progress is stored in your browser.
- **Exam items:** every item of every exam with points, format, and study advice. Items that can be generated produce a new exercise each time, with a solution: open-score and trio sight-reading, transposition, figured-bass realization, melody/unfigured-bass harmonization, progressions, dictation with audio, error detection, fugue subjects with computed tonal or real answers, ground basses, modulating-phrase and ternary improvisation themes, cantus firmi, analysis assignments, essay and orchestration prompts, and ChM rehearsal scenarios. "Generate a full mock exam" fills every item at once.
- **Study plan:** a phased timeline from today to the exam date, a weekly rotation of keyboard skills, and the AGO's 2027 resource list.

## How the music is generated

`js/harmony.js` builds functional progressions (including cadential 6/4, applied dominants, and pivot-chord modulations) and voices them in four parts with dynamic programming over voice-leading costs. Parallel fifths and octaves, hidden outer-voice perfect intervals, augmented melodic intervals, unresolved leading tones and sevenths, doubled leading tones, voice overlap, and bad spacing are rejected outright. Figures are derived from the voiced chord against the key signature. `test/check_voicing.js` checks generated passages for parallels.

## Files

| Path | Contents |
|---|---|
| `js/theory.js` | pitches, keys, intervals, chord spelling, seeded RNG |
| `js/harmony.js` | progression grammar, SATB voicing, figured bass, ABC output |
| `js/generators.js` | exam-item exercise generators |
| `js/drills.js` | auto-graded daily drills |
| `js/levels.js` | 2027 requirements, study advice, daily mix per level |
| `js/facts.js` | the knowledge-question bank (original wording) |
| `js/audio.js` | small additive organ synth (Web Audio) |
| `js/app.js` | interface |

`python3 -I scripts/build-single.py` writes `dist/ago-prep.html`, a single self-contained file.

## Copyright note

Past AGO exams are copyrighted by the American Guild of Organists and are **not** included. Get them from agohq.org (Certification → Document Center). `.gitignore` excludes PDFs and a `past-exams/` folder so a local archive can't be committed by accident. All questions here are newly written.

Not affiliated with or endorsed by the AGO. Always confirm requirements, dates, and fees at agohq.org.

## License

MIT
