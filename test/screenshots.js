// Opens the app in Chromium at desk and phone sizes, clicks through every view and a mock exam for every level,
// saves screenshots to test/*.png (not committed), and exits with an error if the page logs any error.
// Run from the repo root: `npm run screenshots`.
const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const errs = [];
  for (const [w, hgt, scheme, name] of [
    [1280, 900, "light", "desk"],
    [400, 860, "dark", "phone"],
  ]) {
    const p = await b.newPage({ viewport: { width: w, height: hgt }, colorScheme: scheme });
    p.on("pageerror", (e) => errs.push(name + ": " + e.message));
    p.on("console", (m) => {
      if (m.type() === "error") errs.push(name + " console: " + m.text());
    });
    await p.goto("file://" + process.cwd() + "/index.html#daily");
    await p.waitForTimeout(800);
    // answer all 12
    for (let i = 0; i < 12; i++) {
      await p.click(".choices .choice >> nth=0");
      await p.click("#next-q");
    }
    await p.screenshot({ path: `test/${name}-daily.png`, fullPage: false });
    await p.goto("file://" + process.cwd() + "/index.html#exam");
    await p.waitForTimeout(400);
    await p.click("#mock-all");
    await p.waitForTimeout(1500);
    const n = await p.$$eval(".exercise", (x) => x.length);
    const svgs = await p.$$eval(".abc svg", (x) => x.length);
    console.log(
      name,
      "exercises",
      n,
      "svgs",
      svgs,
      "overflowX",
      await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    );
    await p.screenshot({ path: `test/${name}-exam.png`, fullPage: false });
    await p.evaluate(() => document.querySelector("#item-A7").scrollIntoView());
    await p.waitForTimeout(200);
    await p.screenshot({ path: `test/${name}-a7.png` });
    await p.goto("file://" + process.cwd() + "/index.html#plan");
    await p.waitForTimeout(300);
    await p.screenshot({ path: `test/${name}-plan.png`, fullPage: true });
    // every level mock
    for (const L of ["SPC", "CAGO", "ChM", "FAGO"]) {
      await p.goto("file://" + process.cwd() + "/index.html#exam");
      await p.click("#knob-" + L);
      await p.waitForTimeout(200);
      await p.click("#mock-all");
      await p.waitForTimeout(900);
    }
  }
  console.log("errors", errs.slice(0, 20));
  await b.close();
  if (errs.length) process.exit(1);
})();
