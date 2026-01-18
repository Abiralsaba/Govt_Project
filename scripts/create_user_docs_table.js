const db = require('../src/config/db');

async function createTable() {
    try {
        const query = `
            CREATE TABLE IF NOT EXISTS user_documents (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                doc_type VARCHAR(50) NOT NULL,
                doc_name VARCHAR(100) NOT NULL,
                file_path VARCHAR(255) NOT NULL,
                status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
                admin_comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES reg_info(id) ON DELETE CASCADE
            )
        `;
        await db.query(query);
        console.log("Table 'user_documents' created successfully.");
        process.exit(0);
    } catch (error) {
        console.error("Error creating table:", error);
        process.exit(1);
    }
}

createTable();
