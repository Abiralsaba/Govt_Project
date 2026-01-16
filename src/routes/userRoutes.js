const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const upload = require('../middleware/uploadMiddleware');
const jwt = require('jsonwebtoken');

// Middleware to verify token (Reusing inline or importing from authMiddleware if it existed separately)
// Ideally, this should be in a separate middleware file, but for now reproducing it here or assuming verifyToken is available.
// Let's rely on dashboardRoutes middleware logic, but it's better to duplicate/extract here.

const verifyToken = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.post('/profile/photo', upload.single('photo'), userController.uploadPhoto);

module.exports = router;
