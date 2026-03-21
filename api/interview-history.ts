import { firestore } from './_firebaseAdmin.ts';
import { ensureJsonRequest, rejectDisallowedOrigin, rejectOversizedJsonBody, takeRateLimit } from '../lib/server/security.js';

const MAX_PERSISTED_SESSIONS = 50;
const MINIMUM_ELIGIBLE_MINUTES = 3.5;

type Persona = {
  name: string;
  role: string;
  mood: string;
  gender: string;
  language?: string;
  difficultyLevel?: number;
};

type TranscriptionItem = {
  speaker: 'user' | 'ai';
  text: string;
  timestamp: number;
};

type InterviewEvaluationEligibleResult = {
  eligible: true;
  scores: {
    clarity: number;
    confidence: number;
    structure: number;
    depth: number;
    overall: number;
  };
  strengths: string[];
  weaknesses: string[];
  summary: string;
  improvement_suggestions: string[];
};

type InterviewEvaluationResult = InterviewEvaluationEligibleResult | {
  eligible: false;
  message: string;
};

type NeuralSpeechScoreCard = {
  overallScore: number;
  totalWords: number;
  fillerCount: number;
  fillerDensity: number;
  avgWordsPerTurn: number;
  confidenceScore: number;
  clarityScore: number;
  concisenessScore: number;
  summary: string;
  evaluation: InterviewEvaluationResult;
};

type ConversationHistoryItem = {
  id: string;
  date: string;
  persona: Persona;
  transcriptions: TranscriptionItem[];
  scoreCard?: NeuralSpeechScoreCard;
};

type UserIdentity = { email?: string | null; id?: string | null };

const normalizeEmail = (email?: string | null): string | null => {
  const normalized = (email || '').trim().toLowerCase();
  return normalized || null;
};

const normalizeUserId = (userId?: string | null): string | null => {
  const normalized = (userId || '').trim();
  return normalized || null;
};

const isEligibleHistoryItem = (value: any): value is ConversationHistoryItem => {
  if (!value || typeof value !== 'object') return false;
  if (typeof value.id !== 'string' || typeof value.date !== 'string') return false;
  if (!value.persona || typeof value.persona.name !== 'string') return false;
  if (!Array.isArray(value.transcriptions) || value.transcriptions.length === 0) return false;
  if (!value.scoreCard?.evaluation?.eligible) return false;

  const firstTimestamp = value.transcriptions[0]?.timestamp;
  const lastTimestamp = value.transcriptions[value.transcriptions.length - 1]?.timestamp;
  const durationMinutes = Math.max(0, ((lastTimestamp || 0) - (firstTimestamp || 0)) / 60000);

  return Number.isFinite(durationMinutes) && durationMinutes >= MINIMUM_ELIGIBLE_MINUTES;
};

const dedupeHistory = (history: ConversationHistoryItem[]) => {
  const seen = new Set<string>();

  return history.filter((item) => {
    const key = item.id || `${item.date}:${item.persona?.name || 'persona'}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const sortAndTrimHistory = (history: ConversationHistoryItem[]) => dedupeHistory(history)
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  .slice(0, MAX_PERSISTED_SESSIONS);

const getCollectionRefs = (db: typeof firestore, user: UserIdentity) => {
  const email = normalizeEmail(user.email);
  const userId = normalizeUserId(user.id);
  const refs: ReturnType<typeof db.collection>[] = [];

  if (email) refs.push(db.collection('interviewHistoryByEmail').doc(email));
  if (userId) refs.push(db.collection('interviewHistoryByUid').doc(userId));

  return refs;
};

const readHistory = async (user: UserIdentity): Promise<ConversationHistoryItem[]> => {
  const refs = getCollectionRefs(firestore, user);
  if (refs.length === 0) return [];

  const snapshots = await Promise.all(refs.map((docRef) => docRef.get()));
  const merged = snapshots.flatMap((snapshot) => {
    const history = snapshot.data()?.history;
    return Array.isArray(history) ? history.filter(isEligibleHistoryItem) : [];
  });

  return sortAndTrimHistory(merged);
};

const writeHistory = async (user: UserIdentity, history: ConversationHistoryItem[]) => {
  const refs = getCollectionRefs(firestore, user);
  const sortedHistory = sortAndTrimHistory(history);
  const email = normalizeEmail(user.email);
  const userId = normalizeUserId(user.id);
  const payload = {
    email,
    userId,
    history: sortedHistory,
    updatedAt: new Date().toISOString(),
  };

  await Promise.all(refs.map((docRef) => docRef.set(payload, { merge: true })));
  return sortedHistory;
};

export default async function handler(req: any, res: any) {
  if (rejectDisallowedOrigin(req, res, ['POST', 'OPTIONS'])) return;
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  if (!ensureJsonRequest(req, res) || rejectOversizedJsonBody(req, res, 400_000)) return;

  const rateLimit = takeRateLimit(req, 'interview-history', 60, 60_000);
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds || 60));
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  try {
    const action = req.body?.action || 'get';
    const user = { email: req.body?.email, id: req.body?.id };

    if (action === 'append') {
      const historyItem = req.body?.historyItem;
      if (!isEligibleHistoryItem(historyItem)) {
        return res.status(400).json({ error: 'Only eligible interview results can be stored.' });
      }

      const currentHistory = await readHistory(user);
      const updatedHistory = await writeHistory(user, [historyItem, ...currentHistory]);
      return res.status(200).json({ history: updatedHistory });
    }

    if (action !== 'get') {
      return res.status(400).json({ error: 'Invalid action.' });
    }

    const history = await readHistory(user);
    return res.status(200).json({ history });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unable to resolve interview history.' });
  }
}
