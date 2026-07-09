import React, { useState, useEffect } from "react";
import { CheckIn, Stats, RoomSchedule } from "../types";
import { Users, Clock, LogIn, Calendar, Coffee, Sparkles, BookOpen, FileSpreadsheet } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface RealTimeDashboardProps {
  onNavigate: (view: string) => void;
  onQuickCheckIn: () => void;
}

export default function RealTimeDashboard({ onNavigate, onQuickCheckIn }: RealTimeDashboardProps) {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [schedules, setSchedules] = useState<RoomSchedule[]>([]);
  const [stats, setStats] = useState<Stats>({
    studentsCount: 0,
    teachersCount: 0,
    activeCheckins: 0,
    totalCheckins: 0,
  });
  const [time, setTime] = useState(new Date());
  const [loading, setLoading] = useState(true);

  // Poll for active checkins, stats, and schedules every 3 seconds
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [checkinsRes, statsRes, schedulesRes] = await Promise.all([
          fetch("/api/checkins"),
          fetch("/api/stats"),
          fetch("/api/schedules")
        ]);
        if (checkinsRes.ok && statsRes.ok) {
          const checkinsData = await checkinsRes.json();
          const statsData = await statsRes.json();
          setCheckIns(checkinsData);
          setStats(statsData);
        }
        if (schedulesRes && schedulesRes.ok) {
          setSchedules(await schedulesRes.json());
        }
      } catch (err) {
        console.error("Error fetching real-time dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatThaiDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return date.toLocaleDateString("th-TH", options);
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น.";
  };

  // Filter out students who are currently checked in (status = "in")
  const activeStudents = checkIns.filter((c) => c.status === "in");
  const recentHistory = checkIns.filter((c) => c.status === "out").slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Upper Status & Live Clock Bar - High Density Styled */}
      <div className="bg-indigo-900 text-white rounded-lg p-4 shadow-sm border border-indigo-950 flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative overflow-hidden">
        {/* Subtle decorative background detail */}
        <div className="absolute right-0 bottom-0 w-32 h-32 bg-indigo-800/20 rounded-full translate-x-10 translate-y-10 pointer-events-none"></div>

        <div className="space-y-1 z-10">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-indigo-800 border border-indigo-700/60 rounded text-[10px] uppercase font-bold tracking-wider text-indigo-200">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
            Live Attendance Feed | แสดงผลเรียลไทม์
          </div>
          <h1 className="text-xl md:text-2xl font-bold font-display tracking-tight leading-tight">
            ห้องพักครูออนไลน์ (SMART LOUNGE)
          </h1>
          <p className="text-indigo-200 text-xs flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-300" />
            {formatThaiDate(time)}
          </p>
        </div>

        {/* Live Clock Frame matching design mockup */}
        <div className="bg-indigo-950/70 border border-indigo-800/40 rounded p-3 min-w-[180px] text-center md:text-right shadow-inner z-10 flex flex-col justify-center">
          <div className="text-[10px] text-indigo-300 uppercase tracking-widest font-mono font-bold flex items-center justify-center md:justify-end gap-1 mb-0.5">
            <Clock className="w-3 h-3" />
            LIVE STATUS
          </div>
          <div className="text-2xl font-bold font-mono tracking-wider text-white">
            {time.toLocaleTimeString("th-TH", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </div>
          <div className="text-[10px] text-emerald-400 font-medium mt-0.5 flex items-center justify-center md:justify-end gap-1 font-mono">
            CONNECTED TO SHEET
          </div>
        </div>
      </div>

      {/* Statistics Bento Grid - Compact, high density layout */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Active In Lounge Card */}
        <div id="stat-active-in" className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-center gap-3 hover:border-slate-300 transition-colors">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Currently Inside</div>
            <div className="text-xl font-black text-slate-800 font-mono leading-none mt-0.5">
              {stats.activeCheckins} <span className="text-xs font-normal text-slate-400">คน</span>
            </div>
          </div>
        </div>

        {/* Total Visits Today Card */}
        <div id="stat-total-visits" className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-center gap-3 hover:border-slate-300 transition-colors">
          <div className="p-2 bg-blue-50 text-blue-600 rounded">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Today Entry Total</div>
            <div className="text-xl font-black text-slate-800 font-mono leading-none mt-0.5">
              {stats.totalCheckins} <span className="text-xs font-normal text-slate-400">ครั้ง</span>
            </div>
          </div>
        </div>

        {/* Total Students Registered */}
        <div id="stat-students-count" className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-center gap-3 hover:border-slate-300 transition-colors">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Registered Students</div>
            <div className="text-xl font-black text-slate-800 font-mono leading-none mt-0.5">
              {stats.studentsCount} <span className="text-xs font-normal text-slate-400">คน</span>
            </div>
          </div>
        </div>

        {/* Quick Check-In CTA - Solid primary color of high density */}
        <button
          onClick={onQuickCheckIn}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg p-3 shadow-sm flex items-center gap-3 transition group cursor-pointer border border-indigo-700"
        >
          <div className="p-2 bg-indigo-500 text-white rounded">
            <LogIn className="w-5 h-5" />
          </div>
          <div className="text-left flex-1">
            <div className="text-[10px] opacity-75 font-bold uppercase tracking-tight">Students Access</div>
            <div className="text-sm font-bold tracking-tight">
              เช็คชื่อเข้าห้องพักครู &rarr;
            </div>
          </div>
        </button>
      </div>

      {/* Room Schedule Board - Beautifully high contrast and styled */}
      {schedules.length > 0 && (
        <div id="room-schedule-board" className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-150 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-pulse"></span>
              <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5 font-display">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                ตารางเวลาการใช้ห้องเรียน/ห้องพักครูวันนี้ (ดึงจาก Google Sheets)
              </h2>
            </div>
            <span className="text-[9px] text-indigo-700 bg-indigo-50 font-bold border border-indigo-150 px-2 py-0.5 rounded uppercase tracking-wider font-mono">
              ROOM SCHEDULES
            </span>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/30 text-slate-500 font-bold border-b border-slate-200 text-[10px] uppercase tracking-wider">
                  <th className="p-3">เวลากี่โมง</th>
                  <th className="p-3">ชื่อคนใช้</th>
                  <th className="p-3">วิชาที่เรียน</th>
                  <th className="p-3">ห้องที่ใช้</th>
                  <th className="p-3 text-center">จำนวนนักเรียน</th>
                  <th className="p-3 text-center">สถานะห้อง</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {schedules.map((sch) => (
                  <tr key={sch.id} className="hover:bg-slate-50/40 transition">
                    <td className="p-3 font-mono font-black text-indigo-600">{sch.time}</td>
                    <td className="p-3 font-bold text-slate-800">{sch.user}</td>
                    <td className="p-3 font-medium text-slate-500">{sch.subject}</td>
                    <td className="p-3">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-mono text-[10px] font-bold">
                        {sch.room}
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-slate-600">{sch.studentCount} คน</td>
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
          </div>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Columns: Live Students Currently Inside */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
          <div className="px-4 py-3 border-b border-slate-150 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full glow-active"></span>
              <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                กำลังใช้ห้องพักครูขณะนี้ ({activeStudents.length} คน)
              </h2>
            </div>
            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded uppercase tracking-wider">
              IN ROOM
            </span>
          </div>

          <div className="p-4 flex-1 flex flex-col justify-start">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-12">
                <div className="w-6 h-6 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin mb-2"></div>
                <span className="text-xs">กำลังโหลดข้อมูล...</span>
              </div>
            ) : activeStudents.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-12 text-center space-y-2">
                <div className="p-3 bg-slate-50 rounded text-slate-400 border border-slate-100">
                  <Coffee className="w-8 h-8" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-slate-700 font-bold text-xs">ไม่มีนักเรียนอยู่ในห้องพักครูในขณะนี้</p>
                  <p className="text-[11px] text-slate-400 max-w-sm">
                    สามารถเช็คอินได้ทันทีโดยการกดปุ่มบันทึกข้อมูล
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <AnimatePresence initial={false}>
                  {activeStudents.map((student) => (
                    <motion.div
                      key={student.id}
                      layoutId={student.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.2 }}
                      className="bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded p-3 flex flex-col justify-between shadow-xs relative group transition-colors"
                    >
                      <div className="absolute top-3 right-3 flex items-center gap-1 bg-green-100 text-green-700 text-[9px] font-bold px-1.5 py-0.5 rounded">
                        <span className="w-1 h-1 bg-green-500 rounded-full"></span>
                        IN ROOM
                      </div>

                      <div className="space-y-1.5">
                        <div>
                          <div className="text-[10px] text-indigo-600 font-bold tracking-wider font-mono">
                            {student.studentId}
                          </div>
                          <h3 className="font-bold text-slate-800 text-sm font-display leading-snug">
                            {student.studentName}
                          </h3>
                          <p className="text-[10px] text-slate-400 italic">
                            สาขา: {student.studentDepartment}
                          </p>
                        </div>

                        <div className="border-t border-slate-200/60 pt-1.5 space-y-0.5">
                          <p className="text-[11px] text-slate-500 flex items-center gap-1">
                            <span className="font-bold text-slate-400 uppercase tracking-tighter text-[9px]">พบ:</span>
                            <span className="text-slate-700 font-medium">{student.teacherName}</span>
                          </p>
                          <p className="text-[11px] text-slate-500 flex items-start gap-1">
                            <span className="font-bold text-slate-400 uppercase tracking-tighter text-[9px] min-w-[32px]">ธุระ:</span>
                            <span className="text-indigo-900 bg-indigo-50 px-1 py-0.5 rounded text-[10px] font-medium leading-normal flex-1">
                              {student.purpose}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="mt-2.5 border-t border-slate-200/60 pt-1.5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          เช็คอิน: {formatTime(student.checkInTime)}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recent Activity Logs */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-150 flex items-center justify-between bg-slate-50/70">
            <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-500" />
              การเข้าออกล่าสุดวันนี้
            </h2>
          </div>

          <div className="p-4 flex-1 flex flex-col justify-start">
            {recentHistory.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-12 text-center text-[11px]">
                <span>ยังไม่มีประวัติการเช็คเอาท์วันนี้</span>
              </div>
            ) : (
              <div className="space-y-3">
                {recentHistory.map((item) => (
                  <div key={item.id} className="border-l-2 border-indigo-200 pl-3 py-1 space-y-0.5 relative text-xs">
                    <div className="absolute left-[-3px] top-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-800">{item.studentName}</h4>
                      <span className="text-[9px] text-slate-400 bg-slate-100 px-1 py-0.2 rounded font-mono">
                        {item.studentId}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 italic">
                      พบ {item.teacherName} • {item.purpose}
                    </p>
                    <div className="flex items-center gap-1 text-[9px] text-slate-400 font-mono">
                      <Clock className="w-2.5 h-2.5" />
                      <span>
                        {formatTime(item.checkInTime)} - {item.checkOutTime ? formatTime(item.checkOutTime) : ""}
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
