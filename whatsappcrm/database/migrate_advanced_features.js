require("dotenv").config({ path: __dirname + "/../.env" });
const { query } = require("./dbpromise");

async function migrateAdvancedFeatures() {
  console.log("Running Advanced Features Database Migration...");

  // 1. Ensure team_agents table
  console.log("Creating/verifying team_agents table...");
  await query(`
    CREATE TABLE IF NOT EXISTS team_agents (
      id INT AUTO_INCREMENT PRIMARY KEY,
      uid VARCHAR(255) NOT NULL,
      agent_name VARCHAR(255) NOT NULL,
      agent_whatsapp VARCHAR(50) NOT NULL,
      agent_email VARCHAR(255) NULL,
      is_active TINYINT(1) DEFAULT 1,
      leads_assigned INT DEFAULT 0,
      last_assigned_at TIMESTAMP NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_uid (uid)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 2. Ensure crm_webhooks table
  console.log("Creating/verifying crm_webhooks table...");
  await query(`
    CREATE TABLE IF NOT EXISTS crm_webhooks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      uid VARCHAR(255) NOT NULL,
      name VARCHAR(100) NOT NULL,
      platform VARCHAR(50) NOT NULL,
      webhook_url VARCHAR(1000) NOT NULL,
      auth_header VARCHAR(1000) NULL,
      events VARCHAR(255) DEFAULT 'contact.created,contact.updated',
      is_active TINYINT(1) DEFAULT 1,
      last_triggered_at TIMESTAMP NULL,
      last_status INT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_uid (uid),
      INDEX idx_platform (platform)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 3. Ensure reviver_sequences table
  console.log("Creating/verifying reviver_sequences table...");
  await query(`
    CREATE TABLE IF NOT EXISTS reviver_sequences (
      id INT AUTO_INCREMENT PRIMARY KEY,
      uid VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      stage_1_delay_days INT DEFAULT 1,
      stage_1_message TEXT NOT NULL,
      stage_2_delay_days INT DEFAULT 3,
      stage_2_message TEXT NOT NULL,
      stage_3_delay_days INT DEFAULT 7,
      stage_3_message TEXT NOT NULL,
      stage_4_delay_days INT DEFAULT 14,
      stage_4_message TEXT NOT NULL,
      is_active TINYINT(1) DEFAULT 1,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_uid (uid)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 4. Ensure contact_sequence_progress table
  console.log("Creating/verifying contact_sequence_progress table...");
  await query(`
    CREATE TABLE IF NOT EXISTS contact_sequence_progress (
      id INT AUTO_INCREMENT PRIMARY KEY,
      uid VARCHAR(255) NOT NULL,
      contact_id INT NOT NULL,
      sequence_id INT NOT NULL,
      current_stage INT DEFAULT 1,
      status VARCHAR(50) DEFAULT 'active',
      last_sent_at TIMESTAMP NULL,
      next_run_at TIMESTAMP NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_uid (uid),
      INDEX idx_contact (contact_id),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 5. Ensure digital_profiles columns
  try {
    const profCols = await query("DESCRIBE digital_profiles");
    const existingCols = profCols.map(c => c.Field.toLowerCase());

    if (!existingCols.includes("persona_type")) {
      console.log("Adding persona_type to digital_profiles...");
      await query("ALTER TABLE digital_profiles ADD COLUMN persona_type VARCHAR(50) DEFAULT 'corporate'");
    }
    if (!existingCols.includes("lead_capture_mode")) {
      console.log("Adding lead_capture_mode to digital_profiles...");
      await query("ALTER TABLE digital_profiles ADD COLUMN lead_capture_mode TINYINT(1) DEFAULT 0");
    }
    if (!existingCols.includes("custom_domain")) {
      console.log("Adding custom_domain to digital_profiles...");
      await query("ALTER TABLE digital_profiles ADD COLUMN custom_domain VARCHAR(255) NULL");
    }
  } catch (e) {
    console.error("Error inspecting digital_profiles:", e.message);
  }

  // 6. Ensure device_tokens table
  console.log("Creating/verifying device_tokens table...");
  await query(`
    CREATE TABLE IF NOT EXISTS device_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      uid VARCHAR(255) NOT NULL,
      token VARCHAR(500) NOT NULL,
      platform VARCHAR(20) NOT NULL DEFAULT 'android',
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_token (token(255)),
      INDEX idx_uid (uid)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  console.log("Advanced Features Migration completed successfully!");
  process.exit(0);
}

migrateAdvancedFeatures().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
