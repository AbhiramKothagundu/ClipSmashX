const { getVideoDurationInSeconds } = require("get-video-duration");
const fs = require("fs");
const path = require("path");
const uploadConfig = require("../config/upload");

const uploadVideo = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: true,
                message: "No video file uploaded",
            });
        }

        const filePath = req.file.path;
        console.log("File uploaded:", {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            path: filePath,
        });

        try {
            // Get video duration
            const duration = await getVideoDurationInSeconds(filePath);
            console.log("Video duration:", duration);

            // Check duration limits
            if (
                duration < uploadConfig.limits.minDuration ||
                duration > uploadConfig.limits.maxDuration
            ) {
                // Delete the uploaded file
                fs.unlinkSync(filePath);
                return res.status(400).json({
                    error: true,
                    message: `Video duration must be between ${uploadConfig.limits.minDuration} and ${uploadConfig.limits.maxDuration} seconds`,
                });
            }

            // Save to database
            const sql = `INSERT INTO videos (title, path, duration) VALUES (?, ?, ?)`;
            global.db.run(
                sql,
                [req.file.originalname, filePath, Math.round(duration)],
                function (err) {
                    if (err) {
                        // Delete the uploaded file if database insert fails
                        fs.unlinkSync(filePath);
                        return res.status(500).json({
                            error: true,
                            message: err.message,
                        });
                    }

                    res.status(201).json({
                        success: true,
                        message: "Video uploaded successfully",
                        video: {
                            id: this.lastID,
                            title: req.file.originalname,
                            duration: Math.round(duration),
                            path: filePath,
                        },
                    });
                }
            );
        } catch (durationError) {
            // Clean up file if duration check fails
            fs.unlinkSync(filePath);
            throw new Error(
                `Failed to process video: ${durationError.message}`
            );
        }
    } catch (error) {
        // Clean up file if exists
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({
            error: true,
            message: error.message,
        });
    }
};

const getVideos = async (req, res) => {
    try {
        const sql = `SELECT * FROM videos ORDER BY created_at DESC`;
        global.db.all(sql, [], (err, rows) => {
            if (err) {
                return res.status(500).json({
                    error: true,
                    message: err.message,
                });
            }
            res.json({
                success: true,
                videos: rows,
            });
        });
    } catch (error) {
        res.status(500).json({
            error: true,
            message: error.message,
        });
    }
};

module.exports = {
    uploadVideo,
    getVideos,
};
