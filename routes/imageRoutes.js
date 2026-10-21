// routes/imageRoutes.js
const express = require("express");
const router = express.Router();
const Image = require("../models/Image");
const cloudinary = require("../config/cloudinary");
const upload = require("../config/multerCloudinary");
const { authenticateToken, requireRole } = require("../middleware/auth");
const { filterAccessibleImages, isCloudinaryImage } = require("../utils/cloudinaryValidation");

// GET all images (public)
router.get("/", async (req, res) => {
  try {
    const images = await Image.find({
      $or: [
        { source: "cloudinary" },
        { url: { $regex: /res\.cloudinary\.com|cloudinary\.com/i } },
      ],
    }).sort({ createdAt: -1 });

    const validImages = await filterAccessibleImages(images.filter(isCloudinaryImage));
    const invalidIds = images
      .filter((image) => image && image._id && !validImages.some((validImage) => validImage._id.toString() === image._id.toString()))
      .map((image) => image._id);

    if (invalidIds.length > 0) {
      await Image.deleteMany({ _id: { $in: invalidIds } });
    }

    res.json(validImages);
  } catch (err) {
    console.error("Error fetching images:", err);
    res.status(500).json({ message: "Error retrieving images" });
  }
});

// POST new image (admin only)
router.post(
  "/",
  authenticateToken,
  requireRole("admin"),
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Image file is required" });
      }

      const { caption = "" } = req.body;
      const image = new Image({
        url: req.file.secure_url || req.file.path,
        publicId: req.file.public_id || req.file.filename,
        source: "cloudinary",
        caption,
        uploadedBy: req.user.id,
      });

      await image.save();
      res.status(201).json(image);
    } catch (err) {
      console.error("Error uploading image:", err);
      res.status(500).json({ message: "Error uploading image" });
    }
  }
);

// DELETE image by id (admin only)
router.delete(
  "/:id",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const image = await Image.findById(req.params.id);
      if (!image) {
        return res.status(404).json({ message: "Image not found" });
      }

      await cloudinary.uploader.destroy(image.publicId);
      await image.deleteOne();

      res.json({ message: "Image deleted successfully" });
    } catch (err) {
      console.error("Error deleting image:", err);
      res.status(500).json({ message: "Error deleting image" });
    }
  }
);

module.exports = router;
