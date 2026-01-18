/**
 * Fix Script: Populate NULL Location IDs
 * 
 * This script finds records with location names but NULL IDs
 * and populates the IDs by matching against location tables.
 * 
 * Run: node scripts/fix_null_location_ids.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'central_govt'
};

async function fix() {
    const conn = await mysql.createConnection(dbConfig);
    console.log('🔌 Connected to database...\n');

    try {
        // ==========================================
        // Fix my_land_record NULL IDs
        // ==========================================
        console.log('📋 Fixing my_land_record NULL location IDs...\n');

        // Get records with division names but NULL IDs
        const [nullRecords] = await conn.query(`
            SELECT id, division, district, upazila 
            FROM my_land_record 
            WHERE division IS NOT NULL 
            AND division != ''
            AND division_id IS NULL
        `);

        console.log(`Found ${nullRecords.length} records with NULL location IDs`);

        let updated = 0;
        let failed = [];

        for (const record of nullRecords) {
            console.log(`\n  Processing record #${record.id}: ${record.division} / ${record.district} / ${record.upazila}`);

            // Find division ID
            const [divResult] = await conn.query(
                'SELECT id FROM divisions WHERE name = ?',
                [record.division]
            );
            const divId = divResult[0]?.id || null;

            if (divId) {
                console.log(`    Division "${record.division}" -> ID ${divId}`);
            } else {
                console.log(`    ⚠️ Division "${record.division}" not found`);
            }

            // Find district ID
            let distId = null;
            if (divId && record.district) {
                const [distResult] = await conn.query(
                    'SELECT id FROM districts WHERE name = ? AND division_id = ?',
                    [record.district, divId]
                );
                distId = distResult[0]?.id || null;

                if (distId) {
                    console.log(`    District "${record.district}" -> ID ${distId}`);
                } else {
                    console.log(`    ⚠️ District "${record.district}" not found in division ${divId}`);
                }
            }

            // Find upazila ID
            let upaId = null;
            if (distId && record.upazila) {
                const [upaResult] = await conn.query(
                    'SELECT id FROM upazilas WHERE name = ? AND district_id = ?',
                    [record.upazila, distId]
                );
                upaId = upaResult[0]?.id || null;

                if (upaId) {
                    console.log(`    Upazila "${record.upazila}" -> ID ${upaId}`);
                } else {
                    console.log(`    ⚠️ Upazila "${record.upazila}" not found in district ${distId}`);
                }
            }

            // Update record if at least division was found
            if (divId) {
                await conn.query(
                    'UPDATE my_land_record SET division_id = ?, district_id = ?, upazila_id = ? WHERE id = ?',
                    [divId, distId, upaId, record.id]
                );
                console.log(`    ✅ Updated record #${record.id}`);
                updated++;
            } else {
                failed.push(record);
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log('SUMMARY');
        console.log('='.repeat(50));
        console.log(`Total records with NULL IDs: ${nullRecords.length}`);
        console.log(`Successfully updated: ${updated}`);
        console.log(`Failed to match: ${failed.length}`);

        if (failed.length > 0) {
            console.log('\nFailed records (location names don\'t match database):');
            failed.forEach(r => {
                console.log(`  - ID ${r.id}: "${r.division}" / "${r.district}" / "${r.upazila}"`);
            });
        }

        // Verify final state
        const [finalCheck] = await conn.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(division_id) as with_div_id
            FROM my_land_record
        `);
        console.log(`\nFinal state: ${finalCheck[0].with_div_id}/${finalCheck[0].total} records have division_id`);

    } catch (error) {
        console.error('\n❌ Fix failed:', error);
        throw error;
    } finally {
        await conn.end();
    }
}

fix()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
