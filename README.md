# 🚀 Voice Chrome Extension

Voice-enabled Chrome extension with AI integration and email functionality.

## 🚀 PROJECT SETUP INSTRUCTIONS

### 1. 🖥️ CLIENT SETUP
```bash
cd client
npm install
npm run dev
```
In extension paste deepgram api key (https://deepgram.com/)

### 2. ⚙️ SERVER SETUP
```bash
cd server
npm install
```

Create `.env` file:
```env
PORT=5000
EMAIL=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
COHERE_API_KEY=your-cohere-api-key
```

**Get API Keys:**
- EMAIL_PASSWORD: https://myaccount.google.com/apppasswords
- COHERE_API_KEY: https://dashboard.cohere.com/api-keys

Start server:
```bash
npm run dev
```

### 3. 🌐 CHROME EXTENSION SETUP
```bash
cd client
npm run build
```

**In Chrome Browser:**
1. Go to chrome://extensions/
2. 🔧 Enable Developer Mode (toggle)
3. 📤 Click "Load Unpacked"
4. 📁 Select the generated 'dist' folder

**🎤 To enable microphone:**
1. 🔍 Note extension ID from details page
2. 🌐 Visit: chrome-extension://YOUR_EXTENSION_ID/index.html
3. 🎙️ Grant microphone permissions

## ⚠️ TROUBLESHOOTING
• 🔍 Check all API tokens are correctly placed
• ⚙️ Verify Node.js (v18+) and npm are installed
• 🚨 Check console for errors

## 📞 Support
📧 Contact: praveengamini009@gmail.com

## 🚀 Features
- 🎙️ Voice recognition with Deepgram
- 🤖 AI responses using Cohere
- 📧 Email integration with Gmail
- 🔧 Chrome extension interface

## 📋 Quick Commands
```bash
# Client
npm install && npm run dev    # Development
npm run build                 # Production build

# Server  
npm install && npm run dev    # Start server
```

## 🔒 Security
- Never commit .env files
- Use app passwords for Gmail
- Keep API keys secure

---
**Happy Coding! 🎉**
