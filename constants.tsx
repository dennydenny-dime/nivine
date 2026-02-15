
import { Mood, Persona } from './types';

export const PRESET_PERSONAS: Persona[] = [
  {
    name: 'Maya',
    role: 'Ex-Recruiter: asks practical interview questions, gives direct hiring-oriented feedback, and helps the user sound confident and clear.',
    mood: 'Friendly',
    gender: 'Female',
    language: 'English'
  },
  {
    name: 'Ethan',
    role: 'Angel Investor: focuses on business clarity, traction, unit economics, and concise pitch storytelling.',
    mood: 'Formal',
    gender: 'Male',
    language: 'English'
  },
  {
    name: 'Nora',
    role: 'Company Manager: runs realistic team and stakeholder conversations with calm, structured, solution-focused communication.',
    mood: 'Encouraging',
    gender: 'Female',
    language: 'English'
  },
  {
    name: 'Leo',
    role: 'Salesman: practices objection handling, discovery questions, and closing with clear value-first messaging.',
    mood: 'Friendly',
    gender: 'Male',
    language: 'English'
  },
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
