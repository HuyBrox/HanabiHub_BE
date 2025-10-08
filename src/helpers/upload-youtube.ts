import axios from "axios";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

/**
 * Hàm upload video lên YouTube chỉ cần truyền file path.
 * Các key (clientId, clientSecret, refreshToken) lấy từ biến môi trường .env
 */
export async function uploadYoutube(filePath: string) {
  try {
    // 1️⃣ Kiểm tra file
    if (!fs.existsSync(filePath)) throw new Error("Không tìm thấy file video.");
    const videoBuffer = fs.readFileSync(filePath);

    // 2️⃣ Lấy Access Token mới
    const accessToken = await getAccessTokenFromRefreshToken();

    // 3️⃣ Upload video
    const videoData = await uploadYoutubeVideo({
      accessToken,
      videoBuffer,
      title: path.basename(filePath, path.extname(filePath)),
      description: "Uploaded via Node.js YouTube API",
      tags: ["upload", "api", "nodejs"],
      privacyStatus: "unlisted",
    });

    console.log("✅ Upload thành công:", videoData);
    return videoData;
  } catch (err: any) {
    console.error("❌ Lỗi upload:", err.response?.data || err.message);
    throw err;
  }
}

/**
 * Upload video lên YouTube (Resumable Upload)
 */
async function uploadYoutubeVideo({
  accessToken,
  videoBuffer,
  title,
  description = "",
  tags = [],
  privacyStatus = "unlisted",
}: {
  accessToken: string;
  videoBuffer: Buffer;
  title: string;
  description?: string;
  tags?: string[];
  privacyStatus?: "public" | "private" | "unlisted";
}) {
  // Metadata
  const metadata = {
    snippet: {
      title,
      description,
      tags,
      categoryId: "22", // People & Blogs
    },
    status: {
      privacyStatus,
    },
  };

  // Tạo session upload
  const initRes = await axios.post(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    metadata,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Length": videoBuffer.length.toString(),
        "X-Upload-Content-Type": "video/mp4",
      },
      validateStatus: () => true,
    }
  );

  const uploadUrl = initRes.headers["location"];
  if (!uploadUrl) throw new Error("Không lấy được upload URL từ YouTube.");

  // Upload file binary
  const uploadRes = await axios.put(uploadUrl, videoBuffer, {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": videoBuffer.length,
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });

  return uploadRes.data;
}

/**
 * Lấy access token mới từ refresh token
 */
async function getAccessTokenFromRefreshToken(): Promise<string> {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Thiếu biến môi trường OAuth2 trong file .env");
  }

  const res = await axios.post("https://oauth2.googleapis.com/token", null, {
    params: {
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    },
  });

  return res.data.access_token;
}
