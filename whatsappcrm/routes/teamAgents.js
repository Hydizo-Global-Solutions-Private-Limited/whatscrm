const express = require("express");
const router = express.Router();
const { query } = require("../database/dbpromise");
const validateUser = require("../middlewares/user");
const { assignLeadToNextAgent } = require("../services/roundRobinService");

/**
 * GET /api/agents/list
 * Returns all sales reps in organization with assignment stats
 */
router.get("/list", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    const agents = await query(
      "SELECT * FROM team_agents WHERE uid = ? ORDER BY leads_assigned DESC, id ASC",
      [uid]
    );
    res.json({ success: true, agents: agents || [] });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
});

/**
 * POST /api/agents/add
 * Adds a sales rep to the round-robin pool
 */
router.post("/add", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    const { agent_name, agent_whatsapp, agent_email } = req.body;

    if (!agent_name || !agent_whatsapp) {
      return res.status(400).json({ success: false, msg: "Name and WhatsApp number are required" });
    }

    const cleanWa = agent_whatsapp.replace(/[^0-9]/g, "");

    const result = await query(
      `INSERT INTO team_agents (uid, agent_name, agent_whatsapp, agent_email, is_active)
       VALUES (?, ?, ?, ?, 1)`,
      [uid, agent_name.trim(), cleanWa, agent_email ? agent_email.trim() : null]
    );

    res.json({
      success: true,
      msg: `Agent ${agent_name} added to Round-Robin pool`,
      agentId: result.insertId,
    });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
});

/**
 * PUT /api/agents/:id/toggle
 * Toggle active status
 */
router.put("/:id/toggle", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    const agentId = req.params.id;

    await query(
      "UPDATE team_agents SET is_active = IF(is_active = 1, 0, 1) WHERE id = ? AND uid = ?",
      [agentId, uid]
    );

    res.json({ success: true, msg: "Agent active status toggled" });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
});

/**
 * DELETE /api/agents/:id
 */
router.delete("/:id", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    await query("DELETE FROM team_agents WHERE id = ? AND uid = ?", [req.params.id, uid]);
    res.json({ success: true, msg: "Agent removed from pool" });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
});

/**
 * POST /api/agents/assign_next
 * Manually trigger round-robin assignment for a contact
 */
router.post("/assign_next", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    const { contact_id } = req.body;
    const result = await assignLeadToNextAgent(uid, contact_id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
});

module.exports = router;
