import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import type { JobPosting, FitResult, ApplicationRecord, ApplicationStatus } from '../shared/types.js';

const STORE_DIR = path.join(os.homedir(), '.ghost-agent');
const STORE_PATH = path.join(STORE_DIR, 'memory.json');

interface Store {
  seenUrls: Record<string, string>;
  jobs: Record<string, JobPosting>;
  fitResults: Record<string, FitResult>;
  applications: Record<string, ApplicationRecord>;
}

const EMPTY_STORE: Store = { seenUrls: {}, jobs: {}, fitResults: {}, applications: {} };

function read(): Store {
  fs.mkdirSync(STORE_DIR, { recursive: true });
  if (!fs.existsSync(STORE_PATH)) return { ...EMPTY_STORE };
  try {
    return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')) as Store;
  } catch {
    // Corrupted file — start fresh rather than bricking the CLI.
    return { ...EMPTY_STORE };
  }
}

function write(store: Store): void {
  fs.mkdirSync(STORE_DIR, { recursive: true });
  const tmp = `${STORE_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2));
  fs.renameSync(tmp, STORE_PATH);
}

export const memory = {
  hasSeen(url: string): boolean {
    return url in read().seenUrls;
  },

  markSeen(url: string): void {
    const store = read();
    store.seenUrls[url] = new Date().toISOString();
    write(store);
  },

  saveJob(job: JobPosting): void {
    const store = read();
    store.jobs[job.id] = job;
    write(store);
  },

  saveFitResult(fit: FitResult): void {
    const store = read();
    store.fitResults[fit.jobId] = fit;
    write(store);
  },

  createApplication(jobId: string): string {
    const store = read();
    const id = crypto.randomUUID();
    store.applications[id] = {
      id,
      jobId,
      status: 'queued',
      createdAt: new Date().toISOString(),
    };
    write(store);
    return id;
  },

  updateApplicationStatus(id: string, status: ApplicationStatus, notes?: string): void {
    const store = read();
    const app = store.applications[id];
    if (!app) return;
    app.status = status;
    if (notes) app.notes = notes;
    if (status === 'applied') app.appliedAt = new Date().toISOString();
    write(store);
  },

  getQueuedJobs(): Array<{ job: JobPosting; fit: FitResult; application: ApplicationRecord }> {
    const store = read();
    return Object.values(store.applications)
      .filter((a) => a.status === 'queued')
      .map((a) => ({
        job: store.jobs[a.jobId],
        fit: store.fitResults[a.jobId],
        application: a,
      }))
      .filter((r) => r.job && r.fit)
      .sort((a, b) => b.fit.score - a.fit.score);
  },

  getAllApplications(): Array<{ job: JobPosting; fit: FitResult; application: ApplicationRecord }> {
    const store = read();
    return Object.values(store.applications)
      .map((a) => ({
        job: store.jobs[a.jobId],
        fit: store.fitResults[a.jobId],
        application: a,
      }))
      .filter((r) => r.job && r.fit)
      .sort((a, b) => new Date(b.application.createdAt).getTime() - new Date(a.application.createdAt).getTime());
  },
};
