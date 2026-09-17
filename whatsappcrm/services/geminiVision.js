const { GoogleGenerativeAI } = require("@google/generative-ai");
const logger = require("../utils/logger");

/**
 * Parses a business card image using Google Gemini Vision API
 * @param {Buffer} imageBuffer - Buffer of the card image
 * @param {string} mimeType - mime type (e.g. image/jpeg, image/png)
 * @param {string} [customApiKey] - Optional API key override
 * @returns {Promise<Object>} Structured contact details
 */
async function parseBusinessCard(imageBuffer, mimeType = "image/jpeg", customApiKey = null) {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Please set GEMINI_API_KEY in your .env or provide an API key in settings."
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Use gemini-1.5-flash or gemini-2.0-flash
  const modelName = process.env.GEMINI_VISION_MODEL || "gemini-1.5-flash";
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  });

  const prompt = `You are an expert AI business card OCR scanner.
Analyze the provided business card image carefully. Extract all contact information with highest precision.
Return a clean JSON object with the following fields:
{
  "name": "Full name of the person (e.g. John Doe)",
  "company": "Company or organization name",
  "job_title": "Designation, role or title (e.g. CEO, Sales Director, Founder)",
  "mobile": "Primary phone/mobile number (include international country code if present, remove spaces and hyphens)",
  "secondary_phone": "Alternate phone number if available",
  "email": "Email address",
  "website": "Company website or portfolio URL (normalize with https:// if missing)",
  "address": "Full physical or street address",
  "city": "City or state or country extracted from address",
  "services": ["List", "of", "services", "or", "products", "or", "skills"],
  "social_links": {
    "linkedin": "LinkedIn profile or username if available",
    "twitter": "Twitter/X handle if available",
    "instagram": "Instagram handle if available"
  },
  "tagline": "Company tagline or slogan if visible",
  "notes": "Any other key details like VAT/GST number, certifications, or hours",
  "confidence_score": 95
}
If any field is not found or not clearly visible on the card, set it to an empty string ("") or empty array ([]). Do NOT make up numbers or emails.`;

  const imagePart = {
    inlineData: {
      data: imageBuffer.toString("base64"),
      mimeType: mimeType || "image/jpeg",
    },
  };

  try {
    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();
    const parsed = JSON.parse(responseText);
    return parsed;
  } catch (err) {
    logger.error("Gemini Vision OCR Error:", err);
    throw new Error(`Failed to parse business card: ${err.message}`);
  }
}

module.exports = {
  parseBusinessCard,
};
