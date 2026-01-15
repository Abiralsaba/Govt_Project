const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const jwt = require('jsonwebtoken');

// Middleware to verify token
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: 'No token provided' });

    jwt.verify(token.split(' ')[1], process.env.JWT_SECRET || 'super_secret_key_change_this_in_prod', (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Unauthorized' });
        req.user = decoded;
        next();
    });
};

router.use(verifyToken); // Protect all dashboard routes

router.get('/summary', dashboardController.getSummary);
router.get('/todos', dashboardController.getTodos);
router.post('/todos', dashboardController.createTodo);
router.put('/todos/:id/move', dashboardController.updateTodoStatus);
router.delete('/todos/:id', dashboardController.deleteTodo);
router.get('/departments', dashboardController.getDepartments);
router.post('/services/request', dashboardController.submitServiceRequest);
router.get('/documents', dashboardController.getDocuments);
router.get('/history', dashboardController.getHistory);

module.exports = router;
