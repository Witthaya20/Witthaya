import React, { useState, useEffect } from "react";
import { User } from "./types";
import RealTimeDashboard from "./components/RealTimeDashboard";
import LoginPanel from "./components/LoginPanel";
import RegisterPanel from "./components/RegisterPanel";
import StudentPanel from "./components/StudentPanel";
import TeacherPanel from "./components/TeacherPanel";
import AdminPanel from "./components/AdminPanel";
import { Coffee, ShieldAlert, LogIn, Sparkles, LayoutDashboard, Compass } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [activeView, setActiveView] = useState<string>("dashboard");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [time, setTime] = useState(new Date());

  // Restore session if any exists
  useEffect(() => {
    const savedUser = localStorage.getItem("current_user");
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser) as User;
        setCurrentUser(parsed);
        // Automatically route to their dashboard
        setActiveView(parsed.role);
      } catch (err) {
        console.error("Error restoring session:", err);
      }
    }
  }, []);

  // Update live clock
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem("current_user", JSON.stringify(user));
    setActiveView(user.role);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("current_user");
    setActiveView("dashboard");
  };

  const formattedTime = time.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const formattedDate = time.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased text-sm">
      {/* Top Header Navigation matching High Density theme */}
      <header className="sticky top-0 bg-indigo-950 text-white flex items-center justify-between px-4 md:px-6 h-14 shadow-md z-50 shrink-0 border-b border-indigo-900">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (currentUser) {
                setActiveView(currentUser.role);
              } else {
                setActiveView("dashboard");
              }
            }}
            className="flex items-center gap-2.5 text-left focus:outline-none cursor-pointer group"
          >
            <div className="w-8 h-8 bg-indigo-600 group-hover:bg-indigo-500 rounded flex items-center justify-center font-bold text-lg text-white transition-colors">
              <Coffee className="w-5 h-5" />
            </div>
            <h1 className="font-bold text-sm md:text-base tracking-tight font-display">
              ระบบเช็คการเข้าห้องพักครู <span className="hidden sm:inline opacity-70">| Smart Lounge</span>
            </h1>
          </button>
        </div>

        {/* Live sync / Clock in the middle/right */}
        <div className="hidden lg:flex items-center gap-6 text-xs uppercase tracking-wider font-semibold opacity-90 font-mono">
          <div className="flex items-center gap-2 text-indigo-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Live Sync: Google Sheets
          </div>
          <div className="bg-indigo-900/50 px-3 py-1 rounded border border-indigo-800/40 text-indigo-200">
            {formattedTime} | {formattedDate}
          </div>
        </div>

        {/* Nav Menu */}
        <nav className="flex items-center gap-2">
          <button
            onClick={() => {
              if (currentUser) {
                setActiveView(currentUser.role);
              } else {
                setActiveView("dashboard");
              }
            }}
            className={`py-1 px-3 rounded text-xs font-bold font-display transition flex items-center gap-1.5 cursor-pointer ${
              activeView === "dashboard" || activeView === "student" || activeView === "teacher" || activeView === "admin"
                ? "bg-indigo-800 text-white border border-indigo-700/50"
                : "text-indigo-200 hover:text-white hover:bg-indigo-900/40"
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            {currentUser ? "แดชบอร์ดของคุณ" : "หน้าหลัก (Real-time)"}
          </button>

          {!currentUser ? (
            <>
              <button
                onClick={() => setActiveView("login")}
                className={`py-1 px-3 rounded text-xs font-bold font-display transition flex items-center gap-1.5 cursor-pointer ${
                  activeView === "login"
                    ? "bg-white text-indigo-950 shadow-sm border border-slate-200"
                    : "border border-indigo-800 text-indigo-200 hover:bg-indigo-900/40 hover:text-white"
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                เข้าสู่ระบบ
              </button>

              <button
                onClick={() => setActiveView("register")}
                className={`hidden md:flex py-1 px-3 rounded text-xs font-bold font-display transition items-center gap-1.5 cursor-pointer ${
                  activeView === "register"
                    ? "bg-white text-indigo-950 shadow-sm border border-slate-200"
                    : "bg-indigo-600 text-white hover:bg-indigo-500"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                ลงทะเบียน
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 bg-indigo-900/40 border border-indigo-800/60 rounded px-2.5 py-1">
              <div className="text-right hidden sm:block">
                <div className="text-[10px] font-bold text-indigo-300 font-display leading-none">
                  {currentUser.role === "admin"
                    ? "ผู้ดูแลระบบสูงสุด"
                    : currentUser.role === "teacher"
                    ? "อาจารย์"
                    : "นักศึกษา"}
                </div>
              </div>
              <div className="w-6 h-6 rounded bg-indigo-600 text-white font-bold text-xs flex items-center justify-center font-display">
                {currentUser.name.slice(0, 2)}
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* Main Wrapper Screen Container with Tighter, High-Density Spacing */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-4 md:py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="w-full"
          >
            {/* Real-time display panel */}
            {activeView === "dashboard" && (
              <RealTimeDashboard
                onNavigate={(view) => setActiveView(view)}
                onQuickCheckIn={() => {
                  if (currentUser) {
                    setActiveView(currentUser.role);
                  } else {
                    setActiveView("login");
                  }
                }}
              />
            )}

            {/* Login panel */}
            {activeView === "login" && (
              <LoginPanel
                onLoginSuccess={handleLoginSuccess}
                onNavigateToRegister={() => setActiveView("register")}
              />
            )}

            {/* Register panel */}
            {activeView === "register" && (
              <RegisterPanel
                onRegisterSuccess={() => setActiveView("login")}
                onBackToLogin={() => setActiveView("login")}
              />
            )}

            {/* Student Dashboard panel */}
            {activeView === "student" && currentUser && (
              <StudentPanel user={currentUser} onLogout={handleLogout} />
            )}

            {/* Teacher Dashboard panel */}
            {activeView === "teacher" && currentUser && (
              <TeacherPanel user={currentUser} onLogout={handleLogout} />
            )}

            {/* Admin Dashboard panel */}
            {activeView === "admin" && currentUser && (
              <AdminPanel user={currentUser} onLogout={handleLogout} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer Status Bar matching High Density theme */}
      <footer className="h-8 bg-slate-100 border-t border-slate-200 flex items-center justify-between px-4 shrink-0 font-mono text-[10px] text-slate-500">
        <div className="flex gap-4">
          <span>Session: ACTIVE</span>
          <span>Gateway: MAIN_DOOR_01</span>
          <span>Version: 1.0.4a-Stable</span>
        </div>
        <div className="font-bold text-indigo-700 hidden sm:block">
          CONNECTED TO GOOGLE DRIVE API | v3.0
        </div>
      </footer>
    </div>
  );
}

