import { searchGreenhouse } from '../browser/greenhouse.js';
import { searchLoxo } from '../browser/loxo.js';
import { scoreJob } from './scorer.js';
import { memory } from './memory.js';
import type { AgentConfig, JobPosting } from '../shared/types.js';

export interface MonitorResult {
  found: number;
  newSeen: number;
  scored: number;
  queued: number;
}

export async function runOnce(config: AgentConfig): Promise<MonitorResult> {
  const { search } = config;
  let allJobs: JobPosting[] = [];

  for (const board of search.boards) {
    let jobs: JobPosting[] = [];
    try {
      if (board.ats === 'greenhouse') {
        jobs = await searchGreenhouse(board, search.keywords);
      } else if (board.ats === 'loxo') {
        jobs = await searchLoxo(board, search.keywords);
      }
    } catch {
      // One board failing shouldn't abort the run
    }
    allJobs = [...allJobs, ...jobs];
  }

  const newJobs = allJobs.filter((job) => !memory.hasSeen(job.url));
  let queued = 0;

  for (const job of newJobs) {
    memory.markSeen(job.url);

    let fit;
    try {
      fit = await scoreJob(job, config);
    } catch {
      continue;
    }

    if (fit.score >= search.minFitScore) {
      memory.saveJob(job);
      memory.saveFitResult(fit);
      memory.createApplication(job.id);
      queued++;
    }
  }

  return {
    found: allJobs.length,
    newSeen: newJobs.length,
    scored: newJobs.length,
    queued,
  };
}

export async function watchLoop(
  config: AgentConfig,
  onTick: (result: MonitorResult) => void,
): Promise<void> {
  const intervalMs = config.search.checkIntervalMinutes * 60 * 1000;

  while (true) {
    const result = await runOnce(config);
    onTick(result);
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
