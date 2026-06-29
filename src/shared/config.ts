import fs from 'fs';
import path from 'path';
import os from 'os';
import type { AgentConfig } from './types.js';

const CONFIG_DIR = path.join(os.homedir(), '.ghost-agent');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

const DEFAULTS: AgentConfig = {
  anthropicApiKey: '',
  profile: {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    linkedIn: '',
    github: '',
    portfolio: '',
    resumeText: '',
    skills: [],
    yearsOfExperience: 0,
    currentTitle: '',
  },
  search: {
    keywords: ['software engineer', 'browser automation'],
    minFitScore: 70,
    checkIntervalMinutes: 60,
    boards: [],
  },
};

export function configExists(): boolean {
  return fs.existsSync(CONFIG_PATH);
}

export function loadConfig(): AgentConfig {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(`No config found. Run: ghost-agent setup`);
  }
  const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
  return JSON.parse(raw) as AgentConfig;
}

export function saveConfig(config: AgentConfig): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export function getOrCreateConfig(): AgentConfig {
  if (!fs.existsSync(CONFIG_PATH)) {
    saveConfig(DEFAULTS);
    return DEFAULTS;
  }
  return loadConfig();
}

export { CONFIG_PATH, CONFIG_DIR };
