const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  rollNumber:  { type: String, required: true, unique: true, trim: true, uppercase: true },
  email:       { type: String, required: true, unique: true, trim: true, lowercase: true },
  phone:       { type: String, trim: true },
  semester:    { type: String, required: true,
    enum: ["Semester 1","Semester 2","Semester 3","Semester 4",
           "Semester 5","Semester 6","Semester 7","Semester 8"] },
  branch:      { type: String, required: true,
    enum: ["Computer Science Engineering","Information Technology",
           "Electronics & Communication","Mechanical Engineering",
           "Civil Engineering","Electrical Engineering"] },

  // ── Face data (set when admin registers the student's face) ──
  photoBase64:    { type: String,  default: null },   // JPEG base64, shown in UI
  faceDescriptor: { type: [Number], default: null },  // 128-float array from face-api.js
  isRegistered:   { type: Boolean, default: false },  // true once face is captured

  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Never return the face descriptor in normal responses
studentSchema.methods.toSafeJSON = function () {
  const o = this.toObject();
  delete o.faceDescriptor;
  delete o.__v;
  return o;
};

module.exports = mongoose.model("Student", studentSchema);