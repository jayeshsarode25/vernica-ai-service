const {
  getRecentMessages,
  saveMessage,
} = require("../services/chatHistory.service");
const {
  BOT_NAME,
  getBeautyAssistantReply,
} = require("../services/gemini.service");

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

const sessionState = {};

const getContactInfo = () => ({
  inquiryNumber: process.env.INQUIRY_NUMBER || "+91XXXXXXXXXX",
  whatsappNumber: process.env.WHATSAPP_NUMBER || "+91XXXXXXXXXX",
});

const getContactMessage = ({ inquiryNumber, whatsappNumber }) =>
  [
    "Thank you for sharing your details 💗",
    "For personal guidance and order inquiry, you can contact our Vernika beauty expert:",
    "",
    `📞 Inquiry Number: ${inquiryNumber}`,
    `💬 WhatsApp: ${whatsappNumber}`,
    "",
    "You can also share your name, skin concern, and preferred product here, and our team will help you.",
  ].join("\n");

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

const registerChatSocket = (io) => {
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    sessionState[socket.id] = {
      messageCount: 0,
      contactShared: false,
    };

    socket.on("user_message", async (payload) => {
      const { message, sessionId: payloadSessionId } = normalizePayload(payload);
      const text = typeof message === "string" ? message.trim() : "";
      const sessionId = payloadSessionId || socket.id;
      const state = sessionState[socket.id] || {
        messageCount: 0,
        contactShared: false,
      };

      if (!text) {
        socket.emit("chat_error", {
          success: false,
          message: "Message is required",
        });
        return;
      }

      try {
        state.messageCount += 1;
        sessionState[socket.id] = state;

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
        const shouldAppendContact =
          !state.contactShared && (isContactRequest || state.messageCount >= 5);
        const finalReply = shouldAppendContact
          ? `${reply}\n\n${getContactMessage(contactInfo)}`
          : reply;

        if (shouldAppendContact) {
          state.contactShared = true;
          sessionState[socket.id] = state;
        }

        const savedReply = await saveMessage({
          sessionId,
          socketId: socket.id,
          sender: "bot",
          text: finalReply,
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
          message: finalReply,
          createdAt: savedReply.createdAt,
        });

        if (shouldAppendContact) {
          socket.emit("contact_info", {
            success: true,
            sessionId,
            botName: BOT_NAME,
            message: "Talk to Vernika beauty expert",
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
          message: "Vernika Beauty Assistant is unavailable right now. Please try again shortly.",
        });
      }
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
      delete sessionState[socket.id];
    });
  });
};

module.exports = registerChatSocket;
