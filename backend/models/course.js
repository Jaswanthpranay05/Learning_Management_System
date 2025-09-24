import mongoose from "mongoose";

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  author: String,
  category: String,
  thumbnailUrl: String,
}, { timestamps: true });

export default mongoose.model("Course", courseSchema);  // <-- ES Modules export
