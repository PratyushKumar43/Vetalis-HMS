"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  Pill,
  MessageSquare,
  Activity,
  LogOut,
  Menu,
  X,
  Shield,
  Stethoscope,
  Heart,
} from "lucide-react";
import { authClient } from "@/lib/supabase-auth";
import { motion, AnimatePresence } from "framer-motion";

interface SidebarProps {
  userRole: "admin" | "doctor" | "patient";
  userName?: string;
  userEmail?: string;
}

const menuItems = {
  admin: [
    { icon: Shield, label: "Admin Dashboard", href: "/admin" },
    { icon: Users, label: "All Patients", href: "/dashboard/patients" },
    { icon: Pill, label: "Prescriptions", href: "/dashboard/prescriptions" },
    { icon: FileText, label: "Medical Reports", href: "/dashboard/reports" },
    { icon: Activity, label: "Vitals", href: "/dashboard/vitals" },
    { icon: MessageSquare, label: "Chatbot", href: "/dashboard/chatbot" },
  ],
  doctor: [
    { icon: Stethoscope, label: "Doctor Dashboard", href: "/doctor" },
    { icon: Users, label: "Assigned Patients", href: "/dashboard/patients" },
    { icon: Pill, label: "Prescriptions", href: "/dashboard/prescriptions" },
    { icon: FileText, label: "Patient Reports", href: "/dashboard/reports" },
    { icon: Activity, label: "Vitals", href: "/dashboard/vitals" },
    { icon: MessageSquare, label: "Chatbot", href: "/dashboard/chatbot" },
  ],
  patient: [
    { icon: Heart, label: "Patient Dashboard", href: "/patient" },
    { icon: FileText, label: "My Reports", href: "/dashboard/reports" },
    { icon: Pill, label: "My Prescriptions", href: "/dashboard/prescriptions" },
    { icon: Activity, label: "My Vitals", href: "/dashboard/vitals" },
    { icon: MessageSquare, label: "AI Chatbot", href: "/dashboard/chatbot" },
  ],
};

export default function Sidebar({ userRole, userName, userEmail }: SidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const pathname = usePathname();
  const items = menuItems[userRole] || menuItems.patient;

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
    } catch (e) {
      console.error(e);
    }
    // Clean sign out redirect via server handler
    window.location.href = "/auth/sign-in";
  };

  const showSidebar = isMobileOpen || isDesktop;

  const roleBadge = {
    admin: { label: "Administrator", bg: "bg-indigo-50 text-indigo-700 border-indigo-200" },
    doctor: { label: "Doctor", bg: "bg-teal-50 text-teal-700 border-teal-200" },
    patient: { label: "Patient", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  }[userRole] || { label: "User", bg: "bg-slate-50 text-slate-700 border-slate-200" };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-white shadow-md border border-slate-200 text-slate-700"
      >
        {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 left-0 z-40 h-screen w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm"
          >
            {/* Logo Section */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <Link href={`/${userRole}`} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-sm shadow-teal-600/30">
                  <Activity className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <span className="text-lg font-bold text-slate-900 tracking-tight">VETALIS</span>
                  <span className="block text-[10px] uppercase tracking-wider font-semibold text-teal-600">Health HMS</span>
                </div>
              </Link>
            </div>

            {/* User Profile Card */}
            <div className="p-4 mx-3 my-3 bg-slate-50 rounded-xl border border-slate-200/70">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-semibold text-sm">
                  {userName ? userName.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {userName || "Logged In User"}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">{userEmail}</p>
                </div>
              </div>
              <div className="mt-2.5">
                <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded-md border ${roleBadge.bg}`}>
                  {roleBadge.label}
                </span>
              </div>
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== `/${userRole}` && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? "bg-teal-50 text-teal-700 font-semibold"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-teal-600" : "text-slate-400"}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Logout Footer */}
            <div className="p-3 border-t border-slate-100">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
              >
                <LogOut className="w-4 h-4 text-rose-500" />
                <span>Sign Out</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
