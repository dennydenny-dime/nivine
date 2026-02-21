import { ConversationHistoryItem, UserStats } from '../types';

const DEFAULT_STATS: UserStats = { totalQuizzes: 0, totalXP: 0, avgRating: 0 };

const getScopedKey = (baseKey: string, userId?: string) => `${baseKey}:${userId || 'anonymous'}`;

export const getConversationHistoryKey = (userId?: string) => getScopedKey('tm_conversation_history', userId);
export const getUserStatsKey = (userId?: string) => getScopedKey('tm_user_stats', userId);

export const getUserStats = (userId?: string): UserStats => {
  const scopedKey = getUserStatsKey(userId);
  const scopedStats = localStorage.getItem(scopedKey);
  if (scopedStats) {
    return JSON.parse(scopedStats);
  }

  // Backward compatibility for data saved before user-scoped keys.
  const legacyStats = localStorage.getItem('tm_user_stats');
  if (!legacyStats) {
    return DEFAULT_STATS;
  }

  const parsed = JSON.parse(legacyStats);
  localStorage.setItem(scopedKey, JSON.stringify(parsed));
  return parsed;
};

export const setUserStats = (userId: string | undefined, stats: UserStats) => {
  localStorage.setItem(getUserStatsKey(userId), JSON.stringify(stats));
};

export const getUserConversationHistory = (userId?: string): ConversationHistoryItem[] => {
  const scopedHistory = localStorage.getItem(getConversationHistoryKey(userId));
  if (scopedHistory) {
    return JSON.parse(scopedHistory);
  }

  const legacyHistory = localStorage.getItem('tm_conversation_history');
  if (!legacyHistory) {
    return [];
  }

  const parsed = JSON.parse(legacyHistory);
  localStorage.setItem(getConversationHistoryKey(userId), JSON.stringify(parsed));
  return parsed;
};

export const setUserConversationHistory = (userId: string | undefined, history: ConversationHistoryItem[]) => {
  localStorage.setItem(getConversationHistoryKey(userId), JSON.stringify(history));
};
