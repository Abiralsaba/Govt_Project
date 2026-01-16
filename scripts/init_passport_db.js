const db = require('../src/config/db');

async function initDB() {
    try {
        console.log('Initializing Passport Tables...');

        await db.query('DROP TABLE IF EXISTS passport_applications');

        await db.query(`
            CREATE TABLE passport_applications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                application_type VARCHAR(50),
                passport_details VARCHAR(255),
                status VARCHAR(20) DEFAULT 'Pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Table passport_applications created/verified.');

        process.exit(0);
    } catch (error) {
        console.error('DB Init Failed:', error);
        process.exit(1);
    }
}

initDB();
