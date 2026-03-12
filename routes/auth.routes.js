const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth.middleware');

const { sendEmail } = require('../utils/email');

// Register
router.post('/register', async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email, and password are required' });
        }

        // Check if user exists
        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        // Create user
        const user = await User.create({ name, email, phone, password });

        // Generate token
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        });

        // Set Cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // Email Notifications
        try {
            // To Admin
            await sendEmail({
                to: process.env.ADMIN_EMAIL || 'kradmin@buyzoin.in',
                subject: 'New User Registered - BuyZoin',
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px;">
                        <h2 style="color: #f0700d;">New Customer Integration</h2>
                        <p>A new customer has joined the platform.</p>
                        <ul style="list-style: none; padding: 0;">
                            <li><strong>Name:</strong> ${name}</li>
                            <li><strong>Email:</strong> ${email}</li>
                            <li><strong>Role:</strong> ${user.role}</li>
                        </ul>
                    </div>
                `
            });

            // To Customer
            await sendEmail({
                to: email,
                subject: 'Welcome to BuyZoin Artisan Studio',
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 30px; border: 1px solid #eee; border-radius: 10px; max-width: 600px; margin: auto;">
                        <h1 style="color: #f0700d; margin-bottom: 20px;">Welcome, ${name.split(' ')[0]}!</h1>
                        <p>Your journey with artisan excellence begins here. We're thrilled to have you as part of our community.</p>
                        <div style="background: #fdf2e9; padding: 20px; border-radius: 8px; margin: 25px 0;">
                            <h3 style="margin-top: 0; color: #f0700d;">Your Profile Manifest</h3>
                            <p style="margin-bottom: 5px;"><strong>Email:</strong> ${email}</p>
                            <p style="margin-top: 5px;"><strong>Status:</strong> Active & Verified</p>
                        </div>
                        <p>Explore our curated collections of premium handcrafted goods and experience redefined quality.</p>
                        <a href="${process.env.CLIENT_URL}" style="display: inline-block; background: #f0700d; color: white; padding: 12px 25px; border-radius: 30px; text-decoration: none; font-weight: bold; margin-top: 15px;">Start Exploring</a>
                        <p style="margin-top: 30px; font-size: 12px; color: #999;">If you did not create this account, please contact us immediately at kradmin@buyzoin.in</p>
                    </div>
                `
            });
        } catch (emailErr) {
            console.error('Registration emails failed (but registration succeeded):', emailErr);
        }

        res.status(201).json({
            message: 'Registration successful',
            token, // Keep sending token for legacy/header fallback
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        });

        // Set Cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({
            message: 'Login successful',
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Logout
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
});

// Get current user
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        res.json({ user });
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
