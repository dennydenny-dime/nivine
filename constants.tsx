
import { Mood, Persona } from './types';

export const PRESET_PERSONAS: Persona[] = [
  { name: 'Sarah', role: 'Executive Recruiter', mood: 'Formal', gender: 'Female', language: 'English' },
  { name: 'David', role: 'Angel Investor', mood: 'Challenging', gender: 'Male', language: 'English' },
  { name: 'Alex', role: 'Supportive Coworker', mood: 'Friendly', gender: 'Male', language: 'English' },
  { name: 'Dr. Miller', role: 'Strict Academic Supervisor', mood: 'Strict', gender: 'Female', language: 'English' },
  { name: 'The Audience', role: 'Keynote Presentation Crowd', mood: 'Encouraging', gender: 'Female', language: 'English' },
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

/**
 * Safely retrieves the API Key from various environment variable patterns.
 * Supports: Vite, Create React App, Next.js, and standard Node process.env.
 */
export const getSystemApiKey = (): string | undefined => {
  let key: string | undefined;

  // 1. Try Vite (import.meta.env)
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      key = import.meta.env.VITE_API_KEY || import.meta.env.API_KEY;
    }
  } catch (e) {
    // Ignore ReferenceErrors if import.meta is not defined
  }

  if (key) return key;

  // 2. Try Standard Process Env (Webpack, Next.js, CRA)
  try {
    // We check typeof process to avoid ReferenceError in pure browser environments
    if (typeof process !== 'undefined' && process.env) {
      key = process.env.API_KEY || 
            process.env.REACT_APP_API_KEY || 
            process.env.NEXT_PUBLIC_API_KEY ||
            process.env.VITE_API_KEY;
    }
  } catch (e) {
    // Ignore errors accessing process
  }
  
  return key;
};
