type ChatHistoryItem = {
  speaker?: 'user' | 'ai' | string;
  text?: string;
};

type GeminiCandidate = {
  content?: {
    parts?: Array<{ text?: string }>;
  };
};

type GeminiChunk = {
  candidates?: GeminiCandidate[];
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

  return [
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
    `Conversation history:\n${history}`,
    '',
    `Latest user transcript: ${transcript}`,
  ].join('\n');
};

const extractTextFromChunk = (chunk: GeminiChunk): string => {
  return (chunk?.candidates || [])
    .flatMap((candidate) => candidate?.content?.parts || [])
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .join('');
};

const callGemini = async (prompt: string, apiKey: string): Promise<string> => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 280,
        },
      }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini request failed (${response.status}): ${errorBody}`);
  }

  const data: GeminiChunk = await response.json();
  const text = extractTextFromChunk(data).trim();

  if (!text) {
    throw new Error('Gemini response did not include text output.');
  }

  return text;
};

const streamGeminiToClient = async (prompt: string, apiKey: string, res: any): Promise<void> => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 280,
        },
      }),
    },
  );

  if (!response.ok || !response.body) {
    const errorBody = await response.text();
    throw new Error(`Gemini stream request failed (${response.status}): ${errorBody}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = '';

  const sendEvent = (event: string, payload: Record<string, unknown>) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  sendEvent('ready', { ok: true });

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      pending += decoder.decode(value, { stream: true });
      const blocks = pending.split('\n\n');
      pending = blocks.pop() || '';

      for (const block of blocks) {
        const dataLine = block
          .split('\n')
          .map((line) => line.trim())
          .find((line) => line.startsWith('data:'));

        if (!dataLine) continue;

        const jsonText = dataLine.slice(5).trim();
        if (!jsonText || jsonText === '[DONE]') continue;

        try {
          const chunk: GeminiChunk = JSON.parse(jsonText);
          const token = extractTextFromChunk(chunk);
          if (token) {
            sendEvent('token', { token });
          }
        } catch {
          // Ignore malformed stream chunks and continue.
        }
      }
    }

    sendEvent('done', { ok: true });
  } finally {
    reader.releaseLock();
  }
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
    const prompt = buildPrompt(req.body);

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
