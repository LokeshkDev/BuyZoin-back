const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { auth, admin } = require('../middleware/auth.middleware');
const { Cashfree, CFEnvironment } = require('cashfree-pg');
const { sendEmail } = require('../utils/email');


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
                return_url: `${process.env.CLIENT_URL || 'https://buyzoin.vercel.app'}/order-success?order_id={order_id}`
            }
        };

        const response = await cashfree.PGCreateOrder(request);
        res.json(response.data);
    } catch (error) {
        console.error('Cashfree order error:', error.response?.data || error.message);
        res.status(500).json({ message: error.response?.data?.message || 'Failed to initialize payment' });
    }
});

// Verify Cashfree Payment
router.post('/cashfree/verify', auth, async (req, res) => {
    try {
        const { orderId } = req.body;
        if (!orderId) return res.status(400).json({ message: 'Order ID required' });

        const settings = await Settings.findOne({ type: 'homepage' });
        const appId = settings?.payment?.cashfreeAppId || process.env.CASHFREE_APP_ID;
        const secretKey = settings?.payment?.cashfreeSecretKey || process.env.CASHFREE_SECRET_KEY;
        const isTest = settings?.payment?.isTestMode !== undefined ? settings.payment.isTestMode : (process.env.CASHFREE_ENV !== 'PRODUCTION');

        if (!appId || !secretKey) {
            return res.status(400).json({ message: 'Payment gateway configuration missing' });
        }

        const cfEnvironment = isTest ? CFEnvironment.SANDBOX : CFEnvironment.PRODUCTION;
        const cashfree = new Cashfree(cfEnvironment, appId, secretKey);

        const response = await cashfree.PGOrderFetchPayments(orderId);
        const payments = response.data || [];

        // CASE-INSENSITIVE MATCHING: Ensures BZ-2026 matches bz-2026
        const ourOrder = await Order.findOne({
            orderId: { $regex: new RegExp(`^${orderId.trim()}$`, 'i') }
        });

        if (!ourOrder) {
            console.error(`[PAYMENT ERROR] Match failed for ID: ${orderId}`);
            return res.status(404).json({ message: 'Order ID mismatch or not found' });
        }

        // Expanded Success Mapping for Production Robustness
        const isSuccessful = payments.some(p =>
            ['SUCCESS', 'PAID', 'CAPTURED'].includes(p.payment_status?.toUpperCase())
        );

        const isPending = payments.some(p =>
            ['PENDING', 'INITIALIZED', 'FLAGGED'].includes(p.payment_status?.toUpperCase())
        );

        if (isSuccessful) {
            ourOrder.paymentStatus = 'paid';
            ourOrder.status = 'processing';
            await ourOrder.save();
            
            // Send Emails
            const user = await require('../models/User').findById(ourOrder.user);
            if (user) {
                await sendOrderEmails(ourOrder, { name: user.name, email: user.email });
            }

            return res.json({ status: 'paid', orderId, message: 'Verified Success' });
        } else if (isPending) {
            ourOrder.paymentStatus = 'pending';
            await ourOrder.save();
            return res.json({ status: 'pending', orderId, message: 'Awaiting Bank Confirmation' });
        } else if (payments.length > 0) {
            // Only fail if we actually have payment attempts and they are all failures
            ourOrder.paymentStatus = 'failed';
            await ourOrder.save();
            return res.json({ status: 'failed', orderId, message: 'Payment Unsuccessful' });
        } else {
            // No payment attempts seen yet - Keep as pending
            return res.json({ status: 'pending', orderId, message: 'No payment detected yet' });
        }
    } catch (error) {
        console.error('CRITICAL: Cashfree Verification Error:', error.response?.data || error.message);
        res.status(500).json({ message: 'Internal verification systems error. Please refresh.' });
    }
});

const sendOrderEmails = async (order, user) => {
    try {
        const orderDate = new Date(order.createdAt).toLocaleDateString();
        const itemsHtml = order.items.map(item => {
            let details = '';
            if (item.customization && typeof item.customization === 'object') {
                if (item.customization.size) details += ` | Size: ${item.customization.size}`;
                if (item.customization.color) details += ` | Color: ${item.customization.color}`;
                if (item.customization.text) details += ` | Notes: ${item.customization.text}`;
            } else if (item.customization) {
                details += ` | Notes: ${item.customization}`;
            }
            return `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">
                    <strong>${item.name}</strong> x ${item.quantity}
                    <div style="font-size: 11px; color: #666; margin-top: 4px;">${details}</div>
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${(item.price * item.quantity).toLocaleString()}</td>
            </tr>
        `}).join('');

        const orderSummaryHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #f0700d; text-align: center;">Order Confirmed!</h2>
                <p>Hello ${user.name || 'Artisan Customer'},</p>
                <p>Thank you for your order. We've received your request and our artisans are starting to prepare it.</p>
                
                <div style="background: #fdf2e9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0;"><strong>Order ID:</strong> ${order.orderId}</p>
                    <p style="margin: 0;"><strong>Date:</strong> ${orderDate}</p>
                    <p style="margin: 0;"><strong>Payment Method:</strong> ${order.paymentMethod.toUpperCase()}</p>
                    <p style="margin: 0;"><strong>Status:</strong> ${order.paymentStatus.toUpperCase()}</p>
                </div>

                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f8f8f8;">
                            <th style="padding: 10px; text-align: left;">Item</th>
                            <th style="padding: 10px; text-align: right;">Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                        <tr>
                            <td style="padding: 10px; font-weight: bold;">Subtotal</td>
                            <td style="padding: 10px; text-align: right;">₹${order.total.toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; font-weight: bold;">Shipping</td>
                            <td style="padding: 10px; text-align: right;">₹${order.shipping.toLocaleString()}</td>
                        </tr>
                        <tr style="background: #fdf2e9;">
                            <td style="padding: 10px; font-weight: bold; color: #f0700d;">Grand Total</td>
                            <td style="padding: 10px; text-align: right; font-weight: bold; color: #f0700d; font-size: 18px;">₹${order.grandTotal.toLocaleString()}</td>
                        </tr>
                    </tbody>
                </table>

                <div style="margin-top: 30px; padding: 15px; border: 1px solid #eee; border-radius: 8px;">
                    <h4 style="margin-top: 0;">Shipping Address</h4>
                    <p style="margin: 0;">${order.shippingAddress.firstName} ${order.shippingAddress.lastName}</p>
                    <p style="margin: 0;">${order.shippingAddress.address}</p>
                    <p style="margin: 0;">${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}</p>
                </div>
            </div>
        `;

        // To Customer
        await sendEmail({
            to: user.email,
            subject: `Order Confirmed: ${order.orderId}`,
            html: orderSummaryHtml
        });

        // To Admin
        await sendEmail({
            to: process.env.ADMIN_EMAIL || 'kradmin@buyzoin.in',
            subject: `New Order Received: ${order.orderId}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2 style="color: #f0700d;">New Order Alert</h2>
                    <p>A new order has been placed on BuyZoin.</p>
                    <p><strong>Customer:</strong> ${user.name} (${user.email})</p>
                    <hr/>
                    ${orderSummaryHtml}
                </div>
            `
        });
    } catch (err) {
        console.error('Order email notification failed:', err);
    }
};

// Create order (authenticated)
router.post('/', auth, async (req, res) => {
    try {
        const { orderId: providedOrderId, items, total, shipping, handlingFee, grandTotal, paymentMethod, shippingAddress, notes, paymentStatus } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'Order must have at least one item' });
        }

        // Use provided orderId if available (for Cashfree sync), otherwise generate new (for COD)
        const orderId = providedOrderId || ('BZ-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 9000) + 1000));

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
            paymentStatus: paymentStatus || 'pending'
        });

        // If COD, send emails immediately. For Online, it will be sent after verification.
        if (order.paymentMethod === 'cod') {
            await sendOrderEmails(order, { name: req.user.name, email: req.user.email });
        }

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

const sendStatusUpdateEmails = async (order) => {
    try {
        const user = order.user;
        if (!user || !user.email) return;

        const statusColors = {
            'pending': '#ffc107',
            'processing': '#0dcaf0',
            'shipped': '#fd7e14',
            'delivered': '#198754',
            'cancelled': '#dc3545'
        };

        const statusColor = statusColors[order.status] || '#f0700d';
        
        const statusHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: ${statusColor}; text-align: center;">Order Status Update</h2>
                <p>Hello ${user.name || 'Artisan Customer'},</p>
                <p>The status of your order <strong>${order.orderId}</strong> has been updated.</p>
                
                <div style="background: #fdf2e9; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center;">
                    <p style="margin: 0; font-size: 14px; text-transform: uppercase; color: #666;">Current Status</p>
                    <h1 style="margin: 5px 0; color: ${statusColor};">${order.status.toUpperCase()}</h1>
                </div>

                ${order.status === 'shipped' ? `
                <div style="margin-top: 20px; padding: 15px; border: 1px solid #eee; border-radius: 8px; background: #fff;">
                    <h4 style="margin: 0 0 10px 0; color: #f0700d;">Shipping Manifest</h4>
                    <p style="margin: 3px 0;"><strong>Courier:</strong> ${order.courierPartner || 'Artisan Delivery'}</p>
                    <p style="margin: 3px 0;"><strong>Tracking ID:</strong> ${order.trackingNumber || 'Awaiting Sync'}</p>
                </div>
                ` : ''}

                <div style="margin-top: 30px; text-align: center;">
                    <a href="${process.env.CLIENT_URL || 'https://buyzoin.in'}/account" style="display: inline-block; background: #f0700d; color: white; padding: 12px 25px; border-radius: 30px; text-decoration: none; font-weight: bold;">Track on Website</a>
                </div>
                
                <p style="margin-top: 30px; font-size: 12px; color: #999;">If you have any questions, please contact us at ${process.env.ADMIN_EMAIL || 'kradmin@buyzoin.in'}</p>
            </div>
        `;

        // To Customer
        await sendEmail({
            to: user.email,
            subject: `Update on Order ${order.orderId}: ${order.status.toUpperCase()}`,
            html: statusHtml
        });

        // To Admin
        await sendEmail({
            to: process.env.ADMIN_EMAIL || 'kradmin@buyzoin.in',
            subject: `Status Updated: ${order.orderId} is now ${order.status}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2 style="color: #f0700d;">Admin Status Alert</h2>
                    <p>Order <strong>${order.orderId}</strong> has been moved to <strong>${order.status}</strong>.</p>
                    <p><strong>Customer:</strong> ${user.name} (${user.email})</p>
                    ${order.trackingNumber ? `<p><strong>Tracking:</strong> ${order.trackingNumber} (${order.courierPartner})</p>` : ''}
                </div>
            `
        });
    } catch (err) {
        console.error('Status update email failed:', err);
    }
};

// Update order (admin)
router.put('/:id', auth, admin, async (req, res) => {
    try {
        const { status, paymentStatus, trackingNumber, courierPartner, trackingStatus } = req.body;
        
        // 1. Get original order to see if it exists and to check for changes
        const originalOrder = await Order.findById(req.params.id);
        if (!originalOrder) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const updates = {};
        let shouldNotify = false;

        if (status && status !== originalOrder.status) {
            updates.status = status;
            shouldNotify = true;
        }
        if (paymentStatus) updates.paymentStatus = paymentStatus;
        
        if (trackingNumber !== undefined && trackingNumber !== originalOrder.trackingNumber) {
            updates.trackingNumber = trackingNumber;
            shouldNotify = true;
        }
        if (courierPartner !== undefined && courierPartner !== originalOrder.courierPartner) {
            updates.courierPartner = courierPartner;
            shouldNotify = true;
        }
        if (trackingStatus !== undefined) updates.trackingStatus = trackingStatus;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: 'No fields changed' });
        }

        const order = await Order.findByIdAndUpdate(req.params.id, updates, { new: true }).populate('user', 'name email');

        // 2. If status or tracking changed, send notification emails
        if (shouldNotify) {
            await sendStatusUpdateEmails(order);
        }

        res.json({ message: 'Order updated', order });
    } catch (error) {
        console.error('Update order error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete order (admin)
router.delete('/:id', auth, admin, async (req, res) => {
    try {
        const order = await Order.findByIdAndDelete(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        res.json({ message: 'Order deleted successfully' });
    } catch (error) {
        console.error('Delete order error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Auto-Sync Pending Payments (Admin)
router.post('/autosync', auth, admin, async (req, res) => {
    try {
        const pendingOrders = await Order.find({ 
            paymentStatus: 'pending', 
            paymentMethod: { $ne: 'cod' },
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
        });

        if (pendingOrders.length === 0) {
            return res.json({ message: 'No recent pending online orders to sync' });
        }

        const settings = await Settings.findOne({ type: 'homepage' });
        const appId = settings?.payment?.cashfreeAppId || process.env.CASHFREE_APP_ID;
        const secretKey = settings?.payment?.cashfreeSecretKey || process.env.CASHFREE_SECRET_KEY;
        const isTest = settings?.payment?.isTestMode !== undefined ? settings.payment.isTestMode : (process.env.CASHFREE_ENV !== 'PRODUCTION');

        if (!appId || !secretKey) {
            return res.status(400).json({ message: 'Payment gateway configuration missing' });
        }

        const cfEnvironment = isTest ? CFEnvironment.SANDBOX : CFEnvironment.PRODUCTION;
        const cashfree = new Cashfree(cfEnvironment, appId, secretKey);

        let syncCount = 0;

        for (const order of pendingOrders) {
            try {
                const response = await cashfree.PGOrderFetchPayments(order.orderId);
                const payments = response.data || [];
                
                const isSuccessful = payments.some(p => 
                    ['SUCCESS', 'PAID', 'CAPTURED'].includes(p.payment_status?.toUpperCase())
                );

                if (isSuccessful) {
                    order.paymentStatus = 'paid';
                    order.status = 'processing';
                    await order.save();
                    
                    const user = await require('../models/User').findById(order.user);
                    if (user) {
                        await sendOrderEmails(order, user);
                    }
                    syncCount++;
                }
            } catch (err) {
                console.error(`Sync failed for order ${order.orderId}:`, err.message);
            }
        }

        res.json({ message: `Sync complete. Updated ${syncCount} orders.` });
    } catch (error) {
        console.error('AutoSync Error:', error);
        res.status(500).json({ message: 'Synchronization error' });
    }
});

module.exports = router;
