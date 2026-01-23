const db = require('../src/config/db');
const fs = require('fs');
const path = require('path');

async function migrate() {
    try {
        console.log('Running contact migration...');
        const schema = fs.readFileSync(path.join(__dirname, '../src/database/contact_schema.sql'), 'utf8');
        await db.query(schema);
        console.log('Contact table created successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
