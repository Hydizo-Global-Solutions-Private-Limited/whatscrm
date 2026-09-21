const { GoogleGenerativeAI } = require("@google/generative-ai");
const { createWorker } = require("tesseract.js");
const logger = require("../utils/logger");

/**
 * Extracts structured contact fields from raw OCR text using regex heuristics.
 */
function extractFromOcrText(rawText) {
  if (!rawText || typeof rawText !== "string") {
    return null;
  }

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 1);

  if (lines.length === 0) {
    return null;
  }

  // 1. Email
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i;
  let email = "";
  for (const line of lines) {
    const match = line.match(emailRegex);
    if (match) {
      email = match[1].toLowerCase();
      break;
    }
  }

  // 2. Phone / Mobile
  const phoneRegex = /(?:(?:\+|00)\d{1,3}[\s.-]?)?(?:\(?\d{2,5}\)?[\s.-]?)?\d{3,5}[\s.-]?\d{3,5}/;
  let mobile = "";
  for (const line of lines) {
    if (line.includes("@")) continue; // avoid emails
    const cleanCandidate = line.replace(/[^0-9+\s()-]/g, "").trim();
    const digitsOnly = cleanCandidate.replace(/\D/g, "");
    if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
      const match = cleanCandidate.match(phoneRegex);
      if (match) {
        mobile = match[0].replace(/\s+/g, "").trim();
        break;
      }
    }
  }

  // 3. Website
  const webRegex = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+(?:\.[a-zA-Z]{2,})+)(?:\/[^\s]*)?/i;
  let website = "";
  for (const line of lines) {
    if (line.includes("@")) continue;
    const match = line.match(webRegex);
    if (match && !match[1].includes("gmail") && !match[1].includes("yahoo") && !match[1].includes("hotmail")) {
      website = match[0].startsWith("http") ? match[0] : `https://${match[0]}`;
      break;
    }
  }

  // 4. Job Title keywords
  const titleKeywords = [
    "ceo", "cto", "cfo", "coo", "founder", "co-founder", "director", "manager",
    "engineer", "developer", "designer", "consultant", "specialist", "executive",
    "lead", "head", "president", "vice president", "vp", "partner", "associate",
    "sales", "marketing", "architect", "representative", "advisor", "agent",
    "officer", "chief", "owner", "proprietor", "manager", "general manager"
  ];
  let job_title = "";
  for (const line of lines) {
    const lower = line.toLowerCase();
    for (const kw of titleKeywords) {
      if (new RegExp(`\\b${kw}\\b`, "i").test(lower) && line.length < 50) {
        job_title = line;
        break;
      }
    }
    if (job_title) break;
  }

  // 5. Company Name
  const companyKeywords = ["inc", "llc", "ltd", "corp", "corporation", "technologies", "solutions", "studio", "group", "agency", "services", "systems", "enterprises", "consulting", "pvt", "limited"];
  let company = "";
  for (const line of lines) {
    const lower = line.toLowerCase();
    for (const kw of companyKeywords) {
      if (new RegExp(`\\b${kw}\\b`, "i").test(lower) && line.length < 60) {
        company = line;
        break;
      }
    }
    if (company) break;
  }

  // 6. Name: usually a 2-4 word capitalized line that is not email, phone, web, title, or company
  let name = "";
  for (const line of lines) {
    if (
      line === company ||
      line === job_title ||
      line.includes("@") ||
      line.toLowerCase().includes("www.") ||
      line.toLowerCase().includes(".com") ||
      line.replace(/[^0-9]/g, "").length >= 5
    ) {
      continue;
    }

    // Check if looks like a person's name (letters and spaces, 2-4 words, starts with capital)
    const words = line.split(/\s+/).filter(Boolean);
    if (words.length >= 2 && words.length <= 4 && /^[A-Z][a-zA-Z.' -]+$/.test(line)) {
      name = line;
      break;
    }
  }

  // If no company matched keyword, check if first line is uppercase company brand
  if (!company && lines.length > 0 && lines[0] !== name && lines[0].length < 40) {
    company = lines[0];
  }

  // If no name found, try first title-case line
  if (!name) {
    for (const line of lines) {
      if (line !== company && line.length >= 4 && line.length <= 35 && !line.includes("@") && !line.includes("http")) {
        name = line;
        break;
      }
    }
  }

  return {
    name: name || "Scanned Contact",
    company: company || "",
    job_title: job_title || "",
    mobile: mobile || "",
    secondary_phone: "",
    email: email || "",
    website: website || "",
    address: "",
    city: "",
    services: [],
    social_links: {},
    tagline: "",
    notes: `Parsed via On-Device OCR Engine. Raw lines detected: ${lines.slice(0, 3).join(", ")}`,
    confidence_score: (name && mobile) ? 85 : (name || mobile) ? 70 : 50,
  };
}

/**
 * Parses a business card image using Google Gemini Vision API,
 * with automatic fallback to high-speed local Tesseract OCR.
 *
 * @param {Buffer} imageBuffer - Buffer of the card image
 * @param {string} mimeType - mime type (e.g. image/jpeg, image/png)
 * @param {string} [customApiKey] - Optional API key override
 * @returns {Promise<Object>} Structured contact details
 */
async function parseBusinessCard(imageBuffer, mimeType = "image/jpeg", customApiKey = null) {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;

  // 1. Try Gemini Vision if API key is present
  if (apiKey) {
    try {
      logger.info("Attempting Gemini Vision OCR analysis...");
      const genAI = new GoogleGenerativeAI(apiKey);
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

      const result = await model.generateContent([prompt, imagePart]);
      const responseText = result.response.text();
      const parsed = JSON.parse(responseText);
      logger.info("Gemini Vision OCR successfully parsed card:", parsed.name, parsed.company);
      return parsed;
    } catch (err) {
      logger.warn("Gemini Vision OCR Error, falling back to local OCR:", err.message);
    }
  }

  // 2. Local OCR Fallback (Tesseract.js Engine)
  try {
    logger.info("Running local Tesseract OCR on business card buffer...");
    const worker = await createWorker("eng");
    const ret = await worker.recognize(imageBuffer);
    await worker.terminate();

    const rawText = ret.data?.text || "";
    logger.info(`Local OCR raw text extracted (${rawText.length} chars)`);

    const extracted = extractFromOcrText(rawText);
    if (extracted && (extracted.name !== "Scanned Contact" || extracted.mobile || extracted.email)) {
      return extracted;
    }
  } catch (ocrErr) {
    logger.warn("Local OCR processing warning:", ocrErr.message);
  }

  // 3. Fallback contact for cards without clear text
  return {
    name: "Scanned Contact",
    company: "Business Network Lead",
    job_title: "Contact",
    mobile: "",
    secondary_phone: "",
    email: "",
    website: "",
    address: "",
    city: "",
    services: [],
    social_links: {},
    tagline: "",
    notes: "Card captured via mobile camera scanner",
    confidence_score: 60,
  };
}

module.exports = {
  parseBusinessCard,
  extractFromOcrText,
};
