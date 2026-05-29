const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// EXISTING SIGNUP EMAIL - KEPT EXACTLY THE SAME
const sendEmail = async (to, otp) => {
    await transporter.sendMail({
        from: `"UniGrievance System" <${process.env.EMAIL_USER}>`,
        to,
        subject: "UniGrievance - Email Verification OTP",
        html: `
        <div style="font-family: Arial, sans-serif; background-color: #f4f6f9; padding: 40px 0;">
            <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); overflow: hidden;">
                
                <!-- Header -->
                <div style="background-color: #1e3a8a; padding: 20px; text-align: center;">
                    <h2 style="color: #ffffff; margin: 0;">UniGrievance Portal</h2>
                </div>

                <!-- Body -->
                <div style="padding: 30px; color: #333;">
                    <h3 style="margin-top: 0;">Email Verification Required</h3>
                    
                    <p>
                        Dear Student,
                    </p>

                    <p>
                        Thank you for registering with the <strong>UniGrievance Management System</strong>.
                        To complete your account registration, please verify your email address using the One-Time Password (OTP) provided below.
                    </p>

                    <!-- OTP Box -->
                    <div style="text-align: center; margin: 30px 0;">
                        <div style="
                            display: inline-block;
                            background-color: #f1f5f9;
                            padding: 15px 30px;
                            font-size: 28px;
                            letter-spacing: 5px;
                            font-weight: bold;
                            color: #1e3a8a;
                            border-radius: 8px;
                            border: 2px dashed #1e3a8a;
                        ">
                            ${otp}
                        </div>
                    </div>

                    <p>
                        This OTP is valid for <strong>5 minutes</strong>. Please do not share this code with anyone for security reasons.
                    </p>

                    <p>
                        If you did not request this verification, please ignore this email.
                    </p>

                    <br/>

                    <p>
                        Regards,<br/>
                        <strong>UniGrievance Support Team</strong><br/>
                        University Complaint Management System
                    </p>
                </div>

                <!-- Footer -->
                <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #666;">
                    © ${new Date().getFullYear()} UniGrievance System. All rights reserved.
                </div>

            </div>
        </div>
        `
    });
};

// ADMIN LOGIN EMAIL
const sendLoginEmail = async (email, username) => {
    const loginTime = new Date().toLocaleString('en-US', {
        dateStyle: 'full',
        timeStyle: 'medium'
    });

    await transporter.sendMail({
        from: `"UniGrievance System" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "UniGrievance - Admin Login Notification",
        html: `
        <div style="font-family: Arial, sans-serif; background-color: #f4f6f9; padding: 40px 0;">
            <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); overflow: hidden;">
                
                <!-- Header -->
                <div style="background-color: #1e3a8a; padding: 20px; text-align: center;">
                    <h2 style="color: #ffffff; margin: 0;">UniGrievance Portal</h2>
                </div>

                <!-- Body -->
                <div style="padding: 30px; color: #333;">
                    <h3 style="margin-top: 0; color: #1e3a8a;">Admin Login Notification</h3>
                    
                    <p>
                        Dear Admin,
                    </p>

                    <p>
                        Your <strong>UniGrievance administrator account</strong> has been successfully logged into.
                    </p>

                    <!-- Login Details Box -->
                    <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #1e3a8a;">
                        <p style="margin: 8px 0;"><strong>👤 Username:</strong> ${username}</p>
                        <p style="margin: 8px 0;"><strong>⏰ Login Time:</strong> ${loginTime}</p>
                        <p style="margin: 8px 0;"><strong>🌐 System:</strong> UniGrievance Admin Panel</p>
                    </div>

                    <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                        <strong>✅ If this was you:</strong>
                        <p style="margin: 5px 0 0 0; color: #555;">No action is required. You can safely ignore this notification.</p>
                    </div>

                    <div style="background-color: #fee2e2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
                        <strong>⚠️ If this wasn't you:</strong>
                        <p style="margin: 5px 0 0 0; color: #555;">Please secure your account immediately by changing your password and contact super admin.</p>
                    </div>

                    <br/>

                    <p>
                        Regards,<br/>
                        <strong>UniGrievance Support Team</strong><br/>
                        University Complaint Management System
                    </p>
                </div>

                <!-- Footer -->
                <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #666;">
                    © ${new Date().getFullYear()} UniGrievance System. All rights reserved.
                </div>

            </div>
        </div>
        `
    });
};

// STUDENT LOGIN EMAIL
const sendStudentLoginEmail = async (email, username) => {
    const loginTime = new Date().toLocaleString('en-US', {
        dateStyle: 'full',
        timeStyle: 'medium'
    });

    await transporter.sendMail({
        from: `"UniGrievance System" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "UniGrievance - Student Login Notification",
        html: `
        <div style="font-family: Arial, sans-serif; background-color: #f4f6f9; padding: 40px 0;">
            <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); overflow: hidden;">
                
                <!-- Header -->
                <div style="background-color: #059669; padding: 20px; text-align: center;">
                    <h2 style="color: #ffffff; margin: 0;">UniGrievance Portal</h2>
                </div>

                <!-- Body -->
                <div style="padding: 30px; color: #333;">
                    <h3 style="margin-top: 0; color: #059669;">Student Login Notification</h3>
                    
                    <p>
                        Dear Student,
                    </p>

                    <p>
                        Your <strong>UniGrievance student account</strong> has been successfully logged into.
                    </p>

                    <!-- Login Details Box -->
                    <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #059669;">
                        <p style="margin: 8px 0;"><strong>📋 Registration Number:</strong> ${username}</p>
                        <p style="margin: 8px 0;"><strong>⏰ Login Time:</strong> ${loginTime}</p>
                        <p style="margin: 8px 0;"><strong>🌐 Portal:</strong> UniGrievance Student Portal</p>
                    </div>

                    <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                        <strong>✅ If this was you:</strong>
                        <p style="margin: 5px 0 0 0; color: #555;">No action is required. You can safely ignore this notification.</p>
                    </div>

                    <div style="background-color: #fee2e2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
                        <strong>⚠️ If this wasn't you:</strong>
                        <p style="margin: 5px 0 0 0; color: #555;">Please reset your password immediately and contact support.</p>
                    </div>

                    <br/>

                    <p>
                        Regards,<br/>
                        <strong>UniGrievance Support Team</strong><br/>
                        University Complaint Management System
                    </p>
                </div>

                <!-- Footer -->
                <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #666;">
                    © ${new Date().getFullYear()} UniGrievance System. All rights reserved.
                </div>

            </div>
        </div>
        `
    });
};

// STUDENT PASSWORD RESET OTP EMAIL
const sendPasswordResetOtp = async (email, otp, username) => {
    await transporter.sendMail({
        from: `"UniGrievance System" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "UniGrievance - Password Reset OTP",
        html: `
        <div style="font-family: Arial, sans-serif; background-color: #f4f6f9; padding: 40px 0;">
            <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); overflow: hidden;">
                
                <!-- Header -->
                <div style="background-color: #dc2626; padding: 20px; text-align: center;">
                    <h2 style="color: #ffffff; margin: 0;">UniGrievance Portal</h2>
                </div>

                <!-- Body -->
                <div style="padding: 30px; color: #333;">
                    <h3 style="margin-top: 0; color: #dc2626;">Password Reset Request</h3>
                    
                    <p>
                        Dear Student,
                    </p>

                    <p>
                        We received a request to reset your password for your <strong>UniGrievance account</strong>.
                        Please use the One-Time Password (OTP) provided below to proceed with password reset.
                    </p>

                    <!-- OTP Box -->
                    <div style="text-align: center; margin: 30px 0;">
                        <div style="
                            display: inline-block;
                            background-color: #f1f5f9;
                            padding: 15px 30px;
                            font-size: 28px;
                            letter-spacing: 5px;
                            font-weight: bold;
                            color: #dc2626;
                            border-radius: 8px;
                            border: 2px dashed #dc2626;
                        ">
                            ${otp}
                        </div>
                    </div>

                    <!-- Account Details Box -->
                    <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #dc2626;">
                        <p style="margin: 8px 0;"><strong>📋 Registration Number:</strong> ${username}</p>
                        <p style="margin: 8px 0;"><strong>⏰ Request Time:</strong> ${new Date().toLocaleString()}</p>
                    </div>

                    <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                        <strong>⚠️ Didn't request this?</strong>
                        <p style="margin: 5px 0 0 0; color: #555;">If you did not request a password reset, please ignore this email. Your account is safe.</p>
                    </div>

                    <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <strong style="color: #059669;">🔒 Security Tips:</strong>
                        <ul style="margin: 10px 0 0 20px; color: #555;">
                            <li>Never share this OTP with anyone</li>
                            <li>UniGrievance staff will never ask for your OTP</li>
                            <li>Use a strong, unique password for your account</li>
                            <li>This OTP is valid for 5 minutes only</li>
                        </ul>
                    </div>

                    <br/>

                    <p>
                        Regards,<br/>
                        <strong>UniGrievance Support Team</strong><br/>
                        University Complaint Management System
                    </p>
                </div>

                <!-- Footer -->
                <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #666;">
                    © ${new Date().getFullYear()} UniGrievance System. All rights reserved.
                </div>

            </div>
        </div>
        `
    });
};

// ADMIN PASSWORD RESET OTP EMAIL
const sendAdminResetOtpEmail = async (email, otp, username) => {
    await transporter.sendMail({
        from: `"UniGrievance System" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "UniGrievance - Admin Password Reset OTP",
        html: `
        <div style="font-family: Arial, sans-serif; background-color: #f4f6f9; padding: 40px 0;">
            <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); overflow: hidden;">
                
                <!-- Header -->
                <div style="background-color: #1e3a8a; padding: 20px; text-align: center;">
                    <h2 style="color: #ffffff; margin: 0;">UniGrievance Portal</h2>
                </div>

                <!-- Body -->
                <div style="padding: 30px; color: #333;">
                    <h3 style="margin-top: 0; color: #1e3a8a;">Admin Password Reset Request</h3>
                    
                    <p>
                        Dear Admin,
                    </p>

                    <p>
                        We received a request to reset your password for your <strong>UniGrievance admin account</strong>.
                        Please use the One-Time Password (OTP) provided below to proceed with password reset.
                    </p>

                    <!-- OTP Box -->
                    <div style="text-align: center; margin: 30px 0;">
                        <div style="
                            display: inline-block;
                            background-color: #f1f5f9;
                            padding: 15px 30px;
                            font-size: 28px;
                            letter-spacing: 5px;
                            font-weight: bold;
                            color: #1e3a8a;
                            border-radius: 8px;
                            border: 2px dashed #1e3a8a;
                        ">
                            ${otp}
                        </div>
                    </div>

                    <!-- Account Details -->
                    <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1e3a8a;">
                        <p style="margin: 5px 0;"><strong>👤 Username:</strong> ${username}</p>
                        <p style="margin: 5px 0;"><strong>⏰ Request Time:</strong> ${new Date().toLocaleString()}</p>
                    </div>

                    <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                        <strong>⚠️ Didn't request this?</strong>
                        <p style="margin: 5px 0 0 0; color: #555;">If you did not request a password reset, please ignore this email. Your account is safe.</p>
                    </div>

                    <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <strong style="color: #059669;">🔒 Security Tips:</strong>
                        <ul style="margin: 10px 0 0 20px; color: #555;">
                            <li>Never share this OTP with anyone</li>
                            <li>UniGrievance staff will never ask for your OTP</li>
                            <li>Use a strong, unique password for your account</li>
                            <li>This OTP is valid for 5 minutes only</li>
                        </ul>
                    </div>

                    <br/>

                    <p>
                        Regards,<br/>
                        <strong>UniGrievance Support Team</strong><br/>
                        University Complaint Management System
                    </p>
                </div>

                <!-- Footer -->
                <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #666;">
                    © ${new Date().getFullYear()} UniGrievance System. All rights reserved.
                </div>

            </div>
        </div>
        `
    });
};
const sendAdminMessageEmail = async (toEmail, studentName, subject, message, adminName, emailType = "general") => {
    const emailTypeColors = {
        general: { bg: "#1e3a8a", border: "#1e3a8a", icon: "📢" },
        academic: { bg: "#059669", border: "#059669", icon: "📚" },
        disciplinary: { bg: "#dc2626", border: "#dc2626", icon: "⚠️" },
        event: { bg: "#7c3aed", border: "#7c3aed", icon: "🎉" }
    };

    const typeConfig = emailTypeColors[emailType] || emailTypeColors.general;

    await transporter.sendMail({
        from: `"UniGrievance System" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: `${typeConfig.icon} ${subject}`,
        html: `
        <div style="font-family: Arial, sans-serif; background-color: #f4f6f9; padding: 40px 0;">
            <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); overflow: hidden;">
                
                <!-- Header -->
                <div style="background-color: ${typeConfig.bg}; padding: 20px; text-align: center;">
                    <h2 style="color: #ffffff; margin: 0;">UniGrievance Portal</h2>
                    <p style="color: #ffffff; margin: 5px 0 0 0; opacity: 0.9;">Official Communication</p>
                </div>

                <!-- Body -->
                <div style="padding: 30px; color: #333;">
                    <h3 style="margin-top: 0; color: ${typeConfig.bg};">Message from Administration</h3>
                    
                    <p>
                        Dear <strong>${studentName}</strong>,
                    </p>

                    <p>
                        You have received an official communication from the university administration.
                    </p>

                    <!-- Message Box -->
                    <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${typeConfig.border};">
                        <p style="margin: 0; white-space: pre-line; line-height: 1.6;">${message}</p>
                    </div>

                    <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <strong style="color: #059669;">📌 Important:</strong>
                        <p style="margin: 5px 0 0 0; font-size: 14px; color: #555;">
                            Please review this message carefully. If you have any questions, contact your department office.
                        </p>
                    </div>

                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                        <p style="margin: 5px 0; font-size: 14px;">
                            <strong>Regards,</strong><br/>
                            ${adminName}<br/>
                            <span style="color: #6b7280;">University Administration</span>
                        </p>
                    </div>
                </div>

                <!-- Footer -->
                <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #666;">
                    <p style="margin: 5px 0;">This is an automated message from the UniGrievance System.</p>
                    <p style="margin: 5px 0;">Please do not reply to this email. For queries, contact your department office.</p>
                    <p style="margin: 5px 0;">© ${new Date().getFullYear()} UniGrievance System. All rights reserved.</p>
                </div>

            </div>
        </div>
        `
    });
};

// Add this to your mailService.js file

const sendAdminDirectEmail = async (toEmail, adminName, subject, message, sentBy, emailType = "general") => {
    const emailTypeColors = {
        general: { bg: "#1e3a8a", border: "#1e3a8a", icon: "📢" },
        administrative: { bg: "#7c3aed", border: "#7c3aed", icon: "👥" },
        meeting: { bg: "#059669", border: "#059669", icon: "📅" }
    };

    const typeConfig = emailTypeColors[emailType] || emailTypeColors.general;

    await transporter.sendMail({
        from: `"UniGrievance System" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: `${typeConfig.icon} ${subject}`,
        html: `
        <div style="font-family: Arial, sans-serif; background-color: #f4f6f9; padding: 40px 0;">
            <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); overflow: hidden;">
                
                <!-- Header -->
                <div style="background-color: ${typeConfig.bg}; padding: 20px; text-align: center;">
                    <h2 style="color: #ffffff; margin: 0;">UniGrievance Portal</h2>
                    <p style="color: #ffffff; margin: 5px 0 0 0; opacity: 0.9;">Official Communication</p>
                </div>

                <!-- Body -->
                <div style="padding: 30px; color: #333;">
                    <h3 style="margin-top: 0; color: ${typeConfig.bg};">Message from Administration</h3>
                    
                    <p>
                        Dear <strong>${adminName}</strong>,
                    </p>

                    <p>
                        You have received an official communication from the higher administration.
                    </p>

                    <!-- Message Box -->
                    <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${typeConfig.border};">
                        <p style="margin: 0; white-space: pre-line; line-height: 1.6;">${message}</p>
                    </div>

                    <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <strong style="color: #059669;">📌 Important:</strong>
                        <p style="margin: 5px 0 0 0; font-size: 14px; color: #555;">
                            Please review this message carefully and take necessary action if required.
                        </p>
                    </div>

                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                        <p style="margin: 5px 0; font-size: 14px;">
                            <strong>Regards,</strong><br/>
                            ${sentBy}<br/>
                            <span style="color: #6b7280;">Higher Administration</span>
                        </p>
                        <p style="margin: 5px 0; font-size: 12px; color: #6b7280;">
                            Sent on: ${new Date().toLocaleString()}
                        </p>
                    </div>
                </div>

                <!-- Footer -->
                <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #666;">
                    <p style="margin: 5px 0;">This is an official communication from the UniGrievance System.</p>
                    <p style="margin: 5px 0;">Please do not reply to this email. For queries, contact the higher administration.</p>
                    <p style="margin: 5px 0;">© ${new Date().getFullYear()} UniGrievance System. All rights reserved.</p>
                </div>

            </div>
        </div>
        `
    });
};

// Then update your module.exports at the bottom of the file to include the new function:
module.exports = {
    sendEmail,                    // For student signup
    sendLoginEmail,               // For admin login
    sendStudentLoginEmail,        // For student login
    sendPasswordResetOtp,         // For student password reset
    sendAdminResetOtpEmail,       // For admin password reset
    sendAdminMessageEmail,        // For admin messages to students
    sendAdminDirectEmail          // For sending emails to admins (make sure this line exists)
};