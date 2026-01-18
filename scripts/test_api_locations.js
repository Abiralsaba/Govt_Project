const axios = require('axios');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');
const jwt = require('jsonwebtoken');

dotenv.config({ path: path.join(__dirname, '../.env') });

const TEST_EMAIL = 'abu@gmail.com'; // Adjust to a valid user in your DB if needed
const TEST_ID = 11; // Ensure this user exists

async function testApi() {
    try {
        console.log('--- TESTING LOCATION API ---');

        // 1. Generate Token (Bypassing login API to isolate Auth Middleware check)
        // We need the same secret from env
        const secret = process.env.JWT_SECRET || 'super_secret_key_change_this_in_prod';
        const token = jwt.sign({ id: TEST_ID, email: TEST_EMAIL }, secret, { expiresIn: '1h' });
        console.log(`Generated Token: ${token.substring(0, 20)}...`);

        // 2. Call API
        const url = 'http://localhost:3000/api/departments/locations/divisions';
        console.log(`GET ${url}`);

        const res = await axios.get(url, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Status:', res.status);
        console.log('Data (First 2 items):', res.data.slice(0, 2));

        if (Array.isArray(res.data) && res.data.length > 0) {
            console.log('SUCCESS: API is returning list.');
        } else {
            console.error('FAILURE: API returned empty or invalid data.');
        }

    } catch (error) {
        if (error.response) {
            console.error('API Error:', error.response.status, error.response.data);
        } else {
            console.error('Request Error:', error.message);
        }
    }
}

testApi();
