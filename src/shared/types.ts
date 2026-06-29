export type ATSSource = 'greenhouse' | 'loxo';

export type ApplicationStatus =
  | 'queued'
  | 'applied'
  | 'response'
  | 'interview'
  | 'rejected'
  | 'offer';

export type FitRecommendation = 'apply' | 'consider' | 'skip';

export interface JobPosting {
  id: string;
  title: string;
  company: string;
  url: string;
  applyUrl: string;
  ats: ATSSource;
  postedAt: string;
  rawText: string;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  yearsRequired: number;
}

export interface FitResult {
  jobId: string;
  score: number;
  reasoning: string;
  skillMatches: string[];
  skillGaps: string[];
  yearsGap: number;
  recommendation: FitRecommendation;
}

export interface ApplicationRecord {
  id: string;
  jobId: string;
  status: ApplicationStatus;
  appliedAt?: string;
  notes?: string;
  createdAt: string;
}

export interface BoardConfig {
  ats: ATSSource;
  url: string;
  company: string;
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  linkedIn: string;
  github: string;
  portfolio: string;
  resumeText: string;
  skills: string[];
  yearsOfExperience: number;
  currentTitle: string;
}

export interface SearchConfig {
  keywords: string[];
  minFitScore: number;
  checkIntervalMinutes: number;
  boards: BoardConfig[];
}

export interface AgentConfig {
  profile: UserProfile;
  search: SearchConfig;
  anthropicApiKey: string;
}

export interface ScoredJob {
  job: JobPosting;
  fit: FitResult;
  application: ApplicationRecord;
}
