import sharp from "sharp";
import { Readable } from "stream"; //để chuyển buffer thành stream để upload lên cloudinary
import cloudinary from "../utils/cloudinary";
import ffmpeg from "fluent-ffmpeg";

// Hàm chuyển đổi buffer thành stream
function bufferToStream(buffer: Buffer) {
  const stream = new Readable();
  stream._read = () => {};
  stream.push(buffer);
  stream.push(null);
  return stream;
}

// Hàm tạo mã không trùng
function generateUniqueId() {
  const uniquePart = Math.random().toString(36).substring(2, 11);
  return `media_${Date.now()}_${uniquePart}`;
}

// Hàm upload hình ảnh
export const uploadImage = async (media: { buffer: Buffer }) => {
  const optimizedImgBuffer = await sharp(media.buffer)
    .resize({ width: 500, height: 500, fit: "inside" })
    .toFormat("jpeg", { quality: 80 })
    .toBuffer();

  const cloudinaryResponse = await cloudinary.uploader.upload(
    `data:image/jpeg;base64,${optimizedImgBuffer.toString("base64")}`,
    {
      resource_type: "image",
      public_id: generateUniqueId(),
    }
  );

  return cloudinaryResponse.secure_url;
};

// Hàm upload video
export const uploadVideo = async (media: { buffer: Buffer }) => {
  return new Promise<string>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "video",
        public_id: generateUniqueId(),
        eager: [
          {
            width: 1000,
            crop: "scale",
            quality: "auto:best",
            fetch_format: "auto",
          },
        ],
        eager_async: true,
      },
      (error, result) => {
        if (error) {
          reject(
            new Error(`Error uploading video to Cloudinary: ${error.message}`)
          );
        } else {
          resolve(result!.secure_url);
        }
      }
    );

    const videoStream = bufferToStream(media.buffer);
    videoStream.pipe(uploadStream);
  });
};

// Hàm upload video audio (tắt tiếng video)
export const uploadVideoAudio = async (media: { buffer: Buffer }) => {
  const outputPath = `optimized_video_${Date.now()}.mp4`;

  // Tạo một stream từ buffer
  const videoStream = bufferToStream(media.buffer);

  // Tắt tiếng và xử lý video
  await new Promise<void>((resolve, reject) => {
    ffmpeg(videoStream)
      .noAudio() // Tắt tiếng video
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", reject)
      .run();
  });

  // Tải video đã tắt tiếng lên Cloudinary
  return new Promise<string>((resolve, reject) => {
    cloudinary.uploader.upload(
      outputPath,
      {
        resource_type: "video",
        public_id: generateUniqueId(),
        eager: [
          {
            width: 500,
            crop: "scale",
            quality: "auto:best",
            fetch_format: "auto",
          },
        ],
        eager_async: true,
      },
      (error, result) => {
        if (error) {
          reject(
            new Error(`Error uploading video to Cloudinary: ${error.message}`)
          );
        } else {
          resolve(result!.secure_url);
        }
      }
    );
  });
};

// Hàm upload âm thanh
export const uploadAudio = async (media: { buffer: Buffer }) => {
  return new Promise<string>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "auto",
        public_id: generateUniqueId(),
        format: "mp3",
        transformation: [{ quality: "auto:best" }, { fetch_format: "auto" }],
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          reject(
            new Error(`Error uploading audio to Cloudinary: ${error.message}`)
          );
        } else {
          resolve(result!.secure_url);
        }
      }
    );

    const audioStream = bufferToStream(media.buffer);
    audioStream.pipe(uploadStream);
  });
};

// Hàm xóa media
export const deleteMediaById = async (
  publicId: string,
  resourceType: string
) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(
      publicId,
      { resource_type: resourceType },
      (error, result) => {
        if (error) {
          reject(
            new Error(`Error deleting media from Cloudinary: ${error.message}`)
          );
        } else {
          resolve(result);
        }
      }
    );
  });
};
