const db = require('../src/config/db');

async function createTables() {
    try {
        console.log('Creating tables...');

        await db.query(`
            CREATE TABLE IF NOT EXISTS todos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                title VARCHAR(255) NOT NULL,
                status ENUM('todo', 'progress', 'done') DEFAULT 'todo',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES reg_info(id) ON DELETE CASCADE
            )
        `);
        console.log('todos table created.');

        await db.query(`
            CREATE TABLE IF NOT EXISTS service_requests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                service_type VARCHAR(100),
                details TEXT,
                status ENUM('Pending', 'In Progress', 'Resolved') DEFAULT 'Pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES reg_info(id) ON DELETE CASCADE
            )
        `);
        console.log('service_requests table created.');

        console.log('Tables created successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error creating tables:', error);
        process.exit(1);
    }
}

createTables();
