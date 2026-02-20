const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    slug: String,
    price: Number,
    quantity: { type: Number, min: 1 },
    image: String,
    customization: String,
}, { _id: false });

const shippingAddressSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    address: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' },
    phone: String,
    email: String,
}, { _id: false });

const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: true,
        unique: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    items: [orderItemSchema],
    total: {
        type: Number,
        required: true,
        min: 0,
    },
    shipping: {
        type: Number,
        default: 0,
    },
    grandTotal: {
        type: Number,
        required: true,
        min: 0,
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
        default: 'pending',
    },
    paymentMethod: {
        type: String,
        enum: ['upi', 'card', 'netbanking', 'cod'],
        default: 'cod',
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed'],
        default: 'pending',
    },
    shippingAddress: shippingAddressSchema,
    notes: String,
}, {
    timestamps: true,
});

module.exports = mongoose.model('Order', orderSchema);
