require('dotenv').config();
const { query } = require('./database/dbpromise');

async function createTasksTable() {
  try {
    const sql = `
      CREATE TABLE IF NOT EXISTS tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uid VARCHAR(255) NOT NULL,
        contact_id INT DEFAULT NULL,
        title VARCHAR(255) NOT NULL,
        notes TEXT DEFAULT NULL,
        due_date DATETIME DEFAULT NULL,
        priority VARCHAR(50) DEFAULT 'medium',
        status VARCHAR(50) DEFAULT 'pending',
        source VARCHAR(50) DEFAULT 'manual',
        assigned_to VARCHAR(255) DEFAULT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_uid (uid),
        KEY idx_contact_id (contact_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await query(sql);
    console.log('tasks table created successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error creating tasks table:', err);
    process.exit(1);
  }
}

createTasksTable();
