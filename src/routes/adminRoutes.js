/**
 * Admin Routes
 * API endpoints for admin dashboard operations
 * All routes require admin authentication
 */

const express = require('express');
const router = express.Router();
const db = require('../config/db');
const adminMiddleware = require('../middleware/adminMiddleware');

// Apply admin middleware to all routes
router.use(adminMiddleware);

// ==========================================
// USERS MANAGEMENT
// ==========================================

/**
 * GET /api/admin/users - Get all users list
 */
router.get('/users', async (req, res) => {
    try {
        const [users] = await db.query(`
            SELECT 
                id, name, email, nid, mobile, dob, gender, 
                photo_url, created_at
            FROM reg_info 
            ORDER BY created_at DESC
        `);
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

/**
 * GET /api/admin/new-users - Get users registered in last 7 days
 */
router.get('/new-users', async (req, res) => {
    try {
        const [users] = await db.query(`
            SELECT 
                id, name, email, nid, mobile, dob, gender, 
                photo_url, created_at 
            FROM reg_info 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            ORDER BY created_at DESC
        `);
        res.json(users);
    } catch (error) {
        console.error('Error fetching new users:', error);
        res.status(500).json({ error: 'Failed to fetch new users' });
    }
});

// ==========================================
// SERVICE REQUESTS MANAGEMENT
// ==========================================

/**
 * GET /api/admin/service-requests - Get all service requests
 */
router.get('/service-requests', async (req, res) => {
    try {
        const status = req.query.status; // Optional filter
        let query = `
            SELECT 
                sr.id, sr.service_type, sr.details, sr.status, sr.created_at,
                u.id as user_id, u.name as user_name, u.email as user_email
            FROM service_requests sr
            LEFT JOIN reg_info u ON sr.user_id = u.id
        `;
        const params = [];

        if (status) {
            query += ` WHERE sr.status = ?`;
            params.push(status);
        }

        query += ` ORDER BY sr.created_at DESC`;

        const [requests] = await db.query(query, params);
        res.json(requests);
    } catch (error) {
        console.error('Error fetching service requests:', error);
        res.status(500).json({ error: 'Failed to fetch service requests' });
    }
});

/**
 * PUT /api/admin/service-requests/:id/approve - Approve service request
 */
router.put('/service-requests/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;

        // Update status
        await db.query(
            `UPDATE service_requests SET status = 'approved' WHERE id = ?`,
            [id]
        );

        // Get request details for notification
        const [request] = await db.query(
            `SELECT user_id, service_type FROM service_requests WHERE id = ?`,
            [id]
        );

        if (request.length > 0) {
            // Add notification
            await db.query(
                `INSERT INTO notifications (user_id, type, message, is_read) VALUES (?, ?, ?, false)`,
                [request[0].user_id, 'Service Request', `Your ${request[0].service_type} request has been approved!`]
            );
        }

        // Log admin action
        console.log('Attempting to log admin action: APPROVE service_requests', id);
        try {
            const [logResult] = await db.query(
                `INSERT INTO admin_actions_log (admin_id, action_type, target_table, target_id, old_status, new_status) 
                 VALUES (?, 'APPROVE', 'service_requests', ?, 'pending', 'approved')`,
                [req.admin.id, id]
            );
            console.log('Admin action logged successfully:', logResult);
        } catch (logError) {
            console.error('Failed to log admin action:', logError);
        }

        // Manual Audit Log Insertion
        await db.query(
            `INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, changed_fields, user_id)
             VALUES (?, ?, 'UPDATE', ?, ?, 'status', ?)`,
            [
                'service_requests',
                id,
                JSON.stringify({ status: 'pending' }),
                JSON.stringify({ status: 'approved' }),
                req.admin.id
            ]
        );

        res.json({ success: true, message: 'Service request approved' });
    } catch (error) {
        console.error('Error approving service request:', error);
        res.status(500).json({ error: 'Failed to approve request' });
    }
});

/**
 * PUT /api/admin/service-requests/:id/reject - Reject service request
 */
router.put('/service-requests/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        await db.query(
            `UPDATE service_requests SET status = 'rejected' WHERE id = ?`,
            [id]
        );

        // Get request details for notification
        const [request] = await db.query(
            `SELECT user_id, service_type FROM service_requests WHERE id = ?`,
            [id]
        );

        if (request.length > 0) {
            const message = reason
                ? `Your ${request[0].service_type} request was rejected. Reason: ${reason}`
                : `Your ${request[0].service_type} request was rejected.`;

            await db.query(
                `INSERT INTO notifications (user_id, type, message, is_read) VALUES (?, ?, ?, false)`,
                [request[0].user_id, 'Service Request', message]
            );
        }

        // Log admin action
        await db.query(
            `INSERT INTO admin_actions_log (admin_id, action_type, target_table, target_id, old_status, new_status, notes) 
             VALUES (?, 'REJECT', 'service_requests', ?, 'pending', 'rejected', ?)`,
            [req.admin.id, id, reason || null]
        );

        // Manual Audit Log Insertion
        await db.query(
            `INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, changed_fields, user_id)
             VALUES (?, ?, 'UPDATE', ?, ?, 'status', ?)`,
            [
                'service_requests',
                id,
                JSON.stringify({ status: 'pending' }),
                JSON.stringify({ status: 'rejected', reason: reason }),
                req.admin.id
            ]
        );

        res.json({ success: true, message: 'Service request rejected' });
    } catch (error) {
        console.error('Error rejecting service request:', error);
        res.status(500).json({ error: 'Failed to reject request' });
    }
});

// ==========================================
// LAND MUTATIONS MANAGEMENT
// ==========================================

/**
 * GET /api/admin/land-mutations - Get all land mutations
 */
router.get('/land-mutations', async (req, res) => {
    try {
        const status = req.query.status;
        let query = `
            SELECT 
                m.*,
                d.name as division_name,
                dist.name as district_name,
                u.name as upazila_name,
                owner.name as owner_name
            FROM land_mutations_v2 m
            LEFT JOIN divisions d ON m.division_id = d.id
            LEFT JOIN districts dist ON m.district_id = dist.id
            LEFT JOIN upazilas u ON m.upazila_id = u.id
            LEFT JOIN reg_info owner ON m.user_id = owner.id
        `;
        const params = [];

        if (status) {
            query += ` WHERE m.status = ?`;
            params.push(status);
        }

        query += ` ORDER BY m.created_at DESC`;

        const [mutations] = await db.query(query, params);
        res.json(mutations);
    } catch (error) {
        console.error('Error fetching land mutations:', error);
        res.status(500).json({ error: 'Failed to fetch land mutations' });
    }
});

/**
 * PUT /api/admin/land-mutations/:id/approve - Approve land mutation
 * This includes transferring land ownership
 */
router.put('/land-mutations/:id/approve', async (req, res) => {
    const connection = await db.getConnection();
    console.log(`[Admin] Starting approval for mutation ID: ${req.params.id}`);

    try {
        await connection.beginTransaction();

        const { id } = req.params;

        // Get mutation details
        const [mutations] = await connection.query(
            `SELECT * FROM land_mutations_v2 WHERE id = ?`,
            [id]
        );

        if (mutations.length === 0) {
            console.log(`[Admin] Mutation ${id} not found`);
            await connection.rollback();
            return res.status(404).json({ error: 'Mutation not found' });
        }

        const mutation = mutations[0];
        console.log('[Admin] Mutation details:', mutation);

        // Update mutation status
        await connection.query(
            `UPDATE land_mutations_v2 SET status = 'Approved' WHERE id = ?`,
            [id]
        );
        console.log('[Admin] Status updated to Approved');

        // Delete land from seller's my_land_record
        const [deleteResult] = await connection.query(
            `DELETE FROM my_land_record 
             WHERE user_id = ? AND khatian_no = ? AND dag_no = ?`,
            [mutation.user_id, mutation.khatian_no, mutation.dag_no]
        );
        console.log('[Admin] Deleted from seller record:', deleteResult.affectedRows);

        // Add land to buyer's my_land_record
        const [buyerUser] = await connection.query(
            `SELECT id FROM reg_info WHERE nid = ?`,
            [mutation.buyer_nid]
        );

        if (buyerUser.length > 0) {
            await connection.query(
                `INSERT INTO my_land_record 
                 (user_id, division_id, district_id, upazila_id, division, district, upazila,
                  owner_name, nid, father_name, mother_name, khatian_no, dag_no, mouza, 
                  land_size, deed_no, land_price, ownership_description, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Approved')`,
                [
                    buyerUser[0].id,
                    mutation.division_id, mutation.district_id, mutation.upazila_id,
                    mutation.division_name || '', mutation.district_name || '', mutation.upazila_name || '',
                    mutation.buyer_name, mutation.buyer_nid,
                    mutation.buyer_father_name || '', mutation.buyer_mother_name || '',
                    mutation.khatian_no, mutation.dag_no, 'Transferred via Mutation',
                    parseFloat(mutation.land_amount) || 0, mutation.deed_no, mutation.land_price,
                    `Transferred from ${mutation.applicant_name}`
                ]
            );
            console.log('[Admin] Added to buyer record');
        } else {
            console.warn(`[Admin] Buyer with NID ${mutation.buyer_nid} not found in reg_info. Land record not added to buyer.`);
        }

        // Send notification to original user
        await connection.query(
            `INSERT INTO notifications (user_id, type, message, is_read) 
             VALUES (?, 'Land Mutation', 'Your land mutation request has been approved!', false)`,
            [mutation.user_id]
        );

        // Manual Audit Log Insertion (Replaces Trigger)
        await connection.query(
            `INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, changed_fields, user_id)
             VALUES (?, ?, 'UPDATE', ?, ?, 'status', ?)`,
            [
                'land_mutations_v2',
                id,
                JSON.stringify({ status: mutation.status }),
                JSON.stringify({ status: 'Approved' }),
                req.admin.id
            ]
        );

        // Update service request if linked
        await connection.query(
            `UPDATE service_requests SET status = 'approved'
             WHERE user_id = ? AND service_type = 'Land Mutation' AND status = 'pending'`,
            [mutation.user_id]
        );

        // Log admin action
        await connection.query(
            `INSERT INTO admin_actions_log (admin_id, action_type, target_table, target_id, old_status, new_status) 
             VALUES (?, 'APPROVE', 'land_mutations_v2', ?, 'Pending', 'Approved')`,
            [req.admin.id, id]
        );
        console.log('[Admin] Action logged');

        await connection.commit();
        console.log('[Admin] Transaction committed successfully');
        res.json({ success: true, message: 'Land mutation approved and ownership transferred' });
    } catch (error) {
        await connection.rollback();
        console.error('Error approving land mutation:', error);
        // Return the exact SQL error message to the frontend for debugging
        res.status(500).json({
            error: error.sqlMessage || error.message || 'Failed to approve mutation',
            details: error.code // e.g., ER_BAD_FIELD_ERROR
        });
    } finally {
        connection.release();
    }
});

/**
 * PUT /api/admin/land-mutations/:id/reject - Reject land mutation
 */
router.put('/land-mutations/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        // Get mutation details for notification
        const [mutation] = await db.query(
            `SELECT user_id, tracking_number FROM land_mutations_v2 WHERE id = ?`,
            [id]
        );

        await db.query(
            `UPDATE land_mutations_v2 SET status = 'Rejected' WHERE id = ?`,
            [id]
        );

        if (mutation.length > 0) {
            const message = reason
                ? `Your land mutation (${mutation[0].tracking_number}) was rejected. Reason: ${reason}`
                : `Your land mutation (${mutation[0].tracking_number}) was rejected.`;

            await db.query(
                `INSERT INTO notifications (user_id, type, message, is_read) VALUES (?, ?, ?, false)`,
                [mutation[0].user_id, 'Land Mutation', message]
            );
        }

        // Log admin action (Legacy/Backup)
        await db.query(
            `INSERT INTO admin_actions_log (admin_id, action_type, target_table, target_id, old_status, new_status, notes) 
             VALUES (?, 'REJECT', 'land_mutations_v2', ?, 'Pending', 'Rejected', ?)`,
            [req.admin.id, id, reason || null]
        );

        // Manual Audit Log Insertion (For Dashboard)
        await db.query(
            `INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, changed_fields, user_id)
             VALUES (?, ?, 'UPDATE', ?, ?, 'status', ?)`,
            [
                'land_mutations_v2',
                id,
                JSON.stringify({ status: 'Pending' }),
                JSON.stringify({ status: 'Rejected', reason: reason }),
                'status',
                req.admin.id
            ]
        );

        res.json({ success: true, message: 'Land mutation rejected' });
    } catch (error) {
        console.error('Error rejecting land mutation:', error);
        res.status(500).json({ error: 'Failed to reject mutation' });
    }
});

// ==========================================
// COMMUNITY GROUPS MANAGEMENT
// ==========================================

/**
 * GET /api/admin/community-groups - Get all community groups
 */
router.get('/community-groups', async (req, res) => {
    try {
        const status = req.query.status;
        let query = `
            SELECT 
                g.*,
                u.name as creator_name,
                u.email as creator_email,
                (SELECT COUNT(*) FROM community_members WHERE group_id = g.id) as member_count,
                (SELECT COUNT(*) FROM community_posts WHERE group_id = g.id) as post_count
            FROM community_groups g
            LEFT JOIN reg_info u ON g.created_by = u.id
        `;
        const params = [];

        if (status) {
            query += ` WHERE g.status = ?`;
            params.push(status);
        }

        query += ` ORDER BY g.created_at DESC`;

        const [groups] = await db.query(query, params);
        res.json(groups);
    } catch (error) {
        console.error('Error fetching community groups:', error);
        res.status(500).json({ error: 'Failed to fetch groups' });
    }
});

/**
 * PUT /api/admin/community-groups/:id/approve - Approve community group
 */
router.put('/community-groups/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;

        await db.query(
            `UPDATE community_groups SET status = 'approved' WHERE id = ?`,
            [id]
        );

        // Get group details for notification
        const [group] = await db.query(
            `SELECT created_by, name FROM community_groups WHERE id = ?`,
            [id]
        );

        if (group.length > 0) {
            await db.query(
                `INSERT INTO notifications (user_id, type, message, is_read) VALUES (?, ?, ?, false)`,
                [group[0].created_by, 'Community', `Your group "${group[0].name}" has been approved!`]
            );
        }

        // Log admin action
        await db.query(
            `INSERT INTO admin_actions_log (admin_id, action_type, target_table, target_id, old_status, new_status) 
             VALUES (?, 'APPROVE', 'community_groups', ?, 'pending', 'approved')`,
            [req.admin.id, id]
        );

        res.json({ success: true, message: 'Community group approved' });
    } catch (error) {
        console.error('Error approving community group:', error);
        res.status(500).json({ error: 'Failed to approve group' });
    }
});

/**
 * PUT /api/admin/community-groups/:id/reject - Reject community group
 */
router.put('/community-groups/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        await db.query(
            `UPDATE community_groups SET status = 'rejected' WHERE id = ?`,
            [id]
        );

        // Get group details for notification
        const [group] = await db.query(
            `SELECT created_by, name FROM community_groups WHERE id = ?`,
            [id]
        );

        if (group.length > 0) {
            const message = reason
                ? `Your group "${group[0].name}" was rejected. Reason: ${reason}`
                : `Your group "${group[0].name}" was rejected.`;

            await db.query(
                `INSERT INTO notifications (user_id, type, message, is_read) VALUES (?, ?, ?, false)`,
                [group[0].created_by, 'Community', message]
            );
        }

        // Log admin action
        await db.query(
            `INSERT INTO admin_actions_log (admin_id, action_type, target_table, target_id, old_status, new_status, notes) 
             VALUES (?, 'REJECT', 'community_groups', ?, 'pending', 'rejected', ?)`,
            [req.admin.id, id, reason || null]
        );

        res.json({ success: true, message: 'Community group rejected' });
    } catch (error) {
        console.error('Error rejecting community group:', error);
        res.status(500).json({ error: 'Failed to reject group' });
    }
});

// ==========================================
// COMMUNITY POSTS MANAGEMENT
// ==========================================

/**
 * GET /api/admin/community-posts - Get all community posts
 */
router.get('/community-posts', async (req, res) => {
    try {
        const status = req.query.status;
        let query = `
            SELECT 
                p.*,
                u.name as author_name,
                u.email as author_email,
                g.name as group_name,
                (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
                (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comment_count
            FROM community_posts p
            LEFT JOIN reg_info u ON p.user_id = u.id
            LEFT JOIN community_groups g ON p.group_id = g.id
        `;
        const params = [];

        if (status) {
            query += ` WHERE p.status = ?`;
            params.push(status);
        }

        query += ` ORDER BY p.created_at DESC`;

        const [posts] = await db.query(query, params);
        res.json(posts);
    } catch (error) {
        console.error('Error fetching community posts:', error);
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
});

/**
 * PUT /api/admin/community-posts/:id/approve - Approve community post
 */
router.put('/community-posts/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;

        await db.query(
            `UPDATE community_posts SET status = 'approved' WHERE id = ?`,
            [id]
        );

        // Get post details for notification
        const [post] = await db.query(
            `SELECT p.user_id, g.name as group_name 
             FROM community_posts p 
             LEFT JOIN community_groups g ON p.group_id = g.id 
             WHERE p.id = ?`,
            [id]
        );

        if (post.length > 0) {
            await db.query(
                `INSERT INTO notifications (user_id, type, message, is_read) VALUES (?, ?, ?, false)`,
                [post[0].user_id, 'Community', `Your post in "${post[0].group_name}" has been approved!`]
            );
        }

        // Log admin action
        await db.query(
            `INSERT INTO admin_actions_log (admin_id, action_type, target_table, target_id, old_status, new_status) 
             VALUES (?, 'APPROVE', 'community_posts', ?, 'pending', 'approved')`,
            [req.admin.id, id]
        );

        res.json({ success: true, message: 'Post approved' });
    } catch (error) {
        console.error('Error approving post:', error);
        res.status(500).json({ error: 'Failed to approve post' });
    }
});

/**
 * PUT /api/admin/community-posts/:id/reject - Reject community post
 */
router.put('/community-posts/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        await db.query(
            `UPDATE community_posts SET status = 'rejected' WHERE id = ?`,
            [id]
        );

        // Get post details for notification
        const [post] = await db.query(
            `SELECT p.user_id, g.name as group_name 
             FROM community_posts p 
             LEFT JOIN community_groups g ON p.group_id = g.id 
             WHERE p.id = ?`,
            [id]
        );

        if (post.length > 0) {
            const message = reason
                ? `Your post in "${post[0].group_name}" was rejected. Reason: ${reason}`
                : `Your post in "${post[0].group_name}" was rejected.`;

            await db.query(
                `INSERT INTO notifications (user_id, type, message, is_read) VALUES (?, ?, ?, false)`,
                [post[0].user_id, 'Community', message]
            );
        }

        // Log admin action
        await db.query(
            `INSERT INTO admin_actions_log (admin_id, action_type, target_table, target_id, old_status, new_status, notes) 
             VALUES (?, 'REJECT', 'community_posts', ?, 'pending', 'rejected', ?)`,
            [req.admin.id, id, reason || null]
        );

        res.json({ success: true, message: 'Post rejected' });
    } catch (error) {
        console.error('Error rejecting post:', error);
        res.status(500).json({ error: 'Failed to reject post' });
    }
});

// ==========================================
// SHOP MANAGEMENT
// ==========================================

const multer = require('multer');
const path = require('path');

// Configure multer for product images
const productStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../public/uploads/products'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const productUpload = multer({
    storage: productStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed'));
    }
});

/**
 * GET /api/admin/shop-items - Get all shop items
 */
router.get('/shop-items', async (req, res) => {
    try {
        const [items] = await db.query('SELECT * FROM shop_items ORDER BY created_at DESC');
        res.json(items);
    } catch (error) {
        console.error('Error fetching shop items:', error);
        res.status(500).json({ error: 'Failed to fetch shop items' });
    }
});

/**
 * POST /api/admin/shop-items - Add new shop item
 */
router.post('/shop-items', productUpload.single('image'), async (req, res) => {
    try {
        const { name, description, price, stock_quantity } = req.body;

        let image_url = '<i class="fas fa-box"></i>'; // Default icon
        if (req.file) {
            image_url = `/uploads/products/${req.file.filename}`;
        }

        const [result] = await db.query(
            `INSERT INTO shop_items (name, description, price, image_url, stock_quantity) 
             VALUES (?, ?, ?, ?, ?)`,
            [name, description, price, image_url, stock_quantity || 100]
        );

        res.json({
            success: true,
            message: 'Product added successfully',
            item: { id: result.insertId, name, description, price, image_url }
        });
    } catch (error) {
        console.error('Error adding shop item:', error);
        res.status(500).json({ error: 'Failed to add product' });
    }
});

/**
 * PUT /api/admin/shop-items/:id - Update shop item
 */
router.put('/shop-items/:id', productUpload.single('image'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, stock_quantity } = req.body;

        let updateQuery = `UPDATE shop_items SET name=?, description=?, price=?, stock_quantity=?`;
        let queryParams = [name, description, price, stock_quantity];

        if (req.file) {
            updateQuery += `, image_url=?`;
            queryParams.push(`/uploads/products/${req.file.filename}`);
        }

        updateQuery += ` WHERE id=?`;
        queryParams.push(id);

        await db.query(updateQuery, queryParams);

        res.json({
            success: true,
            message: 'Product updated successfully'
        });
    } catch (error) {
        console.error('Error updating shop item:', error);
        res.status(500).json({ error: 'Failed to update product' });
    }
});



/**
 * DELETE /api/admin/shop-items/:id - Delete shop item
 */
router.delete('/shop-items/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM shop_items WHERE id = ?', [id]);
        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error deleting shop item:', error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

/**
 * GET /api/admin/orders - Get all orders
 * (Existing Code)
 */

// ==========================================
// STIPEND MANAGEMENT
// ==========================================

/**
 * GET /api/admin/stipends - Get all stipends
 */
router.get('/stipends', async (req, res) => {
    try {
        const [stipends] = await db.query('SELECT * FROM available_stipends ORDER BY created_at DESC');
        res.json(stipends);
    } catch (error) {
        console.error('Error fetching stipends:', error);
        res.status(500).json({ error: 'Failed to fetch stipends' });
    }
});

/**
 * POST /api/admin/stipends - Add new stipend
 */
router.post('/stipends', async (req, res) => {
    try {
        const { title, description, amount, type, min_gpa, max_income, deadline, is_active } = req.body;

        await db.query(
            `INSERT INTO available_stipends (title, description, amount, type, min_gpa, max_income, deadline, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, description, amount, type, min_gpa || 0, max_income, deadline, is_active ? 1 : 0]
        );

        res.json({ success: true, message: 'Stipend added successfully' });
    } catch (error) {
        console.error('Error adding stipend:', error);
        res.status(500).json({ error: 'Failed to add stipend' });
    }
});

/**
 * GET /api/admin/stipend-applications - Get all applications
 */
router.get('/stipend-applications', async (req, res) => {
    try {
        const [apps] = await db.query(`
            SELECT 
                sa.*,
                s.title AS stipend_title,
                u.name AS student_name,
                u.nid AS student_nid
            FROM stipends_applications sa
            JOIN available_stipends s ON sa.stipend_id = s.id
            JOIN reg_info u ON sa.user_id = u.id
            ORDER BY sa.submitted_at DESC
        `);
        res.json(apps);
    } catch (error) {
        console.error('Error fetching stipend applications:', error);
        res.status(500).json({ error: 'Failed to fetch applications' });
    }
});

/**
 * PUT /api/admin/stipend-applications/:id/status - Update status
 */
router.put('/stipend-applications/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, remarks } = req.body; // Approved / Rejected

        await db.query(
            'UPDATE stipends_applications SET status = ? WHERE id = ?',
            [status, id]
        );

        res.json({ success: true, message: `Application ${status}` });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
});


router.get('/orders', async (req, res) => {
    try {
        const [orders] = await db.query(`
            SELECT 
                o.*,
                u.name as customer_name,
                u.email as customer_email
            FROM Ordered_item o
            LEFT JOIN reg_info u ON o.user_id = u.id
            ORDER BY o.created_at DESC
        `);
        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

/**
 * PUT /api/admin/orders/:id/status - Update order status
 */
router.put('/orders/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'DELIVERED', 'CANCELED', 'PENDING'

        await db.query(
            'UPDATE Ordered_item SET payment_status = ? WHERE id = ?',
            [status, id]
        );

        res.json({ success: true, message: 'Order status updated' });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ error: 'Failed to update order status' });
    }
});

// ==========================================
// MARKET PRICE MANAGEMENT
// ==========================================

/**
 * GET /api/admin/market-prices - Get all market prices
 */
router.get('/market-prices', async (req, res) => {
    try {
        const [prices] = await db.query('SELECT * FROM market_prices ORDER BY category, item_name');
        res.json(prices);
    } catch (error) {
        console.error('Error fetching market prices:', error);
        res.status(500).json({ error: 'Failed to fetch market prices' });
    }
});

/**
 * POST /api/admin/market-prices - Add new market price item
 */
router.post('/market-prices', async (req, res) => {
    try {
        const { item_name, item_name_bn, category, unit, price } = req.body;

        if (!item_name || !price || !unit) {
            return res.status(400).json({ error: 'Item name, price, and unit are required' });
        }

        const [result] = await db.query(
            `INSERT INTO market_prices (item_name, item_name_bn, category, unit, price, updated_by)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [item_name, item_name_bn || null, category || 'Other', unit, price, req.admin.id]
        );

        res.json({ success: true, message: 'Market price added', id: result.insertId });
    } catch (error) {
        console.error('Error adding market price:', error);
        res.status(500).json({ error: 'Failed to add market price' });
    }
});

/**
 * PUT /api/admin/market-prices/:id - Update market price
 */
router.put('/market-prices/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { item_name, item_name_bn, category, unit, price } = req.body;

        await db.query(
            `UPDATE market_prices SET item_name=?, item_name_bn=?, category=?, unit=?, price=?, updated_by=?, effective_date=CURDATE()
             WHERE id=?`,
            [item_name, item_name_bn || null, category, unit, price, req.admin.id, id]
        );

        res.json({ success: true, message: 'Market price updated' });
    } catch (error) {
        console.error('Error updating market price:', error);
        res.status(500).json({ error: 'Failed to update market price' });
    }
});

/**
 * DELETE /api/admin/market-prices/:id - Delete market price item
 */
router.delete('/market-prices/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM market_prices WHERE id = ?', [id]);
        res.json({ success: true, message: 'Market price deleted' });
    } catch (error) {
        console.error('Error deleting market price:', error);
        res.status(500).json({ error: 'Failed to delete market price' });
    }
});

// ==========================================
// PRICE COMPLAINTS MANAGEMENT
// ==========================================

/**
 * GET /api/admin/complaints - Get all price complaints
 */
router.get('/complaints', async (req, res) => {
    try {
        const status = req.query.status;
        let query = `
            SELECT c.*, u.name as reporter_name, u.email as reporter_email
            FROM price_complaints c
            LEFT JOIN reg_info u ON c.user_id = u.id
        `;
        const params = [];

        if (status) {
            query += ' WHERE c.status = ?';
            params.push(status);
        }

        query += ' ORDER BY c.created_at DESC';
        const [complaints] = await db.query(query, params);
        res.json(complaints);
    } catch (error) {
        console.error('Error fetching complaints:', error);
        res.status(500).json({ error: 'Failed to fetch complaints' });
    }
});

/**
 * PUT /api/admin/complaints/:id - Update complaint status
 */
router.put('/complaints/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, admin_notes } = req.body;

        await db.query(
            'UPDATE price_complaints SET status = ?, admin_notes = ? WHERE id = ?',
            [status, admin_notes || null, id]
        );

        // Notify the user
        const [complaint] = await db.query('SELECT user_id, shop_name FROM price_complaints WHERE id = ?', [id]);
        if (complaint.length > 0) {
            const statusMsg = status === 'resolved' ? 'resolved' : status === 'investigating' ? 'being investigated' : 'dismissed';
            await db.query(
                `INSERT INTO notifications (user_id, type, message, is_read) VALUES (?, ?, ?, false)`,
                [complaint[0].user_id, 'Market', `Your complaint against "${complaint[0].shop_name}" is now ${statusMsg}.`]
            );
        }

        res.json({ success: true, message: 'Complaint updated' });
    } catch (error) {
        console.error('Error updating complaint:', error);
        res.status(500).json({ error: 'Failed to update complaint' });
    }
});

// ==========================================
// EDUCATION RESULTS MANAGEMENT
// ==========================================

/**
 * GET /api/admin/education/boards - Get all education boards
 */
router.get('/education/boards', async (req, res) => {
    try {
        const [boards] = await db.query('SELECT * FROM education_boards ORDER BY name');
        res.json(boards);
    } catch (error) {
        console.error('Error fetching boards:', error);
        res.status(500).json({ error: 'Failed to fetch boards' });
    }
});

/**
 * GET /api/admin/education/institutions/:boardId - Get institutions by board
 */
router.get('/education/institutions/:boardId', async (req, res) => {
    try {
        const { boardId } = req.params;
        const [institutions] = await db.query(
            'SELECT * FROM education_institutions WHERE board_id = ? ORDER BY name',
            [boardId]
        );
        res.json(institutions);
    } catch (error) {
        console.error('Error fetching institutions:', error);
        res.status(500).json({ error: 'Failed to fetch institutions' });
    }
});

/**
 * GET /api/admin/education/results/:examType - Get all results for an exam type
 * examType: jsc, ssc, hsc
 */
router.get('/education/results/:examType', async (req, res) => {
    try {
        const { examType } = req.params;
        const { year, search } = req.query;

        const validExamTypes = ['jsc', 'ssc', 'hsc'];
        if (!validExamTypes.includes(examType.toLowerCase())) {
            return res.status(400).json({ error: 'Invalid exam type' });
        }

        const tableName = `${examType.toLowerCase()}_results`;

        let query = `
            SELECT r.*, b.name as board_name
            FROM ${tableName} r
            LEFT JOIN education_boards b ON r.board_id = b.id
            WHERE 1=1
        `;
        const params = [];

        if (year) {
            query += ` AND r.exam_year = ?`;
            params.push(year);
        }

        if (search) {
            query += ` AND (r.roll_number LIKE ? OR r.student_name LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ` ORDER BY r.created_at DESC`;

        const [results] = await db.query(query, params);
        res.json(results);
    } catch (error) {
        console.error('Error fetching education results:', error);
        res.status(500).json({ error: 'Failed to fetch results' });
    }
});

/**
 * POST /api/admin/education/results/:examType - Add new result
 */
router.post('/education/results/:examType', async (req, res) => {
    try {
        const { examType } = req.params;
        const data = req.body;

        const validExamTypes = ['jsc', 'ssc', 'hsc'];
        if (!validExamTypes.includes(examType.toLowerCase())) {
            return res.status(400).json({ error: 'Invalid exam type' });
        }

        const tableName = `${examType.toLowerCase()}_results`;

        // Build dynamic insert based on exam type
        let columns = ['roll_number', 'registration_number', 'exam_year', 'student_name',
            'father_name', 'mother_name', 'date_of_birth', 'institution_name',
            'board_id', 'gpa', 'result_status'];

        if (examType.toLowerCase() === 'jsc') {
            columns.push('bangla', 'english', 'mathematics', 'general_science',
                'bangladesh_global_studies', 'religion', 'ict');
        } else if (examType.toLowerCase() === 'ssc') {
            columns.push('exam_group', 'bangla_1st', 'bangla_2nd', 'english_1st', 'english_2nd',
                'mathematics', 'physics', 'chemistry', 'biology', 'higher_math',
                'bangladesh_global_studies', 'religion', 'ict');
        } else if (examType.toLowerCase() === 'hsc') {
            columns.push('exam_group', 'bangla_1st', 'bangla_2nd', 'english_1st', 'english_2nd',
                'physics_1st', 'physics_2nd', 'chemistry_1st', 'chemistry_2nd',
                'biology_1st', 'biology_2nd', 'higher_math_1st', 'higher_math_2nd',
                'ict', 'optional_subject_name', 'optional_subject_grade');
        }

        const values = columns.map(col => data[col] || null);
        const placeholders = columns.map(() => '?').join(', ');

        const [result] = await db.query(
            `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`,
            values
        );

        res.json({
            success: true,
            message: 'Result added successfully',
            id: result.insertId
        });
    } catch (error) {
        console.error('Error adding result:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Result already exists for this roll number and year' });
        }
        res.status(500).json({ error: 'Failed to add result' });
    }
});

/**
 * PUT /api/admin/education/results/:examType/:id - Update result
 */
router.put('/education/results/:examType/:id', async (req, res) => {
    try {
        const { examType, id } = req.params;
        const data = req.body;

        const validExamTypes = ['jsc', 'ssc', 'hsc'];
        if (!validExamTypes.includes(examType.toLowerCase())) {
            return res.status(400).json({ error: 'Invalid exam type' });
        }

        const tableName = `${examType.toLowerCase()}_results`;

        // Build dynamic update
        const updateFields = [];
        const values = [];

        for (const [key, value] of Object.entries(data)) {
            if (key !== 'id' && value !== undefined) {
                updateFields.push(`${key} = ?`);
                values.push(value);
            }
        }

        values.push(id);

        await db.query(
            `UPDATE ${tableName} SET ${updateFields.join(', ')} WHERE id = ?`,
            values
        );

        res.json({ success: true, message: 'Result updated successfully' });
    } catch (error) {
        console.error('Error updating result:', error);
        res.status(500).json({ error: 'Failed to update result' });
    }
});

/**
 * DELETE /api/admin/education/results/:examType/:id - Delete result
 */
router.delete('/education/results/:examType/:id', async (req, res) => {
    try {
        const { examType, id } = req.params;

        const validExamTypes = ['jsc', 'ssc', 'hsc'];
        if (!validExamTypes.includes(examType.toLowerCase())) {
            return res.status(400).json({ error: 'Invalid exam type' });
        }

        const tableName = `${examType.toLowerCase()}_results`;

        await db.query(`DELETE FROM ${tableName} WHERE id = ?`, [id]);

        res.json({ success: true, message: 'Result deleted successfully' });
    } catch (error) {
        console.error('Error deleting result:', error);
        res.status(500).json({ error: 'Failed to delete result' });
    }
});

/**
 * GET /api/admin/education/stats - Get education statistics
 */
router.get('/education/stats', async (req, res) => {
    try {
        const [jscCount] = await db.query('SELECT COUNT(*) as count FROM jsc_results');
        const [sscCount] = await db.query('SELECT COUNT(*) as count FROM ssc_results');
        const [hscCount] = await db.query('SELECT COUNT(*) as count FROM hsc_results');

        res.json({
            jsc: jscCount[0].count,
            ssc: sscCount[0].count,
            hsc: hscCount[0].count,
            total: jscCount[0].count + sscCount[0].count + hscCount[0].count
        });
    } catch (error) {
        console.error('Error fetching education stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// ==========================================
// UNIVERSITY ADMISSION MANAGEMENT
// ==========================================

/**
 * GET /api/admin/universities - Get all universities
 */
router.get('/universities', async (req, res) => {
    try {
        const [universities] = await db.query(`
            SELECT id, name, name_bn, code AS short_code, type AS university_type, 
                   location, website, logo_url, description, is_active
            FROM universities ORDER BY name
        `);
        res.json({ success: true, data: universities });
    } catch (error) {
        console.error('Error fetching universities:', error);
        res.status(500).json({ error: 'Failed to fetch universities' });
    }
});

/**
 * POST /api/admin/universities - Add new university
 */
router.post('/universities', async (req, res) => {
    try {
        const {
            name, name_bn,
            code, short_code, // Accept both 'code' and 'short_code'
            type, university_type, // Accept both 'type' and 'university_type'
            location, website, logo_url, description
        } = req.body;

        const universityCode = code || short_code;
        const universityType = type || university_type || 'General';

        if (!name || !universityCode) {
            return res.status(400).json({ success: false, message: 'Name and code are required' });
        }

        const [result] = await db.query(`
            INSERT INTO universities (name, name_bn, code, type, location, website, logo_url, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [name, name_bn || null, universityCode, universityType, location, website, logo_url || null, description || null]);

        res.json({ success: true, id: result.insertId, message: 'University added successfully' });
    } catch (error) {
        console.error('Error adding university:', error);
        res.status(500).json({ success: false, message: 'Failed to add university', error: error.sqlMessage || error.message });
    }
});

/**
 * PUT /api/admin/universities/:id - Update university
 */
router.put('/universities/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name, name_bn,
            code, short_code,
            type, university_type,
            location, website, logo_url, description, is_active
        } = req.body;

        const universityCode = code || short_code;
        const universityTypeVal = type || university_type;

        await db.query(`
            UPDATE universities SET 
                name = ?, name_bn = ?, code = ?, type = ?, location = ?, 
                website = ?, logo_url = ?, description = ?, is_active = ?
            WHERE id = ?
        `, [name, name_bn, universityCode, universityTypeVal, location, website, logo_url, description, is_active !== false, id]);

        res.json({ success: true, message: 'University updated successfully' });
    } catch (error) {
        console.error('Error updating university:', error);
        res.status(500).json({ success: false, message: 'Failed to update university' });
    }
});

/**
 * GET /api/admin/admission-posts - Get all admission posts
 */
router.get('/admission-posts', async (req, res) => {
    try {
        const [posts] = await db.query(`
            SELECT ap.id, ap.university_id, ap.session, ap.unit_code AS unit, 
                   ap.unit_name, ap.min_gpa, ap.required_group, ap.application_fee,
                   ap.start_date AS application_start, ap.end_date AS application_end,
                   ap.exam_date, ap.total_seats, ap.status, ap.requirements,
                   u.name AS university_name, u.code AS university_code,
                (SELECT COUNT(*) FROM university_applications WHERE admission_post_id = ap.id) AS application_count,
                (SELECT COUNT(*) FROM university_applications WHERE admission_post_id = ap.id AND payment_status = 'Paid') AS paid_count
            FROM admission_posts ap
            JOIN universities u ON ap.university_id = u.id
            ORDER BY ap.created_at DESC
        `);
        res.json({ success: true, data: posts });
    } catch (error) {
        console.error('Error fetching admission posts:', error);
        res.status(500).json({ error: 'Failed to fetch admission posts' });
    }
});

/**
 * POST /api/admin/admission-posts - Create admission post
 */
router.post('/admission-posts', async (req, res) => {
    try {
        const {
            university_id, session,
            unit, unit_code: unitCodeAlt, // Accept both 'unit' and 'unit_code'
            unit_name, unit_description,
            min_gpa, min_gpa_science, min_gpa_english, required_group,
            application_fee,
            application_start, start_date: startDateAlt, // Accept both names
            application_end, end_date: endDateAlt,
            exam_date, result_date,
            total_seats, status, requirements, instructions
        } = req.body;

        // Use whichever field name was provided
        const unitCode = unit || unitCodeAlt;
        const startDate = application_start || startDateAlt;
        const endDate = application_end || endDateAlt;

        // Generate unit name if not provided
        const unitName = unit_name || `Unit ${unitCode}`;

        if (!university_id || !session || !unitCode || !startDate || !endDate) {
            return res.status(400).json({ success: false, message: 'Missing required fields: university_id, session, unit, application_start, application_end' });
        }

        const [result] = await db.query(`
            INSERT INTO admission_posts (
                university_id, session, unit_code, unit_name, unit_description,
                min_gpa, min_gpa_science, min_gpa_english, required_group,
                application_fee, start_date, end_date, exam_date, result_date,
                total_seats, status, requirements, instructions
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            university_id, session, unitCode, unitName, unit_description,
            min_gpa || 3.50, min_gpa_science, min_gpa_english, required_group || 'Any',
            application_fee || 1000, startDate, endDate, exam_date, result_date,
            total_seats, status || 'Upcoming', requirements, instructions
        ]);

        res.json({ success: true, id: result.insertId, message: 'Admission post created successfully' });
    } catch (error) {
        console.error('Error creating admission post:', error);
        res.status(500).json({ error: 'Failed to create admission post' });
    }
});

/**
 * PUT /api/admin/admission-posts/:id - Update admission post
 */
router.put('/admission-posts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            university_id, session,
            unit, unit_code: unitCodeAlt,
            unit_name, unit_description,
            min_gpa, min_gpa_science, min_gpa_english, required_group,
            application_fee,
            application_start, start_date: startDateAlt,
            application_end, end_date: endDateAlt,
            exam_date, result_date,
            total_seats, status, requirements, instructions
        } = req.body;

        // Use whichever field name was provided
        const unitCode = unit || unitCodeAlt;
        const startDate = application_start || startDateAlt;
        const endDate = application_end || endDateAlt;
        const unitName = unit_name || `Unit ${unitCode}`;

        await db.query(`
            UPDATE admission_posts SET
                session = ?, unit_code = ?, unit_name = ?,
                min_gpa = ?, required_group = ?,
                application_fee = ?, start_date = ?, end_date = ?, exam_date = ?,
                total_seats = ?, status = ?
            WHERE id = ?
        `, [
            session, unitCode, unitName,
            min_gpa, required_group,
            application_fee, startDate, endDate, exam_date,
            total_seats, status, id
        ]);

        res.json({ success: true, message: 'Admission post updated successfully' });
    } catch (error) {
        console.error('Error updating admission post:', error);
        res.status(500).json({ success: false, message: 'Failed to update admission post' });
    }
});

/**
 * DELETE /api/admin/admission-posts/:id - Delete admission post
 */
router.delete('/admission-posts/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if there are any applications
        const [apps] = await db.query('SELECT COUNT(*) AS count FROM university_applications WHERE admission_post_id = ?', [id]);
        if (apps[0].count > 0) {
            return res.status(400).json({ error: 'Cannot delete admission post with existing applications' });
        }

        await db.query('DELETE FROM admission_posts WHERE id = ?', [id]);
        res.json({ success: true, message: 'Admission post deleted successfully' });
    } catch (error) {
        console.error('Error deleting admission post:', error);
        res.status(500).json({ error: 'Failed to delete admission post' });
    }
});

/**
 * GET /api/admin/university-applications - Get all applications
 */
router.get('/university-applications', async (req, res) => {
    try {
        const { status, admission_id } = req.query;

        let query = `
            SELECT ua.*, ap.unit_name, ap.unit_code, u.name AS university_name, u.code AS university_code
            FROM university_applications ua
            JOIN admission_posts ap ON ua.admission_post_id = ap.id
            JOIN universities u ON ap.university_id = u.id
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            query += ' AND ua.application_status = ?';
            params.push(status);
        }

        if (admission_id) {
            query += ' AND ua.admission_post_id = ?';
            params.push(admission_id);
        }

        query += ' ORDER BY ua.created_at DESC';

        const [applications] = await db.query(query, params);
        // Map unit_code to unit for frontend compatibility
        const mappedApps = applications.map(app => ({
            ...app,
            unit: app.unit_code,
            university_id: app.university_id || 0
        }));
        res.json({ success: true, data: mappedApps });
    } catch (error) {
        console.error('Error fetching applications:', error);
        res.status(500).json({ error: 'Failed to fetch applications' });
    }
});

/**
 * PUT /api/admin/university-applications/:id/verify - Verify application
 */
router.put('/university-applications/:id/verify', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, rejection_reason } = req.body;

        await db.query(`
            UPDATE university_applications SET 
                application_status = ?,
                rejection_reason = ?,
                verified_at = NOW()
            WHERE id = ?
        `, [status, rejection_reason, id]);

        res.json({ success: true, message: 'Application status updated' });
    } catch (error) {
        console.error('Error verifying application:', error);
        res.status(500).json({ error: 'Failed to verify application' });
    }
});

/**
 * GET /api/admin/admission-stats - Get admission statistics
 */
router.get('/admission-stats', async (req, res) => {
    try {
        const [universities] = await db.query('SELECT COUNT(*) AS count FROM universities WHERE is_active = TRUE');
        const [activeAdmissions] = await db.query('SELECT COUNT(*) AS count FROM admission_posts WHERE status = "Active"');
        const [totalApplications] = await db.query('SELECT COUNT(*) AS count FROM university_applications');
        const [paidApplications] = await db.query('SELECT COUNT(*) AS count FROM university_applications WHERE payment_status = "Paid"');
        const [totalRevenue] = await db.query('SELECT COALESCE(SUM(payment_amount), 0) AS total FROM university_applications WHERE payment_status = "Paid"');

        const [pendingApps] = await db.query('SELECT COUNT(*) AS count FROM university_applications WHERE application_status = "Submitted"');
        const [totalPosts] = await db.query('SELECT COUNT(*) AS count FROM admission_posts');

        res.json({
            success: true,
            data: {
                totalUniversities: universities[0].count,
                totalPosts: totalPosts[0].count,
                activeAdmissions: activeAdmissions[0].count,
                totalApplications: totalApplications[0].count,
                pendingApplications: pendingApps[0].count,
                paidApplications: paidApplications[0].count,
                totalRevenue: totalRevenue[0].total
            }
        });
    } catch (error) {
        console.error('Error fetching admission stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

module.exports = router;
