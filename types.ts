
export type Gender = 'Male' | 'Female';
export type Mood = 'Formal' | 'Friendly' | 'Strict' | 'Encouraging' | 'Challenging';
export type Difficulty = 'Beginner' | 'Intermediate' | 'Expert';
export type QuizCategory = 'Leadership' | 'Sales' | 'Interview' | 'Social' | 'Conflict Resolution';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface UserStats {
  totalQuizzes: number;
  totalXP: number;
  avgRating: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  avatar: string;
  xp: number;
  rank: number;
  isCurrentUser?: boolean;
}

export interface Persona {
  name: string;
  role: string;
  mood: Mood;
  gender: Gender;
  language?: string;
  difficultyLevel?: number; // Scale 1-10
}

export interface QuizQuestion {
  id: string;
  scenario: string;
  challenge: string;
  tips: string[];
  category: QuizCategory;
  difficulty: Difficulty;
}

export interface QuizResult {
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  rating: number; // 0-100
  strengths: string[];
  weaknesses: string[];
  detailedFeedback: string;
}

export interface SynapsePillarBreakdown {
  structure: number;
  clarity: number;
  impact: number;
  confidence: number;
  conciseness: number;
  filler_density: number;
  relevance: number;
}

export interface SynapseDiagnostics {
  structure_score: number;
  clarity_score: number;
  impact_score: number;
  confidence_score: number;
  relevance_score: number;
  strengths: string[];
  weaknesses: string[];
  improvement_suggestions: string[];
}

export interface SynapseEvaluation {
  synapse_total_score: number;
  percentile: number;
  pillar_breakdown: SynapsePillarBreakdown;
  diagnostics: SynapseDiagnostics;
  trend_delta: number;
}

export interface TranscriptionItem {
  speaker: 'user' | 'ai';
  text: string;
  timestamp: number;
}
