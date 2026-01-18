/**
 * Migration Script: Normalize Location Data
 * 
 * This script adds location ID columns (division_id, district_id, upazila_id)
 * to my_land_record and landtax tables, then populates them by matching
 * existing name strings to the normalized location tables.
 * 
 * Run: node scripts/migrate_locations.js
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
        // ==========================================
        // STEP 1: Add columns to my_land_record
        // ==========================================
        console.log('📋 STEP 1: Updating my_land_record table...');

        // Check if columns already exist
        const [myLandCols] = await conn.query(`
            SELECT COLUMN_NAME FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'my_land_record' 
            AND COLUMN_NAME IN ('division_id', 'district_id', 'upazila_id')
        `, [dbConfig.database]);

        const existingMyLandCols = myLandCols.map(c => c.COLUMN_NAME);

        if (!existingMyLandCols.includes('division_id')) {
            await conn.query('ALTER TABLE my_land_record ADD COLUMN division_id INT NULL');
            console.log('  ✅ Added division_id column to my_land_record');
        } else {
            console.log('  ⏭️  division_id column already exists');
        }

        if (!existingMyLandCols.includes('district_id')) {
            await conn.query('ALTER TABLE my_land_record ADD COLUMN district_id INT NULL');
            console.log('  ✅ Added district_id column to my_land_record');
        } else {
            console.log('  ⏭️  district_id column already exists');
        }

        if (!existingMyLandCols.includes('upazila_id')) {
            await conn.query('ALTER TABLE my_land_record ADD COLUMN upazila_id INT NULL');
            console.log('  ✅ Added upazila_id column to my_land_record');
        } else {
            console.log('  ⏭️  upazila_id column already exists');
        }

        // ==========================================
        // STEP 2: Add columns to landtax
        // ==========================================
        console.log('\n📋 STEP 2: Updating landtax table...');

        const [landtaxCols] = await conn.query(`
            SELECT COLUMN_NAME FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'landtax' 
            AND COLUMN_NAME IN ('division_id', 'district_id', 'upazila_id')
        `, [dbConfig.database]);

        const existingLandtaxCols = landtaxCols.map(c => c.COLUMN_NAME);

        if (!existingLandtaxCols.includes('division_id')) {
            await conn.query('ALTER TABLE landtax ADD COLUMN division_id INT NULL');
            console.log('  ✅ Added division_id column to landtax');
        } else {
            console.log('  ⏭️  division_id column already exists');
        }

        if (!existingLandtaxCols.includes('district_id')) {
            await conn.query('ALTER TABLE landtax ADD COLUMN district_id INT NULL');
            console.log('  ✅ Added district_id column to landtax');
        } else {
            console.log('  ⏭️  district_id column already exists');
        }

        if (!existingLandtaxCols.includes('upazila_id')) {
            await conn.query('ALTER TABLE landtax ADD COLUMN upazila_id INT NULL');
            console.log('  ✅ Added upazila_id column to landtax');
        } else {
            console.log('  ⏭️  upazila_id column already exists');
        }

        // ==========================================
        // STEP 3: Populate IDs in my_land_record
        // ==========================================
        console.log('\n📋 STEP 3: Populating location IDs in my_land_record...');

        // Get records with division names but no IDs
        const [myLandRecords] = await conn.query(`
            SELECT id, division, district, upazila 
            FROM my_land_record 
            WHERE division IS NOT NULL AND division_id IS NULL
        `);

        console.log(`  Found ${myLandRecords.length} records to update`);

        let myLandUpdated = 0;
        let myLandUnmatched = [];

        for (const record of myLandRecords) {
            // Find division ID
            const [divResult] = await conn.query(
                'SELECT id FROM divisions WHERE name = ?',
                [record.division]
            );
            const divId = divResult[0]?.id || null;

            // Find district ID
            let distId = null;
            if (divId && record.district) {
                const [distResult] = await conn.query(
                    'SELECT id FROM districts WHERE name = ? AND division_id = ?',
                    [record.district, divId]
                );
                distId = distResult[0]?.id || null;
            }

            // Find upazila ID
            let upaId = null;
            if (distId && record.upazila) {
                const [upaResult] = await conn.query(
                    'SELECT id FROM upazilas WHERE name = ? AND district_id = ?',
                    [record.upazila, distId]
                );
                upaId = upaResult[0]?.id || null;
            }

            // Update record
            if (divId || distId || upaId) {
                await conn.query(
                    'UPDATE my_land_record SET division_id = ?, district_id = ?, upazila_id = ? WHERE id = ?',
                    [divId, distId, upaId, record.id]
                );
                myLandUpdated++;
            } else {
                myLandUnmatched.push({ id: record.id, div: record.division, dist: record.district });
            }
        }

        console.log(`  ✅ Updated ${myLandUpdated} records`);
        if (myLandUnmatched.length > 0) {
            console.log(`  ⚠️  ${myLandUnmatched.length} records could not be matched:`);
            myLandUnmatched.slice(0, 5).forEach(r => console.log(`     - ID ${r.id}: ${r.div} / ${r.dist}`));
        }

        // ==========================================
        // STEP 4: Populate IDs in landtax
        // ==========================================
        console.log('\n📋 STEP 4: Populating location IDs in landtax...');

        const [landtaxRecords] = await conn.query(`
            SELECT id, division, district, upazila 
            FROM landtax 
            WHERE division IS NOT NULL AND division_id IS NULL
        `);

        console.log(`  Found ${landtaxRecords.length} records to update`);

        let landtaxUpdated = 0;
        let landtaxUnmatched = [];

        for (const record of landtaxRecords) {
            const [divResult] = await conn.query(
                'SELECT id FROM divisions WHERE name = ?',
                [record.division]
            );
            const divId = divResult[0]?.id || null;

            let distId = null;
            if (divId && record.district) {
                const [distResult] = await conn.query(
                    'SELECT id FROM districts WHERE name = ? AND division_id = ?',
                    [record.district, divId]
                );
                distId = distResult[0]?.id || null;
            }

            let upaId = null;
            if (distId && record.upazila) {
                const [upaResult] = await conn.query(
                    'SELECT id FROM upazilas WHERE name = ? AND district_id = ?',
                    [record.upazila, distId]
                );
                upaId = upaResult[0]?.id || null;
            }

            if (divId || distId || upaId) {
                await conn.query(
                    'UPDATE landtax SET division_id = ?, district_id = ?, upazila_id = ? WHERE id = ?',
                    [divId, distId, upaId, record.id]
                );
                landtaxUpdated++;
            } else {
                landtaxUnmatched.push({ id: record.id, div: record.division, dist: record.district });
            }
        }

        console.log(`  ✅ Updated ${landtaxUpdated} records`);
        if (landtaxUnmatched.length > 0) {
            console.log(`  ⚠️  ${landtaxUnmatched.length} records could not be matched`);
        }

        // ==========================================
        // STEP 5: Add foreign key constraints
        // ==========================================
        console.log('\n📋 STEP 5: Adding foreign key constraints...');

        // my_land_record FKs
        try {
            await conn.query(`
                ALTER TABLE my_land_record 
                ADD CONSTRAINT fk_my_land_division 
                FOREIGN KEY (division_id) REFERENCES divisions(id) ON DELETE SET NULL
            `);
            console.log('  ✅ Added division FK to my_land_record');
        } catch (e) {
            if (e.code === 'ER_DUP_KEYNAME' || e.message.includes('Duplicate')) {
                console.log('  ⏭️  my_land_record division FK already exists');
            } else {
                console.log('  ⚠️  Could not add division FK:', e.message);
            }
        }

        try {
            await conn.query(`
                ALTER TABLE my_land_record 
                ADD CONSTRAINT fk_my_land_district 
                FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE SET NULL
            `);
            console.log('  ✅ Added district FK to my_land_record');
        } catch (e) {
            if (e.code === 'ER_DUP_KEYNAME' || e.message.includes('Duplicate')) {
                console.log('  ⏭️  my_land_record district FK already exists');
            } else {
                console.log('  ⚠️  Could not add district FK:', e.message);
            }
        }

        try {
            await conn.query(`
                ALTER TABLE my_land_record 
                ADD CONSTRAINT fk_my_land_upazila 
                FOREIGN KEY (upazila_id) REFERENCES upazilas(id) ON DELETE SET NULL
            `);
            console.log('  ✅ Added upazila FK to my_land_record');
        } catch (e) {
            if (e.code === 'ER_DUP_KEYNAME' || e.message.includes('Duplicate')) {
                console.log('  ⏭️  my_land_record upazila FK already exists');
            } else {
                console.log('  ⚠️  Could not add upazila FK:', e.message);
            }
        }

        // landtax FKs
        try {
            await conn.query(`
                ALTER TABLE landtax 
                ADD CONSTRAINT fk_landtax_division 
                FOREIGN KEY (division_id) REFERENCES divisions(id) ON DELETE SET NULL
            `);
            console.log('  ✅ Added division FK to landtax');
        } catch (e) {
            if (e.code === 'ER_DUP_KEYNAME' || e.message.includes('Duplicate')) {
                console.log('  ⏭️  landtax division FK already exists');
            } else {
                console.log('  ⚠️  Could not add division FK:', e.message);
            }
        }

        try {
            await conn.query(`
                ALTER TABLE landtax 
                ADD CONSTRAINT fk_landtax_district 
                FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE SET NULL
            `);
            console.log('  ✅ Added district FK to landtax');
        } catch (e) {
            if (e.code === 'ER_DUP_KEYNAME' || e.message.includes('Duplicate')) {
                console.log('  ⏭️  landtax district FK already exists');
            } else {
                console.log('  ⚠️  Could not add district FK:', e.message);
            }
        }

        try {
            await conn.query(`
                ALTER TABLE landtax 
                ADD CONSTRAINT fk_landtax_upazila 
                FOREIGN KEY (upazila_id) REFERENCES upazilas(id) ON DELETE SET NULL
            `);
            console.log('  ✅ Added upazila FK to landtax');
        } catch (e) {
            if (e.code === 'ER_DUP_KEYNAME' || e.message.includes('Duplicate')) {
                console.log('  ⏭️  landtax upazila FK already exists');
            } else {
                console.log('  ⚠️  Could not add upazila FK:', e.message);
            }
        }

        console.log('\n✅ Migration complete!');
        console.log('\n📊 Summary:');
        console.log(`   my_land_record: ${myLandUpdated} records updated`);
        console.log(`   landtax: ${landtaxUpdated} records updated`);

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
