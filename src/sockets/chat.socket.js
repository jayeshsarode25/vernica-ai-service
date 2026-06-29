const {
  getRecentMessages,
  saveMessage,
} = require("../services/chatHistory.service");
const {
  BOT_NAME,
  getBeautyAssistantReply,
} = require("../services/gemini.service");

const MAX_MESSAGE_LENGTH = 500;
const RATE_LIMIT_WINDOW_MS = 10000;
const RATE_LIMIT_MAX_MESSAGES = 5;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const SESSION_CLEANUP_MS = 60 * 60 * 1000;

const CONTACT_KEYWORDS = [
  "order",
  "buy",
  "contact",
  "whatsapp",
  "inquiry",
  "expert",
  "human",
  "support",
  "customer care",
  "beauty expert",
  "talk",
  "chat",
  "help choosing",
  "purchase",
  "price",
  "call",
  "phone",
  "number",
  "kharid",
  "khareed",
  "mangwana",
  "sampark",
  "madat",
  "sahayata",
  "ऑर्डर",
  "खरीद",
  "नंबर",
  "व्हाट्सएप",
  "संपर्क",
  "मदत",
  "सहाय्य",
];

const socketRateLimits = new Map();
const sessionStates = new Map();

const sessionCleanupTimer = setInterval(() => {
  const now = Date.now();

  for (const [sessionId, state] of sessionStates) {
    if (now - state.lastActive > SESSION_TTL_MS) {
      sessionStates.delete(sessionId);
    }
  }
}, SESSION_CLEANUP_MS);

sessionCleanupTimer.unref?.();

const getContactInfo = () => ({
  inquiryNumber: process.env.INQUIRY_NUMBER || "+91XXXXXXXXXX",
  whatsappNumber: process.env.WHATSAPP_NUMBER || "+91XXXXXXXXXX",
});

const shouldShareContactNow = (text) => {
  const normalizedText = text.toLowerCase();

  return CONTACT_KEYWORDS.some((keyword) => normalizedText.includes(keyword));
};

const normalizePayload = (payload) => {
  if (typeof payload === "string") {
    return {
      message: payload,
    };
  }

  return payload || {};
};

const isRateLimited = (socketId) => {
  const now = Date.now();
  const timestamps = (socketRateLimits.get(socketId) || []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
  );

  if (timestamps.length >= RATE_LIMIT_MAX_MESSAGES) {
    socketRateLimits.set(socketId, timestamps);
    return true;
  }

  timestamps.push(now);
  socketRateLimits.set(socketId, timestamps);
  return false;
};

const getSessionState = (sessionId) => {
  return (
    sessionStates.get(sessionId) || {
      messageCount: 0,
      contactShared: false,
      lastActive: Date.now(),
    }
  );
};

const registerChatSocket = (io) => {
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("user_message", async (payload) => {
      const { message, sessionId: payloadSessionId } = normalizePayload(payload);
      const text = typeof message === "string" ? message.trim() : "";
      const sessionId = payloadSessionId || socket.id;

      if (!text) {
        socket.emit("chat_error", {
          success: false,
          message: "Message cannot be empty.",
        });
        return;
      }

      if (text.length > MAX_MESSAGE_LENGTH) {
        socket.emit("chat_error", {
          success: false,
          message: `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters.`,
        });
        return;
      }

      if (isRateLimited(socket.id)) {
        socket.emit("chat_error", {
          success: false,
          message: "You are sending messages too quickly. Please wait a moment.",
        });
        return;
      }

      const state = getSessionState(sessionId);

      try {
        state.messageCount += 1;
        state.lastActive = Date.now();
        sessionStates.set(sessionId, state);

        const history = await getRecentMessages(sessionId);

        await saveMessage({
          sessionId,
          socketId: socket.id,
          sender: "user",
          text,
        });

        socket.emit("bot_typing", {
          sessionId,
          isTyping: true,
          botName: BOT_NAME,
        });

        const reply = await getBeautyAssistantReply({
          message: text,
          history,
        });

        const contactInfo = getContactInfo();
        const isContactRequest = shouldShareContactNow(text);
        const shouldShareContact =
          !state.contactShared && (isContactRequest || state.messageCount >= 5);

        if (shouldShareContact) {
          state.contactShared = true;
          state.lastActive = Date.now();
          sessionStates.set(sessionId, state);
        }

        const savedReply = await saveMessage({
          sessionId,
          socketId: socket.id,
          sender: "bot",
          text: reply,
        });

        socket.emit("bot_typing", {
          sessionId,
          isTyping: false,
          botName: BOT_NAME,
        });

        socket.emit("bot_reply", {
          success: true,
          sessionId,
          botName: BOT_NAME,
          message: reply,
          createdAt: savedReply.createdAt,
        });

        if (shouldShareContact) {
          socket.emit("contact_info", {
            success: true,
            sessionId,
            botName: BOT_NAME,
            message: "Talk to Varnika beauty expert",
            inquiryNumber: contactInfo.inquiryNumber,
            whatsappNumber: contactInfo.whatsappNumber,
          });
        }
      } catch (error) {
        console.error("Chat error:", error.message);

        socket.emit("bot_typing", {
          sessionId,
          isTyping: false,
          botName: BOT_NAME,
        });

        socket.emit("chat_error", {
          success: false,
          sessionId,
          message:
            error.name === "AbortError"
              ? "Response took too long. Please try again."
              : "Varnika Beauty Assistant is temporarily unavailable. Please try again in a moment.",
        });
      }
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
      socketRateLimits.delete(socket.id);
    });
  });
};

module.exports = registerChatSocket;
