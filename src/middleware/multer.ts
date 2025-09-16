import multer from "multer";

// Cấu hình multer để lưu tệp vào bộ nhớ (RAM) và giới hạn dung lượng file tối đa là 300MB
const allowedExts = ["mp4", "mov", "avi", "mkv", "jpg", "jpeg", "png", "gif"];
const allowedMime = [
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
  "image/jpeg",
  "image/png",
  "image/gif",
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 300 * 1024 * 1024 }, // Giới hạn dung lượng file tối đa là 300MB
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split(".").pop()?.toLowerCase() || "";
    const isMime = allowedMime.includes(file.mimetype);
    const isExt = allowedExts.includes(ext);
    if (isMime && isExt) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
});

export default upload;
