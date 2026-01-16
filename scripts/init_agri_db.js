const db = require('../src/config/db');

async function initDB() {
    try {
        console.log('Initializing Agriculture Tables...');

        await db.query(`
            CREATE TABLE IF NOT EXISTS agri_subsidies (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                subsidy_type VARCHAR(100),
                amount_requested DECIMAL(10, 2),
                land_size_acres DECIMAL(10, 2),
                status VARCHAR(20) DEFAULT 'Pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Table agri_subsidies created/verified.');

        await db.query(`
            CREATE TABLE IF NOT EXISTS agri_crop_reports (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                crop_name VARCHAR(100),
                yield_metric_ton DECIMAL(10, 2),
                season VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Table agri_crop_reports created/verified.');

        process.exit(0);
    } catch (error) {
        console.error('DB Init Failed:', error);
        process.exit(1);
    }
}

initDB();
