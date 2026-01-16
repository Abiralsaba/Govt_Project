const db = require('../src/config/db');

async function testSubmission() {
    console.log('Testing Service Request Submission...');
    const userId = 1; // Assuming user ID 1 exists, if not need to create one or pick one.
    const subCategory = 'req_nid_correction'; // unique table
    const uniqueId = 'TEST-123';
    const description = 'Test Description';
    const evidenceLink = 'http://test.com';

    try {
        // 1. Check if table exists
        await db.query(`SELECT 1 FROM ${subCategory} LIMIT 1`);
        console.log(`Table ${subCategory} exists.`);

        // 2. Insert
        console.log(`Inserting into ${subCategory}...`);
        const [res] = await db.query(`INSERT INTO ${subCategory} (user_id, unique_number, description, evidence_link) VALUES (?, ?, ?, ?)`,
            [userId, uniqueId, description, evidenceLink]);
        console.log('Insert ID:', res.insertId);

        // 3. Verify
        const [rows] = await db.query(`SELECT * FROM ${subCategory} WHERE id = ?`, [res.insertId]);
        console.log('Retrieved Row:', rows[0]);

        if (rows.length > 0 && rows[0].unique_number === uniqueId) {
            console.log('SUCCESS: Data stored in unique table.');
        } else {
            console.log('FAILURE: Data not found in unique table.');
        }

    } catch (error) {
        console.error('TEST FAILED:', error);
    } finally {
        process.exit();
    }
}

testSubmission();
