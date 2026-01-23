const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true
});

db.connect((err) => {
    if (err) {
        console.error('Connection failed:', err);
        process.exit(1);
    }
    console.log('Connected to database.');

    // 1. Drop the table with the bad FK
    const dropSql = `
        DROP TABLE IF EXISTS order_items;
        DROP TABLE IF EXISTS orders; -- Old table
        DROP TABLE IF EXISTS cart_items; -- Old table
    `;

    db.query(dropSql, (err) => {
        if (err) {
            console.error('Error dropping tables:', err);
            db.end();
            return;
        }
        console.log('Dropped old/mismatched tables.');

        // 2. Re-run the schema to create order_items correctly
        const schemaPath = path.join(__dirname, '../src/database/shop_schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        db.query(schemaSql, (err) => {
            if (err) {
                console.error('Error applying schema:', err);
            } else {
                console.log('Schema re-applied successfully. Foreign keys should be correct now.');
            }
            db.end();
        });
    });
});
