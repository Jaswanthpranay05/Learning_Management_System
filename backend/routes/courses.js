import express from "express";
import Course from "../models/course.js"; // note the .js extension

const router = express.Router();

// GET all courses
router.get("/", async (req, res) => {
  try {
    const courses = await Course.find();
    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST new course
router.post("/", async (req, res) => {
  const { title, description, author, category, thumbnailUrl } = req.body;
  const course = new Course({ title, description, author, category, thumbnailUrl });
  try {
    const newCourse = await course.save();
    res.status(201).json(newCourse);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router; // ES Modules export
