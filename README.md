# 🛒 Shahdol Bazaar - Digital Marketplace MVP

## 🚀 Production Ready!

Your complete digital marketplace platform is ready for deployment!

---

## ✨ Features

### 👥 User Management
- Customer registration and login
- Seller account creation
- Admin panel for platform management

### 🏪 Shop Management
- Shop creation and customization
- Multiple categories
- Shop verification system
- Shop detail pages

### 📦 Product Management
- Product creation and editing
- Product search across all shops
- Category browsing
- Product detail pages

### 🛒 Shopping Experience
- Shopping cart
- Product search
- Category filtering
- Mobile-responsive design

### 🤖 AI Chatbot
- AI-powered customer support
- Available on all pages
- Powered by Google Gemini

### 👨‍💼 Seller Dashboard
- Partner dashboard at `/partner`
- Shop and product management
- Profile editing

### 🔐 Admin Panel
- Complete platform oversight
- Shop approval and verification
- Product moderation
- Edit/Delete capabilities

---

## 🔑 Initial Account Setup

For local development and testing, create initial administrative and seller credentials using the secure CLI scripts:

```bash
# Create initial Super Admin (generates a secure password or reads from ADMIN_PASSWORD env)
npx tsx scripts/create-admin.ts
```

> [!NOTE]
> Never deploy with default or demo passwords. Set `ADMIN_PASSWORD` in your production environment variables.

---

## 🚀 Quick Start

### Development
```bash
npm install
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

---

## 🔐 Environment Variables

Copy `.env.example` to `.env` and configure your environment variables:

```bash
cp .env.example .env
```

### AI Chatbot Configuration:
Configure your AI provider in `.env`:
```bash
# Groq (Primary conversational engine)
GROQ_API_KEY=your_groq_api_key_here

# Or Gemini (if using Google Generative AI)
# GEMINI_API_KEY=your_gemini_api_key_here
```

See `ENVIRONMENT_VARIABLES.md` and `.env.example.ai` for detailed setup instructions.

---

## 📚 Documentation

- `DEPLOYMENT.md` - Deployment guide
- `ENVIRONMENT_VARIABLES.md` - Environment setup
- `SETUP_ENV.md` - Local environment setup
- `LAUNCH_SUMMARY.md` - Feature list
- `FINAL_CHECKLIST.md` - Pre-launch checklist

---

## 🌐 Deployment

### Quick Deploy Options:

1. **Replit:** Push code → Run `npm run build && npm start`
2. **Vercel:** `vercel --prod`
3. **Railway:** Connect GitHub → Auto-deploy

See `DEPLOYMENT.md` for detailed instructions.

---

## ✅ Status

- ✅ Production build ready
- ✅ Admin panel functional
- ✅ Partner dashboard working
- ✅ AI chatbot configured
- ✅ All features tested

**Ready to go LIVE!** 🎉

---

## 📞 Support

For deployment help, see:
- `QUICK_DEPLOY.md` - Fast deployment guide
- `DEPLOYMENT.md` - Detailed deployment instructions

---

**Built with ❤️ for Shahdol Bazaar**
