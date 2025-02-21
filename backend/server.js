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

// Middleware
app.use(bodyParser.json());
app.use(cors());
app.use("/uploads", express.static("uploads")); // Serve uploaded files

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

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
