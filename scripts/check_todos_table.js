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
        console.log('Checking tables...');
        const [rows] = await conn.query("SHOW TABLES LIKE 'todos'");
        if (rows.length === 0) {
            console.log('Table `todos` DOES NOT exist.');
        } else {
            console.log('Table `todos` exists.');
            const [cols] = await conn.query("SHOW COLUMNS FROM todos");
            cols.forEach(c => console.log(c.Field));
        }
    } catch (e) {
        console.error(e);
    } finally {
        conn.end();
    }
}
check();
