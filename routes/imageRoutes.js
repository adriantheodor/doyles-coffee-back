// routes/imageRoutes.js
const express = require("express");
const router = express.Router();
const Image = require("../models/Image");
const cloudinary = require("../config/cloudinary");
const upload = require("../config/multerCloudinary");
const { authenticateToken, requireRole } = require("../middleware/auth");

// GET all images (public)
router.get("/", async (req, res) => {
  try {
    const images = await Image.find().sort({ createdAt: -1 });
    res.json(images);
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
        url: req.file.path,
        publicId: req.file.filename || req.file.public_id,
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
