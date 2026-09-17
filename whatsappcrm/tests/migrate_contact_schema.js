require('dotenv').config();
const { query } = require('../database/dbpromise');

async function migrate() {
  try {
    console.log('--- Checking & Migrating Contact Table Columns ---');
    const cols = await query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'contact' AND TABLE_SCHEMA = 'whatscrm'");
    const existingCols = new Set(cols.map(c => c.COLUMN_NAME.toLowerCase()));

    const addColIfNotExists = async (name, def) => {
      if (!existingCols.has(name.toLowerCase())) {
        console.log(`Adding column '${name}' to 'contact'...`);
        await query(`ALTER TABLE contact ADD COLUMN ${name} ${def}`);
        console.log(`Column '${name}' added successfully.`);
      } else {
        console.log(`Column '${name}' already exists.`);
      }
    };

    await addColIfNotExists('job_title', 'VARCHAR(255) NULL');
    await addColIfNotExists('email', 'VARCHAR(255) NULL');
    await addColIfNotExists('website', 'VARCHAR(255) NULL');
    await addColIfNotExists('address', 'TEXT NULL');
    await addColIfNotExists('notes', 'TEXT NULL');
    await addColIfNotExists('source', "VARCHAR(50) DEFAULT 'manual'");
    await addColIfNotExists('event_id', 'INT NULL');
    await addColIfNotExists('pipeline_stage', "VARCHAR(50) DEFAULT 'new'");
    await addColIfNotExists('lat', 'DECIMAL(10, 7) NULL');
    await addColIfNotExists('lng', 'DECIMAL(10, 7) NULL');
    await addColIfNotExists('scan_image_url', 'VARCHAR(500) NULL');

    console.log('--- Creating contact_activity table if not exists ---');
    await query(`
      CREATE TABLE IF NOT EXISTS contact_activity (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uid VARCHAR(255) NOT NULL,
        contact_id INT NOT NULL,
        activity_type VARCHAR(100) NOT NULL,
        description TEXT,
        metadata LONGTEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_uid (uid),
        INDEX idx_contact (contact_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('contact_activity table ready.');

    console.log('--- Creating events table if not exists ---');
    await query(`
      CREATE TABLE IF NOT EXISTS events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uid VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        location_name VARCHAR(255),
        lat DECIMAL(10, 7),
        lng DECIMAL(10, 7),
        event_date DATETIME,
        status VARCHAR(50) DEFAULT 'active',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_uid (uid)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('events table ready.');

    console.log('--- Creating digital_profiles table if not exists ---');
    await query(`
      CREATE TABLE IF NOT EXISTS digital_profiles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uid VARCHAR(255) NOT NULL,
        username VARCHAR(100) NOT NULL,
        full_name VARCHAR(255),
        job_title VARCHAR(255),
        company VARCHAR(255),
        bio TEXT,
        email VARCHAR(255),
        mobile VARCHAR(100),
        website VARCHAR(255),
        address TEXT,
        avatar_url VARCHAR(500),
        cover_url VARCHAR(500),
        theme_color VARCHAR(50) DEFAULT '#2563eb',
        links LONGTEXT,
        services LONGTEXT,
        is_active INT DEFAULT 1,
        views INT DEFAULT 0,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_uid (uid),
        INDEX idx_username (username)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('digital_profiles table ready.');

    console.log('--- Creating helper tables if not exist ---');
    await query(`
      CREATE TABLE IF NOT EXISTS team_agents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uid VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(100),
        is_active INT DEFAULT 1,
        leads_assigned INT DEFAULT 0,
        last_assigned_at DATETIME,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_uid (uid)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS device_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uid VARCHAR(255) NOT NULL,
        token VARCHAR(500) NOT NULL,
        platform VARCHAR(50) DEFAULT 'android',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_uid (uid)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS crm_webhooks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uid VARCHAR(255) NOT NULL,
        url VARCHAR(500) NOT NULL,
        event VARCHAR(100) DEFAULT 'contact.created',
        secret VARCHAR(255),
        is_active INT DEFAULT 1,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_uid (uid)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('helper tables ready.');

    console.log('ALL MIGRATIONS COMPLETED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrate();
