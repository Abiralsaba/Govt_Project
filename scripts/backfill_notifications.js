const db = require('../src/config/db');

async function backfillNotifications() {
    console.log('Backfilling Notifications for Past Requests...');

    try {
        // 1. Get all approved/rejected requests
        const [requests] = await db.query('SELECT * FROM service_requests WHERE status IN ("approved", "rejected")');

        console.log(`Found ${requests.length} historic requests (Approved/Rejected).`);

        let count = 0;
        for (const req of requests) {
            // Check if a similar notification already exists to avoid duplicates (rough check)
            const msgStart = `Your request for ${req.service_type} has been ${req.status}`;
            const [exists] = await db.query('SELECT 1 FROM notifications WHERE user_id = ? AND message LIKE ?',
                [req.user_id, `${msgStart}%`]);

            if (exists.length === 0) {
                console.log(`Creating Notification for Request ID: ${req.id} (${req.status})`);
                const message = `Your request for ${req.service_type} has been ${req.status}. (Historic Data)`;
                await db.query('INSERT INTO notifications (user_id, message, is_read) VALUES (?, ?, FALSE)',
                    [req.user_id, message]);
                count++;
            } else {
                console.log(`Notification for Request ID ${req.id} already exists.`);
            }
        }

        console.log(`✅ Success: Created ${count} new notifications.`);

    } catch (error) {
        console.error('Backfill Failed:', error);
    } finally {
        process.exit();
    }
}

backfillNotifications();
