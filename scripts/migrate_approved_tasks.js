const db = require('../src/config/db');

async function migrateApprovedTasks() {
    console.log('Migrating Approved Requests to Completed Tasks...');

    try {
        // 1. Get all approved/rejected requests from master table
        const [requests] = await db.query('SELECT * FROM service_requests WHERE status IN ("approved", "rejected")');

        console.log(`Found ${requests.length} completed requests.`);

        for (const req of requests) {
            // Check if already in completed_tasks
            const [exists] = await db.query('SELECT 1 FROM completed_tasks WHERE original_request_id = ?', [req.id]);

            if (exists.length === 0) {
                console.log(`Migrating Request ID: ${req.id}`);

                // Extract unique ID if possible
                const uniqueIdMatch = req.details.match(/ID: (\w+) -/);
                const uniqueId = uniqueIdMatch ? uniqueIdMatch[1] : 'Unknown';

                await db.query(
                    'INSERT INTO completed_tasks (user_id, service_type, original_request_id, unique_number, status, admin_comment) VALUES (?, ?, ?, ?, ?, ?)',
                    [req.user_id, req.service_type, req.id, uniqueId, req.status, 'Migrated from legacy data.']
                );
            } else {
                console.log(`Request ID ${req.id} already migrated.`);
            }
        }

        console.log('✅ Migration Completed.');

    } catch (error) {
        console.error('Migration Failed:', error);
    } finally {
        process.exit();
    }
}

migrateApprovedTasks();
