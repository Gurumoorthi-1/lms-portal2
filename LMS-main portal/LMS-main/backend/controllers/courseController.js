import Course from '../models/Course.js';

export const getCourses = async (req, res) => {
  try {
    const courses = await Course.find();
    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
export const createCourse = async (req, res) => {
  try {
    const { title, description } = req.body;

    const slug = title.toLowerCase().replace(/\s+/g, "-");

    // 🔴 CHECK IF EXISTS FIRST
    const existing = await Course.findOne({ slug });

    if (existing) {
      return res.status(400).json({
        message: "Course already exists",
      });
    }

    const course = new Course({
      title,
      description,
      slug,
    });

    await course.save();

    res.status(201).json(course);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getCourse = async (req, res) => {
  try {
    const course = await Course.findOne({ slug: req.params.slug });
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json(course);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
