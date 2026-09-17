const express = require("express");
const router = express.Router();
const { query } = require("../database/dbpromise");
const validateUser = require("../middlewares/user");
const {
  ensureDefaultSequence,
  enrollContact,
  processDueRevivers,
} = require("../services/ghostingReviverService");

/**
 * GET /api/reviver/list
 * Returns all ghosting reviver sequences for this account
 */
router.get("/list", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    await ensureDefaultSequence(uid);

    const sequences = await query(
      "SELECT * FROM reviver_sequences WHERE uid = ? ORDER BY id ASC",
      [uid]
    );

    res.json({ success: true, sequences });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
});

/**
 * POST /api/reviver/save
 * Update or create a reviver sequence
 */
router.post("/save", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    const {
      id,
      name,
      stage_1_delay_days,
      stage_1_message,
      stage_2_delay_days,
      stage_2_message,
      stage_3_delay_days,
      stage_3_message,
      stage_4_delay_days,
      stage_4_message,
      is_active,
    } = req.body;

    if (!name || !stage_1_message || !stage_4_message) {
      return res.status(400).json({ success: false, msg: "Sequence name and stage messages are required" });
    }

    if (id) {
      await query(
        `UPDATE reviver_sequences SET
          name = ?, stage_1_delay_days = ?, stage_1_message = ?,
          stage_2_delay_days = ?, stage_2_message = ?,
          stage_3_delay_days = ?, stage_3_message = ?,
          stage_4_delay_days = ?, stage_4_message = ?,
          is_active = ?, updatedAt = NOW()
         WHERE id = ? AND uid = ?`,
        [
          name,
          stage_1_delay_days || 1,
          stage_1_message,
          stage_2_delay_days || 3,
          stage_2_message,
          stage_3_delay_days || 7,
          stage_3_message,
          stage_4_delay_days || 14,
          stage_4_message,
          is_active !== undefined ? (is_active ? 1 : 0) : 1,
          id,
          uid,
        ]
      );
      res.json({ success: true, msg: "Reviver sequence updated successfully" });
    } else {
      const result = await query(
        `INSERT INTO reviver_sequences (
          uid, name, stage_1_delay_days, stage_1_message,
          stage_2_delay_days, stage_2_message,
          stage_3_delay_days, stage_3_message,
          stage_4_delay_days, stage_4_message, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uid,
          name,
          stage_1_delay_days || 1,
          stage_1_message,
          stage_2_delay_days || 3,
          stage_2_message,
          stage_3_delay_days || 7,
          stage_3_message,
          stage_4_delay_days || 14,
          stage_4_message,
          is_active !== undefined ? (is_active ? 1 : 0) : 1,
        ]
      );
      res.json({ success: true, msg: "Reviver sequence created successfully", sequenceId: result.insertId });
    }
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
});

/**
 * POST /api/reviver/enroll
 * Enrolls a lead into the ghosting drip sequence
 */
router.post("/enroll", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    const { contact_id, sequence_id } = req.body;

    if (!contact_id) {
      return res.status(400).json({ success: false, msg: "contact_id is required" });
    }

    const result = await enrollContact(uid, contact_id, sequence_id);
    res.json({ success: true, msg: "Lead enrolled in automated Ghosting Reviver sequence", result });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
});

/**
 * GET /api/reviver/progress
 * Lists all leads enrolled in reviver drip with their current stage and status
 */
router.get("/progress", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    const leads = await query(
      `SELECT p.id, p.contact_id, p.current_stage, p.status, p.last_sent_at, p.next_run_at, p.createdAt,
              c.name AS contact_name, c.mobile AS contact_mobile, c.company AS contact_company, c.lead_temperature,
              s.name AS sequence_name
       FROM contact_sequence_progress p
       JOIN contact c ON p.contact_id = c.id
       JOIN reviver_sequences s ON p.sequence_id = s.id
       WHERE p.uid = ?
       ORDER BY p.updatedAt DESC`,
      [uid]
    );

    res.json({ success: true, leads: leads || [] });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
});

/**
 * POST /api/reviver/pause/:id
 */
router.post("/pause/:id", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    await query("UPDATE contact_sequence_progress SET status = 'paused' WHERE id = ? AND uid = ?", [
      req.params.id,
      uid,
    ]);
    res.json({ success: true, msg: "Drip sequence paused for lead" });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
});

/**
 * POST /api/reviver/resume/:id
 */
router.post("/resume/:id", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    await query("UPDATE contact_sequence_progress SET status = 'active' WHERE id = ? AND uid = ?", [
      req.params.id,
      uid,
    ]);
    res.json({ success: true, msg: "Drip sequence resumed for lead" });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
});

/**
 * POST /api/reviver/trigger_now
 * Manually runs due revivers check
 */
router.post("/trigger_now", validateUser, async (req, res) => {
  try {
    const result = await processDueRevivers();
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
});

module.exports = router;
