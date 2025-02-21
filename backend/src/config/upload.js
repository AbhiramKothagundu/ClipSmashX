const multer = require("multer");
const path = require("path");

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

// Configure file filter
const fileFilter = (req, file, cb) => {
    // Accept video files
    const allowedMimeTypes = [
        "video/mp4",
        "video/mkv",
        "video/x-matroska",
        "video/quicktime",
        "video/avi",
        "video/x-msvideo",
        "video/x-ms-wmv",
        "video/webm",
        "application/octet-stream", // Some systems detect MKV as octet-stream
    ];

    const allowedExtensions = [".mp4", ".mkv", ".mov", ".avi", ".wmv", ".webm"];

    const fileExtension = path.extname(file.originalname).toLowerCase();

    // Check if either mimetype or extension is allowed
    if (
        allowedMimeTypes.includes(file.mimetype) ||
        allowedExtensions.includes(fileExtension)
    ) {
        cb(null, true);
    } else {
        cb(
            new Error(
                `Invalid file type. Allowed extensions: ${allowedExtensions.join(
                    ", "
                )}`
            ),
            false
        );
    }
};

// Upload limits
const limits = {
    fileSize: 25 * 1024 * 1024, // 25MB
};

// Create multer instance
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: limits,
});

module.exports = {
    upload,
    limits: {
        maxSize: 25 * 1024 * 1024, // 25MB
        minDuration: 5, // 5 seconds
        maxDuration: 25, // 25 seconds
    },
};
