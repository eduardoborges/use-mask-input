import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const URL = 'http://localhost:5173/';
const OUT = process.argv[2];
const SCENE = process.argv[3];

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 880, height: 620 },
  deviceScaleFactor: 2,
  recordVideo: { dir: OUT, size: { width: 880, height: 620 } },
});

const page = await context.newPage();
page.on('dialog', (d) => d.accept());

await page.goto(URL);
await page.waitForLoadState('networkidle');

/** Types slowly enough to read on screen. */
const type = async (locator, text, delay = 110) => {
  await locator.click();
  await locator.pressSequentially(text, { delay });
};

const beat = (ms = 800) => page.waitForTimeout(ms);

// Hide the sections that aren't part of this scene, so the recording frames
// one idea at a time instead of a wall of inputs.
async function only(indexes) {
  await page.evaluate((keep) => {
    document.querySelectorAll('section').forEach((s, i) => {
      s.style.display = keep.includes(i) ? '' : 'none';
    });
  }, indexes);
}

if (SCENE === 'masking') {
  await only([0, 1, 2, 4]);
  await beat(900);

  // a. plain alias
  await type(page.locator('section:visible input').nth(0), '12345678901');
  await beat();

  // b. alias with an option override
  await type(page.locator('section:visible input').nth(1), '25122026');
  await beat();

  // c. v-model + autoUnmask — the raw value below updates as you type
  await type(page.locator('section:visible input').nth(2), '98765432100');
  await beat(1400);

  // e. directive on a wrapper component
  await type(page.locator('section:visible input').nth(3), '12345678000199');
  await beat(1600);
} else {
  await only([5]);
  await beat(900);

  const input = page.locator('section:visible input').nth(0);

  // incomplete -> validation message
  await type(input, '11987');
  await beat(600);
  await page.locator('button[type=submit]').click();
  await beat(1600);

  // complete it -> message clears, field value stays unmasked.
  // Submitting moved focus away, so put the caret back at the end first;
  // a bare click would drop it wherever the pointer landed in the mask.
  await input.click();
  await input.press('End');
  await input.pressSequentially('654321', { delay: 110 });
  await beat(1400);

  // submit -> unmasked value
  await page.locator('button[type=submit]').click();
  await beat(1800);
}

await context.close();
await browser.close();
console.log('recorded ->', OUT);

/*
 * Regenerates the demo GIFs in .github/media.
 *
 * Lives here rather than in apps/vue-project because playwright is a
 * devDependency of this package, and node resolves imports from the script's
 * own directory.
 *
 *   pnpm --filter=vue-project dev
 *   node scripts/record-vue-demo.mjs /tmp/rec-masking masking
 *   node scripts/record-vue-demo.mjs /tmp/rec-vee vee
 *   ffmpeg -y -ss 1.6 -i /tmp/rec-masking/*.webm \
 *     -vf "fps=11,crop=iw*0.82:ih:0:0,scale=720:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=96[p];[s1][p]paletteuse=dither=bayer:bayer_scale=4" \
 *     ../../.github/media/vue-masking.gif
 */
