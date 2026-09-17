require("dotenv").config({ path: __dirname + "/../.env" });
const { query } = require("./dbpromise");

async function migrateExtended() {
  console.log("Starting Extended Features Database Migration...");

  // 1. Create email_templates table
  console.log("Creating 'email_templates' table...");
  await query(`
    CREATE TABLE IF NOT EXISTS email_templates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      uid VARCHAR(255) NOT NULL,
      title VARCHAR(255) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      body_html TEXT NOT NULL,
      variables JSON NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_uid (uid)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 2. Create google_integrations table
  console.log("Creating 'google_integrations' table...");
  await query(`
    CREATE TABLE IF NOT EXISTS google_integrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      uid VARCHAR(255) NOT NULL UNIQUE,
      access_token TEXT NULL,
      refresh_token TEXT NULL,
      token_expiry BIGINT NULL,
      sheet_id VARCHAR(255) NULL,
      sheet_name VARCHAR(255) NULL,
      auto_sync_sheets TINYINT DEFAULT 0,
      auto_sync_contacts TINYINT DEFAULT 0,
      auto_sync_calendar TINYINT DEFAULT 0,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_uid (uid)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 3. Create shared_cards table for /s/:token viral loop
  console.log("Creating 'shared_cards' table...");
  await query(`
    CREATE TABLE IF NOT EXISTS shared_cards (
      id INT AUTO_INCREMENT PRIMARY KEY,
      uid VARCHAR(255) NOT NULL,
      token VARCHAR(100) NOT NULL UNIQUE,
      contact_id INT NULL,
      title VARCHAR(255) NULL,
      views INT DEFAULT 0,
      exchanges INT DEFAULT 0,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_token (token),
      INDEX idx_uid (uid)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 4. Create referrals table
  console.log("Creating 'referrals' table...");
  await query(`
    CREATE TABLE IF NOT EXISTS referrals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      referrer_uid VARCHAR(255) NOT NULL,
      referred_uid VARCHAR(255) NULL,
      referral_code VARCHAR(50) NOT NULL,
      referred_email VARCHAR(255) NULL,
      commission_amount DECIMAL(10,2) DEFAULT 0.00,
      status VARCHAR(50) DEFAULT 'active',
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_code (referral_code),
      INDEX idx_referrer (referrer_uid)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  console.log("Extended Migration completed successfully!");
  process.exit(0);
}

migrateExtended().catch(err => {
  console.error("Extended migration failed:", err);
  process.exit(1);
});
