const router = require("express").Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const validateUser = require("../middlewares/user");
const logger = require("../utils/logger");

// ── AI Suggested Replies for WhatsApp Chat ──────────────────────────────────
router.post("/suggest_replies", validateUser, async (req, res) => {
  try {
    const { last_message, chat_history = [], contact_name = "", company = "", tone = "professional" } = req.body;

    if (!last_message) {
      return res.status(400).json({ success: false, msg: "last_message is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Fallback sensible suggestions if API key not present
      return res.json({
        success: true,
        suggestions: [
          `Hi ${contact_name || 'there'}, thanks for reaching out! How can I assist you today?`,
          `Great to connect! Here is my digital business card: ${req.protocol}://${req.get('host')}/p/`,
          `Could you share a bit more about what you're looking for? Happy to set up a quick 15-min call.`,
        ],
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.3,
        responseMimeType: "application/json",
      },
    });

    const prompt = `You are a high-performing WhatsApp sales copilot for MsgMagnet.
The contact "${contact_name || 'Prospect'}" from "${company || 'Lead'}" sent this message:
"${last_message}"

Generate exactly 3 smart, concise WhatsApp reply suggestions suitable for immediate 1-click sending:
1. Direct, helpful answer / confirmation
2. Value proposition + invite for a quick call or link to digital card
3. Friendly clarifying question to move the lead further in the sales pipeline

Format as JSON:
{
  "suggestions": [
    "Option 1 text",
    "Option 2 text",
    "Option 3 text"
  ]
}`;

    const result = await model.generateContent(prompt);
    const parsed = JSON.parse(result.response.text());

    res.json({
      success: true,
      suggestions: parsed.suggestions || [],
    });
  } catch (err) {
    logger.error("AI reply suggestion error:", err);
    res.json({
      success: true,
      suggestions: [
        "Thanks for getting in touch! How can I help you today?",
        "Sounds great, let me review this and get right back to you.",
        "Would you like to schedule a quick 10-minute call to discuss details?",
      ],
    });
  }
});

module.exports = router;
