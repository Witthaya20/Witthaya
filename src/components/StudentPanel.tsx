import React, { useState, useEffect } from "react";
import { User, CheckIn } from "../types";
import { Coffee, CheckCircle2, Clock, LogOut, ArrowRight, UserCheck, AlertCircle, FileText } from "lucide-react";

interface StudentPanelProps {
  user: User;
  onLogout: () => void;
}

export default function StudentPanel({ user, onLogout }: StudentPanelProps) {
  const [teachers, setTeachers] = useState<User[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [purpose, setPurpose] = useState("");
  const [customPurpose, setCustomPurpose] = useState("");
  const [personalHistory, setPersonalHistory] = useState<CheckIn[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeCheckIn, setActiveCheckIn] = useState<CheckIn | null>(null);

  const purposeOptions = [
    "ส่งการบ้าน / ส่งงาน",
    "ปรึกษาบทเรียน / สอบถามวิชาเรียน",
    "สอบแก้ตัว / สอบกลางภาคย้อนหลัง",
    "ปรึกษาโครงงาน / โปรเจกต์จบ",
    "พบอาจารย์ที่ปรึกษา / เรื่องส่วนตัว",
    "อื่นๆ (ระบุระบุด้านล่าง)"
  ];

  const fetchTeachersAndHistory = async () => {
    try {
      const [teachersRes, checkinsRes] = await Promise.all([
        fetch("/api/teachers"),
        fetch("/api/checkins")
      ]);

      if (teachersRes.ok && checkinsRes.ok) {
        const teachersData = await teachersRes.json();
        const checkinsData: CheckIn[] = await checkinsRes.json();
        
        setTeachers(teachersData);
        
        // Find if this student currently has an active check-in
        const active = checkinsData.find(
          (c) => c.studentId === user.username && (c.status === "in" || c.status === "pending" || c.status === "rejected")
        );
        setActiveCheckIn(active || null);

        // Filter this student's personal history
        const personal = checkinsData.filter((c) => c.studentId === user.username && c.status !== "dismissed");
        setPersonalHistory(personal);
      }
    } catch (err) {
      console.error("Error loading student panel data:", err);
    }
  };

  useEffect(() => {
    fetchTeachersAndHistory();
    // Poll active status every 5 seconds to stay updated
    const interval = setInterval(fetchTeachersAndHistory, 5000);
    return () => clearInterval(interval);
  }, [user.username]);

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedTeacherId) {
      setError("กรุณาเลือกอาจารย์ที่ท่านต้องการเข้าพบ");
      return;
    }

    const finalPurpose = purpose === "อื่นๆ (ระบุระบุด้านล่าง)" ? customPurpose : purpose;
    if (!finalPurpose || finalPurpose.trim() === "") {
      setError("กรุณาระบุวัตถุประสงค์ในการเข้าพบ");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/checkins", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: user.username,
          teacherId: selectedTeacherId,
          purpose: finalPurpose,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "เกิดข้อผิดพลาดในการเช็คอิน");
        setLoading(false);
        return;
      }

      setSuccess("เช็คอินเข้าห้องพักครูสำเร็จแล้ว!");
      setSelectedTeacherId("");
      setPurpose("");
      setCustomPurpose("");
      fetchTeachersAndHistory();
    } catch (err) {
      console.error("Check-in error:", err);
      setError("ไม่สามารถติดต่อเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async (checkInId: string) => {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch(`/api/checkins/${checkInId}/checkout`, {
        method: "POST"
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "เกิดข้อผิดพลาดในการเช็คเอาท์");
        setLoading(false);
        return;
      }

      setSuccess("เช็คเอาท์ออกจากห้องพักครูสำเร็จแล้ว! ขอบคุณสำหรับการใช้บริการ");
      setActiveCheckIn(null);
      fetchTeachersAndHistory();
    } catch (err) {
      console.error("Check-out error:", err);
      setError("ไม่สามารถติดต่อเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async (checkInId: string) => {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch(`/api/checkins/${checkInId}/dismiss`, {
        method: "POST"
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "เกิดข้อผิดพลาด");
        setLoading(false);
        return;
      }

      setActiveCheckIn(null);
      fetchTeachersAndHistory();
    } catch (err) {
      console.error("Dismiss error:", err);
      setError("ไม่สามารถติดต่อเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น.";
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
  };

  return (
    <div className="space-y-4">
      {/* Student Welcome Card - High Density Compact */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] text-indigo-600 font-bold font-mono uppercase tracking-wider">
              Student Profile • {user.username}
            </div>
            <h2 className="text-base font-bold text-slate-800 font-display">
              สวัสดี, {user.name}
            </h2>
            <p className="text-[10px] text-slate-400">สาขา: {user.department}</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Entry Action & Active Status */}
        <div className="lg:col-span-2 space-y-4">
          {/* Active Visit Banner if Checked In / Pending / Rejected */}
          {activeCheckIn ? (
            activeCheckIn.status === "pending" ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    <h3 className="text-sm font-bold text-amber-900 font-display">
                      อยู่ระหว่างรออนุมัติการเข้าใช้ห้องพักครู
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-200 rounded px-1.5 py-0.2 uppercase font-mono">
                    PENDING
                  </span>
                </div>

                <div className="bg-white border border-amber-100 rounded p-3 grid grid-cols-1 md:grid-cols-2 gap-3 shadow-xs text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">อาจารย์ที่แจ้งเข้าพบ</span>
                    <p className="font-bold text-slate-800 text-sm">{activeCheckIn.teacherName}</p>
                    <p className="text-[10px] text-slate-500">สาขา: {activeCheckIn.studentDepartment}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">วัตถุประสงค์ในการเข้าพบ</span>
                    <p className="text-xs font-medium text-slate-700 bg-slate-50 p-1.5 rounded border border-slate-150">
                      {activeCheckIn.purpose}
                    </p>
                  </div>
                  <div className="md:col-span-2 flex items-center gap-1.5 text-[10px] text-slate-400 mt-1 border-t border-slate-100 pt-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>ส่งคำขอเมื่อเวลา: {formatTime(activeCheckIn.checkInTime)}</span>
                  </div>
                </div>

                <div className="bg-amber-100/50 border border-amber-200/60 rounded p-2.5 text-[11px] text-amber-900 text-center font-medium">
                  กรุณารอสักครู่... ผู้ดูแลระบบ (Admin) กำลังพิจารณาคำขอเช็คอินเข้าห้องพักครูของคุณ
                </div>
              </div>
            ) : activeCheckIn.status === "rejected" ? (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    <h3 className="text-sm font-bold text-rose-900 font-display">
                      คำขอเข้าห้องพักครูของคุณได้รับการปฏิเสธ / ไม่อนุมัติ
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-rose-800 bg-rose-100 border border-rose-200 rounded px-1.5 py-0.2 uppercase font-mono">
                    REJECTED
                  </span>
                </div>

                <div className="bg-white border border-rose-100 rounded p-3 grid grid-cols-1 md:grid-cols-2 gap-3 shadow-xs text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">อาจารย์ที่แจ้งเข้าพบ</span>
                    <p className="font-bold text-slate-800 text-sm">{activeCheckIn.teacherName}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">วัตถุประสงค์ในการเข้าพบ</span>
                    <p className="text-xs font-medium text-slate-700 bg-slate-50 p-1.5 rounded border border-slate-150">
                      {activeCheckIn.purpose}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleDismiss(activeCheckIn.id)}
                  disabled={loading}
                  className="w-full bg-slate-700 hover:bg-slate-800 text-white font-bold py-2 px-3 rounded shadow-sm transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    "รับทราบและล้างสถานะเพื่อขอเช็คอินใหม่"
                  )}
                </button>
              </div>
            ) : (
              <div className="bg-emerald-50/50 border border-emerald-200 rounded-lg p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <h3 className="text-sm font-bold text-emerald-900 font-display">
                      คุณกำลังใช้ห้องพักครูขณะนี้
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 rounded px-1.5 py-0.2 uppercase font-mono">
                    ACTIVE
                  </span>
                </div>

                <div className="bg-white border border-emerald-100 rounded p-3 grid grid-cols-1 md:grid-cols-2 gap-3 shadow-xs">
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">อาจารย์ที่เข้าพบ</span>
                    <p className="font-bold text-slate-800 text-sm">{activeCheckIn.teacherName}</p>
                    <p className="text-[10px] text-slate-500">สาขา: {activeCheckIn.studentDepartment}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">วัตถุประสงค์ในการเข้าพบ</span>
                    <p className="text-xs font-medium text-slate-700 bg-slate-50 p-1.5 rounded border border-slate-150">
                      {activeCheckIn.purpose}
                    </p>
                  </div>
                  <div className="md:col-span-2 flex items-center gap-1.5 text-[10px] text-slate-400 mt-1 border-t border-slate-100 pt-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>เช็คอินเข้าห้องเมื่อเวลา: {formatTime(activeCheckIn.checkInTime)}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleCheckOut(activeCheckIn.id)}
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded shadow-sm transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Coffee className="w-4 h-4" />
                      เช็คเอาท์ (คลิกเมื่อออกจากห้องพักครู)
                    </>
                  )}
                </button>
              </div>
            )
          ) : (
            /* Check In Form */
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm space-y-4">
              <div className="border-b border-slate-150 pb-2.5">
                <h3 className="text-sm font-bold text-slate-800 font-display uppercase tracking-tight">
                  ลงทะเบียนเข้าห้องพักครู / Check-in
                </h3>
                <p className="text-[11px] text-slate-400">กรอกข้อมูลเมื่อต้องการเช็คอินเข้าห้องเพื่อมาพบอาจารย์</p>
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 border border-red-200 rounded p-2.5 flex items-start gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  <div>{error}</div>
                </div>
              )}

              {success && (
                <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 rounded p-2.5 flex items-start gap-2 text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                  <div>{success}</div>
                </div>
              )}

              <form onSubmit={handleCheckIn} className="space-y-3">
                {/* Select Teacher */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">อาจารย์ที่ท่านต้องการติดต่อ</label>
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded py-1.5 px-2.5 outline-none text-slate-800 transition text-xs cursor-pointer focus:ring-1 focus:ring-indigo-500"
                    required
                  >
                    <option value="">-- เลือกอาจารย์ --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.username}>
                        {t.name} ({t.department})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Purpose Choice */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">วัตถุประสงค์ในการเข้าพบ</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 mt-1">
                    {purposeOptions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setPurpose(opt);
                          if (opt !== "อื่นๆ (ระบุระบุด้านล่าง)") {
                            setCustomPurpose("");
                          }
                        }}
                        className={`p-2.5 rounded border text-xs text-left font-medium transition cursor-pointer ${
                          purpose === opt
                            ? "bg-indigo-50 border-indigo-400 text-indigo-800 font-bold"
                            : "bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom purpose field if selected others */}
                {purpose === "อื่นๆ (ระบุระบุด้านล่าง)" && (
                  <div className="space-y-1 animate-fadeIn">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">ระบุวัตถุประสงค์อื่น ๆ</label>
                    <input
                      type="text"
                      value={customPurpose}
                      onChange={(e) => setCustomPurpose(e.target.value)}
                      placeholder="เช่น ยืมตำราเรียน, นำขนมมาฝาก ฯลฯ"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded py-1.5 px-2.5 outline-none text-slate-800 transition text-xs focus:ring-1 focus:ring-indigo-500"
                      required
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-2 px-3 rounded shadow-sm transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer mt-4 text-xs"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4" />
                      เช็คอิน เข้าใช้ห้องพักครู
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right Column: Student Personal Entry Logs */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-150 bg-slate-50/70 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-500" />
              ประวัติการใช้งานของคุณ ({personalHistory.length} ครั้ง)
            </h3>
          </div>

          <div className="p-4 flex-1 overflow-y-auto max-h-[450px]">
            {personalHistory.length === 0 ? (
              <div className="text-center text-slate-400 py-12 text-xs">
                คุณยังไม่มีประวัติการเช็คอินห้องพักครูในระบบ
              </div>
            ) : (
              <div className="space-y-3">
                {personalHistory.map((log) => (
                  <div
                    key={log.id}
                    className={`border-l-2 pl-3 py-1 space-y-0.5 relative text-xs ${
                      log.status === "in" ? "border-emerald-400" : "border-slate-200"
                    }`}
                  >
                    <div
                      className={`absolute left-[-4.5px] top-1.5 w-2 h-2 rounded-full ${
                        log.status === "in" ? "bg-emerald-500 animate-ping" : "bg-slate-400"
                      }`}
                    ></div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800">
                        {log.teacherName}
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono">
                        {formatDate(log.checkInTime)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      ธุระ: {log.purpose}
                    </p>
                    <div className="flex items-center gap-1 text-[9px] text-slate-400 font-mono">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>
                        {formatTime(log.checkInTime)} -{" "}
                        {log.checkOutTime ? formatTime(log.checkOutTime) : "ยังไม่เช็คเอาท์"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
