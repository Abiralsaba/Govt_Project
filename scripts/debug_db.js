const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect(async (err) => {
    if (err) {
        console.error('Connection failed:', err);
        process.exit(1);
    }
    console.log('Connected to database.');

    try {
        // List Tables
        db.query('SHOW TABLES', (err, tables) => {
            if (err) throw err;
            console.log('\n--- TABLES ---');
            console.log(tables.map(t => Object.values(t)[0]).join('\n'));

            // Check addto_cart definition
            db.query('DESCRIBE addto_cart', (err, cols) => {
                if (err) {
                    console.log('\n[ERROR] addto_cart table missing or error:', err.message);
                } else {
                    console.log('\n--- addto_cart COLUMNS ---');
                    console.table(cols);
                }

                // Check shop_items definition
                db.query('DESCRIBE shop_items', (err, cols) => {
                    if (err) {
                        console.log('\n[ERROR] shop_items table missing or error:', err.message);
                    } else {
                        console.log('\n--- shop_items COLUMNS ---');
                        console.table(cols);
                    }

                    db.end();
                });
            });
        });
    } catch (error) {
        console.error('Error:', error);
        db.end();
    }
});
