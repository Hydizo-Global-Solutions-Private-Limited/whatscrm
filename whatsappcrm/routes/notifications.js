const express = require("express");
const router = express.Router();
const { query } = require("../database/dbpromise");
const validateUser = require("../middlewares/user");
const { sendPushToUser } = require("../services/pushService");

/**
 * POST /api/notifications/register_token
 * Stores or updates the user's mobile device push token
 */
router.post("/register_token", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    const { token, platform = "unknown" } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, msg: "Token is required" });
    }

    await query(
      `INSERT INTO device_tokens (uid, token, platform)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE platform = VALUES(platform), updatedAt = CURRENT_TIMESTAMP`,
      [uid, token, platform]
    );

    res.json({ success: true, msg: "Device push token registered successfully" });
  } catch (err) {
    console.error("Register token error:", err);
    res.status(500).json({ success: false, msg: err.message });
  }
});

/**
 * POST /api/notifications/test
 * Sends a live test push notification to user's devices
 */
router.post("/test", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    const result = await sendPushToUser(uid, {
      title: "⚡ MsgMagnet Live Notification",
      body: "Push notification services are operational across iOS and Android!",
      data: { type: "test" },
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
});

/**
 * GET /api/notifications/tokens
 * Returns count of active registered devices
 */
router.get("/tokens", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    const rows = await query("SELECT platform, createdAt FROM device_tokens WHERE uid = ?", [uid]);
    res.json({ success: true, count: rows.length, devices: rows });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
});

module.exports = router;
