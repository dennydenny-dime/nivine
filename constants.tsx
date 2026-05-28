
import { Mood, Persona } from './types';

export const PRESET_PERSONAS: Persona[] = [
  { name: 'Sarah', role: 'Executive Recruiter', mood: 'Formal', gender: 'Female', language: 'English' },
  { name: 'David', role: 'Angel Investor', mood: 'Challenging', gender: 'Male', language: 'English' },
  { name: 'Marcus', role: 'Salesman', mood: 'Challenging', gender: 'Male', language: 'English' },
  { name: 'Dr. Miller', role: 'Strict Academic Supervisor', mood: 'Strict', gender: 'Female', language: 'English' },
  { name: 'Priya', role: 'Company Manager', mood: 'Formal', gender: 'Female', language: 'English' },
];

export const MOODS: Mood[] = ['Formal', 'Friendly', 'Strict', 'Encouraging', 'Challenging'];

export const VOICE_MAP = {
  Male: 'Fenrir',
  Female: 'Kore',
};

export const COMMON_LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Mandarin',
  'Japanese',
  'Korean',
  'Hindi',
  'Arabic',
  'Portuguese',
  'Russian',
  'Italian'
];

export const getBackendApiBaseUrl = (): string | undefined => {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // @ts-ignore
    return import.meta.env.VITE_BACKEND_API_URL || import.meta.env.BACKEND_API_URL;
  }

  if (typeof process !== 'undefined' && process.env) {
    return process.env.VITE_BACKEND_API_URL || process.env.BACKEND_API_URL;
  }

  return undefined;
};
