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

const { sendEmail } = require('../utils/email');

// Submit contact form (public + reCAPTCHA)
router.post('/contact', verifyRecaptcha, async (req, res) => {
    try {
        const { name, email, message } = req.body;
        
        // Notify Admin
        await sendEmail({
            to: process.env.ADMIN_EMAIL || 'kradmin@buyzoin.in',
            subject: `New Contact Message from ${name}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #f0700d;">New Inquiry</h2>
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Message:</strong></p>
                    <div style="background: #f4f4f4; padding: 15px; border-radius: 5px;">
                        ${message}
                    </div>
                </div>
            `
        });

        // Auto-reply to Customer
        await sendEmail({
            to: email,
            subject: 'We have received your message - BuyZoin',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 30px; border: 1px solid #eee; border-radius: 10px; max-width: 600px; margin: auto;">
                    <h2 style="color: #f0700d;">Message Received</h2>
                    <p>Hello ${name},</p>
                    <p>Thank you for reaching out to us. We have received your inquiry and will get back to you as soon as possible.</p>
                    <div style="background: #fdf2e9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0;"><strong>Your Message:</strong></p>
                        <p style="margin: 10px 0 0 0; font-style: italic;">"${message}"</p>
                    </div>
                    <p>Best Regards,<br/>Team BuyZoin</p>
                </div>
            `
        });
        
        res.json({ message: 'Your message has been received. We will get back to you soon!' });
    } catch (error) {
        console.error('Contact submission error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
