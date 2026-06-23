const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const chatRoutes = require("./routes/chat.routes");
const { corsOrigin } = require("./config/cors");

const app = express();

app.set("trust proxy", 1);

const buildCookieVariants = () => {
  const variants = [];

  if (process.env.COOKIE_DOMAIN) {
    variants.push({
      httpOnly: true,
      secure: true,
      sameSite: "none",
      domain: process.env.COOKIE_DOMAIN,
      path: "/",
    });
    variants.push({
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      domain: process.env.COOKIE_DOMAIN,
      path: "/",
    });
  }

  return variants;
};

app.locals.cookieVariants = buildCookieVariants();

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Express server is running",
  });
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/chats", chatRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

module.exports = app;
