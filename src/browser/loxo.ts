import { chromium } from 'playwright';
import crypto from 'crypto';
import type { JobPosting, BoardConfig } from '../shared/types.js';

function extractYears(text: string): number {
  const match = text.match(/(\d+)\+?\s*years?/i);
  return match ? parseInt(match[1], 10) : 0;
}

function extractSkills(text: string): { required: string[]; niceToHave: string[] } {
  const KNOWN_SKILLS = [
    'typescript', 'javascript', 'python', 'rust', 'go', 'java', 'c++',
    'react', 'node', 'playwright', 'puppeteer', 'selenium',
    'chrome extension', 'browser automation', 'web scraping',
    'llm', 'openai', 'anthropic', 'claude', 'gpt',
    'aws', 'gcp', 'docker', 'kubernetes', 'sql', 'postgresql',
    'rest api', 'graphql', 'websocket',
  ];

  const lower = text.toLowerCase();
  const requiredSection = lower.match(/(?:requirements?|qualifications?|must have)[^]*?(?=nice.to.have|preferred|bonus|$)/i)?.[0] ?? lower;
  const niceSection = lower.match(/(?:nice.to.have|preferred|bonus)[^]*/i)?.[0] ?? '';

  const required = KNOWN_SKILLS.filter((s) => requiredSection.includes(s));
  const niceToHave = KNOWN_SKILLS.filter((s) => niceSection.includes(s) && !required.includes(s));

  return { required, niceToHave };
}

function matchesKeywords(title: string, description: string, keywords: string[]): boolean {
  const combined = `${title} ${description}`.toLowerCase();
  return keywords.some((kw) => combined.includes(kw.toLowerCase()));
}

export async function searchLoxo(
  board: BoardConfig,
  keywords: string[],
): Promise<JobPosting[]> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const jobs: JobPosting[] = [];

  try {
    await page.goto(board.url, { waitUntil: 'networkidle', timeout: 30_000 });

    // Collect all job links from the listing page
    const jobLinks = await page.$$eval(
      'a[href*="/job/"]',
      (els) => els.map((el) => ({
        title: (el as HTMLAnchorElement).textContent?.trim() ?? '',
        href: (el as HTMLAnchorElement).href,
      })),
    );

    const uniqueLinks = jobLinks.filter(
      (l, i, arr) => l.href && arr.findIndex((x) => x.href === l.href) === i,
    );

    for (const link of uniqueLinks) {
      if (!matchesKeywords(link.title, '', keywords)) continue;

      try {
        await page.goto(link.href, { waitUntil: 'networkidle', timeout: 20_000 });

        const rawText = await page.$eval(
          'body',
          (el) => (el as HTMLElement).innerText,
        ).catch(() => '');

        if (!matchesKeywords(link.title, rawText, keywords)) continue;

        const applyUrl = page.url().includes('/form')
          ? page.url()
          : `${link.href.split('?')[0]}/form`;

        const { required, niceToHave } = extractSkills(rawText);

        jobs.push({
          id: crypto.createHash('sha1').update(link.href).digest('hex').slice(0, 16),
          title: link.title,
          company: board.company,
          url: link.href,
          applyUrl,
          ats: 'loxo',
          postedAt: new Date().toISOString(),
          rawText: rawText.slice(0, 5000),
          requiredSkills: required,
          niceToHaveSkills: niceToHave,
          yearsRequired: extractYears(rawText),
        });
      } catch {
        // Skip individual job pages that fail to load
      }
    }
  } finally {
    await browser.close();
  }

  return jobs;
}
