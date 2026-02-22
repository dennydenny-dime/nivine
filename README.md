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
