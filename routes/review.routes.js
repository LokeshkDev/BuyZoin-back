const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { auth, admin } = require('../middleware/auth.middleware');

// Helper function to update product rating based on APPROVED reviews
const updateProductRating = async (productId) => {
    const reviews = await Review.find({ product: productId, isApproved: true });
    await Product.findByIdAndUpdate(productId, {
        reviewsCount: reviews.length,
        rating: reviews.length > 0
            ? reviews.reduce((acc, item) => item.rating + acc, 0) / reviews.length
            : 0
    });
};

// Get all approved reviews for a product
router.get('/product/:productId', async (req, res) => {
    try {
        const reviews = await Review.find({ product: req.params.productId, isApproved: true })
            .populate('user', 'name')
            .sort({ createdAt: -1 });
        res.json(reviews);
    } catch (error) {
        console.error('Get reviews error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin: Get all reviews (for approval)
router.get('/admin/all', auth, admin, async (req, res) => {
    try {
        const reviews = await Review.find()
            .populate('user', 'name')
            .populate('product', 'name')
            .sort({ createdAt: -1 });
        res.json(reviews);
    } catch (error) {
        console.error('Get all reviews error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin: Approve/Reject review
router.put('/:id/approve', auth, admin, async (req, res) => {
    try {
        const { isApproved } = req.body;
        const review = await Review.findByIdAndUpdate(
            req.params.id,
            { isApproved },
            { new: true }
        );

        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        // Update product rating after approval/unapproval
        await updateProductRating(review.product);

        res.json({ message: `Review ${isApproved ? 'approved' : 'unapproved'}`, review });
    } catch (error) {
        console.error('Approve review error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Check if user can review a product
router.get('/check-eligibility/:productId', auth, async (req, res) => {
    try {
        // 1. Check if user has a delivered order for this product
        const order = await Order.findOne({
            user: req.user.id,
            status: 'delivered',
            'items.productId': req.params.productId
        });

        if (!order) {
            return res.json({ canReview: false, reason: 'no-delivery' });
        }

        // 2. Check if user has already reviewed this product
        const existingReview = await Review.findOne({
            product: req.params.productId,
            user: req.user.id
        });

        if (existingReview) {
            return res.json({ canReview: false, reason: 'already-reviewed' });
        }

        res.json({ canReview: true });
    } catch (error) {
        console.error('Check eligibility error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create a review
router.post('/', auth, async (req, res) => {
    try {
        const { product, rating, comment } = req.body;

        // 1. Check if user already reviewed
        const existingReview = await Review.findOne({ product, user: req.user.id });
        if (existingReview) {
            return res.status(400).json({ message: 'You have already reviewed this product' });
        }

        // 2. Check if user has a delivered order for this product
        const order = await Order.findOne({
            user: req.user.id,
            status: 'delivered',
            'items.productId': product
        });

        if (!order) {
            return res.status(403).json({ message: 'You can only review products that have been delivered to you' });
        }

        const review = await Review.create({
            product,
            user: req.user.id,
            rating,
            comment,
            isApproved: false // Requires admin approval
        });

        res.status(201).json({ message: 'Review submitted for approval', review });
    } catch (error) {
        console.error('Create review error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete a review
router.delete('/:id', auth, async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const productId = review.product;
        const wasApproved = review.isApproved;

        await review.deleteOne();

        // If the review was approved, we need to update the rating
        if (wasApproved) {
            await updateProductRating(productId);
        }

        res.json({ message: 'Review deleted' });
    } catch (error) {
        console.error('Delete review error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
