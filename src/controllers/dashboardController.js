const db = require('../config/db');

// Get Dashboard Summary (Stats & User Info)
exports.getSummary = async (req, res) => {
    const userId = req.user.id;
    try {
        const [user] = await db.query('SELECT name, nid, email, photo_url FROM reg_info WHERE id = ?', [userId]);

        // Real Stats
        // Real Stats - Single Source
        const [active] = await db.query('SELECT count(*) as count FROM service_requests WHERE user_id = ? AND status = "pending"', [userId]);
        const [completed] = await db.query('SELECT count(*) as count FROM service_requests WHERE user_id = ? AND status = "approved"', [userId]);
        const [notifs] = await db.query('SELECT count(*) as count FROM service_requests WHERE user_id = ? AND status IN ("approved", "rejected") AND notification_read = FALSE', [userId]);

        res.json({
            user: user[0],
            stats: {
                activeRequests: active[0].count,
                completedTasks: completed[0].count,
                notifications: notifs[0].count
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server Error' });
    }
};

// ... (existing Kanban & Document methods keep as is) ...

// Services: Get Active Requests
exports.getActiveRequests = async (req, res) => {
    try {
        const [requests] = await db.query(
            'SELECT * FROM service_requests WHERE user_id = ? AND status = ? ORDER BY created_at DESC',
            [req.user.id, 'pending']
        );
        res.json(requests);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch active requests' });
    }
};

// Services: Update Request Status (Approve/Reject)
exports.updateRequestStatus = async (req, res) => {
    const { requestId, status, comments } = req.body; // requestId is service_requests.id

    if (!['approved', 'rejected'].includes(status.toLowerCase())) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    try {
        // 1. Get the request details to know the sub-table (service type)
        const [reqData] = await db.query('SELECT * FROM service_requests WHERE id = ? AND user_id = ?', [requestId, req.user.id]);

        if (reqData.length === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }

        const request = reqData[0];
        // Reverse engineer table name: "nid correction" -> "req_nid_correction"
        // This is a bit fragile but works based on our naming convention
        const tableName = `req_${request.service_type.replace(/ /g, '_')}`;

        // 2. Update service_requests table
        await db.query('UPDATE service_requests SET status = ? WHERE id = ?', [status, requestId]);

        // 3. Update specific table (try catch in case table name inference fails, though it should work)
        try {
            // Check if table exists first or just try update?
            // "unique_number" might be needed to identify row in sub-table? 
            // `service_requests` doesn't strictly link ID to sub-table ID.
            // But we can match by user_id and approximate time or we should have stored sub-table ID.
            // Wait, we stored `details` as "ID: 123 - desc". We can extract ID.

            const uniqueIdMatch = request.details.match(/ID: (\w+) -/);
            const uniqueId = uniqueIdMatch ? uniqueIdMatch[1] : null;

            if (uniqueId) {
                await db.query(`UPDATE ${tableName} SET status = ? WHERE unique_number = ? AND user_id = ?`,
                    [status, uniqueId, req.user.id]);
            }
        } catch (subTableError) {
            console.warn(`Could not update sub-table ${tableName}:`, subTableError.message);
            // Don't fail the whole request, as the master record is updated
        }

        // 4. Insert into completed_tasks
        await db.query(
            'INSERT INTO completed_tasks (user_id, service_type, original_request_id, unique_number, status, admin_comment) VALUES (?, ?, ?, ?, ?, ?)',
            [req.user.id, request.service_type, requestId, request.details.split(' - ')[0].replace('ID: ', ''), status, comments]
        );

        // 5. Create Notification
        const message = `Your request for ${request.service_type} has been ${status}. ${comments ? 'Reason: ' + comments : ''}`;
        await db.query('INSERT INTO notifications (user_id, message) VALUES (?, ?)', [req.user.id, message]);

        res.json({ message: 'Request updated successfully' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update request' });
    }
};

// Services: Get Completed Tasks (Approved Only, from Service Requests)
exports.getCompletedTasks = async (req, res) => {
    try {
        const userId = req.user.id;
        // Single Source: Fetch from service_requests
        const [tasks] = await db.query(
            "SELECT * FROM service_requests WHERE user_id = ? AND status = 'approved' ORDER BY created_at DESC",
            [userId]
        );

        // Map to expected format
        const formattedTasks = tasks.map(t => {
            const uniqueIdMatch = t.details && t.details.match(/ID: (\w+) -/);
            const uniqueId = uniqueIdMatch ? uniqueIdMatch[1] : 'N/A';

            return {
                id: t.id,
                service_type: t.service_type,
                unique_number: uniqueId,
                status: 'Approved',
                completed_at: t.created_at
            };
        });

        res.json(formattedTasks);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch completed tasks' });
    }
};

// Services: Get Notifications (Approved/Rejected from Service Requests)
exports.getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        // Single Source: Fetch from service_requests where status is decided
        const [reqs] = await db.query(
            "SELECT * FROM service_requests WHERE user_id = ? AND status IN ('approved', 'rejected') ORDER BY created_at DESC",
            [userId]
        );

        const notifications = reqs.map(r => ({
            id: r.id,
            user_id: r.user_id,
            message: `Your request for ${r.service_type} has been ${r.status}.`,
            is_read: r.notification_read,
            created_at: r.created_at
        }));

        res.json(notifications);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
};

exports.markNotificationRead = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('UPDATE service_requests SET notification_read = TRUE WHERE id = ? AND user_id = ?', [id, req.user.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update notification' });
    }
};

// Kanban: Get Todos
exports.getTodos = async (req, res) => {
    try {
        const [todos] = await db.query('SELECT * FROM todos WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
        res.json(todos);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch todos' });
    }
};

// Kanban: Create Todo
exports.createTodo = async (req, res) => {
    const { title } = req.body;
    try {
        const [result] = await db.query('INSERT INTO todos (user_id, title) VALUES (?, ?)', [req.user.id, title]);
        res.json({ id: result.insertId, title, status: 'todo' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create task' });
    }
};

// Kanban: Update Status (Drag & Drop)
exports.updateTodoStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        await db.query('UPDATE todos SET status = ? WHERE id = ? AND user_id = ?', [status, id, req.user.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update task' });
    }
};

// Kanban: Delete Todo
exports.deleteTodo = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM todos WHERE id = ? AND user_id = ?', [id, req.user.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete task' });
    }
};

// Services: Submit Request
// Services: Submit Request
exports.submitServiceRequest = async (req, res) => {
    const { subCategory, uniqueId, description, evidenceLink } = req.body;

    // Whitelist valid tables to prevent SQL injection
    const validTables = [
        'req_nid_correction', 'req_birth_cert_correction', 'req_death_cert_correction', 'req_character_certificate', 'req_income_certificate',
        'req_education_sss', 'req_education_hsc', 'req_education_jsc', 'req_education_university_verification', 'req_education_transcript',
        'req_transport_driving_lic_correction', 'req_transport_driving_lic_renew', 'req_transport_vehicle_reg_correction', 'req_transport_ownership_transfer',
        'req_immigration_visa', 'req_immigration_passport_correction', 'req_immigration_emigration_clearance',
        'req_business_trade_lic', 'req_business_tin_certificate', 'req_business_vat_reg', 'req_business_company_reg', 'req_business_import_export',
        'req_legal_gd', 'req_legal_case', 'req_legal_complain'
    ];

    if (!validTables.includes(subCategory)) {
        return res.status(400).json({ error: 'Invalid service type' });
    }

    try {
        await db.query(`INSERT INTO ${subCategory} (user_id, unique_number, description, evidence_link) VALUES (?, ?, ?, ?)`,
            [req.user.id, uniqueId, description, evidenceLink]);

        // Also log into general service_requests table for easy history tracking (optional but good practice to refer back)
        // Adjusting original service_requests table usage to keep track of ALL requests centrally if needed, 
        // OR just relying on the specific tables. 
        // The previous implementation used 'service_requests'. Let's keep it for the "History" tab to work easily 
        // without querying 25 tables.

        await db.query('INSERT INTO service_requests (user_id, service_type, details, evidence_link) VALUES (?, ?, ?, ?)',
            [req.user.id, subCategory.replace('req_', '').replace(/_/g, ' '), `ID: ${uniqueId} - ${description}`, evidenceLink]);

        res.json({ message: 'Request submitted successfully' });
    } catch (error) {
        console.error('Submit Service Request Error:', error);
        res.status(500).json({ error: error.message || 'Failed to submit request' });
    }
};

// Departments List (Static or DB)
exports.getDepartments = (req, res) => {
    // Returning a rich list of departments for the frontend grid
    const departments = [
        { id: 'agri', name: 'Agriculture', icon: 'fa-wheat', desc: 'Subsidies, Crop Reports', link: 'agriculture.html' },
        { id: 'land', name: 'Land Ministry', icon: 'fa-landmark', desc: 'Mutations, Records', link: 'land.html' },
        { id: 'tax', name: 'NBR (Tax)', icon: 'fa-file-invoice-dollar', desc: 'Tax Returns, TIN', link: 'tax.html' },
        { id: 'passport', name: 'Passport', icon: 'fa-passport', desc: 'Applications, Renewal', link: 'passport.html' },
        { id: 'nid', name: 'NID Wing', icon: 'fa-id-card', desc: 'Corrections, Replacement', link: 'nid.html' },
        { id: 'health', name: 'Health', icon: 'fa-heartbeat', desc: 'Vaccination, Hospitals', link: 'health.html' },
        { id: 'water', name: 'Water Resources', icon: 'fa-water', desc: 'Supply, Management', link: 'water.html' },
        { id: 'edu', name: 'Education', icon: 'fa-graduation-cap', desc: 'Results, Admissions', link: 'education.html' }
    ];
    res.json(departments);
};

// Documents: Fetch all linked documents
exports.getDocuments = async (req, res) => {
    const userId = req.user.id;
    try {
        // 1. Get Citizen ID
        const [citizen] = await db.query('SELECT id, nid_number, tin_number, passport_number FROM citizens WHERE user_id = ?', [userId]);

        // Default empty structure if no citizen record
        if (citizen.length === 0) {
            return res.json({
                nid: null,
                passport: null,
                tax: null,
                land: []
            });
        }

        const citizenId = citizen[0].id;

        // 2. Fetch specific records
        // We use LEFT JOIN logic or separate queries. Separate is safer for now.
        const [nid] = await db.query('SELECT * FROM nid_cards WHERE citizen_id = ? OR nid_number = ?', [citizenId, citizen[0].nid_number]);

        // Passport_books might not have citizen_id directly, relying on passport_number from citizen record
        const [passport] = await db.query('SELECT * FROM passport_books WHERE passport_number = ?', [citizen[0].passport_number]);

        const [tax] = await db.query('SELECT * FROM tax_payers WHERE citizen_id = ? OR tin_number = ?', [citizenId, citizen[0].tin_number]);
        const [land] = await db.query('SELECT * FROM land_records WHERE citizen_id = ?', [citizenId]);

        res.json({
            nid: nid[0] || null,
            passport: passport[0] || null,
            tax: tax[0] || null,
            land: land || []
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch documents' });
    }
};

// History: Fetch Service Requests
exports.getHistory = async (req, res) => {
    try {
        const [requests] = await db.query('SELECT * FROM service_requests WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
        res.json(requests);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch history' });
    }
};
