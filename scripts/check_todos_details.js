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
        console.log('--- todos columns details ---');
        const [cols] = await conn.query('SHOW COLUMNS FROM todos');
        console.log(cols);
    } catch (e) {
        console.error(e);
    } finally {
        conn.end();
    }
}
check();
