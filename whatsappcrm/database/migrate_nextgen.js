require("dotenv").config({ path: __dirname + "/../.env" });
const { query } = require("./dbpromise");

async function migrate() {
  console.log("Starting Next-Gen MsgMagnet Database Migration...");

  // 1. Check and add columns to contact table
  const contactCols = await query("DESCRIBE contact");
  const existingFields = contactCols.map((c) => c.Field.toLowerCase());

  const colsToAdd = [
    { name: "source", type: "VARCHAR(50) DEFAULT 'manual'" },
    { name: "event_id", type: "INT NULL" },
    { name: "lead_temperature", type: "VARCHAR(20) DEFAULT 'warm'" },
    { name: "pipeline_stage", type: "VARCHAR(100) DEFAULT 'new'" },
    { name: "lat", type: "DECIMAL(10,8) NULL" },
    { name: "lng", type: "DECIMAL(11,8) NULL" },
    { name: "scan_image_url", type: "VARCHAR(500) NULL" },
    { name: "company", type: "VARCHAR(255) NULL" },
    { name: "job_title", type: "VARCHAR(255) NULL" },
    { name: "email", type: "VARCHAR(255) NULL" },
    { name: "website", type: "VARCHAR(255) NULL" },
    { name: "address", type: "TEXT NULL" },
    { name: "notes", type: "TEXT NULL" },
  ];

  for (const col of colsToAdd) {
    if (!existingFields.includes(col.name.toLowerCase())) {
      console.log(`Adding column '${col.name}' to 'contact' table...`);
      await query(`ALTER TABLE contact ADD COLUMN ${col.name} ${col.type}`);
    } else {
      console.log(`Column '${col.name}' already exists in 'contact'.`);
    }
  }

  // 2. Create events table
  console.log("Creating 'events' table if not exists...");
  await query(`
    CREATE TABLE IF NOT EXISTS events (
      id INT AUTO_INCREMENT PRIMARY KEY,
      uid VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT NULL,
      location_name VARCHAR(255) NULL,
      lat DECIMAL(10,8) NULL,
      lng DECIMAL(11,8) NULL,
      event_date DATE NULL,
      status VARCHAR(50) DEFAULT 'active',
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_uid (uid),
      INDEX idx_event_date (event_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 3. Create digital_profiles table
  console.log("Creating 'digital_profiles' table if not exists...");
  await query(`
    CREATE TABLE IF NOT EXISTS digital_profiles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      uid VARCHAR(255) NOT NULL UNIQUE,
      username VARCHAR(100) NOT NULL UNIQUE,
      display_name VARCHAR(255) NOT NULL,
      title VARCHAR(255) NULL,
      company VARCHAR(255) NULL,
      bio TEXT NULL,
      photo_url VARCHAR(500) NULL,
      cover_url VARCHAR(500) NULL,
      whatsapp VARCHAR(50) NULL,
      phone VARCHAR(50) NULL,
      email VARCHAR(255) NULL,
      website VARCHAR(255) NULL,
      location VARCHAR(255) NULL,
      links JSON NULL,
      services JSON NULL,
      theme VARCHAR(50) DEFAULT 'dark',
      views INT DEFAULT 0,
      is_active TINYINT DEFAULT 1,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_username (username),
      INDEX idx_uid (uid)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 4. Create tasks table
  console.log("Creating 'tasks' table if not exists...");
  await query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      uid VARCHAR(255) NOT NULL,
      contact_id INT NULL,
      title VARCHAR(500) NOT NULL,
      notes TEXT NULL,
      due_date DATETIME NULL,
      priority VARCHAR(20) DEFAULT 'medium',
      status VARCHAR(50) DEFAULT 'pending',
      source VARCHAR(50) DEFAULT 'manual',
      assigned_to VARCHAR(255) NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_uid (uid),
      INDEX idx_contact (contact_id),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 5. Create contact_activity table
  console.log("Creating 'contact_activity' table if not exists...");
  await query(`
    CREATE TABLE IF NOT EXISTS contact_activity (
      id INT AUTO_INCREMENT PRIMARY KEY,
      uid VARCHAR(255) NOT NULL,
      contact_id INT NOT NULL,
      activity_type VARCHAR(100) NOT NULL,
      description TEXT NULL,
      metadata JSON NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_uid (uid),
      INDEX idx_contact (contact_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  console.log("Migration completed successfully! All tables and columns are ready.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
