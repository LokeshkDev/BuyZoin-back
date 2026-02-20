const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const { auth, admin } = require('../middleware/auth.middleware');

// Get all categories (public)
router.get('/', async (req, res) => {
    try {
        const categories = await Category.find({ isActive: true }).sort({ name: 1 });
        res.json({ categories });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get category by slug (public)
router.get('/:slug', async (req, res) => {
    try {
        const category = await Category.findOne({ slug: req.params.slug });
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }
        res.json({ category });
    } catch (error) {
        console.error('Get category error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create category (admin)
router.post('/', auth, admin, async (req, res) => {
    try {
        const { name } = req.body;
        if (!req.body.slug && name) {
            req.body.slug = name.toLowerCase().replace(/[^\w ]+/g, '').replace(/ +/g, '-');
        }
        const category = await Category.create(req.body);
        res.status(201).json({ message: 'Category created', category });
    } catch (error) {
        console.error('Create category error:', error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Category with this slug already exists' });
        }
        res.status(500).json({ message: 'Server error' });
    }
});

// Update category (admin)
router.put('/:id', auth, admin, async (req, res) => {
    try {
        const { name } = req.body;
        if (name) {
            req.body.slug = name.toLowerCase().replace(/[^\w ]+/g, '').replace(/ +/g, '-');
        }
        const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }
        res.json({ message: 'Category updated', category });
    } catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete category (admin)
router.delete('/:id', auth, admin, async (req, res) => {
    try {
        const category = await Category.findByIdAndDelete(req.params.id);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }
        res.json({ message: 'Category deleted' });
    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
