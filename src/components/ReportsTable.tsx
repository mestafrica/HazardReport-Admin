import { useState } from "react";
import { useDashboard } from "../context/DashboardContext";
import { Eye, MapPin, X } from "lucide-react";
import { FiMapPin, FiCalendar, FiUser, FiTag, FiFileText } from "react-icons/fi";
import type { Report } from "../interfaces/report";

const StatusPill = ({ status }: { status: string }) => {
  const normalizedStatus = status?.toLowerCase() || "unknown";

  let styles = "bg-slate-100 text-slate-600";
  if (normalizedStatus === "confirmed" || normalizedStatus === "resolved") {
    styles = "bg-emerald-50 text-emerald-600";
  } else if (normalizedStatus === "pending" || normalizedStatus === "open") {
    styles = "bg-amber-50 text-amber-600";
  } else if (normalizedStatus === "in progress") {
    styles = "bg-blue-50 text-blue-600";
  }

  const displayStatus = status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${styles}`}
    >
      {displayStatus}
    </span>
  );
};

const CategoryPill = ({ category }: { category: string }) => {
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
      {category?.toLowerCase() || "unknown"}
    </span>
  );
};

const ReportDetailModal = ({ report, onClose }: { report: Report; onClose: () => void }) => {
  if (!report) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-blue rounded-full flex items-center justify-center">
              <FiFileText className="text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Report Details</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="text-2xl" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Title</label>
            <p className="text-lg font-semibold text-gray-900 mt-1">{report.title}</p>
          </div>

          {/* Category & Status */}
          <div className="flex gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Category</label>
              <div className="mt-1">
                <CategoryPill category={report.category} />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Status</label>
              <div className="mt-1">
                <StatusPill status={report.status} />
              </div>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1">
              <FiMapPin className="w-3 h-3" /> Location
            </label>
            <p className="text-sm text-gray-700 mt-1">
              {report.locationData?.city || report.location?.split(",")[0] || "Unknown"}
            </p>
            <p className="text-xs text-gray-500">
              {report.locationData?.country ? `${report.locationData?.city}, ${report.locationData?.country}` : report.location}
            </p>
          </div>

          {/* Date & Reporter */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                <FiCalendar className="w-3 h-3" /> Date Reported
              </label>
              <p className="text-sm text-gray-700 mt-1">{report.date}</p>
              <p className="text-xs text-gray-500">{report.time}</p>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                <FiUser className="w-3 h-3" /> Reported By
              </label>
              <p className="text-sm text-gray-700 mt-1">{report.name || "Unknown"}</p>
            </div>
          </div>

          {/* Report ID */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1">
              <FiTag className="w-3 h-3" /> Report ID
            </label>
            <p className="text-sm text-gray-700 mt-1 font-mono">{report.id}</p>
          </div>

          {/* Attachments */}
          {report.attachmentUrl && (
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Attachment</label>
              <div className="mt-2">
                <img
                  src={report.attachmentUrl}
                  alt="Report attachment"
                  className="h-32 w-32 rounded-lg object-cover border border-gray-200"
                />
              </div>
            </div>
          )}
        </div>
        <div className="p-6 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const ReportsTable = () => {
  const { reports, isLoading } = useDashboard();
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const formatDate = (dateStr: string, timeStr?: string): { date: string; time: string } => {
    if (!dateStr) return { date: "Unknown", time: "" };
    try {
      const date = new Date(dateStr);
      const datePart = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const timePart = timeStr || date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      return { date: datePart, time: timePart };
    } catch {
      return { date: dateStr, time: "" };
    }
  };

  const recentReports = reports.filter(r => r.reportType !== 'announcement').slice(0, 5);

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-800">
          Recent Reports Moderation
        </h3>
        <button className="text-xs font-medium text-blue-600 hover:underline">
          View all reports →
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-100 text-xs tracking-wide text-slate-400">
              <th className="pb-3 font-medium uppercase">Date</th>
              <th className="pb-3 font-medium uppercase">Category</th>
              <th className="pb-3 font-medium uppercase">Location</th>
              <th className="pb-3 font-medium uppercase">Attachments</th>
              <th className="pb-3 font-medium uppercase">Status</th>
              <th className="pb-3 text-right font-medium uppercase">Action</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-slate-400">
                  Loading reports...
                </td>
              </tr>
            ) : recentReports.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-slate-400">
                  No reports found
                </td>
              </tr>
            ) : (
              recentReports.map((report) => {
                const formattedDate = formatDate(report.date, report.time);
                return (
                  <tr
                    key={report.id}
                    className="border-b border-slate-50 last:border-0"
                  >
                    <td className="py-4">
                      <div className="text-sm font-medium text-slate-700">{formattedDate.date}</div>
                      <div className="text-xs text-slate-400">{formattedDate.time}</div>
                    </td>
                    <td className="py-4">
                      <CategoryPill category={report.category} />
                    </td>
                    <td className="py-4">
                      <div className="flex items-start gap-1">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 text-blue-500 shrink-0" />
                        <div>
                          <div className="text-sm font-medium text-slate-700">{report.locationData?.city || report.location?.split(",")[0] || "Unknown"}</div>
                          <div className="text-xs text-slate-400 truncate max-w-[150px]">
                            {report.locationData?.country ? `${report.locationData?.city}, ${report.locationData?.country}` : report.location}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      {report.attachmentUrl ? (
                        <img
                          src={report.attachmentUrl}
                          alt="Attachment"
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="text-xs text-slate-400">No attachments</span>
                      )}
                    </td>
                    <td className="py-4">
                      <StatusPill status={report.status} />
                    </td>
                    <td className="py-4 text-right">
                      <button
                        onClick={() => setSelectedReport(report)}
                        className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Report Detail Modal */}
      {selectedReport && (
        <ReportDetailModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}
    </div>
  );
};

export default ReportsTable;