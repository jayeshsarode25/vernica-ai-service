require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");

const app = require("./src/app");
const connectDB = require("./src/config/db");
const { corsOrigin, getAllowedOrigins } = require("./src/config/cors");
const registerChatSocket = require("./src/sockets/chat.socket");

const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.json({
    message: "AI Chat service is running"
  });
});

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

registerChatSocket(io);

httpServer.listen(PORT, "0.0.0.0", async () => {
  console.log(`AI Chat service running on port ${PORT}`);
  console.log(`Socket.io ready for ${getAllowedOrigins().join(", ")}`);

  try {
    await connectDB();
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
  }
});