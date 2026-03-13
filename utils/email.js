const nodemailer = require('nodemailer');

// Create transporter with pooling for better performance and reliability
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'mail.buyzoin.in',
    port: parseInt(process.env.EMAIL_PORT) || 465,
    secure: parseInt(process.env.EMAIL_PORT) === 465,
    pool: true, // Use pooling to keep connections open
    maxConnections: 5,
    maxMessages: 100,
    auth: {
        user: process.env.EMAIL_USER || 'kradmin@buyzoin.in',
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false 
    }
});

// Verify connection on startup
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ SMTP Connection Error:', error);
    } else {
        console.log('✅ SMTP Server is ready to take our messages');
    }
});

const sendEmail = async ({ to, subject, html }) => {
    try {
        const fromEmail = process.env.EMAIL_USER || 'kradmin@buyzoin.in';
        const mailOptions = {
            from: `"BuyZoin" <${fromEmail}>`,
            to,
            subject,
            html
        };

        console.log(`📧 Attempting to send email to: ${to} | Subject: ${subject}`);
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('❌ Send Email Failed:', error.message);
        if (error.code === 'EAUTH') {
            console.error('👉 Tip: Check your EMAIL_PASS in .env. If using Gmail, use an App Password.');
        }
        return null;
    }
};

module.exports = { sendEmail };
