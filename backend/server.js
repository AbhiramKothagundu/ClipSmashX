const express = require("express");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();
const dotenv = require("dotenv");
const videoRoutes = require("./src/routes/videoRoutes");
const authMiddleware = require("./src/middleware/auth");
const Video = require("./src/models/videoModel");
const fs = require("fs");
const path = require("path");
const swaggerUi = require("swagger-ui-express");
const swaggerSpecs = require("./src/config/swagger");
const cors = require("cors");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Sets up our Express app
 * - Adds middleware
 * - Sets up routes
 * - Handles auth
 */
function setupApp(app) {
    // Basic stuff we need
    app.use(bodyParser.json());
    app.use(cors());
    app.use("/uploads", express.static("uploads"));
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

    // Set up our routes
    app.use(
        "/api/videos",
        (req, res, next) => {
            // Share routes skip auth
            if (req.path.startsWith("/share/")) {
                return next();
            }
            authMiddleware(req, res, next);
        },
        videoRoutes
    );

    // Health check
    app.get("/health", (req, res) => {
        res.json({ status: "ok", message: "Server is running" });
    });

    return app;
}

setupApp(app);

// Skip database initialization in test environment
if (process.env.NODE_ENV !== "test") {
    // Database setup
    const db = new sqlite3.Database("./database.db", (err) => {
        if (err) {
            console.error("Database connection error:", err);
            process.exit(1);
        }
        console.log("Connected to the SQLite database.");

        // Enable foreign keys
        db.run("PRAGMA foreign_keys = ON");

        // Initialize tables with error handling
        Video.createTable()
            .then(() => {
                console.log("Database tables initialized successfully");
            })
            .catch((err) => {
                console.error("Failed to initialize database tables:", err);
                process.exit(1);
            });
    });

    // Make db available globally
    global.db = db;

    // Handle process termination
    process.on("SIGINT", () => {
        db.close((err) => {
            if (err) {
                console.error(err.message);
            }
            console.log("Closed the database connection.");
            process.exit(0);
        });
    });

    const server = app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

module.exports = { app, setupApp };
