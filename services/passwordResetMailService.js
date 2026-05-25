// services/passwordResetMailService.js
const nodemailer = require("nodemailer");

const sendPasswordResetOtp = async (toEmail, otp, username) => {
    try {
        // Create transporter
        const transporter = nodemailer.createTransport({
            service: "gmail", // or your email service
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        // Email HTML content for password reset
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Password Reset - UniGrievance</title>
                <style>
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        margin: 0;
                        padding: 0;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                        background-color: #f8f9fa;
                    }
                    .header {
                        background-color: #1e3a8a;
                        color: white;
                        padding: 20px;
                        text-align: center;
                        border-radius: 10px 10px 0 0;
                    }
                    .content {
                        background-color: white;
                        padding: 30px;
                        border-radius: 0 0 10px 10px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    }
                    .otp-box {
                        background-color: #f3f4f6;
                        padding: 20px;
                        text-align: center;
                        border-radius: 8px;
                        margin: 20px 0;
                        border: 1px solid #e5e7eb;
                    }
                    .otp-code {
                        font-size: 36px;
                        font-weight: bold;
                        color: #1e3a8a;
                        letter-spacing: 8px;
                        font-family: monospace;
                    }
                    .warning {
                        background-color: #fef3c7;
                        border-left: 4px solid #f59e0b;
                        padding: 15px;
                        margin: 20px 0;
                        border-radius: 5px;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 30px;
                        padding-top: 20px;
                        border-top: 1px solid #e5e7eb;
                        color: #6b7280;
                        font-size: 12px;
                    }
                    .button {
                        display: inline-block;
                        background-color: #1e3a8a;
                        color: white;
                        text-decoration: none;
                        padding: 12px 24px;
                        border-radius: 5px;
                        margin: 20px 0;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔐 Password Reset Request</h1>
                    </div>
                    <div class="content">
                        <p>Dear Student,</p>
                        
                        <p>We received a request to reset your password for your UniGrievance account.</p>
                        
                        <div class="otp-box">
                            <p style="margin: 0 0 10px 0; color: #6b7280;">Your One-Time Password (OTP) for password reset is:</p>
                            <div class="otp-code">${otp}</div>
                            <p style="margin: 10px 0 0 0; font-size: 12px; color: #6b7280;">This OTP is valid for 5 minutes</p>
                        </div>
                        
                        <div class="warning">
                            <strong>⚠️ Security Alert:</strong>
                            <p style="margin: 5px 0 0 0; font-size: 14px;">If you did not request a password reset, please ignore this email. Your account is safe.</p>
                        </div>
                        
                        <p><strong>Registration Number:</strong> ${username}</p>
                        
                        <p>For security reasons, never share this OTP with anyone. UniGrievance staff will never ask for your OTP.</p>
                        
                        <div style="text-align: center;">
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/student-login" class="button">Go to Login</a>
                        </div>
                        
                        <hr style="margin: 20px 0; border-color: #e5e7eb;">
                        
                        <p style="font-size: 14px; color: #6b7280;">
                            <strong>Need help?</strong> Contact our support team at support@unigrievance.com
                        </p>
                    </div>
                    <div class="footer">
                        <p>&copy; 2024 UniGrievance. All rights reserved.</p>
                        <p>This is an automated message, please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        // Email options
        const mailOptions = {
            from: `"UniGrievance Support" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: "🔐 Password Reset Request - UniGrievance",
            html: htmlContent
        };

        // Send email
        await transporter.sendMail(mailOptions);

        console.log(`Password reset OTP sent to ${toEmail}`);
        return true;

    } catch (error) {
        console.error("Error sending password reset email:", error);
        throw error;
    }
};

module.exports = sendPasswordResetOtp;