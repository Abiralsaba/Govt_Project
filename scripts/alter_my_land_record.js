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

const alterTable = async () => {
    try {
        const connection = await pool.getConnection();

        // Check if columns exist to avoid errors (or just use ADD COLUMN IF NOT EXISTS if supported, but standard MySQL might not support IF NOT EXISTS for ADD COLUMN in all versions, safe to try/catch or check schema)
        // Simplest: Run individual ALTER statements and ignore "Duplicate column" checks for this script complexity, OR check first.
        // Let's just run one big ALTER and catch error if it fails (not ideal).
        // Better: Check schema first.

        console.log('Checking schema...');
        const [columns] = await connection.query('SHOW FULL COLUMNS FROM my_land_record');
        const existingFields = columns.map(c => c.Field);

        const newFields = [
            { name: 'division', def: 'VARCHAR(100)' },
            { name: 'district', def: 'VARCHAR(100)' },
            { name: 'upazila', def: 'VARCHAR(100)' },
            { name: 'father_name', def: 'VARCHAR(255)' },
            { name: 'mother_name', def: 'VARCHAR(255)' },
            { name: 'deed_no', def: 'VARCHAR(100)' },
            { name: 'land_price', def: 'DECIMAL(15, 2)' }
        ];

        let alterQuery = 'ALTER TABLE my_land_record ';
        let modifications = [];

        newFields.forEach(f => {
            if (!existingFields.includes(f.name)) {
                modifications.push(`ADD COLUMN ${f.name} ${f.def}`);
            }
        });

        if (modifications.length > 0) {
            alterQuery += modifications.join(', ');
            console.log('Running:', alterQuery);
            await connection.query(alterQuery);
            console.log('✅ Table altered successfully.');
        } else {
            console.log('✅ All columns already exist.');
        }

        connection.release();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error altering table:', error);
        process.exit(1);
    }
};

alterTable();
