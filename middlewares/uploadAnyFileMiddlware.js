const multer = require("multer");
const path = require("path");

// Storage engine
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/lectures");
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const filename = `lecture-${Date.now()}${ext}`;
    cb(null, filename);
  },
});

// Accept ANY file type
const upload = multer({
  storage,
});

exports.uploadLectureFile = upload.single("file");
