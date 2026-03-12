const express = require('express');
const router = express.Router();
const Subscriber = require('../models/Subscriber');
const { auth, admin } = require('../middleware/auth.middleware');
const { sendEmail } = require('../utils/email');

// @desc    Add new subscriber
// @route   POST /api/subscribers
// @access  Public
router.post('/', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const subscriberExists = await Subscriber.findOne({ email });

        if (subscriberExists) {
            return res.status(400).json({ message: 'Email already subscribed' });
        }

        const subscriber = await Subscriber.create({ email });

        // Email Notifications
        try {
            // To Subscriber
            await sendEmail({
                to: email,
                subject: 'Thank You for Joining BuyZoin Newsletter!',
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 30px; border: 1px solid #eee; border-radius: 10px; max-width: 600px; margin: auto;">
                        <h2 style="color: #f0700d;">Welcome to the Circle!</h2>
                        <p>Thank you for subscribing to the BuyZoin newsletter. You'll be the first to know about our latest artisan collections and exclusive offers.</p>
                        <div style="background: #fdf2e9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 0;"><strong>Subscribed Email:</strong> ${email}</p>
                        </div>
                        <p>Stay tuned for artisan excellence.</p>
                        <a href="${process.env.CLIENT_URL || 'https://buyzoin.in'}" style="display: inline-block; background: #f0700d; color: white; padding: 10px 20px; border-radius: 30px; text-decoration: none; font-weight: bold;">Visit our Studio</a>
                    </div>
                `
            });

            // To Admin
            await sendEmail({
                to: process.env.ADMIN_EMAIL || 'kradmin@buyzoin.in',
                subject: 'New Newsletter Subscription - BuyZoin',
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px;">
                        <h2 style="color: #f0700d;">New Lead Alert</h2>
                        <p>A new user has subscribed to the newsletter.</p>
                        <ul style="list-style: none; padding: 0;">
                            <li><strong>Email:</strong> ${email}</li>
                            <li><strong>Date:</strong> ${new Date().toLocaleString()}</li>
                        </ul>
                    </div>
                `
            });
        } catch (emailErr) {
            console.error('Newsletter email failed:', emailErr);
        }

        res.status(201).json({
            success: true,
            message: 'Subscribed successfully',
            data: subscriber
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get all subscribers
// @route   GET /api/subscribers
// @access  Private/Admin
router.get('/', auth, admin, async (req, res) => {
    try {
        const subscribers = await Subscriber.find({}).sort({ createdAt: -1 });
        res.json({
            success: true,
            count: subscribers.length,
            data: subscribers
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Delete subscriber
// @route   DELETE /api/subscribers/:id
// @access  Private/Admin
router.delete('/:id', auth, admin, async (req, res) => {
    try {
        const subscriber = await Subscriber.findById(req.params.id);

        if (!subscriber) {
            return res.status(404).json({ message: 'Subscriber not found' });
        }

        await subscriber.deleteOne();
        res.json({ success: true, message: 'Subscriber removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
