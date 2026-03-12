const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true,
        maxlength: 255,
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: 0,
    },
    originalPrice: {
        type: Number,
        min: 0,
    },
    description: {
        type: String,
        trim: true,
    },
    shortDescription: {
        type: String,
        maxlength: 500,
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
    },
    categorySlug: {
        type: String,
        trim: true,
    },
    images: [{
        type: String,
    }],
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
    },
    reviewsCount: {
        type: Number,
        default: 0,
    },
    stock: {
        type: Number,
        default: 0,
        min: 0,
    },
    inStock: {
        type: Boolean,
        default: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    isNewArrival: {
        type: Boolean,
        default: false,
    },
    isBestSeller: {
        type: Boolean,
        default: false,
    },
    isCustomizable: {
        type: Boolean,
        default: false,
    },
    tags: [{
        type: String,
    }],
    videoLink: {
        type: String, // Link only as requested
        trim: true,
    },
    offerText: {
        type: String,
        trim: true,
    },
    discountPercentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
    },
    sizes: [{
        type: String,
        trim: true,
    }],
    colors: [{
        type: String,
        trim: true,
    }],
    allowCustomColor: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});

// Text index for search
productSchema.index({ name: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Product', productSchema);
