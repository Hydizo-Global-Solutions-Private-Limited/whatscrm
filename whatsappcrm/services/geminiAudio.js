const { GoogleGenerativeAI } = require("@google/generative-ai");
const logger = require("../utils/logger");

/**
 * Transcribes voice note audio and extracts structured task & lead intent using Gemini Audio
 * @param {Buffer} audioBuffer - Buffer of audio file (mp3, ogg, wav, m4a)
 * @param {string} mimeType - mime type (e.g. audio/mp3, audio/ogg)
 * @param {string} [customApiKey] - Optional API key override
 * @returns {Promise<Object>} Transcription + extracted task intent
 */
async function processVoiceToTask(audioBuffer, mimeType = "audio/mp3", customApiKey = null) {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Please set GEMINI_API_KEY in your .env or provide an API key."
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_AUDIO_MODEL || "gemini-1.5-flash";
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
    },
  });

  const prompt = `You are an intelligent voice CRM assistant for MsgMagnet.
Listen to the user's spoken voice note.
1. Transcribe the audio accurately.
2. Extract the business intent and any follow-up task, meeting, or contact updates.
Return a valid JSON object with:
{
  "transcription": "Verbatim transcription of the voice note",
  "intent": "create_task | update_lead | schedule_meeting | take_note",
  "task_title": "Concise, actionable task title (e.g. 'Call John regarding contract terms')",
  "contact_name": "Name of any person or company mentioned, or empty string",
  "due_date": "Extracted date/time formatted as ISO-8601 (YYYY-MM-DD HH:mm:ss) or empty string if no date mentioned",
  "priority": "low | medium | high",
  "pipeline_stage": "Suggested stage if applicable (e.g. proposal, negotiation, follow_up) or empty string",
  "lead_temperature": "hot | warm | cold based on spoken sentiment",
  "actionable_notes": "Summary of key action items and notes from the audio"
}`;

  const audioPart = {
    inlineData: {
      data: audioBuffer.toString("base64"),
      mimeType: mimeType || "audio/mp3",
    },
  };

  try {
    const result = await model.generateContent([prompt, audioPart]);
    const responseText = result.response.text();
    return JSON.parse(responseText);
  } catch (err) {
    logger.error("Gemini Audio Error:", err);
    throw new Error(`Failed to process voice note: ${err.message}`);
  }
}

module.exports = {
  processVoiceToTask,
};
