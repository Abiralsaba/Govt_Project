/**
 * Migration Script: Consolidate Tax Tables
 * 
 * This script merges land_tax_paid into landtax (they have identical schemas)
 * and renames land_tax_paid to backup table instead of deleting.
 * 
 * Run: node scripts/consolidate_tax_tables.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'central_govt'
};

async function migrate() {
    const conn = await mysql.createConnection(dbConfig);
    console.log('🔌 Connected to database...\n');

    try {
        // Check if land_tax_paid exists
        const [tableExists] = await conn.query(`
            SELECT TABLE_NAME FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'land_tax_paid'
        `, [dbConfig.database]);

        if (tableExists.length === 0) {
            console.log('⏭️  land_tax_paid table does not exist, nothing to migrate');
            await conn.end();
            return;
        }

        // Check if backup already exists
        const [backupExists] = await conn.query(`
            SELECT TABLE_NAME FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'land_tax_paid_backup'
        `, [dbConfig.database]);

        if (backupExists.length > 0) {
            console.log('⏭️  land_tax_paid_backup already exists, migration may have been run before');
            await conn.end();
            return;
        }

        // Count records in land_tax_paid
        const [countResult] = await conn.query('SELECT COUNT(*) as count FROM land_tax_paid');
        const recordCount = countResult[0].count;
        console.log(`📋 Found ${recordCount} records in land_tax_paid`);

        if (recordCount > 0) {
            // Migrate unique records to landtax
            console.log('📋 Migrating unique records to landtax...');

            // Insert records that don't already exist in landtax (by transaction_id)
            const [insertResult] = await conn.query(`
                INSERT INTO landtax (
                    transaction_id, applicant_name, father_name, mother_name, nid, mobile,
                    division, district, upazila, division_id, district_id, upazila_id,
                    khatian_no, dag_no, land_type, land_size, tax_amount, 
                    payment_status, payment_date, created_at
                )
                SELECT 
                    ltp.transaction_id, ltp.applicant_name, ltp.father_name, ltp.mother_name, 
                    ltp.nid, ltp.mobile, ltp.division, ltp.district, ltp.upazila,
                    NULL, NULL, NULL,
                    ltp.khatian_no, ltp.dag_no, ltp.land_type, ltp.land_size, ltp.tax_amount,
                    ltp.payment_status, ltp.payment_date, ltp.created_at
                FROM land_tax_paid ltp
                LEFT JOIN landtax lt ON ltp.transaction_id = lt.transaction_id
                WHERE lt.id IS NULL
            `);

            console.log(`  ✅ Migrated ${insertResult.affectedRows} unique records to landtax`);
        }

        // Rename land_tax_paid to backup
        console.log('📋 Renaming land_tax_paid to land_tax_paid_backup...');
        await conn.query('RENAME TABLE land_tax_paid TO land_tax_paid_backup');
        console.log('  ✅ Table renamed to land_tax_paid_backup');

        console.log('\n✅ Tax table consolidation complete!');
        console.log('   The original land_tax_paid data is preserved in land_tax_paid_backup');

    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        throw error;
    } finally {
        await conn.end();
    }
}

migrate()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
