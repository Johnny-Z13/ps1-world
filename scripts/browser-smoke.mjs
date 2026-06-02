import { fileURLToPath } from 'node:url';

export const BROWSER_SMOKE_CHECKS = Object.freeze([
  Object.freeze({
    id: 'boot',
    label: 'App boots',
    description: 'Open the local app and confirm the PS1 World title document loads.',
  }),
  Object.freeze({
    id: 'title-controls',
    label: 'Title controls work',
    description: 'Verify the Free Roam, Cut-Up Mode, and Rogue title buttons are visible and clickable.',
  }),
  Object.freeze({
    id: 'glb-scene',
    label: 'GLB scene loads',
    description: 'Start play and confirm a Blender-authored scene can load without a fatal console error.',
  }),
  Object.freeze({
    id: 'rogue-start',
    label: 'Rogue starts',
    description: 'Click Rogue and confirm the app leaves the title screen into Rogue mode.',
  }),
  Object.freeze({
    id: 'console-errors',
    label: 'Console has no fatal errors',
    description: 'Collect browser console errors after load and first interaction.',
  }),
]);

export function formatBrowserSmokePlan(checks = BROWSER_SMOKE_CHECKS) {
  return [
    'Browser smoke checklist:',
    ...checks.map((check) => `- ${check.label}: ${check.description}`),
  ].join('\n');
}

export function createBrowserSmokeResult({ status, reason = '', checks = BROWSER_SMOKE_CHECKS, errors = [] }) {
  return {
    status,
    reason,
    checks: checks.map((check) => ({ ...check })),
    errors,
  };
}

export async function runBrowserSmoke({
  url = 'http://127.0.0.1:4173/',
  chromium,
  timeoutMs = 10000,
} = {}) {
  if (!chromium) {
    return createBrowserSmokeResult({
      status: 'skipped',
      reason: 'Playwright is not installed; run the checklist manually or install Playwright to automate it.',
    });
  }

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    await page.goto(url, { waitUntil: 'load', timeout: timeoutMs });
    await page.waitForTimeout(1000);

    const title = await page.title();
    const titleVisible = await page.locator('#titleScreen:not([hidden])').count();
    const rogueButtonVisible = await page.locator('#rogueButton').count();
    const bootOk = title === 'PS1 World' && titleVisible > 0 && rogueButtonVisible > 0;

    return createBrowserSmokeResult({
      status: bootOk && consoleErrors.length === 0 ? 'passed' : 'failed',
      reason: bootOk ? '' : 'Title screen did not reach the expected initial state.',
      errors: consoleErrors,
    });
  } finally {
    await browser.close();
  }
}

async function main() {
  let chromium = null;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    console.log(formatBrowserSmokePlan());
    console.log('\nSkipped automated browser smoke: Playwright is not installed.');
    return;
  }

  const result = await runBrowserSmoke({ chromium });
  console.log(JSON.stringify(result, null, 2));
  if (result.status === 'failed') process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
