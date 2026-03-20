import { Mood, Persona } from './types';

export const PRESET_PERSONAS: Persona[] = [
  {
    moduleLabel: 'Module 1',
    name: 'Frontend engineer',
    moduleSubtitle: 'React / JS dev\n2-5 yrs exp',
    role: 'React and JavaScript frontend engineer interview for candidates with 2-5 years of experience',
    interviewerPersona: 'Priya — startup CTO\nwarm but technical',
    whyItWins: 'Highest demand role in India',
    mood: 'Formal',
    gender: 'Female',
    language: 'English',
  },
  {
    moduleLabel: 'Module 2',
    name: 'Backend engineer',
    moduleSubtitle: 'Node / Python / Go\nAPIs, DBs, system design',
    role: 'Backend engineer interview covering Node, Python, Go, APIs, databases, and system design',
    interviewerPersona: 'Marcus — senior eng\nchallenging, digs deep',
    whyItWins: 'Second biggest hiring volume',
    mood: 'Challenging',
    gender: 'Male',
    language: 'English',
  },
  {
    moduleLabel: 'Module 3',
    name: 'Product manager',
    moduleSubtitle: '0-1 product thinking\nmetrics, roadmap',
    role: 'Product manager interview focused on zero-to-one thinking, metrics, and roadmap decisions',
    interviewerPersona: 'Sarah — VP Product\nformal, structured',
    whyItWins: 'No good AI PM interview exists',
    mood: 'Formal',
    gender: 'Female',
    language: 'English',
  },
  {
    moduleLabel: 'Module 4',
    name: 'Data analyst',
    moduleSubtitle: 'SQL, Python, dashboards\nbusiness insight',
    role: 'Data analyst interview focused on SQL, Python, dashboards, and business insight',
    interviewerPersona: 'Dr. Miller — data lead\nstrict, numbers-first',
    whyItWins: 'Booming in Indian startups',
    mood: 'Strict',
    gender: 'Female',
    language: 'English',
  },
  {
    moduleLabel: 'Module 5',
    name: 'Behavioural / culture',
    moduleSubtitle: 'STAR method, values\nleadership, conflict',
    role: 'Behavioral and culture-fit interview using STAR method, values, leadership, and conflict prompts',
    interviewerPersona: 'David — founder\nchallenging, investor lens',
    whyItWins: 'Works as add-on for all roles',
    mood: 'Friendly',
    gender: 'Male',
    language: 'English',
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
 * Supports only intentionally public frontend variables.
 */
export const getSystemApiKey = (): string | undefined => {
  let key: string | undefined;

  // 1. Try Vite (import.meta.env)
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      key =
        import.meta.env.VITE_API_KEY ||
        import.meta.env.REACT_APP_API_KEY;
    }
  } catch (e) {
    // Ignore ReferenceErrors if import.meta is not defined
  }

  if (key) return key;

  // 2. Try Standard Process Env (Webpack, Next.js, CRA)
  try {
    // We check typeof process to avoid ReferenceError in pure browser environments
    if (typeof process !== 'undefined' && process.env) {
      key = process.env.REACT_APP_API_KEY ||
            process.env.NEXT_PUBLIC_API_KEY ||
            process.env.VITE_API_KEY;
    }
  } catch (e) {
    // Ignore errors accessing process
  }

  return key;
};

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
