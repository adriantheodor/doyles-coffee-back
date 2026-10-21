const test = require("node:test");
const assert = require("node:assert/strict");

const { filterAccessibleImages } = require("../utils/cloudinaryValidation");

test("filterAccessibleImages removes missing Cloudinary resources", async () => {
  const images = [
    {
      _id: "valid-1",
      publicId: "doyles-images/valid-image",
      url: "https://res.cloudinary.com/demo/image/upload/valid-image.jpg",
    },
    {
      _id: "missing-1",
      publicId: "doyles-images/missing-image",
      url: "https://res.cloudinary.com/demo/image/upload/missing-image.jpg",
    },
  ];

  const valid = await filterAccessibleImages(images, async (publicId) => {
    if (publicId.includes("missing")) {
      throw new Error("Resource not found");
    }
    return true;
  });

  assert.deepEqual(valid.map((image) => image._id), ["valid-1"]);
});
