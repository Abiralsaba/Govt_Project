const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function initStipends() {
    try {
        console.log('Reading schema file...');
        const schemaPath = path.join(__dirname, '../database/stipend_schema.sql');
        const sql = fs.readFileSync(schemaPath, 'utf8');

        console.log('Executing schema...');
        // Split by semicolon to handle multiple statements if the driver doesn't support batch
        // But usually mysql2/promise supports multiple statements if configured. 
        // To be safe, let's split.
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const statement of statements) {
            await db.query(statement);
        }

        console.log('Stipend tables created and seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error initializing stipends:', error);
        process.exit(1);
    }
}

initStipends();
