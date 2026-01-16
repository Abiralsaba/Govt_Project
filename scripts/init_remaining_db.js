const db = require('../src/config/db');

async function initDB() {
    try {
        console.log('Initializing Remaining Tables (Health, Water, Edu)...');

        // Health
        await db.query(`
            CREATE TABLE IF NOT EXISTS health_vaccinations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                vaccine_name VARCHAR(100),
                status VARCHAR(20) DEFAULT 'Registered',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Water
        await db.query(`
            CREATE TABLE IF NOT EXISTS water_issues (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                description TEXT,
                status VARCHAR(20) DEFAULT 'Reported',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Edu
        await db.query(`
            CREATE TABLE IF NOT EXISTS edu_admissions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                unit_name VARCHAR(100),
                status VARCHAR(20) DEFAULT 'Pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('Tables created/verified.');

        process.exit(0);
    } catch (error) {
        console.error('DB Init Failed:', error);
        process.exit(1);
    }
}

initDB();
