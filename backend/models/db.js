// db.js
const mongoose = require("mongoose");
require("dotenv").config();

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB Connected");
  } catch (e) {
    console.error("MongoDB error:", e.message);
  }
}

module.exports = connectDB;
