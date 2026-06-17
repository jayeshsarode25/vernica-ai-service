# Vernika Beauty Chatbot Backend

Node.js, Express, Socket.io, Gemini, and MongoDB backend for the Vernika beauty website chatbot.

## Folder Structure

```text
src/
  app.js
  server.js
  config/
    db.js
    gemini.js
  models/
    ChatMessage.js
  routes/
    chat.routes.js
  services/
    chatHistory.service.js
    gemini.service.js
  sockets/
    chat.socket.js
```

## Install

```bash
npm install
```

## Environment

Create `.env` from `.env.example` and add your Gemini API key from Google AI Studio.

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/vernica_organic_ai
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
GEMINI_FALLBACK_MODELS=gemini-3.1-flash-lite
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
INQUIRY_NUMBER=+91 1234567890
WHATSAPP_NUMBER=+91 1234567890
```

## Run

```bash
npm run dev
```

Production-style start:

```bash
npm start
```

## Socket Events

Frontend emits:

```js
socket.emit("user_message", {
  sessionId: "optional-session-id",
  message: "Tell me about Vernika brightening benefits",
});
```

Backend emits:

```js
socket.on("bot_typing", (data) => {});
socket.on("bot_reply", (data) => {});
socket.on("chat_error", (error) => {});
socket.on("contact_info", (data) => {});
```

## Chat History

Fetch saved messages for a session:

```http
GET /api/chats/:sessionId
```
