// import nodemailer from 'nodemailer';
// import dotenv from 'dotenv';
// import { google } from 'googleapis';

// // Nạp biến môi trường từ file .env
// dotenv.config();

// // Thiết lập OAuth2 với Google
// const oAuth2Client = new google.auth.OAuth2(
//     process.env.CLIENT_ID || '',
//     process.env.CLIENT_SECRET || '',
//     process.env.REDIRECT_URI || ''
// );

// // Thiết lập refresh token
// oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN || '' });

// // Hàm tạo transporter sử dụng OAuth2
// async function createTransporter() {
//     const accessToken = await oAuth2Client.getAccessToken();

//     const transporter = nodemailer.createTransport({
//         service: 'gmail',
//         auth: {
//             type: 'OAuth2',
//             user: process.env.EMAIL_USER!,
//             clientId: process.env.CLIENT_ID!,
//             clientSecret: process.env.CLIENT_SECRET!,
//             refreshToken: process.env.REFRESH_TOKEN!,
//             accessToken: accessToken.token as string,
//         },
//     });

//     return transporter;
// }

// // Hàm gửi OTP qua email
// export async function sendOtpEmail(email: string, otp: string | number): Promise<void> {
//     const mailOptions = {
//         from: process.env.EMAIL_USER,
//         to: email,
//         subject: 'Mã OTP xác thực của bạn đây!',
//         html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
//     <h2 style="color: #0056b3; text-align: center; margin-top: 0;">Xác thực tài khoản của bạn</h2>
//     <p style="text-align: center; font-size: 16px;">Xin chào,</p>
//     <p style="text-align: center; font-size: 16px;">Đây là mã OTP của bạn:</p>
//     <div style="text-align: center; margin: 20px auto; padding: 10px; border: 2px dashed #d9534f; border-radius: 5px; font-size: 24px; font-weight: bold; color: #d9534f;">
//         ${otp}
//     </div>
//     <p style="text-align: center; font-size: 16px;">Mã này sẽ hết hạn sau <span style="color: red">3 phút</span>.</p>
//     <p style="text-align: center; font-size: 16px;">Nếu bạn không yêu cầu mã này, xin vui lòng bỏ qua email này.</p>
//     <br>
//     <p style="text-align: center; font-size: 16px;">Trân trọng! <span style=" font-size: 16px; font-weight: bold; color: #333;"> Đội ngũ hỗ trợ </span></p>

//     <p style="text-align: center; font-size: 14px; color: #555;">Liên hệ hỗ trợ:</p>
//     <p style="text-align: center; font-size: 14px; color: #555;">
//         Email: <a href="mailto:huybrox@gmail.com" style="color: #0056b3;">huybrox@gmail.com </a><br>

//         Facebook: <a href="https://www.facebook.com/huybrox/" style=" color: #0056b3;">Facebook nhà phát triển</a>
//     </p>
// </div>

// `

//     };

//     try {
//         const transporter = await createTransporter();
//         await transporter.sendMail(mailOptions);
//         console.log('OTP sent to email:', email);
//     } catch (error) {
//         console.error('Error sending OTP email:', error);
//         throw new Error('Error sending OTP');
//     }
// }

// import nodemailer from "nodemailer";
// import dotenv from "dotenv";

// // Nạp biến môi trường từ file .env
// dotenv.config();

// // Tạo transporter dùng App Password
// const transporter = nodemailer.createTransport({
//   host: "smtp.gmail.com",
//   port: 465,
//   secure: true, // dùng SSL
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });

// // Hàm gửi OTP qua email
// export async function sendOtpEmail(
//   email: string,
//   otp: string | number
// ): Promise<void> {
//   const mailOptions = {
//     from: `"HanabiHub" <${process.env.EMAIL_USER}>`,
//     to: email,
//     subject: "Mã OTP xác thực của bạn đây!",
//     html: `
//       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
//         <h2 style="color: #0056b3; text-align: center; margin-top: 0;">Xác thực tài khoản của bạn</h2>
//         <p style="text-align: center; font-size: 16px;">Xin chào,</p>
//         <p style="text-align: center; font-size: 16px;">Đây là mã OTP của bạn:</p>
//         <div style="text-align: center; margin: 20px auto; padding: 10px; border: 2px dashed #d9534f; border-radius: 5px; font-size: 24px; font-weight: bold; color: #d9534f;">
//           ${otp}
//         </div>
//         <p style="text-align: center; font-size: 16px;">Mã này sẽ hết hạn sau <span style="color: red">3 phút</span>.</p>
//         <p style="text-align: center; font-size: 16px;">Nếu bạn không yêu cầu mã này, xin vui lòng bỏ qua email này.</p>
//         <br>
//         <p style="text-align: center; font-size: 16px;">Trân trọng! <span style=" font-size: 16px; font-weight: bold; color: #333;"> Đội ngũ hỗ trợ </span></p>
//         <p style="text-align: center; font-size: 14px; color: #555;">Liên hệ hỗ trợ:</p>
//         <p style="text-align: center; font-size: 14px; color: #555;">
//           Email: <a href="mailto:${process.env.EMAIL_USER}" style="color: #0056b3;">${process.env.EMAIL_USER}</a><br>
//           Facebook: <a href="https://www.facebook.com/huybrox/" style="color: #0056b3;">Facebook nhà phát triển</a>
//         </p>
//       </div>
//     `,
//   };

//   try {
//     await transporter.sendMail(mailOptions);
//     console.log("✅ OTP sent to email:", email);
//   } catch (error) {
//     console.error("❌ Error sending OTP email:", error);
//     throw new Error("Error sending OTP");
//   }
// }

//==============================Dùng Gmail App Password (đơn giản hơn SendGrid)========================
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

// Tạo transporter dùng Gmail App Password
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // dùng SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail App Password (không phải mật khẩu thường)
  },
});

// Verify transporter khi khởi động
transporter.verify((error) => {
  if (error) {
    console.error("❌ Gmail transporter verification failed:", error);
  } else {
    console.log("✅ Gmail transporter ready");
  }
});

// Hàm gửi OTP qua email
export async function sendOtpEmail(
  email: string,
  otp: string | number
): Promise<void> {
  // Kiểm tra EMAIL_USER và EMAIL_PASS
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error("❌ EMAIL_USER or EMAIL_PASS is not set");
    throw new Error("Gmail credentials are not configured");
  }

  const mailOptions = {
    from: `"HanabiHub" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Mã OTP xác thực của bạn đây!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
        <h2 style="color: #0056b3; text-align: center; margin-top: 0;">Xác thực tài khoản của bạn</h2>
        <p style="text-align: center; font-size: 16px;">Xin chào,</p>
        <p style="text-align: center; font-size: 16px;">Đây là mã OTP của bạn:</p>
        <div style="text-align: center; margin: 20px auto; padding: 10px; border: 2px dashed #d9534f; border-radius: 5px; font-size: 24px; font-weight: bold; color: #d9534f;">
          ${otp}
        </div>
        <p style="text-align: center; font-size: 16px;">Mã này sẽ hết hạn sau <span style="color: red">3 phút</span>.</p>
        <p style="text-align: center; font-size: 16px;">Nếu bạn không yêu cầu mã này, xin vui lòng bỏ qua email này.</p>
        <br>
        <p style="text-align: center; font-size: 16px;">Trân trọng! <span style=" font-size: 16px; font-weight: bold; color: #333;"> Đội ngũ hỗ trợ </span></p>
        <p style="text-align: center; font-size: 14px; color: #555;">Liên hệ hỗ trợ:</p>
        <p style="text-align: center; font-size: 14px; color: #555;">
          Email: <a href="mailto:${process.env.EMAIL_USER}" style="color: #0056b3;">${process.env.EMAIL_USER}</a><br>
          Facebook: <a href="https://www.facebook.com/huybrox/" style="color: #0056b3;">Facebook nhà phát triển</a>
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ OTP sent to email via Gmail:", email);
  } catch (error: any) {
    console.error("❌ Error sending OTP email:", error);

    // Log chi tiết lỗi
    if (error.response) {
      console.error("Gmail SMTP error:", {
        code: error.code,
        command: error.command,
        response: error.response,
      });
    }

    // Throw error với thông tin chi tiết hơn
    const errorMessage = error?.response || error?.message || "Error sending OTP";
    throw new Error(`Gmail error: ${errorMessage}`);
  }
}
