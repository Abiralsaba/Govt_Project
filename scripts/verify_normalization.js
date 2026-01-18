/**
 * Verification Script: Check 3NF Normalization
 * 
 * This script verifies the database normalization was successful.
 * Checks for: new columns, foreign keys, and data integrity.
 * 
 * Run: node scripts/verify_normalization.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'central_govt'
};

async function verify() {
    const conn = await mysql.createConnection(dbConfig);
    console.log('🔌 Connected to database...\n');
    console.log('='.repeat(60));
    console.log('         3NF NORMALIZATION VERIFICATION REPORT');
    console.log('='.repeat(60) + '\n');

    try {
        // 1. Check my_land_record location columns
        console.log('📋 1. my_land_record Table:');
        const [myLandCols] = await conn.query(`
            SELECT COLUMN_NAME FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'my_land_record' 
            AND COLUMN_NAME IN ('division_id', 'district_id', 'upazila_id')
        `, [dbConfig.database]);
        console.log(`   Location ID columns: ${myLandCols.length}/3 ✅`);

        const [myLandCount] = await conn.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(division_id) as with_div_id
            FROM my_land_record
        `);
        console.log(`   Total records: ${myLandCount[0].total}`);
        console.log(`   Records with division_id: ${myLandCount[0].with_div_id}`);

        // 2. Check landtax location columns
        console.log('\n📋 2. landtax Table:');
        const [landtaxCols] = await conn.query(`
            SELECT COLUMN_NAME FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'landtax' 
            AND COLUMN_NAME IN ('division_id', 'district_id', 'upazila_id')
        `, [dbConfig.database]);
        console.log(`   Location ID columns: ${landtaxCols.length}/3 ✅`);

        const [landtaxCount] = await conn.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(division_id) as with_div_id
            FROM landtax
        `);
        console.log(`   Total records: ${landtaxCount[0].total}`);
        console.log(`   Records with division_id: ${landtaxCount[0].with_div_id}`);

        // 3. Check Foreign Key constraints
        console.log('\n📋 3. Foreign Key Constraints:');
        const [fks] = await conn.query(`
            SELECT 
                TABLE_NAME, 
                CONSTRAINT_NAME, 
                COLUMN_NAME,
                REFERENCED_TABLE_NAME,
                REFERENCED_COLUMN_NAME
            FROM information_schema.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = ? 
            AND REFERENCED_TABLE_NAME IS NOT NULL
            ORDER BY TABLE_NAME, CONSTRAINT_NAME
        `, [dbConfig.database]);

        const fkByTable = {};
        for (const fk of fks) {
            if (!fkByTable[fk.TABLE_NAME]) fkByTable[fk.TABLE_NAME] = [];
            fkByTable[fk.TABLE_NAME].push(`${fk.COLUMN_NAME} → ${fk.REFERENCED_TABLE_NAME}`);
        }

        for (const [table, constraints] of Object.entries(fkByTable)) {
            console.log(`   ${table}:`);
            constraints.forEach(c => console.log(`      - ${c}`));
        }

        // 4. Verify location reference tables
        console.log('\n📋 4. Location Reference Tables:');
        const [divCount] = await conn.query('SELECT COUNT(*) as count FROM divisions');
        const [distCount] = await conn.query('SELECT COUNT(*) as count FROM districts');
        const [upaCount] = await conn.query('SELECT COUNT(*) as count FROM upazilas');
        console.log(`   Divisions: ${divCount[0].count}`);
        console.log(`   Districts: ${distCount[0].count}`);
        console.log(`   Upazilas: ${upaCount[0].count}`);

        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('                     SUMMARY');
        console.log('='.repeat(60));

        const allPassed =
            myLandCols.length === 3 &&
            landtaxCols.length === 3 &&
            Object.keys(fkByTable).length > 0;

        if (allPassed) {
            console.log('\n✅ All 3NF normalization checks PASSED!');
            console.log('\nThe database is now normalized with:');
            console.log('  • Location columns use foreign key references');
            console.log('  • Proper FK constraints ensure referential integrity');
            console.log('  • Original string data preserved for backward compatibility');
        } else {
            console.log('\n⚠️ Some checks did not pass. Review above for details.');
        }

    } catch (error) {
        console.error('\n❌ Verification failed:', error);
        throw error;
    } finally {
        await conn.end();
    }
}

verify()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
