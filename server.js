require("dotenv").config();
const express    = require("express");
const helmet     = require("helmet");
const cors       = require("cors");
const morgan     = require("morgan");
const rateLimit  = require("express-rate-limit");
const connectDB  = require("./config/db");

const app = express();
connectDB();

// ── Middleware ──────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: "*", methods: ["GET","POST","PUT","DELETE"], allowedHeaders: ["Content-Type","Authorization"] }));
app.use(express.json({ limit: "15mb" }));   // large limit for base64 photos
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300, message: { success: false, message: "Too many requests." } }));

// ── Routes ──────────────────────────────────────
app.use("/api/auth",       require("./routes/auth.routes"));
app.use("/api/students",   require("./routes/student.routes"));
app.use("/api/attendance", require("./routes/attendance.routes"));

// ── Admin dashboard stats ───────────────────────
app.get("/api/admin/dashboard", require("./middleware/auth").protect, require("./middleware/auth").adminOnly, async (req, res) => {
  const Student    = require("./models/Student.model");
  const Attendance = require("./models/Attendance.model");
  const today      = new Date().toISOString().split("T")[0];
  try {
    const [total, registered, presentToday, branchData] = await Promise.all([
      Student.countDocuments({ isActive: true }),
      Student.countDocuments({ isActive: true, isRegistered: true }),
      Attendance.countDocuments({ date: today, status: "Present" }),
      Student.aggregate([{ $match: { isActive: true } }, { $group: { _id: "$branch", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    ]);
    res.json({ success: true, stats: {
      total, registered, unregistered: total - registered,
      presentToday, absentToday: total - presentToday,
      attendanceRate: total > 0 ? ((presentToday / total) * 100).toFixed(1) : 0,
      branchData: branchData.map(b => ({ branch: b._id, count: b.count })),
    }});
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Health check ────────────────────────────────
app.get("/api/health", (req, res) => res.json({ success: true, message: "FaceAttend API is running ✅", time: new Date() }));

// ── 404 ─────────────────────────────────────────
app.use((req, res) => res.status(404).json({ success: false, message: "Route not found." }));

// ── Error handler ───────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀  FaceAttend API  →  http://localhost:${PORT}`);
  console.log(`🗄️   MongoDB         →  ${process.env.MONGO_URI}`);
  console.log(`🌍  Environment     →  ${process.env.NODE_ENV}\n`);
});