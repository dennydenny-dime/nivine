<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1ubcYEKoruC1u0ihSS6ovuhp7aQYB8KR5

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Create a `.env.local` file and set:
   - `VITE_API_KEY` (or `GEMINI_API_KEY`) to your Gemini API key
   - `VITE_SUPABASE_URL` to your Supabase project URL or project ref
   - `VITE_SUPABASE_ANON_KEY` to your Supabase anon key
3. In Supabase Auth settings, add your local URL (for example `http://localhost:5173`) to allowed redirect URLs when using Google OAuth.
4. Restart the dev server after updating env vars so Vite picks up the new values.
5. Run the app:
   `npm run dev`

## Voice workflow for neural modules

All neural training modules now follow this loop:

`FRONTEND (Voice/Prompt) → WebSocket or SSE Connection → BACKEND STREAM → Gemini AI Stream API → Streaming Tokens → FRONTEND UI Real-time Answer`

To use your own backend, set `VITE_BACKEND_API_URL` (example: `http://localhost:3000/api`).
The frontend posts to `<VITE_BACKEND_API_URL>/chat` (or `/api/chat` when the env var is omitted) with transcript + persona metadata.



### Vercel deployment note (fixes `/api/chat` 404)

This repo now includes a built-in Vercel Serverless Function at `api/chat.ts`.
If you deploy to Vercel, add `GEMINI_API_KEY` (or `API_KEY`) in your project Environment Variables so `/api/chat` can generate responses.
