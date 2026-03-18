# Node AI

Node AI is a React + Vite interview and communication training platform that helps users practice high-pressure conversations with AI personas, measure speaking quality, and track improvement over time.

The app combines live AI interview sessions, role-based coaching, daily quizzes, leaderboard mechanics, subscription-aware access control, and backend APIs for payment + entitlement syncing.

## What the app does

Node AI is designed for people who want to improve how they speak in interviews, leadership conversations, sales situations, and other performance-driven discussions.

Users can:
- practice with preset interview personas,
- run voice-based mock interview sessions,
- create custom coaching experiences,
- complete AI-generated daily communication quizzes,
- review saved session history and progress,
- monitor interview-related news and question trends,
- unlock additional limits and tools through subscription plans.

## How it works

### 1. Landing and entry
The landing page introduces the product as an interview intelligence console and routes the user into the main training experience.

### 2. Choose a training mode
Inside the app, users select a practice language and launch a preset persona-based training module. Personas represent different interview or business communication styles such as recruiters, investors, managers, and strict evaluators.

### 3. Start a live AI conversation
The conversation room opens a live audio session with Gemini. The app:
- captures the user's microphone audio,
- connects to Gemini live audio generation,
- keeps the AI in character using a persona-specific system prompt,
- plays generated voice responses back in real time,
- stores the transcript locally when the session ends.

The system prompt adjusts behavior based on persona, tone, language, and difficulty level so the practice can feel supportive, formal, skeptical, or high-pressure.

### 4. Get structured practice outside live calls
The app also includes quiz-based training for communication scenarios. These quizzes evaluate answer quality using scoring logic such as filler-word detection, weak-language penalties, STAR-style structure signals, quantified-results signals, repetition checks, and passive-voice penalties.

### 5. Track progress and access
Authentication and subscription syncing are used to personalize access. User state, quiz progress, and conversation history are stored client-side, while subscription tier data is resolved through backend APIs and Firestore.

## Core features

### Live AI interview simulation
- Real-time voice conversations with AI personas.
- Persona-driven behavior for mood, pressure, and speaking style.
- Multi-language practice support.
- Fullscreen interview flow for an immersive practice session.
- Local conversation history saving for later review.

### Preset training personas
- Built-in personas such as an executive recruiter, angel investor, salesperson, academic supervisor, and company manager.
- Difficulty and tone shaping through persona mood and hardness level.
- Voice selection mapped by persona gender for audio playback.

### Custom coaching
- Additional coaching workflows beyond the preset neural modules.
- Plan-based access control for custom coaches and advanced usage.

### Daily quiz and evaluation system
- AI-assisted communication scenario generation.
- Category-based training across interviews, leadership, sales, networking, and conflict resolution.
- Evaluation signals for clarity, confidence, conciseness, structure, and relevance.
- User stats and progress tracking for repeated practice.

### Personal dashboard and history
- Review prior sessions.
- Track quiz and speaking activity over time.
- Persist user-specific data locally for quick access.

### Interview Intel
- Interview-oriented news and question discovery experience.
- Role and topic filtering to help users prepare for current conversation themes.

### Leaderboard and gamification
- Quiz participation and XP-based leaderboard behavior.
- Shared pool tracking for returning users.

### Authentication and presence
- Firebase-based authentication support.
- Presence tracking through Firebase Realtime Database to estimate active users online.

### Subscription and payment support
- Tier-aware limits for neural sessions and coaching calls.
- Backend subscription API for reading and writing user entitlements.
- Razorpay webhook support for updating subscription records after successful payments.
- Firestore-backed subscription source of truth.

## Subscription model

The app includes four plan tiers:
- **Free**: limited neural interview calls and quiz access.
- **Premium**: more calls, coaching access, leaderboard, and custom coach support.
- **Elite**: higher monthly limits and longer coaching sessions.
- **Team**: highest limits with broader access and unlimited custom coach creation.

Feature availability such as call limits, call duration, leaderboard access, and custom coach support depends on the active subscription tier.

## Tech stack

- **Frontend:** React 19, TypeScript, Vite
- **AI:** Google Gemini (`@google/genai`)
- **Auth + Realtime:** Firebase, Firebase Realtime Database
- **Backend APIs:** Vercel-style serverless endpoints in `api/`
- **Admin data layer:** Firebase Admin SDK
- **Payments:** Razorpay webhook integration

## Project structure

```text
.
├── api/                # Serverless endpoints for chat, subscription, and webhook flows
├── components/         # UI screens and feature modules
├── lib/                # Auth, storage, interview behavior, and subscription helpers
├── utils/              # Audio helpers
├── App.tsx             # Main app shell and navigation/state orchestration
├── constants.tsx       # Personas, languages, voice mapping, env helpers
├── types.ts            # Shared TypeScript types
└── README.md
```

## Running locally

### Prerequisites
- Node.js
- npm

### Install
```bash
npm install
```

### Environment variables
Create a `.env.local` file and configure the values you need.

#### Required for AI features
```bash
VITE_API_KEY=your_gemini_api_key
```

You can also provide:
```bash
GEMINI_API_KEY=your_gemini_api_key
```

#### Optional frontend / integration settings
```bash
VITE_FIREBASE_API_KEY=your_firebase_web_api_key
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
VITE_BACKEND_API_URL=http://localhost:3000/api
VITE_NEWSDATA_API_KEY=your_newsdata_api_key
```

#### Required for backend subscription + webhook flows
```bash
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY=your_private_key
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
SUBSCRIPTION_ADMIN_SECRET=your_admin_secret
```

> If you place private keys in hosted environment variable UIs, escape line breaks in `FIREBASE_PRIVATE_KEY` as `\\n` when needed.

### Start development server
```bash
npm run dev
```

### Build for production
```bash
npm run build
```

## Backend API overview

### `POST /api/chat`
Generates a persona-aware coaching response from transcript input and can stream tokens back to the frontend.

### `POST /api/subscription`
- `action: "get"` reads the current subscription tier.
- `action: "set"` updates a user's tier when the correct admin secret is provided.

### `POST /api/razorpay-webhook`
Validates Razorpay webhook signatures and updates Firestore subscription records when payments are captured.

## Typical user journey

1. Open the landing page.
2. Enter the app and select a language.
3. Start a preset interview persona or coaching flow.
4. Speak with the AI and receive in-character responses.
5. End the session and review stored history.
6. Complete quizzes to improve structured communication.
7. Track standing, stats, and subscription-based access over time.

## Notes

- The app depends on microphone access for live voice sessions.
- Some advanced capabilities require valid Firebase, Gemini, and payment configuration.
- Subscription sync is designed to avoid relying only on browser-local state.
