const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const checkSchema = async () => {
    try {
        const [columns] = await pool.query('SHOW FULL COLUMNS FROM my_land_record');
        console.log('\nmy_land_record Table Schema:');
        columns.forEach(col => console.log(`${col.Field} - ${col.Type} - Null: ${col.Null}`));
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkSchema();
