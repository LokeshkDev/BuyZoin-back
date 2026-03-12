const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'mail.buyzoin.in',
    port: process.env.EMAIL_PORT || 465,
    secure: true, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER || 'kradmin@buyzoin.in',
        pass: process.env.EMAIL_PASS
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
        throw error;
    }
};

module.exports = { sendEmail };
