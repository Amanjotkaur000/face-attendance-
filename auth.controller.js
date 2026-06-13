const jwt   = require("jsonwebtoken");
const Admin = require("../models/Admin.model");

const sign = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });

// POST /api/auth/admin/login
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success:false, message:"Email and password are required." });
    const admin = await Admin.findOne({ email:email.toLowerCase() }).select("+password");
    if (!admin || !(await admin.comparePassword(password)))
      return res.status(401).json({ success:false, message:"Invalid email or password." });
    const token = sign({ id:admin._id, role:admin.role });
    res.json({ success:true, token, admin:{ id:admin._id, name:admin.name, email:admin.email, role:admin.role } });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// POST /api/auth/student/login — kept for backward compat but not used by scan page
exports.studentLogin = async (req, res) => {
  res.status(400).json({ success:false, message:"Student login not required. Use face scanner." });
};