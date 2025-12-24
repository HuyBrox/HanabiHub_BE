/**
 * Script để test SendGrid API key
 * Chạy: npx ts-node scripts/test-sendgrid.ts
 */

import dotenv from "dotenv";
import sgMail from "@sendgrid/mail";

dotenv.config();

const apiKey = process.env.SENDGRID_API_KEY;

console.log("🔍 Testing SendGrid Configuration...\n");

if (!apiKey) {
  console.error("❌ SENDGRID_API_KEY is not set in .env file");
  process.exit(1);
}

console.log(`✅ SENDGRID_API_KEY found: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
console.log(`   Full length: ${apiKey.length} characters\n`);

// Set API key
sgMail.setApiKey(apiKey);

// Test email
const testEmail = {
  to: "test@example.com", // Thay bằng email của bạn để test
  from: "Huybrox.dev@gmail.com", // Email đã verify trong SendGrid
  subject: "Test Email from HanabiHub",
  text: "This is a test email to verify SendGrid configuration.",
  html: "<p>This is a test email to verify SendGrid configuration.</p>",
};

console.log("📧 Attempting to send test email...\n");

sgMail
  .send(testEmail)
  .then(() => {
    console.log("✅ SUCCESS: Email sent successfully!");
    console.log("   SendGrid API key is valid and working.\n");
    process.exit(0);
  })
  .catch((error: any) => {
    console.error("❌ ERROR: Failed to send email\n");

    if (error.response) {
      const { body, statusCode } = error.response;
      console.error(`Status Code: ${statusCode}`);
      console.error(`Error Details:`, JSON.stringify(body, null, 2));

      if (body?.errors) {
        console.error("\n📋 Error Messages:");
        body.errors.forEach((err: any, index: number) => {
          console.error(`  ${index + 1}. ${err.message}`);
          if (err.field) console.error(`     Field: ${err.field}`);
          if (err.help) console.error(`     Help: ${err.help}`);
        });
      }

      if (statusCode === 401) {
        console.error("\n💡 Solution:");
        console.error("   1. Check if API key is correct in SendGrid dashboard");
        console.error("   2. Verify API key has 'Mail Send' permissions");
        console.error("   3. Make sure API key is not expired or revoked");
        console.error("   4. Regenerate API key if needed");
      }
    } else {
      console.error("Error:", error.message);
    }

    process.exit(1);
  });

