const { getVideoDurationInSeconds } = require("get-video-duration");
const fs = require("fs");
const path = require("path");
const uploadConfig = require("../config/upload");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const crypto = require("crypto");
const Video = require("../models/videoModel");

ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Handles video upload
 * - Checks if file exists
 * - Gets video duration
 * - Makes sure video isn't too long/short
 * - Saves to database
 * - Returns video info
 */
const uploadVideo = async (req, res) => {
    try {
        // No file? No bueno
        if (!req.file) {
            return res.status(400).json({
                error: true,
                message: "No video file uploaded",
            });
        }

        // Log what we got
        console.log("Got a file:", {
            name: req.file.originalname,
            type: req.file.mimetype,
            size: req.file.size,
            where: req.file.path,
        });

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
        // Something broke
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

/**
 * Gets all videos we have
 * - Checks database for videos
 * - Makes sure files still exist
 * - Cleans up missing files from DB
 * - Returns list of valid videos
 */
const getVideos = async (req, res) => {
    try {
        // Get everything from DB
        const sql = `SELECT * FROM videos ORDER BY created_at DESC`;
        global.db.all(sql, [], (err, rows) => {
            if (err) {
                return res.status(500).json({
                    error: true,
                    message: err.message,
                });
            }

            // Filter out videos with missing files
            const validVideos = rows.filter((video) => {
                const exists = fs.existsSync(video.path);
                if (!exists) {
                    // Delete record if file doesn't exist
                    const deleteSql = `DELETE FROM videos WHERE id = ?`;
                    global.db.run(deleteSql, [video.id]);
                }
                return exists;
            });

            res.json({
                success: true,
                videos: validVideos,
            });
        });
    } catch (error) {
        // Uh oh
        res.status(500).json({
            error: true,
            message: error.message,
        });
    }
};

/**
 * Trims a video to make it shorter
 * - Checks if video exists
 * - Makes sure start/end times make sense
 * - Creates new trimmed video
 * - Saves new video to DB
 */
const trimVideo = async (req, res) => {
    try {
        const { id } = req.params;
        const { startTime, endTime } = req.body;

        // Log what we're trying to do
        console.log("Trimming video:", {
            id,
            startTime,
            endTime,
        });

        // Validate input
        if (startTime === undefined || endTime === undefined) {
            return res.status(400).json({
                error: true,
                message: "Start time and end time are required",
            });
        }

        // Convert to numbers and validate
        const start = Number(startTime);
        const end = Number(endTime);

        if (isNaN(start) || isNaN(end)) {
            return res.status(400).json({
                error: true,
                message: "Start time and end time must be numbers",
            });
        }

        if (start >= end) {
            return res.status(400).json({
                error: true,
                message: "End time must be greater than start time",
            });
        }

        if (start < 0) {
            return res.status(400).json({
                error: true,
                message: "Start time cannot be negative",
            });
        }

        // Get original video
        const sql = `SELECT * FROM videos WHERE id = ?`;
        global.db.get(sql, [id], async (err, video) => {
            if (err || !video) {
                return res.status(404).json({
                    error: true,
                    message: "Video not found",
                });
            }

            // Validate against video duration
            if (end > video.duration) {
                return res.status(400).json({
                    error: true,
                    message: `End time cannot exceed video duration (${video.duration} seconds)`,
                });
            }

            const outputPath = `uploads/trimmed_${Date.now()}_${path.basename(
                video.path
            )}`;

            try {
                await new Promise((resolve, reject) => {
                    ffmpeg(video.path)
                        .setStartTime(start)
                        .setDuration(end - start)
                        .output(outputPath)
                        .on("end", resolve)
                        .on("error", reject)
                        .run();
                });

                // Save new video to database
                const duration = end - start;
                const insertSql = `INSERT INTO videos (title, path, duration) VALUES (?, ?, ?)`;
                global.db.run(
                    insertSql,
                    [
                        `Trimmed_${video.title}`,
                        outputPath,
                        Math.round(duration),
                    ],
                    function (err) {
                        if (err) {
                            fs.unlinkSync(outputPath);
                            throw err;
                        }

                        res.status(201).json({
                            success: true,
                            message: "Video trimmed successfully",
                            video: {
                                id: this.lastID,
                                title: `Trimmed_${video.title}`,
                                duration: Math.round(duration),
                                path: outputPath,
                            },
                        });
                    }
                );
            } catch (error) {
                if (fs.existsSync(outputPath)) {
                    fs.unlinkSync(outputPath);
                }
                throw error;
            }
        });
    } catch (error) {
        // Something went wrong
        res.status(500).json({
            error: true,
            message: error.message,
        });
    }
};

/**
 * Merges multiple videos into one
 * - Checks if all videos exist
 * - Combines them in order
 * - Creates new merged video
 * - Saves to DB
 */
const mergeVideos = async (req, res) => {
    try {
        const { videoIds } = req.body;

        console.log("Merge request:", { videoIds, body: req.body });

        if (!videoIds || !Array.isArray(videoIds) || videoIds.length < 2) {
            return res.status(400).json({
                error: true,
                message: "At least two video IDs are required",
            });
        }

        // Get all videos
        const placeholders = videoIds.map(() => "?").join(",");
        const sql = `SELECT * FROM videos WHERE id IN (${placeholders})`;

        global.db.all(sql, videoIds, async (err, videos) => {
            if (err || videos.length !== videoIds.length) {
                return res.status(404).json({
                    error: true,
                    message: "One or more videos not found",
                });
            }

            // Verify all video files exist
            const missingVideos = videos.filter(
                (video) => !fs.existsSync(video.path)
            );
            if (missingVideos.length > 0) {
                return res.status(404).json({
                    error: true,
                    message: `Video files not found for IDs: ${missingVideos
                        .map((v) => v.id)
                        .join(", ")}`,
                });
            }

            const outputPath = `uploads/merged_${Date.now()}.mp4`;

            try {
                // Create a complex filter for concatenation
                const inputs = videos.map(
                    (_, index) => `[${index}:v][${index}:a]`
                );
                const filterComplex = `${inputs.join("")}concat=n=${
                    videos.length
                }:v=1:a=1[outv][outa]`;

                await new Promise((resolve, reject) => {
                    const command = ffmpeg();

                    // Add input files
                    videos.forEach((video) => {
                        command.input(video.path);
                    });

                    command
                        .outputOptions([
                            `-filter_complex ${filterComplex}`,
                            "-map [outv]",
                            "-map [outa]",
                        ])
                        .output(outputPath)
                        .on("start", (commandLine) => {
                            console.log("FFmpeg command:", commandLine);
                        })
                        .on("progress", (progress) => {
                            console.log("Processing:", progress);
                        })
                        .on("end", resolve)
                        .on("error", (err) => {
                            console.error("FFmpeg error:", err);
                            reject(err);
                        })
                        .run();
                });

                // Calculate total duration
                const totalDuration = videos.reduce(
                    (sum, video) => sum + video.duration,
                    0
                );

                // Save merged video to database
                const insertSql = `INSERT INTO videos (title, path, duration) VALUES (?, ?, ?)`;
                global.db.run(
                    insertSql,
                    ["Merged_Video", outputPath, totalDuration],
                    function (err) {
                        if (err) {
                            fs.unlinkSync(outputPath);
                            throw err;
                        }

                        res.status(201).json({
                            success: true,
                            message: "Videos merged successfully",
                            video: {
                                id: this.lastID,
                                title: "Merged_Video",
                                duration: totalDuration,
                                path: outputPath,
                            },
                        });
                    }
                );
            } catch (error) {
                console.error("Merge error:", error);
                if (fs.existsSync(outputPath)) {
                    fs.unlinkSync(outputPath);
                }
                return res.status(500).json({
                    error: true,
                    message: `Failed to merge videos: ${error.message}`,
                });
            }
        });
    } catch (error) {
        console.error("Merge error:", error);
        res.status(500).json({
            error: true,
            message: error.message,
        });
    }
};

/**
 * Creates a shareable link for a video
 * - Generates random token
 * - Sets expiry time
 * - Updates video in DB with share info
 * - Returns links for API and frontend
 */
const generateShareLink = async (req, res) => {
    try {
        const { id } = req.params;
        const { hours } = req.body;
        console.log("Generating share link for video:", id);

        const expiryHours = hours || process.env.SHARE_LINK_EXPIRY_HOURS || 24;
        const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 19)
            .replace("T", " ");

        // First check if video exists
        const checkSql = `SELECT * FROM videos WHERE id = ?`;
        global.db.get(checkSql, [id], (checkErr, video) => {
            if (checkErr) {
                console.error("Database check error:", checkErr);
                return res.status(500).json({
                    error: true,
                    message: "Database error while checking video",
                    details: checkErr.message,
                });
            }

            if (!video) {
                console.log("Video not found:", id);
                return res.status(404).json({
                    error: true,
                    message: `Video with ID ${id} not found`,
                });
            }

            console.log("Found video:", video);

            const shareToken = crypto.randomBytes(6).toString("hex");

            console.log("Generated token and expiry:", {
                shareToken,
                expiresAt,
                expiryHours,
            });

            // Then update the video with share token
            const updateSql = `
                UPDATE videos 
                SET share_token = ?, 
                    expires_at = datetime(?)
                WHERE id = ?
            `;

            global.db.run(
                updateSql,
                [shareToken, expiresAt, id],
                function (updateErr) {
                    if (updateErr) {
                        console.error("Update error:", updateErr);
                        return res.status(500).json({
                            error: true,
                            message: "Failed to generate share link",
                            details: updateErr.message,
                        });
                    }

                    if (this.changes === 0) {
                        console.error("No rows updated");
                        return res.status(404).json({
                            error: true,
                            message: "Video not found or update failed",
                        });
                    }

                    const apiUrl = `${req.protocol}://${req.get(
                        "host"
                    )}/api/videos/share/${shareToken}`;
                    const frontendUrl = `http://localhost:3001/share/${shareToken}`;

                    console.log("Generated share links:", {
                        api: apiUrl,
                        frontend: frontendUrl,
                    });

                    res.json({
                        success: true,
                        shareable_link: apiUrl,
                        frontend_link: frontendUrl,
                        expires_at: new Date(expiresAt).toISOString(),
                        expires_in: `${expiryHours} hours`,
                    });
                }
            );
        });
    } catch (error) {
        console.error("Share link generation error:", error);
        res.status(500).json({
            error: true,
            message: "Share link generation failed",
            details: error.message,
        });
    }
};

/**
 * Gets a shared video without needing auth
 * - Checks if share token is valid
 * - Makes sure link hasn't expired
 * - Returns video info and URL
 */
const getSharedVideo = async (req, res) => {
    try {
        const { token } = req.params;

        // Clean up old share links first
        await Video.clearExpiredTokens();

        const sql = `
            SELECT * FROM videos 
            WHERE share_token = ? 
            AND (expires_at IS NULL OR datetime(expires_at) > datetime('now'))
        `;

        global.db.get(sql, [token], (err, video) => {
            if (err || !video) {
                return res.status(404).json({
                    error: true,
                    message: "Video not found or link expired",
                });
            }

            // Return video URL for direct access
            const videoUrl = `${req.protocol}://${req.get("host")}/${
                video.path
            }`;

            res.json({
                success: true,
                video: {
                    id: video.id,
                    title: video.title,
                    duration: video.duration,
                    url: videoUrl,
                    created_at: video.created_at,
                },
            });
        });
    } catch (error) {
        console.error("Get shared video error:", error);
        res.status(500).json({
            error: true,
            message: error.message,
        });
    }
};

module.exports = {
    uploadVideo,
    getVideos,
    trimVideo,
    mergeVideos,
    generateShareLink,
    getSharedVideo,
};
