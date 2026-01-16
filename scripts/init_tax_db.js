const db = require('../src/config/db');

async function initDB() {
    try {
        console.log('Initializing Tax Tables...');

        await db.query(`
            CREATE TABLE IF NOT EXISTS tax_returns (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                tax_year INT,
                income_amount DECIMAL(15, 2),
                tax_paid DECIMAL(15, 2),
                submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Table tax_returns created/verified.');

        process.exit(0);
    } catch (error) {
        console.error('DB Init Failed:', error);
        process.exit(1);
    }
}

initDB();
