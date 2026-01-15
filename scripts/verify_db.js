const db = require('../src/config/db');

async function testConnection() {
    try {
        const [rows] = await db.query('SELECT 1 + 1 AS solution');
        console.log('Database connection verification successful. Solution:', rows[0].solution);

        const [tables] = await db.query('SHOW TABLES');
        console.log('Number of tables found:', tables.length);
        if (tables.length > 0) {
            console.log('First 5 tables:', tables.slice(0, 5).map(t => Object.values(t)[0]).join(', '));
        }

    } catch (error) {
        console.error('Database connection verification failed:', error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

testConnection();
