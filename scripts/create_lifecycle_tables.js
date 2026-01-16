const db = require('../src/config/db');

async function createLifecycleTables() {
    console.log('Creating lifecycle tables...');
    try {
        const connection = await db.getConnection();

        // completed_tasks table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS completed_tasks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                service_type VARCHAR(100) NOT NULL,
                original_request_id INT NOT NULL,
                unique_number VARCHAR(50),
                status ENUM('Approved', 'Rejected') NOT NULL,
                admin_comment TEXT,
                completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES reg_info(id) ON DELETE CASCADE
            )
        `);
        console.log('Created table: completed_tasks');

        // notifications table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                message TEXT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES reg_info(id) ON DELETE CASCADE
            )
        `);
        console.log('Created table: notifications');

        // Also ensure service_requests is up to date if not already
        // No change needed there for now as we use it as Master Log

        connection.release();
        console.log('Lifecycle tables created successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error creating tables:', error);
        process.exit(1);
    }
}

createLifecycleTables();
