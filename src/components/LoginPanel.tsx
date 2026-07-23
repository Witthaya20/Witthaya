import React, { useState } from "react";
import { User } from "../types";
import { LogIn, UserCheck, Shield, Key, AlertCircle, Sparkles } from "lucide-react";

interface LoginPanelProps {
  onLoginSuccess: (user: User) => void;
  onNavigateToRegister: () => void;
}

export default function LoginPanel({ onLoginSuccess, onNavigateToRegister }: LoginPanelProps) {
  const [role, setRole] = useState<"student" | "teacher" | "admin">("student");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    let sendUsername = username.trim();
    let sendPassword = password.trim();

    if (!sendUsername) {
      setError("กรุณากรอกไอดีเพื่อเข้าสู่ระบบ");
      return;
    }

    if (!sendPassword) {
      setError("กรุณากรอกรหัสผ่าน");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: sendUsername, password: sendPassword, role }),
      });

      let data: any = null;
      const resText = await response.text();
      try {
        data = resText ? JSON.parse(resText) : null;
      } catch (parseErr) {
        console.error("Non-JSON response received from server:", resText);
      }

      if (!response.ok || !data?.user) {
        setError(data?.error || "ไม่สามารถเข้าสู่ระบบได้ กรุณาตรวจสอบข้อมูล");
        setLoading(false);
        return;
      }

      onLoginSuccess(data.user);
    } catch (err) {
      console.error("Login error:", err);
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบและลองอีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden my-4">
      {/* Visual Header Banner - High Density Style */}
      <div className="bg-indigo-950 text-white p-5 text-center relative overflow-hidden border-b border-indigo-900">
        <div className="absolute top-[-10px] right-[-10px] w-20 h-20 bg-white/10 rounded-full blur-lg pointer-events-none"></div>
        <div className="inline-flex p-2 bg-indigo-900 rounded mb-2 text-white border border-indigo-800">
          <LogIn className="w-5 h-5" />
        </div>
        <h2 className="text-lg font-bold font-display leading-tight">Authentication | เข้าสู่ระบบ</h2>
        <p className="text-indigo-300 text-xs mt-0.5">ระบบลงเวลาเข้าห้องพักครูออนไลน์</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Role Tab Selector */}
        <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-md">
          <button
            type="button"
            onClick={() => {
              setRole("student");
              setError("");
            }}
            className={`py-1.5 px-2 rounded text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
              role === "student"
                ? "bg-white text-indigo-900 shadow-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            นักเรียน
          </button>
          <button
            type="button"
            onClick={() => {
              setRole("teacher");
              setError("");
            }}
            className={`py-1.5 px-2 rounded text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
              role === "teacher"
                ? "bg-white text-indigo-900 shadow-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            อาจารย์
          </button>
          <button
            type="button"
            onClick={() => {
              setRole("admin");
              setError("");
            }}
            className={`py-1.5 px-2 rounded text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
              role === "admin"
                ? "bg-white text-indigo-900 shadow-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-amber-500" />
            แอดมิน
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 border border-red-200 rounded p-2.5 flex items-start gap-2 text-xs animate-pulse">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <div>{error}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">
              {role === "student"
                ? "Username / Student ID"
                : role === "teacher"
                ? "Username / Teacher ID"
                : "Admin ID"}
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={
                  role === "student"
                    ? "รหัสนักศึกษา (เช่น 64012345)"
                    : role === "teacher"
                    ? "ไอดีอาจารย์ (เช่น teacher1)"
                    : "ไอดีผู้ดูแลระบบ"
                }
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded py-2 px-3 outline-none text-slate-800 transition font-medium text-xs focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Password / รหัสผ่าน</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded py-2 px-3 outline-none text-slate-800 transition font-medium text-xs font-mono focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-2 px-3 rounded transition duration-150 flex items-center justify-center gap-2 cursor-pointer mt-4 shadow-sm"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Sign In / เข้าสู่ระบบ
              </>
            )}
          </button>
        </form>

        {/* Footer actions */}
        {role !== "admin" && (
          <div className="border-t border-slate-100 pt-3.5 text-center space-y-1.5">
            <p className="text-[11px] text-slate-400">ยังไม่มีบัญชีในระบบ?</p>
            <button
              onClick={onNavigateToRegister}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              ลงทะเบียนใช้งานที่นี่ &rarr;
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
