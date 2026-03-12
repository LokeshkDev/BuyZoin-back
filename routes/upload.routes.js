const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const upload = require('../middleware/upload.middleware');
const { auth, admin } = require('../middleware/auth.middleware');
const s3Client = require('../config/s3.config');
const { PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

// Check if R2 is configured
const isR2Configured = process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME &&
    process.env.R2_ENDPOINT;

// Ensure local directories exist if not using R2
const getLocalDir = (folder) => {
    const dir = path.join(__dirname, `../${folder}`);
    if (!isR2Configured && !fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
};

/**
 * Image Processing Utility
 * Converts to WebP, resizes for SEO (max 1600px width), and optimizes quality
 */
const processImage = async (buffer) => {
    return await sharp(buffer)
        .resize({ width: 1600, withoutEnlargement: true }) // SEO optimized width
        .webp({ quality: 80 }) // High efficiency format
        .toBuffer();
};

/**
 * Upload Helper (R2 or Local)
 */
const performUpload = async (buffer, fieldname, targetFolder = 'assets') => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = `${fieldname}-${uniqueSuffix}.webp`; // Always use .webp for SEO
    const key = `${targetFolder}/${filename}`;

    if (isR2Configured) {
        const uploadParams = {
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key,
            Body: buffer,
            ContentType: 'image/webp',
        };
        await s3Client.send(new PutObjectCommand(uploadParams));
        
        const publicUrl = process.env.R2_PUBLIC_URL || '';
        const cleanPublicUrl = publicUrl.endsWith('/') ? publicUrl.slice(0, -1) : publicUrl;
        return { url: `${cleanPublicUrl}/${key}`, filename: key };
    } else {
        const localDir = getLocalDir(targetFolder);
        const localPath = path.join(localDir, filename);
        fs.writeFileSync(localPath, buffer);
        return { url: `/${targetFolder}/${filename}`, filename: key };
    }
};

// Upload single image with optimization
router.post('/single', auth, admin, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Optimize image before upload
        const targetFolder = req.body.folder || 'assets';
        const optimizedBuffer = await processImage(req.file.buffer);
        const result = await performUpload(optimizedBuffer, req.file.fieldname, targetFolder);

        res.json({
            message: 'Image optimized and uploaded successfully',
            url: result.url,
            filename: result.filename
        });
    } catch (error) {
        console.error('Upload optimization error:', error);
        res.status(500).json({ message: 'Upload/Optimization failed' });
    }
});

// Upload multiple images with optimization
router.post('/multiple', auth, admin, upload.array('images', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        const targetFolder = req.body.folder || 'assets';
        const uploadPromises = req.files.map(async (file) => {
            const buffer = await processImage(file.buffer);
            return performUpload(buffer, file.fieldname, targetFolder);
        });

        const results = await Promise.all(uploadPromises);
        const urls = results.map(r => r.url);

        res.json({
            message: 'Images optimized and uploaded successfully',
            urls
        });
    } catch (error) {
        console.error('Multiple upload optimization error:', error);
        res.status(500).json({ message: 'Batch upload/optimization failed' });
    }
});

// Delete image (admin only)
router.delete('/', auth, admin, async (req, res) => {
    try {
        const { filename } = req.body;
        
        if (!filename) {
            return res.status(400).json({ message: 'Filename required' });
        }

        if (isR2Configured) {
            // filename should be the full key, e.g. "categories/filename.webp"
            // If it doesn't have a folder prefix, default to assets
            const key = filename.includes('/') ? filename : `assets/${filename}`;
            
            const deleteParams = {
                Bucket: process.env.R2_BUCKET_NAME,
                Key: key,
            };
            await s3Client.send(new DeleteObjectCommand(deleteParams));
            return res.json({ message: 'Cloud file deleted successfully' });
        }

        // Local deletion
        const key = filename.includes('/') ? filename : `assets/${filename}`;
        const filePath = path.join(__dirname, `../${key}`);
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
