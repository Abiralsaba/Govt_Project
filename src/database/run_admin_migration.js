/**
 * Script to run admin schema migration
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'govt_db',
        multipleStatements: true
    });

    try {
        console.log('Connected to database...');

        // Read and execute admin schema
        const schemaPath = path.join(__dirname, 'admin_schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        await connection.query(schema);
        console.log('✅ Admin tables created successfully!');

        // Check if tables exist
        const [tables] = await connection.query("SHOW TABLES LIKE 'admins'");
        console.log('Admin tables found:', tables.length > 0);

    } catch (error) {
        console.error('Migration error:', error);
    } finally {
        await connection.end();
    }
}

runMigration();
