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

async function setup() {
    try {
        const trackingNum = 'LMT-TEST-' + Math.floor(Math.random() * 10000);
        const sellerId = 11;
        const buyerId = 12;
        const buyerNid = '019293888391'; // Fetched from DB
        const khatian = '567';
        const dag = '55';
        const amount = 5.0; // Partial sale

        console.log(`Creating Test Mutation: ${trackingNum}`);

        // 1. Create Mutation Record
        await pool.query(`
            INSERT INTO land_mutations_v2 
            (user_id, division_id, district_id, upazila_id, applicant_name, applicant_father, applicant_mother, applicant_nid, khatian_no, dag_no, land_amount, land_price, deed_no, ownership_type, buyer_name, buyer_nid, buyer_father_name, buyer_mother_name, tracking_number, status)
            VALUES (?, 1, 1, 1, 'Seller Test', 'Father', 'Mother', '11111', ?, ?, ?, 50000, 'DEED-123', 'Own', 'Buyer Test', ?, 'B-Father', 'B-Mother', ?, 'Pending')
        `, [sellerId, khatian, dag, amount, buyerNid, trackingNum]);

        // 2. Create Service Request
        const [res] = await pool.query(`
            INSERT INTO service_requests (user_id, service_type, details, status, notification_read) 
            VALUES (?, 'Land Mutation', ?, 'pending', 0)
        `, [sellerId, `ID: ${trackingNum} - Mutation for Khatian: ${khatian}, Dag: ${dag}`]);

        console.log(`Created Service Request ID: ${res.insertId}`);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

setup();
