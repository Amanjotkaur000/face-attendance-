const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  student:     { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  rollNumber:  { type: String, required: true },
  studentName: { type: String, required: true },
  branch:      { type: String, required: true },
  semester:    { type: String, required: true },
  date:        { type: String, required: true },   // "YYYY-MM-DD"
  time:        { type: String, required: true },   // "HH:MM:SS"
  status:      { type: String, enum: ["Present","Absent"], default: "Present" },
  confidence:  { type: Number, default: null },
  markedVia:   { type: String, enum: ["face_recognition","manual"], default: "face_recognition" },
}, { timestamps: true });

// One record per student per day
attendanceSchema.index({ student: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);