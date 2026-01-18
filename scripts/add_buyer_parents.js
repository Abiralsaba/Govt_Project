const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

async function alterTable() {
    try {
        console.log('Adding buyer_father_name and buyer_mother_name...');

        // Add columns if they don't exist
        try {
            await pool.query("ALTER TABLE land_mutations_v2 ADD COLUMN buyer_father_name VARCHAR(255) AFTER buyer_name");
            console.log('Added buyer_father_name.');
        } catch (e) { console.log('buyer_father_name might already exist or error:', e.message); }

        try {
            await pool.query("ALTER TABLE land_mutations_v2 ADD COLUMN buyer_mother_name VARCHAR(255) AFTER buyer_father_name");
            console.log('Added buyer_mother_name.');
        } catch (e) { console.log('buyer_mother_name might already exist or error:', e.message); }

        process.exit(0);
    } catch (error) {
        console.error('Fatal Error:', error);
        process.exit(1);
    }
}
alterTable();
