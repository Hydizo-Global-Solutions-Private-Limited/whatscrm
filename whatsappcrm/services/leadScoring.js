const { query } = require("../database/dbpromise");

/**
 * Lead Scoring & Temperature Decay Engine
 * Evaluates contact recency and activity logs to decay untouched leads:
 * - Untouched for > 7 days: hot -> warm
 * - Untouched for > 21 days: warm -> cold
 */
async function runLeadWarmthDecay() {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twentyOneDaysAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);

    // 1. Demote untouched leads older than 21 days to 'cold'
    const coldRes = await query(
      `UPDATE contact 
       SET lead_temperature = 'cold' 
       WHERE lead_temperature IN ('hot', 'warm') 
       AND updatedAt < ?`,
      [twentyOneDaysAgo]
    );

    // 2. Demote untouched leads between 7 and 21 days from 'hot' to 'warm'
    const warmRes = await query(
      `UPDATE contact 
       SET lead_temperature = 'warm' 
       WHERE lead_temperature = 'hot' 
       AND updatedAt < ?`,
      [sevenDaysAgo]
    );

    console.log(`[LeadScoring] Warmth decay executed: ${warmRes?.changedRows || 0} demoted to warm, ${coldRes?.changedRows || 0} demoted to cold.`);
    return {
      demoted_to_warm: warmRes?.changedRows || 0,
      demoted_to_cold: coldRes?.changedRows || 0,
    };
  } catch (err) {
    console.error("[LeadScoring] Error during warmth decay:", err.message);
    return null;
  }
}

/**
 * Start periodic lead scoring maintenance (runs every 12 hours)
 */
function initLeadScoringCron() {
  setTimeout(() => {
    runLeadWarmthDecay();
  }, 10000);

  setInterval(() => {
    runLeadWarmthDecay();
  }, 12 * 60 * 60 * 1000);
}

module.exports = {
  runLeadWarmthDecay,
  initLeadScoringCron,
};
