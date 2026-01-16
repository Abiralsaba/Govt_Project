const http = require('http');

function checkEndpoint(path) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: 'GET'
        };

        const req = http.request(options, (res) => {
            console.log(`Endpoint ${path} returned status: ${res.statusCode}`);
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
    console.log("Checking API Endpoints to verify Server Version...");
    // This route MUST exist if server was restarted
    await checkEndpoint('/api/dashboard/services/active');

    // This route MUST exist if server was restarted
    await checkEndpoint('/api/dashboard/notifications');
}

runChecks();
