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
        const [rows] = await conn.query('SELECT COUNT(*) as count FROM divisions');
        console.log('Divisions Count:', rows[0].count);

        const [dist] = await conn.query('SELECT COUNT(*) as count FROM districts');
        console.log('Districts Count:', dist[0].count);

        const [up] = await conn.query('SELECT COUNT(*) as count FROM upazilas');
        console.log('Upazilas Count:', up[0].count);
    } catch (e) {
        console.error(e);
    } finally {
        conn.end();
    }
}
check();
