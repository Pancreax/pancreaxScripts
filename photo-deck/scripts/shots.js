// Screenshot and verify every slide of a built deck.
//
//   npm install playwright          (PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 is fine —
//                                    this drives the Chrome already installed)
//   node shots.js deck.html [slide numbers...]
//
// Writes shots/slide-NN.png beside the deck and reports three things:
//   overflow  — content pushed outside its slide, which overflow:hidden then clips
//   crop      — how much of each photograph the layout is throwing away
//   errors    — anything the page logged or threw
//
// Read the screenshots. Every layout bug in PITFALLS.md passed this check and
// was caught by looking.

const path = require('path');
const fs = require('fs');

// Resolve playwright from wherever it was installed — usually the deck's own
// working directory, not this skill folder.
const { chromium } = (() => {
  for (const id of ['playwright', 'playwright-core',
                    path.join(process.cwd(), 'node_modules', 'playwright'),
                    path.join(process.cwd(), 'node_modules', 'playwright-core')]) {
    try { return require(id); } catch { /* keep looking */ }
  }
  console.error('shots: playwright not found. In the deck directory run:\n' +
                '  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install playwright');
  process.exit(1);
})();

const DECK = path.resolve(process.argv[2] || 'deck.html');
const WANT = process.argv.slice(3).map(Number).filter(Boolean);
const OUT = path.join(path.dirname(DECK), 'shots');
const W = Number(process.env.DECK_W || 1440);
const H = Number(process.env.DECK_H || 810);
const FOOTER = Number(process.env.DECK_FOOTER || 0); // px of fixed chrome at the bottom

if (!fs.existsSync(DECK)) {
  console.error(`shots: no deck at ${DECK}`);
  process.exit(1);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: W, height: H } });

  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));

  await page.goto('file://' + DECK, { waitUntil: 'load' });
  await page.waitForTimeout(400);

  const n = await page.locator('.slide').count();
  if (!n) {
    console.error('shots: found no .slide elements — is this a deck?');
    await browser.close();
    process.exit(1);
  }

  const list = WANT.length ? WANT : Array.from({ length: n }, (_, i) => i + 1);
  for (const i of list) {
    await page.evaluate(k => {
      document.querySelectorAll('.slide')[k - 1]
        .scrollIntoView({ behavior: 'instant', block: 'start' });
    }, i);
    await page.waitForTimeout(320);
    await page.screenshot({ path: path.join(OUT, `slide-${String(i).padStart(2, '0')}.png`) });
  }

  const report = await page.evaluate(footer => {
    const slides = [...document.querySelectorAll('.slide')];
    const label = el => (el.alt || el.textContent || el.tagName).trim().slice(0, 38);

    const overflow = [];   // clipped by the slide box — always a bug
    const buried = [];     // hidden under fixed footer chrome — a bug unless opted out
    const crop = [];       // how much of a photograph `cover` discards
    const letterbox = [];  // how much dead space `contain` leaves
    const noAlt = [];

    slides.forEach((s, i) => {
      const sb = s.getBoundingClientRect();

      // Walk every in-flow descendant rather than one named container: a check
      // written against a single slide's structure silently skips every other
      // structure, and reports success for the slides it never looked at.
      s.querySelectorAll('*').forEach(el => {
        const cs = getComputedStyle(el);
        if (cs.position === 'absolute' || cs.position === 'fixed') return;
        if (cs.display === 'none' || cs.visibility === 'hidden') return;
        const b = el.getBoundingClientRect();
        if (b.width < 2 || b.height < 2) return;

        const past = Math.max(Math.round(sb.top - b.top), Math.round(b.bottom - sb.bottom));
        if (past > 4) overflow.push({ slide: i + 1, px: past, el: label(el) });

        // Elements that deliberately run under the footer opt out with data-bleed.
        if (footer && !el.closest('[data-bleed]')) {
          const under = Math.round(b.bottom - (sb.bottom - footer));
          if (under > 4) buried.push({ slide: i + 1, px: under, el: label(el) });
        }
      });

      s.querySelectorAll('img').forEach(img => {
        if (!img.alt.trim()) noAlt.push(i + 1);
        if (!img.naturalWidth) return;
        const b = img.getBoundingClientRect();
        if (b.width < 8 || b.height < 8) return;
        const nat = img.naturalWidth / img.naturalHeight;
        const box = b.width / b.height;
        const fit = getComputedStyle(img).objectFit;
        const pct = Math.round(100 * (1 - Math.min(nat, box) / Math.max(nat, box)));
        if (pct < 12) return;
        (fit === 'contain' ? letterbox : crop).push({ slide: i + 1, pct, img: label(img) });
      });
    });

    return { overflow, buried, crop, letterbox, noAlt: [...new Set(noAlt)] };
  }, FOOTER);

  const show = (k, v, unit) => v.length
    ? v.map(x => `s${x.slide}:${x.px ?? x.pct}${unit}${x.el || x.img ? ` (${x.el || x.img})` : ''}`).join('  ')
    : 'none';

  console.log(`slides:     ${n}  → ${path.relative(process.cwd(), OUT)}/`);
  console.log(`overflow:   ${show('overflow', report.overflow, 'px')}`);
  console.log(`under foot: ${show('buried', report.buried, 'px')}`);
  console.log(`crop:       ${show('crop', report.crop, '%')}`);
  console.log(`letterbox:  ${show('letterbox', report.letterbox, '%')}`);
  console.log(`missing alt:${report.noAlt.length ? ' ' + report.noAlt.join(', ') : ' none'}`);
  console.log(`js errors:  ${errors.length ? errors.join(' | ') : 'none'}`);
  if (report.buried.length) {
    console.log('\nnote: add data-bleed to anything meant to run under the footer.');
  }
  console.log('crop and letterbox are informational — decide per photo. Now read the screenshots.');

  await browser.close();
  process.exit(report.overflow.length || report.buried.length || errors.length ? 1 : 0);
})();
