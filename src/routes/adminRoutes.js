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

module.exports = router;
