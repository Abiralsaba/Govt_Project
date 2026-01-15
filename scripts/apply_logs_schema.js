const pool = require('../src/config/db');
const fs = require('fs');
const path = require('path');

async function runSchema() {
    try {
        const sqlPath = path.join(__dirname, '../src/database/schema_logs.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Running schema...');
        await pool.query(sql);
        console.log('✅ Schema applied successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error applying schema:', error.message);
        process.exit(1);
    }
}

runSchema();
