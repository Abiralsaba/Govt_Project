const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function checkSchema() {
    try {
        const connection = await pool.getConnection();
        console.log("--- my_land_record ---");
        const [cols] = await connection.query('SHOW COLUMNS FROM my_land_record');
        cols.forEach(c => console.log(`${c.Field} (${c.Type})`));
        connection.release();
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
checkSchema();
