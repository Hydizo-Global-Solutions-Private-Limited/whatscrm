const express = require("express");
const router = express.Router();
const validateUser = require("../middlewares/user");
const { summarizeMeetingAudio } = require("../services/meetingAudioService");

/**
 * POST /api/meeting/summarize
 * Processes sales meeting audio and returns structured minutes, tasks, and follow-ups
 */
router.post("/summarize", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    const {
      audio,
      audioBase64,
      mimeType = "audio/mp3",
      mode = "cloud",
      contact_id,
      meetingTitle,
      attendeeName,
    } = req.body;

    let base64Data = audio || audioBase64;
    if (req.files && (req.files.audio_file || req.files.audio)) {
      const file = req.files.audio_file || req.files.audio;
      base64Data = file.data.toString("base64");
    }

    if (!base64Data) {
      return res.status(400).json({ success: false, msg: "Audio payload or file is required" });
    }

    const result = await summarizeMeetingAudio({
      audioBase64: base64Data,
      mimeType,
      mode,
      contactId: contact_id,
      uid,
      meetingTitle,
      attendeeName,
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
});

module.exports = router;
