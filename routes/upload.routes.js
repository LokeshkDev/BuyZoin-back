const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const upload = require('../middleware/upload.middleware');
const { auth, admin } = require('../middleware/auth.middleware');

// Upload single image
router.post('/single', auth, admin, upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Return only the relative path — frontend will build the full URL
        const fileUrl = `/assets/${req.file.filename}`;

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

        // Return only the relative paths
        const urls = req.files.map(file => `/assets/${file.filename}`);

        res.json({
            message: 'Upload successful',
            urls
        });
    } catch (error) {
        console.error('Multiple upload error:', error);
        res.status(500).json({ message: 'Upload failed' });
    }
});

// Delete image (admin only)
router.delete('/:filename', auth, admin, (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path.join(__dirname, '../assets', filename);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            res.json({ message: 'File deleted successfully' });
        } else {
            res.status(404).json({ message: 'File not found' });
        }
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ message: 'Delete failed' });
    }
});

module.exports = router;
