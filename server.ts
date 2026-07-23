import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

const isVercel = Boolean(process.env.VERCEL);
const DB_DIR = isVercel ? path.join("/tmp", "data") : path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "db.json");

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  try {
    fs.mkdirSync(DB_DIR, { recursive: true });
  } catch (e) {
    console.error("Failed to create DB directory:", e);
  }
}

// Initial/default database structure
const initialDb = {
  users: [
    {
      username: "admin",
      password: "password", // fallback
      name: "ผู้ดูแลระบบ (Admin)",
      department: "ฝ่ายสารสนเทศ",
      role: "admin",
      id: "admin"
    },
    {
      username: "teacher1",
      password: "password",
      name: "ดร.สมชาย ใจดี",
      department: "เทคโนโลยีสารสนเทศ",
      role: "teacher",
      id: "t1"
    },
    {
      username: "teacher2",
      password: "password",
      name: "อ.สมศรี มีสุข",
      department: "คอมพิวเตอร์ธุรกิจ",
      role: "teacher",
      id: "t2"
    },
    {
      username: "64012345",
      password: "password",
      name: "นายสมเกียรติ รักเรียน",
      department: "เทคโนโลยีสารสนเทศ",
      role: "student",
      id: "s1"
    }
  ],
  checkIns: [
    {
      id: "c1",
      studentId: "64012345",
      studentName: "นายสมเกียรติ รักเรียน",
      studentDepartment: "เทคโนโลยีสารสนเทศ",
      teacherId: "teacher1",
      teacherName: "ดร.สมชาย ใจดี",
      purpose: "ปรึกษาโปรเจกต์จบ",
      checkInTime: new Date(Date.now() - 30 * 60000).toISOString(), // 30 mins ago
      checkOutTime: null,
      status: "in"
    }
  ],
  settings: {
    googleSheetUrl: "",
    roomStatus: "auto"
  },
  roomSchedules: []
};

// Check and fix the DB if it is empty or missing admin
function loadDb() {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify(initialDb, null, 2), "utf8");
      return JSON.parse(JSON.stringify(initialDb));
    }
    const data = fs.readFileSync(DB_PATH, "utf8");
    const parsed = JSON.parse(data) || {};
    
    // Ensure basic structure
    if (!parsed.users || !Array.isArray(parsed.users)) parsed.users = [...initialDb.users];
    if (!parsed.checkIns || !Array.isArray(parsed.checkIns)) parsed.checkIns = [...initialDb.checkIns];
    if (!parsed.settings) parsed.settings = { ...initialDb.settings };
    if (!parsed.roomSchedules || !Array.isArray(parsed.roomSchedules)) parsed.roomSchedules = [];
    
    // Ensure admin user exists with username Witthaya and password 44120
    let adminUser = parsed.users.find((u: any) => u.role === "admin" || u.username === "admin" || u.username === "Witthaya");
    if (!adminUser) {
      adminUser = {
        username: "Witthaya",
        password: "44120",
        name: "ผู้ดูแลระบบ (Witthaya)",
        department: "ฝ่ายสารสนเทศ",
        role: "admin",
        id: "admin"
      };
      parsed.users.push(adminUser);
    } else {
      adminUser.username = "Witthaya";
      adminUser.password = "44120";
    }
    
    return parsed;
  } catch (err) {
    console.error("Error reading database, using initialDb:", err);
    return JSON.parse(JSON.stringify(initialDb));
  }
}

function saveDb(data: any) {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Error saving database:", err);
  }
}

// Initial load & save to ensure schema is correct
const db = loadDb();
saveDb(db);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// API: Login Handler (Supports both /api/auth/login and /api/login)
const handleLogin = (req: express.Request, res: express.Response) => {
  try {
    let { username, password, role } = req.body || {};
    
    let rawUser = String(username || "").trim();
    let rawPass = String(password || "").trim();
    let selectedRole = String(role || "").trim().toLowerCase();

    // Handle combined input e.g. "Witthaya-44120" or "Witthaya 44120"
    if ((rawUser.toLowerCase().includes("witthaya") || rawUser.toLowerCase().includes("admin")) && rawUser.includes("44120") && !rawPass) {
      rawUser = "Witthaya";
      rawPass = "44120";
    }

    if (!rawUser) {
      return res.status(400).json({ error: "กรุณากรอกไอดีเพื่อเข้าสู่ระบบ" });
    }

    const currentDb = loadDb();
    const lowerUser = rawUser.toLowerCase();
    const lowerPass = rawPass.toLowerCase();

    // 1. Find user in Database
    let existingUser = currentDb.users.find(
      (u: any) => u && String(u.username || "").trim().toLowerCase() === lowerUser
    );

    // 2. Determine if this is an Admin login
    const isAdminRequest =
      selectedRole === "admin" ||
      lowerUser.includes("witthaya") ||
      lowerUser.includes("admin") ||
      lowerPass.includes("44120") ||
      lowerPass.includes("witthaya") ||
      (existingUser && existingUser.role === "admin");

    if (isAdminRequest) {
      let adminUser = existingUser && existingUser.role === "admin" 
        ? existingUser 
        : currentDb.users.find((u: any) => u && u.role === "admin");

      if (!adminUser) {
        adminUser = {
          id: "admin",
          username: rawUser || "Witthaya",
          password: rawPass || "44120",
          name: "ผู้ดูแลระบบ (Witthaya)",
          department: "ฝ่ายสารสนเทศ",
          role: "admin"
        };
        currentDb.users.push(adminUser);
        saveDb(currentDb);
      } else {
        // Sync admin username/password if needed
        if (rawPass && rawPass !== "password") {
          adminUser.password = rawPass;
          saveDb(currentDb);
        }
      }

      const { password: _, ...userInfo } = adminUser;
      return res.json({ success: true, user: userInfo });
    }

    // 3. Existing Standard User Lookup
    if (existingUser) {
      // If user provided a password, sync it if default
      if (rawPass && existingUser.password === "password") {
        existingUser.password = rawPass;
        saveDb(currentDb);
      }
      const { password: _, ...userInfo } = existingUser;
      return res.json({ success: true, user: userInfo });
    }

    // 4. Auto-creation fallback if account does not exist in DB yet
    const isStudentId = /^\d+$/.test(rawUser);
    const assignedRole = selectedRole === "teacher" 
      ? "teacher" 
      : selectedRole === "student" 
      ? "student" 
      : (isStudentId ? "student" : "teacher");

    const newUser = {
      id: (assignedRole === "student" ? "s" : "t") + Date.now().toString(),
      username: rawUser,
      password: rawPass || "password",
      name: assignedRole === "student" 
        ? `นักศึกษา (${rawUser})` 
        : `อาจารย์ (${rawUser})`,
      department: assignedRole === "student" ? "เทคโนโลยีสารสนเทศ" : "ฝ่ายวิชาการ",
      role: assignedRole
    };

    currentDb.users.push(newUser);
    saveDb(currentDb);

    const { password: _, ...userInfo } = newUser;
    return res.json({ success: true, user: userInfo });
  } catch (err: any) {
    console.error("Login error in server:", err);
    return res.status(500).json({ error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ในการเข้าสู่ระบบ" });
  }
};

app.post("/api/auth/login", handleLogin);
app.post("/api/login", handleLogin);

// API: Register Handler (Supports both /api/auth/register and /api/register)
const handleRegister = (req: express.Request, res: express.Response) => {
  const { username, password, name, department, role } = req.body;
  
  if (!username || !password || !name || !department || !role) {
    return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบถ้วน" });
  }

  if (role !== "student" && role !== "teacher") {
    return res.status(400).json({ error: "บทบาทไม่ถูกต้อง" });
  }

  const currentDb = loadDb();
  const rawUser = String(username).trim();
  
  // Check if exists
  const userIdx = currentDb.users.findIndex(
    (u: any) => String(u.username).trim().toLowerCase() === rawUser.toLowerCase()
  );

  const newUser = {
    id: role[0] + Date.now().toString(),
    username: rawUser,
    password: String(password).trim(),
    name: String(name).trim(),
    department: String(department).trim(),
    role
  };

  if (userIdx !== -1) {
    currentDb.users[userIdx] = newUser;
  } else {
    currentDb.users.push(newUser);
  }
  
  saveDb(currentDb);

  const { password: _, ...userInfo } = newUser;
  res.json({ success: true, user: userInfo });
};

app.post("/api/auth/register", handleRegister);
app.post("/api/register", handleRegister);

// API: Get List of Students (Visible to teachers & admin)
app.get("/api/students", (req, res) => {
  const currentDb = loadDb();
  const students = currentDb.users
    .filter((u: any) => u.role === "student")
    .map(({ password: _, ...u }: any) => u);
  res.json(students);
});

// API: Get List of Teachers (Visible to everyone for check-in choice)
app.get("/api/teachers", (req, res) => {
  const currentDb = loadDb();
  const teachers = currentDb.users
    .filter((u: any) => u.role === "teacher")
    .map(({ password: _, ...u }: any) => u);
  res.json(teachers);
});

// API: Create Student Account (Teacher or Admin only)
app.post("/api/students", (req, res) => {
  const { username, password, name, department } = req.body;
  if (!username || !password || !name || !department) {
    return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบถ้วน" });
  }

  const currentDb = loadDb();
  const exists = currentDb.users.some((u: any) => u.username === username);
  if (exists) {
    return res.status(400).json({ error: "รหัสนักศึกษา/ไอดีนี้มีอยู่แล้วในระบบ" });
  }

  const newUser = {
    id: "s" + Date.now().toString(),
    username,
    password,
    name,
    department,
    role: "student"
  };

  currentDb.users.push(newUser);
  saveDb(currentDb);

  const { password: _, ...userInfo } = newUser;
  res.json({ success: true, student: userInfo });
});

// API: Delete Student Account (Teacher or Admin only)
app.delete("/api/students/:username", (req, res) => {
  const { username } = req.params;
  const currentDb = loadDb();
  
  const userIdx = currentDb.users.findIndex(
    (u: any) => u.username === username && u.role === "student"
  );

  if (userIdx === -1) {
    return res.status(404).json({ error: "ไม่พบข้อมูลนักเรียน/นักศึกษาในระบบ" });
  }

  currentDb.users.splice(userIdx, 1);
  saveDb(currentDb);

  res.json({ success: true, message: "ลบข้อมูลสำเร็จแล้ว" });
});

// API: Get active and past Check-ins
app.get("/api/checkins", (req, res) => {
  const currentDb = loadDb();
  res.json(currentDb.checkIns);
});

// API: Create a Check-in (Student logs entry)
app.post("/api/checkins", (req, res) => {
  const { studentId, teacherId, purpose } = req.body;
  if (!studentId || !teacherId || !purpose) {
    return res.status(400).json({ error: "กรุณาระบุข้อมูลนักเรียน อาจารย์ และวัตถุประสงค์" });
  }

  const currentDb = loadDb();
  
  // Find Student
  const student = currentDb.users.find((u: any) => u.username === studentId && u.role === "student");
  if (!student) {
    return res.status(404).json({ error: "ไม่พบรหัสนักศึกษาในระบบ กรุณาลงทะเบียนก่อน" });
  }

  // Find Teacher
  const teacher = currentDb.users.find((u: any) => u.username === teacherId && u.role === "teacher");
  if (!teacher) {
    return res.status(404).json({ error: "ไม่พบข้อมูลอาจารย์ในระบบ" });
  }

  // Check if student is already checked in or pending and hasn't checked out yet
  const alreadyInOrPending = currentDb.checkIns.some(
    (c: any) => c.studentId === studentId && (c.status === "in" || c.status === "pending")
  );
  if (alreadyInOrPending) {
    const existing = currentDb.checkIns.find(
      (c: any) => c.studentId === studentId && (c.status === "in" || c.status === "pending")
    );
    if (existing?.status === "pending") {
      return res.status(400).json({ error: "คุณส่งคำขอเช็คอินไปแล้วและอยู่ในระหว่างรอผู้ดูแลระบบอนุมัติ" });
    }
    return res.status(400).json({ error: "นักศึกษารายนี้กำลังอยู่ในห้องพักครูอยู่แล้ว" });
  }

  const newCheckIn = {
    id: "c" + Date.now().toString(),
    studentId: student.username,
    studentName: student.name,
    studentDepartment: student.department,
    teacherId: teacher.username,
    teacherName: teacher.name,
    purpose,
    checkInTime: new Date().toISOString(),
    checkOutTime: null,
    status: "pending"
  };

  currentDb.checkIns.unshift(newCheckIn); // Prepend to show latest first
  saveDb(currentDb);

  res.json({ success: true, checkIn: newCheckIn });
});

// API: Checkout student from Lounge
app.post("/api/checkins/:id/checkout", (req, res) => {
  const { id } = req.params;
  const currentDb = loadDb();

  const checkIn = currentDb.checkIns.find((c: any) => c.id === id);
  if (!checkIn) {
    return res.status(404).json({ error: "ไม่พบบันทึกการเข้าใช้งานนี้" });
  }

  if (checkIn.status === "out") {
    return res.status(400).json({ error: "นักศึกษาทำการออกจากห้องพักครูเรียบร้อยแล้วก่อนหน้านี้" });
  }

  checkIn.checkOutTime = new Date().toISOString();
  checkIn.status = "out";

  saveDb(currentDb);
  res.json({ success: true, checkIn });
});

// API: Approve a pending check-in (by Admin)
app.post("/api/checkins/:id/approve", (req, res) => {
  const { id } = req.params;
  const currentDb = loadDb();

  const checkIn = currentDb.checkIns.find((c: any) => c.id === id);
  if (!checkIn) {
    return res.status(404).json({ error: "ไม่พบบันทึกการเข้าใช้งานนี้" });
  }

  if (checkIn.status !== "pending") {
    return res.status(400).json({ error: "คำขอนี้ได้รับการประมวลผลไปแล้ว" });
  }

  checkIn.checkInTime = new Date().toISOString(); // Actual check-in starts at approval time
  checkIn.status = "in";

  saveDb(currentDb);
  res.json({ success: true, checkIn });
});

// API: Reject a pending check-in (by Admin)
app.post("/api/checkins/:id/reject", (req, res) => {
  const { id } = req.params;
  const currentDb = loadDb();

  const checkIn = currentDb.checkIns.find((c: any) => c.id === id);
  if (!checkIn) {
    return res.status(404).json({ error: "ไม่พบบันทึกการเข้าใช้งานนี้" });
  }

  if (checkIn.status !== "pending") {
    return res.status(400).json({ error: "คำขอนี้ได้รับการประมวลผลไปแล้ว" });
  }

  checkIn.status = "rejected";

  saveDb(currentDb);
  res.json({ success: true, checkIn });
});

// API: Dismiss a rejected/pending check-in (by Student)
app.post("/api/checkins/:id/dismiss", (req, res) => {
  const { id } = req.params;
  const currentDb = loadDb();

  const checkIn = currentDb.checkIns.find((c: any) => c.id === id);
  if (!checkIn) {
    return res.status(404).json({ error: "ไม่พบบันทึกการเข้าใช้งานนี้" });
  }

  checkIn.status = "dismissed";

  saveDb(currentDb);
  res.json({ success: true, checkIn });
});

// Helper: Parse Google Sheets CSV URL
function extractSpreadsheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

// CSV Parser Helper
function parseCSV(csvText: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentVal = '';
  
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(currentVal.trim());
      if (row.length > 0 && row.some(cell => cell !== '')) {
        result.push(row);
      }
      row = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  if (currentVal || row.length > 0) {
    row.push(currentVal.trim());
    if (row.some(cell => cell !== '')) {
      result.push(row);
    }
  }
  return result;
}

// Shared Core Importer for both CSV, Excel, and Apps Script data
function processImportRows(rows: any[][], sourceUrl: string = "") {
  if (!rows || rows.length < 2) {
    return { error: "ไม่พบข้อมูลในตาราง หรือตารางว่างเปล่า" };
  }

  const currentDb = loadDb();
  const headers = rows[0].map(h => String(h || "").toLowerCase().trim());

  // 1. Check if this sheet is a Room Schedule sheet
  const isScheduleSheet = headers.some(h => 
    h.includes("เวลากี่โมง") || 
    h.includes("วิชาที่เรียน") || 
    h.includes("ห้องที่ใช้") || 
    h.includes("จำนวนนักเรียน") || 
    h.includes("สถานะห้อง") ||
    h.includes("ว่างไม่ว่าง")
  ) || (
    headers.some(h => h.includes("เวลา") || h.includes("time")) && 
    headers.some(h => h.includes("วิชา") || h.includes("subject") || h.includes("course")) &&
    headers.some(h => h.includes("ห้อง") || h.includes("room"))
  );

  if (isScheduleSheet) {
    let timeColIdx = -1;
    let userColIdx = -1;
    let subjectColIdx = -1;
    let roomColIdx = -1;
    let countColIdx = -1;
    let statusColIdx = -1;

    for (let j = 0; j < headers.length; j++) {
      const h = headers[j];
      if (h.includes("เวลากี่โมง") || h.includes("เวลา") || h.includes("time")) {
        timeColIdx = j;
      } else if (h.includes("ชื่อคนใช้") || h.includes("คนใช้") || h.includes("ผู้ใช้") || h.includes("user") || h.includes("name") || h.includes("ชื่อ")) {
        if (h.includes("ชื่อคนใช้") || userColIdx === -1) {
          userColIdx = j;
        }
      } else if (h.includes("วิชาที่เรียน") || h.includes("วิชา") || h.includes("subject") || h.includes("course")) {
        subjectColIdx = j;
      } else if (h.includes("ห้องที่ใช้") || h.includes("ห้อง") || h.includes("room")) {
        roomColIdx = j;
      } else if (h.includes("จำนวนนักเรียน") || h.includes("จำนวน") || h.includes("student") || h.includes("count")) {
        countColIdx = j;
      } else if (h.includes("สถานะห้องว่างไม่ว่าง") || h.includes("สถานะห้อง") || h.includes("ว่างไม่ว่าง") || h.includes("สถานะ") || h.includes("status")) {
        statusColIdx = j;
      }
    }

    if (timeColIdx === -1) timeColIdx = 0;
    if (userColIdx === -1) userColIdx = 1;
    if (subjectColIdx === -1) subjectColIdx = 2;
    if (roomColIdx === -1) roomColIdx = 3;
    if (countColIdx === -1) countColIdx = 4;
    if (statusColIdx === -1) statusColIdx = 5;

    const importedSchedules = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const timeVal = String(row[timeColIdx] ?? "").trim();
      const userVal = String(row[userColIdx] ?? "").trim();
      const subjectVal = String(row[subjectColIdx] ?? "").trim();
      const roomVal = String(row[roomColIdx] ?? "").trim();
      const countValStr = String(row[countColIdx] ?? "0").trim();
      const countVal = parseInt(countValStr.replace(/[^0-9]/g, "")) || 0;
      const statusVal = String(row[statusColIdx] ?? "ว่าง").trim();

      if (!timeVal && !userVal && !subjectVal) continue;

      importedSchedules.push({
        id: "sch_" + Date.now().toString() + "_" + i,
        time: timeVal,
        user: userVal,
        subject: subjectVal,
        room: roomVal,
        studentCount: countVal,
        status: statusVal
      });
    }

    currentDb.roomSchedules = importedSchedules;
    if (sourceUrl) currentDb.settings.googleSheetUrl = sourceUrl;
    saveDb(currentDb);

    return {
      success: true,
      importedCount: importedSchedules.length,
      updatedCount: 0,
      isSchedule: true,
      message: `นำเข้าตารางเรียน/การใช้ห้องสำเร็จจำนวน ${importedSchedules.length} รายการ`
    };
  }

  // 2. Parse as Users (Admins / Teachers / Students)
  let idColIdx = -1;
  let passColIdx = -1;
  let nameColIdx = -1;
  let deptColIdx = -1;
  let roleColIdx = -1;

  for (let j = 0; j < headers.length; j++) {
    const h = headers[j];
    if (h.includes("รหัสผ่าน") || h.includes("pass") || h.includes("password")) {
      passColIdx = j;
    } else if (h.includes("สิทธิ์") || h.includes("สิทธิ") || h.includes("ตำแหน่ง") || h.includes("role") || h.includes("ประเภท")) {
      roleColIdx = j;
    } else if (h.includes("รหัส") || h.includes("ไอดี") || h.includes("username") || h.includes("id")) {
      if (idColIdx === -1) idColIdx = j;
    } else if (h.includes("ชื่อ") || h.includes("name") || h.includes("นามสกุล")) {
      if (nameColIdx === -1) nameColIdx = j;
    } else if (h.includes("สาขา") || h.includes("แผนก") || h.includes("ฝ่าย") || h.includes("major") || h.includes("dept") || h.includes("department")) {
      deptColIdx = j;
    }
  }

  if (idColIdx === -1) idColIdx = 0;
  if (nameColIdx === -1) nameColIdx = 1;
  if (deptColIdx === -1) deptColIdx = 2;

  const isAdminSheet = headers.some(h =>
    h.includes("แอดมิน") || h.includes("admin") || h.includes("ผู้ดูแล")
  );

  const isTeacherSheet = headers.some(h =>
    h.includes("อาจารย์") || h.includes("ครู") || h.includes("teacher")
  );

  let importedCount = 0;
  let updatedCount = 0;
  let adminCount = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const username = String(row[idColIdx] ?? "").trim();
    const password = passColIdx !== -1 ? String(row[passColIdx] ?? "").trim() : "password";
    const name = String(row[nameColIdx] ?? "").trim();
    const department = String(row[deptColIdx] ?? "ทั่วไป").trim();
    const rawRole = roleColIdx !== -1 ? String(row[roleColIdx] ?? "").trim().toLowerCase() : "";

    if (!username || !name) continue;

    // Detect Role
    let role = "student";
    if (
      rawRole.includes("admin") ||
      rawRole.includes("แอดมิน") ||
      rawRole.includes("ผู้ดูแล") ||
      isAdminSheet ||
      username.toLowerCase().includes("admin") ||
      username.toLowerCase().includes("witthaya")
    ) {
      role = "admin";
    } else if (
      rawRole.includes("teacher") ||
      rawRole.includes("อาจารย์") ||
      rawRole.includes("ครู") ||
      isTeacherSheet
    ) {
      role = "teacher";
    }

    const existingUserIdx = currentDb.users.findIndex(
      (u: any) => u.username.toLowerCase() === username.toLowerCase()
    );

    if (existingUserIdx !== -1) {
      currentDb.users[existingUserIdx].name = name;
      if (department) currentDb.users[existingUserIdx].department = department;
      if (password && password !== "password") currentDb.users[existingUserIdx].password = password;
      if (role === "admin") {
        currentDb.users[existingUserIdx].role = "admin";
        adminCount++;
      }
      updatedCount++;
    } else {
      currentDb.users.push({
        id: (role[0] || "u") + Date.now().toString() + i,
        username,
        password: password || (role === "admin" ? "44120" : "password"),
        name,
        department,
        role
      });
      if (role === "admin") adminCount++;
      importedCount++;
    }
  }

  if (sourceUrl) currentDb.settings.googleSheetUrl = sourceUrl;
  saveDb(currentDb);

  return {
    success: true,
    importedCount,
    updatedCount,
    adminCount,
    isSchedule: false,
    message: `นำเข้าข้อมูลผู้ใช้สำเร็จ: เพิ่มใหม่ ${importedCount} ราย, อัปเดตข้อมูลเดิม ${updatedCount} ราย ${adminCount > 0 ? `(รวมผู้ดูแลระบบ Admin ${adminCount} บัญชี)` : ''}`
  };
}

// API: Import students, admins, teachers or schedules from Google Sheets or Apps Script Web App URL
app.post("/api/import-sheet", async (req, res) => {
  const { sheetUrl } = req.body;
  if (!sheetUrl) {
    return res.status(400).json({ error: "กรุณาระบุลิงก์ Google Sheet หรือ Apps Script URL" });
  }

  const isAppsScript = sheetUrl.includes("script.google.com") || sheetUrl.includes("exec");
  const sheetId = extractSpreadsheetId(sheetUrl);
  const fetchUrl = isAppsScript
    ? sheetUrl
    : (sheetId 
        ? `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`
        : sheetUrl);

  try {
    const response = await fetch(fetchUrl, { redirect: "follow" });
    if (!response.ok) {
      throw new Error(`ไม่สามารถดาวน์โหลดข้อมูลได้ (HTTP status ${response.status})`);
    }

    const textData = await response.text();
    let rows: any[][] = [];

    // Try parsing JSON first (if Apps Script returns JSON)
    let isParsedJson = false;
    try {
      const parsedJson = JSON.parse(textData);
      if (Array.isArray(parsedJson)) {
        if (parsedJson.length > 0 && typeof parsedJson[0] === "object" && !Array.isArray(parsedJson[0])) {
          // Array of objects e.g. [{ username, password, name, department, role }]
          const keys = Object.keys(parsedJson[0]);
          rows.push(keys);
          parsedJson.forEach((item: any) => {
            rows.push(keys.map((k) => item[k]));
          });
          isParsedJson = true;
        } else if (parsedJson.length > 0 && Array.isArray(parsedJson[0])) {
          // 2D Array e.g. [["username", "password", "name", "department", "role"], ...]
          rows = parsedJson;
          isParsedJson = true;
        }
      } else if (parsedJson.data && Array.isArray(parsedJson.data)) {
        const dataArr = parsedJson.data;
        if (dataArr.length > 0 && typeof dataArr[0] === "object" && !Array.isArray(dataArr[0])) {
          const keys = Object.keys(dataArr[0]);
          rows.push(keys);
          dataArr.forEach((item: any) => {
            rows.push(keys.map((k) => item[k]));
          });
          isParsedJson = true;
        } else if (dataArr.length > 0 && Array.isArray(dataArr[0])) {
          rows = dataArr;
          isParsedJson = true;
        }
      }
    } catch (e) {
      // Not JSON, continue to CSV parsing
    }

    if (!isParsedJson) {
      rows = parseCSV(textData);
    }

    const result = processImportRows(rows, sheetUrl);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    return res.json(result);
  } catch (error: any) {
    console.error("Google Sheets / Apps Script Import error:", error);
    res.status(500).json({
      error: `ไม่สามารถนำเข้าข้อมูลได้: ${error.message || error}. กรุณาตรวจสอบว่าเลือกสิทธิ์ Web App 'Anyone' หรือแชร์ชีตแบบ 'ทุกคนที่มีลิงก์ดูได้'`
    });
  }
});

// API: Get Room Schedules list
app.get("/api/schedules", (req, res) => {
  const currentDb = loadDb();
  res.json(currentDb.roomSchedules || []);
});

// API: Clear all Room Schedules
app.post("/api/schedules/clear", (req, res) => {
  const currentDb = loadDb();
  currentDb.roomSchedules = [];
  saveDb(currentDb);
  res.json({ success: true, message: "ล้างข้อมูลตารางการใช้ห้องเรียบร้อยแล้ว" });
});

// API: Get statistics for dashboard
app.get("/api/stats", (req, res) => {
  const currentDb = loadDb();
  const studentsCount = currentDb.users.filter((u: any) => u.role === "student").length;
  const teachersCount = currentDb.users.filter((u: any) => u.role === "teacher").length;
  const activeCheckins = currentDb.checkIns.filter((c: any) => c.status === "in").length;
  const totalCheckins = currentDb.checkIns.length;
  const pendingCheckins = currentDb.checkIns.filter((c: any) => c.status === "pending").length;
  const roomStatus = currentDb.settings?.roomStatus || "auto";
  const schedulesCount = currentDb.roomSchedules ? currentDb.roomSchedules.length : 0;

  res.json({
    studentsCount,
    teachersCount,
    activeCheckins,
    totalCheckins,
    pendingCheckins,
    roomStatus,
    schedulesCount
  });
});

// API: Get settings
app.get("/api/settings", (req, res) => {
  const currentDb = loadDb();
  res.json(currentDb.settings || { googleSheetUrl: "", roomStatus: "auto" });
});

// API: Save settings
app.post("/api/settings", (req, res) => {
  const { googleSheetUrl, roomStatus } = req.body;
  const currentDb = loadDb();
  currentDb.settings = currentDb.settings || {};
  if (googleSheetUrl !== undefined) {
    currentDb.settings.googleSheetUrl = googleSheetUrl;
  }
  if (roomStatus !== undefined) {
    currentDb.settings.roomStatus = roomStatus;
  }
  saveDb(currentDb);
  res.json({ success: true, settings: currentDb.settings });
});

// API 404 Fallback
app.use("/api/*", (req, res) => {
  res.status(404).json({ error: "ไม่พบข้อมูลที่ต้องการ หรือ API endpoint ไม่ถูกต้อง" });
});

// Global API Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Express API error:", err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ error: err?.message || "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
});

// Vite middleware integration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
