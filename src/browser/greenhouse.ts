import crypto from 'crypto';
import type { JobPosting, BoardConfig } from '../shared/types.js';

interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  updated_at: string;
  content?: string;
  departments?: Array<{ name: string }>;
  offices?: Array<{ name: string }>;
}

interface GreenhouseResponse {
  jobs: GreenhouseJob[];
}

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

  const requiredSection = lower.match(/(?:requirements?|qualifications?|must have)[^]*?(?=nice[-\s]to[-\s]have|preferred|bonus|$)/i)?.[0] ?? lower;
  const niceSection = lower.match(/(?:nice[-\s]to[-\s]have|preferred|bonus)[^]*/i)?.[0] ?? '';

  const required = KNOWN_SKILLS.filter((s) => requiredSection.includes(s));
  const niceToHave = KNOWN_SKILLS.filter((s) => niceSection.includes(s) && !required.includes(s));

  return { required, niceToHave };
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function matchesKeywords(title: string, description: string, keywords: string[]): boolean {
  const combined = `${title} ${description}`.toLowerCase();
  return keywords.some((kw) => combined.includes(kw.toLowerCase()));
}

export async function searchGreenhouse(
  board: BoardConfig,
  keywords: string[],
): Promise<JobPosting[]> {
  const boardToken = board.company;
  const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs?content=true`;

  const res = await fetch(apiUrl);
  if (!res.ok) throw new Error(`Greenhouse API error: ${res.status} for board "${boardToken}"`);

  const data = (await res.json()) as GreenhouseResponse;
  if (!Array.isArray(data.jobs)) {
    throw new Error(`Greenhouse board "${boardToken}" returned unexpected response shape`);
  }
  const jobs: JobPosting[] = [];

  for (const raw of data.jobs) {
    const rawText = stripHtml(raw.content ?? '');
    if (!matchesKeywords(raw.title, rawText, keywords)) continue;

    const { required, niceToHave } = extractSkills(rawText);

    jobs.push({
      id: crypto.createHash('sha1').update(raw.absolute_url).digest('hex').slice(0, 16),
      title: raw.title,
      company: board.company,
      url: raw.absolute_url,
      applyUrl: raw.absolute_url,
      ats: 'greenhouse',
      postedAt: raw.updated_at,
      rawText,
      requiredSkills: required,
      niceToHaveSkills: niceToHave,
      yearsRequired: extractYears(rawText),
    });
  }

  return jobs;
}
