const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'central_govt'
};

async function test() {
    const conn = await mysql.createConnection(dbConfig);
    try {
        console.log('--- Testing Todos ---');
        // Get a user
        const [users] = await conn.query('SELECT id FROM reg_info LIMIT 1');
        const userId = users[0].id;
        console.log('User ID:', userId);

        // Create Task
        const title = 'Test Task ' + Date.now();
        console.log('Creating task:', title);
        const [res] = await conn.query('INSERT INTO todos (user_id, title) VALUES (?, ?)', [userId, title]);
        console.log('Inserted ID:', res.insertId);

        // Fetch Task
        const [rows] = await conn.query('SELECT * FROM todos WHERE id = ?', [res.insertId]);
        console.log('Fetched Task:', rows[0]);

        // Move Task
        await conn.query('UPDATE todos SET status = "progress" WHERE id = ?', [res.insertId]);
        const [rows2] = await conn.query('SELECT * FROM todos WHERE id = ?', [res.insertId]);
        console.log('Moved Task:', rows2[0]);

        // Delete Task
        await conn.query('DELETE FROM todos WHERE id = ?', [res.insertId]);
        console.log('Deleted Task');

    } catch (e) {
        console.error(e);
    } finally {
        conn.end();
    }
}
test();
