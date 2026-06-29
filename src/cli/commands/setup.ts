import * as p from '@clack/prompts';
import pc from 'picocolors';
import { loadConfig, saveConfig, getOrCreateConfig } from '../../shared/config.js';
import type { AgentConfig } from '../../shared/types.js';

export async function setupCommand(): Promise<void> {
  p.intro(`${pc.bgBlue(' Ghost Agent ')} ${pc.dim('setup')}`);

  const existing = getOrCreateConfig();

  const apiKey = await p.password({
    message: 'Anthropic API key:',
    validate: (v) => (!v ? 'Required' : undefined),
  });
  if (p.isCancel(apiKey)) { p.outro('Cancelled.'); return; }

  p.log.step('Profile');

  const firstName = await p.text({ message: 'First name:', initialValue: existing.profile.firstName });
  if (p.isCancel(firstName)) { p.outro('Cancelled.'); return; }

  const lastName = await p.text({ message: 'Last name:', initialValue: existing.profile.lastName });
  if (p.isCancel(lastName)) { p.outro('Cancelled.'); return; }

  const email = await p.text({ message: 'Email:', initialValue: existing.profile.email });
  if (p.isCancel(email)) { p.outro('Cancelled.'); return; }

  const phone = await p.text({ message: 'Phone:', initialValue: existing.profile.phone });
  if (p.isCancel(phone)) { p.outro('Cancelled.'); return; }

  const location = await p.text({ message: 'Location (City, Country):', initialValue: existing.profile.location });
  if (p.isCancel(location)) { p.outro('Cancelled.'); return; }

  const linkedIn = await p.text({ message: 'LinkedIn URL:', initialValue: existing.profile.linkedIn });
  if (p.isCancel(linkedIn)) { p.outro('Cancelled.'); return; }

  const github = await p.text({ message: 'GitHub URL:', initialValue: existing.profile.github });
  if (p.isCancel(github)) { p.outro('Cancelled.'); return; }

  const portfolio = await p.text({ message: 'Portfolio URL:', initialValue: existing.profile.portfolio });
  if (p.isCancel(portfolio)) { p.outro('Cancelled.'); return; }

  const currentTitle = await p.text({ message: 'Current job title:', initialValue: existing.profile.currentTitle });
  if (p.isCancel(currentTitle)) { p.outro('Cancelled.'); return; }

  const yoe = await p.text({
    message: 'Years of experience:',
    initialValue: String(existing.profile.yearsOfExperience),
    validate: (v) => (isNaN(Number(v)) ? 'Enter a number' : undefined),
  });
  if (p.isCancel(yoe)) { p.outro('Cancelled.'); return; }

  const skillsInput = await p.text({
    message: 'Skills (comma-separated):',
    initialValue: existing.profile.skills.join(', '),
  });
  if (p.isCancel(skillsInput)) { p.outro('Cancelled.'); return; }

  const resumeText = await p.text({
    message: 'Paste a short resume summary (2-4 sentences):',
    initialValue: existing.profile.resumeText,
  });
  if (p.isCancel(resumeText)) { p.outro('Cancelled.'); return; }

  p.log.step('Search settings');

  const keywords = await p.text({
    message: 'Search keywords (comma-separated):',
    initialValue: existing.search.keywords.join(', '),
  });
  if (p.isCancel(keywords)) { p.outro('Cancelled.'); return; }

  const minFit = await p.text({
    message: 'Minimum fit score to queue (0-100):',
    initialValue: String(existing.search.minFitScore),
    validate: (v) => (isNaN(Number(v)) || Number(v) < 0 || Number(v) > 100 ? 'Enter 0-100' : undefined),
  });
  if (p.isCancel(minFit)) { p.outro('Cancelled.'); return; }

  const interval = await p.text({
    message: 'Check interval in minutes:',
    initialValue: String(existing.search.checkIntervalMinutes),
    validate: (v) => (isNaN(Number(v)) || Number(v) < 1 ? 'Enter a positive number' : undefined),
  });
  if (p.isCancel(interval)) { p.outro('Cancelled.'); return; }

  p.log.step('Job boards');
  p.log.info('Add Greenhouse board tokens (e.g. "anthropic" for boards.greenhouse.io/anthropic)');

  const ghBoards = await p.text({
    message: 'Greenhouse board tokens (comma-separated):',
    initialValue: existing.search.boards
      .filter((b) => b.ats === 'greenhouse')
      .map((b) => b.company)
      .join(', '),
    placeholder: 'anthropic, stripe, vercel',
  });
  if (p.isCancel(ghBoards)) { p.outro('Cancelled.'); return; }

  const loxoUrls = await p.text({
    message: 'Loxo board URLs (comma-separated, leave blank to skip):',
    initialValue: existing.search.boards
      .filter((b) => b.ats === 'loxo')
      .map((b) => b.url)
      .join(', '),
    placeholder: 'https://pod6.app.loxo.co/jobs/company',
  });
  if (p.isCancel(loxoUrls)) { p.outro('Cancelled.'); return; }

  const config: AgentConfig = {
    anthropicApiKey: apiKey,
    profile: {
      firstName,
      lastName,
      email,
      phone,
      location,
      linkedIn,
      github,
      portfolio,
      currentTitle,
      yearsOfExperience: Number(yoe),
      skills: skillsInput.split(',').map((s) => s.trim()).filter(Boolean),
      resumeText,
    },
    search: {
      keywords: keywords.split(',').map((s) => s.trim()).filter(Boolean),
      minFitScore: Number(minFit),
      checkIntervalMinutes: Number(interval),
      boards: [
        ...ghBoards
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .map((token) => ({
            ats: 'greenhouse' as const,
            url: `https://boards.greenhouse.io/${token}`,
            company: token,
          })),
        ...loxoUrls
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .map((raw) => {
            const url = raw.startsWith('http') ? raw : `https://${raw}`;
            let company = 'unknown';
            try {
              company = new URL(url).pathname.split('/').filter(Boolean).pop() ?? 'unknown';
            } catch {
              // Malformed URL — keep 'unknown' as company name
            }
            return { ats: 'loxo' as const, url, company };
          }),
      ],
    },
  };

  saveConfig(config);
  p.log.success(`Config saved.`);
  p.outro(`Run ${pc.cyan('ghost-agent watch --once')} to scan your boards.`);
}
