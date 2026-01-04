# 🔧 Environment Setup Instructions

## Step 1: Create .env File

Create a file named `.env` in the root directory with this content:

```env
# Google Gemini API Key for AI Chatbot
AIzaSyCw2sujfI8nHvovUTuBEXbYoQkSHRkoXMw=आपकी_API_KEY_यहाँ_पेस्ट_करें

# Server Environment
NODE_ENV=production
PORT=5000
```

**Important:** Replace `आपकी_API_KEY_यहाँ_पेस्ट_करें` with your actual Gemini API key.

## Step 2: Get Your Gemini API Key

1. Go to: https://makersuite.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the API key
5. Paste it in the `.env` file

## Step 3: Verify Setup

After creating `.env`:
- The AI chatbot will automatically use the API key
- No server restart needed for development
- For production, add the variable to your deployment platform

## For Deployment Platforms

When deploying, add `AIzaSyCw2sujfI8nHvovUTuBEXbYoQkSHRkoXMw` to your platform's environment variables:
- **Vercel:** Settings → Environment Variables
- **Replit:** Secrets tab
- **Railway:** Variables tab

See `ENVIRONMENT_VARIABLES.md` for detailed instructions.

