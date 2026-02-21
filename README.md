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
   - `VITE_SUPABASE_URL` to your Supabase project API URL (`https://<project-ref>.supabase.co`) or dashboard project URL
   - `VITE_SUPABASE_ANON_KEY` to your Supabase anon public key
   - (optional fallback) `SUPABASE_URL` and `SUPABASE_ANON_KEY` are also accepted
3. Restart the dev server after updating env vars so Vite picks up the new values.
4. In Supabase Auth settings, add your local URL (for example `http://localhost:5173`) to **Site URL** and **Redirect URLs** so Google OAuth can return to your app.
5. Run the app:
   `npm run dev`

## Supabase dashboard values to enter

If you are seeing the **OAuth Server** page (with fields like **Authorization Path**), that page is for turning your Supabase project into an OAuth provider for other apps. This app does **not** need that page configured for Google sign-in.

You can leave **OAuth Server** off for this project; it is unrelated to Supabase Auth social login.

Use these settings instead:

1. **Authentication → URL Configuration**
   - **Site URL**: `http://localhost:5173` (or the exact host/port shown by your `npm run dev` output)
   - **Redirect URLs**: add `http://localhost:5173` (and any deployed domain you use)
2. **Authentication → Providers → Google**
   - Enable Google provider
   - Paste your Google OAuth client ID/secret
   - In Google Cloud, add Supabase callback URL:
     `https://<your-project-ref>.supabase.co/auth/v1/callback`

### Google Cloud: Create OAuth client ID (exact values)

On the **Create OAuth client ID** screen shown in your screenshot:

- **Application type**: `Web application`
- **Name**: any label (for example `Supabase Local Web`)
- **Authorized JavaScript origins**:
  - `http://localhost:5173`
- **Authorized redirect URIs**:
  - `https://<your-project-ref>.supabase.co/auth/v1/callback`

Then copy the generated values into Supabase **Authentication → Providers → Google**:

- Google **Client ID** (looks like `123...apps.googleusercontent.com`) → Supabase **Client IDs**
- Google **Client Secret** → Supabase **Client Secret**

After saving, restart your dev server and try Google sign-in again.

### If you still see "Supabase is not configured"

- Confirm your local env file is named exactly `.env.local`.
- Add either:
  - `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
  - or fallback `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- Stop and restart `npm run dev` after env changes.
- Ensure there are no quotes or extra spaces around values.

