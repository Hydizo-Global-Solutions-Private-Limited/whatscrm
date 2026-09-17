require("dotenv").config({ path: __dirname + "/../.env" });
const { query } = require("./dbpromise");

async function migrateCommunity() {
  console.log("Starting Community & Template Vault Database Migration...");

  // 1. Community Posts Table
  console.log("Creating community_posts table...");
  await query(`
    CREATE TABLE IF NOT EXISTS community_posts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      uid VARCHAR(255) NOT NULL,
      author_name VARCHAR(255) NOT NULL,
      author_title VARCHAR(255) NULL,
      author_company VARCHAR(255) NULL,
      author_avatar VARCHAR(500) NULL,
      author_whatsapp VARCHAR(50) NOT NULL,
      author_profile_slug VARCHAR(100) NULL,
      post_type VARCHAR(50) DEFAULT 'general',
      title VARCHAR(255) NULL,
      content TEXT NOT NULL,
      category VARCHAR(50) DEFAULT 'Networking',
      city VARCHAR(100) NULL,
      media_urls JSON NULL,
      event_id INT NULL,
      circle_id VARCHAR(50) DEFAULT 'all',
      ai_answer TEXT NULL,
      likes_count INT DEFAULT 0,
      comments_count INT DEFAULT 0,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_circle (circle_id),
      INDEX idx_type (post_type),
      INDEX idx_event (event_id),
      INDEX idx_uid (uid)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 2. Community Comments Table
  console.log("Creating community_comments table...");
  await query(`
    CREATE TABLE IF NOT EXISTS community_comments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      post_id INT NOT NULL,
      uid VARCHAR(255) NOT NULL,
      author_name VARCHAR(255) NOT NULL,
      author_avatar VARCHAR(500) NULL,
      author_whatsapp VARCHAR(50) NULL,
      content TEXT NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_post (post_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 3. Community Likes Table
  console.log("Creating community_likes table...");
  await query(`
    CREATE TABLE IF NOT EXISTS community_likes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      post_id INT NOT NULL,
      uid VARCHAR(255) NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_post_user (post_id, uid)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 4. Sales Script & Template Vault Table
  console.log("Creating sales_template_vault table...");
  await query(`
    CREATE TABLE IF NOT EXISTS sales_template_vault (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      industry VARCHAR(50) NOT NULL,
      category VARCHAR(50) NOT NULL,
      content TEXT NOT NULL,
      upvotes INT DEFAULT 0,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_industry (industry),
      INDEX idx_category (category)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  console.log("Community Migration completed successfully!");
  process.exit(0);
}

migrateCommunity().catch(err => {
  console.error("Community migration failed:", err);
  process.exit(1);
});
