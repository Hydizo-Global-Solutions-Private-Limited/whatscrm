require("dotenv").config();
const { query } = require("./dbpromise");

async function patch() {
  console.log("Patching tables...");

  const patchQueries = [
    "ALTER TABLE crm_webhooks ADD COLUMN name VARCHAR(100) NULL",
    "ALTER TABLE crm_webhooks ADD COLUMN webhook_url VARCHAR(1000) NULL",
    "ALTER TABLE crm_webhooks ADD COLUMN auth_header VARCHAR(1000) NULL",
    "ALTER TABLE crm_webhooks ADD COLUMN events VARCHAR(255) NULL",
    "ALTER TABLE crm_webhooks ADD COLUMN last_triggered_at TIMESTAMP NULL",
    "ALTER TABLE crm_webhooks ADD COLUMN last_status INT NULL",
    "ALTER TABLE crm_webhooks ADD COLUMN updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",

    "ALTER TABLE reviver_sequences ADD COLUMN stage_1_delay_days INT DEFAULT 1",
    "ALTER TABLE reviver_sequences ADD COLUMN stage_1_message TEXT NULL",
    "ALTER TABLE reviver_sequences ADD COLUMN stage_2_delay_days INT DEFAULT 3",
    "ALTER TABLE reviver_sequences ADD COLUMN stage_2_message TEXT NULL",
    "ALTER TABLE reviver_sequences ADD COLUMN stage_3_delay_days INT DEFAULT 7",
    "ALTER TABLE reviver_sequences ADD COLUMN stage_3_message TEXT NULL",
    "ALTER TABLE reviver_sequences ADD COLUMN stage_4_delay_days INT DEFAULT 14",
    "ALTER TABLE reviver_sequences ADD COLUMN stage_4_message TEXT NULL",
    "ALTER TABLE reviver_sequences ADD COLUMN updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",

    "ALTER TABLE contact_sequence_progress ADD COLUMN uid VARCHAR(255) NULL",
    "ALTER TABLE contact_sequence_progress ADD COLUMN current_stage INT DEFAULT 1",
    "ALTER TABLE contact_sequence_progress ADD COLUMN last_sent_at TIMESTAMP NULL",
    "ALTER TABLE contact_sequence_progress ADD COLUMN createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
  ];

  for (const q of patchQueries) {
    try {
      await query(q);
      console.log("Applied:", q.substring(0, 45) + "...");
    } catch (e) {
      // Ignore Duplicate column name
    }
  }

  console.log("Patch complete!");
  process.exit(0);
}

patch().catch(err => {
  console.error("Patch error:", err);
  process.exit(1);
});
