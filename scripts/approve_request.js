const db = require('../src/config/db');

async function approveFirstPending() {
    console.log('Simulating Admin Approval...');

    try {
        // 1. correct the query to only pick one
        const [rows] = await db.query('SELECT * FROM service_requests WHERE status = "pending" LIMIT 1');

        if (rows.length === 0) {
            console.log('No pending requests to approve.');
            process.exit();
        }

        const req = rows[0];
        console.log(`Approving Request ID: ${req.id} (${req.service_type})`);

        // 2. Update Master
        await db.query('UPDATE service_requests SET status = "approved" WHERE id = ?', [req.id]);

        // 3. Update Sub-Table (Try best effort)
        const uniqueIdMatch = req.details.match(/ID: (\w+) -/);
        const uniqueId = uniqueIdMatch ? uniqueIdMatch[1] : null;
        // Clean up service type to table name
        const tableName = `req_${req.service_type.replace(/ /g, '_')}`;

        if (uniqueId) {
            try {
                await db.query(`UPDATE ${tableName} SET status = "approved" WHERE unique_number = ?`, [uniqueId]);
                console.log(`Updated sub-table ${tableName}`);
            } catch (e) { console.log('Subtable update skip (might not exist or match)'); }
        }

        // 4. Create Completed Task
        await db.query(
            'INSERT INTO completed_tasks (user_id, service_type, original_request_id, unique_number, status, admin_comment) VALUES (?, ?, ?, ?, ?, ?)',
            [req.user_id, req.service_type, req.id, uniqueId || 'Unknown', 'approved', 'Documents verified automatically by System.']
        );

        // 5. Notification
        await db.query('INSERT INTO notifications (user_id, message) VALUES (?, ?)',
            [req.user_id, `Your request for ${req.service_type} has been approved. Reason: Documents verified automatically.`]);

        console.log('✅ SUCCESS: Request Approved, Task Created, Notification Sent.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

approveFirstPending();
