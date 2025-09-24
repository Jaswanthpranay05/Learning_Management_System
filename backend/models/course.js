const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  author: String,
  category: String,
  thumbnailUrl: String,
}, { timestamps: true });

module.exports = mongoose.model("Course", courseSchema);
