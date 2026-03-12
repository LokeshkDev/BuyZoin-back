const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'mail.buyzoin.in',
    port: parseInt(process.env.EMAIL_PORT) || 465,
    secure: parseInt(process.env.EMAIL_PORT) === 465, // true for 465, false for 587
    auth: {
        user: process.env.EMAIL_USER || 'kradmin@buyzoin.in',
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false // Required for many business mail providers like BigRock
    }
});

const sendEmail = async ({ to, subject, html }) => {
    try {
        const mailOptions = {
            from: `"BuyZoin" <${process.env.EMAIL_USER || 'kradmin@buyzoin.in'}>`,
            to,
            subject,
            html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('Send Email Error:', error);
        // Important: don't throw error to prevent app crash, just log it
        return null;
    }
};

module.exports = { sendEmail };
