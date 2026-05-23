import express, { Request, Response } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

const router = express.Router();

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadStorage = new CloudinaryStorage({
  cloudinary,
  params: async () => ({
    folder: process.env.CLOUDINARY_UPLOAD_FOLDER || "shahdol-bazaar",
    resource_type: "auto",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
  }),
});

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
});

// POST /api/upload - Upload images (single or multiple)
router.post("/", upload.array("images", 5), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No files uploaded",
      });
    }

    const urls = files.map((file: any) => file.path);

    return res.json({
      success: true,
      urls,
      message: "Upload successful",
    });
  } catch (err: any) {
    console.error("Upload failed:", err?.message);
    return res.status(500).json({
      success: false,
      error: "Upload failed",
      message: err?.message,
    });
  }
});

// POST /api/upload/single - Upload single image
router.post("/single", upload.single("image"), async (req: Request, res: Response) => {
  try {
    const file = req.file as any;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded",
      });
    }

    return res.json({
      success: true,
      url: file.path,
      message: "Upload successful",
    });
  } catch (err: any) {
    console.error("Single upload failed:", err?.message);
    return res.status(500).json({
      success: false,
      error: "Upload failed",
      message: err?.message,
    });
  }
});

export default router;
