export enum InterviewRound {
  SCREENING = "Screening Round",
  CODING = "Coding/DSA Round",
  SYSTEM_DESIGN = "System Design Round",
  MANAGERIAL = "Managerial Round",
  HR = "HR Round",
  BAR_RAISER = "Bar Raiser Round"
}

export enum InterviewStatus {
  SETUP = "SETUP",
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED"
}

export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: Date;
  isThinking?: boolean;
}

export interface InterviewConfig {
  role: string; // e.g., "AI Engineer", "Frontend Developer"
  round: InterviewRound;
  experienceLevel: string; // e.g., "Junior", "Senior"
  focusArea?: string; // Optional specific focus
}

export interface InterviewReport {
  strengths: string[];
  weaknesses: string[];
  overallScore: number; // 1-10
  summary: string;
}