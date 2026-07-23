import React, { useState } from "react";
import { UserCheck, Shield, Sparkles, AlertCircle, ArrowLeft } from "lucide-react";

interface RegisterPanelProps {
  onRegisterSuccess: () => void;
  onBackToLogin: () => void;
}

export default function RegisterPanel({ onRegisterSuccess, onBackToLogin }: RegisterPanelProps) {
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!username || !password || !name || !department) {
      setError("กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง");
      return;
    }

    if (role === "student" && isNaN(Number(username))) {
      setError("รหัสนักศึกษาต้องเป็นตัวเลขเท่านั้น");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
          name,
          department,
          role,
        }),
      });

      let data;
      try {
        data = await response.json();
      } catch (parseErr) {
        data = null;
      }

      if (!response.ok) {
        setError(data?.error || "ไม่สามารถลงทะเบียนได้เนื่องจากข้อมูลซ้ำหรือโครงสร้างไม่ถูกต้อง");
        setLoading(false);
        return;
      }

      setSuccessMsg("ลงทะเบียนเข้าใช้งานสำเร็จแล้ว! ระบบกำลังพากลับไปหน้าเข้าสู่ระบบ...");
      setTimeout(() => {
        onRegisterSuccess();
      }, 2000);
    } catch (err) {
      console.error("Register error:", err);
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden my-4">
      {/* Banner - High Density Compact */}
      <div className="bg-indigo-950 text-white p-4 text-center relative overflow-hidden">
        <button
          type="button"
          onClick={onBackToLogin}
          className="absolute top-3.5 left-3 text-indigo-200 hover:text-white p-1 rounded hover:bg-white/10 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="inline-flex p-2 bg-white/10 backdrop-blur-md rounded mb-2 text-white shadow-sm">
          <Sparkles className="w-5 h-5" />
        </div>
        <h2 className="text-sm font-bold uppercase tracking-wider font-display">ลงทะเบียนเข้าใช้งาน</h2>
        <p className="text-indigo-200 text-[10px] mt-0.5">เพื่อเปิดบัญชีผู้ใช้ในระบบเช็คเข้าห้องพักครู</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Role Select - High Density */}
        <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-md">
          <button
            type="button"
            onClick={() => setRole("student")}
            className={`py-1.5 rounded text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
              role === "student"
                ? "bg-white text-indigo-950 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <UserCheck className="w-4 h-4" />
            นักเรียน/นักศึกษา
          </button>
          <button
            type="button"
            onClick={() => setRole("teacher")}
            className={`py-1.5 rounded text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
              role === "teacher"
                ? "bg-white text-indigo-950 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Shield className="w-4 h-4" />
            อาจารย์
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 border border-red-200 rounded p-2.5 flex items-start gap-2 text-xs animate-pulse">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <div>{error}</div>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 rounded p-2.5 text-xs">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              {role === "student" ? "รหัสนักศึกษา (สำหรับใช้ล็อกอิน)" : "รหัสพนักงาน/ไอดีอาจารย์ (สำหรับใช้ล็อกอิน)"}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={role === "student" ? "เช่น 64012345" : "เช่น teacher.s"}
              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded py-1.5 px-3 outline-none text-slate-800 transition text-xs font-medium"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">รหัสผ่านที่ต้องการ</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded py-1.5 px-3 outline-none text-slate-800 transition text-xs font-mono"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">ชื่อ-นามสกุลจริง</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={role === "student" ? "นายรักชาติ ศาสน์กษัตริย์" : "ดร.สมศรี ใจงาม"}
              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded py-1.5 px-3 outline-none text-slate-800 transition text-xs font-medium"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              {role === "student" ? "สาขาวิชา/แผนกวิชา" : "กลุ่มวิชา/ฝ่ายงาน"}
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder={role === "student" ? "เทคโนโลยีคอมพิวเตอร์" : "ฝ่ายวิชาการคอมพิวเตอร์"}
              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded py-1.5 px-3 outline-none text-slate-800 transition text-xs font-medium"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-2 px-3 rounded shadow-sm hover:shadow-indigo-500/10 transition flex items-center justify-center gap-1.5 cursor-pointer mt-4"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              "ยืนยันการลงทะเบียน"
            )}
          </button>
        </form>

        <div className="border-t border-slate-200 pt-3 text-center">
          <button
            onClick={onBackToLogin}
            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-wider cursor-pointer"
          >
            &larr; กลับหน้าเข้าสู่ระบบ
          </button>
        </div>
      </div>
    </div>
  );
}
