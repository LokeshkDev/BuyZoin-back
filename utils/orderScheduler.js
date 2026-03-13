const Order = require('../models/Order');
const User = require('../models/User');
const { sendEmail } = require('./email');

/**
 * Automatically cancels orders that remain in a pending state for too long.
 * Designed for online payments that are abandoned or failed.
 */
const startOrderCleanupTask = () => {
    // Current time when the server starts - helps avoid touching "existing" orders as requested
    const schedulerStartTime = new Date();
    
    console.log(`🕒 Order Auto-Cancellation Task started at ${schedulerStartTime.toLocaleTimeString()}`);
    console.log(`⏱️ Online orders older than 2 minutes will be auto-cancelled (Testing Mode).`);

    // Run every minute
    setInterval(async () => {
        try {
            const timeoutMinutes = 2; 
            const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000);
            
            // 1. Find orders to cancel
            const ordersToCancel = await Order.find({
                createdAt: { 
                    $gt: schedulerStartTime, 
                    $lt: cutoffTime 
                },
                status: 'pending',
                paymentStatus: { $in: ['pending', 'failed'] },
                paymentMethod: { $in: ['upi', 'card', 'netbanking'] }
            }).populate('user', 'name email');

            if (ordersToCancel.length > 0) {
                console.log(`🔍 Found ${ordersToCancel.length} orders to auto-cancel.`);
                
                for (const order of ordersToCancel) {
                    order.status = 'cancelled';
                    order.notes = 'System: Automatically cancelled due to payment inactivity/failure (2-minute timeout).';
                    await order.save();

                    // Notify Customer
                    if (order.user && order.user.email) {
                        try {
                            await sendEmail({
                                to: order.user.email,
                                subject: `Order Cancelled: ${order.orderId}`,
                                html: `
                                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                                        <h2 style="color: #dc3545; text-align: center;">Order Cancelled</h2>
                                        <p>Hello ${order.user.name || 'Artisan Customer'},</p>
                                        <p>Your order <strong>${order.orderId}</strong> was automatically cancelled because the payment was not completed within the required timeframe.</p>
                                        <div style="background: #fdf2e9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                            <p style="margin: 0;"><strong>Order ID:</strong> ${order.orderId}</p>
                                            <p style="margin: 0;"><strong>Reason:</strong> Payment Inactivity/Failure</p>
                                        </div>
                                        <p>If this was a mistake, please visit our store again to place a new order.</p>
                                        <div style="margin-top: 30px; text-align: center;">
                                            <a href="https://buyzoin.in/shop" style="display: inline-block; background: #f0700d; color: white; padding: 12px 25px; border-radius: 30px; text-decoration: none; font-weight: bold;">Return to Shop</a>
                                        </div>
                                    </div>
                                `
                            });
                        } catch (emailErr) {
                            console.error(`Failed to send cancellation email for ${order.orderId}:`, emailErr);
                        }
                    }
                }
                console.log(`✅ Auto-cancelled and notified ${ordersToCancel.length} orders.`);
            }
        } catch (error) {
            console.error('❌ Error in auto-cancellation task:', error);
        }
    }, 60 * 1000); 
};

module.exports = { startOrderCleanupTask };
