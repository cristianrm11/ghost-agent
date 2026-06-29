import { chromium, type Page } from 'playwright';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import type { JobPosting, UserProfile } from '../shared/types.js';

interface FilledField {
  label: string;
  value: string;
  confidence: 'high' | 'medium' | 'low';
  skipped: boolean;
}

const PROFILE_FIELD_MAP: Record<string, (profile: UserProfile) => string> = {
  'first': (p) => p.firstName,
  'firstname': (p) => p.firstName,
  'first_name': (p) => p.firstName,
  'last': (p) => p.lastName,
  'lastname': (p) => p.lastName,
  'last_name': (p) => p.lastName,
  'email': (p) => p.email,
  'phone': (p) => p.phone,
  'linkedin': (p) => p.linkedIn,
  'github': (p) => p.github,
  'portfolio': (p) => p.portfolio,
  'website': (p) => p.portfolio,
  'location': (p) => p.location,
  'city': (p) => p.location.split(',')[0]?.trim() ?? '',
};

function matchProfileField(
  label: string,
  profile: UserProfile,
): { value: string; confidence: 'high' | 'medium' | 'low' } | null {
  const key = label.toLowerCase().replace(/\s+/g, '').replace(/[^a-z_]/g, '');

  for (const [pattern, getter] of Object.entries(PROFILE_FIELD_MAP)) {
    if (key.includes(pattern)) {
      const value = getter(profile);
      if (value) return { value, confidence: 'high' };
    }
  }

  // Fuzzy: check if a profile key appears as a substring of any label word
  const words = label.toLowerCase().split(/\s+/);
  for (const word of words) {
    for (const [pattern, getter] of Object.entries(PROFILE_FIELD_MAP)) {
      if (word.includes(pattern)) {
        const value = getter(profile);
        if (value) return { value, confidence: 'medium' };
      }
    }
  }

  return null;
}

async function getFieldLabel(page: Page, selector: string): Promise<string> {
  return page.$eval(selector, (el) => {
    const id = el.id || el.getAttribute('name') || '';
    const label = document.querySelector(`label[for="${id}"]`);
    if (label) return label.textContent?.trim() ?? id;
    const aria = el.getAttribute('aria-label') || el.getAttribute('placeholder') || id;
    return aria;
  }).catch(() => '');
}

export async function fillApplication(
  job: JobPosting,
  profile: UserProfile,
): Promise<{ filled: FilledField[]; submitted: boolean }> {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  const filled: FilledField[] = [];
  let submitted = false;

  try {
    p.log.info(`Opening ${pc.cyan(job.applyUrl)}`);
    await page.goto(job.applyUrl, { waitUntil: 'networkidle', timeout: 30_000 });

    // Find all fillable inputs
    const inputs = await page.$$('input:not([type="hidden"]):not([type="submit"]):not([type="file"]), textarea');

    for (const input of inputs) {
      let tagName: string;
      try {
        tagName = await input.evaluate((el) => el.tagName.toLowerCase());
      } catch {
        // Handle detached from DOM if page re-renders between handle collection and iteration
        continue;
      }
      const type = await input.getAttribute('type') ?? 'text';
      if (['checkbox', 'radio', 'button', 'reset'].includes(type)) continue;

      const selector = await input.evaluate((el) => {
        const name = el.getAttribute('name');
        const id = el.id;
        if (id) return `#${CSS.escape(id)}`;
        if (name) return `[name="${CSS.escape(name)}"]`;
        return '';
      });

      if (!selector) continue;

      const label = await getFieldLabel(page, selector);
      if (!label) continue;

      const match = matchProfileField(label, profile);

      if (match) {
        // Show field + suggested value, ask for confirmation
        const answer = await p.select({
          message: `${pc.bold(label)}: ${pc.green(match.value)} ${pc.dim(`(${match.confidence} confidence)`)}`,
          options: [
            { value: 'fill', label: `Fill with "${match.value}"` },
            { value: 'edit', label: 'Edit value' },
            { value: 'skip', label: 'Skip this field' },
          ],
        });

        if (p.isCancel(answer)) break;

        let finalValue = match.value;

        if (answer === 'edit') {
          const custom = await p.text({
            message: `Enter value for "${label}":`,
            initialValue: match.value,
          });
          if (p.isCancel(custom)) break;
          finalValue = custom;
        }

        if (answer !== 'skip') {
          await page.fill(selector, finalValue);
          filled.push({ label, value: finalValue, confidence: match.confidence, skipped: false });
        } else {
          filled.push({ label, value: '', confidence: 'low', skipped: true });
        }
      } else if (tagName === 'textarea') {
        // Open-ended field
        const answer = await p.select({
          message: `${pc.bold(label)} ${pc.yellow('(open-ended)')}`,
          options: [
            { value: 'write', label: 'Write my own answer' },
            { value: 'skip', label: 'Skip for now' },
          ],
        });

        if (p.isCancel(answer)) break;

        if (answer === 'write') {
          const custom = await p.text({ message: `Answer for "${label}":` });
          if (!p.isCancel(custom) && custom) {
            await page.fill(selector, custom);
            filled.push({ label, value: custom, confidence: 'low', skipped: false });
          }
        } else {
          filled.push({ label, value: '', confidence: 'low', skipped: true });
        }
      }
    }

    // Confirm submit
    const skippedCount = filled.filter((f) => f.skipped).length;
    const filledCount = filled.filter((f) => !f.skipped).length;

    p.log.info(`${pc.green(`${filledCount} filled`)} · ${pc.yellow(`${skippedCount} skipped`)}`);

    const doSubmit = await p.confirm({
      message: 'Submit application now?',
      initialValue: false,
    });

    if (!p.isCancel(doSubmit) && doSubmit) {
      const submitBtn = page.locator('input[type="submit"], button[type="submit"]').first();
      await submitBtn.click();
      try {
        await page.waitForLoadState('networkidle', { timeout: 10_000 });
      } catch {
        // Analytics beacons can prevent networkidle — treat as submitted if click succeeded.
      }
      submitted = true;
      p.log.success('Application submitted.');
    } else {
      p.log.warn('Submission cancelled — application not sent.');
    }
  } finally {
    await browser.close();
  }

  return { filled, submitted };
}
