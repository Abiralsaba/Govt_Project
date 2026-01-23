const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verifyToken = require('../middleware/authMiddleware');

// Optional: verify token to link to user, but allow public submissions if needed?
// For this app, let's assume users are logged in as per current flow (token in localStorage).
router.use(verifyToken);

router.post('/', async (req, res) => {
    try {
        const { subject, message } = req.body;
        const userId = req.user.id;

        if (!subject || !message) {
            return res.status(400).json({ error: 'Subject and message are required' });
        }

        const [result] = await db.query(
            'INSERT INTO contact_messages (user_id, subject, message) VALUES (?, ?, ?)',
            [userId, subject, message]
        );

        res.json({ success: true, message: 'Message sent successfully', ticketId: result.insertId });

    } catch (error) {
        console.error('Error saving contact message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

module.exports = router;
