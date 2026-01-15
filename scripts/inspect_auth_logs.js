const pool = require('../src/config/db');

async function inspectTable() {
    try {
        const [rows] = await pool.query('DESCRIBE auth_logs');
        console.log('Schema for auth_logs:');
        console.table(rows);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

inspectTable();
