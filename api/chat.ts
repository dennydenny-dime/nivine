import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildCandidateMemoryProfile, buildCandidateMemoryPrompt, type PastInterviewResult } from '../lib/candidateMemory';
import { buildInterviewerSystem, type InterviewBehaviorConfig } from '../lib/interviewBehavior';

type ChatHistoryItem = {
  speaker?: 'user' | 'ai' | string;
  text?: string;
};

const GEMINI_PRIMARY_MODEL = 'gemini-1.5-flash-latest';
const GEMINI_FALLBACK_MODEL = 'gemini-2.0-flash';

type GeminiStreamChunk = {
  text: () => string;
};

const getApiKey = (): string | undefined => {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.API_KEY ||
    process.env.VITE_API_KEY ||
    process.env.GOOGLE_API_KEY
  );
};

const toHistoryText = (history: ChatHistoryItem[] | undefined): string => {
  if (!Array.isArray(history) || history.length === 0) return 'No previous turns.';

  const recent = history.slice(-12);
  return recent
    .map((item) => {
      const speaker = item?.speaker === 'ai' ? 'Coach' : 'User';
      const text = typeof item?.text === 'string' ? item.text.trim() : '';
      if (!text) return null;
      return `${speaker}: ${text}`;
    })
    .filter(Boolean)
    .join('\n');
};

const buildPrompt = (body: any): string => {
  const transcript = typeof body?.transcript === 'string' ? body.transcript.trim() : '';
  const language = typeof body?.language === 'string' ? body.language : 'English';
  const persona = body?.persona || {};
  const personaName = typeof persona?.name === 'string' ? persona.name : 'Coach';
  const personaRole = typeof persona?.role === 'string' ? persona.role : 'Professional Coach';
  const personaMood = typeof persona?.mood === 'string' ? persona.mood : 'Direct';

  const roleDirectives = Array.isArray(body?.roleDirectives)
    ? body.roleDirectives.filter((directive: unknown) => typeof directive === 'string' && directive.trim().length > 0)
    : [];

  const history = toHistoryText(body?.history);
  const pastResults = Array.isArray(body?.pastResults) ? body.pastResults as PastInterviewResult[] : [];
  const candidateMemory = buildCandidateMemoryPrompt(buildCandidateMemoryProfile(pastResults));

  const basePrompt = [
    'You are an elite communication coach in a live spoken practice simulation.',
    `Persona name: ${personaName}`,
    `Persona role: ${personaRole}`,
    `Persona communication style: ${personaMood}`,
    `Response language: ${language}`,
    '',
    'Hard constraints:',
    '- Stay in character for the assigned persona role.',
    '- Keep a professional, fluent speaking style with confident pacing and no filler phrasing.',
    '- Respond with natural spoken-language coaching, not markdown.',
    '- Keep response to 2-5 concise sentences.',
    '- If user response is weak/vague, ask one pointed follow-up question.',
    '- Include one actionable improvement tip in your response.',
    '',
    roleDirectives.length > 0 ? `Role directives:\n${roleDirectives.map((d) => `- ${d}`).join('\n')}` : 'Role directives: none',
    '',
    candidateMemory ? `${candidateMemory}\n` : '',
    `Conversation history:\n${history}`,
    '',
    `Latest user transcript: ${transcript}`,
  ].join('\n');

  return basePrompt;
};

const getInterviewBehaviorConfig = (body: any): InterviewBehaviorConfig => {
  const persona = body?.persona || {};

  const communicationHardness =
    typeof body?.communicationHardness === 'number'
      ? body.communicationHardness
      : typeof persona?.difficultyLevel === 'number'
      ? persona.difficultyLevel
      : undefined;

  return {
    personaDescription:
      typeof body?.personaDescription === 'string'
        ? body.personaDescription
        : typeof persona?.role === 'string'
        ? persona.role
        : undefined,
    personaName:
      typeof body?.personaName === 'string'
        ? body.personaName
        : typeof persona?.name === 'string'
        ? persona.name
        : undefined,
    primaryMood:
      typeof body?.primaryMood === 'string'
        ? body.primaryMood
        : typeof persona?.mood === 'string'
        ? persona.mood
        : undefined,
    communicationHardness,
    voiceType: typeof body?.voiceType === 'string' ? body.voiceType : undefined,
  };
};

const getGenAI = (apiKey: string) => new GoogleGenerativeAI(apiKey);

const getGeminiModel = (apiKey: string, modelName: string) => {
  return getGenAI(apiKey).getGenerativeModel({ model: modelName });
};

const generateGeminiContent = async (prompt: string, apiKey: string, modelName: string): Promise<string> => {
  const model = getGeminiModel(apiKey, modelName);
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 280,
    },
  });

  const text = result.response.text().trim();
  if (!text) {
    throw new Error('Gemini response did not include text output.');
  }

  return text;
};

const callGemini = async (prompt: string, apiKey: string): Promise<string> => {
  try {
    return await generateGeminiContent(prompt, apiKey, GEMINI_PRIMARY_MODEL);
  } catch (primaryError) {
    console.warn(`[gemini] primary model ${GEMINI_PRIMARY_MODEL} failed, retrying with ${GEMINI_FALLBACK_MODEL}`, primaryError);
    return generateGeminiContent(prompt, apiKey, GEMINI_FALLBACK_MODEL);
  }
};

const streamGeminiToClient = async (prompt: string, apiKey: string, res: any): Promise<void> => {
  const sendEvent = (event: string, payload: Record<string, unknown>) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  const streamFromModel = async (modelName: string) => {
    const model = getGeminiModel(apiKey, modelName);
    return model.generateContentStream({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 280,
      },
    });
  };

  let result;
  try {
    result = await streamFromModel(GEMINI_PRIMARY_MODEL);
  } catch (primaryError) {
    console.warn(`[gemini] primary model ${GEMINI_PRIMARY_MODEL} stream failed, retrying with ${GEMINI_FALLBACK_MODEL}`, primaryError);
    result = await streamFromModel(GEMINI_FALLBACK_MODEL);
  }

  sendEvent('ready', { ok: true });

  for await (const chunk of result.stream as AsyncIterable<GeminiStreamChunk>) {
    const token = chunk.text();
    if (token) {
      sendEvent('token', { token });
    }
  }

  sendEvent('done', { ok: true });
};

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    return res.status(500).json({
      error: 'Missing Gemini API key. Set GEMINI_API_KEY (or API_KEY) in server environment variables.',
    });
  }

  const transcript = typeof req.body?.transcript === 'string' ? req.body.transcript.trim() : '';
  if (!transcript) {
    return res.status(400).json({ error: 'Request must include a non-empty `transcript`.' });
  }

  const streamMode = req.query?.stream === '1' || req.body?.stream === true;

  try {
    const behaviorSystem = buildInterviewerSystem(getInterviewBehaviorConfig(req.body));
    const prompt = `${behaviorSystem}\n\n${buildPrompt(req.body)}`;

    if (streamMode) {
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      if (typeof res.flushHeaders === 'function') {
        res.flushHeaders();
      }

      await streamGeminiToClient(prompt, apiKey, res);
      return res.end();
    }

    const text = await callGemini(prompt, apiKey);
    return res.status(200).json({ text });
  } catch (error: any) {
    if (streamMode && !res.headersSent) {
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    }
    if (streamMode) {
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ error: error?.message || 'Unexpected server error.' })}\n\n`);
      return res.end();
    }
    return res.status(500).json({ error: error?.message || 'Unexpected server error.' });
  }
}
