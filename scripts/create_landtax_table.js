const pool = require('../src/config/db');

const createTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS landtax (
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
        console.log('✅ landtax table created successfully');
        connection.release();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating table:', error);
        process.exit(1);
    }
};

createTable();
