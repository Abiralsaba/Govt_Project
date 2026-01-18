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
        buyerName, buyerNid, buyerFather, buyerMother
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

        // --- SECURITY CHECK: VERIFY OWNERSHIP ---
        // Ensure Seller (req.user) has this land in their My Records and it is Approved
        const [ownershipCheck] = await db.query(
            "SELECT id FROM my_land_record WHERE user_id = ? AND khatian_no = ? AND dag_no = ? AND status = 'Approved'",
            [req.user.id, khatian, dag]
        );

        if (ownershipCheck.length === 0) {
            return res.status(403).json({ error: 'You can only sell Verified Land from your records. Please verified this land in "My Records" first.' });
        }
        // ----------------------------------------

        // Generate Random Tracking Number (e.g., LMT-2026-XXXX)
        const trackingNum = `LMT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

        await db.query(`
            INSERT INTO land_mutations_v2 
            (user_id, division_id, district_id, upazila_id, applicant_name, applicant_father, applicant_mother, applicant_nid, khatian_no, dag_no, land_amount, land_price, deed_no, ownership_type, buyer_name, buyer_nid, buyer_father_name, buyer_mother_name, tracking_number)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            req.user.id, divId, distId, upaId,
            appName, appFather, appMother, appNid,
            khatian, dag, amount, price, deed, ownType,
            buyerName, buyerNid, buyerFather, buyerMother, trackingNum
        ]);

        // Also log to notifications
        await db.query('INSERT INTO notifications (user_id, message) VALUES (?, ?)',
            [req.user.id, `Mutation application submitted. Tracking #: ${trackingNum}`]);

        // Log to service_requests for Admin Dashboard handling
        await db.query(`
            INSERT INTO service_requests (user_id, service_type, details, status, notification_read) 
            VALUES (?, ?, ?, ?, ?)
        `, [
            req.user.id,
            'Land Mutation',
            `ID: ${trackingNum} - Mutation for Khatian: ${khatian}, Dag: ${dag}`,
            'Pending',
            false
        ]);

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
        const [apps] = await db.query('SELECT id, khatian_no, status, created_at FROM land_mutations_v2 WHERE user_id = ? ORDER BY created_at DESC LIMIT 5', [req.user.id]);
        res.json(apps);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Get My Records
// Get My Records (Merged with Approved Mutations)
router.get('/land/records', async (req, res) => {
    try {
        // 1. Fetch manually added records
        const [manualRecords] = await db.query('SELECT * FROM my_land_record WHERE user_id = ? ORDER BY recorded_at DESC', [req.user.id]);

        // 2. Fetch approved mutations where user is the buyer
        // Mapping mutation fields to record fields for consistency
        const [mutationKeyRes] = await db.query('SELECT nid FROM reg_info WHERE id = ?', [req.user.id]);
        const userNid = mutationKeyRes[0]?.nid;

        let autoRecords = [];
        if (userNid) {
            const [mutations] = await db.query(
                `SELECT 
                    m.id, 
                    m.khatian_no, 
                    m.dag_no, 
                    'Mutation Transfer' as mouza, 
                    m.land_amount as land_size, 
                    m.land_price,
                    m.deed_no,
                    divs.name as division,
                    dists.name as district,
                    upas.name as upazila,
                    'Acquired via Mutation' as ownership_description, 
                    'Approved' as status,
                    m.created_at as recorded_at
                FROM land_mutations_v2 m
                LEFT JOIN divisions divs ON m.division_id = divs.id
                LEFT JOIN districts dists ON m.district_id = dists.id
                LEFT JOIN upazilas upas ON m.upazila_id = upas.id
                WHERE m.buyer_nid = ? AND m.status = 'Approved'`,
                [userNid]
            );
            autoRecords = mutations;
        }

        // 3. Merge lists (Filter duplicates: if Manual exists, ignore Auto)
        const manualKeys = new Set(manualRecords.map(r => `${r.khatian_no}-${r.dag_no}`));

        const uniqueAutoRecords = autoRecords.filter(r => !manualKeys.has(`${r.khatian_no}-${r.dag_no}`));

        const finalRecords = [
            ...manualRecords.map(r => ({ ...r, source: 'Manual' })),
            ...uniqueAutoRecords.map(r => ({ ...r, source: 'Auto', owner_name: 'Self' }))
        ];

        res.json(finalRecords);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error fetching records.' });
    }
});

// Add New Record (Verified)
// Add New Record (Verified)
router.post('/land/records', async (req, res) => {
    const {
        division_id, district_id, upazila_id, // IDs
        division, district, upazila, // Hidden Names
        owner_name, nid, father_name, mother_name,
        khatian, dag, mouza, land_size,
        deed_no, land_price,
        description
    } = req.body;

    console.log('Received POST /land/records payload:', req.body); // DEBUG

    try {
        // 1. Verify against official records (land_mutations_v2)
        const [officialRecords] = await db.query(
            'SELECT status FROM land_mutations_v2 WHERE khatian_no = ? AND buyer_nid = ?',
            [khatian, nid]
        );

        let verificationStatus = 'Pending'; // Default if not found

        if (officialRecords.length > 0) {
            const status = officialRecords[0].status;
            if (status === 'Approved') {
                verificationStatus = 'Approved';
            }
        }

        // 2. Insert into My Records (with normalized location IDs)
        await db.query(
            `INSERT INTO my_land_record 
            (user_id, division, district, upazila, division_id, district_id, upazila_id, owner_name, father_name, mother_name, nid, khatian_no, dag_no, mouza, land_size, deed_no, land_price, ownership_description, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.user.id, division, district, upazila, division_id, district_id, upazila_id, owner_name, father_name, mother_name, nid, khatian, dag, mouza, land_size, deed_no, land_price, description, verificationStatus]
        );

        res.json({ success: true, status: verificationStatus, message: verificationStatus === 'Approved' ? 'Verified & Approved' : 'Record added but verification pending.' });
    } catch (error) {
        console.error('SQL Error adding record:', error.sqlMessage || error);
        res.status(500).json({ error: 'Database error adding record: ' + (error.sqlMessage || error.message) });
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
