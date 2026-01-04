# 🔐 Environment Variables for Deployment

## Required Environment Variables

When deploying to **Vercel**, **Replit**, or **Railway**, add these environment variables in your platform's settings:

### 1. **VITE_GEMINI_API_KEY** (Required for AI Chatbot)
- **Description:** Google Gemini API Key for the AI chatbot on the home page
- **Where to get it:** https://makersuite.google.com/app/apikey
- **Example:** `AIzaSyDsw6Lprd7DjnF6KL3eY4n2FjfCwsPuo-U`
- **Platform Settings:**
  - **Vercel:** Project Settings → Environment Variables → Add `VITE_GEMINI_API_KEY`
  - **Replit:** Secrets tab → Add `VITE_GEMINI_API_KEY`
  - **Railway:** Variables tab → Add `VITE_GEMINI_API_KEY`

### 2. **NODE_ENV** (Optional - Auto-set by platforms)
- **Description:** Node environment mode
- **Value:** `production`
- **Note:** Most platforms set this automatically

### 3. **PORT** (Optional - Auto-set by platforms)
- **Description:** Server port number
- **Value:** `5000` (or platform's assigned port)
- **Note:** Most platforms assign this automatically

---

## How to Add Environment Variables

### Vercel
1. Go to your project dashboard
2. Click **Settings** → **Environment Variables**
3. Add each variable:
   - **Key:** `VITE_GEMINI_API_KEY`
   - **Value:** Your actual API key
   - **Environment:** Production, Preview, Development (select all)
4. Click **Save**
5. Redeploy your project

### Replit
1. Open your Replit project
2. Click the **Secrets** tab (lock icon in sidebar)
3. Click **+ New Secret**
4. Add:
   - **Key:** `VITE_GEMINI_API_KEY`
   - **Value:** Your actual API key
5. Click **Add Secret**
6. Restart your Repl

### Railway
1. Open your Railway project
2. Go to **Variables** tab
3. Click **+ New Variable**
4. Add:
   - **Key:** `VITE_GEMINI_API_KEY`
   - **Value:** Your actual API key
5. Click **Add**
6. Railway will auto-redeploy

---

## Important Notes

⚠️ **Security:**
- Never commit `.env` files to Git (already in `.gitignore`)
- Always use platform's environment variable settings
- Keep your API keys secret

✅ **After Adding Variables:**
- Redeploy your application
- Test the AI chatbot on the home page
- Verify it's working before sharing the link

---

## Testing

After deployment, test:
1. Open your live site
2. Look for the "Ask AI" button (bottom right)
3. Click it and ask a question
4. If it responds, the API key is working! ✅

