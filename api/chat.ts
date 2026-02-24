type ChatHistoryItem = {
  speaker?: 'user' | 'ai' | string;
  text?: string;
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

const callGemini = async (prompt: string, apiKey: string): Promise<string> => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
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

  const data: any = await response.json();
  const text = data?.candidates?.[0]?.content?.parts
    ?.map((part: any) => (typeof part?.text === 'string' ? part.text : ''))
    .join('')
    .trim();

  if (!text) {
    throw new Error('Gemini response did not include text output.');
  }

  return text;
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

  try {
    const prompt = buildPrompt(req.body);
    const text = await callGemini(prompt, apiKey);
    return res.status(200).json({ text });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error.' });
  }
}
