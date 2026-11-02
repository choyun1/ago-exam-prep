const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport:{width:400,height:900}, colorScheme:'dark' });
  await p.goto('file://'+process.cwd()+'/index.html#exam'); await p.waitForTimeout(300);
  await p.click('#mock-all'); await p.waitForTimeout(1200);
  for (const id of ['A3','A9']) { await p.evaluate(i=>document.querySelector('#item-'+i).scrollIntoView(), id); await p.waitForTimeout(150); await p.screenshot({path:`test/ph-${id}.png`}); }
  await b.close();
})();
