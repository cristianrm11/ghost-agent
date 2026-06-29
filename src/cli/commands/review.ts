import * as p from '@clack/prompts';
import pc from 'picocolors';
import { loadConfig } from '../../shared/config.js';
import { memory } from '../../agent/memory.js';

function scoreColor(score: number): string {
  if (score >= 85) return pc.green(`${score}%`);
  if (score >= 70) return pc.cyan(`${score}%`);
  if (score >= 55) return pc.yellow(`${score}%`);
  return pc.red(`${score}%`);
}

function recLabel(rec: string): string {
  if (rec === 'apply') return pc.green('● apply');
  if (rec === 'consider') return pc.yellow('◐ consider');
  return pc.red('○ skip');
}

export async function reviewCommand(): Promise<void> {
  loadConfig(); // ensure config exists

  p.intro(`${pc.bgBlue(' Ghost Agent ')} ${pc.dim('review queue')}`);

  const queued = memory.getQueuedJobs();

  if (queued.length === 0) {
    p.log.warn('No queued jobs. Run: ghost-agent watch --once');
    p.outro('');
    return;
  }

  p.log.info(`${pc.cyan(String(queued.length))} job(s) waiting for your review`);

  for (const { job, fit, application } of queued) {
    p.log.message('');
    p.log.message(`${pc.bold(job.title)}  ·  ${pc.dim(job.company)}  ·  ${scoreColor(fit.score)} fit  ·  ${recLabel(fit.recommendation)}`);
    p.log.message(pc.dim(`  ${fit.reasoning}`));

    if (fit.skillMatches.length > 0) {
      p.log.message(`  ${pc.green('✔')} ${fit.skillMatches.join(', ')}`);
    }
    if (fit.skillGaps.length > 0) {
      p.log.message(`  ${pc.red('✘')} missing: ${fit.skillGaps.join(', ')}`);
    }
    if (fit.yearsGap < 0) {
      p.log.message(`  ${pc.yellow('!')} YOE gap: ${Math.abs(fit.yearsGap)} year(s) under requirement`);
    }

    const action = await p.select({
      message: 'What would you like to do?',
      options: [
        { value: 'apply', label: `Apply  (opens browser → ${job.applyUrl.slice(0, 60)}...)` },
        { value: 'skip', label: 'Skip this job' },
        { value: 'later', label: 'Remind me later (keep in queue)' },
      ],
    });

    if (p.isCancel(action)) break;

    if (action === 'skip') {
      memory.updateApplicationStatus(application.id, 'rejected', 'Skipped in review');
      p.log.warn('Skipped.');
    } else if (action === 'apply') {
      p.outro(`Run: ${pc.cyan(`ghost-agent apply ${application.id}`)}`);
      return;
    }
    // 'later' — leave status as queued
  }

  p.outro('Review complete.');
}
