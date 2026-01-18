const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'central_govt'
};

async function testFullFlow() {
    try {
        console.log('--- Testing Full Flow (Native Fetch) ---');

        // 1. Login
        console.log('Logging in...');
        const loginRes = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                identifier: 'otpuser',
                password: 'password123'
            })
        });

        const loginData = await loginRes.json();

        if (!loginRes.ok) {
            console.error('Login Failed:', loginData);
            return;
        }

        const token = loginData.token;
        console.log('Token received.');

        // 2. Create Todo
        console.log('Creating Todo with Description...');
        const todoData = {
            title: 'API Test Task Native',
            description: 'Description Verification Success'
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
testFullFlow();
