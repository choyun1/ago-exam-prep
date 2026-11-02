/* 2027 AGO certification structure (from "AGO Professional Certification Requirements for 2027", TAO July 2026),
 * with study guidance and links to the generators that produce practice for each item.
 * Each level: examDate (YYYY-MM-DD, drives the countdown and study plan), display text (date, deadline, fee, where, pass),
 * and sections of items. Each item: id and points as in the requirements, kind (rep, service, keyboard, ear, written,
 * knowledge, choir), guide (study advice), and optionally gen: [generator name in js/generators.js, options] plus alt
 * (other options the "New exercise" button rotates through) or topics (question-bank topics for knowledge items). */
(function (root) {
  "use strict";
  const iv = { M2: [["up a major 2nd", 2], ["down a major 2nd", -2], ["up a minor 2nd", 1], ["down a minor 2nd", -1]] };
  iv.M3 = iv.M2.concat([["up a minor 3rd", 3], ["down a minor 3rd", -3], ["up a major 3rd", 4], ["down a major 3rd", -4]]);

  const LEVELS = [
    {
      id: "SPC", examDate: "2027-03-31", name: "Service Playing", short: "SPC", date: "Any date Oct. 1, 2026 – Mar. 31, 2027", deadline: "Application closes Mar. 1, 2027", fee: "$250",
      where: "Any chapter with a suitable organ (your own church organ is allowed) and a recording setup.",
      pass: "More than 50% on every item and more than 70% overall.",
      sections: [{ name: "Service (one sitting)", items: [
        { id: "S1", name: "Prelude repertoire", pts: 20, kind: "rep", guide: "One piece from List A, B, or C, polished. Record yourself weekly and listen the next day for steadiness and articulation." },
        { id: "S2", name: "Opening hymn in two transpositions", pts: 20, kind: "keyboard", gen: ["transposition", { intervals: iv.M2, count: 2, phrases: 2, embellish: 0 }], guide: "The booklet names the two keys. Practice each stanza in both keys until you can lead at tempo with no hesitation. Think in scale degrees and intervals, not new note names." },
        { id: "S3", name: "Psalm with singer", pts: 20, kind: "service", guide: "Accompany refrain and all verses as for a congregation. Rehearse with your actual singer; breathe with the text." },
        { id: "S4", name: "Anthem accompaniment", pts: 20, kind: "service", guide: "Play vocal parts where the accompaniment is tacet. Mark registration changes and cue points in your copy." },
        { id: "S5", name: "Middle hymn", pts: 20, kind: "service", guide: "Introduction plus three stanzas, pedal in at least one, contrast between stanzas, and the booklet harmonization for stanza 1." },
        { id: "S6", name: "Vocal solo: Fauré Pie Jesu", pts: 20, kind: "service", guide: "Rutter edition. Follow the score exactly; support the singer's breathing." },
        { id: "S7", name: "Offertory repertoire", pts: 20, kind: "rep", guide: "A second list piece, different from S1." },
        { id: "S8", name: "Sight-reading", pts: 20, kind: "keyboard", gen: ["sightReadGrand", {}], guide: "Graded on notes, rhythm, and steady tempo. Choose a tempo you can hold; keep going through mistakes." },
        { id: "S9", name: "Closing hymn", pts: 20, kind: "service", guide: "Same requirements as S5 with a third hymn." },
        { id: "S10", name: "Postlude repertoire", pts: 20, kind: "rep", guide: "The third list piece." }
      ] }]
    },
    {
      id: "CAGO", examDate: "2027-05-14", name: "Colleague", short: "CAGO", date: "Fri., Nov. 13, 2026 or Fri., May 14, 2027", deadline: "May sitting: application Jan. 1 – Mar. 1, 2027", fee: "$350 (section $200)",
      where: "Any chapter, on an organ you don't normally play.", pass: "More than 50% on every item and more than 70% per section.",
      sections: [
        { name: "Section 1: Practical", items: [
          { id: "C1", name: "Repertoire (Lists A, B, C)", pts: 60, kind: "rep", guide: "One piece from each list. The examiners hear registration as well as notes: plan registrations for an unfamiliar organ, with alternatives." },
          { id: "C2", name: "Choral accompaniment: Stanford Nunc dimittis in G", pts: 20, kind: "rep", guide: "Support a choir: steady tempo, clear entries, balance." },
          { id: "C3", name: "Vocal solo: Vaughan Williams \"The Call\"", pts: 20, kind: "rep", guide: "Phrasing and style; organ registration that doesn't cover the voice." },
          { id: "C4", name: "Two hymns", pts: 20, kind: "service", guide: "Introduction plus three stanzas each, pedal in at least one stanza, stanza 1 in the booklet harmonization." },
          { id: "C5", name: "Trio sight-reading", pts: 20, kind: "keyboard", gen: ["sightReadTrio", {}], guide: "Three staves at the marked tempo. Read trio sonata slow movements and Orgelbüchlein-level chorale preludes daily for 10 minutes." },
          { id: "C6", name: "Harmonization", pts: 20, kind: "keyboard", gen: ["harmonize", {}], guide: "Simple hymn tune, plainsong, or folk-style tune. Decide cadences first, then fill in the bass, then the inner voices." },
          { id: "C7", name: "Transposition (≤ M2)", pts: 20, kind: "keyboard", gen: ["transposition", { intervals: iv.M2, count: 1, phrases: 2 }], guide: "Four-part homophonic, up to 8 measures, at a steady moderate pace. Practice daily from a hymnal in random keys." },
          { id: "C8", name: "Improvisation", pts: 20, kind: "keyboard", gen: ["improv", { kind: "phrases" }], alt: [["improv", { kind: "bridge" }]], guide: "Choose: 8 measures in two phrases with modulation; 16 measures on a given motif; or a 30-second hymn bridge between keys. 30 minutes of piano preparation covers C6–C8." }
        ] },
        { name: "Section 2: Written (2 hours)", items: [
          { id: "C9", name: "Aural dictation: missing tones, two parts", pts: 20, kind: "ear", gen: ["dictation", { missing: true, phrases: 1 }], guide: "Tonic chord, one measure of metronome, then four playings with 45 seconds between. Fill the bass first, then soprano." },
          { id: "C10", name: "Aural perception", pts: 20, kind: "ear", gen: ["auralPerception", {}], guide: "Melodic score of the top part; questions on devices, cadences, harmonies, style. Listen to a lot of organ literature with the score." },
          { id: "C11", name: "Fugue analysis", pts: 20, kind: "written", gen: ["fugue", { analysis: true }], guide: "Key, entry order, tonal or real answer, countersubject, other devices. Analyze WTC fugue expositions." },
          { id: "C12", name: "Continuo realization (written)", pts: 20, kind: "written", gen: ["figuredBass", { written: true }], guide: "Three-voice right-hand chords over a figured bass, common-practice voice leading." },
          { id: "C13", name: "Composition analysis", pts: 20, kind: "written", gen: ["analysis", { level: "CAGO" }], guide: "Short binary or ternary piece: phrases, cadences, themes, chords; suggest composer and period." }
        ] }
      ]
    },
    {
      id: "AAGO", examDate: "2027-06-03", name: "Associateship", short: "AAGO", date: "Thu., June 3 – Fri., June 4, 2027", deadline: "Application Jan. 1 – Apr. 1, 2027", fee: "$475 (section $300)",
      where: "Practical at a designated exam center with two examiners; written may be taken at any chapter.", pass: "More than 50% on every item and more than 70% per section. Passed sections count for five years.",
      sections: [
        { name: "Section 1: Practical", items: [
          { id: "A1", name: "Repertoire (Lists A–D, one slow movement)", pts: 80, kind: "rep", guide: "Four pieces in recital order, exactly one marked slow movement. Have them performance-ready by March so April and May go to keyboard skills." },
          { id: "A2", name: "Hymn with interlude", pts: 20, kind: "service", guide: "Introduction, three stanzas, an interlude between 2 and 3 (may modulate). Prepare a written-out interlude you trust." },
          { id: "A3", name: "Open-score sight-reading (G and F clefs)", pts: 20, kind: "keyboard", gen: ["openScore", {}], guide: "Four staves. Read Bach chorales from open score and Renaissance motets daily. Keep outer voices accurate first; inner voices can simplify." },
          { id: "A4", name: "Harmonization: melody, then unfigured bass", pts: 20, kind: "keyboard", gen: ["harmonize", { mixed: true }], guide: "Part of the exercise gives a melody, part an unfigured bass. Spot cadences and their keys during the 30-minute prep." },
          { id: "A5", name: "Transposition with pedals (≤ M2)", pts: 20, kind: "keyboard", gen: ["transposition", { intervals: iv.M2, count: 1, phrases: 2, pedal: true }], guide: "Pedals required. You may play once in the original key. Practice hymns in every direction by half and whole step." },
          { id: "A6", name: "Improvisation", pts: 20, kind: "keyboard", gen: ["improv", { kind: "ground" }], alt: [["improv", { kind: "hymn" }], ["improv", { kind: "chant" }]], guide: "Choose: five or six variations on a ground, a hymn prelude, or a chant prelude. Prepare a set of reliable variation textures in advance." },
          { id: "A7", name: "Continuo realization (played)", pts: 20, kind: "keyboard", gen: ["figuredBass", {}], guide: "Bass and figures only; chorale or short instrumental movement. Read figures in three-voice right-hand chords, keeping the soprano smooth." }
        ] },
        { name: "Section 2: Written, part 1 (3 hours)", items: [
          { id: "A8", name: "Analysis", pts: 60, kind: "written", gen: ["analysis", { level: "AAGO" }], guide: "Composer and date, form, section/key/cadence chart, Roman-numeral analysis of a passage, short device questions. Recent exams used orchestral and keyboard scores." },
          { id: "A9", name: "Fugue exposition (3 voices)", pts: 40, kind: "written", gen: ["fugue", { voices: 3 }], guide: "Subject may begin in any voice and must appear in all three. A consistent countersubject is expected; no cadence required." }
        ] },
        { name: "Section 2: Written, part 2 (3 hours)", items: [
          { id: "A10", name: "Aural dictation: melody and two parts", pts: 30, kind: "ear", gen: ["dictation", { kind: "melody", phrases: 2 }], alt: [["dictation", { phrases: 1 }]], guide: "Tonic chord, metronome, four playings with 45 seconds between. Write rhythm first, then pitch by scale degree." },
          { id: "A11", name: "Aural perception (pre- and post-1750)", pts: 40, kind: "ear", gen: ["auralPerception", {}], guide: "Two organ excerpts, melodic and skeleton scores. Expect questions on registration (cornet, cromorne, voix humaine, strings, flutes), meter, cadences, final chord, composer and nationality." },
          { id: "A12", name: "Composition: complete a passage", pts: 30, kind: "written", gen: ["compositionStart", {}], guide: "Continue and conclude a given organ passage, stylistically consistent and idiomatic. Practice finishing chorale-prelude openings in 45 minutes." }
        ] }
      ]
    },
    {
      id: "ChM", examDate: "2027-06-02", name: "Choir Master", short: "ChM", date: "Wed., June 2, 2027", deadline: "Application Jan. 1 – Apr. 1, 2027", fee: "$500 (section $300)",
      where: "Practical at a designated exam center with a live ensemble; written at any chapter.", pass: "More than 50% on every item and more than 70% per section.",
      sections: [
        { name: "Section 1: Practical", items: [
          { id: "Ch1", name: "Rehearsal and direction", pts: 120, kind: "choir", gen: ["rehearsal", {}], guide: "Palestrina Sicut cervus/Sitivit, Brahms Geistliches Lied, and one of Britten Jubilate in C, Finzi I Praise the Tender Flower, or French Tantum ergo. Examiners choose sections; plan specific fixes for each." },
          { id: "Ch2", name: "Keyboard skills", pts: 60, kind: "keyboard", gen: ["progressions", {}], alt: [["harmonize", {}]], guide: "Harmonize a melody, play harmonic progressions, perform a booklet hymn. Practice progressions in all keys from Roman numerals." }
        ] },
        { name: "Section 2: Written (3 hours)", items: [
          { id: "Ch3", name: "Dictation and error detection", pts: 30, kind: "ear", gen: ["dictation", { phrases: 1 }], alt: [["errorDetection", {}]], guide: "Two-part dictation plus finding errors in a hymn-style passage." },
          { id: "Ch4", name: "Analysis of a choral work", pts: 20, kind: "written", gen: ["analysis", { level: "ChM" }], guide: "Form, harmony, compositional technique." },
          { id: "Ch5", name: "Gregorian chant", pts: 20, kind: "knowledge", topics: ["chant"], guide: "Modes, ranges, finals, dominants; reading and transcribing square notation." },
          { id: "Ch6", name: "Hymnody", pts: 20, kind: "knowledge", topics: ["hymnody"], guide: "Texts and tunes, history, repertoire." },
          { id: "Ch7", name: "Liturgy", pts: 20, kind: "knowledge", topics: ["liturgy"], guide: "Historic Western liturgies and at least one contemporary denominational practice." },
          { id: "Ch8", name: "Choir training", pts: 20, kind: "knowledge", topics: ["choir"], guide: "Vocal and musical development for adult and children's choirs." },
          { id: "Ch9", name: "Choral repertoire", pts: 20, kind: "knowledge", topics: ["choral-rep"], guide: "Literature for many ensembles and contexts." },
          { id: "Ch10", name: "General musical knowledge", pts: 20, kind: "knowledge", topics: ["history", "organ-rep"], guide: "Music history and literature." }
        ] }
      ]
    },
    {
      id: "FAGO", examDate: "2027-06-03", name: "Fellowship", short: "FAGO", date: "Thu., June 3 – Fri., June 4, 2027", deadline: "AAGO must be earned at least a year earlier", fee: "$475 (section $300)",
      where: "Practical at a designated exam center with two examiners; written at any chapter.", pass: "More than 50% on every item and more than 70% per section.",
      sections: [
        { name: "Section 1: Practical", items: [
          { id: "F1", name: "Repertoire (Lists A–D, one slow movement)", pts: 100, kind: "rep", guide: "Four pieces in recital order, exactly one slow movement." },
          { id: "F2", name: "Sight-reading (three staves)", pts: 20, kind: "keyboard", gen: ["sightReadTrio", { phrases: 3, maxAcc: 4, prompt: "Play at sight with manual and registration changes, appropriate tempo and phrasing." }], guide: "Manual and registration changes are expected." },
          { id: "F3", name: "Clef reading (C and F clefs)", pts: 20, kind: "keyboard", gen: ["openScore", { cClefs: true }], guide: "16th-century polyphony in C clefs; voices may cross. Read Palestrina and Victoria from original clefs." },
          { id: "F4", name: "Piano adaptation", pts: 20, kind: "keyboard", guide: "Arrange a piano accompaniment from a vocal score at sight for organ. Practice on oratorio vocal scores (Messiah, Elijah, Brahms Requiem)." },
          { id: "F5", name: "Transposition (≤ M3)", pts: 20, kind: "keyboard", gen: ["transposition", { intervals: iv.M3, count: 1, phrases: 2, pedal: true }], guide: "Up or down as far as a major third." },
          { id: "F6", name: "Improvisation: ternary form", pts: 20, kind: "keyboard", gen: ["improv", { kind: "ternary" }], guide: "3–4 minutes on a given theme with a contrasting, clearly identifiable secondary theme." }
        ] },
        { name: "Section 2: Written, part 1 (3½ hours)", items: [
          { id: "F7", name: "16th-century counterpoint", pts: 30, kind: "written", gen: ["cantusFirmus", {}], guide: "Complete a passage with text setting; at least one voice given." },
          { id: "F8", name: "Fugue: 4-voice exposition + episode", pts: 40, kind: "written", gen: ["fugue", { voices: 4, episode: true }], guide: "Consistent countersubject in invertible counterpoint, then an episode to an entry in a related key." },
          { id: "F9", name: "Essay: the American Symphonic Organ", pts: 30, kind: "written", gen: ["essay", {}], guide: "One of three topics on its development and associated repertoire." }
        ] },
        { name: "Section 2: Written, part 2 (3½ hours)", items: [
          { id: "F10", name: "Dictation: four parts and two-part counterpoint", pts: 30, kind: "ear", gen: ["dictation", { kind: "four", phrases: 1, embellish: 0.2 }], alt: [["dictation", { phrases: 1, embellish: 0.6 }]], guide: "Four playings with 45 seconds between." },
          { id: "F11", name: "Orchestration", pts: 40, kind: "written", gen: ["orchestration", {}], guide: "Specified instruments; transpositions and ranges must be right." },
          { id: "F12", name: "Composition for voices", pts: 30, kind: "written", gen: ["choralComposition", {}], guide: "Unaccompanied voices on a given text; imagination and structural clarity." }
        ] }
      ]
    }
  ];

  // daily-quiz mix per level: fact topics and drill kinds with weights
  const DAILY = {
    // SPC is played entirely at the console (S1–S10), so its quiz is keyboard-skill drills only.
    SPC: { facts: [], drills: [["transposeKey", 4], ["keySignature", 3], ["interval", 1]],
      note: "The SPC is all at the console: there is no written or general-knowledge section. This quiz only drills the keys you need for the S2 transpositions." },
    // CAGO's written section (C9–C13) is ear tests, fugue analysis, continuo, and form analysis: no general-knowledge questions.
    CAGO: { facts: [["theory", 2], ["fugue", 2]], drills: [["figuredToRoman", 3], ["tonalAnswer", 2], ["earCadence", 2], ["earChord", 1], ["earInterval", 1], ["interval", 1], ["transposeKey", 2], ["keyRelations", 1]],
      note: "The CAGO written section (2 hours) covers dictation, aural perception, fugue analysis, continuo, and form analysis only, so this quiz sticks to those skills." },
    AAGO: { facts: [["registration", 3], ["organ-rep", 3], ["organ-history", 2], ["theory", 1], ["fugue", 1], ["performance", 1]], drills: [["figuredToRoman", 3], ["tonalAnswer", 2], ["earCadence", 2], ["earChord", 2], ["earInterval", 1], ["transposeKey", 2], ["mutation", 1], ["clefReading", 1]] },
    ChM: { facts: [["chant", 3], ["hymnody", 3], ["liturgy", 3], ["choir", 2], ["choral-rep", 3], ["history", 1]], drills: [["chantMode", 3], ["earCadence", 1], ["earChord", 1], ["figuredToRoman", 1], ["keyRelations", 1]] },
    FAGO: { facts: [["orchestration", 2], ["counterpoint", 2], ["organ-history", 2], ["organ-rep", 2], ["registration", 1], ["history", 1]], drills: [["orchestral", 3], ["clefReading", 3], ["tonalAnswer", 2], ["earChord", 2], ["figuredToRoman", 1], ["chantMode", 1]] }
  };

  const RESOURCES = {
    common: ["Past exams with solutions, ear-test audio, and webinars: agohq.org → Certification (Document Center).", "Joyce Shupe Kull, \"100 Strategies for Successful AGO Certification\".", "Aural training: Auralia, EarMaster, or teoria.com exercises."],
    CAGO: ["2027 CAGO Study Guide (AGO).", "Harmonization: Frackenpohl, Harmonization at the Piano.", "Transposition: Lang, Transposition at the keyboard; TAO articles by Grinnell and Hall."],
    AAGO: ["Continuo: Arnold, The Art of Accompaniment from a Thorough-Bass; Christensen; Keaney.", "Fugue: Gauldin, A Practical Approach to 18th-Century Counterpoint; Oldroyd; Hilse's TAO articles.", "Improvisation: Brillhart; Dupré; Hancock; Lanning; Overduin.", "Sight-reading: Gleason; Sutton; Hall, \"Ten Tips on Sight-Reading\".", "AGO webinars: Fugue (2023–24), Ear Tests (2024), Compositional Techniques (2024), Transposition (2023)."],
    ChM: ["Chant: Hiley, Gregorian Chant; Berry; Pugsley.", "Hymnody: Hymnal 1982 Companion; Eskew and McElrath; Routley; Watson; hymnary.org.", "Liturgy: Jones/Wainwright/Yarnold, The Study of Liturgy; White; Westermeyer.", "Choral repertoire: Jeffers; Shrock; Ulrich."],
    FAGO: ["Counterpoint: Jeppesen; Gauldin; Soderlund.", "Orchestration: Adler; Kennan and Grantham; Piston.", "Score reading: Morris/Ferguson; Creuzburg; Bach chorales.", "Piano adaptation: Buck; Ellingford; Ritchie and Stauffer."]
  };

  // The document every exam item in LEVELS follows; item ids (S1, C7, A5, …) are the document's own.
  const REQUIREMENTS = {
    title: "AGO Professional Certification Requirements for 2027",
    pub: "The American Organist, July 2026",
    url: "https://www.agohq.org/common/Uploaded%20files/Website%20Files/2026/2026-27%20AGO%20Professional%20Certification%20Requirements_.pdf"
  };

  root.AGO_LEVELS = { LEVELS, DAILY, RESOURCES, REQUIREMENTS };
  if (typeof module !== "undefined") module.exports = root.AGO_LEVELS;
})(typeof window !== "undefined" ? window : globalThis);
