const express = require("express");
const router = express.Router();
const videoController = require("../controllers/videoController");
const { upload } = require("../config/upload");
const multer = require("multer");
const authMiddleware = require("../middleware/auth");

/**
 * @swagger
 * components:
 *   schemas:
 *     Video:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The video ID
 *         title:
 *           type: string
 *           description: The video title
 *         path:
 *           type: string
 *           description: Path to the video file
 *         duration:
 *           type: integer
 *           description: Duration in seconds
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 */

/**
 * @swagger
 * /api/videos/upload:
 *   post:
 *     summary: Upload a new video
 *     security:
 *       - ApiKeyAuth: []
 *     tags: [Videos]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               video:
 *                 type: string
 *                 format: binary
 *                 description: Video file to upload
 *     responses:
 *       201:
 *         description: Video uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 video:
 *                   $ref: '#/components/schemas/Video'
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/videos:
 *   get:
 *     summary: Get all videos
 *     security:
 *       - ApiKeyAuth: []
 *     tags: [Videos]
 *     responses:
 *       200:
 *         description: List of all videos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 videos:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Video'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/videos/{id}/trim:
 *   post:
 *     summary: Trim a video
 *     security:
 *       - ApiKeyAuth: []
 *     tags: [Videos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Video ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startTime:
 *                 type: number
 *                 description: Start time in seconds
 *               endTime:
 *                 type: number
 *                 description: End time in seconds
 *     responses:
 *       201:
 *         description: Video trimmed successfully
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Video not found
 */

/**
 * @swagger
 * /api/videos/merge:
 *   post:
 *     summary: Merge multiple videos
 *     security:
 *       - ApiKeyAuth: []
 *     tags: [Videos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               videoIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array of video IDs to merge
 *     responses:
 *       201:
 *         description: Videos merged successfully
 *       400:
 *         description: Invalid request
 *       404:
 *         description: One or more videos not found
 */

/**
 * @swagger
 * /api/videos/{id}/share:
 *   post:
 *     summary: Generate a shareable link for a video
 *     security:
 *       - ApiKeyAuth: []
 *     tags: [Videos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Video ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               hours:
 *                 type: number
 *                 description: Number of hours until link expires (default 24)
 *     responses:
 *       200:
 *         description: Share link generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 shareable_link:
 *                   type: string
 *                   description: Direct API access URL
 *                 frontend_link:
 *                   type: string
 *                   description: Frontend viewer URL
 *                 expires_at:
 *                   type: string
 *                   format: date-time
 *                 expires_in:
 *                   type: string
 *       404:
 *         description: Video not found
 */

/**
 * @swagger
 * /api/videos/share/{token}:
 *   get:
 *     summary: Get a shared video by token
 *     tags: [Videos]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Share token
 *     responses:
 *       200:
 *         description: Video details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 video:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     title:
 *                       type: string
 *                     duration:
 *                       type: integer
 *                     url:
 *                       type: string
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Video not found or link expired
 */

/**
 * Handles file upload errors from multer
 * - Checks for multer errors
 * - Returns nice error messages
 */
const handleUpload = (req, res, next) => {
    const uploadMiddleware = upload.single("video");

    uploadMiddleware(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            // Multer messed up
            return res.status(400).json({
                error: true,
                message: `Upload error: ${err.message}`,
            });
        } else if (err) {
            // Something else broke
            return res.status(400).json({
                error: true,
                message: err.message,
            });
        }
        next();
    });
};

// Share routes don't need auth
router.get("/share/:token", videoController.getSharedVideo);

// Everything else needs auth
router.use(authMiddleware);

// All our routes
router.post("/:id/share", videoController.generateShareLink);
router.post("/upload", handleUpload, videoController.uploadVideo);
router.get("/", videoController.getVideos);
router.post("/:id/trim", videoController.trimVideo);
router.post("/merge", videoController.mergeVideos);

module.exports = router;
