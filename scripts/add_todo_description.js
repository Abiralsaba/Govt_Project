const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'central_govt'
};

async function migrate() {
    const conn = await mysql.createConnection(dbConfig);
    try {
        console.log('Checking if description column exists...');
        const [cols] = await conn.query("SHOW COLUMNS FROM todos LIKE 'description'");

        if (cols.length === 0) {
            console.log('Adding description column...');
            await conn.query("ALTER TABLE todos ADD COLUMN description TEXT NULL AFTER title");
            console.log('Column added successfully.');
        } else {
            console.log('Column already exists.');
        }
    } catch (e) {
        console.error(e);
    } finally {
        conn.end();
    }
}
migrate();
