import express from "express";
import Course from "../models/course.js";

const router = express.Router();

// Get all courses (only for logged-in users)
router.get("/", async (req, res) => {
  try {
    const courses = await Course.find();
    res.json(courses);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Add new course (only admin users)
router.post("/", async (req, res) => {
  try {
    const { title, description, image } = req.body;
    const newCourse = new Course({ title, description, image });
    await newCourse.save();
    res.json(newCourse);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

export default router;
