const express = require("express");
const router = express.Router();
const videoController = require("../controllers/videoController");

router.post("/upload", videoController.uploadVideo);
router.get("/", videoController.getVideos);

module.exports = router;
