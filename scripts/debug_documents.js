const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'central_govt'
};

async function check() {
    const conn = await mysql.createConnection(dbConfig);
    try {
        console.log('--- USER check ---');
        const [users] = await conn.query('SELECT id, name FROM reg_info LIMIT 1');
        if (users.length === 0) {
            console.log('No users found.');
            return;
        }
        const userId = users[0].id;
        console.log(`Using User ID: ${userId} (${users[0].name})`);

        console.log('\n--- govt_user_documents columns ---');
        try {
            const [cols] = await conn.query('SHOW COLUMNS FROM govt_user_documents');
            cols.forEach(c => console.log(c.Field));
        } catch (e) {
            console.error('Error showing columns:', e.message);
        }

        console.log('\n--- Simulating getDocuments ---');

        // 1. Get User Info
        const [user] = await conn.query('SELECT nid FROM reg_info WHERE id = ?', [userId]);
        const userNid = user.length > 0 ? user[0].nid : null;
        console.log('User NID:', userNid);

        // 2. Fetch specific records
        if (userNid) {
            const [nids] = await conn.query('SELECT * FROM nid_cards WHERE nid_number = ?', [userNid]);
            console.log('NID Cards:', nids.length);
        }

        // 3. Fetch Pending/Verification Official Docs
        console.log('Querying govt_user_documents...');
        const [govtDocs] = await conn.query('SELECT * FROM govt_user_documents WHERE user_id = ? ORDER BY created_at DESC', [userId]);
        console.log('Govt Docs found:', govtDocs.length);

        const findGovtDoc = (cat) => govtDocs.find(d => d.doc_category === cat && ['Pending', 'Approved', 'Rejected'].includes(d.status));

        const nidUpload = findGovtDoc('NID');
        console.log('NID Upload:', nidUpload);

        const passportUpload = findGovtDoc('Passport');
        console.log('Passport Upload:', passportUpload);

        const taxUpload = findGovtDoc('Tax');
        console.log('Tax Upload:', taxUpload);

        // Land
        console.log('Querying my_land_record...');
        const [land] = await conn.query('SELECT * FROM my_land_record WHERE user_id = ?', [userId]);
        console.log('Land records:', land.length);

        console.log('SUCCESS: Logic executed without crash.');

    } catch (error) {
        console.error('CRASHED:', error);
    } finally {
        conn.end();
    }
}
check();
