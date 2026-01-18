/**
 * Migration Script: Add Foreign Key Constraints
 * 
 * This script adds missing foreign key constraints to various tables
 * that reference reg_info but lack proper FK relationships.
 * 
 * Run: node scripts/add_foreign_keys.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'central_govt'
};

// Tables that need FK to reg_info(id) on user_id column
const tablesToAddFK = [
    'tax_returns',
    'passport_applications',
    'nid_corrections',
    'agri_subsidies',
    'agri_crop_reports',
    'health_vaccinations',
    'water_issues',
    'edu_admissions'
];

async function migrate() {
    const conn = await mysql.createConnection(dbConfig);
    console.log('🔌 Connected to database...\n');
    console.log('📋 Adding foreign key constraints to service tables...\n');

    let added = 0;
    let skipped = 0;
    let failed = 0;

    for (const table of tablesToAddFK) {
        const constraintName = `fk_${table}_user`;

        try {
            // Check if table exists
            const [tableExists] = await conn.query(`
                SELECT TABLE_NAME FROM information_schema.TABLES 
                WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
            `, [dbConfig.database, table]);

            if (tableExists.length === 0) {
                console.log(`  ⏭️  Table ${table} does not exist, skipping`);
                skipped++;
                continue;
            }

            // Check if constraint already exists
            const [existingFK] = await conn.query(`
                SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE 
                WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? 
                AND COLUMN_NAME = 'user_id' AND REFERENCED_TABLE_NAME IS NOT NULL
            `, [dbConfig.database, table]);

            if (existingFK.length > 0) {
                console.log(`  ⏭️  ${table} already has user_id FK`);
                skipped++;
                continue;
            }

            // Add foreign key
            await conn.query(`
                ALTER TABLE ${table} 
                ADD CONSTRAINT ${constraintName} 
                FOREIGN KEY (user_id) REFERENCES reg_info(id) ON DELETE CASCADE
            `);

            console.log(`  ✅ Added FK to ${table}`);
            added++;

        } catch (error) {
            console.log(`  ⚠️  Failed to add FK to ${table}: ${error.message}`);
            failed++;
        }
    }

    console.log('\n📊 Summary:');
    console.log(`   Added: ${added}`);
    console.log(`   Skipped (already exists): ${skipped}`);
    console.log(`   Failed: ${failed}`);

    await conn.end();
    console.log('\n✅ Foreign key migration complete!');
}

migrate()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Migration failed:', err);
        process.exit(1);
    });
