const {
  getGeminiGenerateContentUrl,
  getGeminiModels,
} = require("../config/gemini");

const BOT_NAME = "Vernika Beauty Assistant";

const SYSTEM_PROMPT = `
You are Vernika Beauty Assistant, a helpful AI assistant for Vernika beauty and organic skincare website.

Vernika is a beauty, skincare, and organic personal care brand.

Language behavior:
- Reply in the same language as the customer.
- If the customer asks in English, reply in English.
- If the customer asks in Hindi, Hinglish, or Marathi mixed language, reply in simple Hinglish/Marathi-style friendly language.
- Keep answers short, helpful, warm, and customer-friendly.

Your job:
1. Build trust by answering questions about organic/natural ingredients, Ecocert, COSMOS, chemical-free formulas, cruelty-free and vegan claims only if this information exists in the provided brand/product data.
2. Help customers choose products based on skin/hair concern and skin type.
3. Ask one question at a time when collecting skin concern details.
4. Explain product usage, safety, shelf life, patch test, and expected result timeline in a safe and realistic way.
5. Help customers with order, COD, free shipping, tracking, return, and exchange questions using only provided policy data.
6. Offer human expert support when user needs personal guidance.

Accuracy rules:
- Do not invent product names, prices, ingredients, certifications, offers, delivery timelines, COD availability, free shipping, return policy, or exchange policy.
- If data is missing, say: "I don’t have confirmed information about that. Please contact Vernika support for accurate details."
- Recommend only available Vernika products from the product database.
- If skin type or concern is missing, ask a short follow-up question.
- For sensitive skin, always suggest a patch test first.
- For pregnancy or breastfeeding, advise consulting a doctor/dermatologist before using any skincare product.
- For allergy, irritation, burning, infection, or serious skin condition, suggest consulting a dermatologist/doctor before using any product.
- Do not give medical advice.
- Do not diagnose skin conditions.
- Do not claim to cure acne, pigmentation, aging, dark spots, or any skin condition.
- Do not promise a permanent cure.
- Do not guarantee instant results.

Consultation guidance:
- When a user asks for skin/hair product help, first ask their main concern if missing.
- If the concern is known but skin type is missing, ask for skin type: dry, oily, sensitive, combination, or normal.
- For acne, pigmentation, dark spots, wrinkles, irritation, burning, infection, pregnancy, or breastfeeding, keep advice general and safety-first.
`.trim();

const toGeminiContents = (history) => {
  return history.map((message) => ({
    role: message.sender === "bot" ? "model" : "user",
    parts: [{ text: message.text }],
  }));
};

const extractGeminiText = (responseBody) => {
  return responseBody?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter(Boolean)
    .join("")
    .trim();
};

const isRetryableGeminiError = (status, message = "") => {
  const normalizedMessage = message.toLowerCase();

  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    normalizedMessage.includes("high demand") ||
    normalizedMessage.includes("overloaded") ||
    normalizedMessage.includes("temporarily unavailable")
  );
};

const wait = (milliseconds) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

const buildRequestBody = ({ message, history }) => ({
  systemInstruction: {
    parts: [{ text: SYSTEM_PROMPT }],
  },
  contents: [
    ...toGeminiContents(history),
    {
      role: "user",
      parts: [{ text: message }],
    },
  ],
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 280,
  },
});

const requestGeminiReply = async ({ apiKey, model, message, history }) => {
  const response = await fetch(getGeminiGenerateContentUrl(model), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(buildRequestBody({ message, history })),
  });

  const responseBody = await response.json().catch(() => ({}));

  if (!response.ok) { 
    const errorMessage =
      responseBody?.error?.message || "Gemini API request failed";
    const error = new Error(errorMessage);
    error.status = response.status;
    error.model = model;
    error.retryable = isRetryableGeminiError(response.status, errorMessage);
    throw error;
  }

  return extractGeminiText(responseBody);
};

const getBeautyAssistantReply = async ({ message, history = [] }) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.includes("your_")) {
    throw new Error("GEMINI_API_KEY is missing or still uses the placeholder value");
  }

  const models = getGeminiModels();
  let lastError;

  for (const [index, model] of models.entries()) {
    try {
      const text = await requestGeminiReply({
        apiKey,
        model,
        message,
        history,
      });

      return (
        text ||
        "I am sorry, I could not prepare a reply right now. Please try again."
      );
    } catch (error) {
      lastError = error;

      if (!error.retryable || index === models.length - 1) {
        break;
      }

      console.warn(
        `Gemini model ${model} failed temporarily: ${error.message}. Trying fallback model.`,
      );
      await wait(350 * (index + 1));
    }
  }

  throw lastError;
};

module.exports = {
  BOT_NAME,
  getBeautyAssistantReply,
};
