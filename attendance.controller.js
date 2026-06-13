const Attendance = require("../models/Attendance.model");
const Student    = require("../models/Student.model");

const today   = () => new Date().toISOString().split("T")[0];
const nowTime = () => new Date().toTimeString().slice(0,8);

/* ─────────────────────────────────────────────
   PROTECTED — admin / student (JWT required)
───────────────────────────────────────────── */
exports.mark = async (req, res) => {
  try {
    const { rollNumber, confidence } = req.body;
    if (!rollNumber) return res.status(400).json({ success:false, message:"rollNumber required." });
    const student = await Student.findOne({ rollNumber:rollNumber.toUpperCase(), isActive:true });
    if (!student) return res.status(404).json({ success:false, message:"Student not found." });
    if (!student.isRegistered) return res.status(400).json({ success:false, message:"Face not registered." });
    const date=today(), time=nowTime();
    const existing = await Attendance.findOne({ student:student._id, date });
    if (existing) return res.status(409).json({ success:false, alreadyMarked:true, message:`Already marked at ${existing.time}`, record:existing, student:student.toSafeJSON() });
    const record = await Attendance.create({ student:student._id, rollNumber:student.rollNumber, studentName:student.name, branch:student.branch, semester:student.semester, date, time, status:"Present", confidence:confidence??null, markedVia:"face_recognition" });
    res.status(201).json({ success:true, message:`Attendance marked for ${student.name}!`, record, student:student.toSafeJSON() });
  } catch(e) {
    if (e.code===11000) return res.status(409).json({ success:false, message:"Already marked today." });
    res.status(500).json({ success:false, message:e.message });
  }
};

exports.getToday = async (req, res) => {
  try {
    const records = await Attendance.find({ date:today() }).populate("student","name rollNumber branch semester photoBase64").sort({ time:-1 });
    res.json({ success:true, date:today(), count:records.length, records });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.getSummary = async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments({ isActive:true });
    const registered    = await Student.countDocuments({ isActive:true, isRegistered:true });
    const presentToday  = await Attendance.countDocuments({ date:today(), status:"Present" });
    res.json({ success:true, date:today(), totalStudents, registeredStudents:registered, presentToday, absentToday:totalStudents-presentToday, attendanceRate:totalStudents>0?((presentToday/totalStudents)*100).toFixed(1):0 });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.getStudentHistory = async (req, res) => {
  try {
    const student = await Student.findOne({ rollNumber:req.params.roll.toUpperCase() }).select("-faceDescriptor");
    if (!student) return res.status(404).json({ success:false, message:"Not found." });
    const records = await Attendance.find({ student:student._id }).sort({ date:-1 }).limit(60);
    const total   = await Attendance.countDocuments({ student:student._id });
    const present = await Attendance.countDocuments({ student:student._id, status:"Present" });
    res.json({ success:true, student:student.toSafeJSON(), stats:{ total, present, absent:total-present, percentage:total>0?Number(((present/total)*100).toFixed(1)):0 }, records });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.getGraphData = async (req, res) => {
  try {
    const student = await Student.findOne({ rollNumber:req.params.roll.toUpperCase() });
    if (!student) return res.status(404).json({ success:false, message:"Not found." });
    const days=30;
    const dates=Array.from({length:days},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-(days-1-i)); return d.toISOString().split("T")[0]; });
    const records=await Attendance.find({ student:student._id, date:{$gte:dates[0],$lte:dates[days-1]} }).select("date status");
    const presentSet=new Set(records.filter(r=>r.status==="Present").map(r=>r.date));
    const chartData=dates.map(d=>({ date:d, present:presentSet.has(d)?1:0 }));
    const weeks={};
    records.forEach(r=>{ const d=new Date(r.date),ws=new Date(d); ws.setDate(d.getDate()-d.getDay()); const key=ws.toISOString().split("T")[0]; if(!weeks[key]) weeks[key]={week:key,present:0,total:0}; weeks[key].total++; if(r.status==="Present") weeks[key].present++; });
    res.json({ success:true, chartData, weekly:Object.values(weeks).slice(-8), totalDays:days, presentDays:presentSet.size });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.getReport = async (req, res) => {
  try {
    const { from, to, branch } = req.query;
    const filter={};
    if (branch) filter.branch=branch;
    if (from||to) { filter.date={}; if(from) filter.date.$gte=from; if(to) filter.date.$lte=to; }
    const records = await Attendance.find(filter).populate("student","name rollNumber photoBase64").sort({ date:-1 });
    res.json({ success:true, count:records.length, records });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

/* ─────────────────────────────────────────────
   PUBLIC — no JWT needed (used by scan page)
───────────────────────────────────────────── */

// POST /api/attendance/mark-public
exports.markPublic = async (req, res) => {
  try {
    const { rollNumber, confidence } = req.body;
    if (!rollNumber) return res.status(400).json({ success:false, message:"rollNumber required." });
    const student = await Student.findOne({ rollNumber:rollNumber.toUpperCase(), isActive:true });
    if (!student) return res.status(404).json({ success:false, message:"Student not found in database." });
    if (!student.isRegistered) return res.status(400).json({ success:false, message:"Face not registered. See admin." });
    const date=today(), time=nowTime();
    const existing = await Attendance.findOne({ student:student._id, date });
    if (existing) return res.status(409).json({ success:false, alreadyMarked:true, message:`Already marked at ${existing.time}`, record:existing, student:student.toSafeJSON() });
    const record = await Attendance.create({ student:student._id, rollNumber:student.rollNumber, studentName:student.name, branch:student.branch, semester:student.semester, date, time, status:"Present", confidence:confidence??null, markedVia:"face_recognition" });
    res.status(201).json({ success:true, message:`Attendance marked for ${student.name}!`, record, student:student.toSafeJSON() });
  } catch(e) {
    if (e.code===11000) return res.status(409).json({ success:false, message:"Already marked today." });
    res.status(500).json({ success:false, message:e.message });
  }
};

// GET /api/attendance/student-public/:roll
exports.getStudentPublic = async (req, res) => {
  try {
    const student = await Student.findOne({ rollNumber:req.params.roll.toUpperCase(), isActive:true }).select("-faceDescriptor -password");
    if (!student) return res.status(404).json({ success:false, message:"Student not found." });
    const records = await Attendance.find({ student:student._id }).sort({ date:-1 }).limit(60);
    const total   = await Attendance.countDocuments({ student:student._id });
    const present = await Attendance.countDocuments({ student:student._id, status:"Present" });
    res.json({ success:true, student:student.toObject(), stats:{ total, present, absent:total-present, percentage:total>0?Number(((present/total)*100).toFixed(1)):0 }, records });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// GET /api/attendance/graph-public/:roll
exports.getGraphPublic = async (req, res) => {
  try {
    const student = await Student.findOne({ rollNumber:req.params.roll.toUpperCase() });
    if (!student) return res.status(404).json({ success:false, message:"Not found." });
    const days=30;
    const dates=Array.from({length:days},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-(days-1-i)); return d.toISOString().split("T")[0]; });
    const records=await Attendance.find({ student:student._id, date:{$gte:dates[0],$lte:dates[days-1]} }).select("date status");
    const presentSet=new Set(records.filter(r=>r.status==="Present").map(r=>r.date));
    const chartData=dates.map(d=>({ date:d, present:presentSet.has(d)?1:0 }));
    res.json({ success:true, chartData, totalDays:days, presentDays:presentSet.size });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};