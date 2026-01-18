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

const updateTable = async () => {
    try {
        const connection = await pool.getConnection();

        // Check if columns exist to avoid errors
        const [columns] = await connection.query('SHOW COLUMNS FROM my_land_record');
        const columnNames = columns.map(c => c.Field);

        if (!columnNames.includes('owner_name')) {
            await connection.query('ALTER TABLE my_land_record ADD COLUMN owner_name VARCHAR(255) AFTER user_id');
            console.log('✅ Added owner_name column');
        }
        if (!columnNames.includes('nid')) {
            await connection.query('ALTER TABLE my_land_record ADD COLUMN nid VARCHAR(50) AFTER owner_name');
            console.log('✅ Added nid column');
        }
        if (!columnNames.includes('status')) {
            await connection.query("ALTER TABLE my_land_record ADD COLUMN status ENUM('Approved', 'Pending', 'Rejected') DEFAULT 'Pending' AFTER ownership_description");
            console.log('✅ Added status column');
        }

        console.log('🎉 Table schema updated successfully');
        connection.release();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating table:', error);
        process.exit(1);
    }
};

updateTable();
