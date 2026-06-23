const getAllowedOrigins = () => {
  return process.env.ALLOWED_ORIGINS?.split(",") || [
    "https://varnikaorganics.com",
    "http://localhost:5173",
  ];
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
