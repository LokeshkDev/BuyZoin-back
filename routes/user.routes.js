const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { auth, admin } = require('../middleware/auth.middleware');

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
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ message: 'User deleted' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
