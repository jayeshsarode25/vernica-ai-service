const GEMINI_API_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const DEFAULT_FALLBACK_MODELS = ["gemini-3.1-flash-lite"];

const getGeminiModels = () => {
  const primaryModel = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const fallbackModels = (
    process.env.GEMINI_FALLBACK_MODELS || DEFAULT_FALLBACK_MODELS.join(",")
  )
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);

  return [...new Set([primaryModel, ...fallbackModels])];
};

const getGeminiGenerateContentUrl = (
  model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL
) => {
  return `${GEMINI_API_BASE_URL}/${model}:generateContent`;
};

module.exports = {
  getGeminiModels,
  getGeminiGenerateContentUrl,
};
