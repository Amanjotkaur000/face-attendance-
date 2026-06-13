const Student = require("../models/Student.model");

// GET /api/students  — all students (no face descriptor)
exports.getAll = async (req, res) => {
  try {
    const { branch, semester, search } = req.query;
    const filter = { isActive: true };
    if (branch)   filter.branch   = branch;
    if (semester) filter.semester = semester;
    if (search)   filter.$or = [
      { name:       { $regex: search, $options: "i" } },
      { rollNumber: { $regex: search, $options: "i" } },
    ];
    const students = await Student.find(filter).select("-faceDescriptor -__v").sort({ branch: 1, rollNumber: 1 });
    res.json({ success: true, count: students.length, students });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// GET /api/students/face-descriptors  — used by browser face matcher
exports.getFaceDescriptors = async (req, res) => {
  try {
    const students = await Student.find({ isRegistered: true, isActive: true })
      .select("name rollNumber branch semester faceDescriptor photoBase64");
    const data = students.map(s => ({
      id: s._id, name: s.name, rollNumber: s.rollNumber,
      branch: s.branch, semester: s.semester,
      descriptor: s.faceDescriptor,
      photo: s.photoBase64,
    }));
    res.json({ success: true, count: data.length, descriptors: data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// GET /api/students/roll/:roll
exports.getByRoll = async (req, res) => {
  try {
    const s = await Student.findOne({ rollNumber: req.params.roll.toUpperCase(), isActive: true }).select("-faceDescriptor -__v");
    if (!s) return res.status(404).json({ success: false, message: "Student not found." });
    res.json({ success: true, student: s });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// GET /api/students/:id
exports.getById = async (req, res) => {
  try {
    const s = await Student.findById(req.params.id).select("-faceDescriptor -__v");
    if (!s) return res.status(404).json({ success: false, message: "Not found." });
    res.json({ success: true, student: s });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// POST /api/students  — create (admin)
exports.create = async (req, res) => {
  try {
    const s = await Student.create(req.body);
    res.status(201).json({ success: true, student: s.toSafeJSON() });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ success: false, message: "Roll number or email already exists." });
    res.status(400).json({ success: false, message: e.message });
  }
};

// PUT /api/students/:id  — update (admin)
exports.update = async (req, res) => {
  try {
    const forbidden = ["faceDescriptor","isRegistered","_id"];
    forbidden.forEach(f => delete req.body[f]);
    const s = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).select("-faceDescriptor -__v");
    if (!s) return res.status(404).json({ success: false, message: "Not found." });
    res.json({ success: true, student: s });
  } catch (e) { res.status(400).json({ success: false, message: e.message }); }
};

// DELETE /api/students/:id  — soft delete (admin)
exports.remove = async (req, res) => {
  try {
    const s = await Student.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!s) return res.status(404).json({ success: false, message: "Not found." });
    res.json({ success: true, message: "Student deactivated." });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// POST /api/students/register-face
// Body: { rollNumber, descriptor: float32[128], photoBase64: "data:image/jpeg;base64,..." }
exports.registerFace = async (req, res) => {
  try {
    const { rollNumber, descriptor, photoBase64 } = req.body;
    if (!rollNumber || !descriptor || !Array.isArray(descriptor) || descriptor.length !== 128)
      return res.status(400).json({ success: false, message: "rollNumber + 128-element descriptor required." });

    const student = await Student.findOne({ rollNumber: rollNumber.toUpperCase(), isActive: true });
    if (!student) return res.status(404).json({ success: false, message: "Student not found." });

    student.faceDescriptor = descriptor;
    student.isRegistered   = true;
    if (photoBase64) student.photoBase64 = photoBase64;
    await student.save();

    res.json({ success: true, message: `Face registered for ${student.name}.`, student: student.toSafeJSON() });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};