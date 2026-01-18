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
        console.log('--- my_land_record columns ---');
        const [cols1] = await conn.query('SHOW COLUMNS FROM my_land_record');
        cols1.forEach(c => console.log(c.Field));

        console.log('\n--- land_mutations_v2 columns ---');
        const [cols2] = await conn.query('SHOW COLUMNS FROM land_mutations_v2');
        cols2.forEach(c => console.log(c.Field));
    } catch (e) {
        console.error(e);
    } finally {
        conn.end();
    }
}
check();
