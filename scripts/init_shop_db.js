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
        console.error('Error connecting onto database:', err);
        return;
    }
    console.log('Connected to database.');

    const sqlPath = path.join(__dirname, '../src/database/shop_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    db.query(sql, (err, result) => {
        if (err) {
            console.error('Error executing schema:', err);
        } else {
            console.log('Shop schema applied successfully.');
        }
        db.end();
    });
});
