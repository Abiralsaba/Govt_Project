const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');


// Middleware to verify token
const verifyToken = require('../middleware/authMiddleware');

router.use(verifyToken); // Protect all dashboard routes

router.get('/summary', dashboardController.getSummary);
router.get('/todos', dashboardController.getTodos);
router.post('/todos', dashboardController.createTodo);
router.put('/todos/:id/move', dashboardController.updateTodoStatus);
router.delete('/todos/:id', dashboardController.deleteTodo);
router.get('/departments', dashboardController.getDepartments);
router.post('/services/request', dashboardController.submitServiceRequest);
router.get('/services/active', dashboardController.getActiveRequests);
router.put('/services/status', dashboardController.updateRequestStatus);
router.get('/services/completed', dashboardController.getCompletedTasks);
router.get('/notifications', dashboardController.getNotifications);
router.put('/notifications/:id/read', dashboardController.markNotificationRead);
router.get('/documents', dashboardController.getDocuments);
router.get('/history', dashboardController.getHistory);

module.exports = router;
