
const db = require('../src/config/db');

async function createTable() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS govt_user_documents (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                doc_category VARCHAR(50) NOT NULL, -- 'NID', 'Passport', 'Tax'
                file_path VARCHAR(255) NOT NULL,
                status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
                admin_comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES reg_info(id) ON DELETE CASCADE
            )
        `);
        console.log('govt_user_documents table created successfully!');
        process.exit();
    } catch (error) {
        console.error('Error creating table:', error);
        process.exit(1);
    }
}

createTable();
