const { query } = require("../database/dbpromise");

/**
 * Assigns a newly captured contact to the next available sales agent using Round-Robin
 */
async function assignLeadToNextAgent(uid, contactId) {
  try {
    const agents = await query(
      `SELECT * FROM team_agents 
       WHERE uid = ? AND is_active = 1 
       ORDER BY leads_assigned ASC, last_assigned_at ASC 
       LIMIT 1`,
      [uid]
    );

    if (!agents || agents.length === 0) {
      return { success: false, msg: "No active team agents available for round-robin" };
    }

    const assignedAgent = agents[0];

    // 1. Increment agent lead counter & update timestamp
    await query(
      `UPDATE team_agents 
       SET leads_assigned = leads_assigned + 1, last_assigned_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [assignedAgent.id]
    );

    // 2. Update contact record
    if (contactId) {
      await query(
        `UPDATE contact 
         SET assigned_to = ? 
         WHERE id = ?`,
        [assignedAgent.agent_name, contactId]
      );

      // Log in contact activity
      await query(
        `INSERT INTO contact_activity (uid, contact_id, activity_type, description, metadata)
         VALUES (?, ?, ?, ?, ?)`,
        [
          uid,
          contactId,
          "AGENT_ASSIGNED",
          `Lead automatically assigned to sales agent ${assignedAgent.agent_name} via Round-Robin.`,
          JSON.stringify({ agent_id: assignedAgent.id, agent_name: assignedAgent.agent_name }),
        ]
      );
    }

    return {
      success: true,
      agent: assignedAgent,
      assignedTo: assignedAgent,
    };
  } catch (err) {
    console.error("[RoundRobin] Assignment error:", err.message);
    return { success: false, msg: err.message };
  }
}

module.exports = {
  assignLeadToNextAgent,
};
