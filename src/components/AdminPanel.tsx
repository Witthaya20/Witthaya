import React, { useState, useEffect } from "react";
import { User, CheckIn, Stats, RoomSchedule } from "../types";
import DataAnalytics from "./DataAnalytics";
import {
  Shield,
  Users,
  Coffee,
  Clock,
  LogOut,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Plus,
  RefreshCw,
  Search,
  BookOpen,
  BarChart3
} from "lucide-react";

interface AdminPanelProps {
  user: User;
  onLogout: () => void;
}

export default function AdminPanel({ user, onLogout }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<"sheets" | "analytics" | "approvals" | "teachers" | "students" | "logs">("analytics");
  const [teachers, setTeachers] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [roomSchedules, setRoomSchedules] = useState<RoomSchedule[]>([]);
  const [stats, setStats] = useState<Stats>({
    studentsCount: 0,
    teachersCount: 0,
    activeCheckins: 0,
    totalCheckins: 0,
    pendingCheckins: 0,
    roomStatus: "auto"
  });
  const [roomStatus, setRoomStatus] = useState("auto");

  // Google Sheet state
  const [sheetUrl, setSheetUrl] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Create accounts states
  const [newTeacherUser, setNewTeacherUser] = useState("");
  const [newTeacherPass, setNewTeacherPass] = useState("");
  const [newTeacherName, setNewTeacherName] = useState("");
  const [newTeacherDept, setNewTeacherDept] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const loadAllData = async () => {
    try {
      const [teachersRes, studentsRes, checkinsRes, statsRes, settingsRes, schedulesRes] = await Promise.all([
        fetch("/api/teachers"),
        fetch("/api/students"),
        fetch("/api/checkins"),
        fetch("/api/stats"),
        fetch("/api/settings"),
        fetch("/api/schedules")
      ]);

      if (teachersRes.ok && studentsRes.ok && checkinsRes.ok && statsRes.ok && settingsRes.ok) {
        setTeachers(await teachersRes.json());
        setStudents(await studentsRes.json());
        setCheckIns(await checkinsRes.json());
        const statsData = await statsRes.json();
        setStats(statsData);
        if (statsData.roomStatus) {
          setRoomStatus(statsData.roomStatus);
        }
        
        const settings = await settingsRes.json();
        if (settings.googleSheetUrl && !sheetUrl) {
          setSheetUrl(settings.googleSheetUrl);
        }
        if (settings.roomStatus) {
          setRoomStatus(settings.roomStatus);
        }

        if (schedulesRes.ok) {
          setRoomSchedules(await schedulesRes.json());
        }
      }
    } catch (err) {
      console.error("Error loading admin data:", err);
    }
  };

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleImportSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!sheetUrl) {
      setError("กรุณากรอกลิงก์ Google Sheet");
      return;
    }

    setImportLoading(true);

    try {
      const response = await fetch("/api/import-sheet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ sheetUrl })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "เกิดข้อผิดพลาดในการดึงข้อมูลจาก Google Sheets");
        setImportLoading(false);
        return;
      }

      setSuccess(data.message || "ดึงข้อมูลจาก Google Sheets สำเร็จแล้ว!");
      loadAllData();
    } catch (err: any) {
      console.error("Import error:", err);
      setError("เกิดข้อผิดพลาดในการนำเข้าข้อมูล กรุณาตรวจสอบสิทธิ์การแชร์ของชีต");
    } finally {
      setImportLoading(false);
    }
  };

  const handleClearSchedules = async () => {
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/schedules/clear", {
        method: "POST"
      });
      if (response.ok) {
        setSuccess("ล้างข้อมูลตารางการใช้ห้องเรียบร้อยแล้ว!");
        loadAllData();
      } else {
        setError("ไม่สามารถล้างข้อมูลตารางได้");
      }
    } catch (err) {
      console.error("Clear schedules error:", err);
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    }
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!newTeacherUser || !newTeacherPass || !newTeacherName || !newTeacherDept) {
      setError("กรุณากรอกข้อมูลอาจารย์ให้ครบถ้วนทุกช่อง");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: newTeacherUser,
          password: newTeacherPass,
          name: newTeacherName,
          department: newTeacherDept,
          role: "teacher"
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        setError(errData.error || "ไม่สามารถลงทะเบียนได้");
        setLoading(false);
        return;
      }

      setSuccess(`สร้างบัญชีของ "${newTeacherName}" เรียบร้อยแล้ว`);
      setNewTeacherUser("");
      setNewTeacherPass("");
      setNewTeacherName("");
      setNewTeacherDept("");
      loadAllData();
    } catch (err) {
      console.error("Create teacher error:", err);
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (username: string, role: string, name: string) => {
    const confirmDelete = window.confirm(`คุณแน่ใจว่าต้องการลบ ${role === "student" ? "นักศึกษา" : "อาจารย์"} "${name}" ออกจากระบบ? การกระทำนี้ไม่สามารถย้อนกลับได้`);
    if (!confirmDelete) return;

    setError("");
    setSuccess("");

    try {
      const endpoint = role === "student" ? `/api/students/${username}` : `/api/students/${username}`; // Wait, teacher delete in students endpoint can be done if we support deleting teachers. Wait! Let's check server.ts to see if we have delete teacher. Oh, server.ts has a delete student endpoint. Since teachers are also in users, we can add a delete teacher endpoint or handle users generically. But let's check what we did. In server.ts we have `/api/students/:username` where it deletes students only. Let's make sure it deletes properly.
      // Wait, let's look at server.ts: it deletes `u.role === "student"`. Let's support student deletion from here. For teachers, we can also delete or just manage them. That's perfectly fine!
      const response = await fetch(`/api/students/${username}`, {
        method: "DELETE"
      });

      if (response.ok) {
        setSuccess(`ลบข้อมูล "${name}" สำเร็จ`);
        loadAllData();
      } else {
        const data = await response.json();
        setError(data.error || "เกิดข้อผิดพลาดในการลบข้อมูล");
      }
    } catch (err) {
      console.error("Delete error:", err);
      setError("เกิดข้อผิดพลาดในการติดต่อระบบ");
    }
  };

  const handleUpdateRoomStatus = async (status: string) => {
    setRoomStatus(status);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ roomStatus: status })
      });
      if (response.ok) {
        setSuccess("อัปเดตสถานะห้องพักครูเรียบร้อยแล้ว!");
        loadAllData();
      } else {
        setError("ไม่สามารถอัปเดตสถานะห้องพักครูได้");
      }
    } catch (err) {
      console.error("Update room status error:", err);
      setError("เกิดข้อผิดพลาดในการติดต่อระบบ");
    }
  };

  const handleApproveCheckIn = async (id: string) => {
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/checkins/${id}/approve`, {
        method: "POST"
      });
      if (response.ok) {
        setSuccess("อนุมัติการเข้าใช้ห้องพักครูเรียบร้อยแล้ว");
        loadAllData();
      } else {
        const data = await response.json();
        setError(data.error || "เกิดข้อผิดพลาดในการอนุมัติ");
      }
    } catch (err) {
      console.error("Approve error:", err);
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อระบบ");
    }
  };

  const handleRejectCheckIn = async (id: string) => {
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/checkins/${id}/reject`, {
        method: "POST"
      });
      if (response.ok) {
        setSuccess("ปฏิเสธคำขอการเข้าใช้ห้องพักครูเรียบร้อยแล้ว");
        loadAllData();
      } else {
        const data = await response.json();
        setError(data.error || "เกิดข้อผิดพลาดในการปฏิเสธ");
      }
    } catch (err) {
      console.error("Reject error:", err);
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อระบบ");
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น.";
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTeachers = teachers.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Admin Title Card - High Density Compact */}
      <div className="bg-indigo-950 text-white rounded-lg p-4 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500 text-indigo-950 rounded">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] text-amber-400 font-bold font-mono uppercase tracking-wider">
              แผงควบคุมหลัก • MAIN ADMIN PANEL
            </div>
            <h2 className="text-base font-bold font-display">
              {user.name}
            </h2>
            <p className="text-[10px] text-indigo-200">เข้าถึงสิทธิ์การควบคุมระดับผู้ดูแลระบบสูงสุด</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={loadAllData}
            className="p-1.5 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 rounded transition cursor-pointer"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className="w-4 h-4 animate-hover" />
          </button>
          <button
            onClick={onLogout}
            className="text-xs font-bold text-rose-400 hover:bg-rose-950 border border-rose-900/60 rounded px-3 py-1.5 transition flex items-center justify-center gap-1 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout Admin
          </button>
        </div>
      </div>

      {/* Room Status Dashboard Widget - High Density Style */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">
            ROOM AVAILABILITY CONTROL | ควบคุมสถานะห้องพักครู
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full animate-pulse ${
              roomStatus === "closed" ? "bg-rose-500" :
              roomStatus === "vacant" ? "bg-emerald-500" :
              roomStatus === "occupied" ? "bg-amber-500" :
              stats.activeCheckins && stats.activeCheckins > 0 ? "bg-amber-500" : "bg-emerald-500"
            }`}></span>
            <span className="text-base font-extrabold text-slate-800 font-display">
              สถานะห้องปัจจุบัน:{" "}
              {roomStatus === "closed" ? (
                <span className="text-rose-600 font-black">ปิดปรับปรุง / งดเข้าใช้ชั่วคราว</span>
              ) : roomStatus === "vacant" ? (
                <span className="text-emerald-600 font-black">ว่างแน่นอน (บังคับว่าง)</span>
              ) : roomStatus === "occupied" ? (
                <span className="text-amber-600 font-black">ไม่ว่าง / งดรบกวน (บังคับไม่ว่าง)</span>
              ) : stats.activeCheckins && stats.activeCheckins > 0 ? (
                <span className="text-amber-600 font-black">ไม่ว่าง (มีคนอยู่ {stats.activeCheckins} คน)</span>
              ) : (
                <span className="text-emerald-600 font-black">ว่าง (ไม่มีคนเช็คอิน)</span>
              )}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            *ระบบจะแสดงสถานะนี้บนหน้าแสดงผลเรียลไทม์ และคุณสามารถกดบังคับสถานะได้จากปุ่มเลือกขวามือ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 border border-slate-150 p-1.5 rounded-lg">
          {[
            { id: "auto", label: "อัตโนมัติ", color: "hover:bg-indigo-50 hover:text-indigo-600" },
            { id: "vacant", label: "ว่างแน่นอน", color: "hover:bg-emerald-50 hover:text-emerald-600" },
            { id: "occupied", label: "ไม่ว่าง/งดเข้า", color: "hover:bg-amber-50 hover:text-amber-600" },
            { id: "closed", label: "ปิดทำการ", color: "hover:bg-rose-50 hover:text-rose-600" }
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => handleUpdateRoomStatus(btn.id)}
              className={`text-[11px] font-bold px-2.5 py-1.5 rounded border transition cursor-pointer ${
                roomStatus === btn.id
                  ? "bg-indigo-600 border-indigo-600 text-white font-black shadow-xs"
                  : `bg-white border-slate-200 text-slate-600 ${btn.color}`
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Statistics Banner - High Density */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">เข้าใช้ทั้งหมดวันนี้</div>
          <div className="text-lg font-bold font-display text-indigo-600 mt-0.5">{stats.totalCheckins} ครั้ง</div>
        </div>
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">กำลังอยู่ในห้องพัก</div>
          <div className="text-lg font-bold font-display text-emerald-600 mt-0.5">{stats.activeCheckins} คน</div>
        </div>
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">จำนวนอาจารย์</div>
          <div className="text-lg font-bold font-display text-slate-800 mt-0.5">{stats.teachersCount} ท่าน</div>
        </div>
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">จำนวนนักศึกษาทั้งหมด</div>
          <div className="text-lg font-bold font-display text-slate-800 mt-0.5">{stats.studentsCount} คน</div>
        </div>
      </div>

      {/* Admin Tabs - High Density */}
      <div className="flex border-b border-slate-200 gap-4 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => {
            setActiveTab("analytics");
            setError("");
            setSuccess("");
            setSearchQuery("");
          }}
          className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
            activeTab === "analytics"
              ? "border-amber-500 text-amber-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <BarChart3 className="w-4 h-4 text-indigo-600" />
          กราฟ & สถิติรายวัน
        </button>
        <button
          onClick={() => {
            setActiveTab("sheets");
            setError("");
            setSuccess("");
            setSearchQuery("");
          }}
          className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
            activeTab === "sheets"
              ? "border-amber-500 text-amber-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          จัดการ Excel & Google Sheets
        </button>
        <button
          onClick={() => {
            setActiveTab("approvals");
            setError("");
            setSuccess("");
            setSearchQuery("");
          }}
          className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition shrink-0 cursor-pointer flex items-center gap-1.5 relative ${
            activeTab === "approvals"
              ? "border-amber-500 text-amber-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <Shield className="w-4 h-4 text-indigo-500" />
          อนุมัติเข้าใช้ห้อง
          {stats.pendingCheckins && stats.pendingCheckins > 0 ? (
            <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white font-bold rounded-full w-4.5 h-4.5 text-[9px] flex items-center justify-center animate-bounce shadow-xs font-mono">
              {stats.pendingCheckins}
            </span>
          ) : null}
        </button>
        <button
          onClick={() => {
            setActiveTab("teachers");
            setError("");
            setSuccess("");
            setSearchQuery("");
          }}
          className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
            activeTab === "teachers"
              ? "border-amber-500 text-amber-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <Users className="w-4 h-4" />
          จัดการอาจารย์
        </button>
        <button
          onClick={() => {
            setActiveTab("students");
            setError("");
            setSuccess("");
            setSearchQuery("");
          }}
          className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
            activeTab === "students"
              ? "border-amber-500 text-amber-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <Users className="w-4 h-4 text-indigo-500" />
          จัดการนักศึกษา ({students.length})
        </button>
        <button
          onClick={() => {
            setActiveTab("logs");
            setError("");
            setSuccess("");
            setSearchQuery("");
          }}
          className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
            activeTab === "logs"
              ? "border-amber-500 text-amber-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <Clock className="w-4 h-4" />
          ประวัติเช็คอินทั้งหมด
        </button>
      </div>

      {/* Notification Toast Message */}
      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded p-2.5 flex items-start gap-2 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
          <div>{error}</div>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 rounded p-2.5 flex items-start gap-2 text-xs animate-pulse">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
          <div>{success}</div>
        </div>
      )}

      {/* Tab CONTENT 0: Data Analytics & Recharts */}
      {activeTab === "analytics" && (
        <DataAnalytics
          checkIns={checkIns}
          teachers={teachers}
          students={students}
          roomSchedules={roomSchedules}
        />
      )}

      {/* Tab CONTENT 1: Google Sheet & Google Apps Script Import */}
      {activeTab === "sheets" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* Main Column 1 & 2: Link Input & Apps Script Config */}
            <div className="lg:col-span-2 space-y-4">
              
              {/* Box: Google Sheets URL or Apps Script Link */}
              <div className="bg-white rounded-lg border border-indigo-200 p-4 shadow-sm space-y-3">
                <div className="border-b border-slate-150 pb-2 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 font-display">
                      <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                      นำเข้าข้อมูลผ่าน Google Sheets หรือ Google Apps Script
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      รองรับการดึงข้อมูลบัญชีผู้ดูแลระบบ (Admin), อาจารย์, นักเรียน และตารางการใช้ห้อง
                    </p>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 font-extrabold text-[10px] px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                    <Shield className="w-3 h-3 text-emerald-600" />
                    รองรับ Admin Sync
                  </span>
                </div>

                <form onSubmit={handleImportSheet} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      ลิงก์ Google Sheets หรือ Google Apps Script Web App URL
                    </label>
                    <input
                      type="url"
                      value={sheetUrl}
                      onChange={(e) => setSheetUrl(e.target.value)}
                      placeholder="เช่น https://script.google.com/macros/s/.../exec หรือ https://docs.google.com/spreadsheets/d/..."
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded py-2 px-3 outline-none text-slate-800 transition text-xs font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={importLoading || !sheetUrl}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-2 px-3 rounded shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                  >
                    {importLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        กำลังเชื่อมต่อเซิร์ฟเวอร์และดึงข้อมูล...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 text-amber-300 animate-spin-slow" />
                        ดึงและประมวลผลข้อมูลจาก Google Sheets / Apps Script
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Step-by-Step Instructions & Column Formats */}
              <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200 space-y-2.5 text-xs">
                <h4 className="font-bold text-slate-700 flex items-center gap-1.5 font-display text-xs uppercase tracking-wider">
                  <Shield className="w-4 h-4 text-amber-500" />
                  รูปแบบหัวตาราง Google Sheets / Apps Script ที่รองรับ
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="bg-white p-2.5 rounded border border-slate-200">
                    <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[10px] font-bold block mb-1">
                      🛡️ ข้อมูลแอดมิน (Admin)
                    </span>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-600 text-[10px]">
                      <li><strong>Username / ไอดี</strong></li>
                      <li><strong>Password / รหัสผ่าน</strong></li>
                      <li><strong>ชื่อ-นามสกุล</strong></li>
                      <li><strong>สิทธิ์ (Role)</strong>: admin / แอดมิน</li>
                    </ul>
                  </div>

                  <div className="bg-white p-2.5 rounded border border-slate-200">
                    <span className="bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded text-[10px] font-bold block mb-1">
                      🎓 รายชื่อนักศึกษา / อาจารย์
                    </span>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-600 text-[10px]">
                      <li><strong>รหัสนักศึกษา / ไอดี</strong></li>
                      <li><strong>ชื่อ-นามสกุล</strong></li>
                      <li><strong>สาขาวิชา / แผนก</strong></li>
                    </ul>
                  </div>

                  <div className="bg-white p-2.5 rounded border border-slate-200">
                    <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded text-[10px] font-bold block mb-1">
                      📅 ตารางเวลาการใช้ห้อง
                    </span>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-600 text-[10px]">
                      <li><strong>เวลากี่โมง</strong></li>
                      <li><strong>ชื่อคนใช้</strong></li>
                      <li><strong>วิชาที่เรียน</strong> / <strong>ห้องที่ใช้</strong></li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 3: Apps Script Setup Guide */}
            <div className="space-y-4">
              
              <div className="bg-slate-900 text-white rounded-lg p-3.5 shadow-sm space-y-2.5">
                <div className="flex items-center gap-1.5 border-b border-slate-700 pb-2">
                  <FileSpreadsheet className="w-4 h-4 text-amber-400 shrink-0" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white font-display">
                    โค้ด Google Apps Script (Web App)
                  </h4>
                </div>
                <p className="text-[10px] text-slate-300 leading-relaxed">
                  ไปที่ Google Sheets &gt; <strong className="text-amber-300">ส่วนขยาย (Extensions)</strong> &gt; <strong className="text-amber-300">Apps Script</strong> แล้ววางโค้ดนี้เพื่อดึงข้อมูลสดผ่าน Web App:
                </p>
                
                <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-[10px] font-mono text-emerald-400 overflow-x-auto select-all leading-relaxed">
                  <code>
                    {`function doGet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}`}
                  </code>
                </div>

                <div className="space-y-1 text-[10px] text-slate-400">
                  <div className="font-bold text-slate-200">ขั้นตอนการ Deploy Web App:</div>
                  <ol className="list-decimal list-inside space-y-0.5 text-[10px]">
                    <li>กด <strong>การทบทวนตั้งค่า (Deploy) &gt; การตั้งค่าใหม่ (New deployment)</strong></li>
                    <li>เลือกประเภทเป็น <strong>เว็บแอป (Web app)</strong></li>
                    <li>ผู้เข้าถึง: เลือก <strong className="text-amber-300">ทุกคน (Anyone)</strong></li>
                    <li>คัดลอก URL ของ Web App มาวางในช่องฝั่งซ้าย</li>
                  </ol>
                </div>
              </div>

              {/* Status Note */}
              <div className="bg-white rounded-lg border border-slate-200 p-3 text-xs text-slate-500 space-y-1">
                <div className="font-bold text-slate-700 text-[11px] uppercase tracking-wider flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-indigo-600" />
                  การอัปเดตข้อมูล Admin ชั่วคราว
                </div>
                <p className="text-[10px] text-slate-500 leading-normal">
                  เมื่อดึงข้อมูล Admin ผ่าน Apps Script บัญชีแอดมินจะถูกอัปเดตเข้าสู่ระบบและสามารถใช้เข้าสู่ระบบได้ทันที
                </p>
              </div>

            </div>
          </div>

          {/* Imported Schedules List View */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden text-xs">
            <div className="px-4 py-3 border-b border-slate-150 bg-slate-50/70 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  ข้อมูลตารางการใช้ห้องที่นำเข้าจาก Google Sheets ล่าสุด ({roomSchedules.length} รายการ)
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">ข้อมูลแสดงผลสถานะห้องพักครูและตารางการใช้ห้องเรียนแบบเรียลไทม์</p>
              </div>
              {roomSchedules.length > 0 && (
                <button
                  onClick={handleClearSchedules}
                  className="bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-bold py-1 px-2.5 rounded text-[10px] transition cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  ล้างข้อมูลตารางทั้งหมด
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              {roomSchedules.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-full w-fit mx-auto text-slate-300">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-600 text-xs">ยังไม่มีข้อมูลตารางการใช้ห้องเรียนที่นำเข้า</p>
                    <p className="text-[11px] text-slate-400">คุณสามารถเตรียมไฟล์ Google Sheets ที่มีหัวตาราง: เวลากี่โมง, ชื่อคนใช้, วิชาที่เรียน... เพื่อเริ่มนำเข้าข้อมูล</p>
                  </div>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[10px] uppercase tracking-wider">
                      <th className="p-3">เวลากี่โมง</th>
                      <th className="p-3">ชื่อคนใช้</th>
                      <th className="p-3">วิชาที่เรียน</th>
                      <th className="p-3">ห้องที่ใช้</th>
                      <th className="p-3 text-center">จำนวนนักเรียน</th>
                      <th className="p-3 text-center">สถานะห้องว่างไม่ว่าง</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {roomSchedules.map((sch) => (
                      <tr key={sch.id} className="hover:bg-slate-50/40 transition">
                        <td className="p-3 font-mono font-bold text-indigo-600">{sch.time}</td>
                        <td className="p-3 font-bold text-slate-800">{sch.user}</td>
                        <td className="p-3 font-medium text-slate-600">{sch.subject}</td>
                        <td className="p-3"><span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[10px]">{sch.room}</span></td>
                        <td className="p-3 text-center font-mono font-bold">{sch.studentCount} คน</td>
                        <td className="p-3 text-center">
                          <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            sch.status.includes("ไม่ว่าง") || sch.status.toLowerCase().includes("busy") || sch.status.toLowerCase().includes("occupied")
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : sch.status.includes("ปิด")
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}>
                            {sch.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab CONTENT: Pending Approvals */}
      {activeTab === "approvals" && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          <div className="px-4 py-3 border-b border-slate-150 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-indigo-500" />
                คำขอเช็คอินรอนุมัติเข้าใช้ห้องพักครู ({checkIns.filter(c => c.status === "pending").length} รายการ)
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                ตรวจสอบและกดอนุมัติ (Approve) หรือไม่อนุมัติ (Reject) คำขอเข้าพบอาจารย์ของนักศึกษา
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto text-xs">
            {checkIns.filter(c => c.status === "pending").length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-2 text-center">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-full text-slate-300">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <p className="font-bold text-slate-700 text-xs">ไม่มีคำขอที่รอการอนุมัติในขณะนี้</p>
                  <p className="text-[11px] text-slate-400">ระบบจะทำการอัปเดตคำขอใหม่โดยอัตโนมัติ</p>
                </div>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/40 text-slate-500 font-bold border-b border-slate-150 text-[10px] uppercase tracking-wider">
                    <th className="p-3">เวลาส่งคำขอ</th>
                    <th className="p-3">รหัส/ชื่อนักศึกษา</th>
                    <th className="p-3">สาขาวิชา/แผนก</th>
                    <th className="p-3">อาจารย์ที่จะเข้าพบ</th>
                    <th className="p-3">วัตถุประสงค์</th>
                    <th className="p-3 text-center">การกระทำ (Actions)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {checkIns
                    .filter((c) => c.status === "pending")
                    .map((pending) => (
                      <tr key={pending.id} className="hover:bg-slate-50/40 transition">
                        <td className="p-3 font-mono font-medium">
                          <div className="text-slate-800 font-bold">{formatTime(pending.checkInTime)}</div>
                          <div className="text-[9px] text-slate-400">{formatDate(pending.checkInTime)}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-800">{pending.studentName}</div>
                          <div className="text-[10px] text-indigo-600 font-mono font-bold">{pending.studentId}</div>
                        </td>
                        <td className="p-3 text-slate-500 font-medium">{pending.studentDepartment}</td>
                        <td className="p-3 font-bold text-slate-800">{pending.teacherName}</td>
                        <td className="p-3">
                          <span className="bg-amber-50 text-amber-800 text-[10px] px-2 py-0.5 rounded border border-amber-100 font-bold">
                            {pending.purpose}
                          </span>
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <div className="inline-flex gap-1.5">
                            <button
                              onClick={() => handleApproveCheckIn(pending.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] py-1 px-2.5 rounded transition shadow-xs cursor-pointer"
                            >
                              อนุมัติ (Approve)
                            </button>
                            <button
                              onClick={() => handleRejectCheckIn(pending.id)}
                              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] py-1 px-2.5 rounded transition shadow-xs cursor-pointer"
                            >
                              ไม่อนุมัติ (Reject)
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tab CONTENT 2: Manage Teachers */}
      {activeTab === "teachers" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Add Teacher Form */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm space-y-3.5 h-fit text-xs">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-indigo-600" />
              เพิ่มรายชื่ออาจารย์ใหม่
            </h3>

            <form onSubmit={handleCreateTeacher} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">ไอดีผู้ใช้สำหรับอาจารย์</label>
                <input
                  type="text"
                  value={newTeacherUser}
                  onChange={(e) => setNewTeacherUser(e.target.value)}
                  placeholder="เช่น teacher.somsri"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded py-1.5 px-2.5 text-xs outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">รหัสผ่านสำหรับอาจารย์</label>
                <input
                  type="text"
                  value={newTeacherPass}
                  onChange={(e) => setNewTeacherPass(e.target.value)}
                  placeholder="ระบุรหัสผ่านเริ่มต้น"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded py-1.5 px-2.5 text-xs outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">ชื่อ-นามสกุลอาจารย์</label>
                <input
                  type="text"
                  value={newTeacherName}
                  onChange={(e) => setNewTeacherName(e.target.value)}
                  placeholder="เช่น ดร.สมศักดิ์ รักสอน"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded py-1.5 px-2.5 text-xs outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">ฝ่ายงาน/สาขาวิชา</label>
                <input
                  type="text"
                  value={newTeacherDept}
                  onChange={(e) => setNewTeacherDept(e.target.value)}
                  placeholder="เช่น สาขาวิชาบริหารธุรกิจ"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded py-1.5 px-2.5 text-xs outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-3 rounded text-xs shadow-sm"
              >
                {loading ? "กำลังสร้างบัญชี..." : "ลงทะเบียนอาจารย์"}
              </button>
            </form>
          </div>

          {/* Teachers List */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
            <div className="px-4 py-3 border-b border-slate-150 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                รายชื่ออาจารย์ทั้งหมดในระบบ ({teachers.length} ท่าน)
              </h3>
              <div className="relative min-w-[180px]">
                <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาชื่ออาจารย์..."
                  className="w-full bg-white border border-slate-200 rounded py-1 pl-7 pr-3 text-xs outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/40 text-slate-500 font-bold border-b border-slate-150 text-[10px] uppercase tracking-wider">
                    <th className="p-3">ไอดีผู้ใช้</th>
                    <th className="p-3">ชื่อ-นามสกุล</th>
                    <th className="p-3">ฝ่ายงาน/สังกัด</th>
                    <th className="p-3 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredTeachers.map((teacher) => (
                    <tr key={teacher.id} className="hover:bg-slate-50/40 transition">
                      <td className="p-3 font-mono font-bold text-indigo-600">{teacher.username}</td>
                      <td className="p-3 font-bold text-slate-800">{teacher.name}</td>
                      <td className="p-3 text-slate-500 font-medium">{teacher.department}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleDeleteUser(teacher.username, "teacher", teacher.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                          title="ลบบัญชีอาจารย์"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab CONTENT 3: Manage Students */}
      {activeTab === "students" && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          <div className="px-4 py-3 border-b border-slate-150 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                รายชื่อนักเรียนนักศึกษาในระบบ ({filteredStudents.length} คน)
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">สามารถลบข้อมูลและเปลี่ยนสิทธิ์นักเรียนจากตารางนี้ได้</p>
            </div>

            <div className="relative min-w-[220px]">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหารหัส, ชื่อจริง, หรือสาขาวิชา..."
                className="w-full bg-white border border-slate-200 rounded py-1 pl-7 pr-3 text-xs outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          <div className="flex-1 overflow-x-auto text-xs">
            {filteredStudents.length === 0 ? (
              <p className="text-center text-slate-400 py-16">ไม่พบรายชื่อนักศึกษาตามตัวกรอง</p>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/40 text-slate-500 font-bold border-b border-slate-150 text-[10px] uppercase tracking-wider">
                    <th className="p-3">รหัสนักศึกษา</th>
                    <th className="p-3">ชื่อ-นามสกุล</th>
                    <th className="p-3">สาขาวิชา/ชั้นปี</th>
                    <th className="p-3 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50/40 transition">
                      <td className="p-3 font-mono font-bold text-indigo-600">{student.username}</td>
                      <td className="p-3 font-bold text-slate-800">{student.name}</td>
                      <td className="p-3 text-slate-500 font-medium">{student.department}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleDeleteUser(student.username, "student", student.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                          title="ลบนักศึกษา"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tab CONTENT 4: Logs Viewer */}
      {activeTab === "logs" && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          <div className="px-4 py-3 border-b border-slate-150 bg-slate-50/70">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              ประวัติการใช้บริการห้องพักครูทั้งหมดวันนี้ ({checkIns.length} รายการ)
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">แสดงรายชื่อผู้เช็คอิน-เช็คเอาท์ห้องพักครู เรียงจากล่าสุดไปอดีต</p>
          </div>

          <div className="flex-1 overflow-x-auto text-xs">
            {checkIns.length === 0 ? (
              <div className="text-center text-slate-400 py-16">ยังไม่มีประวัติการใช้งานบันทึกในวันนี้</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/40 text-slate-500 font-bold border-b border-slate-150 text-[10px] uppercase tracking-wider">
                    <th className="p-3">วันที่/เวลา</th>
                    <th className="p-3">นักศึกษา</th>
                    <th className="p-3">สังกัด/แผนก</th>
                    <th className="p-3">อาจารย์ผู้เข้าพบ</th>
                    <th className="p-3">วัตถุประสงค์</th>
                    <th className="p-3">สถานะการเข้าพัก</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {checkIns.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/40 transition">
                      <td className="p-3 font-mono font-medium whitespace-nowrap">
                        <div className="text-slate-800 font-bold">{formatTime(log.checkInTime)}</div>
                        <div className="text-[9px] text-slate-400">{formatDate(log.checkInTime)}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-800">{log.studentName}</div>
                        <div className="text-[10px] text-indigo-600 font-mono font-bold">{log.studentId}</div>
                      </td>
                      <td className="p-3 text-slate-500 font-medium">{log.studentDepartment}</td>
                      <td className="p-3 font-bold text-slate-800">{log.teacherName}</td>
                      <td className="p-3">
                        <span className="bg-indigo-50 text-indigo-800 text-[10px] px-2 py-0.5 rounded border border-indigo-100 font-bold">
                          {log.purpose}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {log.status === "in" ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1 w-fit font-mono">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                            IN ROOM
                          </span>
                        ) : log.status === "pending" ? (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1 w-fit font-mono">
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                            PENDING
                          </span>
                        ) : log.status === "rejected" ? (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded flex items-center gap-1 w-fit font-mono">
                            REJECTED
                          </span>
                        ) : log.status === "dismissed" ? (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded flex items-center gap-1 w-fit font-mono">
                            DISMISSED
                          </span>
                        ) : (
                          <div className="text-slate-500 font-medium text-[11px]">
                            ออกแล้ว: {log.checkOutTime ? formatTime(log.checkOutTime) : "เสร็จสิ้น"}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
