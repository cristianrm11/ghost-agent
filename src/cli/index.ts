#!/usr/bin/env node
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { setupCommand } from './commands/setup.js';
import { watchCommand } from './commands/watch.js';
import { reviewCommand } from './commands/review.js';
import { applyCommand } from './commands/apply.js';

const COMMANDS = {
  setup: setupCommand,
  watch: watchCommand,
  review: reviewCommand,
  apply: applyCommand,
};

const HELP = `
${pc.bold('Ghost Agent')} — AI-powered job matching and application agent

${pc.dim('Usage:')}
  ghost-agent <command> [options]

${pc.dim('Commands:')}
  setup              Configure profile, API key, and boards
  watch [--once]     Monitor boards for new matches (--once for single scan)
  review             Review queued high-fit jobs and decide to apply or skip
  apply [id]         Fill and submit an application in a headed browser

${pc.dim('Examples:')}
  ghost-agent setup
  ghost-agent watch --once
  ghost-agent review
  ghost-agent apply
`;

async function main(): Promise<void> {
  const [, , cmd, ...args] = process.argv;

  if (!cmd || cmd === '--help' || cmd === '-h') {
    console.log(HELP);
    return;
  }

  if (!(cmd in COMMANDS)) {
    p.log.error(`Unknown command: ${cmd}`);
    console.log(HELP);
    process.exit(1);
  }

  process.on('SIGINT', () => {
    p.cancel('Interrupted.');
    process.exit(0);
  });

  await COMMANDS[cmd as keyof typeof COMMANDS](args);
}

main().catch((err: unknown) => {
  p.log.error(String(err));
  process.exit(1);
});
