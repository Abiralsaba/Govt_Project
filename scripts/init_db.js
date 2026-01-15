const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initDB() {
    console.log('Starting database initialization...');

    const connectionConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        multipleStatements: true
    };

    let connection;

    try {
        // 1. Connect without database to create it
        connection = await mysql.createConnection(connectionConfig);
        console.log('Connected to MySQL server.');

        const dbName = process.env.DB_NAME || 'central_govt_db';

        // 2. Create Database
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
        console.log(`Database '${dbName}' created or already exists.`);

        // 3. Switch to the database
        await connection.changeUser({ database: dbName });
        console.log(`Switched to database '${dbName}'.`);

        // 4. Read Schema File
        const schemaPath = path.join(__dirname, '../src/database/schema_full.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        console.log('Read schema file.');

        // 5. Execute Schema
        // Split by semicolon might be needed if the driver doesn't handle huge multiple statements well, 
        // but mysql2 with multipleStatements: true usually handles it. 
        // However, reading the schema file, it has many statements. 
        // Let's try running it as one block first.

        await connection.query(schemaSql);
        console.log('Schema executed successfully. Tables created.');

    } catch (error) {
        console.error('Error initializing database:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('Connection closed.');
        }
    }
}

initDB();
