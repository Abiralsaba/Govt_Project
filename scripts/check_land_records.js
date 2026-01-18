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
        const [tables] = await pool.query('SHOW TABLES');
        const tableNames = tables.map(t => Object.values(t)[0]);
        console.log('Tables:', tableNames);

        if (tableNames.includes('land_records')) {
            const [columns] = await pool.query('SHOW FULL COLUMNS FROM land_records');
            console.log('\nland_records Schema:');
            columns.forEach(col => console.log(`${col.Field} - ${col.Type}`));
        } else {
            console.log('land_records does not exist.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkSchema();
