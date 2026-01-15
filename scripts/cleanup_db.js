const mysql = require('mysql2/promise');
require('dotenv').config();

const KEEP_TABLES = [
    'reg_info',
    'citizens',
    'nid_cards',
    'passport_books',
    'tax_payers',
    'land_records',
    // We will create these if they don't exist, but we shouldn't drop them if they do (unlikely in this flow but good practice)
    'todos',
    'service_requests'
];

async function cleanupDB() {
    console.log('Starting database cleanup...');

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'central_govt_db'
    });

    try {
        // 1. Get all tables
        const [rows] = await connection.query('SHOW TABLES');
        const tables = rows.map(row => Object.values(row)[0]);
        console.log(`Found ${tables.length} tables total.`);

        // 2. Identify tables to drop
        const tablesToDrop = tables.filter(t => !KEEP_TABLES.includes(t));
        console.log(`Identified ${tablesToDrop.length} tables to drop.`);

        if (tablesToDrop.length > 0) {
            // Disable FK checks to allow dropping tables with relationships
            await connection.query('SET FOREIGN_KEY_CHECKS = 0');

            for (const table of tablesToDrop) {
                await connection.query(`DROP TABLE IF EXISTS \`${table}\``);
                console.log(`Dropped table: ${table}`);
            }

            await connection.query('SET FOREIGN_KEY_CHECKS = 1');
            console.log('Finished dropping tables.');
        } else {
            console.log('No tables to drop.');
        }

        // 3. Create missing tables
        console.log('Creating missing tables...');

        await connection.query(`
            CREATE TABLE IF NOT EXISTS todos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                status ENUM('todo', 'done') DEFAULT 'todo',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Verified/Created table: todos');

        await connection.query(`
            CREATE TABLE IF NOT EXISTS service_requests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                service_type VARCHAR(100) NOT NULL,
                details TEXT,
                status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Verified/Created table: service_requests');

    } catch (error) {
        console.error('Cleanup Error:', error);
    } finally {
        await connection.end();
        console.log('Connection closed.');
    }
}

cleanupDB();
