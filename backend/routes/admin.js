const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

// Create a transporter for sending emails
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Generate OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP endpoint
router.post('/send-otp', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        const otp = generateOTP();

        // Email options
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'OTP for Admin Registration - School Management System',
            html: `
                <h2>OTP Verification</h2>
                <p>Your OTP for admin registration is: <strong>${otp}</strong></p>
                <p>This OTP will expire in 10 minutes.</p>
                <p>If you didn't request this OTP, please ignore this email.</p>
            `
        };

        // Send email
        await transporter.sendMail(mailOptions);

        // In production, you should store the OTP securely (e.g., in Redis) with an expiration time
        // For now, we'll send it back to the frontend (not recommended for production)
        res.json({
            success: true,
            message: 'OTP sent successfully',
            otp: otp
        });

    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send OTP'
        });
    }
});

module.exports = router;
