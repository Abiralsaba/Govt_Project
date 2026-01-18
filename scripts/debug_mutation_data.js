const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

async function debugData() {
    try {
        console.log('--- SERVICE REQUESTS (Pending) ---');
        const [reqs] = await pool.query('SELECT id, user_id, service_type, details, status FROM service_requests WHERE status = "pending"');
        reqs.forEach(r => console.log(JSON.stringify(r, null, 2)));

        console.log('\n--- LAND MUTATIONS (Pending) ---');
        const [muts] = await pool.query('SELECT id, user_id, tracking_number, status, khatian_no, dag_no FROM land_mutations_v2 WHERE status = "pending"');
        muts.forEach(m => console.log(JSON.stringify(m, null, 2)));

        console.log('\n--- MY LAND RECORDS ---');
        const [recs] = await pool.query('SELECT id, user_id, khatian_no, dag_no, land_size FROM my_land_record');
        recs.forEach(r => console.log(JSON.stringify(r, null, 2)));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

debugData();
