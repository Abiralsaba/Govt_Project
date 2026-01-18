/**
 * Setup Community Tables
 * 
 * Creates the 5 tables needed for the community group system:
 * 1. community_groups - Groups with admin approval
 * 2. community_members - User memberships
 * 3. community_posts - Posts with approval
 * 4. post_likes - Like records
 * 5. post_comments - Comment records
 * 
 * Run: node scripts/setup_community_tables.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'central_govt'
};

async function setup() {
    const conn = await mysql.createConnection(dbConfig);
    console.log('🔌 Connected to database...\n');

    try {
        // ==========================================
        // Table 1: community_groups
        // ==========================================
        console.log('📋 Creating community_groups table...');
        await conn.query(`
            CREATE TABLE IF NOT EXISTS community_groups (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                cover_image VARCHAR(255),
                created_by INT NOT NULL,
                status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES reg_info(id) ON DELETE CASCADE
            )
        `);
        console.log('  ✅ community_groups created');

        // ==========================================
        // Table 2: community_members
        // ==========================================
        console.log('📋 Creating community_members table...');
        await conn.query(`
            CREATE TABLE IF NOT EXISTS community_members (
                id INT AUTO_INCREMENT PRIMARY KEY,
                group_id INT NOT NULL,
                user_id INT NOT NULL,
                role ENUM('member', 'admin') DEFAULT 'member',
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (group_id) REFERENCES community_groups(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES reg_info(id) ON DELETE CASCADE,
                UNIQUE KEY unique_membership (group_id, user_id)
            )
        `);
        console.log('  ✅ community_members created');

        // ==========================================
        // Table 3: community_posts
        // ==========================================
        console.log('📋 Creating community_posts table...');
        await conn.query(`
            CREATE TABLE IF NOT EXISTS community_posts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                group_id INT NOT NULL,
                user_id INT NOT NULL,
                content TEXT NOT NULL,
                image_url VARCHAR(255),
                status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                like_count INT DEFAULT 0,
                comment_count INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (group_id) REFERENCES community_groups(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES reg_info(id) ON DELETE CASCADE
            )
        `);
        console.log('  ✅ community_posts created');

        // ==========================================
        // Table 4: post_likes
        // ==========================================
        console.log('📋 Creating post_likes table...');
        await conn.query(`
            CREATE TABLE IF NOT EXISTS post_likes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                post_id INT NOT NULL,
                user_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES reg_info(id) ON DELETE CASCADE,
                UNIQUE KEY unique_like (post_id, user_id)
            )
        `);
        console.log('  ✅ post_likes created');

        // ==========================================
        // Table 5: post_comments
        // ==========================================
        console.log('📋 Creating post_comments table...');
        await conn.query(`
            CREATE TABLE IF NOT EXISTS post_comments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                post_id INT NOT NULL,
                user_id INT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES reg_info(id) ON DELETE CASCADE
            )
        `);
        console.log('  ✅ post_comments created');

        // ==========================================
        // Verify all tables
        // ==========================================
        console.log('\n📊 Verifying tables...');
        const [tables] = await conn.query(`
            SELECT TABLE_NAME FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = ? 
            AND TABLE_NAME IN ('community_groups', 'community_members', 'community_posts', 'post_likes', 'post_comments')
        `, [dbConfig.database]);

        console.log(`  Found ${tables.length}/5 community tables`);
        tables.forEach(t => console.log(`    - ${t.TABLE_NAME}`));

        console.log('\n✅ Community tables setup complete!');

    } catch (error) {
        console.error('\n❌ Setup failed:', error);
        throw error;
    } finally {
        await conn.end();
    }
}

setup()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
