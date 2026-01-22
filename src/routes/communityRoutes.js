/**
 * Community Routes
 * 
 * API endpoints for the community group system
 */

const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verifyToken = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// All routes require authentication
router.use(verifyToken);

// ==========================================
// GROUP ENDPOINTS
// ==========================================

/**
 * GET /groups - List all approved groups
 */
router.get('/groups', async (req, res) => {
    try {
        const [groups] = await db.query(`
            SELECT 
                g.*,
                u.name as creator_name,
                (SELECT COUNT(*) FROM community_members WHERE group_id = g.id) as member_count
            FROM community_groups g
            JOIN reg_info u ON g.created_by = u.id
            WHERE g.status = 'approved'
            ORDER BY g.created_at DESC
        `);
        res.json(groups);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

/**
 * GET /my-groups - Get groups user has joined
 */
router.get('/my-groups', async (req, res) => {
    try {
        const [groups] = await db.query(`
            SELECT 
                g.*,
                u.name as creator_name,
                m.role as my_role,
                (SELECT COUNT(*) FROM community_members WHERE group_id = g.id) as member_count
            FROM community_groups g
            JOIN community_members m ON g.id = m.group_id
            JOIN reg_info u ON g.created_by = u.id
            WHERE m.user_id = ? AND g.status = 'approved'
            ORDER BY m.joined_at DESC
        `, [req.user.id]);
        res.json(groups);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

/**
 * POST /groups - Create a new group (pending approval)
 * Supports file upload for cover_image
 */
router.post('/groups', upload.single('cover_image'), async (req, res) => {
    const { name, description } = req.body;

    // Handle cover image - either from file upload or URL
    let cover_image = null;
    if (req.file) {
        cover_image = '/uploads/' + req.file.filename;
    }

    if (!name || name.trim().length < 3) {
        return res.status(400).json({ error: 'Group name must be at least 3 characters' });
    }

    try {
        const [result] = await db.query(`
            INSERT INTO community_groups (name, description, cover_image, created_by, status)
            VALUES (?, ?, ?, ?, 'pending')
        `, [name.trim(), description || '', cover_image, req.user.id]);

        // Auto-add creator as admin member
        await db.query(`
            INSERT INTO community_members (group_id, user_id, role)
            VALUES (?, ?, 'admin')
        `, [result.insertId, req.user.id]);

        // Notify admin
        await db.query(`
            INSERT INTO notifications (user_id, message)
            SELECT id, ? FROM reg_info WHERE email = 'admin@gov.bd' LIMIT 1
        `, [`New community group "${name}" pending approval`]);

        res.json({
            success: true,
            message: 'Group created and pending admin approval',
            groupId: result.insertId
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

/**
 * GET /groups/:id - Get group details with approved posts
 */
router.get('/groups/:id', async (req, res) => {
    try {
        // Get group info
        const [groups] = await db.query(`
            SELECT 
                g.*,
                u.name as creator_name,
                (SELECT COUNT(*) FROM community_members WHERE group_id = g.id) as member_count
            FROM community_groups g
            JOIN reg_info u ON g.created_by = u.id
            WHERE g.id = ? AND g.status = 'approved'
        `, [req.params.id]);

        if (groups.length === 0) {
            return res.status(404).json({ error: 'Group not found' });
        }

        const group = groups[0];

        // Check if user is member
        const [membership] = await db.query(`
            SELECT role FROM community_members 
            WHERE group_id = ? AND user_id = ?
        `, [req.params.id, req.user.id]);

        group.is_member = membership.length > 0;
        group.my_role = membership[0]?.role || null;

        // Get approved posts with author info
        const [posts] = await db.query(`
            SELECT 
                p.*,
                u.name as author_name,
                u.photo_url as author_photo,
                EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = ?) as liked_by_me
            FROM community_posts p
            JOIN reg_info u ON p.user_id = u.id
            WHERE p.group_id = ? AND p.status = 'approved'
            ORDER BY p.created_at DESC
        `, [req.user.id, req.params.id]);

        group.posts = posts;

        res.json(group);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

/**
 * PUT /groups/:id - Edit a group (admin/creator only, requires re-approval)
 */
router.put('/groups/:id', upload.single('cover_image'), async (req, res) => {
    const { name, description, keep_existing_cover } = req.body;

    if (!name || name.trim().length < 3) {
        return res.status(400).json({ error: 'Group name must be at least 3 characters' });
    }

    try {
        // Check if group exists and user is admin/creator
        const [groups] = await db.query(
            'SELECT id, created_by, cover_image FROM community_groups WHERE id = ?',
            [req.params.id]
        );

        if (groups.length === 0) {
            return res.status(404).json({ error: 'Group not found' });
        }

        // Check if user is creator or admin member
        const [membership] = await db.query(
            'SELECT role FROM community_members WHERE group_id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );

        const isCreator = groups[0].created_by == req.user.id;
        const isAdmin = membership.length > 0 && membership[0].role === 'admin';

        if (!isCreator && !isAdmin) {
            return res.status(403).json({ error: 'Only group admin can edit the group' });
        }

        // Handle cover image
        let cover_image = null;
        if (req.file) {
            // New image uploaded
            cover_image = '/uploads/' + req.file.filename;
        } else if (keep_existing_cover === 'true') {
            // Keep existing cover
            cover_image = groups[0].cover_image;
        }
        // If neither, cover_image stays null (image removed)

        // Update group and set status back to pending
        await db.query(`
            UPDATE community_groups 
            SET name = ?, description = ?, cover_image = ?, status = 'pending'
            WHERE id = ?
        `, [name.trim(), description || '', cover_image, req.params.id]);

        // Notify admin
        await db.query(`
            INSERT INTO notifications (user_id, message)
            SELECT id, ? FROM reg_info WHERE email = 'admin@gov.bd' LIMIT 1
        `, [`Community group "${name}" edited and pending re-approval`]);

        res.json({
            success: true,
            message: 'Group updated and pending admin re-approval'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

/**
 * POST /groups/:id/join - Join a group
 */
router.post('/groups/:id/join', async (req, res) => {
    try {
        // Check if group exists and is approved
        const [groups] = await db.query(
            'SELECT id FROM community_groups WHERE id = ? AND status = "approved"',
            [req.params.id]
        );
        if (groups.length === 0) {
            return res.status(404).json({ error: 'Group not found' });
        }

        // Check if already member
        const [existing] = await db.query(
            'SELECT id FROM community_members WHERE group_id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Already a member' });
        }

        await db.query(`
            INSERT INTO community_members (group_id, user_id, role)
            VALUES (?, ?, 'member')
        `, [req.params.id, req.user.id]);

        res.json({ success: true, message: 'Joined group successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

/**
 * POST /groups/:id/leave - Leave a group
 */
router.post('/groups/:id/leave', async (req, res) => {
    try {
        // Check if user is the creator (admin can't leave)
        const [groups] = await db.query(
            'SELECT created_by FROM community_groups WHERE id = ?',
            [req.params.id]
        );
        if (groups.length > 0 && groups[0].created_by === req.user.id) {
            return res.status(400).json({ error: 'Group creator cannot leave. Transfer ownership first.' });
        }

        await db.query(
            'DELETE FROM community_members WHERE group_id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );

        res.json({ success: true, message: 'Left group successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

// ==========================================
// POST ENDPOINTS
// ==========================================

/**
 * POST /groups/:id/posts - Create a post in group (pending approval)
 * Supports file upload for post_image
 */
router.post('/groups/:id/posts', upload.single('post_image'), async (req, res) => {
    const { content } = req.body;

    // Handle post image - from file upload
    let image_url = null;
    if (req.file) {
        image_url = '/uploads/' + req.file.filename;
    }

    if (!content || content.trim().length < 1) {
        return res.status(400).json({ error: 'Post content required' });
    }

    try {
        // Check if user is member
        const [membership] = await db.query(
            'SELECT id FROM community_members WHERE group_id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        if (membership.length === 0) {
            return res.status(403).json({ error: 'Must be a member to post' });
        }

        const [result] = await db.query(`
            INSERT INTO community_posts (group_id, user_id, content, image_url, status)
            VALUES (?, ?, ?, ?, 'pending')
        `, [req.params.id, req.user.id, content.trim(), image_url]);

        // Notify admin
        await db.query(`
            INSERT INTO notifications (user_id, message)
            SELECT id, ? FROM reg_info WHERE email = 'admin@gov.bd' LIMIT 1
        `, [`New community post pending approval`]);

        res.json({
            success: true,
            message: 'Post created and pending admin approval',
            postId: result.insertId
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

/**
 * PUT /posts/:id - Edit a post (author only, requires re-approval)
 */
router.put('/posts/:id', upload.single('post_image'), async (req, res) => {
    const { content, keep_existing_image } = req.body;

    if (!content || content.trim().length < 1) {
        return res.status(400).json({ error: 'Post content required' });
    }

    try {
        // Check if post exists and user is the author
        const [posts] = await db.query(
            'SELECT id, user_id, image_url FROM community_posts WHERE id = ?',
            [req.params.id]
        );

        if (posts.length === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }

        if (posts[0].user_id !== req.user.id) {
            return res.status(403).json({ error: 'You can only edit your own posts' });
        }

        // Handle image
        let image_url = null;
        if (req.file) {
            // New image uploaded
            image_url = '/uploads/' + req.file.filename;
        } else if (keep_existing_image === 'true') {
            // Keep existing image
            image_url = posts[0].image_url;
        }
        // If neither, image_url stays null (image removed)

        // Update post and set status back to pending
        await db.query(`
            UPDATE community_posts 
            SET content = ?, image_url = ?, status = 'pending', updated_at = NOW()
            WHERE id = ?
        `, [content.trim(), image_url, req.params.id]);

        // Notify admin
        await db.query(`
            INSERT INTO notifications (user_id, message)
            SELECT id, ? FROM reg_info WHERE email = 'admin@gov.bd' LIMIT 1
        `, [`Community post edited and pending re-approval`]);

        res.json({
            success: true,
            message: 'Post updated and pending admin re-approval'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

/**
 * POST /posts/:id/like - Toggle like on a post
 */
router.post('/posts/:id/like', async (req, res) => {
    try {
        // Check if already liked
        const [existing] = await db.query(
            'SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );

        if (existing.length > 0) {
            // Unlike
            await db.query(
                'DELETE FROM post_likes WHERE post_id = ? AND user_id = ?',
                [req.params.id, req.user.id]
            );
            await db.query(
                'UPDATE community_posts SET like_count = like_count - 1 WHERE id = ?',
                [req.params.id]
            );
            res.json({ success: true, liked: false });
        } else {
            // Like
            await db.query(
                'INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)',
                [req.params.id, req.user.id]
            );
            await db.query(
                'UPDATE community_posts SET like_count = like_count + 1 WHERE id = ?',
                [req.params.id]
            );
            res.json({ success: true, liked: true });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

/**
 * GET /posts/:id/comments - Get comments for a post
 */
router.get('/posts/:id/comments', async (req, res) => {
    try {
        const [comments] = await db.query(`
            SELECT 
                c.*,
                u.name as author_name,
                u.photo_url as author_photo
            FROM post_comments c
            JOIN reg_info u ON c.user_id = u.id
            WHERE c.post_id = ?
            ORDER BY c.created_at ASC
        `, [req.params.id]);
        res.json(comments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

/**
 * POST /posts/:id/comments - Add a comment
 */
router.post('/posts/:id/comments', async (req, res) => {
    const { content } = req.body;

    if (!content || content.trim().length < 1) {
        return res.status(400).json({ error: 'Comment content required' });
    }

    try {
        const [result] = await db.query(`
            INSERT INTO post_comments (post_id, user_id, content)
            VALUES (?, ?, ?)
        `, [req.params.id, req.user.id, content.trim()]);

        // Update comment count
        await db.query(
            'UPDATE community_posts SET comment_count = comment_count + 1 WHERE id = ?',
            [req.params.id]
        );

        // Get the new comment with author info
        const [comments] = await db.query(`
            SELECT 
                c.*,
                u.name as author_name,
                u.photo_url as author_photo
            FROM post_comments c
            JOIN reg_info u ON c.user_id = u.id
            WHERE c.id = ?
        `, [result.insertId]);

        res.json({ success: true, comment: comments[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

/**
 * PUT /comments/:id - Edit a comment (author only)
 */
router.put('/comments/:id', async (req, res) => {
    const { content } = req.body;

    if (!content || content.trim().length < 1) {
        return res.status(400).json({ error: 'Comment content required' });
    }

    try {
        // Check if comment exists and user is the author
        const [comments] = await db.query(
            'SELECT id, user_id FROM post_comments WHERE id = ?',
            [req.params.id]
        );

        if (comments.length === 0) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        if (comments[0].user_id !== req.user.id) {
            return res.status(403).json({ error: 'You can only edit your own comments' });
        }

        await db.query(
            'UPDATE post_comments SET content = ? WHERE id = ?',
            [content.trim(), req.params.id]
        );

        res.json({ success: true, message: 'Comment updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

/**
 * DELETE /comments/:id - Delete a comment (author only)
 */
router.delete('/comments/:id', async (req, res) => {
    try {
        // Check if comment exists and user is the author
        const [comments] = await db.query(
            'SELECT id, user_id, post_id FROM post_comments WHERE id = ?',
            [req.params.id]
        );

        if (comments.length === 0) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        if (comments[0].user_id !== req.user.id) {
            return res.status(403).json({ error: 'You can only delete your own comments' });
        }

        const postId = comments[0].post_id;

        // Delete the comment
        await db.query('DELETE FROM post_comments WHERE id = ?', [req.params.id]);

        // Update comment count on the post
        await db.query(
            'UPDATE community_posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = ?',
            [postId]
        );

        res.json({ success: true, message: 'Comment deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

// ==========================================
// ADMIN ENDPOINTS
// ==========================================

/**
 * GET /admin/groups - Get pending groups (admin only)
 */
router.get('/admin/groups', async (req, res) => {
    try {
        const [groups] = await db.query(`
            SELECT 
                g.*,
                u.name as creator_name,
                u.email as creator_email
            FROM community_groups g
            JOIN reg_info u ON g.created_by = u.id
            WHERE g.status = 'pending'
            ORDER BY g.created_at ASC
        `);
        res.json(groups);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

/**
 * PUT /admin/groups/:id - Approve or reject a group
 */
router.put('/admin/groups/:id', async (req, res) => {
    const { action } = req.body; // 'approve' or 'reject'

    if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({ error: 'Invalid action' });
    }

    try {
        const status = action === 'approve' ? 'approved' : 'rejected';
        await db.query(
            'UPDATE community_groups SET status = ? WHERE id = ?',
            [status, req.params.id]
        );

        // Notify creator
        const [groups] = await db.query('SELECT name, created_by FROM community_groups WHERE id = ?', [req.params.id]);
        if (groups.length > 0) {
            await db.query(`
                INSERT INTO notifications (user_id, message)
                VALUES (?, ?)
            `, [groups[0].created_by, `Your group "${groups[0].name}" has been ${status}`]);
        }

        res.json({ success: true, message: `Group ${status}` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

/**
 * GET /admin/posts - Get pending posts (admin only)
 */
router.get('/admin/posts', async (req, res) => {
    try {
        const [posts] = await db.query(`
            SELECT 
                p.*,
                u.name as author_name,
                g.name as group_name
            FROM community_posts p
            JOIN reg_info u ON p.user_id = u.id
            JOIN community_groups g ON p.group_id = g.id
            WHERE p.status = 'pending'
            ORDER BY p.created_at ASC
        `);
        res.json(posts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

/**
 * PUT /admin/posts/:id - Approve or reject a post
 */
router.put('/admin/posts/:id', async (req, res) => {
    const { action } = req.body; // 'approve' or 'reject'

    if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({ error: 'Invalid action' });
    }

    try {
        const status = action === 'approve' ? 'approved' : 'rejected';
        await db.query(
            'UPDATE community_posts SET status = ? WHERE id = ?',
            [status, req.params.id]
        );

        // Notify author
        const [posts] = await db.query('SELECT user_id FROM community_posts WHERE id = ?', [req.params.id]);
        if (posts.length > 0) {
            await db.query(`
                INSERT INTO notifications (user_id, message)
                VALUES (?, ?)
            `, [posts[0].user_id, `Your community post has been ${status}`]);
        }

        res.json({ success: true, message: `Post ${status}` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;
