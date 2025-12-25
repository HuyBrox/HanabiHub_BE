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

//==============================Dùng SendGrid cho production========================
import dotenv from "dotenv";
import sgMail from "@sendgrid/mail";

dotenv.config();

// Set API key cho SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log("✅ SendGrid API key configured");
} else {
  console.warn("⚠️ SENDGRID_API_KEY is not set");
}

// Hàm gửi OTP qua email bằng SendGrid
export async function sendOtpEmail(
  email: string,
  otp: string | number
): Promise<void> {
  console.log("📧 [SendGrid] Starting OTP email send process...");
  console.log("📧 [SendGrid] Target email:", email);
  console.log("📧 [SendGrid] OTP:", otp);

  // Kiểm tra SENDGRID_API_KEY
  if (!process.env.SENDGRID_API_KEY) {
    console.error("❌ [SendGrid] SENDGRID_API_KEY is not set");
    throw new Error("SendGrid API key is not configured");
  }

  // Log API key info (chỉ hiển thị một phần để bảo mật)
  const apiKeyPreview =
    process.env.SENDGRID_API_KEY.substring(0, 10) +
    "..." +
    process.env.SENDGRID_API_KEY.substring(
      process.env.SENDGRID_API_KEY.length - 4
    );
  console.log("🔑 [SendGrid] API Key:", apiKeyPreview);

  // Email đã được verify trong SendGrid
  const fromEmail = "huybrox.dev@gmail.com";
  console.log("📮 [SendGrid] From email:", fromEmail);

  // Giữ nguyên HTML template như cũ
  const htmlContent = `
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
        Email: <a href="mailto:${fromEmail}" style="color: #0056b3;">${fromEmail}</a><br>
        Facebook: <a href="https://www.facebook.com/huybrox/" style="color: #0056b3;">Facebook nhà phát triển</a>
      </p>
    </div>
  `;

  const msg = {
    to: email,
    from: {
      email: fromEmail,
      name: "HanabiHub",
    },
    subject: "Mã OTP xác thực của bạn đây!",
    html: htmlContent,
  };

  console.log("📨 [SendGrid] Email message prepared:", {
    to: msg.to,
    from: msg.from.email,
    subject: msg.subject,
    htmlLength: htmlContent.length,
  });

  try {
    console.log("🚀 [SendGrid] Sending email via SendGrid API...");
    const response = await sgMail.send(msg);
    console.log("✅ [SendGrid] OTP sent successfully to:", email);
    console.log("✅ [SendGrid] Response status:", response[0]?.statusCode);
    console.log(
      "✅ [SendGrid] Response headers:",
      JSON.stringify(response[0]?.headers, null, 2)
    );
  } catch (error: any) {
    console.error("❌ [SendGrid] Error sending OTP email");
    console.error("❌ [SendGrid] Error type:", error?.constructor?.name);
    console.error("❌ [SendGrid] Error message:", error?.message);

    // Log chi tiết lỗi từ SendGrid
    if (error.response) {
      const { body, statusCode, headers } = error.response;

      console.error("📊 [SendGrid] API Error Details:");
      console.error("   Status Code:", statusCode);
      console.error("   Response Headers:", JSON.stringify(headers, null, 2));
      console.error("   Response Body:", JSON.stringify(body, null, 2));

      // Log từng error trong body.errors nếu có
      if (body?.errors && Array.isArray(body.errors)) {
        console.error("📋 [SendGrid] Error List:");
        body.errors.forEach((err: any, index: number) => {
          console.error(`   Error ${index + 1}:`, {
            message: err.message,
            field: err.field,
            help: err.help,
          });
        });
      }

      // Xử lý lỗi "Maximum credits exceeded"
      if (statusCode === 403 && body?.errors) {
        const creditError = body.errors.find(
          (err: any) =>
            err.message?.toLowerCase().includes("credit") ||
            err.message?.toLowerCase().includes("quota")
        );
        if (creditError) {
          console.error("💳 [SendGrid] CREDITS/QUOTA ERROR DETECTED!");
          console.error("💳 [SendGrid] This usually means:");
          console.error("   - Free tier limit reached (100 emails/day)");
          console.error("   - Trial period ended");
          console.error("   - Need to upgrade to paid plan");
        }
      }

      // Xử lý các lỗi phổ biến
      if (statusCode === 401) {
        console.error("🔐 [SendGrid] Authentication failed - API key invalid");
        throw new Error("SendGrid API key is invalid or unauthorized");
      } else if (statusCode === 403) {
        console.error("🚫 [SendGrid] Permission denied or credits exceeded");
        if (body?.errors) {
          const errorMessages = body.errors
            .map((err: any) => err.message)
            .join(", ");
          throw new Error(`SendGrid error: ${errorMessages}`);
        }
        throw new Error(
          "SendGrid API key does not have permission to send emails or credits exceeded"
        );
      } else if (body?.errors) {
        const errorMessages = body.errors
          .map((err: any) => err.message)
          .join(", ");
        console.error("❌ [SendGrid] Multiple errors:", errorMessages);
        throw new Error(`SendGrid error: ${errorMessages}`);
      }
    } else {
      // Lỗi không có response (network, timeout, etc.)
      console.error("🌐 [SendGrid] Network or connection error");
      console.error("   Error stack:", error?.stack);
    }

    // Throw error với thông tin chi tiết hơn
    const errorMessage = error?.message || "Error sending OTP via SendGrid";
    throw new Error(`SendGrid error: ${errorMessage}`);
  }
}
