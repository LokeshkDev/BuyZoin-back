const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const { auth, admin } = require('../middleware/auth.middleware');

const { verifyRecaptcha } = require('../middleware/recaptcha.middleware');

// Get settings (public)
router.get('/', async (req, res) => {
    try {
        let settings = await Settings.findOne({ type: 'homepage' });
        if (!settings) {
            settings = await Settings.create({ type: 'homepage' });
        }
        res.json({ settings });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update settings (admin only)
router.put('/', auth, admin, async (req, res) => {
    try {
        const settings = await Settings.findOneAndUpdate(
            { type: 'homepage' },
            req.body,
            { new: true, upsert: true, runValidators: true }
        );
        res.json({ message: 'Settings updated successfully', settings });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Submit contact form (public + reCAPTCHA)
router.post('/contact', verifyRecaptcha, async (req, res) => {
    try {
        const { name, email, message } = req.body;
        // Here you would typically send an email or save to a database
        // For now, we'll just log it and return success
        console.log('Contact Message Received:', { name, email, message });
        
        res.json({ message: 'Your message has been received. We will get back to you soon!' });
    } catch (error) {
        console.error('Contact submission error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
