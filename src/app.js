const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

// ... (middleware)

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "cdn.jsdelivr.net", "cdnjs.cloudflare.com", "'unsafe-inline'"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "fonts.googleapis.com", "cdnjs.cloudflare.com", "cdn.jsdelivr.net", "'unsafe-inline'"],
            fontSrc: ["'self'", "fonts.gstatic.com", "cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "cdn.jsdelivr.net", "https://ui-avatars.com", "blob:"],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: null,
        },
    },
    hsts: false, // Disable HSTS for localhost
}));
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded form data

// Rate Limiting to prevent brute force
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Static Files
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/user', userRoutes);
const departmentRoutes = require('./routes/departmentRoutes');
app.use('/api/departments', departmentRoutes);
const paymentRoutes = require('./routes/paymentRoutes');
app.use('/api/payment', paymentRoutes);
const communityRoutes = require('./routes/communityRoutes');
app.use('/api/community', communityRoutes);
const reportsRoutes = require('./routes/reportsRoutes');
app.use('/api/reports', reportsRoutes);
const shopRoutes = require('./routes/shopRoutes');
app.use('/api/shop', shopRoutes);
const educationRoutes = require('./routes/educationRoutes');
app.use('/api/education', educationRoutes);
const universityRoutes = require('./routes/universityRoutes');
app.use('/api/university', universityRoutes);
const stipendRoutes = require('./routes/stipendRoutes');
app.use('/api/stipends', stipendRoutes);
const contactRoutes = require('./routes/contactRoutes');
app.use('/api/contact', contactRoutes);

// Admin Routes
const adminAuthRoutes = require('./routes/adminAuthRoutes');
const adminRoutes = require('./routes/adminRoutes');
app.use('/api/admin', adminAuthRoutes);
app.use('/api/admin', adminRoutes);

// Error Handler
// Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Max 5MB allowed.' });
    }
    if (err) {
        // Handle Multer string errors if any remain
        const msg = (typeof err === 'string') ? err : (err.message || 'Something went wrong!');
        return res.status(500).json({ error: msg });
    }
    next();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
