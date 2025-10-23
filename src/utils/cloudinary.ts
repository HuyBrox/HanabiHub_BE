import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

const hasCloudinaryEnv = Boolean(
  process.env.CLOUD_NAME && process.env.API_KEY && process.env.API_SECRET
);

if (hasCloudinaryEnv) {
  cloudinary.config({
    cloud_name: process.env.CLOUD_NAME as string,
    api_key: process.env.API_KEY as string,
    api_secret: process.env.API_SECRET as string,
    secure: true,
  });
} else {
  // Do not crash app if Cloudinary env vars are missing; warn and continue
  console.warn(
    'Cloudinary environment variables are not set. Media upload features will be disabled.'
  );
  // Enable secure URLs to avoid mixed content warnings if used inadvertently
  cloudinary.config({ secure: true });
}

export default cloudinary;