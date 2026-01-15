const mysql = require('mysql2/promise');
require('dotenv').config();

async function createRegInfoTable() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'central_govt_db'
        });

        console.log('Connected to database.');

        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS reg_info (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                nid VARCHAR(50) UNIQUE NOT NULL,
                mobile VARCHAR(20) NOT NULL,
                dob DATE NOT NULL,
                address TEXT,
                gender VARCHAR(20),
                reset_otp VARCHAR(10),
                reset_otp_expires DATETIME,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        await connection.query(createTableQuery);
        console.log('Table reg_info created successfully.');

        await connection.end();
        process.exit(0);
    } catch (error) {
        console.error('Error creating table:', error);
        process.exit(1);
    }
}

createRegInfoTable();
