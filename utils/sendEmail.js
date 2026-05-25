const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

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

module.exports = sendEmail;