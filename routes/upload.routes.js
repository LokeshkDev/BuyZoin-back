const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const upload = require('../middleware/upload.middleware');
const { auth, admin } = require('../middleware/auth.middleware');
const s3Client = require('../config/s3.config');
const { DeleteObjectCommand } = require('@aws-sdk/client-s3');

const isR2Configured = process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME &&
    process.env.R2_ENDPOINT;

const getFileUrl = (file) => {
    if (isR2Configured) {
        // If R2 is configured, multer-s3 provides 'key'
        const publicUrl = process.env.R2_PUBLIC_URL || '';
        const cleanPublicUrl = publicUrl.endsWith('/') ? publicUrl.slice(0, -1) : publicUrl;
        return `${cleanPublicUrl}/${file.key}`;
    }
    // Local fallback
    return `/assets/${file.filename}`;
};

// Upload single image
router.post('/single', auth, admin, upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const fileUrl = getFileUrl(req.file);

        res.json({
            message: 'Upload successful',
            url: fileUrl,
            filename: isR2Configured ? req.file.key : req.file.filename
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

        const urls = req.files.map(file => getFileUrl(file));

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
router.delete('/:filename', auth, admin, async (req, res) => {
    try {
        const { filename } = req.params;

        if (isR2Configured) {
            // filename here is likely the key if coming from frontend
            const deleteParams = {
                Bucket: process.env.R2_BUCKET_NAME,
                Key: filename,
            };
            await s3Client.send(new DeleteObjectCommand(deleteParams));
            return res.json({ message: 'Cloud file deleted successfully' });
        }

        const filePath = path.join(__dirname, '../assets', filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            res.json({ message: 'Local file deleted successfully' });
        } else {
            res.status(404).json({ message: 'File not found' });
        }
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ message: 'Delete failed' });
    }
});

module.exports = router;
