const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function deployExpansion() {
    try {
        console.log('Connecting to database...');
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'central_govt_db',
            multipleStatements: true
        });

        console.log('Reading expansion schema file...');
        const schemaPath = path.join(__dirname, '../src/database/schema_expansion.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('Executing expansion schema...');
        await connection.query(schemaSql);

        console.log('Expansion schema deployed successfully!');

        // Counts tables
        const [rows] = await connection.query(`
            SELECT COUNT(*) AS count 
            FROM information_schema.tables 
            WHERE table_schema = ?
        `, [process.env.DB_NAME || 'central_govt_db']);

        console.log(`Total tables in '${process.env.DB_NAME}': ${rows[0].count}`);

        await connection.end();
    } catch (error) {
        console.error('Error deploying expansion:', error);
        process.exit(1);
    }
}

deployExpansion();
