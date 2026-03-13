const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Category = require('../models/Category');

router.get('/', async (req, res) => {
    try {
        const baseUrl = (process.env.CLIENT_URL || 'https://buyzoin.in').replace(/\/$/, '');
        
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

        // Static Pages
        const staticPages = [
            { url: '/', priority: '1.0', changefreq: 'daily' },
            { url: '/shop', priority: '0.9', changefreq: 'weekly' },
            { url: '/about', priority: '0.7', changefreq: 'monthly' },
            { url: '/contact', priority: '0.7', changefreq: 'monthly' },
            { url: '/policy/shipping', priority: '0.5', changefreq: 'monthly' },
            { url: '/policy/returns', priority: '0.5', changefreq: 'monthly' },
            { url: '/policy/privacy', priority: '0.5', changefreq: 'monthly' },
            { url: '/policy/standards', priority: '0.5', changefreq: 'monthly' }
        ];

        staticPages.forEach(page => {
            xml += `  <url>\n    <loc>${baseUrl}${page.url}</loc>\n    <changefreq>${page.changefreq}</changefreq>\n    <priority>${page.priority}</priority>\n  </url>\n`;
        });

        // Categories
        const categories = await Category.find({}, 'slug');
        categories.forEach(cat => {
            xml += `  <url>\n    <loc>${baseUrl}/category/${cat.slug}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
        });

        // Products
        const products = await Product.find({}, 'slug');
        products.forEach(prod => {
            xml += `  <url>\n    <loc>${baseUrl}/product/${prod.slug}</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
        });

        xml += '</urlset>';

        res.set('Content-Type', 'application/xml');
        res.send(xml);
    } catch (error) {
        console.error('Sitemap generation error:', error);
        res.status(500).send('Error generating sitemap');
    }
});

module.exports = router;
