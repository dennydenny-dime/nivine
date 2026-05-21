import { ConversationHistoryItem } from '../types';
import { getConversationHistoryKey } from './userStorage';

type UserIdentity = { email?: string | null; id?: string | null };

const INTERVIEW_HISTORY_API_URL = '/api/interview-history';
const MAX_PERSISTED_SESSIONS = 50;
const MAX_RETRIES = 4;

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const dedupeHistory = (history: ConversationHistoryItem[]): ConversationHistoryItem[] => {
  const seen = new Set<string>();

  return history.filter((item) => {
    const key = item.id || `${item.date}:${item.persona?.name || 'persona'}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const getExistingLocalHistory = (userId: string | undefined | null): ConversationHistoryItem[] => {
  const scopedKey = getConversationHistoryKey(userId || undefined);
  const storedHistory = localStorage.getItem(scopedKey) ?? localStorage.getItem('tm_conversation_history');

  if (!storedHistory) return [];

  try {
    const parsed = JSON.parse(storedHistory);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const persistLocalHistory = (userId: string | undefined | null, history: ConversationHistoryItem[]) => {
  const trimmed = dedupeHistory(history)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, MAX_PERSISTED_SESSIONS);

  localStorage.setItem(getConversationHistoryKey(userId || undefined), JSON.stringify(trimmed));
  localStorage.setItem('tm_conversation_history', JSON.stringify(trimmed));

  return trimmed;
};

const postInterviewHistoryAction = async (payload: Record<string, unknown>) => {
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      console.info('[history-sync] request start', { action: payload.action, attempt });
      const response = await fetch(INTERVIEW_HISTORY_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Interview history API failed (${response.status}).`);
      }

      console.info('[history-sync] request success', { action: payload.action, attempt });
      return response.json();
    } catch (error) {
      lastError = error;
      const backoffMs = Math.min(2000, 250 * (2 ** attempt));
      console.error('[history-sync] request failed', {
        action: payload.action,
        attempt,
        backoffMs,
        error,
      });

      if (attempt >= MAX_RETRIES) {
        break;
      }

      await wait(backoffMs);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Interview history request failed.');
};

export const syncInterviewHistoryFromServer = async (user: UserIdentity) => {
  if (!user.id && !user.email) return [];

  const data = (await postInterviewHistoryAction({
    action: 'get',
    email: user.email,
    id: user.id,
  })) as { history?: ConversationHistoryItem[] };

  const localHistory = getExistingLocalHistory(user.id);
  const serverHistory = Array.isArray(data.history) ? data.history : [];

  return persistLocalHistory(user.id, [...serverHistory, ...localHistory]);
};

export const saveEligibleInterviewHistory = async (user: UserIdentity, historyItem: ConversationHistoryItem) => {
  const evaluation = historyItem.scoreCard?.evaluation;
  if (!evaluation?.eligible || (!user.id && !user.email)) {
    return null;
  }

  const data = (await postInterviewHistoryAction({
    action: 'append',
    email: user.email,
    id: user.id,
    historyItem,
  })) as { history?: ConversationHistoryItem[] };

  return persistLocalHistory(user.id, Array.isArray(data.history) ? data.history : [historyItem]);
};
