const http = require('http');
const jwt = require('jsonwebtoken');

// Matches what is in authController.js
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_change_this_in_prod';

// Generate Token
const token = jwt.sign(
    { id: 1, username: 'TestUser', nid: '123' },
    JWT_SECRET,
    { expiresIn: '1h' }
);

function checkEndpoint(path) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        };

        const req = http.request(options, (res) => {
            console.log(`Endpoint ${path} returned status: ${res.statusCode}`);
            if (res.statusCode === 200) {
                console.log('✅ Route EXISTS (Server is Updated)');
            } else if (res.statusCode === 404) {
                console.log('❌ Route NOT FOUND (Server is STALE)');
            } else {
                console.log(`⚠️  Unexpected status: ${res.statusCode}`);
            }
            resolve(res.statusCode);
        });

        req.on('error', (e) => {
            console.error(`Problem with request: ${e.message}`);
            resolve(500);
        });

        req.end();
    });
}

async function runChecks() {
    console.log("Checking API Endpoints with Valid Token...");
    await checkEndpoint('/api/dashboard/services/active');
}

runChecks();
