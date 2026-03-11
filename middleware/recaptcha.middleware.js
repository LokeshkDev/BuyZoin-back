const axios = require('axios');

const verifyRecaptcha = async (req, res, next) => {
    const recaptchaToken = req.headers['x-recaptcha-token'];

    if (!recaptchaToken) {
        return res.status(400).json({ message: 'reCAPTCHA token is required' });
    }

    try {
        const secretKey = process.env.RECAPTCHA_SECRET_KEY;
        const response = await axios.post(
            `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${recaptchaToken}`
        );

        if (response.data.success) {
            next();
        } else {
            return res.status(400).json({ message: 'reCAPTCHA verification failed' });
        }
    } catch (error) {
        console.error('reCAPTCHA verification error:', error);
        return res.status(500).json({ message: 'Server error during reCAPTCHA verification' });
    }
};

module.exports = { verifyRecaptcha };
