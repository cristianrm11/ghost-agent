import Anthropic from '@anthropic-ai/sdk';
import type { JobPosting, FitResult, AgentConfig } from '../shared/types.js';

export async function scoreJob(job: JobPosting, config: AgentConfig): Promise<FitResult> {
  const client = new Anthropic({ apiKey: config.anthropicApiKey });
  const { profile } = config;

  const prompt = `You are evaluating a job posting for a candidate. Return ONLY a valid JSON object — no markdown, no explanation.

CANDIDATE:
- Title: ${profile.currentTitle}
- Years of experience: ${profile.yearsOfExperience}
- Skills: ${profile.skills.join(', ')}
- Resume: ${profile.resumeText.slice(0, 1500)}

JOB:
- Title: ${job.title}
- Company: ${job.company}
- Required skills: ${job.requiredSkills.join(', ')}
- Nice-to-have: ${job.niceToHaveSkills.join(', ')}
- Years required: ${job.yearsRequired}
- Description: ${job.rawText.slice(0, 2000)}

Return this JSON shape exactly:
{
  "score": <integer 0-100>,
  "reasoning": "<2-3 sentences explaining the fit or lack thereof>",
  "skillMatches": ["<skills the candidate has that the job requires>"],
  "skillGaps": ["<required skills the candidate is missing>"],
  "yearsGap": <candidate_years minus required_years — negative means under-qualified>,
  "recommendation": "<apply|consider|skip>"
}

Scoring guide:
- 85-100: Strong match, apply immediately
- 70-84: Good fit, worth applying (recommendation: apply)
- 55-69: Partial fit, gaps exist (recommendation: consider)
- 0-54: Poor fit (recommendation: skip)`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = (message.content[0] as { type: 'text'; text: string }).text.trim();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Scorer returned non-JSON: ${text.slice(0, 200)}`);

  const parsed = JSON.parse(jsonMatch[0]) as Omit<FitResult, 'jobId'>;

  return { jobId: job.id, ...parsed };
}
