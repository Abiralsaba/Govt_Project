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

const dropTable = async () => {
    const query = `DROP TABLE IF EXISTS land_tax_paid;`;

    try {
        const connection = await pool.getConnection();
        await connection.query(query);
        console.log('✅ land_tax_paid table dropped successfully');
        connection.release();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error dropping table:', error);
        process.exit(1);
    }
};

dropTable();
