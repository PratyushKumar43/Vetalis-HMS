"use client";

import { useState, useEffect } from "react";
import {
  Users,
  TrendingUp,
  Shield,
  Plus,
  Loader2,
  UserCheck,
  UserX,
  Stethoscope,
  Heart,
  Link as LinkIcon,
  Search,
  Mail,
  Send,
  BadgeCheck,
  ShieldAlert,
  Clock,
  Sparkles,
} from "lucide-react";
import CreateUserModal from "./CreateUserModal";
import { toast } from "sonner";

const tabs = [
  { id: "users", label: "User Management", icon: Users },
  { id: "assignments", label: "Doctor-Patient Assignments", icon: Stethoscope },
  { id: "analytics", label: "Analytics & Stats", icon: TrendingUp },
];

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLogin: string;
  invitedAt?: string | null;
  phone?: string | null;
  specialization?: string | null;
  licenseNumber?: string | null;
  doctorVerified?: boolean;
}

interface Assignment {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorEmail: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  assignedAt: string;
}

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Filtering & search states
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [resendingId, setResendingId] = useState<string | null>(null);

  // Assignment creation form state
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers();
    } else if (activeTab === "assignments") {
      fetchAssignments();
      if (users.length === 0) fetchUsers();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/users");
      const data = await response.json();

      if (data.success) {
        setUsers(data.users);
      } else {
        setError(data.error || "Failed to load users");
      }
    } catch (err: any) {
      console.error("Error fetching users:", err);
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/assignments");
      const data = await res.json();
      if (data.success) {
        setAssignments(data.assignments);
      }
    } catch (err) {
      console.error("Error fetching assignments:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "active" ? "deactivated" : "active";
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`User status changed to ${nextStatus}`);
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, status: nextStatus } : u))
        );
      } else {
        toast.error(data.error || "Failed to update user status");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const toggleDoctorVerification = async (userId: string, currentVerified: boolean) => {
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, doctorVerified: !currentVerified }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(!currentVerified ? "Doctor license verified!" : "Verification revoked.");
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, doctorVerified: !currentVerified } : u))
        );
      } else {
        toast.error(data.error || "Failed to update doctor verification");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update verification");
    }
  };

  const handleResendInvitation = async (user: User) => {
    try {
      setResendingId(user.id);
      const res = await fetch("/api/users/invite/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `Invitation resent to ${user.email}`);
        fetchUsers();
      } else {
        toast.error(data.error || "Failed to resend invitation");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to resend invitation");
    } finally {
      setResendingId(null);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId || !selectedPatientId) {
      toast.error("Please select both a doctor and a patient.");
      return;
    }

    try {
      setAssigning(true);
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId: selectedDoctorId, patientId: selectedPatientId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Doctor assigned to patient successfully!");
        setSelectedDoctorId("");
        setSelectedPatientId("");
        fetchAssignments();
      } else {
        toast.error(data.error || "Failed to assign doctor");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to assign doctor");
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveAssignment = async (id: string) => {
    if (!confirm("Are you sure you want to remove this assignment?")) return;
    try {
      const res = await fetch(`/api/assignments?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Assignment removed");
        setAssignments((prev) => prev.filter((a) => a.id !== id));
      } else {
        toast.error(data.error || "Failed to remove assignment");
      }
    } catch (err: any) {
      toast.error(err.message || "Error removing assignment");
    }
  };

  // Filtered users calculation
  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    const matchesStatus = statusFilter === "all" || u.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.specialization && u.specialization.toLowerCase().includes(q)) ||
      (u.licenseNumber && u.licenseNumber.toLowerCase().includes(q));

    return matchesRole && matchesStatus && matchesSearch;
  });

  const doctorsList = users.filter((u) => u.role === "doctor" && u.status === "active");
  const patientsList = users.filter((u) => u.role === "patient");

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* Tabs Header */}
      <div className="border-b border-slate-200 bg-slate-50/50">
        <nav className="flex px-4 overflow-x-auto gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${
                  isActive
                    ? "border-teal-600 text-teal-700 bg-white"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-teal-600" : "text-slate-400"}`} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === "users" && (
          <div className="space-y-4">
            {/* Action Bar: Search, Filters, Add Button */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 mb-6">
              {/* Search Box */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, email, or specialization..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                />
              </div>

              {/* Role & Status Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg">
                  {["all", "doctor", "patient", "admin"].map((r) => (
                    <button
                      key={r}
                      onClick={() => setRoleFilter(r)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-all ${
                        roleFilter === r
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {r === "all" ? "All" : `${r}s`}
                    </button>
                  ))}
                </div>

                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg">
                  {["all", "active", "invited", "deactivated"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold capitalize transition-all ${
                        statusFilter === s
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-semibold uppercase tracking-wider hover:bg-teal-700 transition-colors shadow-sm shadow-teal-600/20"
                >
                  <Plus className="w-4 h-4" />
                  Provision Account
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
              </div>
            ) : error ? (
              <div className="text-center p-12 bg-red-50/50 rounded-xl border border-red-100">
                <p className="text-red-600 text-sm mb-4 font-medium">{error}</p>
                <button
                  onClick={fetchUsers}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-semibold hover:bg-teal-700"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/80 border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3.5 text-xs font-bold text-slate-600 uppercase tracking-wider">
                        User Profile
                      </th>
                      <th className="px-5 py-3.5 text-xs font-bold text-slate-600 uppercase tracking-wider">
                        Role & Credentials
                      </th>
                      <th className="px-5 py-3.5 text-xs font-bold text-slate-600 uppercase tracking-wider">
                        Account State
                      </th>
                      <th className="px-5 py-3.5 text-xs font-bold text-slate-600 uppercase tracking-wider">
                        Timeline
                      </th>
                      <th className="px-5 py-3.5 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">
                          No accounts found matching filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                          {/* User Column */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-700 font-bold text-xs flex-shrink-0">
                                {user.name?.charAt(0) || "U"}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900 text-sm">
                                  {user.name || "Unknown"}
                                </p>
                                <p className="text-xs text-slate-500">{user.email}</p>
                                {user.phone && (
                                  <p className="text-[10px] text-slate-400 mt-0.5">{user.phone}</p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Role & Credentials Column */}
                          <td className="px-5 py-4">
                            <div className="space-y-1">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${
                                  user.role === "admin"
                                    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                    : user.role === "doctor"
                                    ? "bg-teal-50 text-teal-700 border-teal-200"
                                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                }`}
                              >
                                {user.role}
                              </span>

                              {user.role === "doctor" && (
                                <div className="text-[11px] text-slate-600 space-y-0.5">
                                  {user.specialization && (
                                    <p className="font-medium text-slate-700">{user.specialization}</p>
                                  )}
                                  {user.licenseNumber && (
                                    <p className="text-[10px] text-slate-400">Lic: {user.licenseNumber}</p>
                                  )}
                                  <button
                                    onClick={() =>
                                      toggleDoctorVerification(user.id, !!user.doctorVerified)
                                    }
                                    className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md transition-colors ${
                                      user.doctorVerified
                                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                        : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                                    }`}
                                  >
                                    <BadgeCheck className="w-3 h-3" />
                                    {user.doctorVerified ? "Verified License" : "Verify License"}
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Status Badge Column */}
                          <td className="px-5 py-4">
                            <div className="space-y-1">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                  user.status === "active"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : user.status === "invited"
                                    ? "bg-amber-100 text-amber-800"
                                    : user.status === "pending_verification"
                                    ? "bg-sky-100 text-sky-800"
                                    : "bg-rose-100 text-rose-800"
                                }`}
                              >
                                {user.status === "active"
                                  ? "Active"
                                  : user.status === "invited"
                                  ? "Invited"
                                  : user.status === "pending_verification"
                                  ? "Pending Verification"
                                  : "Deactivated"}
                              </span>
                            </div>
                          </td>

                          {/* Timeline Column */}
                          <td className="px-5 py-4">
                            <div className="text-xs text-slate-500 space-y-0.5">
                              {user.status === "invited" ? (
                                <span className="inline-flex items-center gap-1 text-amber-700 text-[11px] font-medium">
                                  <Clock className="w-3 h-3" />
                                  Invited{" "}
                                  {user.invitedAt
                                    ? new Date(user.invitedAt).toLocaleDateString()
                                    : "Recently"}
                                </span>
                              ) : (
                                <span>
                                  Active since{" "}
                                  {user.lastLogin
                                    ? new Date(user.lastLogin).toLocaleDateString()
                                    : "Setup"}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Actions Column */}
                          <td className="px-5 py-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              {/* Resend Invitation Action */}
                              {user.status === "invited" && (
                                <button
                                  onClick={() => handleResendInvitation(user)}
                                  disabled={resendingId === user.id}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors disabled:opacity-50"
                                >
                                  {resendingId === user.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Send className="w-3 h-3" />
                                  )}
                                  Resend Invite
                                </button>
                              )}

                              {/* Activation Toggle Action */}
                              <button
                                onClick={() => toggleUserStatus(user.id, user.status)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                  user.status === "active"
                                    ? "bg-rose-50 text-rose-700 hover:bg-rose-100"
                                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                }`}
                              >
                                {user.status === "active" ? (
                                  <>
                                    <UserX className="w-3.5 h-3.5" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="w-3.5 h-3.5" />
                                    Activate
                                  </>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "assignments" && (
          <div className="space-y-6">
            {/* Create Assignment Card */}
            <div className="p-5 bg-slate-50/70 border border-slate-200 rounded-2xl">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-teal-600" />
                Assign Doctor to Patient
              </h3>
              <form onSubmit={handleCreateAssignment} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                    Select Doctor
                  </label>
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">-- Choose Doctor --</option>
                    {doctorsList.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.specialization ? `(${d.specialization})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                    Select Patient
                  </label>
                  <select
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">-- Choose Patient --</option>
                    {patientsList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={assigning}
                    className="w-full py-2 bg-teal-600 text-white rounded-xl font-semibold text-xs hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {assigning ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Assigning...
                      </>
                    ) : (
                      "Create Assignment"
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Assignments Table */}
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left">
                <thead className="bg-slate-50/80 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5 text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Doctor
                    </th>
                    <th className="px-6 py-3.5 text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Assigned Patient
                    </th>
                    <th className="px-6 py-3.5 text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Assigned Date
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assignments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-sm">
                        No doctor-patient assignments recorded yet.
                      </td>
                    </tr>
                  ) : (
                    assignments.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-900 text-sm">{a.doctorName}</p>
                          <p className="text-xs text-slate-500">{a.doctorEmail}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-900 text-sm">{a.patientName}</p>
                          <p className="text-xs text-slate-500">{a.patientEmail}</p>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500">
                          {new Date(a.assignedAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleRemoveAssignment(a.id)}
                            className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Total Users
                </span>
                <p className="text-3xl font-extrabold text-slate-900 mt-2">{users.length}</p>
                <span className="text-[11px] text-teal-600 font-medium">All registered accounts</span>
              </div>
              <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Active Doctors
                </span>
                <p className="text-3xl font-extrabold text-slate-900 mt-2">{doctorsList.length}</p>
                <span className="text-[11px] text-teal-600 font-medium">Clinical staff</span>
              </div>
              <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Registered Patients
                </span>
                <p className="text-3xl font-extrabold text-slate-900 mt-2">{patientsList.length}</p>
                <span className="text-[11px] text-teal-600 font-medium">Patient portals</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Provision Account Modal */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchUsers}
      />
    </div>
  );
}
