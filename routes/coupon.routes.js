const express = require('express');
const router = express.Router();
const Coupon = require('../models/Coupon');
const { auth, admin } = require('../middleware/auth.middleware');

// Validate a coupon (Public)
router.post('/validate', auth, async (req, res) => {
    try {
        const { code, cartTotal } = req.body;
        const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });

        if (!coupon) {
            return res.status(404).json({ message: 'Invalid coupon code' });
        }

        if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
            return res.status(400).json({ message: 'Coupon has expired' });
        }

        if (coupon.minPurchaseAmount && cartTotal < coupon.minPurchaseAmount) {
            return res.status(400).json({ message: `Minimum purchase of ₹${coupon.minPurchaseAmount} required` });
        }

        if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
            return res.status(400).json({ message: 'Coupon limit reached' });
        }

        let discount = 0;
        if (coupon.discountType === 'percentage') {
            discount = (cartTotal * coupon.discountAmount) / 100;
            if (coupon.maxDiscountAmount > 0 && discount > coupon.maxDiscountAmount) {
                discount = coupon.maxDiscountAmount;
            }
        } else {
            discount = coupon.discountAmount;
        }

        res.json({
            message: 'Coupon applied successfully',
            discount,
            code: coupon.code,
            couponId: coupon._id
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Admin: Get all coupons
router.get('/', auth, admin, async (req, res) => {
    try {
        const coupons = await Coupon.find().sort({ createdAt: -1 });
        res.json(coupons);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Admin: Create a coupon
router.post('/', auth, admin, async (req, res) => {
    try {
        const coupon = new Coupon(req.body);
        await coupon.save();
        res.status(201).json(coupon);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Admin: Update a coupon
router.put('/:id', auth, admin, async (req, res) => {
    try {
        const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(coupon);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Admin: Delete a coupon
router.delete('/:id', auth, admin, async (req, res) => {
    try {
        await Coupon.findByIdAndDelete(req.params.id);
        res.json({ message: 'Coupon deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
