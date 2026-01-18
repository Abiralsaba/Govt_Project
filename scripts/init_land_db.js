const mysql = require('mysql2/promise');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function run() {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'central_govt_db',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            multipleStatements: true // Important for running schema scripts
        });

        const schemaPath = path.join(__dirname, '../src/database/land_mutation_schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('Running schema script...');
        await pool.query(schemaSql);
        console.log('Schema script executed successfully.');

        // Verify
        const [rows] = await pool.query("SHOW TABLES LIKE 'land_mutations_v2'");
        if (rows.length > 0) {
            console.log('Table land_mutations_v2 exists.');
        } else {
            console.error('Table creation failed!');
        }

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
    }
}

run();
