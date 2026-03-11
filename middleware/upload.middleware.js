const multer = require('multer');
const path = require('path');

// Storage configuration (Memory Storage for processing)
const storage = multer.memoryStorage();

// File filter to ensure only images are uploaded
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Only images (jpeg, jpg, png, webp) are allowed!'), false);
    }
};

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for original upload
    fileFilter,
});

module.exports = upload;
