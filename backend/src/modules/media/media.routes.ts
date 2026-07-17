import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../../middleware/auth";
import { unlockRateLimiter } from "../../middleware/rateLimit";
import { BadRequestError } from "../../utils/errors";
import { details, feed, original, preview, unlock, upload as uploadHandler } from "./media.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      cb(new BadRequestError("Only JPEG, PNG, or WEBP images are supported"));
      return;
    }
    cb(null, true);
  },
});

const router = Router();

router.use(requireAuth);

router.post("/", upload.single("image"), uploadHandler);
router.get("/", feed);
router.get("/:id", details);
router.get("/:id/preview", preview);
router.get("/:id/original", original);
router.post("/:id/unlock", unlockRateLimiter, unlock);

export const mediaRouter = router;
