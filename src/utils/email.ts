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

//==============================dùng send grid vì google phiền vl========================
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Tạo transporter dùng SendGrid SMTP
const transporter = nodemailer.createTransport({
  host: "smtp.sendgrid.net",
  port: 587,
  secure: false, // dùng STARTTLS
  auth: {
    user: "apikey", // cố định
    pass: process.env.SENDGRID_API_KEY as string,
  },
});

// Hàm gửi OTP qua email
export async function sendOtpEmail(
  email: string,
  otp: string | number
): Promise<void> {
  const mailOptions = {
    from: `"HanabiHub" <Huybrox.dev@gmail.com>`, // email đã verify trong SendGrid
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
          Email: <a href="mailto:Huybrox.dev@gmail.com" style="color: #0056b3;">Huybrox.dev@gmail.com</a><br>
          Facebook: <a href="https://www.facebook.com/huybrox/" style="color: #0056b3;">Facebook nhà phát triển</a>
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ OTP sent to email:", email);
  } catch (error) {
    console.error("❌ Error sending OTP email:", error);
    throw new Error("Error sending OTP");
  }
}
