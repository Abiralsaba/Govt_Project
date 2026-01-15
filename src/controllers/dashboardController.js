const db = require('../config/db');

// Get Dashboard Summary (Stats & User Info)
exports.getSummary = async (req, res) => {
    const userId = req.user.id; // From middleware
    try {
        const [user] = await db.query('SELECT name, nid, email FROM reg_info WHERE id = ?', [userId]);

        // Mocking some stats or fetching from real tables if data existed there
        // For now, we utilize the new service_requests table
        const [requests] = await db.query('SELECT count(*) as count FROM service_requests WHERE user_id = ?', [userId]);
        const [todos] = await db.query('SELECT count(*) as count FROM todos WHERE user_id = ? AND status = ?', [userId, 'done']);

        res.json({
            user: user[0],
            stats: {
                activeRequests: requests[0].count,
                completedTasks: todos[0].count,
                notifications: 3 // Mock
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server Error' });
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
exports.submitServiceRequest = async (req, res) => {
    const { serviceType, details } = req.body;
    try {
        await db.query('INSERT INTO service_requests (user_id, service_type, details) VALUES (?, ?, ?)',
            [req.user.id, serviceType, details]);
        res.json({ message: 'Request submitted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to submit request' });
    }
};

// Departments List (Static or DB)
exports.getDepartments = (req, res) => {
    // Returning a rich list of departments for the frontend grid
    const departments = [
        { id: 'agri', name: 'Agriculture', icon: 'fa-wheat', desc: 'Subsidies, Crop Reports' },
        { id: 'land', name: 'Land Ministry', icon: 'fa-landmark', desc: 'Mutations, Records' },
        { id: 'tax', name: 'NBR (Tax)', icon: 'fa-file-invoice-dollar', desc: 'Tax Returns, TIN' },
        { id: 'passport', name: 'Passport', icon: 'fa-passport', desc: 'Applications, Renewal' },
        { id: 'nid', name: 'NID Wing', icon: 'fa-id-card', desc: 'Corrections, Replacement' },
        { id: 'health', name: 'Health', icon: 'fa-heartbeat', desc: 'Vaccination, Hospitals' },
        { id: 'water', name: 'Water Resources', icon: 'fa-water', desc: 'Supply, Management' },
        { id: 'edu', name: 'Education', icon: 'fa-graduation-cap', desc: 'Results, Admissions' }
    ];
    res.json(departments);
};

// Documents: Fetch all linked documents
exports.getDocuments = async (req, res) => {
    const userId = req.user.id;
    try {
        // 1. Get Citizen ID
        const [citizen] = await db.query('SELECT id, nid_number, tin_number, passport_number FROM citizens WHERE user_id = ?', [userId]);

        if (citizen.length === 0) {
            return res.json({ message: 'No citizen profile found. Please complete profile.' });
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
