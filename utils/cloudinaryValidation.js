const cloudinary = require("../config/cloudinary");

async function checkCloudinaryResourceExists(publicId) {
  if (!publicId || typeof publicId !== "string") {
    throw new Error("Missing Cloudinary publicId");
  }

  try {
    const resource = await cloudinary.api.resource(publicId, { resource_type: "image" });
    if (!resource || !resource.public_id) {
      throw new Error("Resource not found");
    }
    return true;
  } catch (error) {
    throw new Error(`Cloudinary resource not found: ${publicId}`);
  }
}

async function filterAccessibleImages(images, resourceChecker = checkCloudinaryResourceExists) {
  if (!Array.isArray(images)) {
    return [];
  }

  const validImages = [];

  for (const image of images) {
    if (!image || !image.publicId) {
      continue;
    }

    try {
      await resourceChecker(image.publicId);
      validImages.push(image);
    } catch (error) {
      // Ignore invalid Cloudinary entries so the frontend does not render broken images.
    }
  }

  return validImages;
}

module.exports = {
  checkCloudinaryResourceExists,
  filterAccessibleImages,
};
