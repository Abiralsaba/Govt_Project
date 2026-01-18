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

const createTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS land_tax_paid (
        id INT AUTO_INCREMENT PRIMARY KEY,
        transaction_id VARCHAR(255) UNIQUE NOT NULL,
        applicant_name VARCHAR(255) NOT NULL,
        father_name VARCHAR(255),
        mother_name VARCHAR(255),
        nid VARCHAR(50) NOT NULL,
        mobile VARCHAR(20) NOT NULL,
        division VARCHAR(100),
        district VARCHAR(100),
        upazila VARCHAR(100),
        khatian_no VARCHAR(50) NOT NULL,
        dag_no VARCHAR(50) NOT NULL,
        land_type ENUM('Residential', 'Commercial', 'Agricultural') NOT NULL,
        land_size DECIMAL(10, 4) NOT NULL, -- in decimals
        tax_amount DECIMAL(10, 2) NOT NULL,
        payment_status ENUM('Pending', 'Success', 'Failed', 'Cancelled') DEFAULT 'Pending',
        payment_date DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    `;

    try {
        const connection = await pool.getConnection();
        await connection.query(query);
        console.log('✅ land_tax_paid table created successfully');

        // Optional: Drop old table if exists to clean up
        // await connection.query('DROP TABLE IF EXISTS landtax');
        // console.log('🗑️ Old landtax table dropped (if existed)');

        connection.release();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating table:', error);
        process.exit(1);
    }
};

createTable();
