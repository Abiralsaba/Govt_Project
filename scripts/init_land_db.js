const db = require('../src/config/db');

async function initDB() {
    try {
        console.log('Initializing Land Tables...');

        await db.query(`
            CREATE TABLE IF NOT EXISTS land_mutations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                khatian_no VARCHAR(50),
                deed_no VARCHAR(50),
                reason TEXT,
                status VARCHAR(20) DEFAULT 'Pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Table land_mutations created/verified.');

        process.exit(0);
    } catch (error) {
        console.error('DB Init Failed:', error);
        process.exit(1);
    }
}

initDB();
