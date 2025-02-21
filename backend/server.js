const express = require("express");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();
const dotenv = require("dotenv");
const videoRoutes = require("./src/routes/videoRoutes");
const authMiddleware = require("./src/middleware/auth");
const Video = require("./src/models/videoModel");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

// Database setup
const db = new sqlite3.Database("./database.db", (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log("Connected to the SQLite database.");

    // Initialize tables
    Video.createTable();
});

// Make db available globally
global.db = db;

// Routes
app.use("/api/videos", authMiddleware, videoRoutes);

// Basic health check route
app.get("/health", (req, res) => {
    res.json({ status: "ok", message: "Server is running" });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

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
