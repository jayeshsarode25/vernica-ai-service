const ChatMessage = require("../models/ChatMessage");

const saveMessage = ({ sessionId, socketId, sender, text }) => {
  return ChatMessage.create({
    sessionId,
    socketId,
    sender,
    text,
  });
};

const getRecentMessages = async (sessionId, limit = 12) => {
  const messages = await ChatMessage.find({ sessionId })
    .sort({ createdAt: -1 })
    .limit(limit);

  return messages.reverse();
};

module.exports = {
  getRecentMessages,
  saveMessage,
};
