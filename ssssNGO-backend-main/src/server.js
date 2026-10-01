const path = require("path");
const fs = require("fs");
require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");

// ================= CREATE UPLOAD FOLDER =================
const uploadPath = path.resolve(__dirname, "..", "uploads");

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
  console.log("Uploads folder created");
}

// ================= DB + SERVER =================
const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
  });
};

start();
