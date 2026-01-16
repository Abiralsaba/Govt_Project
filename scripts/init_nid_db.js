const db = require('../src/config/db');

async function initDB() {
    try {
        console.log('Initializing NID Tables...');

        await db.query(`
            CREATE TABLE IF NOT EXISTS nid_corrections (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                nid_number VARCHAR(50),
                request_type VARCHAR(50), -- Correction, Re-issue
                field_name VARCHAR(50),
                corrected_value VARCHAR(255),
                reason VARCHAR(255),
                status VARCHAR(20) DEFAULT 'Pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Table nid_corrections created/verified.');

        process.exit(0);
    } catch (error) {
        console.error('DB Init Failed:', error);
        process.exit(1);
    }
}

initDB();
