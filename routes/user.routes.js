const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { auth, admin } = require('../middleware/auth.middleware');

const { sendEmail } = require('../utils/email');

// Create user (admin)
router.post('/', auth, admin, async (req, res) => {
    try {
        const { name, email, password, role, phone } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email, and password are required' });
        }

        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        const user = await User.create({ name, email, password, role, phone });

        // Send Email
        try {
            // To User
            await sendEmail({
                to: email,
                subject: 'Welcome to BuyZoin - Account Created by Admin',
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 30px; border: 1px solid #eee; border-radius: 10px; max-width: 600px; margin: auto;">
                        <h1 style="color: #f0700d; margin-bottom: 20px;">Welcome to BuyZoin, ${name.split(' ')[0]}!</h1>
                        <p>An account has been created for you by our administrator. You can now log in using the details below:</p>
                        <div style="background: #fdf2e9; padding: 20px; border-radius: 8px; margin: 25px 0;">
                            <p style="margin-bottom: 5px;"><strong>Email:</strong> ${email}</p>
                            <p style="margin-top: 5px;"><strong>Role:</strong> ${role === 'admin' ? 'Administrator' : 'Standard Customer'}</p>
                        </div>
                        <p>Please log in and update your password immediately for security.</p>
                        <a href="${process.env.CLIENT_URL || 'https://buyzoin.vercel.app'}/login" style="display: inline-block; background: #f0700d; color: white; padding: 12px 25px; border-radius: 30px; text-decoration: none; font-weight: bold; margin-top: 15px;">Login to Account</a>
                    </div>
                `
            });

            // To Admin
            await sendEmail({
                to: process.env.ADMIN_EMAIL || 'kradmin@buyzoin.in',
                subject: 'New Account Created (Admin Dashboard)',
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px;">
                        <h2 style="color: #f0700d;">Account Creation Record</h2>
                        <p>You have manually created a new account on the dashboard.</p>
                        <ul style="list-style: none; padding: 0;">
                            <li><strong>Name:</strong> ${name}</li>
                            <li><strong>Email:</strong> ${email}</li>
                            <li><strong>Role:</strong> ${role}</li>
                            <li><strong>Status:</strong> Active & Sent</li>
                        </ul>
                    </div>
                `
            });
        } catch (emailErr) {
            console.error('Admin user creation email failed:', emailErr);
        }

        res.status(201).json({ message: 'User created successfully', user });
    } catch (error) {
        console.error('Admin create user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all users (admin)
router.get('/', auth, admin, async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json({ users });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update profile (authenticated)
router.put('/profile', auth, async (req, res) => {
    try {
        const { name, phone, address, city, state, pincode } = req.body;

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { name, phone, address, city, state, pincode },
            { new: true, runValidators: true }
        );

        res.json({ message: 'Profile updated', user });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Change password (authenticated)
router.put('/change-password', auth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.user._id).select('+password');
        const isMatch = await user.comparePassword(currentPassword);

        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        user.password = newPassword; // pre-save hook will hash it
        await user.save();

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin: Update user details (status/role/reset password)
router.put('/:id', auth, admin, async (req, res) => {
    try {
        const { name, phone, role, password } = req.body;
        const updates = {};

        if (name) updates.name = name;
        if (phone) updates.phone = phone;
        if (role) updates.role = role;

        let user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Prevent demoting an admin
        if (user.role === 'admin' && role === 'user') {
            return res.status(403).json({ message: 'Admin accounts cannot be demoted to user' });
        }

        // Apply string updates if any
        Object.assign(user, updates);

        // If password is provided, reset it
        if (password) {
            user.password = password; // pre-save hook will hash it
        }

        await user.save();

        res.json({ message: 'User updated successfully', user });
    } catch (error) {
        console.error('Admin update user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete user (admin)
router.delete('/:id', auth, admin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Prevent deleting admin accounts
        if (user.role === 'admin') {
            return res.status(403).json({ message: 'Admin accounts cannot be deleted' });
        }

        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
