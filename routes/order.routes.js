const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { auth, admin } = require('../middleware/auth.middleware');
const { Cashfree, CFEnvironment } = require('cashfree-pg');


const Settings = require('../models/Settings');

// Create Cashfree Order
router.post('/cashfree/create', auth, async (req, res) => {
    try {
        const { amount, orderId, customerPhone, customerEmail, customerName } = req.body;

        const settings = await Settings.findOne({ type: 'homepage' });
        const appId = settings?.payment?.cashfreeAppId || process.env.CASHFREE_APP_ID;
        const secretKey = settings?.payment?.cashfreeSecretKey || process.env.CASHFREE_SECRET_KEY;
        const isTest = settings?.payment?.isTestMode !== undefined ? settings.payment.isTestMode : (process.env.CASHFREE_ENV !== 'PRODUCTION');

        if (!appId || !secretKey) {
            return res.status(400).json({ message: 'Payment gateway configuration missing. Please add Cashfree keys in Admin Dashboard or .env' });
        }

        const cfEnvironment = isTest ? CFEnvironment.SANDBOX : CFEnvironment.PRODUCTION;
        const cashfree = new Cashfree(cfEnvironment, appId, secretKey);

        const request = {
            order_amount: amount,
            order_currency: "INR",
            order_id: orderId,
            customer_details: {
                customer_id: req.user._id.toString(),
                customer_phone: customerPhone,
                customer_email: customerEmail || 'customer@buyzoin.com',
                customer_name: customerName
            },
            order_meta: {
                return_url: `${process.env.CLIENT_URL || 'https://buyzoin-back.onrender.com'}/order-success?order_id={order_id}`
            }
        };

        const response = await cashfree.PGCreateOrder(request);
        res.json(response.data);
    } catch (error) {
        console.error('Cashfree order error:', error.response?.data || error.message);
        res.status(500).json({ message: error.response?.data?.message || 'Failed to initialize payment' });
    }
});

// Create order (authenticated)
router.post('/', auth, async (req, res) => {
    try {
        const { items, total, shipping, handlingFee, grandTotal, paymentMethod, shippingAddress, notes } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'Order must have at least one item' });
        }

        const orderId = 'BZ-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 9000) + 1000);

        const order = await Order.create({
            orderId,
            user: req.user._id,
            items,
            total,
            shipping: shipping || 0,
            handlingFee: handlingFee || 0,
            grandTotal,
            paymentMethod: paymentMethod || 'cod',
            shippingAddress: shippingAddress || {},
            notes,
        });

        res.status(201).json({
            message: 'Order placed successfully',
            orderId: order.orderId,
            id: order._id,
        });
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get user's orders (authenticated)
router.get('/my-orders', auth, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json({ orders });
    } catch (error) {
        console.error('Get my orders error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all orders (admin)
router.get('/', auth, admin, async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const filter = {};

        if (status) {
            filter.status = status;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const orders = await Order.find(filter)
            .populate('user', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Order.countDocuments(filter);

        res.json({
            orders,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error('Get all orders error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get single order
router.get('/:orderId', auth, async (req, res) => {
    try {
        const order = await Order.findOne({ orderId: req.params.orderId }).populate('user', 'name email');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Check if owner or admin
        if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json({ order });
    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update order (admin)
router.put('/:id', auth, admin, async (req, res) => {
    try {
        const { status, paymentStatus, trackingNumber, courierPartner, trackingStatus } = req.body;
        const updates = {};

        if (status) updates.status = status;
        if (paymentStatus) updates.paymentStatus = paymentStatus;
        if (trackingNumber !== undefined) updates.trackingNumber = trackingNumber;
        if (courierPartner !== undefined) updates.courierPartner = courierPartner;
        if (trackingStatus !== undefined) updates.trackingStatus = trackingStatus;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }

        const order = await Order.findByIdAndUpdate(req.params.id, updates, { new: true }).populate('user', 'name email');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.json({ message: 'Order updated', order });
    } catch (error) {
        console.error('Update order error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
