const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verifyToken = require('../middleware/authMiddleware');

router.use(verifyToken);

// =======================
// AGRICULTURE
// =======================

// Apply for Subsidy
router.post('/agriculture/susbidy', async (req, res) => {
    const { type, amount, landSize } = req.body;
    try {
        await db.query(
            'INSERT INTO agri_subsidies (user_id, subsidy_type, amount_requested, land_size_acres) VALUES (?, ?, ?, ?)',
            [req.user.id, type, amount, landSize]
        );
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Submit Crop Report
router.post('/agriculture/report', async (req, res) => {
    const { crop, yield: yieldAmount, season } = req.body;
    try {
        await db.query(
            'INSERT INTO agri_crop_reports (user_id, crop_name, yield_metric_ton, season) VALUES (?, ?, ?, ?)',
            [req.user.id, crop, yieldAmount, season]
        );
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get Applications (Unified for demo)
router.get('/agriculture/applications', async (req, res) => {
    try {
        const [subsidies] = await db.query('SELECT id, subsidy_type as type, status, created_at FROM agri_subsidies WHERE user_id = ? ORDER BY created_at DESC LIMIT 5', [req.user.id]);
        const [reports] = await db.query('SELECT id, crop_name, "Reported" as status, created_at FROM agri_crop_reports WHERE user_id = ? ORDER BY created_at DESC LIMIT 5', [req.user.id]);

        // Merge and sort
        const combined = [...subsidies, ...reports].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        res.json(combined);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

// =======================
// LAND MINISTRY (Advanced)
// =======================

// 1. Locations
router.get('/locations/divisions', async (req, res) => {
    try {
        const [divs] = await db.query('SELECT * FROM divisions ORDER BY name');
        res.json(divs);
    } catch (e) { res.status(500).json({ error: 'DB Error' }); }
});

router.get('/locations/districts/:divId', async (req, res) => {
    try {
        const [dists] = await db.query('SELECT * FROM districts WHERE division_id = ? ORDER BY name', [req.params.divId]);
        res.json(dists);
    } catch (e) { res.status(500).json({ error: 'DB Error' }); }
});

router.get('/locations/upazilas/:distId', async (req, res) => {
    try {
        const [upas] = await db.query('SELECT * FROM upazilas WHERE district_id = ? ORDER BY name', [req.params.distId]);
        res.json(upas);
    } catch (e) { res.status(500).json({ error: 'DB Error' }); }
});

// 2. Submit Mutation (Advanced)
router.post('/land/mutation_v2', async (req, res) => {
    const {
        divId, distId, upaId,
        appName, appFather, appMother, appNid,
        khatian, dag, amount, price, deed, ownType,
        buyerName, buyerNid
    } = req.body;

    try {
        // Validation: Check if Applicant NID exists in reg_info
        const [appCheck] = await db.query('SELECT id FROM reg_info WHERE nid = ?', [appNid]);
        if (appCheck.length === 0) {
            return res.status(400).json({ error: 'Applicant NID not found in system registration.' });
        }

        // Validation: Check if Buyer NID exists in reg_info
        const [buyerCheck] = await db.query('SELECT id FROM reg_info WHERE nid = ?', [buyerNid]);
        if (buyerCheck.length === 0) {
            return res.status(400).json({ error: 'Buyer NID not found in system registration.' });
        }

        // Generate Random Tracking Number (e.g., LMT-2026-XXXX)
        const trackingNum = `LMT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

        await db.query(`
            INSERT INTO land_mutations_v2 
            (user_id, division_id, district_id, upazila_id, applicant_name, applicant_father, applicant_mother, applicant_nid, khatian_no, dag_no, land_amount, land_price, deed_no, ownership_type, buyer_name, buyer_nid, tracking_number)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            req.user.id, divId, distId, upaId,
            appName, appFather, appMother, appNid,
            khatian, dag, amount, price, deed, ownType,
            buyerName, buyerNid, trackingNum
        ]);

        // Also log to notifications
        await db.query('INSERT INTO notifications (user_id, message) VALUES (?, ?)',
            [req.user.id, `Mutation application submitted. Tracking #: ${trackingNum}`]);

        res.json({ success: true, trackingNumber: trackingNum });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error processing application.' });
    }
});

// 3. Check Application Status (Public/Protected)
router.get('/land/mutation/status/:trackingNum', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM land_mutations_v2 WHERE tracking_number = ?',
            [req.params.trackingNum]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Application not found.' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error.' });
    }
});

// =======================
// LAND MINISTRY (Basic/Legacy)
// =======================

// Search Land Record
router.get('/land/search', async (req, res) => {
    const { khatian } = req.query;
    try {
        const [record] = await db.query('SELECT * FROM land_records WHERE khatian_no = ?', [khatian]);
        res.json(record[0] || null);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Apply Mutation
router.post('/land/mutation', async (req, res) => {
    const { khatian, deed, reason } = req.body;
    try {
        await db.query(
            'INSERT INTO land_mutations (user_id, khatian_no, deed_no, reason) VALUES (?, ?, ?, ?)',
            [req.user.id, khatian, deed, reason]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Get Applications
router.get('/land/applications', async (req, res) => {
    try {
        const [apps] = await db.query('SELECT id, khatian_no, status, created_at FROM land_mutations WHERE user_id = ? ORDER BY created_at DESC LIMIT 5', [req.user.id]);
        res.json(apps);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// =======================
// NBR (TAX)
// =======================

router.get('/opt/tin', async (req, res) => {
    try {
        const [citizen] = await db.query('SELECT tin_number FROM citizens WHERE user_id = ?', [req.user.id]);
        if (citizen.length > 0) {
            res.json({ tin: citizen[0].tin_number });
        } else {
            res.json({ tin: null });
        }
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

router.post('/tax/return', async (req, res) => {
    const { year, income, tax } = req.body;
    try {
        await db.query(
            'INSERT INTO tax_returns (user_id, tax_year, income_amount, tax_paid) VALUES (?, ?, ?, ?)',
            [req.user.id, year, income, tax]
        );
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

router.get('/tax/history', async (req, res) => {
    try {
        const [returns] = await db.query('SELECT * FROM tax_returns WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
        res.json(returns);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// =======================
// PASSPORT OFFICE
// =======================

router.post('/passport/apply', async (req, res) => {
    const { action, type, validity, prevPassport } = req.body;
    let details = '';
    if (action === 'new') details = `Type: ${type}, Validity: ${validity}`;
    else details = `Renewal for: ${prevPassport}`;

    try {
        await db.query(
            'INSERT INTO passport_applications (user_id, application_type, passport_details) VALUES (?, ?, ?)',
            [req.user.id, action === 'new' ? 'New Application' : 'Renewal', details]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

router.get('/passport/applications', async (req, res) => {
    try {
        const [apps] = await db.query('SELECT id, application_type, status, created_at FROM passport_applications WHERE user_id = ? ORDER BY created_at DESC LIMIT 5', [req.user.id]);
        res.json(apps);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// =======================
// NID WING
// =======================

router.post('/nid/correction', async (req, res) => {
    const { field, correctValue, nid } = req.body;
    try {
        await db.query(
            'INSERT INTO nid_corrections (user_id, nid_number, field_name, corrected_value, request_type) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, nid, field, correctValue, 'Correction']
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

router.post('/nid/reissue', async (req, res) => {
    const { reason } = req.body;
    try {
        await db.query(
            'INSERT INTO nid_corrections (user_id, request_type, reason) VALUES (?, ?, ?)',
            [req.user.id, 'Re-issue', reason]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

router.get('/nid/applications', async (req, res) => {
    try {
        const [apps] = await db.query('SELECT id, request_type, status, created_at FROM nid_corrections WHERE user_id = ? ORDER BY created_at DESC LIMIT 5', [req.user.id]);
        res.json(apps);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// =======================
// HEALTH DEPT
// =======================

router.post('/health/vaccine', async (req, res) => {
    const { vaccine } = req.body;
    try {
        await db.query(
            'INSERT INTO health_vaccinations (user_id, vaccine_name) VALUES (?, ?)',
            [req.user.id, vaccine]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

router.get('/health/records', async (req, res) => {
    try {
        const [recs] = await db.query('SELECT * FROM health_vaccinations WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
        res.json(recs);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// =======================
// WATER RESOURCES
// =======================

router.post('/water/issue', async (req, res) => {
    const { issue } = req.body;
    try {
        await db.query(
            'INSERT INTO water_issues (user_id, description) VALUES (?, ?)',
            [req.user.id, issue]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

router.get('/water/issues', async (req, res) => {
    try {
        const [issues] = await db.query('SELECT * FROM water_issues WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
        res.json(issues);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// =======================
// EDUCATION MINISTRY
// =======================

router.post('/edu/admission', async (req, res) => {
    const { university } = req.body;
    try {
        await db.query(
            'INSERT INTO edu_admissions (user_id, unit_name) VALUES (?, ?)',
            [req.user.id, university]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

router.get('/edu/applications', async (req, res) => {
    try {
        const [apps] = await db.query('SELECT * FROM edu_admissions WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
        res.json(apps);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;
