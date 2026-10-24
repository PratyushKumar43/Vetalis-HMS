"use client";

import { useState } from "react";
import { X, User, Mail, Phone, Shield, Stethoscope, Heart, Award, FileBadge, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateUserModal({ isOpen, onClose, onSuccess }: CreateUserModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "doctor" as "admin" | "doctor" | "patient",
    specialization: "",
    licenseNumber: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || "Account provisioned successfully!");
        onSuccess();
        onClose();
        // Reset form
        setFormData({
          name: "",
          email: "",
          phone: "",
          role: "doctor",
          specialization: "",
          licenseNumber: "",
        });
      } else {
        const errorMsg = data.error || "Failed to create user";
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err.message || "Failed to create user";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200/80 overflow-hidden"
        >
          <div className="p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Provision Account</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Send secure onboarding invitations to clinicians and patients.
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Role Selector Tabs */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Account Type
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: "doctor" })}
                    className={`flex flex-col items-center gap-1.5 p-3 border-2 rounded-xl transition-all ${
                      formData.role === "doctor"
                        ? "border-teal-600 bg-teal-50/70 text-teal-800 shadow-sm"
                        : "border-slate-200 hover:border-slate-300 text-slate-600 bg-slate-50/50"
                    }`}
                  >
                    <Stethoscope className="w-5 h-5 text-teal-600" />
                    <span className="text-xs font-bold">Doctor</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: "patient" })}
                    className={`flex flex-col items-center gap-1.5 p-3 border-2 rounded-xl transition-all ${
                      formData.role === "patient"
                        ? "border-teal-600 bg-teal-50/70 text-teal-800 shadow-sm"
                        : "border-slate-200 hover:border-slate-300 text-slate-600 bg-slate-50/50"
                    }`}
                  >
                    <Heart className="w-5 h-5 text-emerald-600" />
                    <span className="text-xs font-bold">Patient</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: "admin" })}
                    className={`flex flex-col items-center gap-1.5 p-3 border-2 rounded-xl transition-all ${
                      formData.role === "admin"
                        ? "border-indigo-600 bg-indigo-50/70 text-indigo-800 shadow-sm"
                        : "border-slate-200 hover:border-slate-300 text-slate-600 bg-slate-50/50"
                    }`}
                  >
                    <Shield className="w-5 h-5 text-indigo-600" />
                    <span className="text-xs font-bold">Admin</span>
                  </button>
                </div>
              </div>

              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                      placeholder={formData.role === "doctor" ? "Dr. Sarah Connor" : "Jane Doe"}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                      placeholder="user@example.com"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Phone Number (Optional)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              {/* Doctor-Specific Fields */}
              {formData.role === "doctor" && (
                <div className="p-3.5 bg-teal-50/50 border border-teal-200/60 rounded-xl space-y-3">
                  <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider block">
                    Doctor Clinical Credentials
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Specialization
                      </label>
                      <div className="relative">
                        <Award className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-teal-600" />
                        <input
                          type="text"
                          value={formData.specialization}
                          onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                          placeholder="e.g. Cardiology"
                          className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Medical License Number
                      </label>
                      <div className="relative">
                        <FileBadge className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-teal-600" />
                        <input
                          type="text"
                          value={formData.licenseNumber}
                          onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                          placeholder="e.g. MD-98214"
                          className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Invitation Lifecycle Note */}
              <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-xs text-slate-600 flex items-start gap-2.5">
                <Send className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-800">Secure Invitation Lifecycle:</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    The user will receive an onboarding invitation to set their own password securely. The administrator never invents or sees user passwords.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl font-semibold text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-teal-600 text-white rounded-xl font-semibold text-xs hover:bg-teal-700 transition-all disabled:opacity-50 disabled:pointer-events-none shadow-sm shadow-teal-600/20 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Provisioning...</span>
                    </>
                  ) : (
                    "Send Invitation"
                  )}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
