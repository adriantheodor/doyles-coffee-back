const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("./cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "doyles-images",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    public_id: (req, file) => {
      const timestamp = Date.now();
      const cleanName = file.originalname
        .replace(/\.[^/.]+$/, "")
        .replace(/[^a-zA-Z0-9_-]/g, "-")
        .toLowerCase();
      return `${cleanName}-${timestamp}`;
    },
  },
});

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/webp",
];

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG, JPG and WEBP are allowed."), false);
    }
  },
});

module.exports = upload;
