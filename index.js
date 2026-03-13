const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');

// Load env
dotenv.config();

const app = express();

// Middleware
const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
app.use(cors({
    origin: clientUrl,
    credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Import Routes
const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const categoryRoutes = require('./routes/category.routes');
const orderRoutes = require('./routes/order.routes');
const userRoutes = require('./routes/user.routes');
const settingsRoutes = require('./routes/settings.routes');
const uploadRoutes = require('./routes/upload.routes');
const reviewRoutes = require('./routes/review.routes');
const couponRoutes = require('./routes/coupon.routes');
const subscriberRoutes = require('./routes/subscriber.routes');
const sitemapRoutes = require('./routes/sitemap.routes');
const { startOrderCleanupTask } = require('./utils/orderScheduler');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/subscribers', subscriberRoutes);
app.use('/api/sitemap', sitemapRoutes);

// Dynamic Sitemap shortcut
app.get('/sitemap.xml', (req, res) => res.redirect('/api/sitemap'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'BuyZoin API is running', timestamp: new Date() });
});

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDB();

        // Seed admin user on first run
        const User = require('./models/User');
        const adminExists = await User.findOne({ email: 'admin@buyzoin.com' });
        if (!adminExists) {
            await User.create({
                name: 'Admin',
                email: 'admin@buyzoin.com',
                password: 'admin123',
                role: 'admin',
            });
            console.log('✅ Admin user seeded: admin@buyzoin.com / admin123');
        }

        // Start Auto-Cancellation Task
        startOrderCleanupTask();

        app.listen(PORT, () => {
            console.log(`🚀 BuyZoin server running on port ${PORT}`);
            console.log(`📡 API: http://localhost:${PORT}/api/health`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
};

startServer();
