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
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: Users, label: "Patients", href: "/dashboard/patients" },
    { icon: Pill, label: "Prescriptions", href: "/dashboard/prescriptions" },
    { icon: FileText, label: "Reports", href: "/dashboard/reports" },
    { icon: MessageSquare, label: "Chatbot", href: "/dashboard/chatbot" },
    { icon: Activity, label: "Vitals", href: "/dashboard/vitals" },
    { icon: Shield, label: "Admin Panel", href: "/dashboard/admin" },
  ],
  doctor: [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: Users, label: "Patients", href: "/dashboard/patients" },
    { icon: Pill, label: "Prescriptions", href: "/dashboard/prescriptions" },
    { icon: FileText, label: "Reports", href: "/dashboard/reports" },
    { icon: MessageSquare, label: "Chatbot", href: "/dashboard/chatbot" },
    { icon: Activity, label: "Vitals", href: "/dashboard/vitals" },
  ],
  patient: [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: FileText, label: "My Reports", href: "/dashboard/reports" },
    { icon: Pill, label: "My Prescriptions", href: "/dashboard/prescriptions" },
    { icon: MessageSquare, label: "Chatbot", href: "/dashboard/chatbot" },
  ],
};

export default function Sidebar({ userRole, userName, userEmail }: SidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const pathname = usePathname();
  const items = menuItems[userRole] || [];

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
      // Clear user ID cookies
      document.cookie = "supabase-auth-user-id=; path=/; max-age=0";
      document.cookie = "neon-auth-user-id=; path=/; max-age=0";
      window.location.href = "/";
    } catch (error) {
      console.error("Sign out error:", error);
      document.cookie = "supabase-auth-user-id=; path=/; max-age=0";
      document.cookie = "neon-auth-user-id=; path=/; max-age=0";
      window.location.href = "/";
    }
  };

  const showSidebar = isMobileOpen || isDesktop;

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-md border border-slate-200"
      >
        {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ duration: 0.3 }}
            className="fixed lg:sticky top-0 left-0 h-screen w-64 bg-white border-r border-slate-200 z-40 flex flex-col"
          >
            {/* Logo */}
            <div className="p-6 border-b border-slate-200">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg border border-teal-600/20 flex items-center justify-center text-teal-600 bg-teal-50/50">
                  <Activity className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <span className="text-lg font-semibold tracking-tight text-slate-900 block">
                    VITALIS
                  </span>
                  <span className="text-xs text-slate-500">HMS</span>
                </div>
              </Link>
            </div>

            {/* User Info */}
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-semibold">
                  {userName?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {userName || "User"}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{userEmail}</p>
                  <span className="inline-block mt-1 text-[10px] font-bold tracking-widest text-teal-600 uppercase">
                    {userRole}
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-4">
              <ul className="space-y-1">
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setIsMobileOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-teal-50 text-teal-700 border border-teal-100"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  );
}
