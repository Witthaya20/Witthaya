export interface User {
  id: string;
  username: string;
  name: string;
  department: string;
  role: "student" | "teacher" | "admin";
}

export interface CheckIn {
  id: string;
  studentId: string;
  studentName: string;
  studentDepartment: string;
  teacherId: string;
  teacherName: string;
  purpose: string;
  checkInTime: string;
  checkOutTime: string | null;
  status: "in" | "out" | "pending" | "rejected" | "dismissed";
}

export interface Stats {
  studentsCount: number;
  teachersCount: number;
  activeCheckins: number;
  totalCheckins: number;
  pendingCheckins?: number;
  roomStatus?: string;
  schedulesCount?: number;
}

export interface RoomSchedule {
  id: string;
  time: string;           // เวลากี่โมง
  user: string;           // ชื่อคนใช้
  subject: string;        // วิชาที่เรียน
  room: string;           // ห้องที่ใช้
  studentCount: number;   // จำนวนนักเรียน
  status: string;         // สถานะห้องว่างไม่ว่าง (e.g. ว่าง / ไม่ว่าง / ปิดปรับปรุง)
}

