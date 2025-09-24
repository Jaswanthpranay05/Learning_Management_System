import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import courseRoutes from "./routes/courses.js";
import admin from "firebase-admin";

dotenv.config();
const app = express();

// Firebase Admin setup (use service account)
import serviceAccount from "./firebase-service-account.json" assert { type: "json" };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

app.use(cors());
app.use(express.json());

// Middleware to verify Firebase tokens
const verifyFirebaseToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ msg: "Unauthorized" });

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded; // user info from Firebase
    next();
  } catch (err) {
    res.status(401).json({ msg: "Invalid token" });
  }
};

// Routes
app.use("/api/courses", verifyFirebaseToken, courseRoutes);

// DB + Server
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
});
