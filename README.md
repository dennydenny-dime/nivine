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
   - `VITE_FIREBASE_API_KEY` if you want to override the default Firebase web API key
3. Restart the dev server after updating env vars so Vite picks up the new values.
4. Run the app:
   `npm run dev`

## Voice workflow for neural modules

All neural training modules now follow this loop:

`FRONTEND (Voice/Prompt) → WebSocket or SSE Connection → BACKEND STREAM → Gemini AI Stream API → Streaming Tokens → FRONTEND UI Real-time Answer`

To use your own backend, set `VITE_BACKEND_API_URL` (example: `http://localhost:3000/api`).
The frontend posts to `<VITE_BACKEND_API_URL>/chat` (or `/api/chat` when the env var is omitted) with transcript + persona metadata.



### Vercel deployment note (fixes `/api/chat` 404)

This repo now includes a built-in Vercel Serverless Function at `api/chat.ts`.
If you deploy to Vercel, add `GEMINI_API_KEY` (or `API_KEY`) in your project Environment Variables so `/api/chat` can generate responses.


## Server-side subscription source of truth

This repo now includes API routes to keep subscription tier in Firestore and avoid browser-only state:

- `POST /api/subscription`
  - `action: "get"` reads from Firestore (`subscriptions` + `subscriptionsByUid`) and returns `{ tier }`.
  - `action: "set"` writes tier server-side and requires `x-subscription-admin-secret` to match `SUBSCRIPTION_ADMIN_SECRET`.
- `POST /api/razorpay-webhook`
  - Verifies `x-razorpay-signature` using `RAZORPAY_WEBHOOK_SECRET`.
  - Handles `payment.captured` and writes `{ tier, email/userId }` to Firestore.

### Required environment variables

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (use `\\n` for newlines in hosted env var UIs)
- `RAZORPAY_WEBHOOK_SECRET`
- `SUBSCRIPTION_ADMIN_SECRET`
- `VITE_BACKEND_API_URL` (optional, defaults to `/api`)

### Razorpay notes required on checkout

The frontend now sends these Razorpay `notes` so webhook can map payment to a user:

- `planTier` (`premium` | `elite` | `team`)
- `userEmail`
- `userId`

Configure Razorpay webhook URL to:

`https://<your-domain>/api/razorpay-webhook`

Enable at least `payment.captured` in Razorpay webhook events.
