import express from 'express';
import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import crypto from 'node:crypto';

const PORT = Number.parseInt(process.env.PORT || '3001', 10);
const DEFAULT_DEEPGRAM_API_KEY = 'af2a111b30319191c42086846041df2fe412544e';
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY || DEFAULT_DEEPGRAM_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const SESSION_TTL_MS = 1000 * 60 * 30;
const GEMINI_PRIMARY_MODEL = 'gemini-2.5-flash';
const GEMINI_FALLBACK_MODEL = 'gemini-2.5-flash';

if (!process.env.DEEPGRAM_API_KEY) {
  console.warn('[server] DEEPGRAM_API_KEY not set; using the embedded Deepgram fallback key.');
}
if (!GEMINI_API_KEY) {
  console.warn('[server] Missing GEMINI_API_KEY. Gemini responses will fail until it is configured.');
}

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
const deepgram = createClient(DEEPGRAM_API_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY, { apiVersion: 'v1' });
const sessions = new Map();

function createSystemPrompt(persona = {}) {
  const personaName = typeof persona.name === 'string' ? persona.name : 'Interviewer';
  const personaRole = typeof persona.role === 'string' ? persona.role : 'Professional interviewer';
  const personaMood = typeof persona.mood === 'string' ? persona.mood : 'Direct';
  const language = typeof persona.language === 'string' ? persona.language : 'English';
  const hardnessRaw = Number(persona.difficultyLevel);
  const difficultyLevel = Number.isFinite(hardnessRaw) ? Math.min(10, Math.max(1, Math.round(hardnessRaw))) : 5;

  return [
    `You are ${personaName}, an interview persona for a live mock interview.`,
    '',
    '=== PERSONA ===',
    `Persona: ${personaName}`,
    `Role focus: ${personaRole}`,
    `Communication style: ${personaMood}`,
    `Interview language: ${language}`,
    `Difficulty: ${difficultyLevel}/10`,
    '',
    '=== BEHAVIOR ===',
    '- Stay fully in character as the selected interviewer persona.',
    '- Ask exactly one interview question at a time.',
    '- React to the candidate’s latest answer before moving on.',
    '- Keep spoken responses concise, natural, and suitable for real-time TTS.',
    '- Use plain text only. No markdown, bullets, or role labels.',
    '- Typical response length: 1 to 4 sentences.',
    '- If the answer is weak, challenge it with a sharper follow-up.',
    '- If the answer is strong, briefly acknowledge it and continue.',
    '- If the user asks to end, provide a concise closing remark and stop asking questions.',
    '',
    '=== SESSION GOAL ===',
    '- Conduct a realistic interview tailored to the persona.',
    '- Maintain continuity using the chat history provided in the conversation.',
    '- Start with a short greeting and the first interview question when the session begins.'
  ].join('\n');
}

function createSession(sessionId) {
  return {
    id: sessionId,
    ws: null,
    persona: null,
    chatHistory: [],
    transcriptBuffer: '',
    committedUserTranscript: '',
    latestInterimTranscript: '',
    finalizedAiText: '',
    pendingAiText: '',
    ttsTextQueue: [],
    ttsConnection: null,
    sttConnection: null,
    ttsReady: null,
    aiAbortController: null,
    responseInFlight: false,
    turnSequence: 0,
    lastSeenAt: Date.now(),
    keepAliveInterval: null,
  };
}

function getOrCreateSession(sessionId) {
  const existing = sessions.get(sessionId);
  if (existing) {
    existing.lastSeenAt = Date.now();
    return existing;
  }
  const created = createSession(sessionId);
  sessions.set(sessionId, created);
  return created;
}

function sendJson(ws, payload) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  try {
    ws.send(JSON.stringify(payload));
  } catch (error) {
    console.error('[ws] send failed', error);
  }
}

async function closeTransports(session, { dropHistory = false } = {}) {
  if (session.keepAliveInterval) {
    clearInterval(session.keepAliveInterval);
    session.keepAliveInterval = null;
  }

  if (session.aiAbortController) {
    session.aiAbortController.abort();
    session.aiAbortController = null;
  }

  if (session.sttConnection) {
    try { session.sttConnection.requestClose?.(); } catch {}
    try { session.sttConnection.finish?.(); } catch {}
    try { session.sttConnection.removeAllListeners?.(); } catch {}
    session.sttConnection = null;
  }


  session.responseInFlight = false;
  session.pendingAiText = '';
  session.finalizedAiText = '';
  session.ttsTextQueue = [];
  session.latestInterimTranscript = '';
  session.transcriptBuffer = '';
  if (dropHistory) {
    session.chatHistory = [];
    session.committedUserTranscript = '';
  }
}

function maybeCollectSentenceFragments(text, forceFlush = false) {
  const sentences = [];
  let remaining = text;
  const sentenceRegex = /^(.*?[.!?])(?:\s+|$)/;

  while (true) {
    const match = remaining.match(sentenceRegex);
    if (!match) break;
    const sentence = match[1]?.trim();
    if (!sentence) break;
    sentences.push(sentence);
    remaining = remaining.slice(match[0].length).trimStart();
  }

  if (forceFlush && remaining.trim()) {
    sentences.push(remaining.trim());
    remaining = '';
  }

  return { sentences, remaining };
}

function getGeminiModel(modelName, systemInstruction) {
  return genAI.getGenerativeModel({
    model: modelName,
    systemInstruction,
  });
}

async function generateGeminiContentStream({ modelName, contents, systemInstruction, generationConfig }) {
  const model = getGeminiModel(modelName, systemInstruction);
  return model.generateContentStream({
    contents,
    generationConfig,
  });
}

async function queueTtsSentence(session, sentence) {
  const text = sentence.trim();
  if (!text) return;

  try {
    const response = await deepgram.speak.request({ text }, { model: 'aura-asteria-en' });
    const audioBuffer = Buffer.from(await response.arrayBuffer());
    sendJson(session.ws, {
      type: 'tts_audio',
      audio: audioBuffer.toString('base64'),
      sampleRate: 24000,
      encoding: 'linear16',
    });
    sendJson(session.ws, { type: 'tts_flushed' });
    sendJson(session.ws, { type: 'ai_sentence', text });
  } catch (error) {
    console.error('[tts] queue sentence failed', error);
    sendJson(session.ws, { type: 'warning', message: 'TTS temporarily unavailable. Continuing with text only.' });
  }
}

async function streamGeminiResponse(session, userText) {
  if (!GEMINI_API_KEY) {
    sendJson(session.ws, { type: 'error', message: 'Missing GEMINI_API_KEY on the server.' });
    return;
  }

  if (session.responseInFlight) {
    session.aiAbortController?.abort();
  }

  const controller = new AbortController();
  session.aiAbortController = controller;
  session.responseInFlight = true;
  session.pendingAiText = '';
  session.finalizedAiText = '';
  const turnId = ++session.turnSequence;

  const systemInstruction = createSystemPrompt(session.persona);
  const contents = session.chatHistory.map((item) => ({
    role: item.role,
    parts: [{ text: item.text }],
  }));

  contents.push({ role: 'user', parts: [{ text: userText }] });

  const generationConfig = {
    temperature: 0.7,
    maxOutputTokens: 300,
  };

  let result;
  try {
    result = await generateGeminiContentStream({
      modelName: GEMINI_PRIMARY_MODEL,
      contents,
      systemInstruction,
      generationConfig,
    });
  } catch (primaryError) {
    console.warn(`[gemini] primary model ${GEMINI_PRIMARY_MODEL} failed, retrying with ${GEMINI_FALLBACK_MODEL}`, primaryError);
    result = await generateGeminiContentStream({
      modelName: GEMINI_FALLBACK_MODEL,
      contents,
      systemInstruction,
      generationConfig,
    });
  }

  try {
    for await (const chunk of result.stream) {
      if (controller.signal.aborted || turnId !== session.turnSequence) {
        break;
      }

      const text = chunk.text();
      if (!text) continue;

      session.pendingAiText += text;
      sendJson(session.ws, { type: 'ai_text', text, fullText: session.pendingAiText });

      const { sentences, remaining } = maybeCollectSentenceFragments(session.pendingAiText, false);
      session.pendingAiText = remaining;
      for (const sentence of sentences) {
        session.finalizedAiText += `${session.finalizedAiText ? ' ' : ''}${sentence}`;
        await queueTtsSentence(session, sentence);
      }
    }

    if (controller.signal.aborted || turnId !== session.turnSequence) {
      return;
    }

    const { sentences } = maybeCollectSentenceFragments(session.pendingAiText, true);
    session.pendingAiText = '';
    for (const sentence of sentences) {
      session.finalizedAiText += `${session.finalizedAiText ? ' ' : ''}${sentence}`;
      await queueTtsSentence(session, sentence);
    }

    const aiText = session.finalizedAiText.trim();
    if (aiText) {
      session.chatHistory.push({ role: 'user', text: userText });
      session.chatHistory.push({ role: 'model', text: aiText });
    }


    sendJson(session.ws, { type: 'ai_turn_complete', text: aiText });
  } catch (error) {
    if (controller.signal.aborted) {
      sendJson(session.ws, { type: 'warning', message: 'Previous response cancelled for a newer turn.' });
    } else {
      console.error('[gemini] stream failed', error);
      sendJson(session.ws, { type: 'error', message: 'Gemini temporarily unavailable. Please continue speaking or retry.' });
    }
  } finally {
    if (session.aiAbortController === controller) {
      session.aiAbortController = null;
    }
    session.responseInFlight = false;
    session.pendingAiText = '';
  }
}

async function initializeStt(session) {
  if (!DEEPGRAM_API_KEY) {
    throw new Error('Missing DEEPGRAM_API_KEY on the server.');
  }

  if (session.sttConnection) {
    return session.sttConnection;
  }

  const connection = deepgram.listen.live({
    model: 'nova-2',
    punctuate: true,
    interim_results: true,
    smart_format: true,
    encoding: 'webm-opus',
    channels: 1,
    endpointing: 300,
    utterance_end_ms: 1000,
  });

  session.sttConnection = connection;

  connection.on(LiveTranscriptionEvents.Open, () => {
    sendJson(session.ws, { type: 'ready', sessionId: session.id });
  });

  connection.on(LiveTranscriptionEvents.Error, (error) => {
    console.error('[stt] error', error);
    sendJson(session.ws, { type: 'warning', message: 'Speech recognition hiccup detected. Attempting to continue.' });
  });

  connection.on(LiveTranscriptionEvents.Close, () => {
    session.sttConnection = null;
  });

  connection.on(LiveTranscriptionEvents.Transcript, async (payload) => {
    try {
      const alternative = payload?.channel?.alternatives?.[0];
      const transcript = (alternative?.transcript || '').trim();
      if (!transcript) return;

      const isFinal = Boolean(payload?.is_final);
      session.latestInterimTranscript = transcript;
      sendJson(session.ws, {
        type: 'transcript',
        text: transcript,
        isFinal,
        speechFinal: Boolean(payload?.speech_final),
      });

      if (isFinal) {
        session.transcriptBuffer = `${session.transcriptBuffer} ${transcript}`.trim();
      }

      if (payload?.speech_final) {
        const committed = session.transcriptBuffer.trim() || transcript;
        session.committedUserTranscript = committed;
        session.transcriptBuffer = '';
        session.latestInterimTranscript = '';
        sendJson(session.ws, { type: 'user_turn_complete', text: committed });
        await streamGeminiResponse(session, committed);
      }
    } catch (error) {
      console.error('[stt] transcript handler failed', error);
      sendJson(session.ws, { type: 'warning', message: 'Could not process one transcript update, but the session is still live.' });
    }
  });

  session.keepAliveInterval = setInterval(() => {
    try {
      connection.keepAlive?.();
    } catch {}
  }, 8_000);

  return connection;
}

async function handleStart(session, payload) {
  session.persona = payload.persona || session.persona || {};
  if (!Array.isArray(session.chatHistory) || payload.resetHistory) {
    session.chatHistory = [];
  }

  await initializeStt(session);

  if (!session.chatHistory.length) {
    await streamGeminiResponse(session, 'Begin the interview now with a short greeting and your first question.');
  } else {
    sendJson(session.ws, { type: 'session_resumed', sessionId: session.id });
  }
}

wss.on('connection', (ws) => {
  let session = null;

  ws.on('message', async (raw, isBinary) => {
    try {
      if (isBinary) {
        if (!session?.sttConnection) return;
        session.lastSeenAt = Date.now();
        session.sttConnection.send(raw);
        return;
      }

      const message = JSON.parse(raw.toString());
      if (message.type === 'start') {
        const sessionId = typeof message.sessionId === 'string' && message.sessionId.trim()
          ? message.sessionId.trim()
          : crypto.randomUUID();
        session = getOrCreateSession(sessionId);
        session.ws = ws;
        session.lastSeenAt = Date.now();
        await handleStart(session, message);
        return;
      }

      if (!session) {
        sendJson(ws, { type: 'error', message: 'Session not started yet.' });
        return;
      }

      session.lastSeenAt = Date.now();

      if (message.type === 'audio_chunk' && message.audio) {
        const audioBuffer = Buffer.from(message.audio, 'base64');
        session.sttConnection?.send(audioBuffer);
        return;
      }

      if (message.type === 'text_input' && typeof message.text === 'string' && message.text.trim()) {
        await streamGeminiResponse(session, message.text.trim());
        return;
      }

      if (message.type === 'ping') {
        sendJson(ws, { type: 'pong', sessionId: session.id });
        return;
      }

      if (message.type === 'end') {
        await closeTransports(session);
        sendJson(ws, { type: 'session_ended', sessionId: session.id });
      }
    } catch (error) {
      console.error('[ws] message handler failed', error);
      sendJson(ws, { type: 'error', message: 'Server could not process that message.' });
    }
  });

  ws.on('close', async () => {
    if (!session) return;
    session.ws = null;
    session.lastSeenAt = Date.now();
    if (session.keepAliveInterval) {
      clearInterval(session.keepAliveInterval);
      session.keepAliveInterval = null;
    }
  });

  ws.on('error', (error) => {
    console.error('[ws] client error', error);
  });
});

setInterval(async () => {
  const now = Date.now();
  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.lastSeenAt <= SESSION_TTL_MS) continue;
    await closeTransports(session, { dropHistory: true });
    sessions.delete(sessionId);
  }
}, 60_000).unref();

server.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
