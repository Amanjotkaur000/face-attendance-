/*
  seed.js — Safe database setup
  
  SAFE MODE (default):
    - Only adds students that don't already exist
    - NEVER deletes registered faces, photos, or attendance
    - Safe to run multiple times
  
  RESET MODE (only when you add --reset flag):
    - Wipes everything and starts fresh
    - Use only when setting up for the first time
    - Command: node config/seed.js --reset
*/

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const RESET_MODE = process.argv.includes("--reset");

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB");

  const db = mongoose.connection.db;

  if (RESET_MODE) {
    // ── RESET: wipe everything ──────────────────────────
    console.log("⚠️  RESET MODE — deleting all data...");
    await db.collection("students").deleteMany({});
    await db.collection("admins").deleteMany({});
    await db.collection("attendances").deleteMany({});
    console.log("🗑️  All data cleared");
  }

  // ── Students: only insert if roll number doesn't exist ──
  const studentList = [
    { name:"Rahul Sharma",  rollNumber:"CS2024001", email:"rahul@college.edu",  phone:"9876543210", semester:"Semester 5", branch:"Computer Science Engineering" },
    { name:"Priya Patel",   rollNumber:"CS2024002", email:"priya@college.edu",  phone:"9876543211", semester:"Semester 5", branch:"Computer Science Engineering" },
    { name:"Arjun Singh",   rollNumber:"IT2024001", email:"arjun@college.edu",  phone:"9876543212", semester:"Semester 3", branch:"Information Technology" },
    { name:"Sneha Verma",   rollNumber:"IT2024002", email:"sneha@college.edu",  phone:"9876543213", semester:"Semester 3", branch:"Information Technology" },
    { name:"Rohit Kumar",   rollNumber:"EC2024001", email:"rohit@college.edu",  phone:"9876543214", semester:"Semester 7", branch:"Electronics & Communication" },
    { name:"Anjali Gupta",  rollNumber:"ME2024001", email:"anjali@college.edu", phone:"9876543215", semester:"Semester 1", branch:"Mechanical Engineering" },
    { name:"Vikram Yadav",  rollNumber:"CE2024001", email:"vikram@college.edu", phone:"9876543216", semester:"Semester 4", branch:"Civil Engineering" },
    { name:"Pooja Mishra",  rollNumber:"EE2024001", email:"pooja@college.edu",  phone:"9876543217", semester:"Semester 6", branch:"Electrical Engineering" },
  ];

  let added = 0, skipped = 0;
  for (const s of studentList) {
    const exists = await db.collection("students").findOne({ rollNumber: s.rollNumber });
    if (exists) {
      console.log(`⏭️  Skipped ${s.name} (${s.rollNumber}) — already exists, face data preserved`);
      skipped++;
    } else {
      await db.collection("students").insertOne({
        ...s,
        faceDescriptor: null,
        photoBase64:    null,
        isRegistered:   false,
        isActive:       true,
        createdAt:      new Date(),
      });
      console.log(`✅ Added ${s.name} (${s.rollNumber})`);
      added++;
    }
  }
  console.log(`\n📊 Students: ${added} added, ${skipped} skipped (faces preserved)`);

  // ── Admin: only create if it doesn't exist ──────────────
  const adminExists = await db.collection("admins").findOne({ email: "admin@faceattend.com" });
  if (adminExists) {
    console.log("⏭️  Admin already exists — skipped");
  } else {
    const hashed = await bcrypt.hash("Admin@123", 12);
    await db.collection("admins").insertOne({
      name: "System Admin", email: "admin@faceattend.com",
      password: hashed, role: "admin", createdAt: new Date(),
    });
    console.log("✅ Admin created → admin@faceattend.com / Admin@123");
  }

  // ── Show current database status ─────────────────────────
  const totalStudents     = await db.collection("students").countDocuments();
  const registeredFaces   = await db.collection("students").countDocuments({ isRegistered: true });
  const totalAttendance   = await db.collection("attendances").countDocuments();

  console.log("\n📈 Current database status:");
  console.log(`   Students total    : ${totalStudents}`);
  console.log(`   Faces registered  : ${registeredFaces}  ← these are SAFE`);
  console.log(`   Attendance records: ${totalAttendance}  ← these are SAFE`);
  console.log("\n🎉 Done!\n");

  if (RESET_MODE) {
    console.log("ℹ️  RESET was used — all faces cleared. Re-register students in Admin panel.\n");
  } else {
    console.log("ℹ️  Safe mode used — registered faces are preserved.");
    console.log("ℹ️  To reset everything: node config/seed.js --reset\n");
  }

  process.exit(0);
}

seed().catch(e => { console.error("Seed error:", e); process.exit(1); });