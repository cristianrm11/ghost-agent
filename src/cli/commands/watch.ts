import * as p from '@clack/prompts';
import pc from 'picocolors';
import { loadConfig } from '../../shared/config.js';
import { runOnce, watchLoop } from '../../agent/monitor.js';

export async function watchCommand(args: string[]): Promise<void> {
  const once = args.includes('--once');
  const config = loadConfig();

  if (config.search.boards.length === 0) {
    p.log.error('No boards configured. Run: ghost-agent setup');
    return;
  }

  p.intro(`${pc.bgBlue(' Ghost Agent ')} ${pc.dim('watch mode')}`);
  p.log.info(`Monitoring ${pc.cyan(String(config.search.boards.length))} board(s) · min fit ${pc.green(`${config.search.minFitScore}%`)}`);

  if (once) {
    const spinner = p.spinner();
    spinner.start('Scanning boards...');

    try {
      const result = await runOnce(config);
      spinner.stop(`Scan complete`);
      p.log.info(`Found ${result.found} jobs · ${result.newSeen} new · ${pc.green(`${result.queued} queued`)}`);

      if (result.queued > 0) {
        p.log.success(`Run ${pc.cyan('ghost-agent review')} to see your matches.`);
      }
    } catch (err) {
      spinner.stop('Scan failed');
      p.log.error(String(err));
    }

    p.outro('Done.');
    return;
  }

  const intervalMin = config.search.checkIntervalMinutes;
  p.log.info(`Checking every ${pc.cyan(`${intervalMin} min`)} · ${pc.dim('Ctrl+C to stop')}`);

  let tick = 0;
  await watchLoop(config, (result) => {
    tick++;
    const time = new Date().toLocaleTimeString();
    p.log.step(`[${time}] tick ${tick} · found ${result.found} · new ${result.newSeen} · ${pc.green(`queued ${result.queued}`)}`);
    if (result.queued > 0) {
      p.log.success(`New matches! Run ${pc.cyan('ghost-agent review')} to see them.`);
    }
  });
}
