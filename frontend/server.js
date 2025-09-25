const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files from current directory

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms_database';
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch(error => {
    console.error('MongoDB connection error:', error);
});

// User Schema
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    role: {
        type: String,
        enum: ['student', 'instructor', 'admin'],
        default: 'student'
    },
    enrolledCourses: [{
        courseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course'
        },
        enrolledAt: {
            type: Date,
            default: Date.now
        },
        progress: {
            type: Number,
            default: 0
        }
    }],
    profile: {
        bio: String,
        avatar: String,
        phone: String,
        dateOfBirth: Date,
        location: String
    }
}, {
    timestamps: true
});

// Course Schema
const courseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    instructor: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: ['programming', 'design', 'business', 'marketing', 'data-science', 'other']
    },
    level: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced'],
        default: 'beginner'
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    originalPrice: {
        type: Number
    },
    duration: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    reviews: {
        type: Number,
        default: 0
    },
    students: {
        type: Number,
        default: 0
    },
    lessons: [{
        title: String,
        duration: String,
        content: String,
        videoUrl: String,
        order: Number
    }],
    requirements: [String],
    whatYouWillLearn: [String],
    isPublished: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Progress Schema
const progressSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    lessonProgress: [{
        lessonId: String,
        completed: {
            type: Boolean,
            default: false
        },
        completedAt: Date
    }],
    overallProgress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    }
}, {
    timestamps: true
});

// Review Schema
const reviewSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

// Models
const User = mongoose.model('User', userSchema);
const Course = mongoose.model('Course', courseSchema);
const Progress = mongoose.model('Progress', progressSchema);
const Review = mongoose.model('Review', reviewSchema);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Auth Middleware
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }
        req.user = user;
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Invalid or expired token' });
    }
};

// Routes

// User Registration
app.post('/api/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: 'User already exists with this email' });
        }

        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create user
        const user = new User({
            name,
            email,
            password: hashedPassword
        });

        await user.save();

        res.status(201).json({ 
            message: 'User created successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// User Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Generate JWT
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get All Courses
app.get('/api/courses', async (req, res) => {
    try {
        const { category, search, level, minPrice, maxPrice } = req.query;
        let filter = { isPublished: true };

        // Apply filters
        if (category && category !== 'all') {
            filter.category = category;
        }

        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { instructor: { $regex: search, $options: 'i' } }
            ];
        }

        if (level) {
            filter.level = level;
        }

        if (minPrice !== undefined || maxPrice !== undefined) {
            filter.price = {};
            if (minPrice !== undefined) filter.price.$gte = Number(minPrice);
            if (maxPrice !== undefined) filter.price.$lte = Number(maxPrice);
        }

        const courses = await Course.find(filter)
            .select('-lessons') // Exclude lessons for performance
            .sort({ createdAt: -1 });

        res.json(courses);
    } catch (error) {
        console.error('Get courses error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get Single Course
app.get('/api/courses/:id', async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course || !course.isPublished) {
            return res.status(404).json({ message: 'Course not found' });
        }
        res.json(course);
    } catch (error) {
        console.error('Get course error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Enroll in Course
app.post('/api/courses/:id/enroll', authenticateToken, async (req, res) => {
    try {
        const courseId = req.params.id;
        const userId = req.user._id;

        // Check if course exists
        const course = await Course.findById(courseId);
        if (!course || !course.isPublished) {
            return res.status(404).json({ message: 'Course not found' });
        }

        // Check if user is already enrolled
        const user = await User.findById(userId);
        const isAlreadyEnrolled = user.enrolledCourses.some(
            enrollment => enrollment.courseId.toString() === courseId
        );

        if (isAlreadyEnrolled) {
            return res.status(409).json({ message: 'Already enrolled in this course' });
        }

        // Enroll user
        await User.findByIdAndUpdate(userId, {
            $push: {
                enrolledCourses: {
                    courseId: courseId,
                    enrolledAt: new Date(),
                    progress: 0
                }
            }
        });

        // Update course student count
        await Course.findByIdAndUpdate(courseId, {
            $inc: { students: 1 }
        });

        // Create progress tracking
        const progress = new Progress({
            userId,
            courseId,
            lessonProgress: [],
            overallProgress: 0
        });
        await progress.save();

        res.json({ message: 'Successfully enrolled in course' });
    } catch (error) {
        console.error('Enroll course error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get User Profile
app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('-password')
            .populate('enrolledCourses.courseId', 'title instructor image rating');
        
        res.json(user);
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Update User Profile
app.put('/api/profile', authenticateToken, async (req, res) => {
    try {
        const { name, profile } = req.body;
        const userId = req.user._id;

        const updateData = {};
        if (name) updateData.name = name;
        if (profile) updateData.profile = { ...req.user.profile, ...profile };

        const user = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        res.json({
            message: 'Profile updated successfully',
            user
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get Enrolled Courses
app.get('/api/enrolled-courses', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate('enrolledCourses.courseId')
            .select('enrolledCourses');

        const enrolledCourses = user.enrolledCourses.map(enrollment => ({
            ...enrollment.courseId.toObject(),
            enrolledAt: enrollment.enrolledAt,
            progress: enrollment.progress
        }));

        res.json(enrolledCourses);
    } catch (error) {
        console.error('Get enrolled courses error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Submit Course Review
app.post('/api/courses/:id/reviews', authenticateToken, async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const courseId = req.params.id;
        const userId = req.user._id;

        // Validation
        if (!rating || !comment) {
            return res.status(400).json({ message: 'Rating and comment are required' });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5' });
        }

        // Check if course exists
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        // Check if user already reviewed this course
        const existingReview = await Review.findOne({ userId, courseId });
        if (existingReview) {
            return res.status(409).json({ message: 'You have already reviewed this course' });
        }

        // Create review
        const review = new Review({
            userId,
            courseId,
            rating,
            comment
        });
        await review.save();

        // Update course rating and review count
        const allReviews = await Review.find({ courseId });
        const averageRating = allReviews.reduce((sum, review) => sum + review.rating, 0) / allReviews.length;

        await Course.findByIdAndUpdate(courseId, {
            rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
            reviews: allReviews.length
        });

        res.status(201).json({ message: 'Review submitted successfully' });
    } catch (error) {
        console.error('Submit review error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get Course Reviews
app.get('/api/courses/:id/reviews', async (req, res) => {
    try {
        const reviews = await Review.find({ courseId: req.params.id })
            .populate('userId', 'name profile.avatar')
            .sort({ createdAt: -1 });

        res.json(reviews);
    } catch (error) {
        console.error('Get reviews error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Seed some sample courses
const seedCourses = async () => {
    try {
        const courseCount = await Course.countDocuments();
        if (courseCount === 0) {
            const sampleCourses = [
                {
                    title: "Complete JavaScript Bootcamp",
                    description: "Master JavaScript from basics to advanced concepts. Learn ES6+, async programming, DOM manipulation, and modern frameworks.",
                    instructor: "John Smith",
                    category: "programming",
                    level: "beginner",
                    price: 89.99,
                    originalPrice: 149.99,
                    duration: "40 hours",
                    image: "https://images.pexels.com/photos/2004161/pexels-photo-2004161.jpeg?auto=compress&cs=tinysrgb&w=400",
                    rating: 4.8,
                    reviews: 1250,
                    students: 15420
                },
                {
                    title: "UI/UX Design Masterclass",
                    description: "Learn modern UI/UX design principles, user research, wireframing, prototyping, and design systems using Figma.",
                    instructor: "Sarah Johnson",
                    category: "design",
                    level: "intermediate",
                    price: 79.99,
                    originalPrice: 129.99,
                    duration: "35 hours",
                    image: "https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg?auto=compress&cs=tinysrgb&w=400",
                    rating: 4.9,
                    reviews: 890,
                    students: 8320
                },
                {
                    title: "Digital Marketing Strategy",
                    description: "Comprehensive guide to digital marketing including SEO, social media, content marketing, and analytics.",
                    instructor: "Mike Brown",
                    category: "marketing",
                    level: "beginner",
                    price: 69.99,
                    duration: "28 hours",
                    image: "https://images.pexels.com/photos/270408/pexels-photo-270408.jpeg?auto=compress&cs=tinysrgb&w=400",
                    rating: 4.6,
                    reviews: 567,
                    students: 4890
                },
                {
                    title: "Business Strategy & Leadership",
                    description: "Essential business strategy, leadership skills, team management, and organizational development.",
                    instructor: "Emily Davis",
                    category: "business",
                    level: "advanced",
                    price: 99.99,
                    originalPrice: 179.99,
                    duration: "50 hours",
                    image: "https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg?auto=compress&cs=tinysrgb&w=400",
                    rating: 4.7,
                    reviews: 423,
                    students: 2340
                },
                {
                    title: "Python for Data Science",
                    description: "Learn Python programming for data analysis, machine learning, and data visualization using pandas, numpy, and matplotlib.",
                    instructor: "Dr. Robert Wilson",
                    category: "programming",
                    level: "intermediate",
                    price: 94.99,
                    duration: "45 hours",
                    image: "https://images.pexels.com/photos/574071/pexels-photo-574071.jpeg?auto=compress&cs=tinysrgb&w=400",
                    rating: 4.8,
                    reviews: 756,
                    students: 6780
                },
                {
                    title: "Graphic Design Fundamentals",
                    description: "Master the basics of graphic design, typography, color theory, and layout using Adobe Creative Suite.",
                    instructor: "Lisa Anderson",
                    category: "design",
                    level: "beginner",
                    price: 59.99,
                    originalPrice: 99.99,
                    duration: "32 hours",
                    image: "https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg?auto=compress&cs=tinysrgb&w=400",
                    rating: 4.5,
                    reviews: 634,
                    students: 7890
                }
            ];

            await Course.insertMany(sampleCourses);
            console.log('Sample courses seeded successfully');
        }
    } catch (error) {
        console.error('Error seeding courses:', error);
    }
};

// Initialize database with sample data
seedCourses();

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ message: 'Internal server error' });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ message: 'API endpoint not found' });
});

// Serve HTML files for frontend routes
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.get('/courses', (req, res) => {
    res.sendFile(__dirname + '/courses.html');
});

app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/login.html');
});

app.get('/signup', (req, res) => {
    res.sendFile(__dirname + '/signup.html');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Frontend available at http://localhost:${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api`);
});