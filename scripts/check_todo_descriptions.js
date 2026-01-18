const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'central_govt'
};

async function checkDescriptions() {
    const conn = await mysql.createConnection(dbConfig);
    try {
        console.log('--- Checking Todo Descriptions ---');
        const [rows] = await conn.query('SELECT id, title, description FROM todos ORDER BY created_at DESC LIMIT 5');
        console.log(rows);
    } catch (e) {
        console.error(e);
    } finally {
        conn.end();
    }
}
checkDescriptions();
