import React, { useState, useEffect } from "react";
import { User, CheckIn } from "../types";
import {
  Users,
  Coffee,
  Clock,
  UserPlus,
  Trash2,
  Search,
  CheckSquare,
  LogOut,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  BookOpen
} from "lucide-react";

interface TeacherPanelProps {
  user: User;
  onLogout: () => void;
}

export default function TeacherPanel({ user, onLogout }: TeacherPanelProps) {
  const [activeTab, setActiveTab] = useState<"visitors" | "students">("visitors");
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  
  // Search state
  const [studentSearch, setStudentSearch] = useState("");
  
  // New student state
  const [newStudentId, setNewStudentId] = useState("");
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentDept, setNewStudentDept] = useState("");
  const [newStudentPass, setNewStudentPass] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    try {
      const [checkinsRes, studentsRes] = await Promise.all([
        fetch("/api/checkins"),
        fetch("/api/students")
      ]);

      if (checkinsRes.ok && studentsRes.ok) {
        setCheckIns(await checkinsRes.json());
        setStudents(await studentsRes.json());
      }
    } catch (err) {
      console.error("Error loading teacher panel data:", err);
    }
  };

  useEffect(() => {
    loadData();
    // Poll data every 4 seconds to keep dashboard fresh
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleCheckout = async (checkInId: string) => {
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/checkins/${checkInId}/checkout`, {
        method: "POST"
      });
      if (response.ok) {
        setSuccess("เช็คเอาท์ให้นักศึกษาเรียบร้อยแล้ว");
        loadData();
      } else {
        const errData = await response.json();
        setError(errData.error || "เกิดข้อผิดพลาดในการเช็คเอาท์");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!newStudentId || !newStudentName || !newStudentDept || !newStudentPass) {
      setError("กรุณากรอกข้อมูลนักศึกษาให้ครบถ้วนทุกช่อง");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: newStudentId,
          password: newStudentPass,
          name: newStudentName,
          department: newStudentDept
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "เกิดข้อผิดพลาดในการเพิ่มนักศึกษา");
        setLoading(false);
        return;
      }

      setSuccess(`เพิ่มข้อมูลนักศึกษา "${newStudentName}" เรียบร้อยแล้ว!`);
      setNewStudentId("");
      setNewStudentName("");
      setNewStudentDept("");
      setNewStudentPass("");
      loadData();
    } catch (err) {
      console.error("Add student error:", err);
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async (username: string, name: string) => {
    const confirmDelete = window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบรายชื่อนักศึกษา "${name}" ออกจากระบบ? การกระทำนี้ไม่สามารถย้อนกลับได้`);
    if (!confirmDelete) return;

    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/students/${username}`, {
        method: "DELETE"
      });

      if (response.ok) {
        setSuccess(`ลบข้อมูลนักศึกษา "${name}" เรียบร้อยแล้ว`);
        loadData();
      } else {
        const data = await response.json();
        setError(data.error || "เกิดข้อผิดพลาดในการลบนักศึกษา");
      }
    } catch (err) {
      console.error("Delete student error:", err);
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น.";
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
  };

  // Filter lists
  const myCurrentVisitors = checkIns.filter(
    (c) => c.status === "in" && c.teacherId === user.username
  );
  
  const otherCurrentVisitors = checkIns.filter(
    (c) => c.status === "in" && c.teacherId !== user.username
  );

  const myPastVisitors = checkIns.filter(
    (c) => c.status === "out" && c.teacherId === user.username
  );

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.username.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.department.toLowerCase().includes(studentSearch.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Teacher Profile Banner - High Density Compact */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] text-indigo-600 font-bold font-mono uppercase tracking-wider">
              Teacher Profile • {user.username}
            </div>
            <h2 className="text-base font-bold text-slate-800 font-display">
              สวัสดี, {user.name}
            </h2>
            <p className="text-[10px] text-slate-400">กลุ่มสาระการเรียนรู้/สังกัด: {user.department}</p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded px-3 py-1.5 transition flex items-center justify-center gap-1 cursor-pointer self-start md:self-auto"
        >
          <LogOut className="w-3.5 h-3.5" />
          Logout / ออกจากระบบ
        </button>
      </div>

      {/* Tabs Menu - High Density */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          onClick={() => {
            setActiveTab("visitors");
            setError("");
            setSuccess("");
          }}
          className={`pb-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === "visitors"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <Coffee className="w-4 h-4" />
          ผู้เข้าพบและประวัติการใช้ห้อง
        </button>
        <button
          onClick={() => {
            setActiveTab("students");
            setError("");
            setSuccess("");
          }}
          className={`pb-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === "students"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          จัดการรายชื่อนักเรียนนักศึกษา (เพิ่ม / ลบ)
        </button>
      </div>

      {/* Error & Success Messages */}
      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded p-2.5 flex items-start gap-2 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
          <div>{error}</div>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 rounded p-2.5 flex items-start gap-2 text-xs animate-pulse">
          <CheckSquare className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
          <div>{success}</div>
        </div>
      )}

      {/* Tab 1: Visitors Dashboard */}
      {activeTab === "visitors" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Visitor Actions (2 columns) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Visitors for ME */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-150 bg-slate-50/70 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                  <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    นักศึกษาที่เข้าพบคุณขณะนี้ ({myCurrentVisitors.length} คน)
                  </h3>
                </div>
              </div>

              <div className="p-4">
                {myCurrentVisitors.length === 0 ? (
                  <div className="text-center text-slate-400 py-8 text-xs flex flex-col items-center justify-center space-y-1">
                    <Coffee className="w-8 h-8 text-slate-200" />
                    <span className="font-medium text-slate-500">ขณะนี้ไม่มีนักเรียนเข้าพบคุณโดยตรง</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {myCurrentVisitors.map((visitor) => (
                      <div
                        key={visitor.id}
                        className="bg-indigo-50/40 border border-indigo-150 hover:border-indigo-200 rounded p-3 flex flex-col justify-between text-xs"
                      >
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-mono font-bold text-indigo-700">
                              {visitor.studentId}
                            </span>
                            <span className="text-[9px] text-emerald-700 bg-emerald-100 border border-emerald-200 font-bold px-1.5 py-0.2 rounded">
                              IN ROOM
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-800 text-sm leading-tight">{visitor.studentName}</h4>
                          <p className="text-[10px] text-slate-400">สาขา: {visitor.studentDepartment}</p>
                          <div className="bg-white border border-indigo-100 rounded p-2 text-xs text-slate-600 leading-normal">
                            <span className="font-bold text-slate-500 uppercase tracking-tighter text-[9px] block">ธุระ:</span>
                            {visitor.purpose}
                          </div>
                        </div>

                        <div className="mt-3 border-t border-slate-200/60 pt-2 flex items-center justify-between">
                          <span className="text-[9px] text-slate-400 font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(visitor.checkInTime)}
                          </span>
                          <button
                            onClick={() => handleCheckout(visitor.id)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] py-1 px-2.5 rounded shadow-sm transition cursor-pointer"
                          >
                            เช็คเอาท์ (ออกห้อง)
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Other Active Visitors in the Lounge */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-150 bg-slate-50/70">
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  นักศึกษาเข้าพบอาจารย์ท่านอื่นอยู่ ({otherCurrentVisitors.length} คน)
                </h3>
              </div>
              <div className="p-4">
                {otherCurrentVisitors.length === 0 ? (
                  <p className="text-center text-slate-400 py-4 text-xs">ไม่มีนักศึกษาอื่น ๆ อยู่ในห้องพักครูขณะนี้</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {otherCurrentVisitors.map((visitor) => (
                      <div key={visitor.id} className="bg-slate-50 border border-slate-200 rounded p-3 flex flex-col justify-between text-xs">
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[9px] text-slate-400 font-medium">
                            <span className="font-mono">{visitor.studentId}</span>
                            <span className="text-indigo-700 font-bold">พบ {visitor.teacherName}</span>
                          </div>
                          <h4 className="font-bold text-slate-800 text-sm leading-tight">{visitor.studentName}</h4>
                          <p className="text-[11px] text-slate-500 italic">ธุระ: {visitor.purpose}</p>
                        </div>
                        <div className="mt-2.5 border-t border-slate-200/60 pt-2 text-[10px] text-slate-400 flex items-center justify-between">
                          <span className="font-mono">เช็คอิน: {formatTime(visitor.checkInTime)}</span>
                          <button
                            onClick={() => handleCheckout(visitor.id)}
                            className="text-indigo-600 hover:text-rose-600 font-bold cursor-pointer text-[10px]"
                          >
                            เช็คเอาท์ให้แทน
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Teacher's Past Visitors Logs */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-slate-150 bg-slate-50/70">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-500" />
                ประวัติการรับรองนักศึกษาของคุณ
              </h3>
            </div>
            <div className="p-4 flex-1 overflow-y-auto max-h-[450px]">
              {myPastVisitors.length === 0 ? (
                <div className="text-center text-slate-400 py-12 text-xs">
                  คุณยังไม่มีประวัติบันทึกการพบปะนักศึกษาที่เสร็จสิ้นในวันนี้
                </div>
              ) : (
                <div className="space-y-3">
                  {myPastVisitors.map((log) => (
                    <div key={log.id} className="border-l-2 border-slate-200 pl-3 py-1 space-y-0.5 relative text-xs">
                      <div className="absolute left-[-3px] top-1.5 w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800">{log.studentName}</span>
                        <span className="text-[9px] text-slate-400 font-mono">{formatDate(log.checkInTime)}</span>
                      </div>
                      <p className="text-[11px] text-slate-500">ธุระ: {log.purpose}</p>
                      <div className="text-[9px] text-slate-400 font-mono">
                        เวลา: {formatTime(log.checkInTime)} - {log.checkOutTime ? formatTime(log.checkOutTime) : ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Manage Student Accounts */}
      {activeTab === "students" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Add New Student Form (1 column) */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm space-y-4 h-fit">
            <div className="border-b border-slate-150 pb-2.5">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-indigo-600" />
                เพิ่มข้อมูลนักศึกษาใหม่
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">สร้างบัญชีผู้ใช้ให้นักศึกษาสำหรับล็อกอินเข้าใช้งานระบบ</p>
            </div>

            <form onSubmit={handleAddStudent} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">รหัสนักศึกษา (ล็อกอิน)</label>
                <input
                  type="text"
                  value={newStudentId}
                  onChange={(e) => setNewStudentId(e.target.value)}
                  placeholder="เช่น 64012345"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded py-1.5 px-2.5 outline-none text-slate-800 transition text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">รหัสผ่าน</label>
                <input
                  type="text"
                  value={newStudentPass}
                  onChange={(e) => setNewStudentPass(e.target.value)}
                  placeholder="เช่น 123456"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded py-1.5 px-2.5 outline-none text-slate-800 transition text-xs font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">ชื่อ-นามสกุลจริง</label>
                <input
                  type="text"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="เช่น นายวิทยา ปัญญาเลิศ"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded py-1.5 px-2.5 outline-none text-slate-800 transition text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">สาขาวิชา/ชั้นปี</label>
                <input
                  type="text"
                  value={newStudentDept}
                  onChange={(e) => setNewStudentDept(e.target.value)}
                  placeholder="เช่น เทคโนโลยีสารสนเทศ ปวส.2"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded py-1.5 px-2.5 outline-none text-slate-800 transition text-xs"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-2 px-3 rounded shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer mt-3"
              >
                {loading ? "กำลังบันทึก..." : "ยืนยันการบันทึกข้อมูล"}
              </button>
            </form>
          </div>

          {/* Student Search and Management List (2 columns) */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[450px]">
            {/* Search Header */}
            <div className="px-4 py-3 border-b border-slate-150 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                รายชื่อนักศึกษาทั้งหมดในระบบ ({filteredStudents.length} คน)
              </h3>

              <div className="relative min-w-[200px]">
                <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="ค้นหารหัส, ชื่อ หรือสาขาวิชา..."
                  className="w-full bg-white border border-slate-200 rounded py-1 pl-7 pr-3 text-xs outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>

            {/* Students Table/List */}
            <div className="flex-1 overflow-x-auto">
              {filteredStudents.length === 0 ? (
                <div className="text-center text-slate-400 py-16 text-xs">
                  ไม่พบข้อมูลนักศึกษาตรงกับการค้นหาของคุณ
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/40 text-slate-500 text-[10px] font-bold uppercase border-b border-slate-150 tracking-wider">
                      <th className="p-3">รหัสนักศึกษา</th>
                      <th className="p-3">ชื่อ-นามสกุล</th>
                      <th className="p-3">สาขาวิชา/แผนก</th>
                      <th className="p-3 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {filteredStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-slate-50/60 transition">
                        <td className="p-3 font-mono font-bold text-indigo-600">{student.username}</td>
                        <td className="p-3 font-bold text-slate-800">{student.name}</td>
                        <td className="p-3 text-slate-500 font-medium">{student.department}</td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleDeleteStudent(student.username, student.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                            title="ลบรายชื่อนักศึกษา"
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
        </div>
      )}
    </div>
  );
}
