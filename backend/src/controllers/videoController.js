const { getVideoDurationInSeconds } = require("get-video-duration");
const fs = require("fs");
const path = require("path");
const uploadConfig = require("../config/upload");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
ffmpeg.setFfmpegPath(ffmpegPath);

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
        res.status(500).json({
            error: true,
            message: error.message,
        });
    }
};

const trimVideo = async (req, res) => {
    try {
        const { id } = req.params;
        const { startTime, endTime } = req.body;

        console.log("Trim request:", {
            id,
            startTime,
            endTime,
            body: req.body,
        }); // Add this for debugging

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
        res.status(500).json({
            error: true,
            message: error.message,
        });
    }
};

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

module.exports = {
    uploadVideo,
    getVideos,
    trimVideo,
    mergeVideos,
};
