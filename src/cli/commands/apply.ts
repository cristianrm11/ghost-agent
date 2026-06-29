import * as p from '@clack/prompts';
import pc from 'picocolors';
import { loadConfig } from '../../shared/config.js';
import { memory } from '../../agent/memory.js';
import { fillApplication } from '../../browser/filler.js';

export async function applyCommand(args: string[]): Promise<void> {
  const config = loadConfig();
  const queued = memory.getQueuedJobs();

  if (queued.length === 0) {
    p.log.warn('No queued jobs. Run: ghost-agent watch --once first.');
    return;
  }

  p.intro(`${pc.bgBlue(' Ghost Agent ')} ${pc.dim('apply')}`);

  // Allow passing an application ID directly
  let target = queued.find((q) => args.includes(q.application.id));

  if (!target) {
    const selected = await p.select({
      message: 'Which job would you like to apply to?',
      options: queued.map((q) => ({
        value: q.application.id,
        label: `${q.fit.score}% · ${q.job.title} at ${q.job.company}`,
        hint: q.fit.recommendation,
      })),
    });

    if (p.isCancel(selected)) {
      p.outro('Cancelled.');
      return;
    }

    target = queued.find((q) => q.application.id === selected);
  }

  if (!target) {
    p.log.error('Job not found.');
    return;
  }

  const { job, application } = target;

  p.log.info(`Applying to ${pc.bold(job.title)} at ${pc.cyan(job.company)}`);
  p.log.info(`A browser window will open. Review and confirm each field.`);
  p.log.message('');

  const { filled, submitted } = await fillApplication(job, config.profile);

  if (submitted) {
    memory.updateApplicationStatus(application.id, 'applied');
    p.log.success(`Application submitted! (${filled.filter((f) => !f.skipped).length} fields filled)`);
  } else {
    p.log.warn('Application was not submitted. Status unchanged.');
  }

  p.outro('Done.');
}
