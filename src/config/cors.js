const DEFAULT_FRONTEND_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
];

const getAllowedOrigins = () => {
  const configuredOrigins = (process.env.FRONTEND_URL || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return [...new Set([...configuredOrigins, ...DEFAULT_FRONTEND_ORIGINS])];
};

const corsOrigin = (origin, callback) => {
  if (!origin || getAllowedOrigins().includes(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error(`CORS blocked origin: ${origin}`));
};

module.exports = {
  corsOrigin,
  getAllowedOrigins,
};
