# Ghost Agent

> AI-powered job board monitor that finds high-fit roles, scores them with Claude, and applies with your approval.

A CLI agent that runs a continuous loop: scan job boards → score each posting against your profile → surface only the matches worth your time → fill and submit applications in a headed browser with field-by-field review.

Built for quality over volume. The agent finds the right 3, not the fastest 50.

---

## How it works

```
ghost-agent watch
    └── For each configured board:
        ├── Greenhouse: hits the public JSON API (no browser needed)
        └── Loxo: Playwright scrapes the listing page

    └── For each new posting:
        ├── scoreJob() → Claude Haiku evaluates fit against your profile
        ├── Returns score (0–100), reasoning, skill matches/gaps, YOE delta
        └── If score ≥ minFitScore → saved to queue

ghost-agent review
    └── Shows queued jobs ranked by fit score
    └── Claude's reasoning displayed per job
    └── You choose: Apply / Skip / Later

ghost-agent apply
    └── Opens job page in a headed Chromium browser
    └── Scans all form fields
    └── For each field: suggests a value from your profile → you confirm, edit, or skip
    └── You approve before submit
    └── Status updated to 'applied' in local store
```

---

## Features

**Continuous monitoring** — `watch` mode polls your configured boards on a set interval. Run it once or leave it running in the background.

**Claude-powered fit scoring** — each new posting is evaluated by Claude Haiku against your full profile. You get a 0–100 score, a 2–3 sentence reasoning, matched skills, missing skills, and a years-of-experience delta — not just a keyword count.

**Human-in-the-loop apply** — the agent never submits anything without your review. Every field shows a suggested value and confidence level; you confirm, edit, or skip before the form is submitted.

**Persistent memory** — all seen URLs, scored jobs, fit results, and application status are stored locally at `~/.ghost-agent/memory.json`. The agent remembers what it has already seen across sessions.

**Safe writes** — the memory store uses atomic temp-file + rename so a crash mid-write never corrupts your data.

---

## Supported Boards

| ATS | Discovery method |
|-----|-----------------|
| Greenhouse | Public JSON API (`boards-api.greenhouse.io`) |
| Loxo | Playwright browser scrape |

---

## Commands

```bash
ghost-agent setup          # Configure profile, API key, and boards
ghost-agent watch          # Start continuous monitor (Ctrl+C to stop)
ghost-agent watch --once   # Single scan — useful for testing
ghost-agent review         # Review queued high-fit jobs
ghost-agent apply [id]     # Fill and submit an application
ghost-agent --help         # Show all commands
```

---

## Installation

```bash
git clone https://github.com/cristianrm11/ghost-agent.git
cd ghost-agent
npm install
npx playwright install chromium
```

Then run setup:

```bash
npm run setup
```

Setup asks for:
- Your **Anthropic API key** (used for fit scoring and open-ended answers)
- Your **profile**: name, email, phone, LinkedIn, skills, years of experience, resume summary
- **Greenhouse board tokens** — the slug after `boards.greenhouse.io/` (e.g. `anthropic`, `stripe`)
- **Loxo board URLs** — full URLs to the job listing pages
- **Minimum fit score** to queue (default: 70)
- **Check interval** in minutes (default: 60)

Config is saved to `~/.ghost-agent/config.json`.

---

## Usage

**Single scan:**
```bash
npm run watch -- --once
# Ghost Agent · watch mode
# Monitoring 2 board(s) · min fit 70%
# Scanning boards...
# Found 24 jobs · 6 new · 2 queued
# Run: ghost-agent review to see your matches.
```

**Review matches:**
```bash
npm run review
# Software Engineer, Browser Agents — Anthropic    94% fit  ● apply
#   Strong match: 4/4 required skills · YOE gap: none · Missing: Rust (nice-to-have)
#
# › Apply   Skip   Remind me later
```

**Apply:**
```bash
npm run apply
# Opening https://job-boards.greenhouse.io/anthropic/jobs/...
#
# First name: Christian  (high confidence)  › Fill  Edit  Skip
# Last name:  Retana     (high confidence)  › Fill  Edit  Skip
# Email:      ...        (high confidence)  › Fill  Edit  Skip
# Why Anthropic? (open-ended)               › Write my own  Skip
#
# 6 filled · 1 skipped
# Submit application now? › No / Yes
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript, Node 20 |
| Browser automation | Playwright (Chromium) |
| AI scoring | Anthropic Claude Haiku |
| CLI | @clack/prompts |
| Persistence | JSON file store (atomic writes) |
| Greenhouse discovery | Greenhouse public boards API |
| Loxo discovery | Playwright scrape |

---

## Privacy

All data stays on your machine. Your profile, API key, and application history are stored locally at `~/.ghost-agent/` and never sent to any server we control. The Anthropic API is called only to score job postings and generate open-ended answers.

---

## Project context

Ghost Agent is app #2 of a 5-project browser automation portfolio.

| # | Project | Repo | Status |
|---|---------|------|--------|
| 1 | Ghost Interface (Chrome extension — ATS autofill) | [ghost-interface](https://github.com/cristianrm11/ghost-interface) | Complete |
| 2 | Ghost Agent (CLI job board monitor + applicant) | this repo | Complete |
| 3 | Large-scale scraper | — | Planned |
| 4 | CAPTCHA solver | — | Planned |
| 5 | Proxy rotator | — | Planned |

---

## License

MIT
