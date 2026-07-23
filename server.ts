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
    
    // Ensure admin user exists with password 'admin' (also supports '44120' or custom password)
    let adminUser = parsed.users.find((u: any) => u.username === "admin");
    if (!adminUser) {
      parsed.users.push({
        username: "admin",
        password: "admin",
        name: "ผู้ดูแลระบบ (Admin)",
        department: "ฝ่ายสารสนเทศ",
        role: "admin",
        id: "admin"
      });
    } else if (!adminUser.password) {
      adminUser.password = "admin";
    }
    
    return parsed;
  } catch (err) {
    console.error("Error reading database, using initialDb:", err);
    return JSON.parse(JSON.stringify(initialDb));
  }
}

function saveDb(data: any) {
  try {
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

// API: Login
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "กรุณากรอกไอดีและรหัสผ่าน" });
  }

  const currentDb = loadDb();
  let user = currentDb.users.find(
    (u: any) => u.username === username && u.password === password
  );

  // Flexible admin password check
  if (!user && username === "admin" && (password === "admin" || password === "44120")) {
    user = currentDb.users.find((u: any) => u.username === "admin");
  }

  if (!user) {
    return res.status(401).json({ error: "ไอดีหรือรหัสผ่านไม่ถูกต้อง" });
  }

  // Return user info (omit password)
  const { password: _, ...userInfo } = user;
  res.json({ success: true, user: userInfo });
});

// API: Register Student or Teacher
app.post("/api/auth/register", (req, res) => {
  const { username, password, name, department, role } = req.body;
  
  if (!username || !password || !name || !department || !role) {
    return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบถ้วน" });
  }

  if (role !== "student" && role !== "teacher") {
    return res.status(400).json({ error: "บทบาทไม่ถูกต้อง" });
  }

  const currentDb = loadDb();
  
  // Check if exists
  const exists = currentDb.users.some((u: any) => u.username === username);
  if (exists) {
    return res.status(400).json({ error: "ไอดีนี้ถูกใช้งานแล้วในระบบ" });
  }

  const newUser = {
    id: role[0] + Date.now().toString(),
    username,
    password,
    name,
    department,
    role
  };

  currentDb.users.push(newUser);
  saveDb(currentDb);

  const { password: _, ...userInfo } = newUser;
  res.json({ success: true, user: userInfo });
});

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

// Shared Core Importer for both CSV and Excel Sheet data
function processImportRows(rows: any[][], sourceUrl: string = "") {
  if (!rows || rows.length < 2) {
    return { error: "ไม่พบข้อมูลในตาราง หรือตารางว่างเปล่า" };
  }

  const currentDb = loadDb();
  const headers = rows[0].map(h => String(h || "").toLowerCase().trim());

  // Check if this sheet is a Room Schedule sheet
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

  // Fallback: Parse as Students list
  let idColIdx = -1;
  let nameColIdx = -1;
  let deptColIdx = -1;

  for (let j = 0; j < headers.length; j++) {
    const h = headers[j];
    if (h.includes("รหัส") || h.includes("id")) {
      idColIdx = j;
    } else if (h.includes("ชื่อ") || h.includes("name") || h.includes("นามสกุล")) {
      if (nameColIdx === -1) nameColIdx = j;
    } else if (h.includes("สาขา") || h.includes("major") || h.includes("dept") || h.includes("วิชา")) {
      deptColIdx = j;
    }
  }

  if (idColIdx === -1) idColIdx = 0;
  if (nameColIdx === -1) nameColIdx = 1;
  if (deptColIdx === -1) deptColIdx = 2;

  let importedCount = 0;
  let updatedCount = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const username = String(row[idColIdx] ?? "").trim();
    const name = String(row[nameColIdx] ?? "").trim();
    const department = String(row[deptColIdx] ?? "ทั่วไป").trim();

    if (!username || !name) continue;

    const existingUserIdx = currentDb.users.findIndex(
      (u: any) => u.username === username && u.role === "student"
    );

    if (existingUserIdx !== -1) {
      currentDb.users[existingUserIdx].name = name;
      currentDb.users[existingUserIdx].department = department;
      updatedCount++;
    } else {
      currentDb.users.push({
        id: "s" + Date.now().toString() + i,
        username,
        password: "password",
        name,
        department,
        role: "student"
      });
      importedCount++;
    }
  }

  if (sourceUrl) currentDb.settings.googleSheetUrl = sourceUrl;
  saveDb(currentDb);

  return {
    success: true,
    importedCount,
    updatedCount,
    isSchedule: false,
    message: `นำเข้ารายชื่อนักเรียนสำเร็จ: เพิ่มใหม่ ${importedCount} ราย, อัปเดตข้อมูลเดิม ${updatedCount} ราย`
  };
}

// API: Import students or schedules from Google Sheets URL
app.post("/api/import-sheet", async (req, res) => {
  const { sheetUrl } = req.body;
  if (!sheetUrl) {
    return res.status(400).json({ error: "กรุณาระบุลิงก์ Google Sheet" });
  }

  const sheetId = extractSpreadsheetId(sheetUrl);
  const fetchUrl = sheetId 
    ? `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`
    : sheetUrl;

  try {
    const response = await fetch(fetchUrl);
    if (!response.ok) {
      throw new Error(`ไม่สามารถดาวน์โหลดข้อมูลได้ (HTTP status ${response.status})`);
    }

    const csvText = await response.text();
    const rows = parseCSV(csvText);

    const result = processImportRows(rows, sheetUrl);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    return res.json(result);
  } catch (error: any) {
    console.error("Google Sheets Import error:", error);
    res.status(500).json({ error: `ไม่สามารถนำเข้าข้อมูลจาก Google Sheets ได้: ${error.message || error}. กรุณาตรวจสอบว่าเปิดสิทธิ์ 'ทุกคนที่มีลิงก์สามารถดูได้'` });
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
