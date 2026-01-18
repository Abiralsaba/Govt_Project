const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'central_govt'
};

async function testFetch() {
    const conn = await mysql.createConnection(dbConfig);
    try {
        console.log('--- Testing Fetch Todos ---');
        // Get the last user ID used in testing or just the first user
        const [users] = await conn.query('SELECT id, name FROM reg_info LIMIT 1');
        if (users.length === 0) {
            console.log('No users found.');
            return;
        }
        const userId = users[0].id; // using first user as proxy
        console.log(`Fetching todos for User ID: ${userId} (${users[0].name})`);

        const [rows] = await conn.query('SELECT * FROM todos WHERE user_id = ? ORDER BY created_at DESC', [userId]);
        console.log(`Found ${rows.length} todos.`);
        console.log(rows);

    } catch (e) {
        console.error(e);
    } finally {
        conn.end();
    }
}
testFetch();
