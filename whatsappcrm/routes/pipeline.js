const router = require("express").Router();
const { query } = require("../database/dbpromise");
const validateUser = require("../middlewares/user");
const logger = require("../utils/logger");

const DEFAULT_STAGES = [
  { id: "new_scanned", title: "New Scanned", color: "#3b82f6" },
  { id: "contacted", title: "Contacted", color: "#8b5cf6" },
  { id: "meeting_set", title: "Meeting Set", color: "#f59e0b" },
  { id: "proposal_sent", title: "Proposal Sent", color: "#ec4899" },
  { id: "won", title: "Won / Closed", color: "#10b981" },
  { id: "lost", title: "Lost", color: "#ef4444" },
  { id: "follow_up_later", title: "Follow Up", color: "#64748b" },
];

// ── 1. Get Pipeline Board ───────────────────────────────────────────────────
router.get("/board", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    const { event_id, lead_temperature, search } = req.query;

    let conditions = `WHERE c.uid = ?`;
    const params = [uid];

    if (event_id) {
      conditions += ` AND c.event_id = ?`;
      params.push(event_id);
    }

    if (lead_temperature) {
      conditions += ` AND c.lead_temperature = ?`;
      params.push(lead_temperature);
    }

    if (search) {
      conditions += ` AND (c.name LIKE ? OR c.company LIKE ? OR c.mobile LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const contacts = await query(
      `SELECT c.id, c.name, c.company, c.job_title, c.mobile, c.email,
              c.pipeline_stage, c.lead_temperature, c.source, c.scan_image_url,
              c.createdAt, e.name as event_name
       FROM contact c
       LEFT JOIN events e ON c.event_id = e.id
       ${conditions}
       ORDER BY c.createdAt DESC`,
      params
    );

    // Group by stage
    const grouped = {};
    DEFAULT_STAGES.forEach((s) => (grouped[s.id] = []));
    grouped["new"] = grouped["new_scanned"];

    contacts.forEach((contact) => {
      let stage = (contact.pipeline_stage || "new_scanned").toLowerCase();
      if (stage === "new") stage = "new_scanned";
      if (!grouped[stage]) {
        grouped[stage] = [];
      }
      grouped[stage].push(contact);
    });

    res.json({
      success: true,
      stages: DEFAULT_STAGES,
      board: grouped,
      grouped,
      totalContacts: contacts.length,
    });
  } catch (err) {
    logger.error("Pipeline board error:", err);
    res.status(500).json({ success: false, msg: "Server error fetching pipeline board" });
  }
});

// ── 2. Move Contact to Another Stage ─────────────────────────────────────────
router.post("/move", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    const { contact_id, new_stage } = req.body;

    if (!contact_id || !new_stage) {
      return res.status(400).json({ success: false, msg: "contact_id and new_stage are required" });
    }

    const [contact] = await query(
      `SELECT id, name, pipeline_stage FROM contact WHERE id = ? AND uid = ?`,
      [contact_id, uid]
    );

    if (!contact) {
      return res.status(404).json({ success: false, msg: "Contact not found" });
    }

    const oldStage = contact.pipeline_stage || "new";

    await query(
      `UPDATE contact SET pipeline_stage = ? WHERE id = ? AND uid = ?`,
      [new_stage, contact_id, uid]
    );

    // Record activity
    await query(
      `INSERT INTO contact_activity (uid, contact_id, activity_type, description)
       VALUES (?, ?, 'STAGE_CHANGED', ?)`,
      [uid, contact_id, `Lead stage moved from '${oldStage}' to '${new_stage}'`]
    );

    res.json({ success: true, msg: "Lead moved successfully" });
  } catch (err) {
    logger.error("Pipeline move error:", err);
    res.status(500).json({ success: false, msg: "Server error moving lead stage" });
  }
});

// ── 3. Update Lead Temperature ───────────────────────────────────────────────
router.post("/temperature", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    const { contact_id, lead_temperature } = req.body;

    if (!contact_id || !lead_temperature) {
      return res.status(400).json({ success: false, msg: "contact_id and lead_temperature are required" });
    }

    const validTemps = ["hot", "warm", "cold"];
    if (!validTemps.includes(lead_temperature.toLowerCase())) {
      return res.status(400).json({ success: false, msg: "Invalid temperature. Choose hot, warm, or cold." });
    }

    await query(
      `UPDATE contact SET lead_temperature = ? WHERE id = ? AND uid = ?`,
      [lead_temperature.toLowerCase(), contact_id, uid]
    );

    // Record activity
    await query(
      `INSERT INTO contact_activity (uid, contact_id, activity_type, description)
       VALUES (?, ?, 'TEMPERATURE_UPDATED', ?)`,
      [uid, contact_id, `Lead temperature updated to '${lead_temperature}'`]
    );

    res.json({ success: true, msg: "Temperature updated successfully" });
  } catch (err) {
    logger.error("Temperature update error:", err);
    res.status(500).json({ success: false, msg: "Server error updating temperature" });
  }
});

module.exports = router;
