"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Filter, Eye, Download, Sparkles, AlertTriangle, Calendar, FileText, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface ReportListProps {
  userRole: string;
}

interface Report {
  id: string;
  patientName: string;
  reportType: string;
  uploadedDate: string;
  aiAnalyzed: boolean;
  anomalies: number;
  confidence: number | null;
  status: string;
}

export default function ReportList({ userRole }: ReportListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/reports/list");
      const data = await response.json();

      if (data.success) {
        setReports(data.reports);
      } else {
        setError("Failed to load reports");
      }
    } catch (err) {
      console.error("Error fetching reports:", err);
      setError("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = reports.filter((report) => {
    const matchesSearch = report.patientName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === "all" || report.reportType === filterType;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-12 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchReports}
          className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200">
      {/* Search and Filter */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Types</option>
              <option value="lab">Lab Report</option>
              <option value="imaging">Imaging</option>
              <option value="pathology">Pathology</option>
            </select>
          </div>
        </div>
      </div>

      {/* Report Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Patient</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Report Type</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">AI Analysis</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredReports.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                  No reports found
                </td>
              </tr>
            ) : (
              filteredReports.map((report, index) => (
                <motion.tr
                  key={report.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-slate-50"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-semibold">
                        {report.patientName.charAt(0)}
                      </div>
                      <p className="font-medium text-slate-900">{report.patientName}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-900 capitalize">{report.reportType}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {report.aiAnalyzed ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                          <Sparkles className="w-3 h-3" />
                          Analyzed
                        </span>
                        {report.anomalies > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                            <AlertTriangle className="w-3 h-3" />
                            {report.anomalies}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-slate-500">Pending</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        report.status === "Analyzed"
                          ? "bg-emerald-100 text-emerald-700"
                          : report.status === "Normal"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {report.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar className="w-4 h-4" />
                      {new Date(report.uploadedDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={`/api/reports/${report.id}/download?redirect=true`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 text-xs font-semibold transition-colors"
                        title="Download Signed Report"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </a>
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
