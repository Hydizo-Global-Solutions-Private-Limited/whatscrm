const { query } = require("../database/dbpromise");
const { getSession, isExists } = require("../helper/addon/qr");
const logger = require("../utils/logger");

const DEFAULT_SEQUENCES = [
  {
    name: "Enterprise Ghosting Reviver (4-Stage Drip)",
    stage_1_delay_days: 1,
    stage_1_message: "Hi {{name}}, hope you're having a productive week! Following up on our conversation about {{company}} — did you get a chance to review the details we discussed?",
    stage_2_delay_days: 3,
    stage_2_message: "Hey {{name}}, thought of you today! We recently put together a quick breakdown that helps teams like {{company}} streamline their lead workflows. Let me know if you'd like me to send it over!",
    stage_3_delay_days: 7,
    stage_3_message: "Hi {{name}}, quick question: is this still a priority for your roadmap this quarter, or should we revisit at a later date?",
    stage_4_delay_days: 14,
    stage_4_message: "Hi {{name}}, have you given up on this project?",
  },
];

/**
 * Ensures user has at least one default ghosting reviver sequence
 */
async function ensureDefaultSequence(uid) {
  const existing = await query("SELECT * FROM reviver_sequences WHERE uid = ?", [uid]);
  if (existing && existing.length > 0) return existing[0];

  const def = DEFAULT_SEQUENCES[0];
  const res = await query(
    `INSERT INTO reviver_sequences (
      uid, name, stage_1_delay_days, stage_1_message,
      stage_2_delay_days, stage_2_message,
      stage_3_delay_days, stage_3_message,
      stage_4_delay_days, stage_4_message, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      uid,
      def.name,
      def.stage_1_delay_days,
      def.stage_1_message,
      def.stage_2_delay_days,
      def.stage_2_message,
      def.stage_3_delay_days,
      def.stage_3_message,
      def.stage_4_delay_days,
      def.stage_4_message,
    ]
  );

  return { id: res.insertId, uid, ...def };
}

/**
 * Enrolls a contact into a ghosting reviver sequence
 */
async function enrollContact(uid, contactId, sequenceId = null) {
  let seqId = sequenceId;
  if (!seqId) {
    const defaultSeq = await ensureDefaultSequence(uid);
    seqId = defaultSeq.id;
  }

  const [seq] = await query("SELECT * FROM reviver_sequences WHERE id = ? AND uid = ?", [seqId, uid]);
  if (!seq) throw new Error("Reviver sequence not found");

  const [contact] = await query("SELECT * FROM contact WHERE id = ? AND uid = ?", [contactId, uid]);
  if (!contact) throw new Error("Contact not found");

  const delayDays = seq.stage_1_delay_days || 1;

  // Insert or update progress
  const [existing] = await query(
    "SELECT * FROM contact_sequence_progress WHERE uid = ? AND contact_id = ? AND sequence_id = ?",
    [uid, contactId, seqId]
  );

  if (existing) {
    await query(
      `UPDATE contact_sequence_progress 
       SET current_stage = 1, status = 'active', next_run_at = DATE_ADD(NOW(), INTERVAL ? DAY), updatedAt = NOW()
       WHERE id = ?`,
      [delayDays, existing.id]
    );
    return { progressId: existing.id, status: "re-enrolled", nextRunInDays: delayDays };
  } else {
    const res = await query(
      `INSERT INTO contact_sequence_progress (uid, contact_id, sequence_id, current_stage, status, next_run_at)
       VALUES (?, ?, ?, 1, 'active', DATE_ADD(NOW(), INTERVAL ? DAY))`,
      [uid, contactId, seqId, delayDays]
    );

    // Log activity
    await query(
      `INSERT INTO contact_activity (uid, contact_id, activity_type, description)
       VALUES (?, ?, 'SEQUENCE_ENROLLED', ?)`,
      [uid, contactId, `Enrolled into Automated Ghosting Reviver: ${seq.name} (Stage 1 scheduled in ${delayDays} day)`]
    ).catch(() => {});

    return { progressId: res.insertId, status: "enrolled", nextRunInDays: delayDays };
  }
}

/**
 * Processes all due reviver stages across all users
 */
async function processDueRevivers() {
  try {
    const dueItems = await query(`
      SELECT p.*, c.name AS contact_name, c.mobile AS contact_mobile, c.company AS contact_company,
             s.name AS seq_name, s.stage_1_message, s.stage_1_delay_days,
             s.stage_2_message, s.stage_2_delay_days,
             s.stage_3_message, s.stage_3_delay_days,
             s.stage_4_message, s.stage_4_delay_days
      FROM contact_sequence_progress p
      JOIN contact c ON p.contact_id = c.id
      JOIN reviver_sequences s ON p.sequence_id = s.id
      WHERE p.status = 'active'
        AND p.next_run_at <= NOW()
        AND s.is_active = 1
      LIMIT 50
    `);

    if (!dueItems || dueItems.length === 0) return { processed: 0 };

    let processedCount = 0;

    for (const item of dueItems) {
      const { uid, contact_id, current_stage, contact_mobile, contact_name, contact_company } = item;

      // Clean mobile
      const cleanMobile = (contact_mobile || "").replace(/[^0-9]/g, "");
      if (!cleanMobile) {
        await query("UPDATE contact_sequence_progress SET status = 'error_no_phone' WHERE id = ?", [item.id]);
        continue;
      }

      // Check if lead has replied in chat since last sent
      try {
        const replies = await query(
          `SELECT id FROM chat WHERE uid = ? AND sender = ? AND createdAt >= ? LIMIT 1`,
          [uid, cleanMobile, item.last_sent_at || item.createdAt]
        );
        if (replies && replies.length > 0) {
          // Contact replied! Auto-break the ghosting sequence!
          await query(
            `UPDATE contact_sequence_progress SET status = 'replied', updatedAt = NOW() WHERE id = ?`,
            [item.id]
          );
          await query(
            `INSERT INTO contact_activity (uid, contact_id, activity_type, description)
             VALUES (?, ?, 'REVIVER_GOAL_ACHIEVED', 'Contact replied! Ghosting drip sequence automatically completed and disengaged.')`,
            [uid, contact_id]
          ).catch(() => {});
          continue;
        }
      } catch (_) {}

      // Determine message template for this stage
      let msgTemplate = item.stage_1_message;
      let nextDelayDays = item.stage_2_delay_days || 3;

      if (current_stage === 2) {
        msgTemplate = item.stage_2_message;
        nextDelayDays = item.stage_3_delay_days || 7;
      } else if (current_stage === 3) {
        msgTemplate = item.stage_3_message;
        nextDelayDays = item.stage_4_delay_days || 14;
      } else if (current_stage >= 4) {
        msgTemplate = item.stage_4_message;
        nextDelayDays = 0;
      }

      // Token replacement
      const firstName = (contact_name || "there").split(" ")[0];
      const finalMsg = (msgTemplate || "")
        .replace(/{{name}}/gi, firstName)
        .replace(/{{company}}/gi, contact_company || "your business");

      // Attempt sending WhatsApp message via user's active session
      let sentSuccessfully = false;
      try {
        const instances = await query(
          "SELECT uniqueId FROM instance WHERE uid = ? AND status = 'ACTIVE' LIMIT 1",
          [uid]
        );
        if (instances.length > 0) {
          const session = await getSession(instances[0].uniqueId);
          if (session) {
            const receiverJid = `${cleanMobile}@s.whatsapp.net`;
            const exists = await isExists(session, receiverJid, false);
            if (exists) {
              await session.sendMessage(receiverJid, { text: finalMsg });
              sentSuccessfully = true;
            }
          }
        }
      } catch (waErr) {
        logger.error(`Reviver WhatsApp send error for contact ${contact_id}:`, waErr.message);
      }

      // Update progress
      if (current_stage >= 4) {
        await query(
          `UPDATE contact_sequence_progress 
           SET status = 'completed', last_sent_at = NOW(), updatedAt = NOW()
           WHERE id = ?`,
          [item.id]
        );
      } else {
        await query(
          `UPDATE contact_sequence_progress 
           SET current_stage = current_stage + 1,
               last_sent_at = NOW(),
               next_run_at = DATE_ADD(NOW(), INTERVAL ? DAY),
               updatedAt = NOW()
           WHERE id = ?`,
          [nextDelayDays, item.id]
        );
      }

      // Activity log
      await query(
        `INSERT INTO contact_activity (uid, contact_id, activity_type, description, metadata)
         VALUES (?, ?, 'GHOSTING_REVIVER_SENT', ?, ?)`,
        [
          uid,
          contact_id,
          `Automated Ghosting Reviver [Stage ${current_stage}] ${sentSuccessfully ? 'dispatched via WhatsApp' : 'logged (WhatsApp session standby)'}`,
          JSON.stringify({ stage: current_stage, message: finalMsg, delivered: sentSuccessfully }),
        ]
      ).catch(() => {});

      processedCount++;
    }

    return { processed: processedCount };
  } catch (err) {
    logger.error("processDueRevivers error:", err);
    return { error: err.message };
  }
}

/**
 * Initializes periodic background runner for Reviver sequences
 */
function initReviverCron() {
  console.log("[CRON] Ghosting Reviver sequence runner initialized.");
  // Run once on startup after 10s
  setTimeout(() => {
    processDueRevivers().catch(() => {});
  }, 10000);

  // Run every 15 minutes
  setInterval(() => {
    processDueRevivers().catch(() => {});
  }, 15 * 60 * 1000);
}

module.exports = {
  ensureDefaultSequence,
  enrollContact,
  processDueRevivers,
  initReviverCron,
};
