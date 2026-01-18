const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'central_govt'
};

async function testWithToken() {
    try {
        console.log('--- Generating Token & Testing ---');

        // 1. Generate Token
        const userId = 1; // otpuser
        const secret = process.env.JWT_SECRET || 'super_secret_key_change_this_in_prod';
        // Note: app.js or authController.js usage should be checked if JWT_SECRET is not in .env

        const token = jwt.sign({ id: userId }, secret, { expiresIn: '1h' });
        console.log('Generated Token');

        // 2. Create Todo
        console.log('Creating Todo with Description...');
        const todoData = {
            title: 'API Token Test Task',
            description: 'Description Verification Success (Token)'
        };

        const createRes = await fetch('http://localhost:3000/api/dashboard/todos', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(todoData)
        });

        const createData = await createRes.json();
        console.log('Create Response:', createData);

        if (!createRes.ok) {
            console.error('Create Failed:', createData);
            return;
        }

        // 3. Verify in DB
        const conn = await mysql.createConnection(dbConfig);
        const [rows] = await conn.query('SELECT * FROM todos WHERE id = ?', [createData.id]);
        console.log('DB Record:', rows[0]);
        conn.end();

    } catch (e) {
        console.error(e);
    }
}
testWithToken();
