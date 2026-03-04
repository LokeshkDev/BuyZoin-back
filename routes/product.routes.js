const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { auth, admin } = require('../middleware/auth.middleware');

// Get all products (public) — with filtering, search, sort, pagination
router.get('/', async (req, res) => {
    try {
        const { category, search, sort, page = 1, limit = 12, minPrice, maxPrice } = req.query;
        const filter = {};

        if (category) {
            filter.categorySlug = category;
        }
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { tags: { $regex: search, $options: 'i' } },
            ];
        }
        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = parseFloat(minPrice);
            if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
        }

        filter.isActive = true; // Only show active products to public

        // Sorting
        let sortOption = { createdAt: -1 };
        switch (sort) {
            case 'price-low': sortOption = { price: 1 }; break;
            case 'price-high': sortOption = { price: -1 }; break;
            case 'rating': sortOption = { rating: -1 }; break;
            case 'new': sortOption = { createdAt: -1 }; break;
            case 'bestseller': sortOption = { reviewsCount: -1 }; break;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [products, total] = await Promise.all([
            Product.find(filter)
                .sort(sortOption)
                .skip(skip)
                .limit(parseInt(limit))
                .populate('category', 'name slug'),
            Product.countDocuments(filter),
        ]);

        res.json({
            products,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get single product by slug (public)
router.get('/:slug', async (req, res) => {
    try {
        const product = await Product.findOne({ slug: req.params.slug }).populate('category', 'name slug');

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Get related products (same category, excluding current)
        const relatedProducts = await Product.find({
            categorySlug: product.categorySlug,
            _id: { $ne: product._id },
        }).limit(4);

        res.json({ product, relatedProducts });
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all products (admin only)
router.get('/admin/all', auth, admin, async (req, res) => {
    try {
        const { category, search, sort, page = 1, limit = 12 } = req.query;
        const filter = {};

        if (category) filter.categorySlug = category;
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { tags: { $regex: search, $options: 'i' } },
            ];
        }

        // Sorting
        let sortOption = { createdAt: -1 };
        switch (sort) {
            case 'price-low': sortOption = { price: 1 }; break;
            case 'price-high': sortOption = { price: -1 }; break;
            case 'rating': sortOption = { rating: -1 }; break;
            case 'new': sortOption = { createdAt: -1 }; break;
            case 'bestseller': sortOption = { reviewsCount: -1 }; break;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [products, total] = await Promise.all([
            Product.find(filter)
                .sort(sortOption)
                .skip(skip)
                .limit(parseInt(limit))
                .populate('category', 'name slug'),
            Product.countDocuments(filter),
        ]);

        res.json({
            products,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error('Get admin products error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create product (admin only)
router.post('/', auth, admin, async (req, res) => {
    try {
        const { name, category } = req.body;

        // Generate slug if not provided
        if (!req.body.slug && name) {
            req.body.slug = name.toLowerCase().replace(/[^\w ]+/g, '').replace(/ +/g, '-');
        }

        // Add categorySlug for easier filtering
        if (category) {
            const Category = require('../models/Category');
            const cat = await Category.findById(category);
            if (cat) req.body.categorySlug = cat.slug;
        }

        const product = await Product.create(req.body);
        res.status(201).json({ message: 'Product created', product });
    } catch (error) {
        console.error('Create product error:', error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Product with this slug already exists' });
        }
        res.status(500).json({ message: 'Server error' });
    }
});

// Update product (admin only)
router.put('/:id', auth, admin, async (req, res) => {
    try {
        const { name, category } = req.body;

        // Regenerate slug if name changed
        if (name) {
            req.body.slug = name.toLowerCase().replace(/[^\w ]+/g, '').replace(/ +/g, '-');
        }

        // Sync categorySlug if category changed
        if (category) {
            const Category = require('../models/Category');
            const cat = await Category.findById(category);
            if (cat) req.body.categorySlug = cat.slug;
        }

        const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.json({ message: 'Product updated', product });
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete product (admin only)
router.delete('/:id', auth, admin, async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json({ message: 'Product deleted' });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
