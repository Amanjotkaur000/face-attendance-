const jwt   = require("jsonwebtoken");
const Admin = require("../models/Admin.model");

const protect = async (req, res, next) => {
  try {
    let token = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1] : null;
    if (!token) return res.status(401).json({ success: false, message: "Not authenticated." });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role === "student") {
      req.user = { id: decoded.id, role: "student", rollNumber: decoded.rollNumber };
      return next();
    }

    const admin = await Admin.findById(decoded.id);
    if (!admin) return res.status(401).json({ success: false, message: "Invalid token." });
    req.user = admin;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Token invalid or expired." });
  }
};

const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role === "student")
    return res.status(403).json({ success: false, message: "Admin access required." });
  next();
};

module.exports = { protect, adminOnly };