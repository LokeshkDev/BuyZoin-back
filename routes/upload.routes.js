const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload.middleware');
const { auth, admin } = require('../middleware/auth.middleware');

// Upload single image
router.post('/single', auth, admin, upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Construct the URL
        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

        res.json({
            message: 'Upload successful',
            url: fileUrl,
            filename: req.file.filename
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ message: 'Upload failed' });
    }
});

// Upload multiple images
router.post('/multiple', auth, admin, upload.array('images', 5), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        const urls = req.files.map(file => `${req.protocol}://${req.get('host')}/uploads/${file.filename}`);

        res.json({
            message: 'Upload successful',
            urls
        });
    } catch (error) {
        console.error('Multiple upload error:', error);
        res.status(500).json({ message: 'Upload failed' });
    }
});

module.exports = router;
