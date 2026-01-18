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
    CREATE TABLE IF NOT EXISTS my_land_record (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        khatian_no VARCHAR(50) NOT NULL,
        dag_no VARCHAR(50) NOT NULL,
        mouza VARCHAR(100),
        land_size DECIMAL(10, 4), -- in decimals
        ownership_description TEXT,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES reg_info(id) ON DELETE CASCADE
    );
    `;

    try {
        const connection = await pool.getConnection();
        await connection.query(query);
        console.log('✅ my_land_record table created successfully');

        // Optional: Insert dummy data for testing if empty
        const [rows] = await connection.query('SELECT COUNT(*) as count FROM my_land_record');
        if (rows[0].count === 0) {
            await connection.query(`
                INSERT INTO my_land_record (user_id, khatian_no, dag_no, mouza, land_size, ownership_description)
                VALUES 
                (1, '1020', '550', 'Dhanmondi', 5.50, 'Inherited from Father'),
                (1, '3050', '890', 'Savar', 12.00, 'Purchased in 2020')
            `);
            console.log('📝 Inserted dummy records for testing.');
        }

        connection.release();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating table:', error);
        process.exit(1);
    }
};

createTable();
