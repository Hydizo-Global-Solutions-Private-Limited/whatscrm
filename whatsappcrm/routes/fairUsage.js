const express = require("express");
const router = express.Router();
const { query } = require("../database/dbpromise");
const validateUser = require("../middlewares/user");

// Fair Usage Tier Defaults
const TIER_LIMITS = {
  free: {
    scans_per_month: 50,
    voice_minutes_per_month: 15,
    max_contacts: 250,
    export_allowed: true,
  },
  pro: {
    scans_per_month: 500,
    voice_minutes_per_month: 120,
    max_contacts: 5000,
    export_allowed: true,
  },
  enterprise: {
    scans_per_month: 999999,
    voice_minutes_per_month: 999999,
    max_contacts: 999999,
    export_allowed: true,
  },
};

/**
 * GET /api/fair_usage/status
 * Returns live quota usage vs limits for current billing period
 */
router.get("/status", validateUser, async (req, res) => {
  try {
    const uid = req.decode?.uid;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const userRows = await query(
      "SELECT plan, email, role FROM user WHERE id = ? OR uid = ? LIMIT 1",
      [uid, uid]
    );
    const planKey = (userRows[0]?.plan || "pro").toLowerCase();
    const limits = TIER_LIMITS[planKey] || TIER_LIMITS.pro;

    // 1. Card Scans this month
    const scanRows = await query(
      `SELECT COUNT(*) as cnt FROM contact 
       WHERE uid = ? AND source IN ('card_scan', 'batch_scan') 
       AND createdAt >= ?`,
      [uid, startOfMonth]
    );
    const scansUsed = scanRows[0]?.cnt || 0;

    // 2. Voice Tasks this month
    let tasksUsed = 0;
    try {
      const taskRows = await query(
        `SELECT COUNT(*) as cnt FROM agent_task 
         WHERE (uid = ? OR owner_uid = ?) 
         AND createdAt >= ?`,
        [uid, uid, startOfMonth]
      );
      tasksUsed = taskRows[0]?.cnt || 0;
    } catch (taskErr) {
      tasksUsed = 0;
    }
    const voiceMinutesUsed = tasksUsed;

    // 3. Total Contacts
    const contactRows = await query(
      "SELECT COUNT(*) as cnt FROM contact WHERE uid = ?",
      [uid]
    );
    const totalContacts = contactRows[0]?.cnt || 0;

    // Next reset date (1st of next month)
    const nextReset = new Date();
    nextReset.setMonth(nextReset.getMonth() + 1);
    nextReset.setDate(1);
    nextReset.setHours(0, 0, 0, 0);

    return res.json({
      success: true,
      plan: planKey.toUpperCase(),
      cycle_reset: nextReset.toISOString(),
      usage: {
        card_scans: {
          used: scansUsed,
          limit: limits.scans_per_month,
          remaining: Math.max(0, limits.scans_per_month - scansUsed),
          percentage: Math.min(100, Math.round((scansUsed / limits.scans_per_month) * 100)),
        },
        voice_minutes: {
          used: voiceMinutesUsed,
          limit: limits.voice_minutes_per_month,
          remaining: Math.max(0, limits.voice_minutes_per_month - voiceMinutesUsed),
          percentage: Math.min(100, Math.round((voiceMinutesUsed / limits.voice_minutes_per_month) * 100)),
        },
        contacts: {
          used: totalContacts,
          limit: limits.max_contacts,
          remaining: Math.max(0, limits.max_contacts - totalContacts),
          percentage: Math.min(100, Math.round((totalContacts / limits.max_contacts) * 100)),
        },
      },
    });
  } catch (err) {
    console.error("Fair usage status error:", err);
    return res.status(500).json({ success: false, msg: err.message });
  }
});

module.exports = router;
